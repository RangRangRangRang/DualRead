using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface IRecoveryKeyRepository
{
    Task<RecoveryKey?> GetByCodeAsync(string code);
    Task<RecoveryKey?> GetByIdAsync(Guid id);
    Task<bool> CodeExistsAsync(string code);
    Task AddAsync(RecoveryKey recoveryKey);
    Task TouchLastAccessedAsync(Guid id);
}
