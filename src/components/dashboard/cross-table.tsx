"use client";

import { Fragment, useMemo } from "react";
import { formatDuration } from "@/lib/duration";
import { cn } from "@/lib/utils";
import { formatShortDate, MINUTES_PER_DAY, today, type DeviceSummary, type FilterStatus } from "@/lib/reports";
import { IconTable } from "@tabler/icons-react";

type CrossTableProps = {
  summaries: DeviceSummary[];
  from: string;
  to: string;
  filterStatus: FilterStatus;
};

function buildDateList(from: string, to: string) {
  const result: string[] = [];
  const todayStr = today();
  if (!from || !to || to < from || from > todayStr) return result;
  const cursor = new Date(`${from}T00:00:00`);
  const last = new Date(`${to}T00:00:00`);
  while (cursor <= last) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (key > todayStr) break;
    result.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function CrossTable({ summaries, from, to, filterStatus }: CrossTableProps) {
  const allDates = useMemo(() => buildDateList(from, to), [from, to]);

  const activeDates = useMemo(() => {
    if (filterStatus === "downtime") {
      const daysWithDowntime = new Set<string>();
      for (const s of summaries) {
        for (const r of s.records) {
          if (r.downtimeMinutes > 0) daysWithDowntime.add(r.date);
        }
      }
      return allDates.filter((d) => daysWithDowntime.has(d));
    }
    return allDates;
  }, [allDates, summaries, filterStatus]);

  const deviceRecords = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const s of summaries) {
      const dateMap = new Map<string, number>();
      for (const r of s.records) dateMap.set(r.date, r.downtimeMinutes);
      map.set(s.device, dateMap);
    }
    return map;
  }, [summaries]);

  const visibleDevices = summaries.filter((s) => s.days > 0);

  if (visibleDevices.length === 0 || activeDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
        <IconTable className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">
          {filterStatus === "downtime"
            ? "Tidak ada downtime di periode ini"
            : "Belum ada data di periode ini"}
        </p>
        <p className="text-xs text-muted-foreground">
          Gunakan form di samping untuk input downtime, atau pilih periode lain.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-r border-b bg-muted px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
              Tanggal
            </th>
            {visibleDevices.map((s) => (
              <th
                key={s.device}
                colSpan={2}
                className="border-b px-3 py-2 text-center text-xs font-semibold text-foreground"
              >
                {s.device.replace("CCTV ", "")}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 border-r border-b bg-muted" />
            {visibleDevices.map((s) => (
              <Fragment key={s.device}>
                <th className="border-b border-r px-2 py-1 text-center text-[10px] font-medium text-muted-foreground">
                  Down
                </th>
                <th className="border-b px-2 py-1 text-center text-[10px] font-medium text-muted-foreground">
                  Up
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeDates.map((date) => (
            <tr key={date} className="group">
              <td className="sticky left-0 z-10 border-r border-b bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {formatShortDate(date)}
              </td>
              {visibleDevices.map((s) => {
                const dateMap = deviceRecords.get(s.device);
                const hasData = dateMap?.has(date) ?? false;
                const dt = dateMap?.get(date) ?? 0;
                const ut = MINUTES_PER_DAY - dt;
                return (
                  <Fragment key={s.device}>
                    <td
                      className={cn(
                        "border-b border-r px-2 py-1.5 text-center text-xs tabular-nums",
                        hasData && dt > 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {hasData ? formatDuration(dt) : "-"}
                    </td>
                    <td
                      className={cn(
                        "border-b px-2 py-1.5 text-center text-xs tabular-nums",
                        hasData ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {hasData ? formatDuration(ut) : "-"}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}