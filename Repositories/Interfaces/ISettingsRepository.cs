using DualRead.Models;

namespace DualRead.Repositories.Interfaces;

public interface ISettingsRepository
{
    Task<Settings?> GetByRecoveryKeyIdAsync(Guid recoveryKeyId);
    Task AddAsync(Settings settings);
    Task SaveAsync(Settings settings);
}
