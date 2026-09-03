using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IAlbumRepository
{
    Task<List<Album>> GetAllByRecoveryKeyAsync(Guid recoveryKeyId);
    Task<Album?> GetByIdAsync(Guid albumId, Guid recoveryKeyId);
    Task<Album?> GetByIdWithBooksAsync(Guid albumId, Guid recoveryKeyId);
    Task AddAsync(Album album);
    Task UpdateAsync(Album album);
    Task DeleteAsync(Album album);
    Task AddBooksToAlbumAsync(Guid albumId, Guid recoveryKeyId, List<Guid> bookIds);
    Task RemoveBookFromAlbumAsync(Guid albumId, Guid bookId, Guid recoveryKeyId);
    Task<List<Guid>> GetAlbumIdsForBookAsync(Guid bookId, Guid recoveryKeyId);
    Task SetBookAlbumsAsync(Guid bookId, Guid recoveryKeyId, List<Guid> albumIds);
}
