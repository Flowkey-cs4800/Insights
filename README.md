# Insights

**Manage what you measure.** Track your habits, find the patterns.

A personal metrics tracker that automatically discovers correlations between the things you log. Sleep more → better mood? Coffee → more focus? Insights finds these patterns for you.

🔗 **Live:** https://insights-app-kj9l.onrender.com  
📖 **API Docs:** https://insights-app-kj9l.onrender.com/scalar/v1

## How it works

Track anything as a **boolean** (did it / didn't), **number** (mood 1-10, pages read), or **duration** (hours slept). Log for a few days, and Insights starts surfacing correlations.

### The insights engine

Most habit trackers show streaks. Insights analyzes _relationships_ between metrics using different statistical approaches depending on what you're comparing:

**Boolean ↔ Boolean** — Co-occurrence rates

> "You exercise on 73% of days you meditate vs 31% otherwise"

**Boolean ↔ Numeric** — Conditional averages

> "Your mood averages 7.2 on workout days vs 5.4 otherwise (+33%)"

**Numeric ↔ Numeric** — Median split analysis

> "When sleep ≥ 7hrs, focus averages 8.1 vs 5.9 (+37%)"

Only patterns with **≥15% difference** surface, so you see things that might actually matter.

### Individual metric analytics

Each metric also gets its own stats: current streak, max streak, average value, most consistent days of the week, and weekly/monthly bar charts showing your history.

## Running locally

You'll need .NET 9, Node.js 20+, and PostgreSQL.

```bash
git clone https://github.com/Flowkey-cs4800/Insights.git
cd Insights

# Set up secrets (backend)
cd Insights.Server
dotnet user-secrets set "Authentication:Google:ClientId" "your-google-client-id"
dotnet user-secrets set "Authentication:Google:ClientSecret" "your-google-client-secret"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=insights;Username=postgres;Password=postgres"
dotnet run

# Run frontend (separate terminal)
cd insights.client
npm install
npm run dev
```

Frontend runs on :5173, backend on :5096. API docs at http://localhost:5096/scalar/v1

## Team

Built by Lindsay, Kenzie & Ashley for CS 4800
