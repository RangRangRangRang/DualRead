using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using DualRead.Services.Interfaces;
using DualRead.ViewModels;
using PDFtoImage;
using SkiaSharp;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace DualRead.Services;

public class PdfParsingService : IPdfParsingService
{
    // A page is treated as "scanned / image-only" (no usable text layer) when the amount of
    // non-whitespace text extracted from it falls below this. Real book pages almost always
    // clear this easily; scanned pages come back empty or with a handful of OCR-noise characters.
    private const int MinMeaningfulTextChars = 15;

    // DPI used when rasterizing a scanned page to PNG. High enough to stay legible when zoomed,
    // low enough to keep per-page file size and render time reasonable for a free-tier host.
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
            var page = document.GetPage(pageNum);
            var pageHtml = ConvertPageToHtml(page, pageNum, totalPages);
            sb.AppendLine(pageHtml);
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
        // src comes back as e.g. "pdfpage-000042.png" - keep it a plain filename, never a path,
        // so this can never be used to escape the book's own pages/ folder.
        var safeFileName = Path.GetFileName(src);
        return Path.Combine(recoveryKeyId.ToString(), bookId.ToString(), "pages", safeFileName);
    }

    private static string ConvertPageToHtml(Page page, int pageNum, int totalPages)
    {
        var sb = new StringBuilder();

        string? text = null;
        try
        {
            text = ContentOrderTextExtractor.GetText(page);
            if (string.IsNullOrWhiteSpace(text))
            {
                text = page.Text;
            }
        }
        catch
        {
            text = null;
        }

        var meaningfulCharCount = text is null ? 0 : text.Count(c => !char.IsWhiteSpace(c));

        if (totalPages > 1)
        {
            sb.AppendLine($"<div class=\"pdf-page-marker\"><small class=\"text-dim\">— Page {pageNum} of {totalPages} —</small></div>");
        }

        if (meaningfulCharCount >= MinMeaningfulTextChars)
        {
            var paragraphs = SplitIntoParagraphs(text!);
            foreach (var paragraph in paragraphs)
            {
                if (string.IsNullOrWhiteSpace(paragraph)) continue;
                var encoded = WebUtility.HtmlEncode(paragraph);
                sb.AppendLine($"<p>{encoded}</p>");
            }
        }
        else
        {
            // No usable text layer on this page (typically a scanned book page) - render on demand
            var fileName = $"pdfpage-{pageNum:D6}.png";
            sb.AppendLine($"<div class=\"pdf-image-container\"><img class=\"pdf-page-image\" src=\"{fileName}\" alt=\"Page {pageNum}\" loading=\"lazy\" /></div>");
        }

        return sb.ToString();
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

            // No embedded image on page 1 (common for scanned-but-vectorized or text-image-hybrid
            // PDFs where the whole page is one full-page image PdfPig doesn't enumerate the same
            // way) - fall back to rasterizing page 1 itself as the cover.
            using var pdfStream = File.OpenRead(absolutePdfFilePath);
            using var bitmap = Conversion.ToImage(pdfStream, page: new Index(0), options: new RenderOptions(Dpi: 96));
            using var image = SKImage.FromBitmap(bitmap);
            using var pngData = image.Encode(SKEncodedImageFormat.Png, 100);
            return (pngData.ToArray(), ".png");
        }
        catch
        {
            return (null, null);
        }
    }

    private static List<string> SplitIntoParagraphs(string rawText)
    {
        var result = new List<string>();
        if (string.IsNullOrWhiteSpace(rawText)) return result;

        var rawLines = rawText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None)
                              .Select(l => l.Trim())
                              .ToList();

        var currentParagraph = new StringBuilder();

        foreach (var line in rawLines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                if (currentParagraph.Length > 0)
                {
                    result.Add(currentParagraph.ToString().Trim());
                    currentParagraph.Clear();
                }
                continue;
            }

            if (currentParagraph.Length > 0)
            {
                var prevText = currentParagraph.ToString();
                if (prevText.EndsWith("-"))
                {
                    currentParagraph.Length--;
                    currentParagraph.Append(line);
                }
                else
                {
                    currentParagraph.Append(' ');
                    currentParagraph.Append(line);
                }
            }
            else
            {
                currentParagraph.Append(line);
            }
        }

        if (currentParagraph.Length > 0)
        {
            result.Add(currentParagraph.ToString().Trim());
        }

        return result;
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