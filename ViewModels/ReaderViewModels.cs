using System.ComponentModel.DataAnnotations;
using DualRead.Models;

namespace DualRead.ViewModels;

public class ReaderBundleViewModel
{
    public Guid BookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Author { get; set; }

    public List<ReaderChapterSummary> Chapters { get; set; } = new();

    public ReaderProgressDto Progress { get; set; } = new();
    public ReaderSettingsDto Settings { get; set; } = new();
    public List<ReaderBookmarkDto> Bookmarks { get; set; } = new();
}

public class ReaderChapterSummary
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;

    public string EpubItemHref { get; set; } = string.Empty;
}

public class ChapterContentDto
{
    public Guid ChapterId { get; set; }
    public int Order { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Html { get; set; } = string.Empty;

    public List<TranslationDto> Translations { get; set; } = new();
}
public class ReaderProgressDto
{
    public Guid? CurrentChapterId { get; set; }
    public int CurrentPage { get; set; }
    public int CurrentScrollOffset { get; set; }
    public int LinesPerPage { get; set; } = 25;
    public bool TranslationModeOn { get; set; }
}

public class ReaderProgressUpdateDto
{
    public Guid? CurrentChapterId { get; set; }

    [Range(0, int.MaxValue)]
    public int CurrentPage { get; set; }

    [Range(0, int.MaxValue)]
    public int CurrentScrollOffset { get; set; }

    [Range(1, 1000)]
    public int LinesPerPage { get; set; } = 25;

    public bool TranslationModeOn { get; set; }
}

public class ReaderSettingsDto
{
    public bool DarkMode { get; set; } = true;
    public string Language { get; set; } = "en";
    public string Font { get; set; } = "Georgia, serif";
    public int FontSize { get; set; } = 18;
    public double LineHeight { get; set; } = 1.6;
    public double LetterSpacing { get; set; } = 0.0;
    public int LinesPerPage { get; set; } = 25;
}

public class ReaderBookmarkDto
{
    public Guid Id { get; set; }
    public Guid? ChapterId { get; set; }
    public string? ChapterTitle { get; set; }
    public int PageNumber { get; set; }
    public int LinesPerPage { get; set; }
    public string? PreviewText { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class BookmarkCreateDto
{
    public Guid? ChapterId { get; set; }
    public int PageNumber { get; set; }
    public int LinesPerPage { get; set; }
    public string? PreviewText { get; set; }
}
public class TranslationDto
{
    public int ParagraphIndex { get; set; }
    public string TranslatedText { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; }
}

public class TranslationSaveDto
{
    public int ParagraphIndex { get; set; }
    public string TranslatedText { get; set; } = string.Empty;
}