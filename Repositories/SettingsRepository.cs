using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class SettingsRepository : ISettingsRepository
{
    private readonly AppDbContext _db;

    public SettingsRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Settings?> GetByRecoveryKeyIdAsync(Guid recoveryKeyId)
    {
        return await _db.Settings.FirstOrDefaultAsync(s => s.RecoveryKeyId == recoveryKeyId);
    }

    public async Task AddAsync(Settings settings)
    {
        _db.Settings.Add(settings);
        await _db.SaveChangesAsync();
    }

    public async Task SaveAsync(Settings settings)
    {
        await _db.SaveChangesAsync();
    }
}
