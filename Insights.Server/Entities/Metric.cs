namespace Insights.Server.Entities;

public class Metric
{
    public Guid MetricId { get; set; }
    public Guid MetricTypeId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public int Value { get; set; }  // minutes for duration, raw number otherwise
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;


    public MetricType MetricType { get; set; } = null!;
    public User User { get; set; } = null!;
}