using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface ITranslationRepository
{
    Task<List<Translation>> GetByChapterIdAsync(Guid chapterId);
    Task<List<Translation>> GetByBookIdAsync(Guid bookId);
    Task<Translation?> GetAsync(Guid chapterId, int paragraphIndex);
    Task UpsertAsync(Guid bookId, Guid chapterId, int paragraphIndex, string translatedText);
}