using System.ComponentModel.DataAnnotations;

namespace Insights.Server.Entities;

public enum GoalCadence
{
    Daily = 0,
    Weekly = 1
}

public class MetricType
{
    public Guid MetricTypeId { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = "";

    public MetricKind Kind { get; set; }

    public string? Unit { get; set; }

    // Goals stored per metric type
    // - Boolean: GoalValue = days per cadence (Weekly recommended)
    // - Number/Duration: GoalValue = total target per cadence
    public GoalCadence GoalCadence { get; set; } = GoalCadence.Weekly;
    public int GoalValue { get; set; } = 0;

    // Navigation
    public List<Metric> Metrics { get; set; } = new();
    public User User { get; set; } = null!;
}