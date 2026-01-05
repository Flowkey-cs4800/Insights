# Insights

A habit and metric correlation tracker. Log daily metrics like sleep, coffee, mood, and exercise and discover how they relate to each other.

**Live:** https://bit.ly/insights-app

## Tech Stack

- **Frontend:** React, TypeScript, Vite, MUI
- **Backend:** ASP.NET Core 9, Minimal APIs, EF Core
- **Database:** PostgreSQL
- **Auth:** Google OAuth
- **Hosting:** Render

## Local Development

**Prerequisites:** .NET 9, Node.js 18+, PostgreSQL

**Server:**

```
cd Insights.Server
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your-connection-string>"
dotnet user-secrets set "Authentication:Google:ClientId" "<your-client-id>"
dotnet user-secrets set "Authentication:Google:ClientSecret" "<your-client-secret>"
dotnet run
```

**Client:**

```
cd insights.client
npm install
npm run dev
```

Server runs on `localhost:5096`, client on `localhost:5173`.

## API

Public REST API. See [documentation](https://insights-app-kj9l.onrender.com/scalar/v1) for endpoints.

## Team

CS 4800 Cal Poly Pomona  
Lindsay Kislingbury  
Kenzie Lam  
Ashley Mapes

## License

[MIT](LICENSE)
