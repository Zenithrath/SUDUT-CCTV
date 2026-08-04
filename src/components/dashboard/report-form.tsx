"use client";

import { IconCalendar, IconCheck, IconRotate } from "@tabler/icons-react";
import { formatDuration } from "@/lib/duration";
import { formatShortDate, MINUTES_PER_DAY, percent, type DailyRecord } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const dateInputClass = "[&::-webkit-calendar-picker-indicator]:opacity-60";

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
    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">Tambah laporan</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Catat downtime harian per device
        </p>
      </div>

      <form
        className="space-y-4 px-5 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="space-y-1.5">
          <Select
            selectedKey={device || null}
            onSelectionChange={(key) => onDeviceChange(key ? String(key) : "")}
            className="w-full"
          >
            <Label>Device CCTV</Label>
            <SelectTrigger className="w-full">
              <SelectValue>
                {({ isPlaceholder, selectedText }) =>
                  isPlaceholder ? "Pilih device…" : selectedText
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="__new" textValue="__new">Tambah device baru…</SelectItem>
              {devices.map((name) => (
                <SelectItem key={name} id={name} textValue={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {addingNew && (
            <Input
              value={newDevice}
              onChange={(event) => onNewDeviceChange(event.target.value)}
              placeholder="Nama device baru"
              autoFocus
            />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Tanggal</Label>
            <div className="flex rounded-md border border-border bg-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onDateModeChange("single")}
                className={cn(
                  "rounded px-2 py-1 font-medium transition",
                  dateMode === "single"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Satu tanggal
              </button>
              <button
                type="button"
                onClick={() => onDateModeChange("range")}
                className={cn(
                  "rounded px-2 py-1 font-medium transition",
                  dateMode === "range"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Rentang
              </button>
            </div>
          </div>

          {dateMode === "single" ? (
            <div className="relative">
              <IconCalendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                max={maxDate}
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className={cn("pl-9", dateInputClass)}
                aria-label="Tanggal"
              />
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Input
                type="date"
                max={maxDate}
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className={dateInputClass}
                aria-label="Tanggal awal"
              />
              <span className="pb-2 text-xs text-muted-foreground">s/d</span>
              <Input
                type="date"
                max={maxDate}
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className={dateInputClass}
                aria-label="Tanggal akhir"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Downtime</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Input
                type="number"
                min="0"
                max="24"
                inputMode="numeric"
                value={hours}
                onChange={(event) => onHoursChange(event.target.value)}
                aria-label="Jam downtime"
              />
              <p className="text-xs text-muted-foreground">jam</p>
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => onMinutesChange(event.target.value)}
                aria-label="Menit downtime"
              />
              <p className="text-xs text-muted-foreground">menit</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 rounded-md bg-muted/60 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Downtime</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                validDowntime ? "text-destructive" : "text-muted-foreground",
              )}
            >
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
            <span
              className={cn(
                "font-semibold tabular-nums",
                validDowntime && uptimePercent >= 99.9 && "text-ok",
              )}
            >
              {validDowntime ? percent(uptimePercent) : "—"}
            </span>
          </div>
        </div>

        {existing && dateMode === "single" && (
          <p className="rounded-md bg-warn/10 px-3 py-2 text-xs text-warn">
            Data {existing.device} untuk {formatShortDate(existing.date)} sudah
            ada (downtime {formatDuration(existing.downtimeMinutes)}). Simpan
            untuk memperbarui.
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {notice}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            <IconCheck />
            Simpan
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onReset}
            aria-label="Reset form"
          >
            <IconRotate />
          </Button>
        </div>
      </form>
    </section>
  );
}