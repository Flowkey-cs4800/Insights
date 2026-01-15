import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  useTheme as useMuiTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton,
  Tab,
  Tabs,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";

import {
  getInsights,
  getMetricTypes,
  compareMetrics,
  getMetricAnalytics,
  type InsightItem,
  type MetricType,
  type CompareResult,
  type MetricAnalyticsResponse,
} from "../services/metricService";

// Custom styled tooltip for charts
interface TooltipPayloadEntry {
  value?: number;
  name?: string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
  label?: string | number;
  isDark?: boolean;
  valueFormatter?: (value: number, name: string) => string;
  formatLabel?: (label: string) => string;
}

function ChartTooltip({
  active,
  payload,
  label,
  isDark,
  valueFormatter,
  formatLabel,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        bgcolor: isDark ? "grey.800" : "background.paper",
        border: "1px solid",
        borderColor: isDark ? "grey.700" : "grey.200",
        borderRadius: 1.5,
        minWidth: 120,
      }}
    >
      {label !== undefined && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.5 }}
        >
          {formatLabel ? formatLabel(String(label)) : label}
        </Typography>
      )}
      {payload.map((entry: TooltipPayloadEntry, idx: number) => (
        <Typography
          key={idx}
          variant="body2"
          sx={{ fontWeight: 600, color: entry.color }}
        >
          {entry.name}:{" "}
          {valueFormatter && entry.value !== undefined
            ? valueFormatter(entry.value, entry.name ?? "")
            : entry.value}
        </Typography>
      ))}
    </Paper>
  );
}

