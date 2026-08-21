using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IBookmarkRepository
{
    Task<List<Bookmark>> GetByBookIdAsync(Guid bookId);
    Task<Bookmark?> GetByIdAsync(Guid bookmarkId);
    Task AddAsync(Bookmark bookmark);
    Task DeleteAsync(Bookmark bookmark);
}
