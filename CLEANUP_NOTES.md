# DualRead cleanup

## Reader progress request cleanup
- Progress requests are sent only when a valid chapter and payload exist.
- Duplicate progress requests are suppressed while scrolling.
- An in-flight progress request is not duplicated; the latest state is queued.
- HTTP responses are checked so failed POSTs are visible in a controlled warning instead of being silently ignored.
- Progress DTO values are validated server-side.
- The backend verifies that the supplied chapter belongs to the current EPUB/book.

## Source package cleanup
- Removed Visual Studio `.vs/`, `bin/`, and `obj/` generated files from this source package.
- Runtime EPUB uploads are excluded from the source package; `Uploads/.gitkeep` keeps the folder available.
- No CBZ/CBR/Comic/Manga references remain in the source tree.

## Verification
- All JavaScript files pass `node --check`.
- Static checks found no duplicate C# class declarations.
- The local environment used for packaging does not have the .NET SDK, so a real `dotnet build` could not be executed here.
