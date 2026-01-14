import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { useNavigate } from "react-router-dom";

import {
  getMetricTypes,
  getMetrics,
  logMetric,
  deleteMetric,
  type MetricType,
  type Metric,
  type GoalCadence,
} from "../services/metricService";

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

type LogDialogState = {
  open: boolean;
  metricType: MetricType | null;
  date: string;
  value: string;
};

export default function Home() {
  const navigate = useNavigate();

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [logDialog, setLogDialog] = useState<LogDialogState>({
    open: false,
    metricType: null,
    date: isoDate(new Date()),
    value: "",
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

    const [typesRes, metricsRes] = await Promise.all([
      getMetricTypes(),
      getMetrics(monthStart, monthEnd),
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

    if (showLoading) setInitialLoading(false);
  };

  useEffect(() => {
    void refresh({ showLoading: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // NEW: goals-based progress (daily or weekly) based on each metric type’s goal fields
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

    // Precompute: weekly sums and weekly boolean days
    const weeklyValueSum = new Map<string, number>(); // metricTypeId -> sum(value)
    const weeklyDaysDone = new Map<string, Set<string>>(); // metricTypeId -> set of dates

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

    // Build cards for metric types that actually have a goalValue > 0
    const withGoals = metricTypes.filter((mt) => (mt.goalValue ?? 0) > 0);

    // Prefer showing up to 3 cards (same UX as before)
    return withGoals.slice(0, 3).map((mt) => {
      const goal = mt.goalValue ?? 0;
      const cadence = mt.goalCadence;

      let current = 0;
      let meta = "";
      let progress = 0;

      if (cadence === 0) {
        // Daily cadence uses today only
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
        // Weekly cadence uses Mon–Sun
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

  const openLogDialog = (mt: MetricType) => {
    setLogDialog({ open: true, metricType: mt, date: today, value: "" });
  };

  const closeLogDialog = () => {
    setLogDialog({ open: false, metricType: null, date: today, value: "" });
  };

  const submitLog = async () => {
    const mt = logDialog.metricType;
    if (!mt) return;

    const v = Number(logDialog.value);
    if (!Number.isFinite(v)) return setErr("Please enter a valid number.");

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

  const ProgressGrid = ({ mt, days }: { mt: MetricType; days: number[] }) => (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 3, height: "100%", overflow: "hidden" }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {mt.name}
        </Typography>
        <Chip
          size="small"
          label="Monthly"
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />
      </Stack>

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
      {err && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            borderColor: "error.light",
            bgcolor: "background.paper",
          }}
        >
          <Typography color="error" sx={{ fontWeight: 700 }}>
            {err}
          </Typography>
        </Paper>
      )}

      <Grid container sx={{ mb: 3 }}>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                }}
              >
                <TrendingUpIcon fontSize="small" />
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Today completion
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(todayPct * 100)}
                  sx={{ mt: 0.5, height: 6, borderRadius: 99 }}
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

              <Typography
                variant="h6"
                sx={{ fontWeight: 800, minWidth: 50, textAlign: "right" }}
              >
                {Math.round(todayPct * 100)}%
              </Typography>

              <Button
                variant="contained"
                size="small"
                startIcon={<PlaylistAddIcon />}
                sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                onClick={() => navigate("/metrics")}
              >
                New metric
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {initialLoading ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">Loading dashboard…</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Today
                </Typography>
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
              </Stack>

              {metricTypes.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    No metrics yet
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                    onClick={() => navigate("/metrics")}
                  >
                    Create your first metric
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: 420, overflow: "auto" }}>
                  {metricTypes.map((mt) => {
                    const isBoolean = mt.kind === "Boolean";
                    const checked = todayChecked.get(mt.metricTypeId) ?? false;
                    const key = `${mt.metricTypeId}|${today}`;
                    const busy = mutatingKey === key;

                    return (
                      <Paper
                        key={mt.metricTypeId}
                        variant="outlined"
                        sx={{ p: 1.25, borderRadius: 2 }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Checkbox
                            checked={checked}
                            disabled={!isBoolean || busy}
                            onChange={() => {
                              if (isBoolean) void toggleBooleanToday(mt);
                            }}
                          />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800 }}
                            >
                              {mt.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {mt.kind}
                              {mt.unit ? ` • ${mt.unit}` : ""}
                            </Typography>
                          </Box>
                          {!isBoolean && (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: "none", borderRadius: 2 }}
                              onClick={() => openLogDialog(mt)}
                              disabled={busy}
                            >
                              Log
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3, height: "100%" }}
            >
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                Goals
              </Typography>

              {goalCards.length === 0 ? (
                <Typography color="text.secondary">
                  Set goal values on your metric types to see progress here.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {goalCards.map((g) => (
                    <Box key={g.id}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 0.75 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {g.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(g.progress * 100)}% • {g.meta} •{" "}
                          {g.cadenceLabel}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={g.progress * 100}
                        sx={{ height: 10, borderRadius: 99 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 2 }}
              >
                Tip: Boolean goals are most intuitive as “days per week” (e.g.,
                5).
              </Typography>
            </Paper>
          </Grid>

          <Grid size={12}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                Monthly progress
              </Typography>
              <Grid container spacing={2}>
                {monthlyGrids.length === 0 ? (
                  <Grid size={12}>
                    <Typography color="text.secondary">
                      No metrics yet.
                    </Typography>
                  </Grid>
                ) : (
                  monthlyGrids.map(({ metricType: mt, days }) => (
                    <Grid key={mt.metricTypeId} size={{ xs: 12, sm: 6, md: 3 }}>
                      <ProgressGrid mt={mt} days={days} />
                    </Grid>
                  ))
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Dialog
        open={logDialog.open}
        onClose={closeLogDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Log metric</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {logDialog.metricType?.name} • {logDialog.metricType?.kind}
              {logDialog.metricType?.unit
                ? ` • ${logDialog.metricType.unit}`
                : ""}
            </Typography>

            <TextField
              label="Date (YYYY-MM-DD)"
              value={logDialog.date}
              onChange={(e) =>
                setLogDialog((s) => ({ ...s, date: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label={
                logDialog.metricType?.kind === "Duration"
                  ? "Duration (minutes)"
                  : "Value"
              }
              value={logDialog.value}
              onChange={(e) =>
                setLogDialog((s) => ({ ...s, value: e.target.value }))
              }
              fullWidth
              inputMode="decimal"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLogDialog} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={submitLog}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
