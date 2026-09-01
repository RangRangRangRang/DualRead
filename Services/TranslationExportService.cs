using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DualRead.Models;
using DualRead.Repositories.Interfaces;
using DualRead.Services.Interfaces;
using System.Reflection.Metadata;
using System.Text;
using static System.Net.Mime.MediaTypeNames;
using Document = DocumentFormat.OpenXml.Wordprocessing.Document;
using Text = DocumentFormat.OpenXml.Wordprocessing.Text;

namespace DualRead.Services;

public class TranslationExportService : ITranslationExportService
{
    private readonly IBookRepository _bookRepository;
    private readonly ITranslationRepository _translationRepository;

    public TranslationExportService(IBookRepository bookRepository, ITranslationRepository translationRepository)
    {
        _bookRepository = bookRepository;
        _translationRepository = translationRepository;
    }

    public async Task<(byte[] Bytes, string FileName)?> ExportTranslationToDocxAsync(Guid bookId, Guid recoveryKeyId)
    {
        var book = await _bookRepository.GetByIdWithChaptersAsync(bookId);
        if (book is null || book.RecoveryKeyId != recoveryKeyId) return null;

        var chapters = book.Chapters.OrderBy(c => c.Order).ToList();
        var translations = await _translationRepository.GetByBookIdAsync(bookId);
        var translationsByChapter = translations
            .GroupBy(t => t.ChapterId)
            .ToDictionary(g => g.Key, g => g.OrderBy(t => t.ParagraphIndex).ToList());

        var bytes = BuildDocx(book.Title, book.Author, chapters, translationsByChapter);
        var fileName = $"{SanitizeFileName(book.Title)}-ban-dich.docx";

        return (bytes, fileName);
    }

    private static byte[] BuildDocx(
        string bookTitle,
        string? author,
        List<Chapter> chapters,
        Dictionary<Guid, List<Translation>> translationsByChapter)
    {
        using var stream = new MemoryStream();

        using (var wordDocument = WordprocessingDocument.Create(stream, WordprocessingDocumentType.Document))
        {
            var mainPart = wordDocument.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            body.AppendChild(CreateParagraph(bookTitle, bold: true, fontSizeHalfPoints: 36));

            if (!string.IsNullOrWhiteSpace(author))
            {
                body.AppendChild(CreateParagraph($"Tác giả: {author}", italic: true, fontSizeHalfPoints: 22));
            }

            body.AppendChild(CreateParagraph(string.Empty));

            var hasAnyTranslation = false;

            foreach (var chapter in chapters)
            {
                if (!translationsByChapter.TryGetValue(chapter.Id, out var paragraphs) || paragraphs.Count == 0)
                {
                                        continue;
                }

                var nonEmptyParagraphs = paragraphs.Where(p => !string.IsNullOrWhiteSpace(p.TranslatedText)).ToList();
                if (nonEmptyParagraphs.Count == 0) continue;

                hasAnyTranslation = true;

                body.AppendChild(CreateParagraph(chapter.Title, bold: true, fontSizeHalfPoints: 28));

                foreach (var paragraph in nonEmptyParagraphs)
                {
                    body.AppendChild(CreateParagraph(paragraph.TranslatedText));
                }

                body.AppendChild(CreateParagraph(string.Empty));
            }

            if (!hasAnyTranslation)
            {
                body.AppendChild(CreateParagraph(
                    "Chưa có đoạn dịch nào được lưu cho sách này.",
                    italic: true));
            }

            body.AppendChild(new SectionProperties(
                new PageSize { Width = 11906U, Height = 16838U },                 new PageMargin { Top = 1134, Bottom = 1134, Left = 1134, Right = 1134 }));
        }

        return stream.ToArray();
    }

    private static Paragraph CreateParagraph(string text, bool bold = false, bool italic = false, int fontSizeHalfPoints = 24)
    {
                        var runProperties = new RunProperties(
            new RunFonts { Ascii = "Times New Roman", HighAnsi = "Times New Roman", ComplexScript = "Times New Roman" });

        if (bold) runProperties.Append(new Bold());
        if (italic) runProperties.Append(new Italic());
        runProperties.Append(new FontSize { Val = fontSizeHalfPoints.ToString() });

        var run = new Run(
            runProperties,
            new Text(text) { Space = SpaceProcessingModeValues.Preserve });

        var paragraphProperties = new ParagraphProperties(
            new SpacingBetweenLines { After = "240", Line = "360", LineRule = LineSpacingRuleValues.Auto });

        return new Paragraph(paragraphProperties, run);
    }

    private static string SanitizeFileName(string name)
    {
        var sanitized = name;
        foreach (var invalidChar in Path.GetInvalidFileNameChars())
        {
            sanitized = sanitized.Replace(invalidChar, '-');
        }

        sanitized = sanitized.Trim();
        return string.IsNullOrEmpty(sanitized) ? "book" : sanitized;
    }
}
