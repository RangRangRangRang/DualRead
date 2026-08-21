using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class BookRepository : IBookRepository
{
    private readonly AppDbContext _db;

    public BookRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Book>> GetByRecoveryKeyAsync(Guid recoveryKeyId)
    {
        return await _db.Books
            .Where(b => b.RecoveryKeyId == recoveryKeyId)
            .OrderByDescending(b => b.UploadedAtUtc)
            .ToListAsync();
    }

    public async Task<Book?> GetByIdAsync(Guid bookId)
    {
        return await _db.Books.FirstOrDefaultAsync(b => b.Id == bookId);
    }

    public async Task<Book?> GetByIdWithChaptersAsync(Guid bookId)
    {
        return await _db.Books
            .Include(b => b.Chapters.OrderBy(c => c.Order))
            .FirstOrDefaultAsync(b => b.Id == bookId);
    }

    public async Task AddAsync(Book book)
    {
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Book book)
    {
        _db.Books.Remove(book);
        await _db.SaveChangesAsync();
    }
}