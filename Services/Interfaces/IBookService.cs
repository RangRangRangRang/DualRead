using DualRead.Models;

namespace DualRead.Services.Interfaces;

public interface IBookService
{
    /// <summary>
    /// Saves the uploaded .epub file to disk, parses metadata and chapters, and persists the
    /// Book + Chapters. If recoveryKeyId is null, a brand new RecoveryKey is generated first
    /// (first-time upload). Returns the created Book and the RecoveryKey it belongs to.
    /// </summary>
    Task<(Book Book, Models.RecoveryKey RecoveryKey)> UploadBookAsync(Guid? recoveryKeyId, string originalFileName, long fileSizeBytes, Stream fileContent);

    Task<List<Book>> GetLibraryAsync(Guid recoveryKeyId);

    Task<bool> DeleteBookAsync(Guid recoveryKeyId, Guid bookId);
}