import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import type { MetricType } from "../services/metricService";

interface LogEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;

  metricTypes: MetricType[];
  selectedMetricType: MetricType | null;
  onMetricTypeChange: (mt: MetricType | null) => void;

  date: string;
  onDateChange: (date: string) => void;

  value: string;
  onValueChange: (value: string) => void;
}

export default function LogEntryDialog({
  open,
  onClose,
  onSubmit,
  metricTypes,
  selectedMetricType,
  onMetricTypeChange,
  date,
  onDateChange,
  value,
  onValueChange,
}: LogEntryDialogProps) {
  const formattedDate = dayjs(date).format("MMM D, YYYY");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Log entry
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 400 }}
        >
          {formattedDate}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Metric"
              select
              value={selectedMetricType?.metricTypeId ?? ""}
              onChange={(e) => {
                const mt = metricTypes.find(
                  (m) => m.metricTypeId === e.target.value
                );
                onMetricTypeChange(mt ?? null);
              }}
              fullWidth
            >
              {metricTypes.map((mt) => (
                <MenuItem key={mt.metricTypeId} value={mt.metricTypeId}>
                  {mt.name}
                </MenuItem>
              ))}
            </TextField>

            <DatePicker
              label="Date"
              value={dayjs(date)}
              onChange={(newValue) =>
                onDateChange(newValue?.format("YYYY-MM-DD") ?? date)
              }
              slotProps={{ textField: { fullWidth: true } }}
            />

            {selectedMetricType && selectedMetricType.kind !== "Boolean" && (
              <TextField
                label={
                  selectedMetricType.kind === "Duration"
                    ? "Duration (time)"
                    : `Value${
                        selectedMetricType.unit
                          ? ` (${selectedMetricType.unit})`
                          : ""
                      }`
                }
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                fullWidth
                inputMode="decimal"
              />
            )}

            {selectedMetricType?.kind === "Boolean" && (
              <Typography variant="body2" color="text.secondary">
                This will mark "{selectedMetricType.name}" as done for{" "}
                {formattedDate}.
              </Typography>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          sx={{ textTransform: "none" }}
          disabled={!selectedMetricType}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
