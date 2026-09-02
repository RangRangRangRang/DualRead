using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IVocabularyRepository
{
    Task<List<VocabularyItem>> GetAllByRecoveryKeyAsync(Guid recoveryKeyId);
    Task<List<VocabularyItem>> GetByBookIdAsync(Guid recoveryKeyId, Guid bookId);
    Task<VocabularyItem?> GetByIdAsync(Guid id, Guid recoveryKeyId);
    Task AddAsync(VocabularyItem item);
    Task DeleteAsync(VocabularyItem item);
}
