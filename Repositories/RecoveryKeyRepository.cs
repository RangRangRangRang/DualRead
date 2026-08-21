using DualRead.Data;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Repositories;

public class RecoveryKeyRepository : IRecoveryKeyRepository
{
    private readonly AppDbContext _db;

    public RecoveryKeyRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<RecoveryKey?> GetByCodeAsync(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return await _db.RecoveryKeys.FirstOrDefaultAsync(r => r.Code == normalized);
    }

    public async Task<RecoveryKey?> GetByIdAsync(Guid id)
    {
        return await _db.RecoveryKeys.FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<bool> CodeExistsAsync(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return await _db.RecoveryKeys.AnyAsync(r => r.Code == normalized);
    }

    public async Task AddAsync(RecoveryKey recoveryKey)
    {
        _db.RecoveryKeys.Add(recoveryKey);
        await _db.SaveChangesAsync();
    }

    public async Task TouchLastAccessedAsync(Guid id)
    {
        var key = await _db.RecoveryKeys.FirstOrDefaultAsync(r => r.Id == id);
        if (key is null) return;
        key.LastAccessedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
