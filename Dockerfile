# Build client
#
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY insights.client/package*.json ./
RUN npm ci
COPY insights.client/ ./
RUN npm run build

# Build server
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS server-build
WORKDIR /src
COPY Insights.Server/*.csproj ./
RUN dotnet restore
COPY Insights.Server/ ./
COPY --from=client-build /app/client/dist ./wwwroot
RUN dotnet publish -c Release -o /app/publish

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=server-build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "Insights.Server.dll"]