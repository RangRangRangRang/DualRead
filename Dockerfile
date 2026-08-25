# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY DualRead.csproj ./
RUN dotnet restore "DualRead.csproj"

COPY . .
RUN dotnet publish "DualRead.csproj" -c Release -o /app/publish --no-restore

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Uploaded epub files and extracted covers live here at runtime.
RUN mkdir -p /app/Uploads
VOLUME ["/app/Uploads"]

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
# Server GC assumes generous, per-core memory and can over-allocate heap on tiny free-tier
# containers (Render free = 512MB), crashing the runtime with SIGSEGV (exit 139) before any
# application code even runs. Workstation GC is far more conservative and appropriate here.
ENV DOTNET_gcServer=0
ENV DOTNET_GCHeapHardLimit=0x14000000
# The container's kernel enforces a low inotify instance cap (128). Something in the app
# (Data Protection key-ring discovery is the usual suspect when keys aren't persisted across
# restarts) creates a new FileSystemWatcher per request, exhausting that cap and crashing every
# subsequent request - even the error page. Force polling-based file change detection instead.
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
EXPOSE 8080

ENTRYPOINT ["dotnet", "DualRead.dll"]