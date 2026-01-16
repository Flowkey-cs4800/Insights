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
        int GoalValue,
        int GoalDays
    );

    public record MetricTypeRequest(
        string Name,
        MetricKind Kind,
        string? Unit,
        GoalCadence GoalCadence,
        int GoalValue,
        int GoalDays
    );

    public record MetricResponse(Guid MetricId, Guid MetricTypeId, string MetricTypeName, DateOnly Date, int Value);
    public record MetricRequest(Guid MetricTypeId, DateOnly Date, int Value);
    public record MetricUpdateRequest(int Value);

    // Analytics DTOs
    public record BarDataPoint(string Label, int Value, bool IsGoalMet);
    public record DayConsistency(string DayName, int Count, double Percentage);
    public record MetricAnalyticsResponse(
        string MetricName,
        MetricKind Kind,
        string? Unit,
        int CurrentStreak,
        int MaxStreak,
        double Average,
        List<DayConsistency> ConsistentDays,
        List<BarDataPoint> WeeklyData,
        List<BarDataPoint> MonthlyData
    );

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
                    mt.GoalValue,
                    mt.GoalDays
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

            // Validate GoalDays for Daily cadence
            var goalDays = request.GoalDays;
            if (request.GoalCadence == GoalCadence.Daily)
            {
                // Ensure at least one day is selected
                if (goalDays <= 0 || goalDays > 127)
                    goalDays = 127; // Default to all days if invalid
            }
            else
            {
                // For Weekly cadence, GoalDays doesn't matter but keep it
                if (goalDays <= 0 || goalDays > 127)
                    goalDays = 127;
            }

            var metricType = new MetricType
            {
                MetricTypeId = Guid.NewGuid(),
                UserId = userId.Value,
                Name = request.Name,
                Kind = request.Kind,
                Unit = request.Unit,
                GoalCadence = request.GoalCadence,
                GoalValue = goalValue,
                GoalDays = goalDays
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
                    metricType.GoalValue,
                    metricType.GoalDays
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

            // Validate GoalDays for Daily cadence
            var goalDays = request.GoalDays;
            if (request.GoalCadence == GoalCadence.Daily)
            {
                // Ensure at least one day is selected
                if (goalDays <= 0 || goalDays > 127)
                    goalDays = 127; // Default to all days if invalid
            }
            else
            {
                // For Weekly cadence, GoalDays doesn't matter but keep it
                if (goalDays <= 0 || goalDays > 127)
                    goalDays = 127;
            }

            metricType.Name = request.Name;
            metricType.Kind = request.Kind;
            metricType.Unit = request.Unit;
            metricType.GoalCadence = request.GoalCadence;
            metricType.GoalValue = goalValue;
            metricType.GoalDays = goalDays;

            await db.SaveChangesAsync();

            return Results.Ok(new MetricTypeResponse(
                metricType.MetricTypeId,
                metricType.Name,
                metricType.Kind,
                metricType.Unit,
                metricType.GoalCadence,
                metricType.GoalValue,
                metricType.GoalDays
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

            var xIsBoolean = typeX.Kind == MetricKind.Boolean;
            var yIsBoolean = typeY.Kind == MetricKind.Boolean;

            List<ComparePoint> points;

            if (xIsBoolean || yIsBoolean)
            {
                // For boolean metrics, include all dates where EITHER metric was logged
                // Treat missing boolean entries as 0
                var allDates = metricsX.Keys.Union(metricsY.Keys).OrderBy(d => d).ToList();
                
                points = allDates.Select(date => new ComparePoint(
                    date.ToString("yyyy-MM-dd"),
                    metricsX.TryGetValue(date, out var xVal) ? xVal : (xIsBoolean ? 0 : -1),
                    metricsY.TryGetValue(date, out var yVal) ? yVal : (yIsBoolean ? 0 : -1)
                ))
                // Filter out days where a non-boolean metric has no data
                .Where(p => (xIsBoolean || p.X >= 0) && (yIsBoolean || p.Y >= 0))
                // Fix the -1 sentinel values (shouldn't happen after filter, but safety)
                .Select(p => new ComparePoint(p.Date, Math.Max(0, p.X), Math.Max(0, p.Y)))
                .ToList();
            }
            else
            {
                // For numeric metrics, only include dates where both have data
                var commonDates = metricsX.Keys.Intersect(metricsY.Keys).OrderBy(d => d).ToList();
                points = commonDates.Select(date => new ComparePoint(
                    date.ToString("yyyy-MM-dd"),
                    metricsX[date],
                    metricsY[date]
                )).ToList();
            }

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

        // --- Get analytics for a single metric ---
        metrics.MapGet("/analytics/{metricTypeId:guid}", async (Guid metricTypeId, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricType = await db.MetricTypes
                .FirstOrDefaultAsync(mt => mt.MetricTypeId == metricTypeId && mt.UserId == userId);

            if (metricType is null) return Results.NotFound();

            // Get all metrics for this type (last 90 days for performance)
            var ninetyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90));
            var metrics = await db.Metrics
                .Where(m => m.MetricTypeId == metricTypeId && m.UserId == userId && m.Date >= ninetyDaysAgo)
                .OrderBy(m => m.Date)
                .ToListAsync();

            if (metrics.Count == 0)
            {
                return Results.Ok(new MetricAnalyticsResponse(
                    metricType.Name,
                    metricType.Kind,
                    metricType.Unit,
                    0, 0, 0,
                    new List<DayConsistency>(),
                    new List<BarDataPoint>(),
                    new List<BarDataPoint>()
                ));
            }

            // Calculate streaks
            var (currentStreak, maxStreak) = CalculateStreaks(metrics, metricType);

            // Calculate average
            var average = metrics.Average(m => (double)m.Value);

            // Calculate most consistent days
            var consistentDays = CalculateConsistentDays(metrics);

            // Generate weekly bar data (last 7 days)
            var weeklyData = GenerateWeeklyBarData(metrics, metricType);

            // Generate monthly bar data (last 30 days)
            var monthlyData = GenerateMonthlyBarData(metrics, metricType);

            return Results.Ok(new MetricAnalyticsResponse(
                metricType.Name,
                metricType.Kind,
                metricType.Unit,
                currentStreak,
                maxStreak,
                average,
                consistentDays,
                weeklyData,
                monthlyData
            ));
        })
        .WithSummary("Get analytics for a metric")
        .WithDescription("Returns streak stats, consistency, and bar graph data for weekly/monthly views.")
        .Produces<MetricAnalyticsResponse>(200)
        .Produces(401)
        .Produces(404);

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
                
                // Streak calculation - current streak
                var streak = 0;
                var checkDate = today;
                DateOnly? streakStartDate = null;
                
                if (!data.ContainsKey(checkDate))
                    checkDate = today.AddDays(-1);
                
                var streakCheckStart = checkDate;
                while (data.ContainsKey(checkDate))
                {
                    streak++;
                    streakStartDate = checkDate;
                    checkDate = checkDate.AddDays(-1);
                }

                // Calculate max streak from all history
                var maxStreak = 0;
                var tempStreak = 0;
                var allDates = data.Keys.OrderBy(d => d).ToList();
                DateOnly? prevDate = null;
                foreach (var d in allDates)
                {
                    if (prevDate == null || d == prevDate.Value.AddDays(1))
                    {
                        tempStreak++;
                        maxStreak = Math.Max(maxStreak, tempStreak);
                    }
                    else
                    {
                        tempStreak = 1;
                    }
                    prevDate = d;
                }

                var daysUntilRecord = maxStreak > streak ? maxStreak - streak + 1 : 0;

                if (streak >= 3)
                {
                    var detailedExplanation = streak >= maxStreak
                        ? $"This is your best streak ever for {mt.Name}! You started this streak on {streakStartDate?.ToString("MMM d")}. Keep it going!"
                        : $"Your current streak started on {streakStartDate?.ToString("MMM d")}. Your record is {maxStreak} days. Just {daysUntilRecord} more to beat it!";

                    singleInsights.Add(new InsightItem(
                        mt.MetricTypeId,
                        null,
                        mt.Name,
                        null,
                        mt.Unit,
                        null,
                        streak,
                        "positive",
                        $"You've logged {mt.Name} for {streak} days in a row",
                        detailedExplanation,
                        streak,
                        "streak",
                        null,
                        null,
                        new StreakData(streak, maxStreak, streakStartDate?.ToString("yyyy-MM-dd"), daysUntilRecord),
                        null,
                        null
                    ));
                }

                // Consistency calculation
                var last7Days = Enumerable.Range(0, 7).Select(i => today.AddDays(-i)).ToList();
                var daysLogged = last7Days.Count(d => data.ContainsKey(d));
                var consistency = Math.Round((double)daysLogged / 7 * 100);
                
                // Which days were logged
                var dayNames = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
                var loggedDayNames = last7Days
                    .Where(d => data.ContainsKey(d))
                    .Select(d => dayNames[(int)d.DayOfWeek])
                    .ToList();

                // Previous week for comparison
                var prev7Days = Enumerable.Range(7, 7).Select(i => today.AddDays(-i)).ToList();
                var prevWeekCount = prev7Days.Count(d => data.ContainsKey(d));

                if (daysLogged >= 5)
                {
                    var comparison = daysLogged > prevWeekCount
                        ? $"That's up from {prevWeekCount} days last week. Nice improvement!"
                        : daysLogged == prevWeekCount
                        ? $"You're maintaining the same pace as last week ({prevWeekCount} days)."
                        : $"Last week you logged {prevWeekCount} days.";

                    var detailedExplanation = $"You logged {mt.Name} on {string.Join(", ", loggedDayNames)} this week. {comparison}";

                    singleInsights.Add(new InsightItem(
                        mt.MetricTypeId,
                        null,
                        mt.Name,
                        null,
                        mt.Unit,
                        null,
                        consistency,
                        "positive",
                        $"Solid habit: you've tracked {mt.Name} on {daysLogged} of the last 7 days",
                        detailedExplanation,
                        daysLogged,
                        "consistency",
                        null,
                        null,
                        null,
                        new ConsistencyData(daysLogged, 7, consistency, loggedDayNames, prevWeekCount),
                        null
                    ));
                }
            }

            // Combine and sort all insights by strength
            // Correlations first (they're more interesting), then single-metric insights
            var combined = correlationInsights
                .OrderByDescending(i => i.Strength)
                .Concat(singleInsights
                    .OrderByDescending(i => i.InsightType == "streak" ? 1 : 0)
                    .ThenByDescending(i => i.Strength))
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

    public record StreakData(
        int CurrentStreak,
        int MaxStreak,
        string? StreakStartDate,
        int DaysUntilRecord
    );

    public record ConsistencyData(
        int DaysLogged,
        int TotalDays,
        double Percentage,
        List<string> LoggedDays,
        int? PreviousWeekCount
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
        string? DetailedExplanation,  // Longer, more detailed explanation
        int DataPoints,
        string InsightType,     // "correlation", "streak", "consistency"
        string? ComparisonType, // "boolean_boolean", "boolean_numeric", "numeric_numeric"
        ComparisonData? ComparisonData,
        StreakData? StreakData,
        ConsistencyData? ConsistencyData,
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
        var moreOrLess = diff > 0 ? "more" : "less";
        var summary = $"You're {Math.Abs(diff):F0}% {moreOrLess} likely to log {typeX.Name} on days you log {typeY.Name}";
        
        var detailedExplanation = $"Looking at {points.Count} days of data: on days when you logged {typeY.Name}, " +
            $"you also logged {typeX.Name} {xRateWithY:F0}% of the time ({daysWithY.Count(p => p.X == 1)} out of {daysWithY.Count} days). " +
            $"On days without {typeY.Name}, that drops to {xRateWithoutY:F0}% ({daysWithoutY.Count(p => p.X == 1)} out of {daysWithoutY.Count} days). " +
            $"That's a {Math.Abs(diff):F0} percentage point difference.";

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
            detailedExplanation,
            points.Count,
            "correlation",
            "boolean_boolean",
            new ComparisonData(
                new ComparisonGroup($"Days with {typeY.Name}", xRateWithY, daysWithY.Count),
                new ComparisonGroup($"Days without", xRateWithoutY, daysWithoutY.Count),
                "percentage",
                diff,
                null,
                null
            ),
            null,
            null,
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
        var higherOrLower = percentDiff > 0 ? "higher" : "lower";
        var summary = $"On days you log {boolType.Name}, your {numType.Name} tends to be {Math.Abs(percentDiff):F0}% {higherOrLower}";
        
        var detailedExplanation = $"Based on {points.Count} days of data: when you logged {boolType.Name}, " +
            $"your {numType.Name} averaged {avgWhenTrue:F1}{unit} ({valuesWhenTrue.Count} days). " +
            $"On days without {boolType.Name}, it averaged {avgWhenFalse:F1}{unit} ({valuesWhenFalse.Count} days). " +
            $"That's a {Math.Abs(percentDiff):F0}% difference.";

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
            detailedExplanation,
            points.Count,
            "correlation",
            "boolean_numeric",
            new ComparisonData(
                new ComparisonGroup($"Days with {boolType.Name}", avgWhenTrue, valuesWhenTrue.Count),
                new ComparisonGroup($"Days without", avgWhenFalse, valuesWhenFalse.Count),
                "average",
                percentDiff,
                null,
                numType.Unit
            ),
            null,
            null,
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
        
        // Use actual min/max of groups for clearer labels
        var highMin = highGroup.Min(p => p.X);
        var lowMax = lowGroup.Max(p => p.X);
        
        var higherOrLower = percentDiff > 0 ? "higher" : "lower";
        var summary = $"Higher {typeX.Name} correlates with {higherOrLower} {typeY.Name} ({Math.Abs(percentDiff):F0}% difference)";
        
        var detailedExplanation = $"We split your {points.Count} days of data at the median ({highMin}{unitX}). " +
            $"On days when {typeX.Name} was {highMin}{unitX} or higher, your {typeY.Name} averaged {avgHigh:F1}{unitY} ({highGroup.Count} days). " +
            $"On days below that threshold, it averaged {avgLow:F1}{unitY} ({lowGroup.Count} days). " +
            $"That's a {Math.Abs(percentDiff):F0}% difference between the two groups.";

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
            detailedExplanation,
            points.Count,
            "correlation",
            "numeric_numeric",
            new ComparisonData(
                new ComparisonGroup($"High {typeX.Name} (>={highMin}{unitX})", avgHigh, highGroup.Count),
                new ComparisonGroup($"Low {typeX.Name} (<{highMin}{unitX})", avgLow, lowGroup.Count),
                "average",
                percentDiff,
                highMin,
                typeY.Unit
            ),
            null,
            null,
            points
        );
    }

    // Pearson for compare endpoint (useful for scatter visualization)
    private static double? CalculateCorrelation(List<ComparePoint> points)
    {
        if (points.Count < 3) return null; // Need at least 3 points for meaningful correlation

        var n = points.Count;
        var sumX = points.Sum(p => (double)p.X);
        var sumY = points.Sum(p => (double)p.Y);
        var sumXY = points.Sum(p => (double)p.X * p.Y);
        var sumX2 = points.Sum(p => (double)p.X * p.X);
        var sumY2 = points.Sum(p => (double)p.Y * p.Y);

        // Calculate variances
        var varX = n * sumX2 - sumX * sumX;
        var varY = n * sumY2 - sumY * sumY;

        // If either variable has no variance, correlation is undefined
        if (varX <= 0 || varY <= 0) return null;

        var denominator = Math.Sqrt(varX * varY);

        // Handle floating point edge cases
        if (denominator < 0.0001) return null;

        var numerator = (n * sumXY) - (sumX * sumY);
        var correlation = numerator / denominator;

        // Clamp to valid range [-1, 1] to handle floating point errors
        return Math.Max(-1.0, Math.Min(1.0, correlation));
    }

    // Analytics helper methods
    private static (int CurrentStreak, int MaxStreak) CalculateStreaks(List<Metric> metrics, MetricType metricType)
    {
        if (metrics.Count == 0) return (0, 0);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasGoal = metricType.GoalValue > 0;
        var isDaily = metricType.GoalCadence == GoalCadence.Daily;
        
        // For metrics, create a set of dates that have entries
        var metricDates = new HashSet<DateOnly>(metrics.Select(m => m.Date));
        
        // Helper to check if a day counts towards streak
        bool CountsForStreak(DateOnly date)
        {
            // If daily goal, only count if the day is in GoalDays
            if (hasGoal && isDaily)
            {
                var dayOfWeek = date.DayOfWeek;
                if (!metricType.IsDayEnabled(dayOfWeek))
                    return false; // This day doesn't count for goal
            }

            if (!metricDates.Contains(date))
                return false; // No entry on this date

            var metric = metrics.First(m => m.Date == date);
            
            // Boolean: value must be 1
            if (metricType.Kind == MetricKind.Boolean)
                return metric.Value == 1;
            
            // Numeric/Duration: if has daily goal, must meet/exceed goal
            if (hasGoal && isDaily)
                return metric.Value >= metricType.GoalValue;
            
            // Otherwise, just needs to be > 0
            return metric.Value > 0;
        }

        // Calculate current streak (going backwards from today)
        int currentStreak = 0;
        var checkDate = today;
        
        // Start from today or yesterday if today has no entry
        if (!CountsForStreak(today))
            checkDate = today.AddDays(-1);
        
        while (checkDate >= metrics.Min(m => m.Date))
        {
            if (CountsForStreak(checkDate))
            {
                currentStreak++;
                checkDate = checkDate.AddDays(-1);
            }
            else
            {
                // For daily goals, skip days not in GoalDays
                if (hasGoal && isDaily && !metricType.IsDayEnabled(checkDate.DayOfWeek))
                {
                    checkDate = checkDate.AddDays(-1);
                    continue;
                }
                break;
            }
        }

        // Calculate max streak (scan entire history)
        int maxStreak = 0;
        int tempStreak = 0;
        var scanDate = metrics.Min(m => m.Date);
        var endDate = today;

        while (scanDate <= endDate)
        {
            if (CountsForStreak(scanDate))
            {
                tempStreak++;
                maxStreak = Math.Max(maxStreak, tempStreak);
            }
            else
            {
                // For daily goals, skip days not in GoalDays
                if (hasGoal && isDaily && !metricType.IsDayEnabled(scanDate.DayOfWeek))
                {
                    scanDate = scanDate.AddDays(1);
                    continue;
                }
                tempStreak = 0;
            }
            scanDate = scanDate.AddDays(1);
        }

        return (currentStreak, maxStreak);
    }

    private static List<DayConsistency> CalculateConsistentDays(List<Metric> metrics)
    {
        if (metrics.Count == 0) return new List<DayConsistency>();

        var dayGroups = metrics
            .GroupBy(m => m.Date.DayOfWeek)
            .Select(g => new
            {
                Day = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToList();

        var total = metrics.Count;
        var dayNames = new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };

        return dayGroups.Select(dg => new DayConsistency(
            dayNames[(int)dg.Day],
            dg.Count,
            (dg.Count / (double)total) * 100
        )).ToList();
    }

    private static List<BarDataPoint> GenerateWeeklyBarData(List<Metric> metrics, MetricType metricType)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var sevenDaysAgo = today.AddDays(-6); // Include today = 7 days total
        
        var metricDict = metrics.Where(m => m.Date >= sevenDaysAgo && m.Date <= today)
            .ToDictionary(m => m.Date, m => m.Value);

        var result = new List<BarDataPoint>();
        var hasGoal = metricType.GoalValue > 0 && metricType.GoalCadence == GoalCadence.Daily;

        for (var date = sevenDaysAgo; date <= today; date = date.AddDays(1))
        {
            var value = metricDict.TryGetValue(date, out var v) ? v : 0;
            var isGoalMet = false;

            if (hasGoal && metricDict.ContainsKey(date))
            {
                if (metricType.Kind == MetricKind.Boolean)
                    isGoalMet = value == 1;
                else
                    isGoalMet = value >= metricType.GoalValue;
            }

            result.Add(new BarDataPoint(
                date.ToString("ddd"), // Mon, Tue, etc.
                value,
                isGoalMet
            ));
        }

        return result;
    }

    private static List<BarDataPoint> GenerateMonthlyBarData(List<Metric> metrics, MetricType metricType)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = today.AddDays(-29); // Include today = 30 days total
        
        var metricDict = metrics.Where(m => m.Date >= thirtyDaysAgo && m.Date <= today)
            .ToDictionary(m => m.Date, m => m.Value);

        var result = new List<BarDataPoint>();
        var hasGoal = metricType.GoalValue > 0 && metricType.GoalCadence == GoalCadence.Daily;

        for (var date = thirtyDaysAgo; date <= today; date = date.AddDays(1))
        {
            var value = metricDict.TryGetValue(date, out var v) ? v : 0;
            var isGoalMet = false;

            if (hasGoal && metricDict.ContainsKey(date))
            {
                if (metricType.Kind == MetricKind.Boolean)
                    isGoalMet = value == 1;
                else
                    isGoalMet = value >= metricType.GoalValue;
            }

            result.Add(new BarDataPoint(
                date.Day.ToString(), // Day number (1-31)
                value,
                isGoalMet
            ));
        }

        return result;
    }
}