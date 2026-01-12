using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Insights.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalsToMetricType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "MetricTypes");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "MetricTypes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<int>(
                name: "GoalCadence",
                table: "MetricTypes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "GoalValue",
                table: "MetricTypes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoalCadence",
                table: "MetricTypes");

            migrationBuilder.DropColumn(
                name: "GoalValue",
                table: "MetricTypes");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "MetricTypes",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "MetricTypes",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));
        }
    }
}
