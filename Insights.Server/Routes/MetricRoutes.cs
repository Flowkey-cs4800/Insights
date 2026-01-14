using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Insights.Server.Data;
using Insights.Server.Entities;

namespace Insights.Server.Routes;

public static class MetricRoutes
{
    // --- DTOs ---
    public record MetricTypeResponse(
        Guid MetricTypeId,
        string Name,
        MetricKind Kind,
        string? Unit,
        GoalCadence GoalCadence,
        int GoalValue
    );

    public record MetricTypeRequest(
        string Name,
        MetricKind Kind,
        string? Unit,
        GoalCadence GoalCadence,
        int GoalValue
    );

    public record MetricResponse(Guid MetricId, Guid MetricTypeId, string MetricTypeName, DateOnly Date, int Value);
    public record MetricRequest(Guid MetricTypeId, DateOnly Date, int Value);
    public record MetricUpdateRequest(int Value);

    public static void MapMetricRoutes(this WebApplication app)
    {
        // --- Metric Types ---
        var types = app.MapGroup("/api/metric-types")
            .WithTags("Metric Types")
            .RequireAuthorization();

        // List metric types
        types.MapGet("/", async (HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricTypes = await db.MetricTypes
                .Where(mt => mt.UserId == userId)
                .OrderBy(mt => mt.Name)
                .Select(mt => new MetricTypeResponse(
                    mt.MetricTypeId,
                    mt.Name,
                    mt.Kind,
                    mt.Unit,
                    mt.GoalCadence,
                    mt.GoalValue
                ))
                .ToListAsync();

            return Results.Ok(metricTypes);
        })
        .Produces<List<MetricTypeResponse>>(200)
        .Produces(401);

        // Create metric type
        types.MapPost("/", async (MetricTypeRequest request, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var goalValue = Math.Max(0, request.GoalValue);

            // For Boolean Weekly, clamp to max 7 days
            if (request.Kind == MetricKind.Boolean && request.GoalCadence == GoalCadence.Weekly)
                goalValue = Math.Min(7, goalValue);

            // For Boolean Daily, clamp to max 1 (done/not done)
            if (request.Kind == MetricKind.Boolean && request.GoalCadence == GoalCadence.Daily)
                goalValue = Math.Min(1, goalValue);

            var metricType = new MetricType
            {
                MetricTypeId = Guid.NewGuid(),
                UserId = userId.Value,
                Name = request.Name,
                Kind = request.Kind,
                Unit = request.Unit,
                GoalCadence = request.GoalCadence,
                GoalValue = goalValue
            };

            db.MetricTypes.Add(metricType);
            await db.SaveChangesAsync();

            return Results.Created($"/api/metric-types/{metricType.MetricTypeId}",
                new MetricTypeResponse(
                    metricType.MetricTypeId,
                    metricType.Name,
                    metricType.Kind,
                    metricType.Unit,
                    metricType.GoalCadence,
                    metricType.GoalValue
                ));
        })
        .Produces<MetricTypeResponse>(201)
        .Produces(401);

        // Update metric type
        types.MapPut("/{id:guid}", async (Guid id, MetricTypeRequest request, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricType = await db.MetricTypes
                .FirstOrDefaultAsync(mt => mt.MetricTypeId == id && mt.UserId == userId);

            if (metricType is null) return Results.NotFound();

            var goalValue = Math.Max(0, request.GoalValue);

            if (request.Kind == MetricKind.Boolean && request.GoalCadence == GoalCadence.Weekly)
                goalValue = Math.Min(7, goalValue);

            if (request.Kind == MetricKind.Boolean && request.GoalCadence == GoalCadence.Daily)
                goalValue = Math.Min(1, goalValue);

            metricType.Name = request.Name;
            metricType.Kind = request.Kind;
            metricType.Unit = request.Unit;
            metricType.GoalCadence = request.GoalCadence;
            metricType.GoalValue = goalValue;

            await db.SaveChangesAsync();

            return Results.Ok(new MetricTypeResponse(
                metricType.MetricTypeId,
                metricType.Name,
                metricType.Kind,
                metricType.Unit,
                metricType.GoalCadence,
                metricType.GoalValue
            ));
        })
        .Produces<MetricTypeResponse>(200)
        .Produces(401)
        .Produces(404);

        // Delete metric type
        types.MapDelete("/{id:guid}", async (Guid id, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricType = await db.MetricTypes
                .FirstOrDefaultAsync(mt => mt.MetricTypeId == id && mt.UserId == userId);

            if (metricType is null) return Results.NotFound();

            db.MetricTypes.Remove(metricType);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .Produces(204)
        .Produces(401)
        .Produces(404);

        // --- Metrics ---
        var metrics = app.MapGroup("/api/metrics")
            .WithTags("Metrics")
            .RequireAuthorization();

        // List metrics
        metrics.MapGet("/", async (DateOnly? from, DateOnly? to, Guid? metricTypeId, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var query = db.Metrics
                .Include(m => m.MetricType)
                .Where(m => m.UserId == userId);

            if (from.HasValue)
                query = query.Where(m => m.Date >= from.Value);

            if (to.HasValue)
                query = query.Where(m => m.Date <= to.Value);

            if (metricTypeId.HasValue)
                query = query.Where(m => m.MetricTypeId == metricTypeId.Value);

            var results = await query
                .OrderByDescending(m => m.Date)
                .Select(m => new MetricResponse(m.MetricId, m.MetricTypeId, m.MetricType.Name, m.Date, m.Value))
                .ToListAsync();

            return Results.Ok(results);
        })
        .Produces<List<MetricResponse>>(200)
        .Produces(401);

        // Create metric entry
        metrics.MapPost("/", async (MetricRequest request, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricType = await db.MetricTypes
                .FirstOrDefaultAsync(mt => mt.MetricTypeId == request.MetricTypeId && mt.UserId == userId);

            if (metricType is null)
                return Results.BadRequest(new { error = "Invalid metric type" });

            var existing = await db.Metrics
                .FirstOrDefaultAsync(m => m.MetricTypeId == request.MetricTypeId && m.Date == request.Date);

            if (existing is not null)
                return Results.Conflict(new { error = "Entry already exists for this date. Use PUT to update." });

            var metric = new Metric
            {
                MetricId = Guid.NewGuid(),
                MetricTypeId = request.MetricTypeId,
                UserId = userId.Value,
                Date = request.Date,
                Value = request.Value
            };

            db.Metrics.Add(metric);
            await db.SaveChangesAsync();

            return Results.Created($"/api/metrics/{metric.MetricId}",
                new MetricResponse(metric.MetricId, metric.MetricTypeId, metricType.Name, metric.Date, metric.Value));
        })
        .Produces<MetricResponse>(201)
        .Produces(400)
        .Produces(401)
        .Produces(409);

        // Update metric entry
        metrics.MapPut("/{id:guid}", async (Guid id, MetricUpdateRequest request, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metric = await db.Metrics
                .Include(m => m.MetricType)
                .FirstOrDefaultAsync(m => m.MetricId == id && m.UserId == userId);

            if (metric is null) return Results.NotFound();

            metric.Value = request.Value;
            await db.SaveChangesAsync();

            return Results.Ok(new MetricResponse(metric.MetricId, metric.MetricTypeId, metric.MetricType.Name, metric.Date, metric.Value));
        })
        .Produces<MetricResponse>(200)
        .Produces(401)
        .Produces(404);

        // Delete metric entry
        metrics.MapDelete("/{id:guid}", async (Guid id, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metric = await db.Metrics
                .FirstOrDefaultAsync(m => m.MetricId == id && m.UserId == userId);

            if (metric is null) return Results.NotFound();

            db.Metrics.Remove(metric);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .Produces(204)
        .Produces(401)
        .Produces(404);

        // --- Compare two metrics ---
        metrics.MapGet("/compare", async (Guid metricTypeIdX, Guid metricTypeIdY, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var typeX = await db.MetricTypes.FirstOrDefaultAsync(mt => mt.MetricTypeId == metricTypeIdX && mt.UserId == userId);
            var typeY = await db.MetricTypes.FirstOrDefaultAsync(mt => mt.MetricTypeId == metricTypeIdY && mt.UserId == userId);

            if (typeX is null || typeY is null)
                return Results.BadRequest(new { error = "Invalid metric type(s)" });

            var metricsX = await db.Metrics
                .Where(m => m.MetricTypeId == metricTypeIdX && m.UserId == userId)
                .ToDictionaryAsync(m => m.Date, m => m.Value);

            var metricsY = await db.Metrics
                .Where(m => m.MetricTypeId == metricTypeIdY && m.UserId == userId)
                .ToDictionaryAsync(m => m.Date, m => m.Value);

            var commonDates = metricsX.Keys.Intersect(metricsY.Keys).OrderBy(d => d).ToList();

            var points = commonDates.Select(date => new ComparePoint(
                date.ToString("yyyy-MM-dd"),
                metricsX[date],
                metricsY[date]
            )).ToList();

            double? correlation = CalculateCorrelation(points);

            return Results.Ok(new CompareResponse(
                typeX.Name,
                typeY.Name,
                typeX.Unit,
                typeY.Unit,
                points,
                correlation
            ));
        })
        .WithSummary("Compare two metrics")
        .WithDescription("Returns paired data points and Pearson correlation coefficient.")
        .Produces<CompareResponse>(200)
        .Produces(400)
        .Produces(401);

        // --- Get top insights ---
        metrics.MapGet("/insights", async (HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricTypes = await db.MetricTypes
                .Where(mt => mt.UserId == userId)
                .ToListAsync();

            var allMetrics = await db.Metrics
                .Where(m => m.UserId == userId)
                .ToListAsync();

            var metricsByType = allMetrics
                .GroupBy(m => m.MetricTypeId)
                .ToDictionary(g => g.Key, g => g.ToDictionary(m => m.Date, m => m.Value));

            var correlationInsights = new List<InsightItem>();
            var singleInsights = new List<InsightItem>();

            // Cross-metric insights (need 2+ metric types)
            if (metricTypes.Count >= 2)
            {
                for (int i = 0; i < metricTypes.Count; i++)
                {
                    for (int j = i + 1; j < metricTypes.Count; j++)
                    {
                        var typeX = metricTypes[i];
                        var typeY = metricTypes[j];

                        if (!metricsByType.TryGetValue(typeX.MetricTypeId, out var dataX) ||
                            !metricsByType.TryGetValue(typeY.MetricTypeId, out var dataY))
                            continue;

                        var commonDates = dataX.Keys.Intersect(dataY.Keys).ToList();

                        if (commonDates.Count < 3)
                            continue;

                        var points = commonDates.Select(date => new ComparePoint(
                            date.ToString("yyyy-MM-dd"),
                            dataX[date],
                            dataY[date]
                        )).ToList();

                        var insight = CalculateCrossMetricInsight(typeX, typeY, points);
                        
                        if (insight != null && insight.Strength >= 15)
                        {
                            correlationInsights.Add(insight);
                        }
                    }
                }
            }

            // Single-metric insights
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            foreach (var mt in metricTypes)
            {
                if (!metricsByType.TryGetValue(mt.MetricTypeId, out var data) || data.Count == 0)
                    continue;

                var sortedDates = data.Keys.OrderByDescending(d => d).ToList();
                
                // Streak calculation
                var streak = 0;
                var checkDate = today;
                
                if (!data.ContainsKey(checkDate))
                    checkDate = today.AddDays(-1);
                
                while (data.ContainsKey(checkDate))
                {
                    streak++;
                    checkDate = checkDate.AddDays(-1);
                }

                if (streak >= 3)
                {
                    singleInsights.Add(new InsightItem(
                        mt.MetricTypeId,
                        null,
                        mt.Name,
                        null,
                        mt.Unit,
                        null,
                        streak,
                        "positive",
                        $"🔥 {streak} day streak on {mt.Name}!",
                        streak,
                        "streak",
                        null,
                        null,
                        null
                    ));
                }

                // Consistency
                var last7Days = Enumerable.Range(0, 7).Select(i => today.AddDays(-i)).ToList();
                var daysLogged = last7Days.Count(d => data.ContainsKey(d));
                var consistency = Math.Round((double)daysLogged / 7 * 100);

                if (daysLogged >= 5)
                {
                    singleInsights.Add(new InsightItem(
                        mt.MetricTypeId,
                        null,
                        mt.Name,
                        null,
                        mt.Unit,
                        null,
                        consistency,
                        "positive",
                        $"Great consistency! {mt.Name} logged {daysLogged}/7 days this week",
                        daysLogged,
                        "consistency",
                        null,
                        null,
                        null
                    ));
                }

                // Average for Number/Duration
                if (mt.Kind != MetricKind.Boolean && data.Count >= 3)
                {
                    var avg = Math.Round(data.Values.Average(), 1);
                    var unit = mt.Unit ?? "";
                    singleInsights.Add(new InsightItem(
                        mt.MetricTypeId,
                        null,
                        mt.Name,
                        null,
                        mt.Unit,
                        null,
                        avg,
                        "neutral",
                        $"You average {avg} {unit} of {mt.Name.ToLower()} per day".Trim(),
                        data.Count,
                        "average",
                        null,
                        null,
                        null
                    ));
                }
            }

            // Prioritize cross-metric correlations, then streaks
            var combined = correlationInsights
                .OrderByDescending(i => i.Strength)
                .Take(3)
                .Concat(singleInsights
                    .OrderByDescending(i => i.InsightType == "streak" ? 1 : 0)
                    .ThenByDescending(i => i.Strength)
                    .Take(3))
                .Take(5)
                .ToList();

            return Results.Ok(new InsightsResponse(combined));
        })
        .WithSummary("Get top insights")
        .WithDescription("Auto-discovers correlations and single-metric insights.")
        .Produces<InsightsResponse>(200)
        .Produces(401);
    }

    // --- DTOs for compare/insights ---
    public record ComparePoint(string Date, int X, int Y);
    public record CompareResponse(
        string MetricX,
        string MetricY,
        string? UnitX,
        string? UnitY,
        List<ComparePoint> Points,
        double? Correlation
    );

    public record ComparisonGroup(string Label, double Value, int Count);
    public record ComparisonData(
        ComparisonGroup GroupA,
        ComparisonGroup GroupB,
        string ValueType,  // "percentage" or "average"
        double PercentDiff,
        double? Threshold,
        string? Unit
    );

    public record InsightItem(
        Guid MetricTypeIdX,
        Guid? MetricTypeIdY,
        string MetricX,
        string? MetricY,
        string? UnitX,
        string? UnitY,
        double Strength,        // Absolute difference/effect size for sorting
        string Direction,       // "positive", "negative", "neutral"
        string Summary,
        int DataPoints,
        string InsightType,     // "correlation", "streak", "consistency", "average"
        string? ComparisonType, // "boolean_boolean", "boolean_numeric", "numeric_numeric"
        ComparisonData? ComparisonData,
        List<ComparePoint>? ScatterData
    );
    public record InsightsResponse(List<InsightItem> Insights);

    // Helper to get UserId from HttpContext
    private static Guid? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst("UserId")?.Value;
        return userIdClaim is not null ? Guid.Parse(userIdClaim) : null;
    }

    // Calculate cross-metric insight based on metric kinds
    private static InsightItem? CalculateCrossMetricInsight(MetricType typeX, MetricType typeY, List<ComparePoint> points)
    {
        var isXBoolean = typeX.Kind == MetricKind.Boolean;
        var isYBoolean = typeY.Kind == MetricKind.Boolean;

        if (isXBoolean && isYBoolean)
            return CalculateBooleanBooleanInsight(typeX, typeY, points);
        else if (isXBoolean && !isYBoolean)
            return CalculateBooleanNumericInsight(typeX, typeY, points, xIsBoolean: true);
        else if (!isXBoolean && isYBoolean)
            return CalculateBooleanNumericInsight(typeY, typeX, points, xIsBoolean: false);
        else
            return CalculateNumericNumericInsight(typeX, typeY, points);
    }

    // Boolean + Boolean: Co-occurrence analysis
    private static InsightItem? CalculateBooleanBooleanInsight(MetricType typeX, MetricType typeY, List<ComparePoint> points)
    {
        var daysWithY = points.Where(p => p.Y == 1).ToList();
        var daysWithoutY = points.Where(p => p.Y == 0).ToList();

        if (daysWithY.Count < 2 || daysWithoutY.Count < 2)
            return null;

        var xRateWithY = daysWithY.Count(p => p.X == 1) / (double)daysWithY.Count * 100;
        var xRateWithoutY = daysWithoutY.Count(p => p.X == 1) / (double)daysWithoutY.Count * 100;
        var diff = xRateWithY - xRateWithoutY;

        if (Math.Abs(diff) < 15)
            return null;

        var direction = diff > 0 ? "positive" : "negative";
        var summary = diff > 0
            ? $"{typeX.Name} rate: {xRateWithY:F0}% on {typeY.Name.ToLower()} days vs {xRateWithoutY:F0}% otherwise (+{diff:F0}pts)"
            : $"{typeX.Name} rate: {xRateWithY:F0}% on {typeY.Name.ToLower()} days vs {xRateWithoutY:F0}% otherwise ({diff:F0}pts)";

        return new InsightItem(
            typeX.MetricTypeId,
            typeY.MetricTypeId,
            typeX.Name,
            typeY.Name,
            typeX.Unit,
            typeY.Unit,
            Math.Abs(diff),
            direction,
            summary,
            points.Count,
            "correlation",
            "boolean_boolean",
            new ComparisonData(
                new ComparisonGroup($"With {typeY.Name.ToLower()}", xRateWithY, daysWithY.Count),
                new ComparisonGroup($"Without", xRateWithoutY, daysWithoutY.Count),
                "percentage",
                diff,
                null,
                null
            ),
            points
        );
    }

    // Boolean + Numeric: Conditional average
    private static InsightItem? CalculateBooleanNumericInsight(MetricType boolType, MetricType numType, List<ComparePoint> points, bool xIsBoolean)
    {
        List<int> valuesWhenTrue, valuesWhenFalse;
        
        if (xIsBoolean)
        {
            valuesWhenTrue = points.Where(p => p.X == 1).Select(p => p.Y).ToList();
            valuesWhenFalse = points.Where(p => p.X == 0).Select(p => p.Y).ToList();
        }
        else
        {
            valuesWhenTrue = points.Where(p => p.Y == 1).Select(p => p.X).ToList();
            valuesWhenFalse = points.Where(p => p.Y == 0).Select(p => p.X).ToList();
        }

        if (valuesWhenTrue.Count < 2 || valuesWhenFalse.Count < 2)
            return null;

        var avgWhenTrue = valuesWhenTrue.Average();
        var avgWhenFalse = valuesWhenFalse.Average();
        
        if (avgWhenFalse == 0)
            return null;
            
        var percentDiff = (avgWhenTrue - avgWhenFalse) / avgWhenFalse * 100;

        if (Math.Abs(percentDiff) < 15)
            return null;

        var direction = percentDiff > 0 ? "positive" : "negative";
        var unit = numType.Unit != null ? $" {numType.Unit}" : "";
        var sign = percentDiff > 0 ? "+" : "";
        var summary = $"{numType.Name} averages {avgWhenTrue:F1}{unit} on {boolType.Name.ToLower()} days vs {avgWhenFalse:F1}{unit} otherwise ({sign}{percentDiff:F0}%)";

        return new InsightItem(
            xIsBoolean ? boolType.MetricTypeId : numType.MetricTypeId,
            xIsBoolean ? numType.MetricTypeId : boolType.MetricTypeId,
            xIsBoolean ? boolType.Name : numType.Name,
            xIsBoolean ? numType.Name : boolType.Name,
            xIsBoolean ? boolType.Unit : numType.Unit,
            xIsBoolean ? numType.Unit : boolType.Unit,
            Math.Abs(percentDiff),
            direction,
            summary,
            points.Count,
            "correlation",
            "boolean_numeric",
            new ComparisonData(
                new ComparisonGroup($"With {boolType.Name.ToLower()}", avgWhenTrue, valuesWhenTrue.Count),
                new ComparisonGroup($"Without", avgWhenFalse, valuesWhenFalse.Count),
                "average",
                percentDiff,
                null,
                numType.Unit
            ),
            points
        );
    }

    // Numeric + Numeric: Median split + conditional average
    private static InsightItem? CalculateNumericNumericInsight(MetricType typeX, MetricType typeY, List<ComparePoint> points)
    {
        var xValues = points.Select(p => p.X).OrderBy(v => v).ToList();
        
        // True median for even/odd length
        double median;
        int mid = xValues.Count / 2;
        if (xValues.Count % 2 == 0)
            median = (xValues[mid - 1] + xValues[mid]) / 2.0;
        else
            median = xValues[mid];

        // Split at median - use >= for "high" to handle ties better
        var highGroup = points.Where(p => p.X >= median).ToList();
        var lowGroup = points.Where(p => p.X < median).ToList();
        
        // If one group is empty, try the opposite split
        if (lowGroup.Count == 0)
        {
            lowGroup = points.Where(p => p.X <= median).ToList();
            highGroup = points.Where(p => p.X > median).ToList();
        }

        if (highGroup.Count < 2 || lowGroup.Count < 2)
            return null;

        var avgHigh = highGroup.Select(p => p.Y).Average();
        var avgLow = lowGroup.Select(p => p.Y).Average();
        
        if (avgLow == 0)
            return null;
            
        var percentDiff = (avgHigh - avgLow) / avgLow * 100;

        if (Math.Abs(percentDiff) < 15)
            return null;

        var direction = percentDiff > 0 ? "positive" : "negative";
        var unitX = typeX.Unit != null ? $" {typeX.Unit}" : "";
        var unitY = typeY.Unit != null ? $" {typeY.Unit}" : "";
        var sign = percentDiff > 0 ? "+" : "";
        
        // Use actual min/max of groups for clearer labels
        var highMin = highGroup.Min(p => p.X);
        var lowMax = lowGroup.Max(p => p.X);
        
        var summary = $"When {typeX.Name.ToLower()} ≥ {highMin}{unitX}, {typeY.Name.ToLower()} averages {avgHigh:F1}{unitY} vs {avgLow:F1}{unitY} ({sign}{percentDiff:F0}%)";

        return new InsightItem(
            typeX.MetricTypeId,
            typeY.MetricTypeId,
            typeX.Name,
            typeY.Name,
            typeX.Unit,
            typeY.Unit,
            Math.Abs(percentDiff),
            direction,
            summary,
            points.Count,
            "correlation",
            "numeric_numeric",
            new ComparisonData(
                new ComparisonGroup($"≥{highMin}{unitX}", avgHigh, highGroup.Count),
                new ComparisonGroup($"<{highMin}{unitX}", avgLow, lowGroup.Count),
                "average",
                percentDiff,
                highMin,
                typeY.Unit
            ),
            points
        );
    }

    // Pearson for compare endpoint (useful for scatter visualization)
    private static double? CalculateCorrelation(List<ComparePoint> points)
    {
        if (points.Count < 2) return null;

        var n = points.Count;
        var sumX = points.Sum(p => (double)p.X);
        var sumY = points.Sum(p => (double)p.Y);
        var sumXY = points.Sum(p => (double)p.X * p.Y);
        var sumX2 = points.Sum(p => (double)p.X * p.X);
        var sumY2 = points.Sum(p => (double)p.Y * p.Y);

        var numerator = (n * sumXY) - (sumX * sumY);
        var denominator = Math.Sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (denominator == 0) return null;

        return numerator / denominator;
    }
}