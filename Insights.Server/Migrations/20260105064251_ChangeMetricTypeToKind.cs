using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Insights.Server.Migrations
{
    /// <inheritdoc />
    public partial class ChangeMetricTypeToKind : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Metric_MetricType_MetricTypeId",
                table: "Metric");

            migrationBuilder.DropForeignKey(
                name: "FK_Metric_Users_UserId",
                table: "Metric");

            migrationBuilder.DropForeignKey(
                name: "FK_MetricType_Users_UserId",
                table: "MetricType");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MetricType",
                table: "MetricType");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Metric",
                table: "Metric");

            migrationBuilder.DropColumn(
                name: "IsDuration",
                table: "MetricType");

            migrationBuilder.RenameTable(
                name: "MetricType",
                newName: "MetricTypes");

            migrationBuilder.RenameTable(
                name: "Metric",
                newName: "Metrics");

            migrationBuilder.RenameIndex(
                name: "IX_MetricType_UserId",
                table: "MetricTypes",
                newName: "IX_MetricTypes_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Metric_UserId_Date",
                table: "Metrics",
                newName: "IX_Metrics_UserId_Date");

            migrationBuilder.RenameIndex(
                name: "IX_Metric_MetricTypeId_Date",
                table: "Metrics",
                newName: "IX_Metrics_MetricTypeId_Date");

            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "MetricTypes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "MetricTypes",
                type: "text",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MetricTypes",
                table: "MetricTypes",
                column: "MetricTypeId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Metrics",
                table: "Metrics",
                column: "MetricId");

            migrationBuilder.AddForeignKey(
                name: "FK_Metrics_MetricTypes_MetricTypeId",
                table: "Metrics",
                column: "MetricTypeId",
                principalTable: "MetricTypes",
                principalColumn: "MetricTypeId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Metrics_Users_UserId",
                table: "Metrics",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MetricTypes_Users_UserId",
                table: "MetricTypes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Metrics_MetricTypes_MetricTypeId",
                table: "Metrics");

            migrationBuilder.DropForeignKey(
                name: "FK_Metrics_Users_UserId",
                table: "Metrics");

            migrationBuilder.DropForeignKey(
                name: "FK_MetricTypes_Users_UserId",
                table: "MetricTypes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_MetricTypes",
                table: "MetricTypes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Metrics",
                table: "Metrics");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "MetricTypes");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "MetricTypes");

            migrationBuilder.RenameTable(
                name: "MetricTypes",
                newName: "MetricType");

            migrationBuilder.RenameTable(
                name: "Metrics",
                newName: "Metric");

            migrationBuilder.RenameIndex(
                name: "IX_MetricTypes_UserId",
                table: "MetricType",
                newName: "IX_MetricType_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Metrics_UserId_Date",
                table: "Metric",
                newName: "IX_Metric_UserId_Date");

            migrationBuilder.RenameIndex(
                name: "IX_Metrics_MetricTypeId_Date",
                table: "Metric",
                newName: "IX_Metric_MetricTypeId_Date");

            migrationBuilder.AddColumn<bool>(
                name: "IsDuration",
                table: "MetricType",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_MetricType",
                table: "MetricType",
                column: "MetricTypeId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Metric",
                table: "Metric",
                column: "MetricId");

            migrationBuilder.AddForeignKey(
                name: "FK_Metric_MetricType_MetricTypeId",
                table: "Metric",
                column: "MetricTypeId",
                principalTable: "MetricType",
                principalColumn: "MetricTypeId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Metric_Users_UserId",
                table: "Metric",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MetricType_Users_UserId",
                table: "MetricType",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
