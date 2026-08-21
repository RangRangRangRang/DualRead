using DualRead.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DualRead.Controllers;

public class LibraryController : Controller
{
    private const long MaxUploadBytes = 200 * 1024 * 1024; // 200 MB

    private readonly IBookService _bookService;
    private readonly ICurrentRecoveryKeyAccessor _currentRecoveryKeyAccessor;

    public LibraryController(IBookService bookService, ICurrentRecoveryKeyAccessor currentRecoveryKeyAccessor)
    {
        _bookService = bookService;
        _currentRecoveryKeyAccessor = currentRecoveryKeyAccessor;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        // Kiểm tra xem trình duyệt đã có Key active chưa
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null)
        {
            // Nếu chưa có Key hợp lệ -> Đẩy về trang Gateway (Home) bắt buộc người dùng Nhập Key/Upload
            return RedirectToAction("Index", "Home");
        }

        var books = await _bookService.GetLibraryAsync(recoveryKey.Id);
        ViewBag.RecoveryKeyCode = recoveryKey.Code;
        return View(books);
    }

    [HttpGet]
    public async Task<IActionResult> Upload()
    {
        // Trang Gateway / Chào mừng (chứa cả Form Upload lẫn Form Nhập Key)
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        ViewBag.HasExistingKey = recoveryKey is not null;
        return View();
    }

    private static readonly string[] SupportedExtensions = { ".epub" };

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(MaxUploadBytes * 20)] // cho phép nhiều file trong 1 lượt POST
    public async Task<IActionResult> Upload(List<IFormFile> epubFiles)
    {
        if (epubFiles is null || epubFiles.Count == 0 || epubFiles.All(f => f.Length == 0))
        {
            ModelState.AddModelError(string.Empty, "Choose at least one .epub file to upload.");
            return View();
        }

        var existingKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        Guid? activeRecoveryKeyId = existingKey?.Id;
        string? newlyCreatedKeyCode = null;

        var succeeded = new List<string>();
        var failed = new List<(string FileName, string Reason)>();

        // Phòng vệ ở server: nếu client-side dedupe bị bỏ qua (JS tắt, hoặc gọi endpoint trực
        // tiếp), vẫn không xử lý 2 lần cùng 1 file (tên + kích cỡ giống hệt nhau) trong 1 batch.
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
                failed.Add((file.FileName, "Unsupported file type - only .epub is supported."));
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

                // Mọi file trong CÙNG 1 lượt upload phải thuộc CÙNG 1 recovery key - dùng key vừa
                // tạo/xác nhận cho các file tiếp theo trong vòng lặp, tránh mỗi file lại tự sinh
                // 1 key riêng (chỉ xảy ra ở file ĐẦU TIÊN nếu người dùng chưa có key nào).
                if (activeRecoveryKeyId is null)
                {
                    activeRecoveryKeyId = recoveryKey.Id;
                    newlyCreatedKeyCode = recoveryKey.Code;
                }

                succeeded.Add(file.FileName);
            }
            catch (Exception ex)
            {
                // Một file lỗi (epub hỏng, không đọc được) không được làm sập cả batch - các
                // file hợp lệ khác trong cùng lượt upload vẫn phải thành công bình thường.
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

        // Không có file nào thành công -> ở lại trang Upload để người dùng thấy lỗi ngay, thay vì
        // chuyển sang Library mà không rõ vì sao không thấy sách mới.
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