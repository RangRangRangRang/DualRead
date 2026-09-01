namespace DualRead.Services.Interfaces;

public interface IFileStorageService
{
    string UploadsRoot { get; }

    Task<string> SaveUploadAsync(Guid recoveryKeyId, Guid bookId, string fileName, Stream content);

    Task<string> SaveCoverAsync(Guid recoveryKeyId, Guid bookId, byte[] imageBytes, string extension);

    string GetAbsolutePath(string relativePath);

    void DeleteBookFiles(Guid recoveryKeyId, Guid bookId);
}