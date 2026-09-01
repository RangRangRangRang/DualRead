using DocumentFormat.OpenXml.Wordprocessing;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;

namespace DualRead.Services;

public class BookService : IBookService
{
    private static readonly HashSet<string> SupportedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".epub",
        ".pdf",
        ".docx"
    };

    private readonly IBookRepository _bookRepository;
    private readonly IRecoveryKeyRepository _recoveryKeyRepository;
    private readonly IRecoveryKeyService _recoveryKeyService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IEpubParsingService _epubParsingService;
    private readonly IDocxParsingService _docxParsingService;
    private readonly IPdfParsingService _pdfParsingService;

    public BookService(
        IBookRepository bookRepository,
        IRecoveryKeyRepository recoveryKeyRepository,
        IRecoveryKeyService recoveryKeyService,
        IFileStorageService fileStorageService,
        IEpubParsingService epubParsingService,
        IDocxParsingService docxParsingService,
        IPdfParsingService pdfParsingService)
    {
        _bookRepository = bookRepository;
        _recoveryKeyRepository = recoveryKeyRepository;
        _recoveryKeyService = recoveryKeyService;
        _fileStorageService = fileStorageService;
        _epubParsingService = epubParsingService;
        _docxParsingService = docxParsingService;
        _pdfParsingService = pdfParsingService;
    }

    public async Task<(Book Book, RecoveryKey RecoveryKey)> UploadBookAsync(Guid? recoveryKeyId, string originalFileName, long fileSizeBytes, Stream fileContent)
    {
        var extension = Path.GetExtension(originalFileName);
        if (!SupportedExtensions.Contains(extension))
        {
            throw new NotSupportedException($"Unsupported file type '{extension}'. Supported formats: .epub, .pdf, .docx.");
        }

        RecoveryKey? recoveryKey = recoveryKeyId.HasValue
            ? await _recoveryKeyRepository.GetByIdAsync(recoveryKeyId.Value)
            : null;

        recoveryKey ??= await _recoveryKeyService.GenerateNewKeyAsync();

        var bookId = Guid.NewGuid();

        var relativeFilePath = await _fileStorageService.SaveUploadAsync(recoveryKey.Id, bookId, originalFileName, fileContent);
        var absoluteFilePath = _fileStorageService.GetAbsolutePath(relativeFilePath);

        var book = await BuildBookAsync(recoveryKey.Id, bookId, relativeFilePath, absoluteFilePath, fileSizeBytes, extension);

        await _bookRepository.AddAsync(book);

        return (book, recoveryKey);
    }

    private async Task<Book> BuildBookAsync(Guid recoveryKeyId, Guid bookId, string relativeFilePath, string absoluteFilePath, long fileSizeBytes, string extension)
    {
        var bookType = extension.ToLowerInvariant() switch
        {
            ".pdf" => BookType.Pdf,
            ".docx" => BookType.Docx,
            _ => BookType.Epub
        };

        var parsed = bookType switch
        {
            BookType.Pdf => await _pdfParsingService.ParseAsync(absoluteFilePath),
            BookType.Docx => await _docxParsingService.ParseAsync(absoluteFilePath),
            _ => await _epubParsingService.ParseAsync(absoluteFilePath)
        };

        string? relativeCoverPath = null;
        if (parsed.CoverImageBytes is { Length: > 0 })
        {
            relativeCoverPath = await _fileStorageService.SaveCoverAsync(
                recoveryKeyId, bookId, parsed.CoverImageBytes, parsed.CoverImageExtension ?? ".jpg");
        }

        return new Book
        {
            Id = bookId,
            RecoveryKeyId = recoveryKeyId,
            Type = bookType,
            Title = Truncate(parsed.Title) ?? "Untitled",
            Author = Truncate(parsed.Author),
            EpubFilePath = relativeFilePath,
            CoverImagePath = Truncate(relativeCoverPath),
            FileSizeBytes = fileSizeBytes,
            UploadedAtUtc = DateTime.UtcNow,
            Chapters = parsed.Chapters.Select(c => new Chapter
            {
                Id = Guid.NewGuid(),
                Order = c.Order,
                Title = Truncate(c.Title) ?? $"Chapter {c.Order}",
                EpubItemHref = Truncate(c.EpubItemHref) ?? string.Empty
            }).ToList()
        };
    }

    private static string? Truncate(string? value, int maxLength = 450)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= maxLength ? value : value.Substring(0, maxLength);
    }

    public Task<List<Book>> GetLibraryAsync(Guid recoveryKeyId)
    {
        return _bookRepository.GetByRecoveryKeyAsync(recoveryKeyId);
    }

    public async Task<bool> DeleteBookAsync(Guid recoveryKeyId, Guid bookId)
    {
        var book = await _bookRepository.GetByIdAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId)
        {
            return false;
        }

        await _bookRepository.DeleteAsync(book);
        _fileStorageService.DeleteBookFiles(recoveryKeyId, bookId);
        return true;
    }
}