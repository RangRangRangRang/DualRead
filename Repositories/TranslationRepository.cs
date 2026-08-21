using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class TranslationRepository : ITranslationRepository
{
    private readonly AppDbContext _db;

    public TranslationRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Translation>> GetByChapterIdAsync(Guid chapterId)
    {
        return await _db.Translations
            .Where(t => t.ChapterId == chapterId)
            .OrderBy(t => t.ParagraphIndex)
            .ToListAsync();
    }

    public async Task<List<Translation>> GetByBookIdAsync(Guid bookId)
    {
        return await _db.Translations
            .Where(t => t.BookId == bookId)
            .OrderBy(t => t.ParagraphIndex)
            .ToListAsync();
    }

    public async Task<Translation?> GetAsync(Guid chapterId, int paragraphIndex)
    {
        return await _db.Translations
            .FirstOrDefaultAsync(t => t.ChapterId == chapterId && t.ParagraphIndex == paragraphIndex);
    }

    public async Task UpsertAsync(Guid bookId, Guid chapterId, int paragraphIndex, string translatedText)
    {
        var existing = await GetAsync(chapterId, paragraphIndex);

        if (existing is null)
        {
                        if (string.IsNullOrEmpty(translatedText)) return;

            _db.Translations.Add(new Translation
            {
                BookId = bookId,
                ChapterId = chapterId,
                ParagraphIndex = paragraphIndex,
                TranslatedText = translatedText,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }
        else
        {
            existing.TranslatedText = translatedText;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}