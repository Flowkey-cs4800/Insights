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

    // Goal days (bit flags): Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
    // Default 127 = all days enabled (1+2+4+8+16+32+64)
    // Only applies when GoalCadence is Daily
    public int GoalDays { get; set; } = 127;

    // Navigation
    public List<Metric> Metrics { get; set; } = new();
    public User User { get; set; } = null!;

    // Helper methods for day manipulation
    public bool IsDayEnabled(DayOfWeek day)
    {
        var flag = DayToFlag(day);
        return (GoalDays & flag) != 0;
    }

    public void SetDayEnabled(DayOfWeek day, bool enabled)
    {
        var flag = DayToFlag(day);
        if (enabled)
            GoalDays |= flag;
        else
            GoalDays &= ~flag;
    }

    private static int DayToFlag(DayOfWeek day)
    {
        // DayOfWeek: Sunday=0, Monday=1, ..., Saturday=6
        // Our flags: Monday=1, Tuesday=2, Wednesday=4, Thursday=8, Friday=16, Saturday=32, Sunday=64
        return day switch
        {
            DayOfWeek.Monday => 1,
            DayOfWeek.Tuesday => 2,
            DayOfWeek.Wednesday => 4,
            DayOfWeek.Thursday => 8,
            DayOfWeek.Friday => 16,
            DayOfWeek.Saturday => 32,
            DayOfWeek.Sunday => 64,
            _ => 0
        };
    }
}