"use client";

import { IconCalendar, IconCheck, IconRotate } from "@tabler/icons-react";
import { formatDuration } from "@/lib/duration";
import { formatShortDate, MINUTES_PER_DAY, percent, type DailyRecord } from "@/lib/reports";
import { cn } from "@/lib/utils";

type ReportFormProps = {
  devices: string[];
  device: string;
  newDevice: string;
  onDeviceChange: (value: string) => void;
  onNewDeviceChange: (value: string) => void;
  dateMode: "single" | "range";
  onDateModeChange: (mode: "single" | "range") => void;
  date: string;
  onDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  maxDate: string;
  downtimeMinutes: number;
  validDowntime: boolean;
  notice: string | null;
  existing: DailyRecord | null;
  onSubmit: () => void;
  onReset: () => void;
};

const inputClass =
  "h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ReportForm({
  devices,
  device,
  newDevice,
  onDeviceChange,
  onNewDeviceChange,
  dateMode,
  onDateModeChange,
  date,
  onDateChange,
  toDate,
  onToDateChange,
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  maxDate,
  downtimeMinutes,
  validDowntime,
  notice,
  existing,
  onSubmit,
  onReset,
}: ReportFormProps) {
  const addingNew = device === "__new";
  const uptime = MINUTES_PER_DAY - downtimeMinutes;
  const uptimePercent = (uptime / MINUTES_PER_DAY) * 100;

  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold">Tambah laporan</h2>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="device">
            Device CCTV
          </label>
          <select
            id="device"
            value={device}
            onChange={(event) => onDeviceChange(event.target.value)}
            className={inputClass}
          >
            <option value="">Pilih device…</option>
            {devices.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="__new">Tambah device baru…</option>
          </select>
          {addingNew && (
            <input
              value={newDevice}
              onChange={(event) => onNewDeviceChange(event.target.value)}
              placeholder="Nama device baru"
              className={cn(inputClass, "mt-2")}
              autoFocus
            />
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
            <button
              type="button"
              onClick={() => onDateModeChange(dateMode === "single" ? "range" : "single")}
              className="text-xs font-medium text-primary hover:underline"
            >
              {dateMode === "single" ? "Rentang tanggal →" : "← Satu tanggal"}
            </button>
          </div>

          {dateMode === "single" ? (
            <div className="relative">
              <IconCalendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                max={maxDate}
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className={cn(inputClass, "pl-9")}
              />
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                type="date"
                max={maxDate}
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className={inputClass}
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <input
                type="date"
                max={maxDate}
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Downtime</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sr-only" htmlFor="hours">Jam downtime</label>
              <input
                id="hours"
                type="number"
                min="0"
                max="24"
                inputMode="numeric"
                value={hours}
                onChange={(event) => onHoursChange(event.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">jam</p>
            </div>
            <div>
              <label className="sr-only" htmlFor="minutes">Menit downtime</label>
              <input
                id="minutes"
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => onMinutesChange(event.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">menit</p>
            </div>
          </div>
        </fieldset>

        <div className="space-y-2 rounded-md bg-muted/50 px-3 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Downtime</span>
            <span className={cn("font-semibold tabular-nums", validDowntime ? "text-red-600" : "text-muted-foreground")}>
              {validDowntime ? formatDuration(downtimeMinutes) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Uptime</span>
            <span className="font-semibold tabular-nums">
              {validDowntime ? formatDuration(uptime) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Persentase</span>
            <span className={cn("font-semibold tabular-nums", validDowntime && uptimePercent >= 99.9 ? "text-emerald-600" : "")}>
              {validDowntime ? percent(uptimePercent) : "—"}
            </span>
          </div>
        </div>

        {existing && dateMode === "single" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Data {existing.device} untuk {formatShortDate(existing.date)} sudah ada (downtime{" "}
            {formatDuration(existing.downtimeMinutes)}). Simpan untuk memperbarui.
          </p>
        )}

        {notice && (
          <p role="status" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {notice}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <IconCheck className="size-4" />
            Simpan
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset form"
            className="inline-flex h-10 items-center justify-center rounded-full border bg-white px-3 text-sm font-medium hover:bg-muted"
          >
            <IconRotate className="size-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
