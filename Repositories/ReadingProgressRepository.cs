using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class ReadingProgressRepository : IReadingProgressRepository
{
    private readonly AppDbContext _db;

    public ReadingProgressRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ReadingProgress?> GetByBookIdAsync(Guid bookId)
    {
        return await _db.ReadingProgresses.FirstOrDefaultAsync(p => p.BookId == bookId);
    }

    public async Task AddAsync(ReadingProgress progress)
    {
        _db.ReadingProgresses.Add(progress);
        await _db.SaveChangesAsync();
    }

    public async Task SaveAsync(ReadingProgress progress)
    {
        progress.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
