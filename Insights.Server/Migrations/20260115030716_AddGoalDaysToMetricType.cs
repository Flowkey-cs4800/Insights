using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Insights.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalDaysToMetricType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GoalDays",
                table: "MetricTypes",
                type: "integer",
                nullable: false,
                defaultValue: 127);
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