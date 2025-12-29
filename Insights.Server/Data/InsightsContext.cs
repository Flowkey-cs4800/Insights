using Microsoft.EntityFrameworkCore;
using Insights.Server.Entities;

namespace Insights.Server.Data;

public class InsightsContext : DbContext
{
    public InsightsContext(DbContextOptions<InsightsContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.UserId);
            entity.HasIndex(u => u.GoogleId).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });
    }
}