export default function Insights() {
  const navigate = useNavigate();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  // Chart colors from theme
  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: isDark ? theme.palette.grey[500] : theme.palette.grey[400],
    grid: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    text: theme.palette.text.secondary,
  };

  // Tab state
  const [tab, setTab] = useState<"insights" | "compare">("insights");

  // Auto insights state
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(
    null
  );

  // Custom compare state
  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [xMetric, setXMetric] = useState<string>("");
  const [yMetric, setYMetric] = useState<string>("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(
    null
  );
  const [comparing, setComparing] = useState(false);

  // Individual analytics state
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [analyticsData, setAnalyticsData] = useState<MetricAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [insightsRes, typesRes] = await Promise.all([
        getInsights(),
        getMetricTypes(),
      ]);

      if (insightsRes.success) {
        setInsights(insightsRes.data.insights);
        const firstCorrelation = insightsRes.data.insights.find(
          (i) => i.insightType === "correlation"
        );
        setSelectedInsight(
          firstCorrelation ?? insightsRes.data.insights[0] ?? null
        );
      } else {
        setErr(insightsRes.error);
      }

      if (typesRes.success) {
        setMetricTypes(typesRes.data);
      }

      setLoading(false);
    };
    void load();
  }, []);

  // Auto-compare when both metrics selected
  useEffect(() => {
    if (!xMetric || !yMetric || xMetric === yMetric) {
      return;
    }

    const doCompare = async () => {
      setComparing(true);
      const res = await compareMetrics(xMetric, yMetric);
      if (res.success) {
        setCompareResult(res.data);
      } else {
        setErr(res.error);
        setCompareResult(null);
      }
      setComparing(false);
    };

    void doCompare();
  }, [xMetric, yMetric]);

  // Auto-fetch analytics when metric selected
  useEffect(() => {
    if (!selectedMetricId) {
      setAnalyticsData(null);
      return;
    }

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const res = await getMetricAnalytics(selectedMetricId);
      if (res.success) {
        setAnalyticsData(res.data);
      } else {
        setErr(res.error);
        setAnalyticsData(null);
      }
      setLoadingAnalytics(false);
    };

    void fetchAnalytics();
  }, [selectedMetricId]);

  const getInsightIcon = (insight: InsightItem) => {
    switch (insight.insightType) {
      case "streak":
        return <WhatshotIcon />;
      case "consistency":
        return <CheckCircleIcon />;
      case "correlation":
        return <ShowChartIcon />;
      default:
        return <TrendingUpIcon />;
    }
  };

  const getInsightColor = (insight: InsightItem) => {
    switch (insight.insightType) {
      case "streak":
        return "warning.main";
      case "consistency":
        return "success.main";
      case "correlation":
        return "primary.main";
      default:
        return "info.main";
    }
  };

  const renderVisualization = (insight: InsightItem) => {
    if (insight.insightType !== "correlation" || !insight.comparisonData) {
      // Single-metric insight - show simple stat
      return (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography
            variant="h2"
            sx={{ fontWeight: 900, color: getInsightColor(insight) }}
          >
            {insight.insightType === "streak" && `${insight.strength} days`}
            {insight.insightType === "consistency" && `${insight.strength}%`}
            {insight.insightType === "average" && `${insight.strength}`}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {insight.summary}
          </Typography>
        </Box>
      );
    }

    const { comparisonType, comparisonData, scatterData } = insight;

    // Bar chart for comparison groups
    const barData = [
      {
        name: comparisonData.groupA.label,
        value: comparisonData.groupA.value,
        count: comparisonData.groupA.count,
      },
      {
        name: comparisonData.groupB.label,
        value: comparisonData.groupB.value,
        count: comparisonData.groupB.count,
      },
    ];

    // Scatter data with jitter for boolean x-axis
    const scatterWithJitter = scatterData?.map((p) => ({
      ...p,
      xJitter:
        comparisonType === "boolean_numeric" ||
        comparisonType === "boolean_boolean"
          ? p.x + (Math.random() - 0.5) * 0.3
          : p.x,
    }));

    return (
      <Stack spacing={3}>
        {/* Bar Chart - Comparison */}
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 1 }}
          >
            {comparisonData.valueType === "percentage"
              ? "Rate Comparison"
              : "Average Comparison"}
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 100 : 120}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{
                left: isMobile ? 0 : 10,
                right: isMobile ? 10 : 30,
                top: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={chartColors.grid}
              />
              <XAxis
                type="number"
                domain={[
                  0,
                  comparisonData.valueType === "percentage" ? 100 : "auto",
                ]}
                tick={{ fontSize: isMobile ? 10 : 12, fill: chartColors.text }}
                tickFormatter={(v: number) =>
                  comparisonData.valueType === "percentage"
                    ? `${v}%`
                    : `${v}${
                        comparisonData.unit ? ` ${comparisonData.unit}` : ""
                      }`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={isMobile ? 100 : 160}
                tick={{ fontSize: isMobile ? 10 : 12, fill: chartColors.text }}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    isDark={isDark}
                    valueFormatter={(v) =>
                      comparisonData.valueType === "percentage"
                        ? `${v.toFixed(1)}%`
                        : `${v.toFixed(1)}${
                            comparisonData.unit ? ` ${comparisonData.unit}` : ""
                          }`
                    }
                  />
                }
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <Cell fill={chartColors.primary} />
                <Cell fill={chartColors.secondary} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Stack
            direction="row"
            justifyContent="center"
            spacing={3}
            sx={{ mt: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: chartColors.primary,
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {comparisonData.groupA.count} days
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: chartColors.secondary,
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {comparisonData.groupB.count} days
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Scatter Plot */}
        {scatterWithJitter && scatterWithJitter.length > 0 && (
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: 1 }}
            >
              Data Points
            </Typography>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
              <ScatterChart
                margin={
                  isMobile
                    ? { top: 10, right: 10, bottom: 35, left: 35 }
                    : { top: 10, right: 30, bottom: 40, left: 50 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.grid}
                />
                <XAxis
                  type="number"
                  dataKey="xJitter"
                  name={insight.metricX}
                  domain={
                    comparisonType === "boolean_numeric" ||
                    comparisonType === "boolean_boolean"
                      ? [-0.5, 1.5]
                      : ["auto", "auto"]
                  }
                  ticks={
                    comparisonType === "boolean_numeric" ||
                    comparisonType === "boolean_boolean"
                      ? [0, 1]
                      : undefined
                  }
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: chartColors.text,
                  }}
                  tickFormatter={(v: number) => {
                    if (
                      comparisonType === "boolean_numeric" ||
                      comparisonType === "boolean_boolean"
                    ) {
                      return v === 0 ? "No" : v === 1 ? "Yes" : "";
                    }
                    return String(v);
                  }}
                  label={
                    isMobile
                      ? undefined
                      : {
                          value: `${insight.metricX}${
                            insight.unitX ? ` (${insight.unitX})` : ""
                          }`,
                          position: "bottom",
                          offset: 5,
                          style: { fontSize: 11, fill: chartColors.text },
                        }
                  }
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={insight.metricY ?? ""}
                  domain={
                    comparisonType === "boolean_boolean"
                      ? [-0.5, 1.5]
                      : ["auto", "auto"]
                  }
                  ticks={
                    comparisonType === "boolean_boolean" ? [0, 1] : undefined
                  }
                  tick={{
                    fontSize: isMobile ? 10 : 12,
                    fill: chartColors.text,
                  }}
                  tickFormatter={(v: number) => {
                    if (comparisonType === "boolean_boolean") {
                      return v === 0 ? "No" : v === 1 ? "Yes" : "";
                    }
                    return String(v);
                  }}
                  label={
                    isMobile
                      ? undefined
                      : {
                          value: `${insight.metricY ?? ""}${
                            insight.unitY ? ` (${insight.unitY})` : ""
                          }`,
                          angle: -90,
                          position: "insideLeft",
                          style: {
                            fontSize: 11,
                            fill: chartColors.text,
                            textAnchor: "middle",
                          },
                        }
                  }
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      isDark={isDark}
                      formatLabel={(label) => `Date: ${label}`}
                      valueFormatter={(value, name) => {
                        if (
                          name === insight.metricX &&
                          (comparisonType === "boolean_numeric" ||
                            comparisonType === "boolean_boolean")
                        ) {
                          return value >= 0.5 ? "Yes" : "No";
                        }
                        if (
                          name === (insight.metricY ?? "") &&
                          comparisonType === "boolean_boolean"
                        ) {
                          return value >= 0.5 ? "Yes" : "No";
                        }
                        return String(value);
                      }}
                    />
                  }
                />
                {comparisonType === "numeric_numeric" &&
                  comparisonData.threshold && (
                    <ReferenceLine
                      x={comparisonData.threshold}
                      stroke={chartColors.secondary}
                      strokeDasharray="5 5"
                    />
                  )}
                <Scatter
                  name="Data"
                  data={scatterWithJitter}
                  fill={chartColors.primary}
                  fillOpacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Summary Stats */}
        <Stack direction="row" spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              p: isMobile ? 1.25 : 1.5,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Difference
            </Typography>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{ fontWeight: 800 }}
            >
              {comparisonData.percentDiff > 0 ? "+" : ""}
              {comparisonData.percentDiff.toFixed(0)}
              {comparisonData.valueType === "percentage" ? " pts" : "%"}
            </Typography>
          </Paper>
          <Paper
            variant="outlined"
            sx={{
              p: isMobile ? 1.25 : 1.5,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Data points
            </Typography>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{ fontWeight: 800 }}
            >
              {insight.dataPoints} days
            </Typography>
          </Paper>
        </Stack>
      </Stack>
    );
  };

  // Render scatter plot for custom compare
  const renderCompareVisualization = () => {
    if (!compareResult || compareResult.points.length === 0) return null;

    const xType = metricTypes.find((m) => m.metricTypeId === xMetric);
    const yType = metricTypes.find((m) => m.metricTypeId === yMetric);
    const xIsBoolean = xType?.kind === "Boolean";
    const yIsBoolean = yType?.kind === "Boolean";

    const scatterWithJitter = compareResult.points.map((p) => ({
      ...p,
      xJitter: xIsBoolean ? p.x + (Math.random() - 0.5) * 0.3 : p.x,
      yJitter: yIsBoolean ? p.y + (Math.random() - 0.5) * 0.3 : p.y,
    }));

    return (
      <Box>
        <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
          <ScatterChart
            margin={
              isMobile
                ? { top: 15, right: 15, bottom: 40, left: 40 }
                : { top: 20, right: 30, bottom: 50, left: 50 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              type="number"
              dataKey="xJitter"
              name={compareResult.metricX}
              domain={xIsBoolean ? [-0.5, 1.5] : ["auto", "auto"]}
              ticks={xIsBoolean ? [0, 1] : undefined}
              tick={{ fontSize: isMobile ? 10 : 12, fill: chartColors.text }}
              tickFormatter={(v: number) =>
                xIsBoolean ? (v === 0 ? "No" : v === 1 ? "Yes" : "") : String(v)
              }
              label={
                isMobile
                  ? undefined
                  : {
                      value: `${compareResult.metricX}${
                        compareResult.unitX ? ` (${compareResult.unitX})` : ""
                      }`,
                      position: "bottom",
                      offset: 10,
                      style: { fontSize: 11, fill: chartColors.text },
                    }
              }
            />
            <YAxis
              type="number"
              dataKey={yIsBoolean ? "yJitter" : "y"}
              name={compareResult.metricY}
              domain={yIsBoolean ? [-0.5, 1.5] : ["auto", "auto"]}
              ticks={yIsBoolean ? [0, 1] : undefined}
              tick={{ fontSize: isMobile ? 10 : 12, fill: chartColors.text }}
              tickFormatter={(v: number) =>
                yIsBoolean ? (v === 0 ? "No" : v === 1 ? "Yes" : "") : String(v)
              }
              label={
                isMobile
                  ? undefined
                  : {
                      value: `${compareResult.metricY}${
                        compareResult.unitY ? ` (${compareResult.unitY})` : ""
                      }`,
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fontSize: 11,
                        fill: chartColors.text,
                        textAnchor: "middle",
                      },
                    }
              }
            />
            <Tooltip
              content={
                <ChartTooltip
                  isDark={isDark}
                  formatLabel={(label) => `Date: ${label}`}
                  valueFormatter={(value, name) => {
                    if (name === compareResult.metricX && xIsBoolean)
                      return value >= 0.5 ? "Yes" : "No";
                    if (name === compareResult.metricY && yIsBoolean)
                      return value >= 0.5 ? "Yes" : "No";
                    return String(value);
                  }}
                />
              }
            />
            <Scatter
              name="Data"
              data={scatterWithJitter}
              fill={chartColors.primary}
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: isMobile ? 1.25 : 1.5,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Correlation
            </Typography>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{ fontWeight: 800 }}
            >
              {compareResult.correlation !== null
                ? `${(compareResult.correlation * 100).toFixed(0)}%`
                : "N/A"}
            </Typography>
          </Paper>
          <Paper
            variant="outlined"
            sx={{
              p: isMobile ? 1.25 : 1.5,
              borderRadius: 2,
              flex: 1,
              textAlign: "center",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Data points
            </Typography>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{ fontWeight: 800 }}
            >
              {compareResult.points.length} days
            </Typography>
          </Paper>
        </Stack>
      </Box>
    );
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={{ xs: 2, sm: 1 }}
        sx={{ mb: 3 }}
      >
        {/* Title */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate("/dashboard")} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Insights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discover patterns and correlations
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            minHeight: 40,
            "& .MuiTab-root": { minHeight: 40, py: 1 },
          }}
        >
          <Tab
            label={isMobile ? "Analytics" : "Metric Analytics"}
            value="insights"
            icon={<ShowChartIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
          <Tab
            label={isMobile ? "Compare" : "Compare"}
            value="compare"
            icon={<CompareArrowsIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
        </Tabs>
      </Stack>

      {tab === "insights" ? (
        // Metric Analytics Tab - Combined Metric List + Individual Analytics
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ height: { md: "calc(100vh - 250px)" } }}>
          {/* Left: Metric List */}
          <Paper
            variant="outlined"
            sx={{
              width: { xs: "100%", md: 320 },
              p: 2,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              overflowY: "auto",
              maxHeight: { xs: 400, md: "100%" },
              flexShrink: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              Your Metrics ({metricTypes.length})
            </Typography>

            {loading ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : metricTypes.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                <ShowChartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                <Typography variant="body2">
                  No metrics available yet
                </Typography>
                <Typography variant="caption">
                  Create metrics to view analytics
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {metricTypes.map((metric) => (
                  <Paper
                    key={metric.metricTypeId}
                    variant="outlined"
                    onClick={() => setSelectedMetricId(metric.metricTypeId)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      borderColor:
                        selectedMetricId === metric.metricTypeId
                          ? "primary.main"
                          : "divider",
                      borderWidth: selectedMetricId === metric.metricTypeId ? 2 : 1,
                      bgcolor:
                        selectedMetricId === metric.metricTypeId
                          ? "action.selected"
                          : "transparent",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "primary.main",
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        <ShowChartIcon />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {metric.name}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={metric.kind}
                            sx={{ height: 20, fontSize: 10 }}
                          />
                          {metric.unit && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {metric.unit}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Right: Individual Analytics */}
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            {!selectedMetricId ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <ShowChartIcon
                  sx={{ fontSize: 64, opacity: 0.3, mb: 2 }}
                />
                <Typography color="text.secondary">
                  Select a metric to view analytics
                </Typography>
              </Box>
            ) : loadingAnalytics ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : !analyticsData ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography color="text.secondary">
                  No analytics data available for this metric
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Header with weekly/monthly toggle */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontWeight: 800 }}>
                    {analyticsData.metricName}
                  </Typography>
                  <ToggleButtonGroup
                    value={analyticsView}
                    exclusive
                    onChange={(_, value) => value && setAnalyticsView(value)}
                    size="small"
                  >
                    <ToggleButton value="weekly">Weekly</ToggleButton>
                    <ToggleButton value="monthly">Monthly</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                {/* Stats cards */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      flex: 1,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <WhatshotIcon sx={{ fontSize: 20, color: "warning.main" }} />
                      <Typography variant="caption" color="text.secondary">
                        Current Streak
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {analyticsData.currentStreak}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      days
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      flex: 1,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 20, color: "success.main" }} />
                      <Typography variant="caption" color="text.secondary">
                        Max Streak
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {analyticsData.maxStreak}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      days
                    </Typography>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      flex: 1,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <ShowChartIcon sx={{ fontSize: 20, color: "primary.main" }} />
                      <Typography variant="caption" color="text.secondary">
                        Average
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {analyticsData.average.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analyticsData.unit || "value"}
                    </Typography>
                  </Paper>
                </Stack>

                {/* Bar chart */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    mb: 3,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                    {analyticsView === "weekly" ? "Last 7 Days" : "Last 30 Days"}
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={analyticsView === "weekly" ? analyticsData.weeklyData : analyticsData.monthlyData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: chartColors.text, fontSize: 12 }}
                        stroke={chartColors.grid}
                      />
                      <YAxis
                        tick={{ fill: chartColors.text, fontSize: 12 }}
                        stroke={chartColors.grid}
                      />
                      <Tooltip
                        content={(props) => (
                          <ChartTooltip
                            {...props}
                            isDark={isDark}
                            valueFormatter={(value) => `${value} ${analyticsData.unit || ""}`}
                          />
                        )}
                      />
                      {/* Average reference line */}
                      <ReferenceLine
                        y={analyticsData.average}
                        stroke={chartColors.primary}
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{
                          value: `Avg: ${analyticsData.average.toFixed(1)}`,
                          fill: chartColors.primary,
                          fontSize: 12,
                          position: "insideTopRight",
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {(analyticsView === "weekly" ? analyticsData.weeklyData : analyticsData.monthlyData).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isGoalMet ? theme.palette.success.main : chartColors.primary}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>

                {/* Most consistent days */}
                {analyticsData.consistentDays.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                      Most Consistent Days
                    </Typography>
                    <Stack spacing={1}>
                      {analyticsData.consistentDays.slice(0, 3).map((day) => (
                        <Box key={day.dayName}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {day.dayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {day.count} entries ({day.percentage.toFixed(0)}%)
                            </Typography>
                          </Stack>
                          <Box
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${day.percentage}%`,
                                bgcolor: "primary.main",
                                borderRadius: 3,
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Box>
            )}
          </Paper>
        </Stack>
      ) : (
        // Custom Compare Tab
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          }}
        >
          <Typography
            variant={isMobile ? "body1" : "h6"}
            sx={{ fontWeight: 800, mb: 0.5 }}
          >
            Compare Metrics
          </Typography>
          <Typography
            variant={isMobile ? "caption" : "body2"}
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Select two metrics to visualize their relationship
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <TextField
              select
              label="X-Axis (Independent)"
              value={xMetric}
              onChange={(e) => {
                setXMetric(e.target.value);
                setCompareResult(null);
              }}
              fullWidth
              size={isMobile ? "small" : "medium"}
              sx={{ maxWidth: { sm: 280 } }}
            >
              <MenuItem value="" disabled>
                Select a metric
              </MenuItem>
              {metricTypes.map((mt) => (
                <MenuItem
                  key={mt.metricTypeId}
                  value={mt.metricTypeId}
                  disabled={mt.metricTypeId === yMetric}
                >
                  {mt.name} ({mt.kind})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Y-Axis (Dependent)"
              value={yMetric}
              onChange={(e) => {
                setYMetric(e.target.value);
                setCompareResult(null);
              }}
              fullWidth
              size={isMobile ? "small" : "medium"}
              sx={{ maxWidth: { sm: 280 } }}
            >
              <MenuItem value="" disabled>
                Select a metric
              </MenuItem>
              {metricTypes.map((mt) => (
                <MenuItem
                  key={mt.metricTypeId}
                  value={mt.metricTypeId}
                  disabled={mt.metricTypeId === xMetric}
                >
                  {mt.name} ({mt.kind})
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {comparing ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : compareResult ? (
            compareResult.points.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography color="text.secondary">
                  No overlapping data for these metrics
                </Typography>
              </Box>
            ) : (
              renderCompareVisualization()
            )
          ) : xMetric && yMetric ? null : (
            <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
              <CompareArrowsIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
              <Typography>Select two different metrics to compare</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={Boolean(err)}
        autoHideDuration={5000}
        onClose={() => setErr(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErr(null)}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {err}
        </Alert>
      </Snackbar>
    </Box>
  );
}