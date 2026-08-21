using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IBookRepository
{
    Task<List<Book>> GetByRecoveryKeyAsync(Guid recoveryKeyId);
    Task<Book?> GetByIdAsync(Guid bookId);
    Task<Book?> GetByIdWithChaptersAsync(Guid bookId);
    Task AddAsync(Book book);
    Task DeleteAsync(Book book);
}