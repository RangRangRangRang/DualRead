using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DualRead.Models;

public enum BookType
{
    Epub = 0,
    Pdf = 1,
    Docx = 2
}

public class Book
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RecoveryKeyId { get; set; }

    public BookType Type { get; set; } = BookType.Epub;

    [ForeignKey(nameof(RecoveryKeyId))]
    public RecoveryKey RecoveryKey { get; set; } = null!;

    [Required]
    [MaxLength(450)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(450)]
    public string? Author { get; set; }

    [Required]
    [MaxLength(1000)]
    public string EpubFilePath { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? CoverImagePath { get; set; }

    public long FileSizeBytes { get; set; }

    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();

    public ICollection<Bookmark> Bookmarks { get; set; } = new List<Bookmark>();

    public ReadingProgress? ReadingProgress { get; set; }

    public ICollection<AlbumBook> AlbumBooks { get; set; } = new List<AlbumBook>();
}

