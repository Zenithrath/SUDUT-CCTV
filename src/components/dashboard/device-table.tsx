"use client";

import { useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { formatDuration, formatHumanDuration } from "@/lib/duration";
import {
  formatDate,
  MINUTES_PER_DAY,
  percent,
  type DeviceSummary,
  type FilterStatus,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

type DeviceTableProps = {
  summaries: DeviceSummary[];
  filterStatus: FilterStatus;
  selectedDevice: string;
  onSelectedDeviceChange: (device: string) => void;
  onDelete: (id: string) => void;
};

export function DeviceTable({ summaries, filterStatus, selectedDevice, onSelectedDeviceChange, onDelete }: DeviceTableProps) {
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
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <label className="text-xs font-medium text-muted-foreground">Pilih device:</label>
        <input
          type="text"
          value={selectedDevice}
          onChange={(event) => {
            onSelectedDeviceChange(event.target.value);
            setConfirmingId(null);
          }}
          list="device-list"
          placeholder="Ketik atau pilih device…"
          className="h-8 w-64 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary"
        />
        <datalist id="device-list">
          {visibleSummaries.map((s) => (
            <option key={s.device} value={s.device}>
              {s.device} {s.days > 0 ? `(${s.days} hari)` : "(belum ada data)"}
            </option>
          ))}
        </datalist>
        {summary && summary.days > 0 && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="tabular-nums text-muted-foreground">
              {summary.days} hari
            </span>
            <span className={cn("tabular-nums font-medium", hasDowntime ? "text-red-600" : "text-muted-foreground")}>
              Downtime: {formatHumanDuration(summary.totalDowntime)}
            </span>
            <span className="tabular-nums font-medium text-slate-700">
              Uptime: {formatHumanDuration(summary.totalUptime)}
            </span>
            <span className="tabular-nums font-medium">
              {percent(summary.uptimePercent)}
            </span>
            <span className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              hasDowntime ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
            )}>
              {hasDowntime ? "Downtime" : "Normal"}
            </span>
          </div>
        )}
      </div>

      {summary && summary.days > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                <th className="px-4 py-2.5 font-semibold">Downtime</th>
                <th className="px-4 py-2.5 font-semibold">Uptime</th>
                <th className="px-4 py-2.5 font-semibold">Uptime %</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const uptime = MINUTES_PER_DAY - record.downtimeMinutes;
                const isDown = record.downtimeMinutes > 0;
                return (
                  <tr key={record.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-2.5">{formatDate(record.date)}</td>
                    <td className={cn("px-4 py-2.5 tabular-nums", isDown ? "font-medium text-red-600" : "text-slate-400")}>
                      {formatDuration(record.downtimeMinutes)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-slate-700">{formatDuration(uptime)}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">{percent((uptime / MINUTES_PER_DAY) * 100)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        isDown ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
                      )}>
                        {isDown ? "Down" : "OK"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {confirmingId === record.id ? (
                        <button
                          onClick={() => {
                            onDelete(record.id);
                            setConfirmingId(null);
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Hapus?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(record.id)}
                          title="Hapus"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
          Belum ada data untuk device ini.
        </div>
      )}
    </div>
  );
}
