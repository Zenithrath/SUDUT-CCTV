import { formatDuration } from "@/lib/duration";
import { loadDevices } from "@/lib/devices";

export type DailyRecord = {
  id: string;
  device: string;
  date: string;
  downtimeMinutes: number;
  savedAt: string;
};

export type FilterStatus = "all" | "downtime" | "normal";
export type DeviceSort = "name" | "downtime";
export type UptimeTier = "sehat" | "waspada" | "gangguan";

export type DeviceSummary = {
  device: string;
  records: DailyRecord[];
  days: number;
  totalDowntime: number;
  totalUptime: number;
  averageDowntime: number;
  uptimePercent: number;
  tier: UptimeTier;
};

export const STORAGE_KEY = "sudut-cctv-daily-reports-v1";
export const MINUTES_PER_DAY = 1440;
function deviceSeries(area: string, total: number) {
  return Array.from(
    { length: total },
    (_, index) => `CCTV ${area} ${String.fromCharCode(65 + index)}`,
  );
}

export const DEFAULT_DEVICES = [
  ...deviceSeries("Head Office", 20),
  ...deviceSeries("Kantor APS", 10),
];

const EXCEL_BORDER = {
  top: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  bottom: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  left: { style: "thin" as const, color: { rgb: "D1D5DB" } },
  right: { style: "thin" as const, color: { rgb: "D1D5DB" } },
};

const EXCEL_STYLES = {
  title: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "0F172A" } },
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 16 },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
  },
  meta: {
    font: { color: { rgb: "475569" }, italic: true, sz: 10 },
    alignment: { vertical: "center" as const },
  },
  groupHeader: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "1E3A5F" } },
    font: { color: { rgb: "FFFFFF" }, bold: true },
    alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
    border: EXCEL_BORDER,
  },
  subHeader: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "DBEAFE" } },
    font: { color: { rgb: "1E3A5F" }, bold: true },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
  date: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "F8FAFC" } },
    font: { color: { rgb: "334155" }, bold: true },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
  data: {
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
  downtime: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "FEE2E2" } },
    font: { color: { rgb: "B91C1C" }, bold: true },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
  total: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "E2E8F0" } },
    font: { color: { rgb: "0F172A" }, bold: true },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
  overall: {
    fill: { patternType: "solid" as const, fgColor: { rgb: "14532D" } },
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 14 },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: EXCEL_BORDER,
  },
};

function styleExcelCell(
  worksheet: Record<string, { s?: unknown }>,
  address: string,
  style: unknown,
) {
  const cell = worksheet[address];
  if (cell) cell.s = style;
}

function styleExcelRow(
  worksheet: Record<string, { s?: unknown }>,
  row: number,
  fromColumn: number,
  toColumn: number,
  style: unknown,
  encodeCell: (address: { r: number; c: number }) => string,
) {
  for (let column = fromColumn; column <= toColumn; column++) {
    styleExcelCell(worksheet, encodeCell({ r: row, c: column }), style);
  }
}

export function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDateParts(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return { key: `${y}-${m}-${d}`, y, m, d };
}

