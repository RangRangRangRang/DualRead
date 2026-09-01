using DualRead.Data;
using DualRead.Repositories;
using DualRead.Repositories.Interfaces;
using DualRead.Services;
using DualRead.Services.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrWhiteSpace(configuredConnectionString) && !string.IsNullOrWhiteSpace(databaseUrl))
{
    configuredConnectionString = ConvertDatabaseUrlToNpgsqlConnectionString(databaseUrl);
    builder.Configuration["ConnectionStrings:DefaultConnection"] = configuredConnectionString;
}

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddControllersWithViews();
builder.Services.AddHttpContextAccessor();

var dataProtectionKeysPath = Path.Combine(builder.Environment.ContentRootPath, "DataProtection-Keys");
Directory.CreateDirectory(dataProtectionKeysPath);
builder.Services.AddDataProtection()
    .SetApplicationName("DualRead")
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(configuredConnectionString));

builder.Services.AddScoped<IRecoveryKeyRepository, RecoveryKeyRepository>();
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<IReadingProgressRepository, ReadingProgressRepository>();
builder.Services.AddScoped<ISettingsRepository, SettingsRepository>();
builder.Services.AddScoped<IBookmarkRepository, BookmarkRepository>();

builder.Services.AddScoped<IRecoveryKeyService, RecoveryKeyService>();
builder.Services.AddScoped<ICurrentRecoveryKeyAccessor, CurrentRecoveryKeyAccessor>();
builder.Services.AddSingleton<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IEpubParsingService, EpubParsingService>();
builder.Services.AddScoped<IDocxParsingService, DocxParsingService>();
builder.Services.AddScoped<IPdfParsingService, PdfParsingService>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<IReaderService, ReaderService>();
builder.Services.AddScoped<ITranslationRepository, TranslationRepository>();
builder.Services.AddScoped<ITranslationExportService, TranslationExportService>();

var app = builder.Build();

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.UseStatusCodePagesWithReExecute("/Home/StatusCode/{0}");

if (string.IsNullOrWhiteSpace(port))
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

var fileStorage = app.Services.GetRequiredService<IFileStorageService>();
Directory.CreateDirectory(fileStorage.UploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(fileStorage.UploadsRoot),
    RequestPath = "/library-assets"
});

app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();

static string ConvertDatabaseUrlToNpgsqlConnectionString(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.TrimStart('/');

    var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
    var sslMode = query.TryGetValue("sslmode", out var sslModeValue) ? sslModeValue.ToString() switch
    {
        "disable" => "Disable",
        "require" or "verify-ca" or "verify-full" => "Require",
        _ => "Prefer"
    } : "Prefer";

    var connectionStringBuilder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = username,
        Password = password,
        Database = database,
        SslMode = Enum.Parse<Npgsql.SslMode>(sslMode)
    };

    return connectionStringBuilder.ConnectionString;
}