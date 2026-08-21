namespace DualRead.Services.Interfaces;

/// <summary>
/// Resolves absolute paths for uploaded books (epub), extracted covers, and performs the actual
/// disk writes/deletes. Keeps physical storage layout out of controllers.
/// </summary>
public interface IFileStorageService
{
    string UploadsRoot { get; }

    /// <summary>Saves a stream under Uploads/{recoveryKeyId}/{bookId}/{fileName} and returns the relative path.</summary>
    Task<string> SaveUploadAsync(Guid recoveryKeyId, Guid bookId, string fileName, Stream content);

    /// <summary>Saves cover bytes under Uploads/{recoveryKeyId}/{bookId}/cover.{ext} and returns the relative path.</summary>
    Task<string> SaveCoverAsync(Guid recoveryKeyId, Guid bookId, byte[] imageBytes, string extension);

    string GetAbsolutePath(string relativePath);

    void DeleteBookFiles(Guid recoveryKeyId, Guid bookId);
}