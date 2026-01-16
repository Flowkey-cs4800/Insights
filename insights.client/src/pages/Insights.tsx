import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Fade,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme as useMuiTheme,
  useMediaQuery,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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

type Selection =
  | { type: "insight"; insight: InsightItem }
  | { type: "metric"; metricTypeId: string }
  | { type: "custom" };

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

const INSIGHTS_PER_PAGE = 5;
const METRICS_PER_PAGE = 5;

export default function Insights() {
  const navigate = useNavigate();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = theme.palette.mode === "dark";

  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: isDark ? theme.palette.grey[500] : theme.palette.grey[400],
    grid: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    text: theme.palette.text.secondary,
  };

  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const [metricsPage, setMetricsPage] = useState(0);
  const [insightsPage, setInsightsPage] = useState(0);

  const [xMetric, setXMetric] = useState<string>("");
  const [yMetric, setYMetric] = useState<string>("");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(
    null
  );
  const [comparing, setComparing] = useState(false);

  const [analyticsData, setAnalyticsData] =
    useState<MetricAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<"weekly" | "monthly">(
    "weekly"
  );

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowSkeleton(true), 200);
    return () => {
      clearTimeout(timer);
      setShowSkeleton(false);
    };
  }, [loading]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [insightsRes, typesRes] = await Promise.all([
        getInsights(),
        getMetricTypes(),
      ]);

      if (insightsRes.success) {
        setInsights(insightsRes.data.insights);
        // Auto-select first insight on desktop
        if (insightsRes.data.insights.length > 0) {
          setSelection({
            type: "insight",
            insight: insightsRes.data.insights[0],
          });
        }
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

  useEffect(() => {
    if (!xMetric || !yMetric || xMetric === yMetric) {
      return;
    }

    let cancelled = false;

    const doCompare = async () => {
      setComparing(true);
      const res = await compareMetrics(xMetric, yMetric);
      if (cancelled) return;

      if (res.success) {
        setCompareResult(res.data);
      } else {
        setErr(res.error);
        setCompareResult(null);
      }
      setComparing(false);
    };

    void doCompare();

    return () => {
      cancelled = true;
    };
  }, [xMetric, yMetric]);

  useEffect(() => {
    if (selection?.type !== "metric") {
      return;
    }

    let cancelled = false;

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      const res = await getMetricAnalytics(selection.metricTypeId);
      if (cancelled) return;

      if (res.success) {
        setAnalyticsData(res.data);
      } else {
        setErr(res.error);
        setAnalyticsData(null);
      }
      setLoadingAnalytics(false);
    };

    void fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [selection]);

  const totalMetricPages = Math.ceil(metricTypes.length / METRICS_PER_PAGE);

  const validMetricsPage =
    totalMetricPages > 0 ? Math.min(metricsPage, totalMetricPages - 1) : 0;

  const paginatedMetrics = useMemo(() => {
    const start = validMetricsPage * METRICS_PER_PAGE;
    return metricTypes.slice(start, start + METRICS_PER_PAGE);
  }, [metricTypes, validMetricsPage]);

  const totalInsightPages = Math.ceil(insights.length / INSIGHTS_PER_PAGE);

  const validInsightsPage =
    totalInsightPages > 0 ? Math.min(insightsPage, totalInsightPages - 1) : 0;

  const paginatedInsights = useMemo(() => {
    const start = validInsightsPage * INSIGHTS_PER_PAGE;
    return insights.slice(start, start + INSIGHTS_PER_PAGE);
  }, [insights, validInsightsPage]);

  const handleSelectInsight = (insight: InsightItem) => {
    setSelection({ type: "insight", insight });
    setAnalyticsData(null); // Clear stale analytics
    if (isMobile) setMobileShowDetail(true);
  };

  const handleSelectMetric = (metricTypeId: string) => {
    setSelection({ type: "metric", metricTypeId });
    setAnalyticsData(null); // Clear stale analytics before new fetch
    if (isMobile) setMobileShowDetail(true);
  };

  const handleSelectCustom = () => {
    setSelection({ type: "custom" });
    setAnalyticsData(null); // Clear stale analytics
    setXMetric("");
    setYMetric("");
    setCompareResult(null);
    if (isMobile) setMobileShowDetail(true);
  };

  const handleMobileBack = () => {
    setMobileShowDetail(false);
  };

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

  const isInsightSelected = (insight: InsightItem) => {
    if (selection?.type !== "insight") return false;
    return (
      selection.insight.metricTypeIdX === insight.metricTypeIdX &&
      selection.insight.metricTypeIdY === insight.metricTypeIdY &&
      selection.insight.insightType === insight.insightType
    );
  };

  const isMetricSelected = (metricTypeId: string) => {
    return (
      selection?.type === "metric" && selection.metricTypeId === metricTypeId
    );
  };

  // Render insight visualization (for correlation insights)
  const renderInsightVisualization = (insight: InsightItem) => {
    if (insight.insightType !== "correlation" || !insight.comparisonData) {
      // Single-metric insight - show simple stat with details
      return (
        <Box sx={{ py: 4 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h2"
              sx={{ fontWeight: 600, color: getInsightColor(insight) }}
            >
              {insight.insightType === "streak" && `${insight.strength} days`}
              {insight.insightType === "consistency" && `${insight.strength}%`}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {insight.summary}
            </Typography>
          </Box>
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
        {/* Summary */}
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {insight.summary}
          </Typography>
        </Box>

        {/* Bar Chart - Comparison */}
        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            {comparisonData.valueType === "percentage"
              ? "Rate Comparison"
              : "Average Comparison"}
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {barData.map((item, idx) => (
              <Box key={idx}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {item.name}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.disabled"
                      sx={{ ml: 1 }}
                    >
                      ({item.count} days)
                    </Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {comparisonData.valueType === "percentage"
                      ? `${item.value.toFixed(0)}%`
                      : `${item.value.toFixed(1)}${
                          comparisonData.unit ? ` ${comparisonData.unit}` : ""
                        }`}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    height: 28,
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${
                        comparisonData.valueType === "percentage"
                          ? item.value
                          : (item.value /
                              Math.max(...barData.map((d) => d.value))) *
                            100
                      }%`,
                      bgcolor:
                        idx === 0 ? chartColors.primary : chartColors.secondary,
                      borderRadius: 1,
                      minWidth: item.value > 0 ? 4 : 0,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        {scatterWithJitter && scatterWithJitter.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 600, mb: 1.5 }}
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
          </>
        )}

        <Divider sx={{ my: 3 }} />

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
              sx={{ fontWeight: 600 }}
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
              sx={{ fontWeight: 600 }}
            >
              {insight.dataPoints} days
            </Typography>
          </Paper>
        </Stack>
      </Stack>
    );
  };

  // Render custom compare visualization
  const renderCustomCompareVisualization = () => {
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
              sx={{ fontWeight: 600 }}
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
              sx={{ fontWeight: 600 }}
            >
              {compareResult.points.length} days
            </Typography>
          </Paper>
        </Stack>
      </Box>
    );
  };

  // Render individual metric analytics
  const renderMetricAnalytics = () => {
    if (loadingAnalytics) {
      return (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
            <Skeleton variant="text" width={150} height={32} />
            <Skeleton variant="rounded" width={120} height={36} />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={100}
                sx={{ flex: 1 }}
              />
            ))}
          </Stack>
          <Skeleton variant="rounded" height={300} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={120} />
        </Box>
      );
    }

    if (!analyticsData) {
      return (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography color="text.secondary">
            No analytics data available
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        {/* Header with weekly/monthly toggle */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Typography
            variant={isMobile ? "body1" : "h6"}
            sx={{ fontWeight: 600 }}
          >
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
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <WhatshotIcon sx={{ fontSize: 20, color: "warning.main" }} />
              <Typography variant="caption" color="text.secondary">
                Current Streak
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
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
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <TrendingUpIcon sx={{ fontSize: 20, color: "success.main" }} />
              <Typography variant="caption" color="text.secondary">
                Max Streak
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
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
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <ShowChartIcon sx={{ fontSize: 20, color: "primary.main" }} />
              <Typography variant="caption" color="text.secondary">
                Average
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
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
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
            {analyticsView === "weekly" ? "Last 7 Days" : "Last 30 Days"}
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={
                analyticsView === "weekly"
                  ? analyticsData.weeklyData
                  : analyticsData.monthlyData
              }
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
                    valueFormatter={(value) =>
                      `${value} ${analyticsData.unit || ""}`
                    }
                  />
                )}
              />
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
                {(analyticsView === "weekly"
                  ? analyticsData.weeklyData
                  : analyticsData.monthlyData
                ).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isGoalMet
                        ? theme.palette.success.main
                        : chartColors.primary
                    }
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
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
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
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
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
    );
  };

  // Render detail panel content based on selection
  const renderDetailContent = () => {
    if (!selection) {
      return (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <ShowChartIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography color="text.secondary">
            Select an item to view details
          </Typography>
        </Box>
      );
    }

    switch (selection.type) {
      case "insight":
        return renderInsightVisualization(selection.insight);

      case "metric":
        return renderMetricAnalytics();

      case "custom":
        return (
          <Box>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{ fontWeight: 600, mb: 0.5 }}
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
                label="X-Axis"
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
                    {mt.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Y-Axis"
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
                    {mt.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {comparing ? (
              <Box>
                <Skeleton variant="rounded" height={350} sx={{ mb: 2 }} />
                <Stack direction="row" spacing={2}>
                  <Skeleton variant="rounded" height={80} sx={{ flex: 1 }} />
                  <Skeleton variant="rounded" height={80} sx={{ flex: 1 }} />
                </Stack>
              </Box>
            ) : compareResult ? (
              compareResult.points.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography color="text.secondary">
                    No overlapping data for these metrics
                  </Typography>
                </Box>
              ) : (
                renderCustomCompareVisualization()
              )
            ) : xMetric && yMetric ? null : (
              <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                <CompareArrowsIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                <Typography>Select two different metrics to compare</Typography>
              </Box>
            )}
          </Box>
        );
    }
  };

  // Left panel content (list view)
  const renderListPanel = () => {
    const canCompare = metricTypes.length >= 2;

    return (
      <Stack spacing={0}>
        {/* Custom Compare */}
        <Paper
          variant="outlined"
          onClick={canCompare ? handleSelectCustom : undefined}
          sx={{
            p: 1.5,
            borderRadius: 2,
            cursor: canCompare ? "pointer" : "default",
            borderColor:
              selection?.type === "custom" ? "primary.main" : "divider",
            borderWidth: selection?.type === "custom" ? 2 : 1,
            bgcolor:
              selection?.type === "custom" ? "action.selected" : "transparent",
            opacity: canCompare ? 1 : 0.5,
            "&:hover": canCompare ? { bgcolor: "action.hover" } : {},
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "secondary.main",
                color: "white",
                flexShrink: 0,
              }}
            >
              <CompareArrowsIcon />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Custom Compare
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {canCompare
                  ? "Compare any two metrics"
                  : "Need 2+ metrics to compare"}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Divider sx={{ my: 2 }} />

        {showSkeleton ? (
          <Stack spacing={1}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </Stack>
        ) : loading ? null : insights.length === 0 ? (
          <Fade in timeout={300}>
            <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
              <Typography variant="body2">No insights yet</Typography>
              <Typography variant="caption">
                Log more data to discover patterns
              </Typography>
            </Box>
          </Fade>
        ) : (
          <>
            <Fade
              in
              timeout={300}
              key={paginatedInsights.map((i) => i.metricTypeIdX).join("-")}
            >
              <Stack spacing={1}>
                {paginatedInsights.map((insight, idx) => (
                  <Paper
                    key={`${insight.metricTypeIdX}-${
                      insight.metricTypeIdY ?? "single"
                    }-${idx}`}
                    variant="outlined"
                    onClick={() => handleSelectInsight(insight)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      borderColor: isInsightSelected(insight)
                        ? "primary.main"
                        : "divider",
                      borderWidth: isInsightSelected(insight) ? 2 : 1,
                      bgcolor: isInsightSelected(insight)
                        ? "action.selected"
                        : "transparent",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: getInsightColor(insight),
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {getInsightIcon(insight)}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {insight.metricY
                            ? `${insight.metricX} ↔ ${insight.metricY}`
                            : insight.metricX}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {insight.insightType} • {insight.dataPoints} days
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Fade>
            {totalInsightPages > 1 && (
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <IconButton
                  size="small"
                  onClick={() => setInsightsPage((p) => Math.max(0, p - 1))}
                  disabled={validInsightsPage === 0}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {validInsightsPage + 1} / {totalInsightPages}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    setInsightsPage((p) =>
                      Math.min(totalInsightPages - 1, p + 1)
                    )
                  }
                  disabled={validInsightsPage >= totalInsightPages - 1}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Individual Metrics */}
        {metricTypes.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
            <Typography variant="body2">No metrics yet</Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={1}>
              {paginatedMetrics.map((metric) => (
                <Paper
                  key={metric.metricTypeId}
                  variant="outlined"
                  onClick={() => handleSelectMetric(metric.metricTypeId)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    borderColor: isMetricSelected(metric.metricTypeId)
                      ? "primary.main"
                      : "divider",
                    borderWidth: isMetricSelected(metric.metricTypeId) ? 2 : 1,
                    bgcolor: isMetricSelected(metric.metricTypeId)
                      ? "action.selected"
                      : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {metric.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={metric.kind}
                      sx={{ height: 20, fontSize: 10 }}
                    />
                    {metric.unit && (
                      <Typography variant="caption" color="text.secondary">
                        {metric.unit}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            {/* Pagination */}
            {totalMetricPages > 1 && (
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={1}
                sx={{ mt: 2 }}
              >
                <IconButton
                  size="small"
                  onClick={() => setMetricsPage((p) => Math.max(0, p - 1))}
                  disabled={validMetricsPage === 0}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {validMetricsPage + 1} / {totalMetricPages}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    setMetricsPage((p) => Math.min(totalMetricPages - 1, p + 1))
                  }
                  disabled={validMetricsPage >= totalMetricPages - 1}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Stack>
            )}
          </>
        )}
      </Stack>
    );
  };

  // Mobile detail view header
  const getMobileDetailTitle = () => {
    if (!selection) return "Details";
    switch (selection.type) {
      case "insight":
        return selection.insight.metricY
          ? `${selection.insight.metricX} ↔ ${selection.insight.metricY}`
          : selection.insight.metricX;
      case "metric": {
        const metric = metricTypes.find(
          (m) => m.metricTypeId === selection.metricTypeId
        );
        return metric?.name ?? "Metric";
      }
      case "custom":
        return "Custom Compare";
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <IconButton
          onClick={() =>
            isMobile && mobileShowDetail
              ? handleMobileBack()
              : navigate("/dashboard")
          }
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isMobile && mobileShowDetail ? getMobileDetailTitle() : "Insights"}
          </Typography>
          {!(isMobile && mobileShowDetail) && (
            <Typography variant="body2" color="text.secondary">
              Discover patterns and correlations
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Content */}
      {isMobile ? (
        // Mobile: show either list or detail
        mobileShowDetail ? (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <Fade
              in
              timeout={200}
              key={
                selection
                  ? `${selection.type}-${
                      selection.type === "insight"
                        ? selection.insight.metricTypeIdX
                        : selection.type === "metric"
                        ? selection.metricTypeId
                        : "custom"
                    }`
                  : "none"
              }
            >
              <Box>{renderDetailContent()}</Box>
            </Fade>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            {renderListPanel()}
          </Paper>
        )
      ) : (
        // Desktop: side-by-side
        <Stack direction="row" spacing={3} sx={{ alignItems: "flex-start" }}>
          {/* Left: List */}
          <Paper
            variant="outlined"
            sx={{
              width: 320,
              p: 2,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              flexShrink: 0,
            }}
          >
            {renderListPanel()}
          </Paper>

          {/* Right: Detail */}
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
              minWidth: 0,
            }}
          >
            <Fade
              in
              timeout={200}
              key={
                selection
                  ? `${selection.type}-${
                      selection.type === "insight"
                        ? selection.insight.metricTypeIdX
                        : selection.type === "metric"
                        ? selection.metricTypeId
                        : "custom"
                    }`
                  : "none"
              }
            >
              <Box>{renderDetailContent()}</Box>
            </Fade>
          </Paper>
        </Stack>
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
