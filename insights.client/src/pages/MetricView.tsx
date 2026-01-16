import { useEffect, useMemo, useState } from "react";
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
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import LogEntryDialog from "../components/LogEntryDialog";

import {
  createMetricType,
  updateMetricType,
  deleteMetricType,
  getMetricTypes,
  getMetrics,
  logMetric,
  deleteMetric,
  type MetricType,
  type Metric,
  type GoalCadence,
} from "../services/metricService";

const cadenceLabel = (c: GoalCadence) => (c === "Daily" ? "Daily" : "Weekly");

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

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ENTRIES_PER_PAGE = 10;

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
  goalDays: number;
};

type EditState = {
  open: boolean;
  metricType: MetricType | null;
  name: string;
  kind: "Duration" | "Number" | "Boolean";
  unit: string;
  hasGoal: boolean;
  goalCadence: GoalCadence;
  goalValue: string;
  goalDays: number;
};

export default function MetricView() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<"types" | "history">("types");

  const [metricTypes, setMetricTypes] = useState<MetricType[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // History state
  const [historyEntries, setHistoryEntries] = useState<Metric[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [historyLoading, setHistoryLoading] = useState(false);

  // Date range (default: last 30 days)
  const [dateFrom, setDateFrom] = useState<dayjs.Dayjs | null>(
    dayjs().subtract(30, "day")
  );
  const [dateTo, setDateTo] = useState<dayjs.Dayjs | null>(dayjs());

  // Pagination
  const [historyPage, setHistoryPage] = useState(0);

  // Log entry dialog
  const [logDialog, setLogDialog] = useState<LogDialogState>({
    open: false,
    metricType: null,
    date: isoDate(new Date()),
    value: "",
  });

  // Per-metricTypeId busy flags
  const [busyByType, setBusyByType] = useState<Record<string, boolean>>({});

  const [createState, setCreateState] = useState<CreateState>({
    open: false,
    name: "",
    kind: "Boolean",
    unit: "",
    hasGoal: false,
    goalCadence: "Weekly",
    goalValue: "5",
    goalDays: 127,
  });

  const [editState, setEditState] = useState<EditState>({
    open: false,
    metricType: null,
    name: "",
    kind: "Boolean",
    unit: "",
    hasGoal: false,
    goalCadence: "Weekly",
    goalValue: "5",
    goalDays: 127,
  });

  const initialLoad = async () => {
    setLoading(true);
    setErr(null);

    const typesRes = await getMetricTypes();

    if (!typesRes.success) {
      setErr(typesRes.error);
      setLoading(false);
      return;
    }

    setMetricTypes(typesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- History -----

  const loadHistory = async () => {
    setHistoryLoading(true);
    const from = dateFrom?.format("YYYY-MM-DD");
    const to = dateTo?.format("YYYY-MM-DD");
    const res = await getMetrics(from, to);
    if (res.success) {
      setHistoryEntries(res.data);
      setHistoryPage(0);
    } else {
      setErr(res.error);
    }
    setHistoryLoading(false);
  };

  // Reload when date range changes
  useEffect(() => {
    if (tab === "history") {
      void loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return historyEntries;
    return historyEntries.filter((e) => e.metricTypeId === historyFilter);
  }, [historyEntries, historyFilter]);

  // Group entries by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Metric[]>();
    for (const entry of filteredHistory) {
      const dateKey = entry.date?.slice(0, 10) ?? "";
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entry);
    }
    // Sort dates descending
    return Array.from(groups.entries()).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [filteredHistory]);

  // Pagination
  const totalPages = Math.ceil(groupedByDate.length / ENTRIES_PER_PAGE);
  const paginatedDates = useMemo(() => {
    const start = historyPage * ENTRIES_PER_PAGE;
    return groupedByDate.slice(start, start + ENTRIES_PER_PAGE);
  }, [groupedByDate, historyPage]);

  // Reset page if out of bounds
  useEffect(() => {
    if (historyPage > 0 && historyPage >= totalPages) {
      setHistoryPage(Math.max(0, totalPages - 1));
    }
  }, [historyPage, totalPages]);

  const deleteHistoryEntry = async (metricId: string) => {
    const res = await deleteMetric(metricId);
    if (!res.success) {
      setErr(res.error);
      return;
    }
    setHistoryEntries((prev) => prev.filter((e) => e.metricId !== metricId));
  };

  // Log dialog handlers
  const openLogDialog = (date?: string) => {
    setLogDialog({
      open: true,
      metricType: null,
      date: date ?? isoDate(new Date()),
      value: "",
    });
  };

  const closeLogDialog = () => {
    setLogDialog({
      open: false,
      metricType: null,
      date: isoDate(new Date()),
      value: "",
    });
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

    setErr(null);
    const res = await logMetric(mt.metricTypeId, logDialog.date, v);
    if (!res.success) {
      setErr(res.error);
      return;
    }

    setHistoryEntries((prev) => [res.data, ...prev]);
    closeLogDialog();
  };

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
    setHistoryEntries((prev) => prev.filter((m) => m.metricTypeId !== id));
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
      hasGoal: false,
      goalCadence: "Weekly",
      goalValue: "5",
      goalDays: 127, // All days selected by default
    });

  const closeCreate = () =>
    setCreateState({
      open: false,
      name: "",
      kind: "Boolean",
      unit: "",
      hasGoal: false,
      goalCadence: "Weekly",
      goalValue: "5",
      goalDays: 127,
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
      if (createState.kind === "Boolean" && createState.goalCadence === "Daily")
        gv = Math.min(1, gv);
      if (
        createState.kind === "Boolean" &&
        createState.goalCadence === "Weekly"
      )
        gv = Math.min(7, gv);
    }

    // Validate goal days for daily cadence
    const goalDays = createState.goalDays;
    if (createState.hasGoal && createState.goalCadence === "Daily") {
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

    upsertType(res.data);
    closeCreate();
  };

  // ----- Edit Metric Type -----

  const openEdit = (mt: MetricType) => {
    setErr(null);
    setEditState({
      open: true,
      metricType: mt,
      name: mt.name ?? "",
      kind: mt.kind,
      unit: mt.unit ?? "",
      hasGoal: (mt.goalValue ?? 0) > 0,
      goalCadence: mt.goalCadence ?? 1,
      goalValue: String(mt.goalValue ?? 0) || "5",
      goalDays: mt.goalDays ?? 127,
    });
  };

  const closeEdit = () =>
    setEditState({
      open: false,
      metricType: null,
      name: "",
      kind: "Boolean",
      unit: "",
      hasGoal: false,
      goalCadence: "Weekly",
      goalValue: "5",
      goalDays: 127,
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

    let gv = 0;
    if (editState.hasGoal) {
      const goalValueNum = Number(editState.goalValue);
      if (!Number.isFinite(goalValueNum) || goalValueNum < 0) {
        setBusy(mt.metricTypeId, false);
        return setErr("Goal must be a valid non-negative number.");
      }

      gv = Math.floor(goalValueNum);
      if (editState.kind === "Boolean" && editState.goalCadence === "Daily")
        gv = Math.min(1, gv);
      if (editState.kind === "Boolean" && editState.goalCadence === "Weekly")
        gv = Math.min(7, gv);
    }

    // Validate goal days for daily cadence
    const goalDays = editState.goalDays;
    if (editState.hasGoal && editState.goalCadence === "Daily") {
      if (goalDays <= 0) {
        setBusy(mt.metricTypeId, false);
        return setErr("Please select at least one day for your daily goal.");
      }
    }

    const snapshot = mt;
    const optimistic: MetricType = {
      ...mt,
      name,
      kind: editState.kind,
      unit: unit ?? null,
      goalCadence: editState.goalCadence,
      goalValue: gv,
      goalDays,
    };
    upsertType(optimistic);

    try {
      const res = await updateMetricType(
        mt.metricTypeId,
        name,
        editState.kind,
        unit,
        editState.goalCadence,
        gv,
        goalDays
      );

      if (!res.success) {
        upsertType(snapshot);
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
    const snapshotHistory = historyEntries;

    removeTypeLocal(id);

    const res = await deleteMetricType(id);
    if (!res.success) {
      setMetricTypes(snapshotTypes);
      setHistoryEntries(snapshotHistory);
      setErr(res.error);
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
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your metric types and view history
            </Typography>
          </Box>
        </Stack>

        {tab === "types" && (
          <>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600,
              }}
              onClick={openCreate}
            >
              New metric
            </Button>
            <IconButton
              color="primary"
              onClick={openCreate}
              sx={{
                display: { xs: "inline-flex", sm: "none" },
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <AddIcon />
            </IconButton>
          </>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            if (v === "history" && historyEntries.length === 0) {
              void loadHistory();
            }
          }}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab
            label="Types"
            value="types"
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
          <Tab
            label="History"
            value="history"
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
        </Tabs>

        <Box sx={{ p: 2.25 }}>
          {tab === "types" ? (
            <>
              {loading ? (
                <Typography color="text.secondary">Loadingâ€¦</Typography>
              ) : metricTypes.length === 0 ? (
                <Typography color="text.secondary">
                  No metric types yet. Create one.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {metricTypes.map((mt) => {
                    const busy = Boolean(busyByType[mt.metricTypeId]);

                    return (
                      <Paper
                        key={mt.metricTypeId}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2 }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              flexWrap="wrap"
                            >
                              <Typography sx={{ fontWeight: 600 }}>
                                {mt.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={mt.kind}
                                variant="outlined"
                                sx={{ height: 20, fontSize: 11 }}
                              />
                              {(mt.kind === "Boolean" || mt.unit) && (
                                <Chip
                                  size="small"
                                  label={
                                    mt.kind === "Boolean" ? "log" : mt.unit
                                  }
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: 11 }}
                                />
                              )}
                            </Stack>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {mt.goalValue > 0
                                ? `Goal: ${mt.goalValue} ${
                                    mt.unit ?? ""
                                  } (${cadenceLabel(mt.goalCadence)})`.trim()
                                : "No goal set"}
                            </Typography>
                          </Box>

                          <Tooltip title="Edit">
                            <span>
                              <IconButton
                                size="small"
                                disabled={busy}
                                onClick={() => openEdit(mt)}
                                sx={{ color: "text.secondary" }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                size="small"
                                disabled={busy}
                                onClick={() => void removeType(mt.metricTypeId)}
                                sx={{ color: "text.secondary" }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              {/* Header with filters and add button */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={{ xs: 2, sm: 1 }}
                sx={{ mb: 2 }}
              >
                <TextField
                  select
                  size="small"
                  value={historyFilter}
                  onChange={(e) => {
                    setHistoryFilter(e.target.value);
                    setHistoryPage(0);
                  }}
                  sx={{ minWidth: 130 }}
                >
                  <MenuItem value="all">All metrics</MenuItem>
                  {metricTypes.map((mt) => (
                    <MenuItem key={mt.metricTypeId} value={mt.metricTypeId}>
                      {mt.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Stack direction="row" spacing={1}>
                  <DatePicker
                    label="From"
                    value={dateFrom}
                    onChange={(v) => setDateFrom(v)}
                    slotProps={{
                      textField: { size: "small", sx: { minWidth: 150 } },
                    }}
                  />
                  <DatePicker
                    label="To"
                    value={dateTo}
                    onChange={(v) => setDateTo(v)}
                    slotProps={{
                      textField: { size: "small", sx: { minWidth: 150 } },
                    }}
                  />
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {historyLoading ? (
                <Typography color="text.secondary">Loadingâ€¦</Typography>
              ) : groupedByDate.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    textAlign: "center",
                    borderStyle: "dashed",
                  }}
                >
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    No entries in this date range
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => openLogDialog()}
                    sx={{ textTransform: "none" }}
                  >
                    Log an entry
                  </Button>
                </Paper>
              ) : (
                <>
                  <Stack spacing={2}>
                    {paginatedDates.map(([dateKey, entries]) => {
                      const dateObj = new Date(dateKey + "T12:00:00");
                      const formattedDate = dateObj.toLocaleDateString(
                        undefined,
                        {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      );

                      return (
                        <Box key={dateKey}>
                          {/* Date header */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {formattedDate}
                            </Typography>
                            <Tooltip title={`Add entry for ${formattedDate}`}>
                              <IconButton
                                size="small"
                                onClick={() => openLogDialog(dateKey)}
                                sx={{ color: "primary.main" }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>

                          {/* Entries for this date */}
                          <Stack spacing={0.75}>
                            {entries.map((entry) => {
                              const mt = metricTypes.find(
                                (m) => m.metricTypeId === entry.metricTypeId
                              );
                              const subtitle =
                                mt?.kind === "Boolean"
                                  ? "completed"
                                  : `${entry.value}${
                                      mt?.unit ? ` ${mt.unit}` : ""
                                    }`;

                              return (
                                <Paper
                                  key={entry.metricId}
                                  variant="outlined"
                                  sx={{ p: 1.25, borderRadius: 2 }}
                                >
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 700 }}
                                      >
                                        {entry.metricTypeName}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {subtitle}
                                      </Typography>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        void deleteHistoryEntry(entry.metricId)
                                      }
                                      aria-label="delete"
                                      sx={{ color: "text.secondary" }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </Paper>
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* Pagination */}
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
                        disabled={historyPage === 0}
                        onClick={() => setHistoryPage((p) => p - 1)}
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                      <Typography variant="body2" color="text.secondary">
                        {historyPage + 1} / {totalPages}
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={historyPage >= totalPages - 1}
                        onClick={() => setHistoryPage((p) => p + 1)}
                      >
                        <ChevronRightIcon />
                      </IconButton>
                    </Stack>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", mt: 1 }}
                  >
                    {filteredHistory.length} entries across{" "}
                    {groupedByDate.length} days
                  </Typography>
                </>
              )}
            </LocalizationProvider>
          )}
        </Box>
      </Paper>

      {/* Log Entry Dialog */}
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

      {/* Create Metric Type Dialog */}
      <Dialog
        open={createState.open}
        onClose={closeCreate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          New metric
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Track anything — we'll find the patterns
          </Typography>
        </DialogTitle>
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
                placeholder="e.g., cups, pages, minutes"
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
                      goalCadence: e.target.value as GoalCadence,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                </TextField>

                <TextField
                  label={
                    createState.kind === "Boolean" &&
                    createState.goalCadence === "Weekly"
                      ? "Goal (days per week)"
                      : createState.goalCadence === "Daily"
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

                {/* Day selection for daily goals */}
                {createState.goalCadence === "Daily" && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 1 }}
                    >
                      Active on these days:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(
                        Object.keys(DAY_FLAGS) as Array<keyof typeof DAY_FLAGS>
                      ).map((day) => (
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

      {/* Edit Metric Type Dialog */}
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
                  unit: e.target.value === "Boolean" ? "" : s.unit,
                }))
              }
              fullWidth
            >
              <MenuItem value="Boolean">Boolean (yes / no)</MenuItem>
              <MenuItem value="Number">Number (count / score)</MenuItem>
              <MenuItem value="Duration">Duration (minutes)</MenuItem>
            </TextField>

            {editState.kind !== "Boolean" && (
              <TextField
                label="Unit (optional)"
                value={editState.unit}
                onChange={(e) =>
                  setEditState((s) => ({ ...s, unit: e.target.value }))
                }
                fullWidth
                placeholder="e.g., cups, pages, minutes"
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={editState.hasGoal}
                  onChange={(e) =>
                    setEditState((s) => ({ ...s, hasGoal: e.target.checked }))
                  }
                />
              }
              label="Set a goal"
            />

            {editState.hasGoal && (
              <>
                <TextField
                  label="Goal cadence"
                  select
                  value={editState.goalCadence}
                  onChange={(e) =>
                    setEditState((s) => ({
                      ...s,
                      goalCadence: e.target.value as GoalCadence,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                </TextField>

                <TextField
                  label={
                    editState.kind === "Boolean" &&
                    editState.goalCadence === "Weekly"
                      ? "Goal (days per week)"
                      : editState.goalCadence === "Daily"
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
                      ? "Boolean goals are clamped: Daily â‰¤ 1, Weekly â‰¤ 7."
                      : "Numeric target for the selected cadence."
                  }
                />

                {/* Day selection for daily goals */}
                {editState.goalCadence === "Daily" && (
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 1 }}
                    >
                      Active on these days:
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(
                        Object.keys(DAY_FLAGS) as Array<keyof typeof DAY_FLAGS>
                      ).map((day) => (
                        <FormControlLabel
                          key={day}
                          control={
                            <Checkbox
                              checked={isDaySelected(editState.goalDays, day)}
                              onChange={() =>
                                setEditState((s) => ({
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
