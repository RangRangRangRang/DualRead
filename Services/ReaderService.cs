using System.Net;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;
using DualRead.ViewModels;

namespace DualRead.Services;

public class ReaderService : IReaderService
{
    private readonly IBookRepository _bookRepository;
    private readonly IReadingProgressRepository _progressRepository;
    private readonly ISettingsRepository _settingsRepository;
    private readonly IBookmarkRepository _bookmarkRepository;
    private readonly IFileStorageService _fileStorageService;
    private readonly IEpubParsingService _epubParsingService;
    private readonly ITranslationRepository _translationRepository;

    public ReaderService(
        IBookRepository bookRepository,
        IReadingProgressRepository progressRepository,
        ISettingsRepository settingsRepository,
        IBookmarkRepository bookmarkRepository,
        IFileStorageService fileStorageService,
        IEpubParsingService epubParsingService,
        ITranslationRepository translationRepository)
    {
        _bookRepository = bookRepository;
        _progressRepository = progressRepository;
        _settingsRepository = settingsRepository;
        _bookmarkRepository = bookmarkRepository;
        _fileStorageService = fileStorageService;
        _epubParsingService = epubParsingService;
        _translationRepository = translationRepository;
    }

    public async Task<ReaderBundleViewModel?> GetReaderBundleAsync(Guid bookId, Guid recoveryKeyId)
    {
        var lookup = await _bookRepository.GetByIdAsync(bookId);
        if (lookup is null || lookup.RecoveryKeyId != recoveryKeyId) return null;

        var book = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        if (book is null) return null;

        var progress = await GetOrCreateProgressAsync(book);
        var settings = await GetOrCreateSettingsAsync(recoveryKeyId);
        var bookmarks = await _bookmarkRepository.GetByBookIdAsync(bookId);

        return new ReaderBundleViewModel
        {
            BookId = book.Id,
            Title = book.Title,
            Author = book.Author,
            Chapters = book.Chapters
                .OrderBy(c => c.Order)
                .Select(c => new ReaderChapterSummary { Id = c.Id, Order = c.Order, Title = c.Title, EpubItemHref = c.EpubItemHref })
                .ToList(),
            Progress = new ReaderProgressDto
            {
                CurrentChapterId = progress.CurrentChapterId,
                CurrentPage = progress.CurrentPage,
                CurrentScrollOffset = progress.CurrentScrollOffset,
                LinesPerPage = progress.LinesPerPage,
                TranslationModeOn = progress.TranslationModeOn
            },
            Settings = new ReaderSettingsDto
            {
                DarkMode = settings.DarkMode,
                Language = settings.Language,
                Font = settings.Font,
                FontSize = settings.FontSize,
                LineHeight = settings.LineHeight,
                LetterSpacing = settings.LetterSpacing,
                LinesPerPage = settings.LinesPerPage
            },
            Bookmarks = bookmarks.Select(MapBookmark).ToList()
        };
    }

