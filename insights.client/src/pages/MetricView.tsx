import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RemoveIcon from "@mui/icons-material/Remove";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import TodayIcon from "@mui/icons-material/Today";
import EditIcon from "@mui/icons-material/Edit";

import {
  createMetricType,
  updateMetricType,
  deleteMetricType,
  getMetricTypes,
  getMetrics,
  logMetric,
  updateMetric,
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

const cadenceLabel = (c: GoalCadence) => (c === 0 ? "Daily" : "Weekly");

type CreateState = {
  open: boolean;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string;
  goalCadence: GoalCadence; // 0 daily, 1 weekly
  goalValue: string;
};

type EditState = {
  open: boolean;
  metricType: MetricType | null;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string;
  goalCadence: GoalCadence;
  goalValue: string;
};

type SetValueState = {
  open: boolean;
  metricType: MetricType | null;
  value: string;
};

export default function MetricView() {
  const navigate = useNavigate();
  const today = useMemo(() => isoDate(new Date()), []);

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [todayMetrics, setTodayMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Per-metricTypeId busy flags
  const [busyByType, setBusyByType] = useState<Record<string, boolean>>({});

  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    name: "",
    kind: "Boolean",
    unit: "",
    goalCadence: 1,
    goalValue: "5",
  });

  const [editState, setEditState] = useState<EditState>({
    open: false,
    metricType: null,
    name: "",
    kind: "Boolean",
    unit: "",
    goalCadence: 1,
    goalValue: "5",
  });

  const [setValueState, setSetValueState] = useState<SetValueState>({
    open: false,
    metricType: null,
    value: "",
  });

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

  const location = useLocation();

  useEffect(() => {
    void initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // ----- Local state helpers -----

  const upsertType = (mt: MetricType) => {
    setMetricTypes((prev) => {
      const idx = prev.findIndex((x) => x.metricTypeId === mt.metricTypeId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mt;
        return next.sort((a, b) => a.name.localeCompare(b.name));
      }
      return [mt, ...prev].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const removeTypeLocal = (id: string) => {
    setMetricTypes((prev) => prev.filter((x) => x.metricTypeId !== id));
    setTodayMetrics((prev) => prev.filter((m) => m.metricTypeId !== id));
  };

  const upsertTodayMetric = (m: Metric) => {
    setTodayMetrics((prev) => {
      const next = prev.filter((x) => x.metricTypeId !== m.metricTypeId);
      return [m, ...next];
    });
  };

  const removeTodayMetricById = (metricId: string) => {
    setTodayMetrics((prev) => prev.filter((m) => m.metricId !== metricId));
  };

  const setBusy = (metricTypeId: string, v: boolean) => {
    setBusyByType((prev) => ({ ...prev, [metricTypeId]: v }));
  };

  // ----- Create Metric Type -----

  const openCreate = () =>
    setCreateState({
      open: true,
      name: "",
      kind: "Boolean",
      unit: "",
      goalCadence: 1,
      goalValue: "5",
    });

  const closeCreate = () => setCreateState((s) => ({ ...s, open: false }));

  const submitCreate = async () => {
    setErr(null);

    const name = createState.name.trim();
    if (!name) return setErr("Please enter a metric name.");

    const unit = createState.unit.trim() || undefined;

    const goalValueNum = Number(createState.goalValue);
    if (!Number.isFinite(goalValueNum) || goalValueNum < 0) {
      return setErr("Goal must be a valid non-negative number.");
    }

    let gv = Math.floor(goalValueNum);
    if (createState.kind === "Boolean" && createState.goalCadence === 0)
      gv = Math.min(1, gv);
    if (createState.kind === "Boolean" && createState.goalCadence === 1)
      gv = Math.min(7, gv);

    const res = await createMetricType(
      name,
      createState.kind,
      unit,
      createState.goalCadence,
      gv
    );

    if (!res.success) return setErr(res.error);

    upsertType(res.data);
    closeCreate();
  };

  // ----- Edit Metric Type (ALL PROPERTIES) -----

  const openEdit = (mt: MetricType) => {
    setErr(null);
    setEditState({
      open: true,
      metricType: mt,
      name: mt.name ?? "",
      kind: mt.kind,
      unit: mt.unit ?? "",
      goalCadence: mt.goalCadence ?? 1,
      goalValue: String(mt.goalValue ?? 0),
    });
  };

  const closeEdit = () =>
    setEditState({
      open: false,
      metricType: null,
      name: "",
      kind: "Boolean",
      unit: "",
      goalCadence: 1,
      goalValue: "5",
    });

  const submitEdit = async () => {
    const mt = editState.metricType;
    if (!mt) return;

    setErr(null);
    setBusy(mt.metricTypeId, true);

    const name = editState.name.trim();
    if (!name) {
      setBusy(mt.metricTypeId, false);
      return setErr("Please enter a metric name.");
    }

    const unit = editState.unit.trim() || undefined;

    const goalValueNum = Number(editState.goalValue);
    if (!Number.isFinite(goalValueNum) || goalValueNum < 0) {
      setBusy(mt.metricTypeId, false);
      return setErr("Goal must be a valid non-negative number.");
    }

    // Clamp boolean goals
    let gv = Math.floor(goalValueNum);
    if (editState.kind === "Boolean" && editState.goalCadence === 0)
      gv = Math.min(1, gv);
    if (editState.kind === "Boolean" && editState.goalCadence === 1)
      gv = Math.min(7, gv);

    // Snapshot + optimistic update in UI
    const snapshot = mt;
    const optimistic: MetricType = {
      ...mt,
      name,
      kind: editState.kind,
      unit: unit ?? null,
      goalCadence: editState.goalCadence,
      goalValue: gv,
    };
    upsertType(optimistic);

    try {
      const res = await updateMetricType(
        mt.metricTypeId,
        name,
        editState.kind,
        unit,
        editState.goalCadence,
        gv
      );

      if (!res.success) {
        upsertType(snapshot); // rollback
        setErr(res.error);
        return;
      }

      upsertType(res.data);
      closeEdit();
    } finally {
      setBusy(mt.metricTypeId, false);
    }
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

  // ----- Boolean toggle today -----

  const toggleBooleanToday = async (mt: MetricType) => {
    setErr(null);
    setBusy(mt.metricTypeId, true);

    try {
      const existing = todayByTypeId.get(mt.metricTypeId);

      if (existing) {
        removeTodayMetricById(existing.metricId);

        const del = await deleteMetric(existing.metricId);
        if (!del.success) {
          upsertTodayMetric(existing);
          setErr(del.error);
        }
        return;
      }

      const created = await logMetric(mt.metricTypeId, today, 1);
      if (!created.success) return setErr(created.error);

      upsertTodayMetric(created.data);
    } finally {
      setBusy(mt.metricTypeId, false);
    }
  };

  // ----- Freely increase / decrease today (Number/Duration) -----
  const changeTodayValue = async (mt: MetricType, delta: number) => {
    setErr(null);
    setBusy(mt.metricTypeId, true);

    try {
      const existing = todayByTypeId.get(mt.metricTypeId);
      const current = existing?.value ?? 0;
      const nextValue = Math.max(0, current + delta);

      if (nextValue === current && existing) return;

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

      if (existing && !existing.metricId.startsWith("optimistic-")) {
        const upd = await updateMetric(existing.metricId, nextValue);
        if (!upd.success) {
          upsertTodayMetric(existing);
          setErr(upd.error);
          return;
        }
        upsertTodayMetric(upd.data);
      } else {
        if (!existing && nextValue === 0) {
          setTodayMetrics((prev) =>
            prev.filter((m) => m.metricTypeId !== mt.metricTypeId)
          );
          return;
        }

        const created = await logMetric(mt.metricTypeId, today, nextValue);
        if (!created.success) {
          setTodayMetrics((prev) =>
            prev.filter((m) => m.metricTypeId !== mt.metricTypeId)
          );
          setErr(created.error);
          return;
        }
        upsertTodayMetric(created.data);
      }
    } finally {
      setBusy(mt.metricTypeId, false);
    }
  };

  const openSetValue = (mt: MetricType) => {
    const existing = todayByTypeId.get(mt.metricTypeId);
    setSetValueState({
      open: true,
      metricType: mt,
      value: existing ? String(existing.value) : "",
    });
  };

  const closeSetValue = () =>
    setSetValueState({ open: false, metricType: null, value: "" });

  const submitSetValue = async () => {
    setErr(null);

    const mt = setValueState.metricType;
    if (!mt) return;

    const v = Number(setValueState.value);
    if (!Number.isFinite(v)) return setErr("Please enter a valid number.");

    const existing = todayByTypeId.get(mt.metricTypeId);
    const nextValue = Math.max(0, Math.floor(v));

    setBusy(mt.metricTypeId, true);
    try {
      if (existing) upsertTodayMetric({ ...existing, value: nextValue });

      if (existing) {
        const upd = await updateMetric(existing.metricId, nextValue);
        if (!upd.success) {
          upsertTodayMetric(existing);
          setErr(upd.error);
          return;
        }
        upsertTodayMetric(upd.data);
      } else {
        if (nextValue === 0) {
          closeSetValue();
          return;
        }
        const created = await logMetric(mt.metricTypeId, today, nextValue);
        if (!created.success) {
          setErr(created.error);
          return;
        }
        upsertTodayMetric(created.data);
      }

      closeSetValue();
    } finally {
      setBusy(mt.metricTypeId, false);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            onClick={() => navigate("/dashboard")}
            aria-label="back to dashboard"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create metric types, edit goals, and adjust today’s values
              instantly.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<TodayIcon />}
            label={new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            variant="outlined"
            sx={{ px: 1 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<PlaylistAddIcon />}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
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
        <Typography sx={{ fontWeight: 900, mb: 1 }}>
          Your metric types
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : metricTypes.length === 0 ? (
          <Typography color="text.secondary">
            No metric types yet. Create one.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {metricTypes.map((mt) => {
              const isBoolean = mt.kind === "Boolean";
              const entry = todayByTypeId.get(mt.metricTypeId);
              const value = entry?.value ?? 0;
              const busy = Boolean(busyByType[mt.metricTypeId]);

              return (
                <Paper
                  key={mt.metricTypeId}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {/* Info */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography sx={{ fontWeight: 900 }}>
                          {mt.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={mt.kind}
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                        {mt.unit && (
                          <Chip
                            size="small"
                            label={mt.unit}
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {mt.goalValue > 0
                          ? `Goal: ${mt.goalValue} ${
                              mt.unit ?? ""
                            } (${cadenceLabel(mt.goalCadence)})`
                          : "No goal set"}
                      </Typography>
                    </Box>

                    {/* Today's value control */}
                    {isBoolean ? (
                      <Button
                        disabled={busy}
                        variant={entry ? "contained" : "outlined"}
                        size="small"
                        sx={{
                          textTransform: "none",
                          borderRadius: 2,
                          fontWeight: 700,
                          minWidth: 90,
                        }}
                        onClick={() => void toggleBooleanToday(mt)}
                      >
                        {entry ? "Done" : "Mark done"}
                      </Button>
                    ) : (
                      <Stack
                        direction="row"
                        alignItems="center"
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 2,
                          px: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          disabled={busy || value <= 0}
                          onClick={() => void changeTodayValue(mt, -1)}
                          aria-label="decrease"
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>

                        <Typography
                          sx={{
                            minWidth: 40,
                            textAlign: "center",
                            fontWeight: 900,
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                          onClick={() => openSetValue(mt)}
                        >
                          {value}
                        </Typography>

                        <IconButton
                          size="small"
                          disabled={busy}
                          onClick={() => void changeTodayValue(mt, +1)}
                          aria-label="increase"
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => openEdit(mt)}
                        aria-label="edit"
                        sx={{ color: "text.secondary" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => void removeType(mt.metricTypeId)}
                        aria-label="delete"
                        sx={{ color: "text.secondary" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Create Metric Type */}
      <Dialog
        open={createState.open}
        onClose={closeCreate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create metric type</DialogTitle>
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
            />

            <TextField
              label="Kind"
              select
              value={createState.kind}
              onChange={(e) =>
                setCreateState((s) => ({
                  ...s,
                  kind: e.target.value as CreateState["kind"],
                }))
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
              onChange={(e) =>
                setCreateState((s) => ({ ...s, unit: e.target.value }))
              }
              fullWidth
              placeholder="e.g., cups, pages, minutes"
            />

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
                createState.kind === "Boolean" && createState.goalCadence === 1
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
              helperText={
                createState.kind === "Boolean"
                  ? "Boolean goals work best as weekly days (e.g., 5 days/week)."
                  : "Set a numeric target for the selected cadence."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
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
        </DialogActions>
      </Dialog>

      {/* Edit Metric Type */}
      <Dialog open={editState.open} onClose={closeEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Edit metric type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={editState.name}
              onChange={(e) =>
                setEditState((s) => ({ ...s, name: e.target.value }))
              }
              fullWidth
              autoFocus
            />

            <TextField
              label="Kind"
              select
              value={editState.kind}
              onChange={(e) =>
                setEditState((s) => ({
                  ...s,
                  kind: e.target.value as EditState["kind"],
                }))
              }
              fullWidth
            >
              <MenuItem value="Boolean">Boolean (done / not done)</MenuItem>
              <MenuItem value="Number">Number (count / score)</MenuItem>
              <MenuItem value="Duration">Duration (minutes)</MenuItem>
            </TextField>

            <TextField
              label="Unit (optional)"
              value={editState.unit}
              onChange={(e) =>
                setEditState((s) => ({ ...s, unit: e.target.value }))
              }
              fullWidth
              placeholder="e.g., cups, pages, minutes"
            />

            <TextField
              label="Goal cadence"
              select
              value={editState.goalCadence}
              onChange={(e) =>
                setEditState((s) => ({
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
                editState.kind === "Boolean" && editState.goalCadence === 1
                  ? "Goal (days per week)"
                  : editState.goalCadence === 0
                  ? "Goal (per day)"
                  : "Goal (per week)"
              }
              value={editState.goalValue}
              onChange={(e) =>
                setEditState((s) => ({ ...s, goalValue: e.target.value }))
              }
              fullWidth
              inputMode="numeric"
              helperText={
                editState.kind === "Boolean"
                  ? "Boolean goals are clamped: Daily ≤ 1, Weekly ≤ 7."
                  : "Numeric target for the selected cadence."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={() => void submitEdit()}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Save changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Value Dialog */}
      <Dialog
        open={setValueState.open}
        onClose={closeSetValue}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Set today’s value</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {setValueState.metricType?.name} •{" "}
              {setValueState.metricType?.kind}
              {setValueState.metricType?.unit
                ? ` • ${setValueState.metricType.unit}`
                : ""}
            </Typography>

            <TextField
              label={
                setValueState.metricType?.kind === "Duration"
                  ? "Minutes"
                  : "Value"
              }
              value={setValueState.value}
              onChange={(e) =>
                setSetValueState((s) => ({ ...s, value: e.target.value }))
              }
              fullWidth
              inputMode="numeric"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSetValue} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={() => void submitSetValue()}
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
