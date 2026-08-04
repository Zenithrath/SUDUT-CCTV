"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconDownload, IconDatabase } from "@tabler/icons-react";
import { CrossTable } from "@/components/dashboard/cross-table";
import { DeviceTable } from "@/components/dashboard/device-table";
import { ReportForm } from "@/components/dashboard/report-form";
import { formatHumanDuration } from "@/lib/duration";
import {
  allDeviceNames,
  backfillPastDates,
  buildExcelCrossTable,
  buildExcelPerDevice,
  deviceSummaries,
  filterRecords,
  findRecord,
  formatShortDate,
  generateDummyData,
  MINUTES_PER_DAY,
  percent,
  safeRecords,
  STORAGE_KEY,
  today,
  type DailyRecord,
  type DeviceSort,
  type FilterStatus,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

export function DailyReportWorkspace() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  const [device, setDevice] = useState("");
  const [newDevice, setNewDevice] = useState("");
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [date, setDate] = useState(today());
  const [toDate, setToDate] = useState("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<DeviceSort>("name");
  const [viewMode, setViewMode] = useState<"cross" | "summary">("cross");
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDevice, setSelectedDevice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecords(safeRecords(window.localStorage.getItem(STORAGE_KEY)));
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (storageReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, storageReady]);

  const devices = useMemo(() => allDeviceNames(records), [records]);
  const backfilled = useMemo(
    () => backfillPastDates(records, selectedYear, selectedMonth),
    [records, selectedYear, selectedMonth],
  );
  const filtered = useMemo(
    () =>
      filterRecords(backfilled, {
        device: search,
        status: filterStatus,
      }),
    [backfilled, search, filterStatus],
  );
  const summaries = useMemo(() => deviceSummaries(filtered, sortBy), [filtered, sortBy]);
  const visibleSummaries = useMemo(() => {
    let result = summaries;
    if (search) result = result.filter((s) => s.days > 0);
    if (filterStatus === "downtime") result = result.filter((s) => s.totalDowntime > 0);
    if (filterStatus === "normal") result = result.filter((s) => s.days > 0 && s.totalDowntime === 0);
    return result;
  }, [summaries, filterStatus, search]);

  const downtimeMinutes = Number(hours || 0) * 60 + Number(minutes || 0);
  const validDowntime = downtimeMinutes >= 0 && downtimeMinutes <= MINUTES_PER_DAY;
  const finalDeviceName = device === "__new" ? newDevice.trim() : device;
  const existing =
    finalDeviceName && date ? findRecord(records, finalDeviceName, date) : null;

  const totalDowntime = filtered.reduce((sum, record) => sum + record.downtimeMinutes, 0);
  const totalDays = filtered.length;
  const totalUptime = totalDays * MINUTES_PER_DAY - totalDowntime;
  const overallPercent = totalDays ? (totalUptime / (totalDays * MINUTES_PER_DAY)) * 100 : 0;

  function resetForm() {
    setDevice("");
    setNewDevice("");
    setDateMode("single");
    setDate(today());
    setToDate("");
    setHours("0");
    setMinutes("0");
    setNotice(null);
  }

  function clearFilters() {
    setSearch("");
    setFilterStatus("all");
  }

  const filtersActive = Boolean(search || filterStatus !== "all");

  function handleSubmit() {
    const name = finalDeviceName;
    if (!name) {
      setNotice("Pilih device atau tulis nama device baru.");
      return;
    }
    if (!date) {
      setNotice("Tanggal wajib diisi.");
      return;
    }
    if (dateMode === "range" && !toDate) {
      setNotice("Tanggal akhir wajib diisi.");
      return;
    }
    const hourNumber = Number(hours);
    const minuteNumber = Number(minutes);
    if (
      !Number.isInteger(hourNumber) ||
      !Number.isInteger(minuteNumber) ||
      hourNumber < 0 ||
      hourNumber > 24 ||
      minuteNumber < 0 ||
      minuteNumber > 59 ||
      (hourNumber === 24 && minuteNumber !== 0)
    ) {
      setNotice("Downtime harus antara 00:00 sampai 24:00.");
      return;
    }

    const startDate = new Date(`${date}T00:00:00`);
    const endDate = dateMode === "range" ? new Date(`${toDate}T00:00:00`) : startDate;
    if (endDate < startDate) {
      setNotice("Tanggal akhir harus setelah tanggal awal.");
      return;
    }

    const dates: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (dates.length > 100) {
      setNotice("Maksimal 100 tanggal sekaligus.");
      return;
    }

    let updated = 0;
    let created = 0;
    setRecords((current) => {
      const next = [...current];
      for (const dt of dates) {
        const record: DailyRecord = {
          id: crypto.randomUUID(),
          device: name,
          date: dt,
          downtimeMinutes,
          savedAt: new Date().toISOString(),
        };
        const idx = next.findIndex(
          (item) =>
            item.date === dt && item.device.toLowerCase() === name.toLowerCase(),
        );
        if (idx >= 0) {
          next[idx] = { ...record, id: next[idx].id };
          updated++;
        } else {
          next.push(record);
          created++;
        }
      }
      return next;
    });

    if (device === "__new") {
      setDevice(name);
      setNewDevice("");
    }
    setHours("0");
    setMinutes("0");
    setNotice(null);
    const total = dates.length;
    toast.success(
      dates.length === 1
        ? `Laporan ${name} untuk ${formatShortDate(date)} tersimpan.`
        : `${total} laporan ${name} tersimpan (${created} baru, ${updated} diperbarui).`,
    );
  }

  function handleDelete(id: string) {
    const record = records.find((item) => item.id === id);
    setRecords((current) => current.filter((item) => item.id !== id));
    if (record) {
      toast.success(`Laporan ${record.device} ${formatShortDate(record.date)} dihapus.`);
    }
  }

  async function handleExport() {
    if (!filtered.length) {
      toast.warning("Tidak ada data yang cocok untuk diekspor.");
      return;
    }
    const XLSX = await import("xlsx");
    try {
      let wb;
      if (viewMode === "cross") {
        wb = await buildExcelCrossTable(visibleSummaries, selectedYear, selectedMonth, filterStatus, search);
      } else {
        wb = await buildExcelPerDevice(visibleSummaries, selectedDevice, search, filterStatus);
      }
      XLSX.writeFile(wb, `sudut-cctv-${today()}.xlsx`);
      toast.success("File Excel berhasil diekspor.");
    } catch {
      toast.error("Gagal mengekspor file.");
    }
  }

  function loadDummyData() {
    const existing = records.length > 0;
    const dummy = generateDummyData();
    if (existing) {
      setRecords((current) => [...current, ...dummy]);
    } else {
      setRecords(dummy);
    }
    toast.success(`${dummy.length} data dummy dimuat.`);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan uptime harian</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitoring downtime 27 CCTV — pilih tampilan tabel sesuai kebutuhan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {records.length === 0 && (
            <button
              type="button"
              onClick={loadDummyData}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-white px-4 text-sm font-medium hover:bg-muted"
            >
              <IconDatabase className="size-4" />
              Muat data dummy
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={!filtered.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <IconDownload className="size-4" />
            Ekspor Excel
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Uptime rata-rata"
          value={percent(overallPercent)}
        />
        <Stat
          label="Total downtime"
          value={formatHumanDuration(totalDowntime)}
        />
        <Stat
          label="Device terpantau"
          value={`${summaries.length} / ${devices.length}`}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <ReportForm
            devices={devices}
            device={device}
            newDevice={newDevice}
            onDeviceChange={setDevice}
            onNewDeviceChange={setNewDevice}
            dateMode={dateMode}
            onDateModeChange={setDateMode}
            date={date}
            onDateChange={setDate}
            toDate={toDate}
            onToDateChange={setToDate}
            hours={hours}
            minutes={minutes}
            onHoursChange={setHours}
            onMinutesChange={setMinutes}
            maxDate={today()}
            downtimeMinutes={downtimeMinutes}
            validDowntime={validDowntime}
            notice={notice}
            existing={existing}
            onSubmit={handleSubmit}
            onReset={resetForm}
          />
        </aside>

        <section className="min-w-0">
          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("cross")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    viewMode === "cross" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Semua device
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("summary")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    viewMode === "summary" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Per device
                </button>
              </div>
              {viewMode === "cross" && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(Number(event.target.value))}
                    className="h-7 rounded border bg-white px-2 text-xs outline-none focus:border-primary"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2024, i))}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="h-7 rounded border bg-white px-2 text-xs outline-none focus:border-primary"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b px-5 py-2.5">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari device…"
                className="h-8 w-48 rounded-md border bg-white px-3 text-sm outline-none focus:border-primary"
              />
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
                className="h-8 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">Semua</option>
                <option value="downtime">Ada downtime</option>
                <option value="normal">Normal</option>
              </select>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as DeviceSort)}
                className="h-8 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary"
              >
                <option value="name">Urut: Nama</option>
                <option value="downtime">Urut: Downtime</option>
              </select>
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-8 text-xs font-medium text-primary hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {viewMode === "cross" ? (
              <CrossTable summaries={visibleSummaries} year={selectedYear} month={selectedMonth} filterStatus={filterStatus} />
            ) : (
              <DeviceTable
                summaries={summaries}
                filterStatus={filterStatus}
                selectedDevice={selectedDevice}
                onSelectedDeviceChange={setSelectedDevice}
                onDelete={handleDelete}
              />
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
