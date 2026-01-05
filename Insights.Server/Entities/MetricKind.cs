namespace Insights.Server.Entities;

public enum MetricKind
{
    Duration,  // stored as minutes
    Number,    // stored as integer
    Boolean    // stored as 0 or 1
}