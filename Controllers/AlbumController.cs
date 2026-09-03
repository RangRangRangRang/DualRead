using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DualRead.Controllers;

[ApiController]
public class AlbumController : ControllerBase
{
    private readonly IAlbumRepository _albumRepo;
    private readonly IBookRepository _bookRepo;
    private readonly ICurrentRecoveryKeyAccessor _currentRecoveryKeyAccessor;
    private readonly ILogger<AlbumController> _logger;

    public AlbumController(
        IAlbumRepository albumRepo,
        IBookRepository bookRepo,
        ICurrentRecoveryKeyAccessor currentRecoveryKeyAccessor,
        ILogger<AlbumController> logger)
    {
        _albumRepo = albumRepo;
        _bookRepo = bookRepo;
        _currentRecoveryKeyAccessor = currentRecoveryKeyAccessor;
        _logger = logger;
    }

    [HttpGet("api/albums")]
    public async Task<IActionResult> GetAll()
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var albums = await _albumRepo.GetAllByRecoveryKeyAsync(recoveryKey.Id);

        var result = albums.Select(a => new
        {
            id = a.Id,
            name = a.Name,
            description = a.Description,
            createdAtUtc = a.CreatedAtUtc,
            updatedAtUtc = a.UpdatedAtUtc,
            bookCount = a.AlbumBooks.Count,
            books = a.AlbumBooks
                .OrderBy(ab => ab.Order)
                .ThenByDescending(ab => ab.AddedAtUtc)
                .Select(ab => new
                {
                    id = ab.Book.Id,
                    title = ab.Book.Title,
                    author = ab.Book.Author,
                    type = ab.Book.Type.ToString(),
                    coverImagePath = ab.Book.CoverImagePath != null ? $"/library-assets/{recoveryKey.Id}/{ab.Book.Id}/{Path.GetFileName(ab.Book.CoverImagePath)}" : null,
                    uploadedAtUtc = ab.Book.UploadedAtUtc,
                    addedAtUtc = ab.AddedAtUtc
                }).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpGet("api/albums/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var album = await _albumRepo.GetByIdWithBooksAsync(id, recoveryKey.Id);
        if (album is null) return NotFound();

        var result = new
        {
            id = album.Id,
            name = album.Name,
            description = album.Description,
            createdAtUtc = album.CreatedAtUtc,
            updatedAtUtc = album.UpdatedAtUtc,
            bookCount = album.AlbumBooks.Count,
            books = album.AlbumBooks
                .OrderBy(ab => ab.Order)
                .ThenByDescending(ab => ab.AddedAtUtc)
                .Select(ab => new
                {
                    id = ab.Book.Id,
                    title = ab.Book.Title,
                    author = ab.Book.Author,
                    type = ab.Book.Type.ToString(),
                    coverImagePath = ab.Book.CoverImagePath != null ? $"/library-assets/{recoveryKey.Id}/{ab.Book.Id}/{Path.GetFileName(ab.Book.CoverImagePath)}" : null,
                    uploadedAtUtc = ab.Book.UploadedAtUtc,
                    addedAtUtc = ab.AddedAtUtc
                }).ToList()
        };

        return Ok(result);
    }

    [HttpPost("api/albums")]
    public async Task<IActionResult> Create([FromBody] AlbumCreateDto? dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { error = "Album name is required." });
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var album = new Album
        {
            RecoveryKeyId = recoveryKey.Id,
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        await _albumRepo.AddAsync(album);

        return Ok(new
        {
            id = album.Id,
            name = album.Name,
            description = album.Description,
            createdAtUtc = album.CreatedAtUtc,
            bookCount = 0,
            books = new List<object>()
        });
    }

    [HttpPut("api/albums/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AlbumUpdateDto? dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { error = "Album name is required." });
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var album = await _albumRepo.GetByIdAsync(id, recoveryKey.Id);
        if (album is null) return NotFound();

        album.Name = dto.Name.Trim();
        if (dto.Description != null)
        {
            album.Description = dto.Description.Trim();
        }

        await _albumRepo.UpdateAsync(album);

        return Ok(new
        {
            id = album.Id,
            name = album.Name,
            description = album.Description,
            updatedAtUtc = album.UpdatedAtUtc
        });
    }

    [HttpDelete("api/albums/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var album = await _albumRepo.GetByIdAsync(id, recoveryKey.Id);
        if (album is null) return NotFound();

        await _albumRepo.DeleteAsync(album);
        return NoContent();
    }

    [HttpPost("api/albums/{id:guid}/books")]
    public async Task<IActionResult> AddBooks(Guid id, [FromBody] AddBooksDto? dto)
    {
        if (dto is null || dto.BookIds == null || dto.BookIds.Count == 0)
        {
            return BadRequest(new { error = "At least one bookId is required." });
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        await _albumRepo.AddBooksToAlbumAsync(id, recoveryKey.Id, dto.BookIds);
        return Ok(new { success = true });
    }

    [HttpDelete("api/albums/{id:guid}/books/{bookId:guid}")]
    public async Task<IActionResult> RemoveBook(Guid id, Guid bookId)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        await _albumRepo.RemoveBookFromAlbumAsync(id, bookId, recoveryKey.Id);
        return NoContent();
    }

    [HttpGet("api/albums/book/{bookId:guid}")]
    public async Task<IActionResult> GetAlbumsForBook(Guid bookId)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var albumIds = await _albumRepo.GetAlbumIdsForBookAsync(bookId, recoveryKey.Id);
        return Ok(albumIds);
    }

    [HttpPost("api/albums/book/{bookId:guid}")]
    public async Task<IActionResult> SetBookAlbums(Guid bookId, [FromBody] SetBookAlbumsDto? dto)
    {
        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var albumIds = dto?.AlbumIds ?? new List<Guid>();
        await _albumRepo.SetBookAlbumsAsync(bookId, recoveryKey.Id, albumIds);
        return Ok(new { success = true });
    }

    // ========================================================
    // Rename Book API (usable from both All Books and Albums)
    // ========================================================
    [HttpPut("api/books/{id:guid}/rename")]
    public async Task<IActionResult> RenameBook(Guid id, [FromBody] BookRenameDto? dto)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { error = "Book title is required." });
        }

        var recoveryKey = await _currentRecoveryKeyAccessor.GetCurrentAsync();
        if (recoveryKey is null) return Unauthorized();

        var book = await _bookRepo.GetByIdAsync(id);
        if (book is null || book.RecoveryKeyId != recoveryKey.Id)
        {
            return NotFound();
        }

        book.Title = dto.Title.Trim();
        if (dto.Author != null)
        {
            book.Author = string.IsNullOrWhiteSpace(dto.Author) ? null : dto.Author.Trim();
        }

        await _bookRepo.UpdateAsync(book);

        return Ok(new
        {
            id = book.Id,
            title = book.Title,
            author = book.Author
        });
    }
}

public class AlbumCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class AlbumUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class AddBooksDto
{
    public List<Guid> BookIds { get; set; } = new();
}

public class SetBookAlbumsDto
{
    public List<Guid> AlbumIds { get; set; } = new();
}

public class BookRenameDto
{
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }
}
