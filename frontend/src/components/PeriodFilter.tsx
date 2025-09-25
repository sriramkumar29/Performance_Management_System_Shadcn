import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// Enable quarter calculations
dayjs.extend(quarterOfYear);

export type Period = {
  label: string;
  startDate: string | null; // ISO yyyy-MM-dd
  endDate: string | null; // ISO yyyy-MM-dd
};

interface PeriodFilterProps {
  value?: Period;
  defaultPreset?:
    | "All"
    | "This Year"
    | "Last Year"
    | "This Quarter"
    | "Last Quarter"
    | "Custom Range";
  onChange: (p: Period) => void;
  className?: string;
}

const presets = [
  "All",
  "This Year",
  "Last Year",
  "This Quarter",
  "Last Quarter",
  "Custom Range",
] as const;

type Preset = (typeof presets)[number];

const computePreset = (preset: Preset): Period => {
  const today = dayjs();
  if (preset === "All") return { label: "All", startDate: null, endDate: null };
  if (preset === "This Year")
    return {
      label: preset,
      startDate: today.startOf("year").format("YYYY-MM-DD"),
      endDate: today.endOf("year").format("YYYY-MM-DD"),
    };
  if (preset === "Last Year") {
    const y = today.subtract(1, "year");
    return {
      label: preset,
      startDate: y.startOf("year").format("YYYY-MM-DD"),
      endDate: y.endOf("year").format("YYYY-MM-DD"),
    };
  }
  if (preset === "This Quarter") {
    return {
      label: preset,
      startDate: today.startOf("quarter").format("YYYY-MM-DD"),
      endDate: today.endOf("quarter").format("YYYY-MM-DD"),
    };
  }
  if (preset === "Last Quarter") {
    const q = today.subtract(1, "quarter");
    return {
      label: preset,
      startDate: q.startOf("quarter").format("YYYY-MM-DD"),
      endDate: q.endOf("quarter").format("YYYY-MM-DD"),
    };
  }
  return { label: "Custom Range", startDate: null, endDate: null };
};

export default function PeriodFilter({
  value,
  defaultPreset = "All",
  onChange,
  className,
}: Readonly<PeriodFilterProps>) {
  const initial = useMemo(
    () => value ?? computePreset(defaultPreset),
    [value, defaultPreset]
  );
  const [period, setPeriod] = useState<Period>(initial);
  const [mode, setMode] = useState<Preset>(initial.label as Preset);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange(period);
  }, [period]);

  // Ensure the range stays valid: end >= start
  useEffect(() => {
    if (mode !== "Custom Range") return;
    if (period.startDate && period.endDate) {
      if (dayjs(period.endDate).isBefore(dayjs(period.startDate))) {
        setPeriod((prev) => ({ ...prev, endDate: prev.startDate }));
      }
    }
  }, [mode, period.startDate, period.endDate]);

  const handlePreset = (p: Preset) => {
    setMode(p);
    if (p === "Custom Range") {
      setPeriod((prev) => ({ ...prev, label: p }));
      // Open the calendar picker to speed up selection
      setTimeout(() => {
        const el = startRef.current;
        if (!el) return;
        try {
          (el as any).showPicker ? (el as any).showPicker() : el.focus();
        } catch {
          el.focus();
        }
      }, 0);
    } else {
      setPeriod(computePreset(p));
    }
  };

  return (
    <div className={className}>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 items-end">
        <div className="col-span-2 sm:col-span-2 lg:col-span-4">
          <Label className="mb-1 block">Time period</Label>
          <UiSelect
            value={mode}
            onValueChange={(val) => handlePreset(val as Preset)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </UiSelect>
        </div>
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <Label className="mb-1 block">Start date</Label>
          <div className="relative">
            <Input
              type="date"
              ref={startRef}
              value={period.startDate ?? ""}
              max={period.endDate ?? undefined}
              onChange={(e) => {
                const val = e.target.value || null;
                if (mode !== "Custom Range") setMode("Custom Range");
                setPeriod((prev) => ({
                  ...prev,
                  label: "Custom Range",
                  startDate: val,
                }));
                // After picking start, prompt end date
                setTimeout(() => {
                  const endEl = endRef.current;
                  if (!endEl) return;
                  try {
                    (endEl as any).showPicker
                      ? (endEl as any).showPicker()
                      : endEl.focus();
                  } catch {
                    endEl.focus();
                  }
                }, 0);
              }}
            />
          </div>
        </div>
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <Label className="mb-1 block">End date</Label>
          <div className="relative">
            <Input
              type="date"
              ref={endRef}
              value={period.endDate ?? ""}
              min={period.startDate ?? undefined}
              onChange={(e) => {
                const val = e.target.value || null;
                if (mode !== "Custom Range") setMode("Custom Range");
                setPeriod((prev) => ({
                  ...prev,
                  label: "Custom Range",
                  endDate: val,
                }));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
