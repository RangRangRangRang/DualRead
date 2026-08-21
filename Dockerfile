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
EXPOSE 8080

ENTRYPOINT ["dotnet", "DualRead.dll"]