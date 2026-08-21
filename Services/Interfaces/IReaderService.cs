using DualRead.ViewModels;

namespace DualRead.Services.Interfaces;

public interface IReaderService
{
        Task<ReaderBundleViewModel?> GetReaderBundleAsync(Guid bookId, Guid recoveryKeyId);

    Task<ChapterContentDto?> GetChapterContentAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId);

    Task<(byte[] Bytes, string ContentType)?> GetChapterAssetAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId, string src);

    Task<bool> SaveProgressAsync(Guid bookId, Guid recoveryKeyId, ReaderProgressUpdateDto dto);

    Task<bool> SaveSettingsAsync(Guid recoveryKeyId, ReaderSettingsDto dto);

    Task<ReaderBookmarkDto?> AddBookmarkAsync(Guid bookId, Guid recoveryKeyId, BookmarkCreateDto dto);

    Task<bool> DeleteBookmarkAsync(Guid bookId, Guid recoveryKeyId, Guid bookmarkId);

    Task<TranslationDto?> SaveTranslationAsync(Guid bookId, Guid chapterId, Guid recoveryKeyId, TranslationSaveDto dto);
}
