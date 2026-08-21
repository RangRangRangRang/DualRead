using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IReadingProgressRepository
{
    Task<ReadingProgress?> GetByBookIdAsync(Guid bookId);
    Task AddAsync(ReadingProgress progress);
    Task SaveAsync(ReadingProgress progress);
}
