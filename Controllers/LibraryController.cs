using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;
using DualRead.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace DualRead.Controllers;

public class LibraryController : Controller
{
    private const long MaxUploadBytes = 200 * 1024 * 1024;
    private readonly IBookService _bookService;
    private readonly ICurrentRecoveryKeyAccessor _currentRecoveryKeyAccessor;
    private readonly ISettingsRepository _settingsRepo;

    public LibraryController(
        IBookService bookService,
        ICurrentRecoveryKeyAccessor currentRecoveryKeyAccessor,
        ISettingsRepository settingsRepo)
    {
        _bookService = bookService;
        _currentRecoveryKeyAccessor = currentRecoveryKeyAccessor;
        _settingsRepo = settingsRepo;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null)
        {
            return RedirectToAction("Index", "Home");
        }

        var books = await _bookService.GetLibraryAsync(recoveryKey.Id);
        var settings = await _settingsRepo.GetByRecoveryKeyIdAsync(recoveryKey.Id);
        ViewBag.RecoveryKeyCode = recoveryKey.Code;
        ViewBag.Language = settings?.Language ?? "en";
        ViewBag.Font = settings?.Font ?? "Georgia, serif";
        return View(books);
    }

    [HttpPost("/api/settings/language")]
    public async Task<IActionResult> SaveLanguage([FromBody] LanguageUpdateDto? dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Language))
        {
            return BadRequest("Language is required.");
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var settings = await _settingsRepo.GetByRecoveryKeyIdAsync(recoveryKey.Id);
        if (settings is null)
        {
            settings = new Settings
            {
                RecoveryKeyId = recoveryKey.Id,
                Language = dto.Language
            };
            await _settingsRepo.AddAsync(settings);
        }
        else
        {
            settings.Language = dto.Language;
            await _settingsRepo.SaveAsync(settings);
        }

        return Ok(new { success = true, language = settings.Language });
    }

    [HttpGet]
    public async Task<IActionResult> Upload()
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        ViewBag.HasExistingKey = recoveryKey is not null;
        return View();
    }

    private static readonly string[] SupportedExtensions = { ".epub", ".pdf", ".docx" };

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(MaxUploadBytes * 20)]
    public async Task<IActionResult> Upload(List<IFormFile> epubFiles)
    {
        if (epubFiles is null || epubFiles.Count == 0 || epubFiles.All(f => f.Length == 0))
        {
            ModelState.AddModelError(string.Empty, "Choose at least one .epub, .pdf, or .docx file to upload.");
            return View();
        }

        var existingKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        Guid? activeRecoveryKeyId = existingKey?.Id;
        string? newlyCreatedKeyCode = null;

        var succeeded = new List<string>();
        var failed = new List<(string FileName, string Reason)>();

        var seenInBatch = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var file in epubFiles)
        {
            if (file is null || file.Length == 0) continue;

            var dedupeKey = $"{file.FileName}::{file.Length}";
            if (!seenInBatch.Add(dedupeKey))
            {
                failed.Add((file.FileName, "Duplicate file in this upload batch - skipped."));
                continue;
            }

            var extension = Path.GetExtension(file.FileName);
            if (!SupportedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            {
                failed.Add((file.FileName, "Unsupported file type - only .epub, .pdf, and .docx are supported."));
                continue;
            }

            if (file.Length > MaxUploadBytes)
            {
                failed.Add((file.FileName, "File is too large (200 MB max)."));
                continue;
            }

            try
            {
                await using var stream = file.OpenReadStream();
                var (_, recoveryKey) = await _bookService.UploadBookAsync(
                    activeRecoveryKeyId, file.FileName, file.Length, stream);

                if (activeRecoveryKeyId is null)
                {
                    activeRecoveryKeyId = recoveryKey.Id;
                    newlyCreatedKeyCode = recoveryKey.Code;
                }

                succeeded.Add(file.FileName);
            }
            catch (Exception ex)
            {
                failed.Add((file.FileName, ex.Message));
            }
        }

        if (activeRecoveryKeyId.HasValue)
        {
            _currentRecoveryKeyAccessor.SetActiveKeyCookie(activeRecoveryKeyId.Value);
        }

        TempData["JustCreatedKey"] = newlyCreatedKeyCode;

        if (succeeded.Count > 0)
        {
            TempData["UploadSuccessCount"] = succeeded.Count;
            TempData["UploadSuccessFiles"] = string.Join("|", succeeded);
        }

        if (failed.Count > 0)
        {
            TempData["UploadErrors"] = string.Join("|", failed.Select(f => $"{f.FileName}: {f.Reason}"));
        }

        if (succeeded.Count == 0)
        {
            ModelState.AddModelError(string.Empty, "No files were uploaded successfully. See details below.");
            ViewBag.UploadErrors = failed;
            return View();
        }

        return RedirectToAction("Index", "Library");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null)
        {
            return RedirectToAction("Index", "Home");
        }

        await _bookService.DeleteBookAsync(recoveryKey.Id, id);
        return RedirectToAction("Index", "Library");
    }
}