export function backfillDateRange(
  records: DailyRecord[],
  from: string,
  to: string,
): DailyRecord[] {
  const todayStr = today();
  const start = from && from < to ? from : to;
  const end = to && to < todayStr ? to : todayStr;
  if (!start || !end || end < start) return [...records];

  const result = [...records];
  const allDevices = allDeviceNames(records);

  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (cursor <= last) {
    const { key } = formatDateParts(cursor);
    for (const device of allDevices) {
      const hasRecord = result.some(
        (r) => r.date === key && r.device === device,
      );
      if (!hasRecord) {
        result.push({
          id: `auto-${device}-${key}`,
          device,
          date: key,
          downtimeMinutes: 0,
          savedAt: "",
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function safeRecords(value: string | null): DailyRecord[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DailyRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as DailyRecord).id === "string" &&
        typeof (item as DailyRecord).device === "string" &&
        typeof (item as DailyRecord).date === "string" &&
        Number.isInteger((item as DailyRecord).downtimeMinutes) &&
        (item as DailyRecord).downtimeMinutes >= 0 &&
        (item as DailyRecord).downtimeMinutes <= MINUTES_PER_DAY,
    );
  } catch {
    return [];
  }
}

export function allDeviceNames(records: DailyRecord[]): string[] {
  const names = new Set(loadDevices());
  for (const record of records) names.add(record.device);
  return [...names].sort((a, b) => a.localeCompare(b, "id"));
}

export function findRecord(
  records: DailyRecord[],
  device: string,
  date: string,
): DailyRecord | null {
  return (
    records.find(
      (record) =>
        record.date === date &&
        record.device.toLowerCase() === device.toLowerCase(),
    ) ?? null
  );
}

export function filterRecords(
  records: DailyRecord[],
  filters: { device?: string; from?: string; to?: string; status?: FilterStatus },
): DailyRecord[] {
  const device = filters.device?.trim().toLowerCase() ?? "";
  return records
    .filter((record) => {
      if (device && !record.device.toLowerCase().includes(device)) return false;
      if (filters.from && record.date < filters.from) return false;
      if (filters.to && record.date > filters.to) return false;
      if (filters.status === "downtime" && record.downtimeMinutes === 0) return false;
      if (filters.status === "normal" && record.downtimeMinutes !== 0) return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.device.localeCompare(b.device, "id"),
    );
}

export function uptimeTier(percent: number): UptimeTier {
  if (percent >= 99.9) return "sehat";
  if (percent >= 98) return "waspada";
  return "gangguan";
}

export function deviceSummaries(
  records: DailyRecord[],
  sort: DeviceSort = "name",
  deviceNames = loadDevices(),
): DeviceSummary[] {
  const byDevice = new Map<string, DailyRecord[]>();
  for (const name of deviceNames) {
    byDevice.set(name, []);
  }
  for (const record of records) {
    const list = byDevice.get(record.device) ?? [];
    list.push(record);
    byDevice.set(record.device, list);
  }

  const summaries = [...byDevice.entries()].map(([device, list]) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    const days = sorted.length;
    const totalDowntime = sorted.reduce(
      (sum, record) => sum + record.downtimeMinutes,
      0,
    );
    const totalUptime = days * MINUTES_PER_DAY - totalDowntime;
    const uptimePercent = days
      ? (totalUptime / (days * MINUTES_PER_DAY)) * 100
      : 0;
    return {
      device,
      records: sorted,
      days,
      totalDowntime,
      totalUptime,
      averageDowntime: days ? Math.round(totalDowntime / days) : 0,
      uptimePercent,
      tier: uptimeTier(uptimePercent),
    };
  });

  if (sort === "downtime") {
    return summaries.sort(
      (a, b) =>
        b.totalDowntime - a.totalDowntime || a.device.localeCompare(b.device, "id"),
    );
  }
  return summaries.sort((a, b) => a.device.localeCompare(b.device, "id"));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function percent(value: number) {
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function generateDummyData(): DailyRecord[] {
  const records: DailyRecord[] = [];
  const todayDate = new Date();
  const offset = todayDate.getTimezoneOffset() * 60_000;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dateObj = new Date(todayDate.getTime() - offset - dayOffset * 86400000);
    const dateStr = dateObj.toISOString().slice(0, 10);

    for (const device of DEFAULT_DEVICES) {
      const hasDowntime = Math.random() < 0.35;
      const downtimeMinutes = hasDowntime
        ? Math.floor(Math.random() * 180) + 5
        : 0;

      records.push({
        id: crypto.randomUUID(),
        device,
        date: dateStr,
        downtimeMinutes,
        savedAt: new Date().toISOString(),
      });
    }
  }
  return records;
}

export function buildExcelCrossTable(
  summaries: DeviceSummary[],
  from: string,
  to: string,
  filterStatus: FilterStatus,
  search: string,
  area = "all",
){
  return import("xlsx-js-style").then((XLSX) => {
    const wb = XLSX.utils.book_new();

    const label = `${formatDate(from)} s/d ${formatDate(to)}`;
    const todayStr = today();
    const start = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);

    const activeDates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= last) {
      activeDates.push(formatDateParts(cursor).key);
      cursor.setDate(cursor.getDate() + 1);
    }
    const displayDates = filterStatus === "downtime"
      ? activeDates.filter((date) =>
          summaries.some((summary) =>
            summary.records.some(
              (record) => record.date === date && record.downtimeMinutes > 0,
            ),
          ),
        )
      : activeDates;

    const headerRow1 = ["Tanggal"];
    const headerRow2: string[] = [""];
    for (const s of summaries) {
      headerRow1.push(s.device.replace("CCTV ", ""));
      headerRow1.push("");
      headerRow2.push("Down");
      headerRow2.push("Up");
    }

    const rows: (string | number)[][] = [];
    for (const d of displayDates) {
      const isPast = d <= todayStr;
      const row: (string | number)[] = [
        new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${d}T00:00:00`)),
      ];
      for (const s of summaries) {
        const rec = s.records.find((r) => r.date === d);
        if (rec) {
          const ut = MINUTES_PER_DAY - rec.downtimeMinutes;
          row.push(formatDuration(rec.downtimeMinutes), formatDuration(ut));
        } else if (isPast) {
          row.push(formatDuration(0), formatDuration(MINUTES_PER_DAY));
        } else {
          row.push("-", "-");
        }
      }
      rows.push(row);
    }

    const percentageRows = [
      [
        "Downtime %",
        ...summaries.flatMap((summary) => [
          `${(100 - summary.uptimePercent).toFixed(2)}%`,
          "",
        ]),
      ],
      [
        "Uptime %",
        ...summaries.flatMap((summary) => [
          "",
          `${summary.uptimePercent.toFixed(2)}%`,
        ]),
      ],
    ];
    const filterLabel = filterStatus === "downtime" ? "Ada downtime" : filterStatus === "normal" ? "Normal" : "Semua";
    const overallAvailableMinutes = summaries.reduce(
      (sum, summary) => sum + summary.days * MINUTES_PER_DAY,
      0,
    );
    const overallDowntimeMinutes = summaries.reduce(
      (sum, summary) => sum + summary.totalDowntime,
      0,
    );
    const overallDowntimePercent = overallAvailableMinutes
      ? (overallDowntimeMinutes / overallAvailableMinutes) * 100
      : 0;
    const overallUptimePercent = 100 - overallDowntimePercent;
    const overallRow = [
      `TOTAL KESELURUHAN — Uptime ${overallUptimePercent.toFixed(2)}% | Downtime ${overallDowntimePercent.toFixed(2)}%`,
    ];
    const meta = [
      ["Laporan Uptime CCTV"],
      [`Periode: ${label}`],
      [`Filter: ${filterLabel}${search ? ` | Pencarian: ${search}` : ""} | Area: ${area === "all" ? "Semua area" : area}`],
      [`Keseluruhan: Uptime ${overallUptimePercent.toFixed(2)}% | Downtime ${overallDowntimePercent.toFixed(2)}%`],
      [`Diekspor: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      ...meta,
      headerRow1,
      headerRow2,
      ...rows,
      [],
      ...percentageRows,
      [],
      overallRow,
    ]);
    const firstDataRow = meta.length + 2;
    const lastColumn = summaries.length * 2;

    ws["!merges"] = [
      ...meta.map((_, row) => ({ s: { r: row, c: 0 }, e: { r: row, c: lastColumn } })),
      { s: { r: meta.length, c: 0 }, e: { r: meta.length + 1, c: 0 } },
      ...summaries.map((_, index) => ({
        s: { r: meta.length, c: 1 + index * 2 },
        e: { r: meta.length, c: 2 + index * 2 },
      })),
    ];
    styleExcelCell(ws, "A1", EXCEL_STYLES.title);
    for (let row = 1; row < meta.length; row++) {
      styleExcelCell(ws, XLSX.utils.encode_cell({ r: row, c: 0 }), EXCEL_STYLES.meta);
    }
    styleExcelCell(
      ws,
      XLSX.utils.encode_cell({ r: meta.length, c: 0 }),
      EXCEL_STYLES.groupHeader,
    );
    for (const [deviceIndex] of summaries.entries()) {
      const startColumn = 1 + deviceIndex * 2;
      styleExcelCell(
        ws,
        XLSX.utils.encode_cell({ r: meta.length, c: startColumn }),
        EXCEL_STYLES.groupHeader,
      );
      styleExcelRow(
        ws,
        meta.length + 1,
        startColumn,
        startColumn + 1,
        EXCEL_STYLES.subHeader,
        XLSX.utils.encode_cell,
      );
    }
    for (const [rowIndex, date] of displayDates.entries()) {
      const sheetRow = firstDataRow + rowIndex;
      styleExcelCell(
        ws,
        XLSX.utils.encode_cell({ r: sheetRow, c: 0 }),
        EXCEL_STYLES.date,
      );
      for (const [deviceIndex, summary] of summaries.entries()) {
        const record = summary.records.find((item) => item.date === date);
        const downColumn = 1 + deviceIndex * 2;
        styleExcelRow(
          ws,
          sheetRow,
          downColumn,
          downColumn + 1,
          EXCEL_STYLES.data,
          XLSX.utils.encode_cell,
        );
        if (record && record.downtimeMinutes > 0) {
          styleExcelCell(
            ws,
            XLSX.utils.encode_cell({ r: sheetRow, c: downColumn }),
            EXCEL_STYLES.downtime,
          );
        }
      }
    }
    const firstPercentageRow = firstDataRow + displayDates.length + 1;
    for (let rowOffset = 0; rowOffset < percentageRows.length; rowOffset++) {
      styleExcelRow(
        ws,
        firstPercentageRow + rowOffset,
        0,
        lastColumn,
        EXCEL_STYLES.total,
        XLSX.utils.encode_cell,
      );
    }
    const overallRowIndex = firstPercentageRow + percentageRows.length + 1;
    ws["!merges"].push({
      s: { r: overallRowIndex, c: 0 },
      e: { r: overallRowIndex, c: lastColumn },
    });
    styleExcelCell(
      ws,
      XLSX.utils.encode_cell({ r: overallRowIndex, c: 0 }),
      EXCEL_STYLES.overall,
    );
    ws["!cols"] = [{ wch: 11 }, ...summaries.flatMap(() => [{ wch: 8 }, { wch: 8 }])];
    ws["!rows"] = [
      { hpt: 28 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 34 },
      { hpt: 20 },
      ...displayDates.map(() => ({ hpt: 19 })),
      { hpt: 8 },
      { hpt: 21 },
      { hpt: 21 },
      { hpt: 8 },
      { hpt: 28 },
    ];
    ws["!pageSetup"] = { fitToWidth: 1, fitToHeight: 0, orientation: "landscape" };
    XLSX.utils.book_append_sheet(wb, ws, "Semua Device");

    const downtimeMeta = [
      ["Laporan Downtime CCTV"],
      [`Periode: ${label}`],
      ["Filter: Hanya tanggal dengan downtime"],
      [`Keseluruhan: Uptime ${overallUptimePercent.toFixed(2)}% | Downtime ${overallDowntimePercent.toFixed(2)}%`],
      [`Diekspor: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}`],
    ];
    const downtimeHeaderRow1 = ["Tanggal"];
    const downtimeHeaderRow2: string[] = [""];
    for (const summary of summaries) {
      downtimeHeaderRow1.push(summary.device.replace("CCTV ", ""), "");
      downtimeHeaderRow2.push("Down", "Up");
    }
    const downtimeDates = activeDates.filter((date) =>
      summaries.some((summary) =>
        summary.records.some(
          (record) => record.date === date && record.downtimeMinutes > 0,
        ),
      ),
    );
    const downtimeRows = downtimeDates.map((date) => {
      const row: string[] = [
        new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`)),
      ];
      for (const summary of summaries) {
        const record = summary.records.find((item) => item.date === date);
        const downtime = record?.downtimeMinutes ?? 0;
        row.push(formatDuration(downtime), formatDuration(MINUTES_PER_DAY - downtime));
      }
      return row;
    });
    const downtimeWs = XLSX.utils.aoa_to_sheet([
      ...downtimeMeta,
      downtimeHeaderRow1,
      downtimeHeaderRow2,
      ...downtimeRows,
      [],
      ...percentageRows,
      [],
      overallRow,
    ]);
    const downtimeLastColumn = lastColumn;
    const downtimeFirstDataRow = downtimeMeta.length + 2;
    downtimeWs["!merges"] = [
      ...downtimeMeta.map((_, row) => ({
        s: { r: row, c: 0 },
        e: { r: row, c: downtimeLastColumn },
      })),
      { s: { r: downtimeMeta.length, c: 0 }, e: { r: downtimeMeta.length + 1, c: 0 } },
      ...summaries.map((_, index) => ({
        s: { r: downtimeMeta.length, c: 1 + index * 2 },
        e: { r: downtimeMeta.length, c: 2 + index * 2 },
      })),
    ];
    styleExcelCell(downtimeWs, "A1", EXCEL_STYLES.title);
    for (let row = 1; row < downtimeMeta.length; row++) {
      styleExcelCell(
        downtimeWs,
        XLSX.utils.encode_cell({ r: row, c: 0 }),
        EXCEL_STYLES.meta,
      );
    }
    styleExcelRow(
      downtimeWs,
      downtimeMeta.length,
      0,
      downtimeLastColumn,
      EXCEL_STYLES.groupHeader,
      XLSX.utils.encode_cell,
    );
    for (const [deviceIndex] of summaries.entries()) {
      const startColumn = 1 + deviceIndex * 2;
      styleExcelCell(
        downtimeWs,
        XLSX.utils.encode_cell({ r: downtimeMeta.length, c: startColumn }),
        EXCEL_STYLES.groupHeader,
      );
      styleExcelRow(
        downtimeWs,
        downtimeMeta.length + 1,
        startColumn,
        startColumn + 1,
        EXCEL_STYLES.subHeader,
        XLSX.utils.encode_cell,
      );
    }
    for (const [rowIndex, date] of downtimeDates.entries()) {
      const sheetRow = downtimeFirstDataRow + rowIndex;
      styleExcelCell(
        downtimeWs,
        XLSX.utils.encode_cell({ r: sheetRow, c: 0 }),
        EXCEL_STYLES.date,
      );
      for (const [deviceIndex, summary] of summaries.entries()) {
        const startColumn = 1 + deviceIndex * 2;
        styleExcelRow(
          downtimeWs,
          sheetRow,
          startColumn,
          startColumn + 1,
          EXCEL_STYLES.data,
          XLSX.utils.encode_cell,
        );
        const record = summary.records.find((item) => item.date === date);
        if (record && record.downtimeMinutes > 0) {
          styleExcelCell(
            downtimeWs,
            XLSX.utils.encode_cell({ r: sheetRow, c: startColumn }),
            EXCEL_STYLES.downtime,
          );
        }
      }
    }
    const downtimeFirstPercentageRow = downtimeFirstDataRow + downtimeDates.length + 1;
    for (let rowOffset = 0; rowOffset < percentageRows.length; rowOffset++) {
      styleExcelRow(
        downtimeWs,
        downtimeFirstPercentageRow + rowOffset,
        0,
        downtimeLastColumn,
        EXCEL_STYLES.total,
        XLSX.utils.encode_cell,
      );
    }
    const downtimeOverallRowIndex = downtimeFirstPercentageRow + percentageRows.length + 1;
    downtimeWs["!merges"].push({
      s: { r: downtimeOverallRowIndex, c: 0 },
      e: { r: downtimeOverallRowIndex, c: downtimeLastColumn },
    });
    styleExcelCell(
      downtimeWs,
      XLSX.utils.encode_cell({ r: downtimeOverallRowIndex, c: 0 }),
      EXCEL_STYLES.overall,
    );
    downtimeWs["!cols"] = [
      { wch: 11 },
      ...summaries.flatMap(() => [{ wch: 8 }, { wch: 8 }]),
    ];
    downtimeWs["!rows"] = [
      { hpt: 28 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 34 },
      { hpt: 20 },
      ...downtimeRows.map(() => ({ hpt: 19 })),
      { hpt: 8 },
      { hpt: 21 },
      { hpt: 21 },
      { hpt: 8 },
      { hpt: 28 },
    ];
    downtimeWs["!pageSetup"] = { fitToWidth: 1, fitToHeight: 0, orientation: "landscape" };
    XLSX.utils.book_append_sheet(wb, downtimeWs, "Daftar Downtime");
    return wb;
  });
}

export function buildExcelPerDevice(
  summaries: DeviceSummary[],
  selectedDevice: string,
  search: string,
  filterStatus: FilterStatus,
  area = "all",
) {
  return import("xlsx-js-style").then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const summary = summaries.find((s) => s.device === selectedDevice);
    const records = summary?.records ?? [];
    const hasDowntime = (summary?.totalDowntime ?? 0) > 0;

    const filterLabel = filterStatus === "downtime" ? "Ada downtime" : filterStatus === "normal" ? "Normal" : "Semua";
    const meta = [
      [`Laporan Uptime CCTV — ${selectedDevice}`],
      [`Filter: ${filterLabel}${search ? ` | Pencarian: ${search}` : ""} | Area: ${area === "all" ? "Semua area" : area}`],
      [`Diekspor: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}`],
      [],
    ];

    if (records.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([...meta, ["Belum ada data untuk device ini."]]);
      XLSX.utils.book_append_sheet(wb, ws, selectedDevice.slice(0, 31));
      return wb;
    }

    const header = ["Tanggal", "Downtime", "Uptime", "Downtime %", "Uptime %", "Status"];
    const displayRecords = filterStatus === "downtime"
      ? records.filter((r) => r.downtimeMinutes > 0)
      : filterStatus === "normal"
        ? records.filter((r) => r.downtimeMinutes === 0)
        : records;
    const rows = displayRecords.map((record) => {
      const uptime = MINUTES_PER_DAY - record.downtimeMinutes;
      const pct = (uptime / MINUTES_PER_DAY) * 100;
      return [
        formatDate(record.date),
        formatDuration(record.downtimeMinutes),
        formatDuration(uptime),
        `${((record.downtimeMinutes / MINUTES_PER_DAY) * 100).toFixed(2)}%`,
        `${pct.toFixed(2)}%`,
        record.downtimeMinutes > 0 ? "Down" : "OK",
      ];
    });

    const summaryRow = [
      "TOTAL",
      formatDuration(summary?.totalDowntime ?? 0),
      formatDuration(summary?.totalUptime ?? 0),
      `${(100 - (summary?.uptimePercent ?? 0)).toFixed(2)}%`,
      `${(summary?.uptimePercent ?? 0).toFixed(2)}%`,
      hasDowntime ? "Downtime" : "Normal",
    ];

    const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...rows, [], summaryRow]);
    const firstDataRow = meta.length + 1;
    const lastColumn = header.length - 1;
    const summaryRowIndex = firstDataRow + displayRecords.length + 1;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } },
    ];
    styleExcelCell(ws, "A1", EXCEL_STYLES.title);
    styleExcelCell(ws, "A2", EXCEL_STYLES.meta);
    styleExcelCell(ws, "A3", EXCEL_STYLES.meta);
    styleExcelRow(
      ws,
      meta.length,
      0,
      lastColumn,
      EXCEL_STYLES.groupHeader,
      XLSX.utils.encode_cell,
    );
    for (const [rowIndex, record] of displayRecords.entries()) {
      const sheetRow = firstDataRow + rowIndex;
      styleExcelCell(
        ws,
        XLSX.utils.encode_cell({ r: sheetRow, c: 0 }),
        EXCEL_STYLES.date,
      );
      styleExcelRow(
        ws,
        sheetRow,
        1,
        lastColumn,
        EXCEL_STYLES.data,
        XLSX.utils.encode_cell,
      );
      if (record.downtimeMinutes > 0) {
        styleExcelCell(
          ws,
          XLSX.utils.encode_cell({ r: sheetRow, c: 1 }),
          EXCEL_STYLES.downtime,
        );
        styleExcelCell(
          ws,
          XLSX.utils.encode_cell({ r: sheetRow, c: 5 }),
          EXCEL_STYLES.downtime,
        );
      }
    }
    styleExcelRow(
      ws,
      summaryRowIndex,
      0,
      lastColumn,
      EXCEL_STYLES.total,
      XLSX.utils.encode_cell,
    );
    ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 12 }];
    ws["!rows"] = [
      { hpt: 28 },
      { hpt: 17 },
      { hpt: 17 },
      { hpt: 8 },
      { hpt: 22 },
      ...displayRecords.map(() => ({ hpt: 19 })),
      { hpt: 8 },
      { hpt: 21 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, selectedDevice.slice(0, 31));
    return wb;
  });
}
