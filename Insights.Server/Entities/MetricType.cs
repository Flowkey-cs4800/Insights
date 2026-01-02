namespace Insights.Server.Entities;

public class MetricType
{
    public Guid MetricTypeId { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDuration { get; set; }  // true = minutes, false = number
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;


    public User User { get; set; } = null!;
    public List<Metric> Metrics { get; set; } = [];
}