    public async Task<ChapterContentDto?> GetChapterContentAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId)
    {
        var book = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return null;

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null) return null;

        var absolutePath = _fileStorageService.GetAbsolutePath(book.EpubFilePath);
        var rawHtml = await _epubParsingService.GetChapterHtmlAsync(absolutePath, chapter.EpubItemHref);

        var sanitized = ChapterHtmlSanitizer.ExtractAndSanitize(rawHtml, originalSrc =>
        {
            var encoded = WebUtility.UrlEncode(originalSrc);
            return $"/Reader/{book.Id}/Asset?chapterId={chapter.Id}&src={encoded}";
        });
        sanitized = ChapterHtmlSanitizer.IndexParagraphs(sanitized);

        var translations = await _translationRepository.GetByChapterIdAsync(chapterId);

        return new ChapterContentDto
        {
            ChapterId = chapter.Id,
            Order = chapter.Order,
            Title = chapter.Title,
            Html = sanitized,
            Translations = translations.Select(t => new TranslationDto
            {
                ParagraphIndex = t.ParagraphIndex,
                TranslatedText = t.TranslatedText,
                UpdatedAtUtc = t.UpdatedAtUtc
            }).ToList()
        };
    }

    public async Task<(byte[] Bytes, string ContentType)?> GetChapterAssetAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId, string src)
    {
        var book = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return null;

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null) return null;

        var absolutePath = _fileStorageService.GetAbsolutePath(book.EpubFilePath);
        return await _epubParsingService.GetAssetAsync(absolutePath, chapter.EpubItemHref, src);
    }

    public async Task<bool> SaveProgressAsync(Guid bookId, Guid recoveryKeyId, ReaderProgressUpdateDto dto)
    {
        var book = await _bookRepository.GetByIdAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return false;

        // A progress payload may omit the chapter for compatibility, but when
        // a chapter is supplied it must belong to this EPUB/book.
        if (dto.CurrentChapterId.HasValue)
        {
            var bookWithChapters = await _bookRepository.GetByIdWithChaptersAsync(bookId);
            var chapterExists = bookWithChapters?.Chapters.Any(c => c.Id == dto.CurrentChapterId.Value) == true;
            if (!chapterExists) return false;
        }

        var progress = await _progressRepository.GetByBookIdAsync(bookId);
        if (progress is null)
        {
            progress = new ReadingProgress { BookId = bookId };
            ApplyProgress(progress, dto);
            await _progressRepository.AddAsync(progress);
        }
        else
        {
            ApplyProgress(progress, dto);
            await _progressRepository.SaveAsync(progress);
        }

        return true;
    }

    public async Task<bool> SaveSettingsAsync(Guid recoveryKeyId, ReaderSettingsDto dto)
    {
        var settings = await _settingsRepository.GetByRecoveryKeyIdAsync(recoveryKeyId);
        if (settings is null)
        {
            settings = new Settings { RecoveryKeyId = recoveryKeyId };
            ApplySettings(settings, dto);
            await _settingsRepository.AddAsync(settings);
        }
        else
        {
            ApplySettings(settings, dto);
            await _settingsRepository.SaveAsync(settings);
        }

        return true;
    }

    public async Task<ReaderBookmarkDto?> AddBookmarkAsync(Guid bookId, Guid recoveryKeyId, BookmarkCreateDto dto)
    {
        var book = await _bookRepository.GetByIdAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return null;

        if (dto.ChapterId is null) return null;

        var bookWithChapters = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        var chapter = bookWithChapters?.Chapters.FirstOrDefault(c => c.Id == dto.ChapterId);
        if (chapter is null) return null;

        var bookmark = new Bookmark
        {
            BookId = bookId,
            ChapterId = dto.ChapterId,
            PageNumber = dto.PageNumber,
            LinesPerPage = dto.LinesPerPage,
            PreviewText = Truncate(dto.PreviewText)
        };

        await _bookmarkRepository.AddAsync(bookmark);
        bookmark.Chapter = chapter;

        return MapBookmark(bookmark);
    }

    public async Task<bool> DeleteBookmarkAsync(Guid bookId, Guid recoveryKeyId, Guid bookmarkId)
    {
        var book = await _bookRepository.GetByIdAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return false;

        var bookmark = await _bookmarkRepository.GetByIdAsync(bookmarkId);
        if (bookmark is null || bookmark.BookId != bookId) return false;

        await _bookmarkRepository.DeleteAsync(bookmark);
        return true;
    }

    private async Task<ReadingProgress> GetOrCreateProgressAsync(Book book)
    {
        var progress = await _progressRepository.GetByBookIdAsync(book.Id);
        if (progress is not null) return progress;

        progress = new ReadingProgress
        {
            BookId = book.Id,
            CurrentChapterId = book.Chapters.OrderBy(c => c.Order).FirstOrDefault()?.Id,
            CurrentPage = 0,
            CurrentScrollOffset = 0,
            LinesPerPage = 25
        };
        await _progressRepository.AddAsync(progress);
        return progress;
    }

    private async Task<Settings> GetOrCreateSettingsAsync(Guid recoveryKeyId)
    {
        var settings = await _settingsRepository.GetByRecoveryKeyIdAsync(recoveryKeyId);
        if (settings is not null) return settings;

        settings = new Settings { RecoveryKeyId = recoveryKeyId };
        await _settingsRepository.AddAsync(settings);
        return settings;
    }

    private static void ApplyProgress(ReadingProgress progress, ReaderProgressUpdateDto dto)
    {
        progress.CurrentChapterId = dto.CurrentChapterId;
        progress.CurrentPage = dto.CurrentPage;
        progress.CurrentScrollOffset = dto.CurrentScrollOffset;
        progress.LinesPerPage = dto.LinesPerPage;
        progress.TranslationModeOn = dto.TranslationModeOn;
    }

    private static void ApplySettings(Settings settings, ReaderSettingsDto dto)
    {
        settings.DarkMode = dto.DarkMode;
        settings.Language = dto.Language;
        settings.Font = dto.Font;
        settings.FontSize = dto.FontSize;
        settings.LineHeight = dto.LineHeight;
        settings.LetterSpacing = dto.LetterSpacing;
        settings.LinesPerPage = dto.LinesPerPage;
    }

    private static string? Truncate(string? value, int maxLength = 300)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static ReaderBookmarkDto MapBookmark(Bookmark bookmark) => new()
    {
        Id = bookmark.Id,
        ChapterId = bookmark.ChapterId,
        ChapterTitle = bookmark.Chapter?.Title,
        PageNumber = bookmark.PageNumber,
        LinesPerPage = bookmark.LinesPerPage,
        PreviewText = bookmark.PreviewText,
        CreatedAtUtc = bookmark.CreatedAtUtc
    };
    public async Task<TranslationDto?> SaveTranslationAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId, TranslationSaveDto dto)
    {
        var book = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return null;

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null) return null;

        var translatedText = dto.TranslatedText ?? string.Empty;

        await _translationRepository.UpsertAsync(bookId, chapterId, dto.ParagraphIndex, translatedText);

        return new TranslationDto
        {
            ParagraphIndex = dto.ParagraphIndex,
            TranslatedText = translatedText,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }
}