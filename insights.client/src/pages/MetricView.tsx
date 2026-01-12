import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TodayIcon from "@mui/icons-material/Today";
import { useNavigate } from "react-router-dom";

import InlineStepper from "../components/InlineStepper";

import {
  createMetricType,
  deleteMetricType,
  getMetricTypes,
  getMetrics,
  logMetric,
  updateMetric,
  deleteMetric,
  type MetricType,
  type Metric,
} from "../services/metricService";

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CreateState = {
  open: boolean;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string;
};

export default function MetricView() {
  const navigate = useNavigate();
  const today = useMemo(() => isoDate(new Date()), []);

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [todayMetrics, setTodayMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Row-local busy flags so only the touched row disables
  const [busyByKey, setBusyByKey] = useState<Record<string, boolean>>({});

  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    name: "",
    kind: "Boolean",
    unit: "",
  });

  const keyFor = (metricTypeId: string) => `${metricTypeId}|${today}`;
  const setBusy = (k: string, v: boolean) =>
    setBusyByKey((prev) => ({ ...prev, [k]: v }));

  const todayByTypeId = useMemo(() => {
    const map = new Map<string, Metric>();
    for (const m of todayMetrics) map.set(m.metricTypeId, m);
    return map;
  }, [todayMetrics]);

  const initialLoad = async () => {
    setLoading(true);
    setErr(null);

    const [typesRes, metricsRes] = await Promise.all([
      getMetricTypes(),
      getMetrics(today, today),
    ]);

    if (!typesRes.success) {
      setErr(typesRes.error);
      setLoading(false);
      return;
    }
    if (!metricsRes.success) {
      setErr(metricsRes.error);
      setLoading(false);
      return;
    }

    setMetricTypes(typesRes.data);
    setTodayMetrics(metricsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Local state helpers -----

  const upsertType = (mt: MetricType) => {
    setMetricTypes((prev) => {
      const idx = prev.findIndex((x) => x.metricTypeId === mt.metricTypeId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mt;
        return next;
      }
      return [mt, ...prev].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const removeTypeLocal = (id: string) => {
    setMetricTypes((prev) => prev.filter((x) => x.metricTypeId !== id));
    setTodayMetrics((prev) => prev.filter((m) => m.metricTypeId !== id));
  };

  // Upsert “today metric” by metricTypeId (only one entry per type for today)
  const upsertTodayMetric = (m: Metric) => {
    setTodayMetrics((prev) => {
      const next = prev.filter((x) => x.metricTypeId !== m.metricTypeId);
      return [m, ...next];
    });
  };

  const removeTodayMetricById = (metricId: string) => {
    setTodayMetrics((prev) => prev.filter((m) => m.metricId !== metricId));
  };

  const removeTodayMetricByType = (metricTypeId: string) => {
    setTodayMetrics((prev) => prev.filter((m) => m.metricTypeId !== metricTypeId));
  };

  // ----- Create Metric Type -----

  const openCreate = () =>
    setCreateState({ open: true, name: "", kind: "Boolean", unit: "" });

  const closeCreate = () => setCreateState((s) => ({ ...s, open: false }));

  const submitCreate = async () => {
    setErr(null);

    const name = createState.name.trim();
    if (!name) return setErr("Please enter a metric name.");

    const unit = createState.unit.trim() || undefined;
    const res = await createMetricType(name, createState.kind, unit);

    if (!res.success) return setErr(res.error);

    upsertType(res.data);
    closeCreate();
  };

  // ----- Delete Metric Type -----

  const removeType = async (id: string) => {
    setErr(null);

    const snapshotTypes = metricTypes;
    const snapshotToday = todayMetrics;

    removeTypeLocal(id);

    const res = await deleteMetricType(id);
    if (!res.success) {
      setMetricTypes(snapshotTypes);
      setTodayMetrics(snapshotToday);
      setErr(res.error);
    }
  };

  // ----- Boolean toggle today (smooth, optimistic) -----

  const toggleBooleanToday = async (mt: MetricType) => {
    const k = keyFor(mt.metricTypeId);
    if (busyByKey[k]) return;

    setErr(null);
    setBusy(k, true);

    try {
      const existing = todayByTypeId.get(mt.metricTypeId);

      if (existing) {
        // optimistic remove
        removeTodayMetricById(existing.metricId);

        const del = await deleteMetric(existing.metricId);
        if (!del.success) {
          upsertTodayMetric(existing); // rollback
          setErr(del.error);
        }
        return;
      }

      const created = await logMetric(mt.metricTypeId, today, 1);
      if (!created.success) return setErr(created.error);

      upsertTodayMetric(created.data);
    } finally {
      setBusy(k, false);
    }
  };

  // ----- Inline absolute set (supports press-and-hold acceleration) -----
  // InlineStepper calls onChange(nextAbsoluteValue)
  //
  // Rule:
  // - if entry exists -> PUT update
  // - else -> POST create (unless nextValue is 0)
  // - clamp to >= 0
  const setTodayValueAbsolute = async (mt: MetricType, nextValueRaw: number) => {
    const k = keyFor(mt.metricTypeId);
    if (busyByKey[k]) return;

    setErr(null);
    setBusy(k, true);

    const existing = todayByTypeId.get(mt.metricTypeId);
    const nextValue = Math.max(0, Math.floor(nextValueRaw));

    try {
      // Don’t create “0” entries
      if (!existing && nextValue === 0) return;

      // optimistic UI
      if (existing) {
        upsertTodayMetric({ ...existing, value: nextValue });
      } else {
        upsertTodayMetric({
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
          upsertTodayMetric(existing); // rollback
          setErr(upd.error);
          return;
        }
        upsertTodayMetric(upd.data);
      } else {
        const created = await logMetric(mt.metricTypeId, today, nextValue);
        if (!created.success) {
          // rollback optimistic stub
          removeTodayMetricByType(mt.metricTypeId);
          setErr(created.error);
          return;
        }
        upsertTodayMetric(created.data);
      }
    } finally {
      setBusy(k, false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate("/dashboard")} aria-label="back to dashboard">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create metric types and adjust today’s values instantly.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<TodayIcon />} label={today} variant="outlined" />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800 }}
            onClick={openCreate}
          >
            New metric type
          </Button>
        </Stack>
      </Stack>

      {err && (
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, borderRadius: 2, borderColor: "error.light" }}
        >
          <Typography color="error" sx={{ fontWeight: 700 }}>
            {err}
          </Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Your metric types</Typography>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : metricTypes.length === 0 ? (
          <Typography color="text.secondary">No metric types yet. Create one.</Typography>
        ) : (
          <Stack spacing={1}>
            {metricTypes.map((mt) => {
              const isBoolean = mt.kind === "Boolean";
              const entry = todayByTypeId.get(mt.metricTypeId);
              const value = entry?.value ?? 0;

              const k = keyFor(mt.metricTypeId);
              const busy = Boolean(busyByKey[k]);

              return (
                <Paper key={mt.metricTypeId} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    alignItems={{ sm: "center" }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 900 }}>{mt.name}</Typography>
                        <Chip size="small" label={mt.kind} variant="outlined" sx={{ fontWeight: 800 }} />
                        {mt.unit ? <Chip size="small" label={mt.unit} variant="outlined" /> : null}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Today:{" "}
                        {isBoolean ? (entry ? "Done" : "Not done") : `${value}${mt.unit ? ` ${mt.unit}` : ""}`}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                      {isBoolean ? (
                        <Button
                          disabled={busy}
                          variant={entry ? "contained" : "outlined"}
                          sx={{ textTransform: "none", borderRadius: 2, fontWeight: 800 }}
                          onClick={() => void toggleBooleanToday(mt)}
                        >
                          {entry ? "Done" : "Mark done"}
                        </Button>
                      ) : (
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

                      <Tooltip title="Delete metric type">
                        <span>
                          <IconButton
                            disabled={busy}
                            aria-label="delete metric type"
                            onClick={() => void removeType(mt.metricTypeId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Create Metric Type (keep dialog) */}
      <Dialog open={createState.open} onClose={closeCreate} maxWidth="xs" fullWidth>
        <DialogTitle>Create metric type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={createState.name}
              onChange={(e) => setCreateState((s) => ({ ...s, name: e.target.value }))}
              fullWidth
              autoFocus
            />

            <TextField
              label="Kind"
              select
              value={createState.kind}
              onChange={(e) =>
                setCreateState((s) => ({ ...s, kind: e.target.value as CreateState["kind"] }))
              }
              fullWidth
            >
              <MenuItem value="Boolean">Boolean (done / not done)</MenuItem>
              <MenuItem value="Number">Number (count / score)</MenuItem>
              <MenuItem value="Duration">Duration (minutes)</MenuItem>
            </TextField>

            <TextField
              label="Unit (optional)"
              value={createState.unit}
              onChange={(e) => setCreateState((s) => ({ ...s, unit: e.target.value }))}
              fullWidth
              placeholder="e.g., cups, pages, minutes"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button onClick={() => void submitCreate()} variant="contained" sx={{ textTransform: "none" }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}