import { useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";

type Props = {
  value: number;
  disabled?: boolean;

  min?: number; // default 0
  max?: number; // optional

  unit?: string | null;

  // Called when user wants to change value; you do optimistic + server update there.
  onChange: (nextValue: number) => void | Promise<void>;

  // Optional label (useful for compact mode)
  label?: string;

  // Visual sizing
  size?: "compact" | "normal";
};

function clamp(v: number, min: number, max?: number) {
  const x = Math.max(min, v);
  return typeof max === "number" ? Math.min(max, x) : x;
}

// Acceleration profile for desktop hold (tweak freely)
function stepForHeldMs(ms: number) {
  if (ms < 500) return 1;
  if (ms < 1000) return 1;
  if (ms < 1500) return 2;
  if (ms < 2500) return 5;
  return 10;
}

function intervalForHeldMs(ms: number) {
  if (ms < 500) return 180;
  if (ms < 1000) return 140;
  if (ms < 1500) return 100;
  if (ms < 2500) return 80;
  return 60;
}

// Detect touch device
const isTouchDevice = () =>
  "ontouchstart" in window || navigator.maxTouchPoints > 0;

export default function InlineStepper({
  value,
  disabled,
  min = 0,
  max,
  unit,
  onChange,
  label,
  size = "normal",
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;

  const displayValue = isEditing ? draft : String(value);

  const holdRef = useRef<{
    direction: 1 | -1;
    startTs: number;
    timer: number | null;
    active: boolean;
    didNudge: boolean;
  } | null>(null);

  const density = size === "compact" ? "small" : "medium";
  const inputWidth = size === "compact" ? 72 : 88;

  const commitDraft = async () => {
    if (draft === null) return;
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(null);
      return;
    }
    const next = clamp(Math.floor(n), min, max);
    setDraft(null);
    if (next !== value) await onChange(next);
  };

  const nudge = async (delta: number) => {
    const next = clamp(value + delta, min, max);
    if (next !== value) await onChange(next);
  };

  const stopHold = () => {
    const h = holdRef.current;
    if (!h) return;
    h.active = false;
    if (h.timer) {
      window.clearTimeout(h.timer);
      h.timer = null;
    }
  };

  // Desktop only: hold to accelerate
  const startHold = (direction: 1 | -1) => {
    if (disabled || isTouchDevice()) return;

    stopHold();

    const h = {
      direction,
      startTs: performance.now(),
      timer: null as number | null,
      active: true,
      didNudge: false,
    };
    holdRef.current = h;

    // Immediate first step
    void nudge(direction);
    h.didNudge = true;

    const tick = async () => {
      if (!holdRef.current?.active) return;
      const elapsed = performance.now() - h.startTs;
      const step = stepForHeldMs(elapsed);
      const interval = intervalForHeldMs(elapsed);

      await nudge(direction * step);

      h.timer = window.setTimeout(() => {
        void tick();
      }, interval);
    };

    // Delay before repeating
    h.timer = window.setTimeout(() => {
      void tick();
    }, 300);
  };

  // Simple click handler for both desktop and mobile
  const handleClick = (direction: 1 | -1) => {
    // On desktop, mousedown already handled it via startHold
    if (!isTouchDevice() && holdRef.current?.didNudge) {
      return;
    }
    void nudge(direction);
  };

  useEffect(() => {
    const onUp = () => stopHold();
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const helper = useMemo(() => {
    if (!unit) return "";
    return unit;
  }, [unit]);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {label ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 70 }}
        >
          {label}
        </Typography>
      ) : null}

      <Tooltip title="Hold to decrease faster">
        <span>
          <IconButton
            size={density}
            disabled={disabled || value <= min}
            onMouseDown={() => startHold(-1)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onClick={() => handleClick(-1)}
            aria-label="decrease"
          >
            <RemoveIcon />
          </IconButton>
        </span>
      </Tooltip>

      <TextField
        value={displayValue}
        onFocus={() => setDraft(String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commitDraft()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
        size={density}
        inputMode="numeric"
        sx={{
          width: inputWidth,
          "& .MuiInputBase-input": {
            textAlign: "center",
            fontWeight: 600,
          },
        }}
        helperText={helper}
        FormHelperTextProps={{ sx: { textAlign: "center", m: 0, mt: 0.25 } }}
      />

      <Tooltip title="Hold to increase faster">
        <span>
          <IconButton
            size={density}
            disabled={disabled || (typeof max === "number" && value >= max)}
            onMouseDown={() => startHold(+1)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onClick={() => handleClick(+1)}
            aria-label="increase"
          >
            <AddIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
