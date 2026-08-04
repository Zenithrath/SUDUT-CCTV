"use client";

import { Fragment, useMemo } from "react";
import { formatDuration } from "@/lib/duration";
import { cn } from "@/lib/utils";
import type { DeviceSummary, FilterStatus } from "@/lib/reports";

type CrossTableProps = {
  summaries: DeviceSummary[];
  year: number;
  month: number;
  filterStatus: FilterStatus;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDateLabel(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(
    new Date(`${dateStr}T00:00:00`),
  );
}

function buildDateList(year: number, month: number) {
  const days = getDaysInMonth(year, month);
  const result: string[] = [];
  for (let d = 1; d <= days; d++) {
    const m = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    result.push(`${year}-${m}-${dd}`);
  }
  return result;
}

export function CrossTable({ summaries, year, month, filterStatus }: CrossTableProps) {
  const allDates = useMemo(() => buildDateList(year, month), [year, month]);
  const activeDates = useMemo(() => {
    if (filterStatus === "all") return allDates;
    const datesWithData = new Set(summaries.flatMap((s) => s.records.map((r) => r.date)));
    return allDates.filter((d) => datesWithData.has(d));
  }, [allDates, summaries, filterStatus]);

  const deviceRecords = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const s of summaries) {
      const dateMap = new Map<string, number>();
      for (const r of s.records) {
        dateMap.set(r.date, r.downtimeMinutes);
      }
      map.set(s.device, dateMap);
    }
    return map;
  }, [summaries]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-600">
              Tanggal
            </th>
            {summaries.map((s) => (
              <th
                key={s.device}
                colSpan={2}
                className="border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700"
              >
                {s.device.replace("CCTV ", "")}
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50" />
            {summaries.map((s) => (
              <Fragment key={s.device}>
                <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-semibold uppercase text-slate-500">
                  Down
                </th>
                <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-semibold uppercase text-slate-500">
                  Up
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeDates.map((date) => (
            <tr key={date}>
              <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatDateLabel(date)}
              </td>
              {summaries.map((s) => {
                const dateMap = deviceRecords.get(s.device);
                const hasData = dateMap?.has(date) ?? false;
                const dt = dateMap?.get(date) ?? 0;
                const ut = 1440 - dt;
                return (
                  <Fragment key={s.device}>
                    <td
                      className={cn(
                        "border border-slate-200 px-2 py-1.5 text-center tabular-nums text-xs",
                        hasData && dt > 0 ? "font-semibold text-red-600" : "text-slate-400",
                      )}
                    >
                      {hasData ? formatDuration(dt) : "-"}
                    </td>
                    <td
                      className={cn(
                        "border border-slate-200 px-2 py-1.5 text-center tabular-nums text-xs",
                        hasData ? "font-medium text-slate-700" : "text-slate-400",
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

type DailyCrossTableProps = {
  summaries: DeviceSummary[];
};

export function DailyCrossTable({ summaries }: DailyCrossTableProps) {
  const allDates = [...new Set(summaries.flatMap((s) => s.records.map((r) => r.date)))].sort().reverse();

  if (allDates.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted-foreground">
        Belum ada data. Input downtime lewat form.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-200 bg-slate-100 px-3 py-2 text-left text-xs font-semibold text-slate-600">
              Tanggal
            </th>
            {summaries.map((s) => (
              <th
                key={s.device}
                colSpan={2}
                className="border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700"
              >
                {s.device.replace("CCTV ", "")}
              </th>
            ))}
          </tr>
          <tr>
            <th className="border border-slate-200 bg-slate-50" />
            {summaries.map((s) => (
              <Fragment key={s.device}>
                <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-semibold uppercase text-slate-500">
                  Down
                </th>
                <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-semibold uppercase text-slate-500">
                  Up
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {allDates.map((date) => (
            <tr key={date}>
              <td className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`))}
              </td>
              {summaries.map((s) => {
                const record = s.records.find((r) => r.date === date);
                const dt = record?.downtimeMinutes ?? 0;
                const ut = 1440 - dt;
                return (
                  <Fragment key={s.device}>
                    <td className={cn(
                      "border border-slate-200 px-2 py-2 text-center tabular-nums",
                      dt > 0 ? "font-medium text-red-600" : "text-slate-400",
                    )}>
                      {formatDuration(dt)}
                    </td>
                    <td className="border border-slate-200 px-2 py-2 text-center tabular-nums font-medium text-slate-700">
                      {formatDuration(ut)}
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
