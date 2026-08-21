namespace DualRead.Services.Interfaces;

/// <summary>
/// Exports a book's saved paragraph translations to a downloadable file. v1 scope: .docx only,
/// translated text only (no side-by-side original) - see Claude.md scope notes.
/// </summary>
public interface ITranslationExportService
{
    /// <summary>
    /// Builds a .docx containing every saved translated paragraph, grouped by chapter, for the
    /// given book. Returns null if the book doesn't exist or doesn't belong to this recovery key.
    /// </summary>
    Task<(byte[] Bytes, string FileName)?> ExportTranslationToDocxAsync(Guid bookId, Guid recoveryKeyId);
}