import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TodayIcon from "@mui/icons-material/Today";
import { useNavigate } from "react-router-dom";

import InlineStepper from "../components/InlineStepper";

import {
  getMetricTypes,
  getMetrics,
  logMetric,
  deleteMetric,
  updateMetric,
  type MetricType,
  type Metric,
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

export default function Home() {
  const navigate = useNavigate();

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  // Only show loading on first mount
  const [initialLoading, setInitialLoading] = useState(true);

  // Per-row busy flags so UI doesn’t “reload”
  const [busyByKey, setBusyByKey] = useState<Record<string, boolean>>({});

  const [err, setErr] = useState<string | null>(null);

  const today = useMemo(() => isoDate(new Date()), []);
  const monthStart = useMemo(() => isoDate(startOfMonth(new Date())), []);
  const monthEnd = useMemo(() => isoDate(endOfMonth(new Date())), []);
  const dim = useMemo(() => daysInMonth(new Date()), []);

  const setBusy = (key: string, v: boolean) =>
    setBusyByKey((prev) => ({ ...prev, [key]: v }));

  // Upsert by (metricTypeId + date) (not by metricId) so local UI stays consistent
  const upsertMetric = (next: Metric) => {
    const nextDate = next.date?.slice(0, 10);
    setMetrics((prev) => {
      const idx = prev.findIndex(
        (m) => m.metricTypeId === next.metricTypeId && m.date?.slice(0, 10) === nextDate
      );
      if (idx === -1) return [next, ...prev];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  };

  const removeMetricById = (metricId: string) => {
    setMetrics((prev) => prev.filter((m) => m.metricId !== metricId));
  };

  const removeMetricByTypeAndDate = (metricTypeId: string, dateYYYYMMDD: string) => {
    setMetrics((prev) =>
      prev.filter(
        (m) => !(m.metricTypeId === metricTypeId && m.date?.slice(0, 10) === dateYYYYMMDD)
      )
    );
  };

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
      checked.set(mt.metricTypeId, metricByTypeAndDate.has(`${mt.metricTypeId}|${today}`));
    }
    return checked;
  }, [metricTypes, metricByTypeAndDate, today]);

  const todayPct = useMemo(() => {
    if (!metricTypes.length) return 0;
    let done = 0;
    for (const mt of metricTypes) if (todayChecked.get(mt.metricTypeId)) done++;
    return done / metricTypes.length;
  }, [metricTypes, todayChecked]);

  const weeklyGoals = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const from = isoDate(mon);
    const to = isoDate(sun);

    const counts = new Map<string, Set<string>>();
    for (const mt of metricTypes) counts.set(mt.metricTypeId, new Set());

    for (const m of metrics) {
      const d = m.date?.slice(0, 10);
      if (!d) continue;
      if (d < from || d > to) continue;
      counts.get(m.metricTypeId)?.add(d);
    }

    return metricTypes.slice(0, 3).map((mt) => {
      const activeDays = counts.get(mt.metricTypeId)?.size ?? 0;
      const goalDays = 5;
      return {
        id: mt.metricTypeId,
        label: mt.name,
        progress: Math.min(1, activeDays / goalDays),
        meta: `${activeDays}/${goalDays} days`,
      };
    });
  }, [metricTypes, metrics]);

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

  // --- Smooth mutations (no refresh) ---

  const toggleBooleanToday = async (mt: MetricType) => {
    const key = `${mt.metricTypeId}|${today}`;
    if (busyByKey[key]) return;

    setErr(null);
    setBusy(key, true);

    const existing = metricByTypeAndDate.get(key);

    try {
      if (existing) {
        // optimistic remove
        removeMetricById(existing.metricId);

        const del = await deleteMetric(existing.metricId);
        if (!del.success) {
          // rollback
          upsertMetric(existing);
          setErr(del.error);
        }
        return;
      }

      const created = await logMetric(mt.metricTypeId, today, 1);
      if (!created.success) {
        setErr(created.error);
        return;
      }

      upsertMetric(created.data);
    } finally {
      setBusy(key, false);
    }
  };

  // Number/Duration: absolute set (InlineStepper calls this)
  const setTodayValueAbsolute = async (mt: MetricType, nextValueRaw: number) => {
    const key = `${mt.metricTypeId}|${today}`;
    if (busyByKey[key]) return;

    setErr(null);
    setBusy(key, true);

    const existing = metricByTypeAndDate.get(key);
    const nextValue = Math.max(0, Math.floor(nextValueRaw));

    try {
      // optimistic UI
      if (existing) {
        upsertMetric({ ...existing, value: nextValue });
      } else {
        if (nextValue === 0) return; // don’t create empty “0” rows
        upsertMetric({
          metricId: "optimistic-" + mt.metricTypeId,
          metricTypeId: mt.metricTypeId,
          metricTypeName: mt.name,
          date: today,
          value: nextValue,
        });
      }

      // persist
      if (existing && !existing.metricId.startsWith("optimistic-")) {
        const upd = await updateMetric(existing.metricId, nextValue);
        if (!upd.success) {
          upsertMetric(existing); // rollback
          setErr(upd.error);
          return;
        }
        upsertMetric(upd.data);
      } else {
        // If we created optimistic stub, replace with actual POST
        const created = await logMetric(mt.metricTypeId, today, nextValue);
        if (!created.success) {
          removeMetricByTypeAndDate(mt.metricTypeId, today);
          setErr(created.error);
          return;
        }
        upsertMetric(created.data);
      }
    } finally {
      setBusy(key, false);
    }
  };

  const ProgressGrid = ({ mt, days }: { mt: MetricType; days: number[] }) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {mt.name}
        </Typography>
        <Chip size="small" label="Monthly" variant="outlined" />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(14, 10px)",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {days.map((v, idx) => (
          <Box
            key={idx}
            sx={{
              width: 10,
              height: 10,
              borderRadius: 1,
              bgcolor: v ? "primary.main" : "action.disabledBackground",
            }}
          />
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                }}
              >
                <TodayIcon />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}>
                  Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track, log, and build consistency with minimal friction.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800 }}
                onClick={() => navigate("/metrics")}
              >
                New metric
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "action.hover",
                  }}
                >
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Today completion
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    {Math.round(todayPct * 100)}%
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ minWidth: 180 }}>
                <Typography variant="caption" color="text.secondary">
                  Completed {Math.round(todayPct * (metricTypes.length || 0))} of {metricTypes.length}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(todayPct * 100)}
                  sx={{ mt: 1, height: 10, borderRadius: 99 }}
                />
              </Box>
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
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Today
                </Typography>
                <Chip
                  size="small"
                  icon={<CalendarMonthIcon />}
                  label={today}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              {metricTypes.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 800 }}>No metrics yet</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                    Create a metric type first (e.g., Sleep, Study, Mood, Gym).
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                    onClick={() => navigate("/metrics")}
                  >
                    Go to Metrics
                  </Button>
                </Paper>
              ) : (
                <Stack spacing={1} sx={{ maxHeight: 420, overflow: "auto", pr: 1 }}>
                  {metricTypes.slice(0, 10).map((mt) => {
                    const key = `${mt.metricTypeId}|${today}`;
                    const busy = Boolean(busyByKey[key]);

                    const isBoolean = mt.kind === "Boolean";
                    const checked = todayChecked.get(mt.metricTypeId) ?? false;

                    const existing = metricByTypeAndDate.get(key);
                    const value = existing?.value ?? 0;

                    return (
                      <Paper key={mt.metricTypeId} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Checkbox
                            checked={checked}
                            disabled={!isBoolean || busy}
                            onChange={() => {
                              if (isBoolean) void toggleBooleanToday(mt);
                            }}
                          />

                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {mt.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {mt.kind}
                              {mt.unit ? ` • ${mt.unit}` : ""}
                              {!isBoolean ? " • adjust today" : ""}
                            </Typography>
                          </Box>

                          {!isBoolean && (
                            <InlineStepper
                              value={value}
                              unit={mt.unit}
                              min={0}
                              size="compact"
                              disabled={busy}
                              onChange={async (next) => {
                                await setTodayValueAbsolute(mt, next);
                              }}
                            />
                          )}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                  startIcon={<AddIcon />}
                  onClick={() => navigate("/metrics")}
                >
                  Add metric
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Weekly goals
                </Typography>
                <IconButton size="small" onClick={() => navigate("/metrics")} aria-label="manage metrics">
                  <AddIcon />
                </IconButton>
              </Stack>

              {weeklyGoals.length === 0 ? (
                <Typography color="text.secondary">Create metrics to see weekly progress.</Typography>
              ) : (
                <Stack spacing={2}>
                  {weeklyGoals.map((g) => (
                    <Box key={g.id}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {g.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(g.progress * 100)}% • {g.meta}
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

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                v1: progress = active days this week (default goal 5 days).
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Monthly progress
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                  onClick={() => navigate("/metrics")}
                >
                  Manage metrics
                </Button>
              </Stack>

              <Grid container spacing={2}>
                {monthlyGrids.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography color="text.secondary">No metrics yet.</Typography>
                  </Grid>
                ) : (
                  monthlyGrids.map(({ metricType: mt, days }) => (
                    <Grid key={mt.metricTypeId} item xs={12} sm={6} md={3}>
                      <ProgressGrid mt={mt} days={days} />
                    </Grid>
                  ))
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}