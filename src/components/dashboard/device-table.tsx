"use client";

import { useMemo, useState } from "react";
import { IconSearch, IconTrash } from "@tabler/icons-react";
import { formatDuration, formatHumanDuration } from "@/lib/duration";
import {
  formatDate,
  MINUTES_PER_DAY,
  percent,
  type DeviceSummary,
  type FilterStatus,
} from "@/lib/reports";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type DeviceTableProps = {
  summaries: DeviceSummary[];
  filterStatus: FilterStatus;
  selectedDevice: string;
  onSelectedDeviceChange: (device: string) => void;
  onDelete: (id: string) => void;
};

export function DeviceTable({
  summaries,
  filterStatus,
  selectedDevice,
  onSelectedDeviceChange,
  onDelete,
}: DeviceTableProps) {
  const visibleSummaries = useMemo(() => {
    if (filterStatus === "downtime") return summaries.filter((s) => s.totalDowntime > 0);
    if (filterStatus === "normal") return summaries.filter((s) => s.days > 0 && s.totalDowntime === 0);
    return summaries;
  }, [summaries, filterStatus]);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const summary = summaries.find((s) => s.device === selectedDevice);
  const records = useMemo(() => {
    const src = summary?.records ?? [];
    if (filterStatus === "downtime") return src.filter((r) => r.downtimeMinutes > 0);
    if (filterStatus === "normal") return src.filter((r) => r.downtimeMinutes === 0);
    return src;
  }, [summary, filterStatus]);
  const hasDowntime = (summary?.totalDowntime ?? 0) > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={selectedDevice}
            onChange={(event) => {
              onSelectedDeviceChange(event.target.value);
              setConfirmingId(null);
            }}
            list="device-list"
            placeholder="Ketik atau pilih device…"
            className="w-64 pl-9"
          />
          <datalist id="device-list">
            {visibleSummaries.map((s) => (
              <option key={s.device} value={s.device}>
                {s.device} {s.days > 0 ? `(${s.days} hari)` : "(belum ada data)"}
              </option>
            ))}
          </datalist>
        </div>
        {summary && summary.days > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="tabular-nums text-muted-foreground">
              {summary.days} hari
            </span>
            <span
              className={cn(
                "tabular-nums font-medium",
                hasDowntime ? "text-destructive" : "text-muted-foreground",
              )}
            >
              Downtime: {formatHumanDuration(summary.totalDowntime)}
            </span>
            <span className="tabular-nums font-medium text-foreground">
              Uptime: {formatHumanDuration(summary.totalUptime)}
            </span>
            <span className="tabular-nums font-semibold">{percent(summary.uptimePercent)}</span>
            <Badge variant={hasDowntime ? "destructive" : "ok"}>
              {hasDowntime ? "Downtime" : "Normal"}
            </Badge>
          </div>
        )}
      </div>

      {summary && summary.days > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Downtime</th>
                <th className="px-4 py-2.5 font-medium">Uptime</th>
                <th className="px-4 py-2.5 font-medium">Uptime %</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const uptime = MINUTES_PER_DAY - record.downtimeMinutes;
                const isDown = record.downtimeMinutes > 0;
                return (
                  <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-2.5">{formatDate(record.date)}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 tabular-nums",
                        isDown ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {formatDuration(record.downtimeMinutes)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">
                      {formatDuration(uptime)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {percent((uptime / MINUTES_PER_DAY) * 100)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={isDown ? "destructive" : "ok"}>
                        {isDown ? "Down" : "OK"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {confirmingId === record.id ? (
                        <button
                          onClick={() => {
                            onDelete(record.id);
                            setConfirmingId(null);
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                        >
                          Hapus?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(record.id)}
                          aria-label="Hapus"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <IconTrash className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Pilih device di atas untuk melihat rinciannya.
        </div>
      )}
    </div>
  );
}