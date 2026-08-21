using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DualRead.Models;

public class ReadingProgress
{
    [Key]
    [ForeignKey(nameof(Book))]
    public Guid BookId { get; set; }

    public Book Book { get; set; } = null!;

    public Guid? CurrentChapterId { get; set; }

    public int CurrentPage { get; set; }

    public int CurrentScrollOffset { get; set; }

    public int LinesPerPage { get; set; } = 25;

        public bool TranslationModeOn { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
