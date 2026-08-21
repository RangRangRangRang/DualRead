using DualRead.Services.Interfaces;
using DualRead.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace DualRead.Controllers;

[Route("Reader")]
public class ReaderController : Controller
{
    private readonly IReaderService _readerService;
    private readonly ICurrentRecoveryKeyAccessor _currentRecoveryKeyAccessor;
    private readonly ITranslationExportService _translationExportService;
    private readonly ILogger<ReaderController> _logger;
    private readonly IWebHostEnvironment _env;

    public ReaderController(
        IReaderService readerService,
        ICurrentRecoveryKeyAccessor currentRecoveryKeyAccessor,
        ITranslationExportService translationExportService,
        ILogger<ReaderController> logger,
        IWebHostEnvironment env)
    {
        _readerService = readerService;
        _currentRecoveryKeyAccessor = currentRecoveryKeyAccessor;
        _translationExportService = translationExportService;
        _logger = logger;
        _env = env;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Index(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null)
        {
            return RedirectToAction("Index", "Home");
        }

        var bundle = await _readerService.GetReaderBundleAsync(id, recoveryKey.Id);
        if (bundle is null)
        {
            return NotFound();
        }

        return View(bundle);
    }

    [HttpGet("{id:guid}/Chapter/{chapterId:guid}")]
    public async Task<IActionResult> Chapter(Guid id, Guid chapterId)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var content = await _readerService.GetChapterContentAsync(id, chapterId, recoveryKey.Id);
        if (content is null) return NotFound();

        return Json(content);
    }

    [HttpGet("{id:guid}/Asset")]
    public async Task<IActionResult> Asset(Guid id, [FromQuery] Guid chapterId, [FromQuery] string src)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var asset = await _readerService.GetChapterAssetAsync(id, chapterId, recoveryKey.Id, src);
        if (asset is null) return NotFound();

        return File(asset.Value.Bytes, asset.Value.ContentType);
    }

    [HttpPost("{id:guid}/Progress")]
    public async Task<IActionResult> SaveProgress(Guid id, [FromBody] ReaderProgressUpdateDto? dto)
    {
        if (dto is null) return BadRequest("Missing progress payload.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var ok = await _readerService.SaveProgressAsync(id, recoveryKey.Id, dto);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/Settings")]
    public async Task<IActionResult> SaveSettings(Guid id, [FromBody] ReaderSettingsDto? dto)
    {
        if (dto is null) return BadRequest("Missing settings payload.");

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var ok = await _readerService.SaveSettingsAsync(recoveryKey.Id, dto);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/Bookmarks")]
    public async Task<IActionResult> AddBookmark(Guid id, [FromBody] BookmarkCreateDto? dto)
    {
        if (dto is null) return BadRequest("Missing bookmark payload.");

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var bookmark = await _readerService.AddBookmarkAsync(id, recoveryKey.Id, dto);
        return bookmark is null ? NotFound() : Json(bookmark);
    }

    [HttpPost("{id:guid}/Bookmarks/{bookmarkId:guid}/Delete")]
    public async Task<IActionResult> DeleteBookmark(Guid id, Guid bookmarkId)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var ok = await _readerService.DeleteBookmarkAsync(id, recoveryKey.Id, bookmarkId);
        return ok ? NoContent() : NotFound();
    }
    [HttpPost("{id:guid}/Chapter/{chapterId:guid}/Translations")]
    public async Task<IActionResult> SaveTranslation(Guid id, Guid chapterId, [FromBody] TranslationSaveDto dto)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var result = await _readerService.SaveTranslationAsync(id, chapterId, recoveryKey.Id, dto);
        return result is null ? NotFound() : Json(result);
    }

    [HttpGet("{id:guid}/ExportTranslation")]
    public async Task<IActionResult> ExportTranslation(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var export = await _translationExportService.ExportTranslationToDocxAsync(id, recoveryKey.Id);
        if (export is null) return NotFound();

        return File(
            export.Value.Bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            export.Value.FileName);
    }
}