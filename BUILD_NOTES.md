# DualRead — build & run locally

This code was written and reviewed by hand in an environment **without the .NET SDK installed**,
so `dotnet build` was never actually run against it. Before doing anything else:

```bash
cd DualRead
dotnet restore
dotnet build
```

Fix whatever the compiler flags (there shouldn't be much — the code was cross-checked
interface-by-interface and brace-balanced, and one pre-existing typo bug from the original
EchoBook code, `ChapterHtmlSanitizer.cs`'s `publicl static`, was already fixed) and re-run
`dotnet build` until it's clean.

## Database — via Docker (recommended, no local PostgreSQL install)

```bash
docker compose up -d
```

This starts a `postgres:16-alpine` container on `localhost:5432` (user `postgres`, password
`postgres`, database `dualread`) with a named volume so data survives restarts. Both
`appsettings.json` and `appsettings.Development.json` already point at
`Host=localhost;Port=5432;Database=dualread;Username=postgres;Password=postgres` to match it —
no config changes needed. Then:

```bash
dotnet ef database update
```

To stop it: `docker compose down` (add `-v` to also delete the volume/data).

If you'd rather use an existing local PostgreSQL install instead of Docker, just edit
`ConnectionStrings:DefaultConnection` in `appsettings.Development.json` to point at it, then run
`dotnet ef database update` the same way.

### Fully containerized (app + db both in Docker)

If you don't want to install the .NET SDK locally either:

```bash
docker compose -f docker-compose.full.yml up --build
```

This builds the app image from `Dockerfile` and runs it alongside Postgres, both in containers.
`Program.cs` already runs `db.Database.MigrateAsync()` on startup, so migrations apply
automatically — no separate `dotnet ef database update` step needed in this mode. The app is
reachable at `http://localhost:8080`. This mode is slower to iterate with (full image rebuild per
code change), so use `docker-compose.yml` (db only) + `dotnet run` on the host for day-to-day
development, and this full stack mainly to sanity-check the container build itself before
deploying.

The `Migrations/20260810000000_InitialCreate.cs` migration was **rewritten from scratch** — the
original migration in the uploaded zip still had leftover `AudioCaches`/TTS columns from the old
EchoBook project and was missing the `Pages`, `Translations`, `TextOverlays`, and `MaskRegions`
tables entirely (the model classes and `DbSet<>`s existed, but the migration never caught up). If
`dotnet ef migrations add` produces a diff against this new `InitialCreate` once you have your own
DB, that means something in a model and this migration drifted — check that first before assuming
your local Postgres schema is wrong.

## Run

```bash
dotnet run
```


## What changed in this pass

- Renamed `EchoBook` → `DualRead` everywhere (namespace, `.csproj`, connection string name,
  cookie/localStorage key prefixes).
- Removed the leftover `AudioCache` content-exclude entry from the `.csproj`.
- Rewrote `Migrations/` from scratch to match the current model (see above).
  first page as the cover.
  `Book` (with `Chapters` or `Pages` respectively).
  drag-and-drop.
  "fake recovery key" script that wrote to `localStorage` but was never actually read by anything.
- `ReaderService`/`ReaderController`/`Views/Reader/Index.cshtml`/`reader.js`: added a full
  sidebar), and **switched Progress/Settings/Bookmarks persistence from `localStorage` to the
  existing (previously unused) server endpoints** so reading position, bookmarks, and reader
  settings now actually follow the Recovery Key across devices/browsers, per the spec's
  no-account design. Typography-only settings (Font/Font Size/Line Height/Letter Spacing) hide
- Added the `F` (fullscreen) keyboard shortcut, which was missing.

## Still not implemented (next passes)

- Translation mode content itself (paragraph segmentation + aligned textareas for text books;
  `MaskRegions` tables and DTOs exist, but there's no UI or controller wired to them yet. The
  translate toggle still just shows a "coming soon" placeholder column.
- Dictionary/quick-lookup popup (`ITranslationProvider` + selection popup) — not started.
- Sidebar i18n is implemented for the strings that existed already, but hasn't been re-audited for
  every new string added in this pass beyond `pages`/`previousPage`/`nextPage`.
- Deployment files (`Dockerfile`, `docker-compose.yml`, `render.yaml`) — not part of this pass,
  matches the roadmap (that's Milestone 14).
- The text-book reader still paginates by raw scroll position rather than true CSS-column pages;
  that's a pre-existing simplification from before this pass, not something introduced here, but
  it means a Bookmark's `PageNumber` field is currently storing a scroll-pixel offset rather than a
  real page number. Worth reconciling once true pagination is implemented.
