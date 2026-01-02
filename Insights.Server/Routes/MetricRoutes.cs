using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Insights.Server.Data;
using Insights.Server.Entities;

namespace Insights.Server.Routes;

public static class MetricRoutes
{
    // --- DTOs ---
    public record MetricTypeResponse(Guid MetricTypeId, string Name, bool IsDuration);
    public record MetricTypeRequest(string Name, bool IsDuration);
    
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
                .Select(mt => new MetricTypeResponse(mt.MetricTypeId, mt.Name, mt.IsDuration))
                .ToListAsync();

            return Results.Ok(metricTypes);
        })
        .WithSummary("List metric types")
        .WithDescription("Returns all metric types created by the current user.")
        .Produces<List<MetricTypeResponse>>(200)
        .Produces(401);

        // Create metric type
        types.MapPost("/", async (MetricTypeRequest request, HttpContext context, InsightsContext db) =>
        {
            var userId = GetUserId(context);
            if (userId is null) return Results.Unauthorized();

            var metricType = new MetricType
            {
                MetricTypeId = Guid.NewGuid(),
                UserId = userId.Value,
                Name = request.Name,
                IsDuration = request.IsDuration
            };

            db.MetricTypes.Add(metricType);
            await db.SaveChangesAsync();

            return Results.Created($"/api/metric-types/{metricType.MetricTypeId}",
                new MetricTypeResponse(metricType.MetricTypeId, metricType.Name, metricType.IsDuration));
        })
        .WithSummary("Create metric type")
        .WithDescription("Creates a new metric type. IsDuration=true for time-based metrics (stored as minutes), false for counts/scales.")
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

            metricType.Name = request.Name;
            metricType.IsDuration = request.IsDuration;
            await db.SaveChangesAsync();

            return Results.Ok(new MetricTypeResponse(metricType.MetricTypeId, metricType.Name, metricType.IsDuration));
        })
        .WithSummary("Update metric type")
        .WithDescription("Updates an existing metric type's name or duration setting.")
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
        .WithSummary("Delete metric type")
        .WithDescription("Deletes a metric type and all its associated metric entries.")
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
        .WithSummary("List metrics")
        .WithDescription("Returns metrics for the current user. Filter by date range (from/to) and/or metricTypeId.")
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
        .WithSummary("Log metric")
        .WithDescription("Records a metric value for a specific date. Value is minutes for duration types, raw number for count/scale types.")
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
        .WithSummary("Update metric")
        .WithDescription("Updates the value of an existing metric entry.")
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
        .WithSummary("Delete metric")
        .WithDescription("Deletes a metric entry.")
        .Produces(204)
        .Produces(401)
        .Produces(404);
    }


    // Helper to get UserId from HttpContext
    private static Guid? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst("UserId")?.Value;
        return userIdClaim is not null ? Guid.Parse(userIdClaim) : null;
    }
}