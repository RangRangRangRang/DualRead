using DualRead.ViewModels;

namespace DualRead.Services.Interfaces;

public interface IPdfParsingService
{
    Task<ParsedEpubResult> ParseAsync(string absolutePdfFilePath);

    Task<string> GetChapterHtmlAsync(string absolutePdfFilePath, string chapterHref, Guid recoveryKeyId, Guid bookId);

    /// <summary>Reads a previously-rasterized page image back from disk or renders it on demand for the Reader/Asset endpoint.</summary>
    Task<(byte[] Bytes, string ContentType)?> GetRenderedPageAssetAsync(string absolutePdfFilePath, Guid recoveryKeyId, Guid bookId, string src);
}