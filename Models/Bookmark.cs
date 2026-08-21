using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DualRead.Models;

/// <summary>
/// A saved reading position within an EPUB chapter.
/// </summary>
public class Bookmark
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid BookId { get; set; }

    [ForeignKey(nameof(BookId))]
    public Book Book { get; set; } = null!;

    /// <summary>EPUB chapters only.</summary>
    public Guid? ChapterId { get; set; }

    [ForeignKey(nameof(ChapterId))]
    public Chapter? Chapter { get; set; }

    /// <summary>
    /// Paginated page number within the chapter at the LinesPerPage setting active when the bookmark was created.
    /// </summary>
    public int PageNumber { get; set; }

    public int LinesPerPage { get; set; }

    [MaxLength(300)]
    public string? PreviewText { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
