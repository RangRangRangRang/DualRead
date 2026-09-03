using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class AlbumRepository : IAlbumRepository
{
    private readonly AppDbContext _db;

    public AlbumRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Album>> GetAllByRecoveryKeyAsync(Guid recoveryKeyId)
    {
        return await _db.Albums
            .Where(a => a.RecoveryKeyId == recoveryKeyId)
            .Include(a => a.AlbumBooks)
                .ThenInclude(ab => ab.Book)
            .OrderByDescending(a => a.CreatedAtUtc)
            .ToListAsync();
    }

    public async Task<Album?> GetByIdAsync(Guid albumId, Guid recoveryKeyId)
    {
        return await _db.Albums
            .FirstOrDefaultAsync(a => a.Id == albumId && a.RecoveryKeyId == recoveryKeyId);
    }

    public async Task<Album?> GetByIdWithBooksAsync(Guid albumId, Guid recoveryKeyId)
    {
        return await _db.Albums
            .Include(a => a.AlbumBooks)
                .ThenInclude(ab => ab.Book)
            .FirstOrDefaultAsync(a => a.Id == albumId && a.RecoveryKeyId == recoveryKeyId);
    }

    public async Task AddAsync(Album album)
    {
        _db.Albums.Add(album);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Album album)
    {
        album.UpdatedAtUtc = DateTime.UtcNow;
        _db.Albums.Update(album);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Album album)
    {
        _db.Albums.Remove(album);
        await _db.SaveChangesAsync();
    }

    public async Task AddBooksToAlbumAsync(Guid albumId, Guid recoveryKeyId, List<Guid> bookIds)
    {
        var album = await _db.Albums
            .FirstOrDefaultAsync(a => a.Id == albumId && a.RecoveryKeyId == recoveryKeyId);

        if (album is null || bookIds.Count == 0) return;

        // Verify valid books belonging to this user
        var validBooks = await _db.Books
            .Where(b => b.RecoveryKeyId == recoveryKeyId && bookIds.Contains(b.Id))
            .Select(b => b.Id)
            .ToListAsync();

        var existingBookIds = await _db.AlbumBooks
            .Where(ab => ab.AlbumId == albumId && validBooks.Contains(ab.BookId))
            .Select(ab => ab.BookId)
            .ToListAsync();

        var newBookIds = validBooks.Except(existingBookIds).ToList();
        if (newBookIds.Count == 0) return;

        var maxOrder = await _db.AlbumBooks
            .Where(ab => ab.AlbumId == albumId)
            .Select(ab => (int?)ab.Order)
            .MaxAsync() ?? 0;

        foreach (var bookId in newBookIds)
        {
            maxOrder++;
            _db.AlbumBooks.Add(new AlbumBook
            {
                AlbumId = albumId,
                BookId = bookId,
                AddedAtUtc = DateTime.UtcNow,
                Order = maxOrder
            });
        }

        album.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task RemoveBookFromAlbumAsync(Guid albumId, Guid bookId, Guid recoveryKeyId)
    {
        var album = await _db.Albums
            .FirstOrDefaultAsync(a => a.Id == albumId && a.RecoveryKeyId == recoveryKeyId);

        if (album is null) return;

        var albumBook = await _db.AlbumBooks
            .FirstOrDefaultAsync(ab => ab.AlbumId == albumId && ab.BookId == bookId);

        if (albumBook is not null)
        {
            _db.AlbumBooks.Remove(albumBook);
            album.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<List<Guid>> GetAlbumIdsForBookAsync(Guid bookId, Guid recoveryKeyId)
    {
        return await _db.AlbumBooks
            .Where(ab => ab.BookId == bookId && ab.Album.RecoveryKeyId == recoveryKeyId)
            .Select(ab => ab.AlbumId)
            .ToListAsync();
    }

    public async Task SetBookAlbumsAsync(Guid bookId, Guid recoveryKeyId, List<Guid> albumIds)
    {
        // Verify book belongs to recoveryKeyId
        var book = await _db.Books
            .FirstOrDefaultAsync(b => b.Id == bookId && b.RecoveryKeyId == recoveryKeyId);

        if (book is null) return;

        // Verify valid albums belonging to recoveryKeyId
        var validAlbumIds = await _db.Albums
            .Where(a => a.RecoveryKeyId == recoveryKeyId && albumIds.Contains(a.Id))
            .Select(a => a.Id)
            .ToListAsync();

        var currentAlbumBooks = await _db.AlbumBooks
            .Where(ab => ab.BookId == bookId && ab.Album.RecoveryKeyId == recoveryKeyId)
            .ToListAsync();

        var currentAlbumIds = currentAlbumBooks.Select(ab => ab.AlbumId).ToHashSet();

        // Remove unselected
        var toRemove = currentAlbumBooks.Where(ab => !validAlbumIds.Contains(ab.AlbumId)).ToList();
        if (toRemove.Count > 0)
        {
            _db.AlbumBooks.RemoveRange(toRemove);
        }

        // Add newly selected
        var toAdd = validAlbumIds.Where(aid => !currentAlbumIds.Contains(aid)).ToList();
        foreach (var aid in toAdd)
        {
            _db.AlbumBooks.Add(new AlbumBook
            {
                AlbumId = aid,
                BookId = bookId,
                AddedAtUtc = DateTime.UtcNow,
                Order = 0
            });
        }

        await _db.SaveChangesAsync();
    }
}
