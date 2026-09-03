using DualRead.Models;
using Microsoft.EntityFrameworkCore;

namespace DualRead.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<RecoveryKey> RecoveryKeys => Set<RecoveryKey>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<ReadingProgress> ReadingProgresses => Set<ReadingProgress>();
    public DbSet<Settings> Settings => Set<Settings>();
    public DbSet<Translation> Translations => Set<Translation>();
    public DbSet<VocabularyItem> VocabularyItems => Set<VocabularyItem>();
    public DbSet<Album> Albums => Set<Album>();
    public DbSet<AlbumBook> AlbumBooks => Set<AlbumBook>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RecoveryKey>(entity =>
        {
            entity.HasIndex(r => r.Code).IsUnique();
        });

        modelBuilder.Entity<Book>(entity =>
        {
            entity.HasOne(b => b.RecoveryKey)
                  .WithMany(r => r.Books)
                  .HasForeignKey(b => b.RecoveryKeyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(b => b.RecoveryKeyId);
        });

        modelBuilder.Entity<Album>(entity =>
        {
            entity.HasOne(a => a.RecoveryKey)
                  .WithMany(r => r.Albums)
                  .HasForeignKey(a => a.RecoveryKeyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(a => a.RecoveryKeyId);
        });

        modelBuilder.Entity<AlbumBook>(entity =>
        {
            entity.HasKey(ab => new { ab.AlbumId, ab.BookId });

            entity.HasOne(ab => ab.Album)
                  .WithMany(a => a.AlbumBooks)
                  .HasForeignKey(ab => ab.AlbumId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ab => ab.Book)
                  .WithMany(b => b.AlbumBooks)
                  .HasForeignKey(ab => ab.BookId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(ab => ab.AlbumId);
            entity.HasIndex(ab => ab.BookId);
        });

        modelBuilder.Entity<Chapter>(entity =>
        {
            entity.HasOne(c => c.Book)
                  .WithMany(b => b.Chapters)
                  .HasForeignKey(c => c.BookId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => new { c.BookId, c.Order });
        });

        modelBuilder.Entity<Bookmark>(entity =>
        {
            entity.HasOne(bm => bm.Book)
                  .WithMany(b => b.Bookmarks)
                  .HasForeignKey(bm => bm.BookId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(bm => bm.Chapter)
                  .WithMany(c => c.Bookmarks)
                  .HasForeignKey(bm => bm.ChapterId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReadingProgress>(entity =>
        {
            entity.HasOne(rp => rp.Book)
                  .WithOne(b => b.ReadingProgress)
                  .HasForeignKey<ReadingProgress>(rp => rp.BookId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Settings>(entity =>
        {
            entity.HasOne(s => s.RecoveryKey)
                  .WithOne(r => r.Settings)
                  .HasForeignKey<Settings>(s => s.RecoveryKeyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Translation>(entity =>
        {
            entity.HasOne(t => t.Book)
                  .WithMany()
                  .HasForeignKey(t => t.BookId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.Chapter)
                  .WithMany()
                  .HasForeignKey(t => t.ChapterId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(t => new { t.ChapterId, t.ParagraphIndex }).IsUnique();
        });

        modelBuilder.Entity<VocabularyItem>(entity =>
        {
            entity.HasOne(v => v.RecoveryKey)
                  .WithMany()
                  .HasForeignKey(v => v.RecoveryKeyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(v => v.Book)
                  .WithMany()
                  .HasForeignKey(v => v.BookId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(v => v.RecoveryKeyId);
            entity.HasIndex(v => new { v.RecoveryKeyId, v.BookId });
        });
    }
}