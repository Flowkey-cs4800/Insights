using Microsoft.EntityFrameworkCore;
using Insights.Server.Entities;

namespace Insights.Server.Data;

public class InsightsContext : DbContext
{
    public InsightsContext(DbContextOptions<InsightsContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Metric> Metrics => Set<Metric>();
    public DbSet<MetricType> MetricTypes => Set<MetricType>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.GoogleId).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<MetricType>(entity =>
        {
            entity.HasKey(mt => mt.MetricTypeId);
            entity.HasIndex(mt => mt.UserId);
            entity.HasOne(mt => mt.User)
                  .WithMany()
                  .HasForeignKey(mt => mt.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Metric>(entity =>
        {
            entity.HasKey(m => m.MetricId);
            entity.HasIndex(m => new { m.UserId, m.Date });
            entity.HasIndex(m => new { m.MetricTypeId, m.Date }).IsUnique();
            entity.HasOne(m => m.MetricType)
                  .WithMany(mt => mt.Metrics)
                  .HasForeignKey(m => m.MetricTypeId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.User)
                  .WithMany()
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}