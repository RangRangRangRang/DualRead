using DualRead.Models;

namespace DualRead.Services.Interfaces;

public interface IBookService
{
    Task<(Book Book, Models.RecoveryKey RecoveryKey)> UploadBookAsync(Guid? recoveryKeyId, string originalFileName, long fileSizeBytes, Stream fileContent);

    Task<List<Book>> GetLibraryAsync(Guid recoveryKeyId);

    Task<bool> DeleteBookAsync(Guid recoveryKeyId, Guid bookId);
}