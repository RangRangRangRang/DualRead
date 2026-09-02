using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DualRead.Controllers;

[ApiController]
[Route("api/vocabulary")]
public class VocabularyController : ControllerBase
{
    private readonly IVocabularyRepository _vocabRepo;
    private readonly ICurrentRecoveryKeyAccessor _currentRecoveryKeyAccessor;
    private readonly ILogger<VocabularyController> _logger;

    public VocabularyController(
        IVocabularyRepository vocabRepo,
        ICurrentRecoveryKeyAccessor currentRecoveryKeyAccessor,
        ILogger<VocabularyController> logger)
    {
        _vocabRepo = vocabRepo;
        _currentRecoveryKeyAccessor = currentRecoveryKeyAccessor;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var list = await _vocabRepo.GetAllByRecoveryKeyAsync(recoveryKey.Id);
        return Ok(list);
    }

    [HttpGet("book/{bookId:guid}")]
    public async Task<IActionResult> GetByBook(Guid bookId)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var list = await _vocabRepo.GetByBookIdAsync(recoveryKey.Id, bookId);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] VocabularyCreateDto? dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.OriginalText) || string.IsNullOrWhiteSpace(dto.TranslatedText))
        {
            return BadRequest(new { error = "Original text and translation are required." });
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var item = new VocabularyItem
        {
            RecoveryKeyId = recoveryKey.Id,
            BookId = dto.BookId,
            BookTitle = dto.BookTitle?.Trim(),
            ChapterId = dto.ChapterId,
            ChapterTitle = dto.ChapterTitle?.Trim(),
            OriginalText = dto.OriginalText.Trim(),
            TranslatedText = dto.TranslatedText.Trim(),
            ContextText = dto.ContextText?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _vocabRepo.AddAsync(item);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var item = await _vocabRepo.GetByIdAsync(id, recoveryKey.Id);
        if (item is null) return NotFound();

        await _vocabRepo.DeleteAsync(item);
        return NoContent();
    }
}

public class VocabularyCreateDto
{
    public Guid? BookId { get; set; }
    public string? BookTitle { get; set; }
    public Guid? ChapterId { get; set; }
    public string? ChapterTitle { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public string? ContextText { get; set; }
}
