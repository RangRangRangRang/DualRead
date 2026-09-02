using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DualRead.Migrations
{
    /// <inheritdoc />
    public partial class AddVocabularyItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VocabularyItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecoveryKeyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookId = table.Column<Guid>(type: "uuid", nullable: true),
                    BookTitle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ChapterId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChapterTitle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalText = table.Column<string>(type: "text", nullable: false),
                    TranslatedText = table.Column<string>(type: "text", nullable: false),
                    ContextText = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VocabularyItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VocabularyItems_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VocabularyItems_RecoveryKeys_RecoveryKeyId",
                        column: x => x.RecoveryKeyId,
                        principalTable: "RecoveryKeys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VocabularyItems_BookId",
                table: "VocabularyItems",
                column: "BookId");

            migrationBuilder.CreateIndex(
                name: "IX_VocabularyItems_RecoveryKeyId",
                table: "VocabularyItems",
                column: "RecoveryKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_VocabularyItems_RecoveryKeyId_BookId",
                table: "VocabularyItems",
                columns: new[] { "RecoveryKeyId", "BookId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VocabularyItems");
        }
    }
}
