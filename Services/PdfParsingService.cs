using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;
using DualRead.Services.Interfaces;
using DualRead.ViewModels;
using PDFtoImage;
using SkiaSharp;
using UglyToad.PdfPig;

namespace DualRead.Services;

public class PdfParsingService : IPdfParsingService
{
    // DPI used when rasterizing a PDF page to PNG.
    // 150 DPI provides sharp, crystal-clear readability while keeping memory and file size fast and efficient.
    private const int RenderDpi = 150;

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> RenderLocks = new(StringComparer.OrdinalIgnoreCase);

    private readonly IFileStorageService _fileStorageService;

    public PdfParsingService(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    public Task<ParsedEpubResult> ParseAsync(string absolutePdfFilePath)
    {
        if (!File.Exists(absolutePdfFilePath))
        {
            throw new FileNotFoundException($"File not found: {absolutePdfFilePath}");
        }

        using var document = PdfDocument.Open(absolutePdfFilePath);
        var title = document.Information.Title;
        var author = document.Information.Author;

        var (coverBytes, coverExt) = ExtractCoverImage(document, absolutePdfFilePath);

        var finalTitle = string.IsNullOrWhiteSpace(title)
            ? Path.GetFileNameWithoutExtension(absolutePdfFilePath)
            : title.Trim();

        var chapters = new List<ParsedChapter>
        {
            new()
            {
                Order = 0,
                Title = finalTitle,
                EpubItemHref = "full"
            }
        };

        var result = new ParsedEpubResult
        {
            Title = finalTitle,
            Author = string.IsNullOrWhiteSpace(author) ? null : author.Trim(),
            CoverImageBytes = coverBytes,
            CoverImageExtension = coverExt,
            Chapters = chapters
        };

        return Task.FromResult(result);
    }

    public Task<string> GetChapterHtmlAsync(string absolutePdfFilePath, string chapterHref, Guid recoveryKeyId, Guid bookId)
    {
        if (!File.Exists(absolutePdfFilePath))
        {
            throw new FileNotFoundException($"File not found: {absolutePdfFilePath}");
        }

        using var document = PdfDocument.Open(absolutePdfFilePath);
        var totalPages = document.NumberOfPages;

        var sb = new StringBuilder();

        for (var pageNum = 1; pageNum <= totalPages; pageNum++)
        {
            var fileName = $"pdfpage-{pageNum:D6}.png";
            sb.AppendLine($"<div id=\"pdf-page-{pageNum}\" class=\"pdf-page-wrapper\" data-page-number=\"{pageNum}\">");
            if (totalPages > 1)
            {
                sb.AppendLine($"<div class=\"pdf-page-marker\"><small class=\"text-dim\">— Trang {pageNum} / {totalPages} —</small></div>");
            }
            sb.AppendLine($"<div class=\"pdf-image-container\"><img class=\"pdf-page-image\" src=\"{fileName}\" alt=\"Page {pageNum}\" loading=\"lazy\" /></div>");
            sb.AppendLine("</div>");
        }

        return Task.FromResult(sb.ToString());
    }

    public async Task<(byte[] Bytes, string ContentType)?> GetRenderedPageAssetAsync(string absolutePdfFilePath, Guid recoveryKeyId, Guid bookId, string src)
    {
        var relativePath = BuildRenderedPageRelativePath(recoveryKeyId, bookId, src);
        var absolutePath = _fileStorageService.GetAbsolutePath(relativePath);

        if (File.Exists(absolutePath))
        {
            var bytes = await File.ReadAllBytesAsync(absolutePath);
            return (bytes, "image/png");
        }

        // On-demand rendering when requested by browser
        var safeFileName = Path.GetFileName(src);
        var match = Regex.Match(safeFileName, @"^pdfpage-(\d+)\.png$", RegexOptions.IgnoreCase);
        if (match.Success && int.TryParse(match.Groups[1].Value, out var pageNum) && File.Exists(absolutePdfFilePath))
        {
            await EnsureRenderedPageAsync(absolutePdfFilePath, pageNum, recoveryKeyId, bookId);
            if (File.Exists(absolutePath))
            {
                var bytes = await File.ReadAllBytesAsync(absolutePath);
                return (bytes, "image/png");
            }
        }

        return null;
    }

    private static string BuildRenderedPageRelativePath(Guid recoveryKeyId, Guid bookId, string src)
    {
        var safeFileName = Path.GetFileName(src);
        return Path.Combine(recoveryKeyId.ToString(), bookId.ToString(), "pages", safeFileName);
    }

    private async Task<string> EnsureRenderedPageAsync(string absolutePdfFilePath, int pageNum, Guid recoveryKeyId, Guid bookId)
    {
        var fileName = $"pdfpage-{pageNum:D6}.png";
        var relativePath = BuildRenderedPageRelativePath(recoveryKeyId, bookId, fileName);
        var absoluteImagePath = _fileStorageService.GetAbsolutePath(relativePath);

        if (File.Exists(absoluteImagePath))
        {
            return fileName;
        }

        var sem = RenderLocks.GetOrAdd(absoluteImagePath, _ => new SemaphoreSlim(1, 1));
        await sem.WaitAsync();
        try
        {
            if (!File.Exists(absoluteImagePath))
            {
                var directory = Path.GetDirectoryName(absoluteImagePath)!;
                Directory.CreateDirectory(directory);

                var tempPath = Path.Combine(directory, $"{fileName}.{Guid.NewGuid():N}.tmp");

                await using (var pdfStream = File.OpenRead(absolutePdfFilePath))
                {
                    using var bitmap = Conversion.ToImage(
                        pdfStream,
                        page: new Index(pageNum - 1),
                        options: new RenderOptions(Dpi: RenderDpi));

                    using var image = SKImage.FromBitmap(bitmap);
                    using var pngData = image.Encode(SKEncodedImageFormat.Png, 90);
                    await using (var outStream = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                    {
                        pngData.SaveTo(outStream);
                    }
                }

                if (File.Exists(tempPath))
                {
                    File.Move(tempPath, absoluteImagePath, overwrite: true);
                }
            }
        }
        finally
        {
            sem.Release();
        }

        return fileName;
    }

    private static (byte[]? Bytes, string? Extension) ExtractCoverImage(PdfDocument document, string absolutePdfFilePath)
    {
        try
        {
            if (document.NumberOfPages == 0) return (null, null);

            var firstPage = document.GetPage(1);
            var images = firstPage.GetImages().ToList();

            if (images.Count > 0)
            {
                var largest = images.OrderByDescending(img => img.RawBytes.Length).First();
                var bytes = largest.RawBytes.ToArray();
                if (bytes.Length > 0)
                {
                    return (bytes, DetectImageExtension(bytes));
                }
            }

            // Fall back to rendering page 1 as cover
            using var pdfStream = File.OpenRead(absolutePdfFilePath);
            using var bitmap = Conversion.ToImage(pdfStream, page: new Index(0), options: new RenderOptions(Dpi: 120));
            using var image = SKImage.FromBitmap(bitmap);
            using var pngData = image.Encode(SKEncodedImageFormat.Png, 100);
            return (pngData.ToArray(), ".png");
        }
        catch
        {
            return (null, null);
        }
    }

    private static string DetectImageExtension(byte[] bytes)
    {
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            return ".png";
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8)
            return ".jpg";
        if (bytes.Length >= 6 && bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F')
            return ".gif";
        return ".jpg";
    }
}