using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Insights.Server.Migrations
{
    /// <inheritdoc />
    public partial class FixGoalDaysSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GoalDays",
                table: "MetricTypes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoalDays",
                table: "MetricTypes");
        }
    }
}
