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
export const DEFAULT_DEVICES = [
  "CCTV Lobby Utama",
  "CCTV Gudang A",
  "CCTV Gudang B",
  "CCTV Area Parkir Utara",
  "CCTV Area Parkir Selatan",
  "CCTV Area Produksi 1",
  "CCTV Area Produksi 2",
  "CCTV Area Produksi 3",
  "CCTV Kantor Direksi",
  "CCTV Kantor HRD",
  "CCTV Kantor Marketing",
  "CCTV Ruang Server",
  "CCTV Ruang Meeting 1",
  "CCTV Ruang Meeting 2",
  "CCTV Dapur Karyawan",
  "CCTV Kantin",
  "CCTV Gudang Bahan Baku",
  "CCTV Gudang Finished Goods",
  "CCTV Loading Dock",
  "CCTV Area Pengiriman",
  "CCTV Security Post",
  "CCTV Gerbang Utama",
  "CCTV Gerbang Belakang",
  "CCTV Taman Depan",
  "CCTV Area Charger Forklift",
  "CCTV QC Lab",
  "CCTV Workshop",
];

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
) {
  return import("xlsx").then((XLSX) => {
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

    const headerRow1 = ["Tanggal"];
    const headerRow2: string[] = [""];
    for (const s of summaries) {
      headerRow1.push(s.device.replace("CCTV ", ""));
      headerRow1.push("");
      headerRow2.push("Down");
      headerRow2.push("Up");
    }

    const rows: (string | number)[][] = [];
    for (const d of activeDates) {
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

    const filterLabel = filterStatus === "downtime" ? "Ada downtime" : filterStatus === "normal" ? "Normal" : "Semua";
    const meta = [
      ["Laporan Uptime CCTV"],
      [`Periode: ${label}`],
      [`Filter: ${filterLabel}${search ? ` | Pencarian: ${search}` : ""}`],
      [`Diekspor: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}`],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...meta, headerRow1, headerRow2, ...rows]);
    ws["!cols"] = [{ wch: 12 }, ...summaries.flatMap(() => [{ wch: 10 }, { wch: 10 }])];
    XLSX.utils.book_append_sheet(wb, ws, "Semua Device");
    return wb;
  });
}

export function buildExcelPerDevice(
  summaries: DeviceSummary[],
  selectedDevice: string,
  search: string,
  filterStatus: FilterStatus,
) {
  return import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const summary = summaries.find((s) => s.device === selectedDevice);
    const records = summary?.records ?? [];
    const hasDowntime = (summary?.totalDowntime ?? 0) > 0;

    const filterLabel = filterStatus === "downtime" ? "Ada downtime" : filterStatus === "normal" ? "Normal" : "Semua";
    const meta = [
      [`Laporan Uptime CCTV — ${selectedDevice}`],
      [`Filter: ${filterLabel}${search ? ` | Pencarian: ${search}` : ""}`],
      [`Diekspor: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}`],
      [],
    ];

    if (records.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([...meta, ["Belum ada data untuk device ini."]]);
      XLSX.utils.book_append_sheet(wb, ws, selectedDevice.slice(0, 31));
      return wb;
    }

    const header = ["Tanggal", "Downtime", "Uptime", "Uptime %", "Status"];
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
        `${pct.toFixed(2)}%`,
        record.downtimeMinutes > 0 ? "Down" : "OK",
      ];
    });

    const summaryRow = [
      "",
      "TOTAL",
      formatDuration(summary?.totalDowntime ?? 0),
      formatDuration(summary?.totalUptime ?? 0),
      `${(summary?.uptimePercent ?? 0).toFixed(2)}%`,
      hasDowntime ? "Downtime" : "Normal",
    ];

    const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...rows, [], summaryRow]);
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, selectedDevice.slice(0, 31));
    return wb;
  });
}
