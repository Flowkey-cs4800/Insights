import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryIcon from "@mui/icons-material/History";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";

import {
  getMetricTypes,
  getMetrics,
  logMetric,
  updateMetric,
  deleteMetric,
  createMetricType,
  getInsights,
  type MetricType,
  type Metric,
  type GoalCadence,
  type InsightItem,
} from "../services/metricService";
import InlineStepper from "../components/InlineStepper";
import LogEntryDialog from "../components/LogEntryDialog";

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const cadenceLabel = (c: GoalCadence) => (c === 0 ? "Daily" : "Weekly");

// Helper functions for day bit flags
// Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
const DAY_FLAGS = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 4,
  Thursday: 8,
  Friday: 16,
  Saturday: 32,
  Sunday: 64,
} as const;

const isDaySelected = (goalDays: number, day: keyof typeof DAY_FLAGS) => {
  return (goalDays & DAY_FLAGS[day]) !== 0;
};

const toggleDay = (goalDays: number, day: keyof typeof DAY_FLAGS) => {
  return goalDays ^ DAY_FLAGS[day];
};

type LogDialogState = {
  open: boolean;
  metricType: MetricType | null;
  date: string;
  value: string;
};

type CreateState = {
  open: boolean;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string;
  hasGoal: boolean;
  goalCadence: GoalCadence;
  goalValue: string;
  goalDays: number; // Bit flags for selected days
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [topInsight, setTopInsight] = useState<InsightItem | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(0);
  const [gridPage, setGridPage] = useState(0);

  const METRICS_PER_PAGE = 5;
  const GRIDS_PER_PAGE = 6;

  const [logDialog, setLogDialog] = useState<LogDialogState>({
    open: false,
    metricType: null,
    date: isoDate(new Date()),
    value: "",
  });

  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    name: "",
    kind: "Boolean",
    unit: "",
    hasGoal: false,
    goalCadence: 1,
    goalValue: "5",
    goalDays: 127, // All days selected by default
  });

  const upsertMetricInState = (metric: Metric) => {
    setMetrics((prev) => {
      const next = [...prev];
      const idx = next.findIndex((m) => m.metricId === metric.metricId);

      if (idx >= 0) {
        next[idx] = metric;
        return next;
      }

      const dateKey = metric.date.slice(0, 10);
      const filtered = next.filter(
        (m) =>
          !(
            m.metricTypeId === metric.metricTypeId &&
            m.date.slice(0, 10) === dateKey
          )
      );

      return [metric, ...filtered];
    });
  };

  const removeMetricFromState = (metricId: string) => {
    setMetrics((prev) => prev.filter((m) => m.metricId !== metricId));
  };

  const today = useMemo(() => isoDate(new Date()), []);
  const monthStart = useMemo(() => isoDate(startOfMonth(new Date())), []);
  const monthEnd = useMemo(() => isoDate(endOfMonth(new Date())), []);
  const dim = useMemo(() => daysInMonth(new Date()), []);

  const refresh = async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? false;
    if (showLoading) setInitialLoading(true);

    setErr(null);

    const [typesRes, metricsRes, insightsRes] = await Promise.all([
      getMetricTypes(),
      getMetrics(monthStart, monthEnd),
      getInsights(),
    ]);

    if (!typesRes.success) {
      setErr(typesRes.error);
      if (showLoading) setInitialLoading(false);
      return;
    }
    if (!metricsRes.success) {
      setErr(metricsRes.error);
      if (showLoading) setInitialLoading(false);
      return;
    }

    setMetricTypes(typesRes.data);
    setMetrics(metricsRes.data);

    if (insightsRes.success && insightsRes.data.insights.length > 0) {
      setTopInsight(insightsRes.data.insights[0]);
    } else {
      setTopInsight(null);
    }

    if (showLoading) setInitialLoading(false);
  };

  useEffect(() => {
    void refresh({ showLoading: metricTypes.length === 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const metricByTypeAndDate = useMemo(() => {
    const map = new Map<string, Metric>();
    for (const m of metrics) {
      const d = m.date?.slice(0, 10);
      map.set(`${m.metricTypeId}|${d}`, m);
    }
    return map;
  }, [metrics]);

  const todayChecked = useMemo(() => {
    const checked = new Map<string, boolean>();
    for (const mt of metricTypes) {
      checked.set(
        mt.metricTypeId,
        metricByTypeAndDate.has(`${mt.metricTypeId}|${today}`)
      );
    }
    return checked;
  }, [metricTypes, metricByTypeAndDate, today]);

  const todayPct = useMemo(() => {
    if (!metricTypes.length) return 0;
    let done = 0;
    for (const mt of metricTypes) if (todayChecked.get(mt.metricTypeId)) done++;
    return done / metricTypes.length;
  }, [metricTypes, todayChecked]);

  const totalPages = Math.ceil(metricTypes.length / METRICS_PER_PAGE);
  const paginatedMetrics = useMemo(() => {
    const start = logPage * METRICS_PER_PAGE;
    return metricTypes.slice(start, start + METRICS_PER_PAGE);
  }, [metricTypes, logPage]);

  // Reset page if metrics change and current page is out of bounds
  useEffect(() => {
    if (logPage >= totalPages && totalPages > 0) {
      setLogPage(totalPages - 1);
    }
  }, [logPage, totalPages]);

  const goalCards = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const weekFrom = isoDate(mon);
    const weekTo = isoDate(sun);

    const weeklyValueSum = new Map<string, number>();
    const weeklyDaysDone = new Map<string, Set<string>>();

    for (const mt of metricTypes) {
      weeklyValueSum.set(mt.metricTypeId, 0);
      weeklyDaysDone.set(mt.metricTypeId, new Set());
    }

    for (const m of metrics) {
      const d = m.date?.slice(0, 10);
      if (!d) continue;
      if (d < weekFrom || d > weekTo) continue;

      weeklyValueSum.set(
        m.metricTypeId,
        (weeklyValueSum.get(m.metricTypeId) ?? 0) + (m.value ?? 0)
      );
      weeklyDaysDone.get(m.metricTypeId)?.add(d);
    }

    const withGoals = metricTypes.filter((mt) => (mt.goalValue ?? 0) > 0);

    return withGoals.slice(0, 3).map((mt) => {
      const goal = mt.goalValue ?? 0;
      const cadence = mt.goalCadence;

      let current = 0;
      let meta = "";
      let progress = 0;

      if (cadence === 0) {
        const todayMetric = metricByTypeAndDate.get(
          `${mt.metricTypeId}|${today}`
        );
        if (mt.kind === "Boolean") {
          current = todayMetric ? 1 : 0;
          progress = goal > 0 ? Math.min(1, current / goal) : 0;
          meta = `${current}/${goal} today`;
        } else {
          current = todayMetric?.value ?? 0;
          progress = goal > 0 ? Math.min(1, current / goal) : 0;
          meta = `${current}/${goal} today`;
        }
      } else {
        if (mt.kind === "Boolean") {
          const days = weeklyDaysDone.get(mt.metricTypeId)?.size ?? 0;
          current = days;
          progress = goal > 0 ? Math.min(1, current / goal) : 0;
          meta = `${current}/${goal} days`;
        } else {
          const sum = weeklyValueSum.get(mt.metricTypeId) ?? 0;
          current = sum;
          progress = goal > 0 ? Math.min(1, current / goal) : 0;
          meta = `${current}/${goal} ${mt.unit ?? ""}`.trim();
        }
      }

      return {
        id: mt.metricTypeId,
        label: mt.name,
        cadenceLabel: cadenceLabel(cadence),
        progress,
        meta,
      };
    });
  }, [metricTypes, metrics, metricByTypeAndDate, today]);

  const monthlyGrids = useMemo(() => {
    return metricTypes.map((mt) => {
      const days = Array.from({ length: dim }, () => 0);
      for (let i = 1; i <= dim; i++) {
        const d = `${monthStart.slice(0, 8)}${String(i).padStart(2, "0")}`;
        if (metricByTypeAndDate.has(`${mt.metricTypeId}|${d}`)) days[i - 1] = 1;
      }
      return { metricType: mt, days };
    });
  }, [metricTypes, dim, monthStart, metricByTypeAndDate]);

  const totalGridPages = Math.ceil(monthlyGrids.length / GRIDS_PER_PAGE);
  const paginatedGrids = useMemo(() => {
    const start = gridPage * GRIDS_PER_PAGE;
    return monthlyGrids.slice(start, start + GRIDS_PER_PAGE);
  }, [monthlyGrids, gridPage]);

  // Reset grid page if out of bounds
  useEffect(() => {
    if (gridPage >= totalGridPages && totalGridPages > 0) {
      setGridPage(totalGridPages - 1);
    }
  }, [gridPage, totalGridPages]);

  const toggleBooleanToday = async (mt: MetricType) => {
    const key = `${mt.metricTypeId}|${today}`;
    setMutatingKey(key);
    setErr(null);

    const existing = metricByTypeAndDate.get(key);

    if (existing) {
      removeMetricFromState(existing.metricId);

      const del = await deleteMetric(existing.metricId);
      if (!del.success) {
        upsertMetricInState(existing);
        setErr(del.error);
      }
      setMutatingKey(null);
      return;
    }

    const created = await logMetric(mt.metricTypeId, today, 1);
    if (!created.success) {
      setErr(created.error);
      setMutatingKey(null);
      return;
    }

    upsertMetricInState(created.data);
    setMutatingKey(null);
  };

  const handleValueChange = async (mt: MetricType, nextValue: number) => {
    const key = `${mt.metricTypeId}|${today}`;
    setErr(null);

    const existing = metricByTypeAndDate.get(key);

    // Optimistic update
    if (existing) {
      upsertMetricInState({ ...existing, value: nextValue });
    } else if (nextValue > 0) {
      upsertMetricInState({
        metricId: `temp-${mt.metricTypeId}`,
        metricTypeId: mt.metricTypeId,
        metricTypeName: mt.name,
        date: today,
        value: nextValue,
      });
    }

    // Server update
    if (existing) {
      const res = await updateMetric(existing.metricId, nextValue);
      if (!res.success) {
        upsertMetricInState(existing); // rollback
        setErr(res.error);
      } else {
        upsertMetricInState(res.data);
      }
    } else if (nextValue > 0) {
      const res = await logMetric(mt.metricTypeId, today, nextValue);
      if (!res.success) {
        removeMetricFromState(`temp-${mt.metricTypeId}`);
        setErr(res.error);
      } else {
        upsertMetricInState(res.data);
      }
    }
  };

  const openLogDialog = (mt?: MetricType) => {
    setLogDialog({
      open: true,
      metricType: mt ?? null,
      date: today,
      value: "",
    });
  };

  const closeLogDialog = () => {
    setLogDialog({ open: false, metricType: null, date: today, value: "" });
  };

  const submitLog = async () => {
    const mt = logDialog.metricType;
    if (!mt) return;

    let v: number;
    if (mt.kind === "Boolean") {
      v = 1;
    } else {
      v = Number(logDialog.value);
      if (!Number.isFinite(v)) return setErr("Please enter a valid number.");
    }

    const key = `${mt.metricTypeId}|${logDialog.date}`;
    setMutatingKey(key);
    setErr(null);

    const res = await logMetric(mt.metricTypeId, logDialog.date, v);
    if (!res.success) {
      setErr(res.error);
      setMutatingKey(null);
      return;
    }

    upsertMetricInState(res.data);
    closeLogDialog();
    setMutatingKey(null);
  };

  const openCreate = () =>
    setCreateState({
      open: true,
      name: "",
      kind: "Boolean",
      unit: "",
      hasGoal: false,
      goalCadence: 1,
      goalValue: "5",
      goalDays: 127,
    });

  const closeCreate = () =>
    setCreateState({
      open: false,
      name: "",
      kind: "Boolean",
      unit: "",
      hasGoal: false,
      goalCadence: 1,
      goalValue: "5",
      goalDays: 127, // Reset to all days
    });

  const submitCreate = async () => {
    setErr(null);

    const name = createState.name.trim();
    if (!name) return setErr("Please enter a metric name.");

    const unit = createState.unit.trim() || undefined;

    let gv = 0;
    if (createState.hasGoal) {
      const goalValueNum = Number(createState.goalValue);
      if (!Number.isFinite(goalValueNum) || goalValueNum < 0) {
        return setErr("Goal must be a valid non-negative number.");
      }

      gv = Math.floor(goalValueNum);
      if (createState.kind === "Boolean" && createState.goalCadence === 0)
        gv = Math.min(1, gv);
      if (createState.kind === "Boolean" && createState.goalCadence === 1)
        gv = Math.min(7, gv);
    }

    // Validate goal days for daily cadence
    let goalDays = createState.goalDays;
    if (createState.hasGoal && createState.goalCadence === 0) {
      if (goalDays <= 0) {
        return setErr("Please select at least one day for your daily goal.");
      }
    }

    const res = await createMetricType(
      name,
      createState.kind,
      unit,
      createState.goalCadence,
      gv,
      goalDays
    );

    if (!res.success) return setErr(res.error);

    setMetricTypes((prev) =>
      [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name))
    );
    closeCreate();
  };

  const ProgressGrid = ({ mt, days }: { mt: MetricType; days: number[] }) => (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 3, height: "100%", overflow: "hidden" }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5 }} noWrap>
        {mt.name}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {days.map((v, idx) => (
          <Box
            key={idx}
            sx={{
              aspectRatio: "1",
              borderRadius: 1,
              bgcolor: v ? "primary.main" : "action.disabledBackground",
            }}
          />
        ))}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        {days.filter(Boolean).length} active days
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ width: "100%" }}>
      {initialLoading ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">Loading dashboard…</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Top Insight Card */}
          {topInsight && (
            <Grid size={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(135deg, rgba(25,118,210,0.08) 0%, rgba(25,118,210,0.02) 100%)"
                      : "linear-gradient(135deg, rgba(25,118,210,0.06) 0%, rgba(25,118,210,0.01) 100%)",
                }}
              >
                <Stack
                  direction="row"
                  spacing={{ xs: 2, sm: 3 }}
                  alignItems="flex-start"
                >
                  {/* Icon - hidden on mobile */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: { xs: "none", sm: "grid" },
                      placeItems: "center",
                      bgcolor:
                        topInsight.insightType === "correlation"
                          ? "primary.main"
                          : topInsight.insightType === "streak"
                          ? "warning.main"
                          : topInsight.insightType === "consistency"
                          ? "success.main"
                          : "info.main",
                      color: "white",
                    }}
                  >
                    {topInsight.insightType === "streak" ? (
                      <WhatshotIcon />
                    ) : topInsight.insightType === "consistency" ? (
                      <CheckCircleIcon />
                    ) : topInsight.insightType === "correlation" ? (
                      <ShowChartIcon />
                    ) : (
                      <TrendingUpIcon />
                    )}
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {topInsight.insightType === "correlation"
                        ? "Correlation"
                        : topInsight.insightType === "streak"
                        ? "Streak"
                        : topInsight.insightType === "consistency"
                        ? "Consistency"
                        : "Average"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: { xs: 600, sm: 700 },
                        lineHeight: 1.4,
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                      }}
                    >
                      {topInsight.summary}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
                    >
                      {topInsight.insightType === "correlation" &&
                      topInsight.metricY ? (
                        <>
                          <Chip
                            size="small"
                            label={`${topInsight.metricX} ↔ ${topInsight.metricY}`}
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {topInsight.comparisonData?.percentDiff !==
                            undefined
                              ? `${
                                  topInsight.comparisonData.percentDiff > 0
                                    ? "+"
                                    : ""
                                }${topInsight.comparisonData.percentDiff.toFixed(
                                  0
                                )}%`
                              : ""}{" "}
                            • {topInsight.dataPoints} days
                          </Typography>
                        </>
                      ) : (
                        <Chip
                          size="small"
                          label={topInsight.metricX}
                          variant="outlined"
                          sx={{ height: 22, fontSize: 11 }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      onClick={() => navigate("/insights")}
                      sx={{
                        mt: 1.5,
                        cursor: "pointer",
                        color: "primary.main",
                        fontWeight: 600,
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      View all insights →
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Empty state for insights */}
          {!topInsight && metricTypes.length >= 1 && (
            <Grid size={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                  textAlign: "center",
                }}
              >
                <ShowChartIcon
                  sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Not enough data for insights yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Log a few more days to discover patterns and correlations.
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* Log Today */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3, height: "100%" }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Log today
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check off habits and record values
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    size="small"
                    icon={<CalendarMonthIcon />}
                    label={new Date().toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    variant="outlined"
                    sx={{ px: 1 }}
                  />
                  <Tooltip title="Add metric">
                    <IconButton
                      size="small"
                      onClick={openCreate}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                {paginatedMetrics.map((mt) => {
                  const isBoolean = mt.kind === "Boolean";
                  const checked = todayChecked.get(mt.metricTypeId) ?? false;
                  const key = `${mt.metricTypeId}|${today}`;
                  const busy = mutatingKey === key;
                  const todayEntry = metricByTypeAndDate.get(key);
                  const todayValue = todayEntry?.value ?? 0;

                  return (
                    <Paper
                      key={mt.metricTypeId}
                      variant="outlined"
                      sx={{ p: 1.25, borderRadius: 2 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 800 }}
                            noWrap
                          >
                            {mt.name}
                          </Typography>
                          {(isBoolean || mt.unit) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {isBoolean ? "log" : mt.unit}
                            </Typography>
                          )}
                        </Box>
                        {isBoolean ? (
                          <Button
                            variant="outlined"
                            color={checked ? "primary" : "inherit"}
                            onClick={() => void toggleBooleanToday(mt)}
                            disabled={busy}
                            sx={{
                              minWidth: 148,
                              height: 40,
                              textTransform: "none",
                              fontWeight: 700,
                              borderRadius: 2,
                            }}
                          >
                            {checked ? <CheckIcon /> : "Log"}
                          </Button>
                        ) : (
                          <InlineStepper
                            value={todayValue}
                            onChange={(v) => void handleValueChange(mt, v)}
                            size="compact"
                          />
                        )}
                      </Stack>
                    </Paper>
                  );
                })}

                {/* Empty state */}
                {metricTypes.length === 0 && (
                  <Paper
                    variant="outlined"
                    onClick={openCreate}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderStyle: "dashed",
                      borderWidth: 2,
                      borderColor: "primary.light",
                      cursor: "pointer",
                      textAlign: "center",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <AddIcon sx={{ color: "primary.light", mb: 0.5 }} />
                    <Typography variant="body2" color="primary.light">
                      Add your first metric
                    </Typography>
                  </Paper>
                )}
              </Stack>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <Stack
                  direction="row"
                  justifyContent="center"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setLogPage((p) => p - 1)}
                    disabled={logPage === 0}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary">
                    {logPage + 1} / {totalPages}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setLogPage((p) => p + 1)}
                    disabled={logPage >= totalPages - 1}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Stack>
              )}

              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                onClick={() => openLogDialog()}
                sx={{
                  mt: 2,
                  cursor: "pointer",
                  color: "text.secondary",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <HistoryIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Log a past day
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* Goals + Today Completion */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3, height: "100%" }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                Goals
              </Typography>

              {/* Today completion merged in */}
              <Box sx={{ mb: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Today's progress
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {Math.round(todayPct * 100)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(todayPct * 100)}
                  sx={{ height: 8, borderRadius: 99 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  Completed {Math.round(todayPct * metricTypes.length)} of{" "}
                  {metricTypes.length}
                </Typography>
              </Box>

              {goalCards.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Set goal values on your metrics to track progress here.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {goalCards.map((g) => (
                    <Box key={g.id}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {g.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {g.meta} • {g.cadenceLabel}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={g.progress * 100}
                        sx={{ height: 6, borderRadius: 99 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>

          {/* Activity this month */}
          <Grid size={12}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Activity this month
                </Typography>
                {totalGridPages > 1 && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => setGridPage((p) => p - 1)}
                      disabled={gridPage === 0}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      {gridPage + 1} / {totalGridPages}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setGridPage((p) => p + 1)}
                      disabled={gridPage >= totalGridPages - 1}
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
              {monthlyGrids.length === 0 ? (
                <Typography color="text.secondary">No metrics yet.</Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(3, 1fr)",
                      md: "repeat(6, 1fr)",
                    },
                    gap: 2,
                  }}
                >
                  {paginatedGrids.map(({ metricType: mt, days }) => (
                    <ProgressGrid key={mt.metricTypeId} mt={mt} days={days} />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Log Dialog */}
      <LogEntryDialog
        open={logDialog.open}
        onClose={closeLogDialog}
        onSubmit={() => void submitLog()}
        metricTypes={metricTypes}
        selectedMetricType={logDialog.metricType}
        onMetricTypeChange={(mt) =>
          setLogDialog((s) => ({
            ...s,
            metricType: mt,
            value: mt?.kind === "Boolean" ? "1" : "",
          }))
        }
        date={logDialog.date}
        onDateChange={(date) => setLogDialog((s) => ({ ...s, date }))}
        value={logDialog.value}
        onValueChange={(value) => setLogDialog((s) => ({ ...s, value }))}
      />

      {/* Create Metric Dialog */}
      <Dialog
        open={createState.open}
        onClose={closeCreate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New metric</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={createState.name}
              onChange={(e) =>
                setCreateState((s) => ({ ...s, name: e.target.value }))
              }
              fullWidth
              autoFocus
              placeholder="e.g., Sleep, Coffee, Mood"
            />

            <TextField
              label="Kind"
              select
              value={createState.kind}
              onChange={(e) =>
                setCreateState((s) => ({
                  ...s,
                  kind: e.target.value as CreateState["kind"],
                  unit: e.target.value === "Boolean" ? "" : s.unit,
                }))
              }
              fullWidth
            >
              <MenuItem value="Boolean">Boolean (yes / no)</MenuItem>
              <MenuItem value="Number">Number (count / score)</MenuItem>
              <MenuItem value="Duration">Duration (minutes)</MenuItem>
            </TextField>

            {createState.kind !== "Boolean" && (
              <TextField
                label="Unit (optional)"
                value={createState.unit}
                onChange={(e) =>
                  setCreateState((s) => ({ ...s, unit: e.target.value }))
                }
                fullWidth
                placeholder="e.g., cups, pages, hours"
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={createState.hasGoal}
                  onChange={(e) =>
                    setCreateState((s) => ({ ...s, hasGoal: e.target.checked }))
                  }
                />
              }
              label="Set a goal"
            />

            {createState.hasGoal && (
              <>
                <TextField
                  label="Goal cadence"
                  select
                  value={createState.goalCadence}
                  onChange={(e) =>
                    setCreateState((s) => ({
                      ...s,
                      goalCadence: Number(e.target.value) as GoalCadence,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value={0}>Daily</MenuItem>
                  <MenuItem value={1}>Weekly</MenuItem>
                </TextField>

                <TextField
                  label={
                    createState.kind === "Boolean" &&
                    createState.goalCadence === 1
                      ? "Goal (days per week)"
                      : createState.goalCadence === 0
                      ? "Goal (per day)"
                      : "Goal (per week)"
                  }
                  value={createState.goalValue}
                  onChange={(e) =>
                    setCreateState((s) => ({ ...s, goalValue: e.target.value }))
                  }
                  fullWidth
                  inputMode="numeric"
                />

                {/* Day selection for daily goals */}
                {createState.goalCadence === 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      Active on these days:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(Object.keys(DAY_FLAGS) as Array<keyof typeof DAY_FLAGS>).map((day) => (
                        <FormControlLabel
                          key={day}
                          control={
                            <Checkbox
                              checked={isDaySelected(createState.goalDays, day)}
                              onChange={() =>
                                setCreateState((s) => ({
                                  ...s,
                                  goalDays: toggleDay(s.goalDays, day),
                                }))
                              }
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {day.slice(0, 3)}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Button
            size="small"
            onClick={() => {
              closeCreate();
              navigate("/metrics");
            }}
            sx={{ textTransform: "none" }}
          >
            Manage metrics →
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={closeCreate} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitCreate()}
              variant="contained"
              sx={{ textTransform: "none" }}
            >
              Create
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

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