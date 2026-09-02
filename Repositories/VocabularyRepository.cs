using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class VocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _db;

    public VocabularyRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<VocabularyItem>> GetAllByRecoveryKeyAsync(Guid recoveryKeyId)
    {
        return await _db.VocabularyItems
            .Where(v => v.RecoveryKeyId == recoveryKeyId)
            .OrderByDescending(v => v.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<List<VocabularyItem>> GetByBookIdAsync(Guid recoveryKeyId, Guid bookId)
    {
        return await _db.VocabularyItems
            .Where(v => v.RecoveryKeyId == recoveryKeyId && v.BookId == bookId)
            .OrderByDescending(v => v.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<VocabularyItem?> GetByIdAsync(Guid id, Guid recoveryKeyId)
    {
        return await _db.VocabularyItems
            .FirstOrDefaultAsync(v => v.Id == id && v.RecoveryKeyId == recoveryKeyId);
    }

    public async Task AddAsync(VocabularyItem item)
    {
        _db.VocabularyItems.Add(item);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(VocabularyItem item)
    {
        _db.VocabularyItems.Remove(item);
        await _db.SaveChangesAsync();
    }
}
