"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  IconActivity,
  IconClockDown,
  IconDownload,
  IconDatabase,
  IconPercentage,
} from "@tabler/icons-react";
import { CrossTable } from "@/components/dashboard/cross-table";
import { DeviceTable } from "@/components/dashboard/device-table";
import { ReportForm } from "@/components/dashboard/report-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHumanDuration } from "@/lib/duration";
import {
  backfillDateRange,
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
import { DEVICES_STORAGE_KEY, loadDevices } from "@/lib/devices";
import { cn } from "@/lib/utils";

function fmt(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildWeeks(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: { index: number; from: string; to: string; label: string }[] = [];
  let start = 1;
  while (start <= daysInMonth) {
    const end = Math.min(start + 6, daysInMonth);
    weeks.push({
      index: weeks.length + 1,
      from: `${year}-${pad(month)}-${pad(start)}`,
      to: `${year}-${pad(month)}-${pad(end)}`,
      label: `${start}–${end}`,
    });
    start = end + 1;
  }
  return weeks;
}

export function DailyReportWorkspace() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storedDevices, setStoredDevices] = useState<string[]>([]);

  const now = new Date();
  const todayStr = today();

  const [periodType, setPeriodType] = useState<"month" | "week">("month");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(1);

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
  const [selectedDevice, setSelectedDevice] = useState("");

  const tableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecords(safeRecords(window.localStorage.getItem(STORAGE_KEY)));
      setStoredDevices(loadDevices());
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (storageReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, storageReady]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === STORAGE_KEY) setRecords(safeRecords(event.newValue));
      if (event.key === DEVICES_STORAGE_KEY) setStoredDevices(loadDevices());
    }

    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const devices = useMemo(
    () =>
      [...new Set([...storedDevices, ...records.map((record) => record.device)])]
        .sort((a, b) => a.localeCompare(b, "id")),
    [records, storedDevices],
  );

  const weeks = useMemo(
    () => buildWeeks(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  const range = useMemo(() => {
    const monthFrom = `${selectedYear}-${pad(selectedMonth)}-01`;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    let monthTo = `${selectedYear}-${pad(selectedMonth)}-${pad(daysInMonth)}`;
    if (monthTo > todayStr) monthTo = todayStr;
    if (periodType === "week") {
      const week = weeks.find((w) => w.index === selectedWeek) ?? weeks[0];
      return week ? { from: week.from, to: week.to > todayStr ? todayStr : week.to } : { from: monthFrom, to: monthTo };
    }
    return { from: monthFrom, to: monthTo };
  }, [periodType, weeks, selectedWeek, selectedYear, selectedMonth, todayStr]);

  const backfilled = useMemo(
    () => backfillDateRange(records, range.from, range.to),
    [records, range.from, range.to],
  );
  const filtered = useMemo(
    () =>
      filterRecords(backfilled, {
        device: search,
        from: range.from,
        to: range.to,
        status: filterStatus,
      }),
    [backfilled, range.from, range.to, search, filterStatus],
  );
  const summaries = useMemo(
    () => deviceSummaries(filtered, sortBy, devices),
    [filtered, sortBy, devices],
  );
  const visibleSummaries = useMemo(() => {
    let result = summaries;
    if (search) result = result.filter((s) => s.device.toLowerCase().includes(search.trim().toLowerCase()));
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
  const downtimePercent = totalDays ? (totalDowntime / (totalDays * MINUTES_PER_DAY)) * 100 : 0;
  const downtimeDeviceCount = summaries.filter((s) => s.totalDowntime > 0).length;

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

  function focusDashboard(target: FilterStatus) {
    setViewMode("cross");
    setFilterStatus(target);
    window.setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function switchToWeek() {
    setPeriodType("week");
    const week = buildWeeks(selectedYear, selectedMonth).find(
      (w) => todayStr >= w.from && todayStr <= w.to,
    );
    setSelectedWeek(week?.index ?? 1);
  }

  const years = useMemo(() => {
    const currentYear = Number(todayStr.slice(0, 4));
    const set = new Set<number>([currentYear - 1, currentYear, currentYear + 1]);
    for (const record of records) set.add(Number(record.date.slice(0, 4)));
    return [...set].sort((a, b) => a - b);
  }, [records, todayStr]);

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
      dates.push(fmt(cursor));
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
        wb = await buildExcelCrossTable(visibleSummaries, range.from, range.to, filterStatus, search);
      } else {
        wb = await buildExcelPerDevice(summaries, selectedDevice, search, filterStatus);
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
            Monitoring downtime CCTV — pilih periode, lalu cek tabel sesuai kebutuhan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {records.length === 0 && (
            <Button variant="outline" onClick={loadDummyData}>
              <IconDatabase />
              Muat data dummy
            </Button>
          )}
          <Button onClick={handleExport} isDisabled={!filtered.length}>
            <IconDownload />
            Export Excel
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Uptime rata-rata"
          value={totalDays ? percent(overallPercent) : "—"}
          icon={<IconActivity className="size-4" />}
          onClick={() => focusDashboard("all")}
        />
        <Stat
          label="Total downtime"
          value={formatHumanDuration(totalDowntime)}
          hint={
            <span className="tabular-nums">
              {downtimeDeviceCount > 0
                ? `${downtimeDeviceCount} device bermasalah`
                : "Tidak ada device bermasalah"}
            </span>
          }
          icon={<IconClockDown className="size-4" />}
          onClick={() => focusDashboard("downtime")}
        />
        <Stat
          label="Persentase downtime"
          value={totalDays ? percent(downtimePercent) : "—"}
          icon={<IconPercentage className="size-4" />}
          onClick={() => focusDashboard("downtime")}
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
            maxDate={todayStr}
            downtimeMinutes={downtimeMinutes}
            validDowntime={validDowntime}
            notice={notice}
            existing={existing}
            onSubmit={handleSubmit}
            onReset={resetForm}
          />
        </aside>

        <section ref={tableRef} className="min-w-0">
          <section className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("cross")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    viewMode === "cross"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Semua device
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("summary")}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-medium transition",
                    viewMode === "summary"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Per device
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md bg-muted p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPeriodType("month")}
                    className={cn(
                      "rounded px-3 py-1.5 font-medium transition",
                      periodType === "month"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Bulan
                  </button>
                  <button
                    type="button"
                    onClick={switchToWeek}
                    className={cn(
                      "rounded px-3 py-1.5 font-medium transition",
                      periodType === "week"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Minggu
                  </button>
                </div>

                <Select
                  selectedKey={String(selectedMonth)}
                  onSelectionChange={(key) => {
                    if (key === null) return;
                    const value = Number(key);
                    if (!Number.isNaN(value)) setSelectedMonth(value);
                  }}
                  className="w-28"
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} id={String(i + 1)} textValue={String(i + 1)}>
                        {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2024, i))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  selectedKey={String(selectedYear)}
                  onSelectionChange={(key) => {
                    if (key === null) return;
                    const value = Number(key);
                    if (!Number.isNaN(value)) setSelectedYear(value);
                  }}
                  className="w-24"
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} id={String(y)} textValue={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => {
                    const t = new Date();
                    setSelectedMonth(t.getMonth() + 1);
                    setSelectedYear(t.getFullYear());
                    setPeriodType("month");
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  Bulan ini
                </button>
              </div>
            </div>

            {periodType === "week" && (
              <div className="flex flex-wrap items-center gap-1.5 border-b px-5 py-2.5">
                <span className="text-xs text-muted-foreground">Minggu:</span>
                {weeks.map((week) => (
                  <button
                    key={week.index}
                    type="button"
                    onClick={() => setSelectedWeek(week.index)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                      selectedWeek === week.index
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {week.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2.5">
              {viewMode === "cross" ? (
                <>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari device…"
                    className="h-8 w-48"
                  />
                  <Select
                    selectedKey={filterStatus}
                    onSelectionChange={(key) =>
                      setFilterStatus((key as FilterStatus) ?? "all")
                    }
                    className="w-36"
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="all" textValue="all">Semua</SelectItem>
                      <SelectItem id="downtime" textValue="downtime">Ada downtime</SelectItem>
                      <SelectItem id="normal" textValue="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    selectedKey={sortBy}
                    onSelectionChange={(key) => setSortBy((key as DeviceSort) ?? "name")}
                    className="w-40"
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="name" textValue="name">Urut: Nama</SelectItem>
                      <SelectItem id="downtime" textValue="downtime">Urut: Downtime</SelectItem>
                    </SelectContent>
                  </Select>
                  {filtersActive && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      Reset
                    </Button>
                  )}
                </>
              ) : null}
            </div>

            {viewMode === "cross" ? (
              <CrossTable summaries={visibleSummaries} from={range.from} to={range.to} filterStatus={filterStatus} />
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
  hint,
  icon,
  badge,
  onClick,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {badge ?? null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {icon ? (
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg border bg-card px-5 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-lg border bg-card px-5 py-4">{content}</div>;
}
