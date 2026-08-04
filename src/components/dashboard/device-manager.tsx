"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconDeviceCctv, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deviceSummaries, percent, STORAGE_KEY, type DailyRecord } from "@/lib/reports";
import { safeRecords } from "@/lib/reports";
import {
  DEFAULT_DEVICE_AREA,
  DEVICE_AREAS_STORAGE_KEY,
  loadDeviceAreas,
  loadDevices,
  removeDeviceArea,
  renameDeviceArea,
  saveDeviceArea,
  saveDevices,
} from "@/lib/devices";
import { formatHumanDuration } from "@/lib/duration";

type DialogState =
  | { type: "add" }
  | { type: "rename"; name: string }
  | { type: "delete"; name: string }
  | null;

export function DeviceManager() {
  const [devices, setDevices] = useState<string[]>([]);
  const [deviceAreas, setDeviceAreas] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState("");
  const [draftArea, setDraftArea] = useState(DEFAULT_DEVICE_AREA);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDevices(loadDevices());
      setDeviceAreas(loadDeviceAreas());
      setRecords(safeRecords(window.localStorage.getItem(STORAGE_KEY)));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) saveDevices(devices);
  }, [devices, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, ready]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) return;
      if (event.key === STORAGE_KEY) setRecords(safeRecords(event.newValue));
      if (event.key === "sudut-cctv-devices-v1") setDevices(loadDevices());
      if (event.key === DEVICE_AREAS_STORAGE_KEY) setDeviceAreas(loadDeviceAreas());
    }

    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const summaries = useMemo(
    () => deviceSummaries(records, "name", devices),
    [records, devices],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summaries.filter((summary) => {
      const matchesName = !q || summary.device.toLowerCase().includes(q);
      const area = deviceAreas[summary.device.toLowerCase()] ?? DEFAULT_DEVICE_AREA;
      return matchesName && (areaFilter === "all" || area === areaFilter);
    });
  }, [summaries, query, areaFilter, deviceAreas]);
  const areas = useMemo(
    () =>
      [...new Set([DEFAULT_DEVICE_AREA, ...Object.values(deviceAreas)])]
        .sort((a, b) => a.localeCompare(b, "id")),
    [deviceAreas],
  );

  function openAdd() {
    setDraft("");
    setDraftArea(DEFAULT_DEVICE_AREA);
    setDialog({ type: "add" });
  }

  function openRename(name: string) {
    setDraft(name);
    setDraftArea(deviceAreas[name.toLowerCase()] ?? DEFAULT_DEVICE_AREA);
    setDialog({ type: "rename", name });
  }

  function openDelete(name: string) {
    setDialog({ type: "delete", name });
  }

  function submitName() {
    if (!dialog) return;
    const value = draft.trim();
    if (!value) {
      toast.warning("Nama device tidak boleh kosong.");
      return;
    }
    if (value.length > 60) {
      toast.warning("Nama device terlalu panjang (maks. 60 karakter).");
      return;
    }
    const area = draftArea.trim();
    if (!area) {
      toast.warning("Area CCTV tidak boleh kosong.");
      return;
    }

    if (dialog.type === "add") {
      const exists = devices.some((d) => d.toLowerCase() === value.toLowerCase());
      if (exists) {
        toast.warning("Device dengan nama itu sudah ada.");
        return;
      }
      setDevices((current) => [...current, value]);
      saveDeviceArea(value, area);
      setDeviceAreas(loadDeviceAreas());
      toast.success(`Device "${value}" ditambahkan.`);
      setDialog(null);
      return;
    }

    if (dialog.type === "rename") {
      const oldName = dialog.name;
      if (oldName.toLowerCase() === value.toLowerCase()) {
        saveDeviceArea(oldName, area);
        setDeviceAreas(loadDeviceAreas());
        toast.success(`Area ${oldName} diperbarui menjadi "${area}".`);
        setDialog(null);
        return;
      }
      const exists = devices.some(
        (d) => d.toLowerCase() === value.toLowerCase() && d !== oldName,
      );
      if (exists) {
        toast.warning("Device dengan nama itu sudah ada.");
        return;
      }
      setDevices((current) => current.map((d) => (d === oldName ? value : d)));
      renameDeviceArea(oldName, value, area);
      setDeviceAreas(loadDeviceAreas());
      setRecords((current) =>
        current.map((r) => (r.device === oldName ? { ...r, device: value } : r)),
      );
      toast.success(`Device "${oldName}" diganti menjadi "${value}".`);
      setDialog(null);
    }
  }

  function confirmDelete() {
    if (!dialog || dialog.type !== "delete") return;
    const name = dialog.name;
    const summary = summaries.find((s) => s.device === name);
    const recordCount = summary?.days ?? 0;
    setDevices((current) => current.filter((d) => d !== name));
    removeDeviceArea(name);
    setDeviceAreas(loadDeviceAreas());
    setRecords((current) => current.filter((r) => r.device !== name));
    setDialog(null);
    toast.success(
      recordCount > 0
        ? `Device "${name}" dihapus beserta ${recordCount} laporannya.`
        : `Device "${name}" dihapus.`,
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen device</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola daftar CCTV yang dipantau — tambah, ganti nama, atau hapus.
          </p>
        </div>
        <Button onClick={openAdd}>
          <IconPlus />
          Tambah device
        </Button>
      </header>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} device terdaftar
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              selectedKey={areaFilter}
              onSelectionChange={(key) => setAreaFilter(String(key ?? "all"))}
              className="w-44"
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all" textValue="all">Semua area</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area} id={area} textValue={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari device…"
                className="w-56 pl-9"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
            <IconDeviceCctv className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {query ? "Tidak ada device yang cocok" : "Belum ada device terdaftar"}
            </p>
            {!query && (
              <Button variant="outline" size="sm" onClick={openAdd}>
                <IconPlus />
                Tambah device pertama
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Device</th>
                  <th className="px-4 py-2.5 font-medium">Area</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hari data</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total downtime</th>
                  <th className="px-4 py-2.5 text-right font-medium">Uptime</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((summary) => {
                  const hasData = summary.days > 0;
                  return (
                    <tr key={summary.device} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-2.5">
                        <span className="font-medium">{summary.device}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline">
                          {deviceAreas[summary.device.toLowerCase()] ?? DEFAULT_DEVICE_AREA}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {hasData ? summary.days : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {hasData ? formatHumanDuration(summary.totalDowntime) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        {hasData ? percent(summary.uptimePercent) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {hasData ? (
                          <Badge
                            variant={
                              summary.tier === "sehat"
                                ? "ok"
                                : summary.tier === "waspada"
                                  ? "warn"
                                  : "destructive"
                            }
                          >
                            {summary.tier === "sehat"
                              ? "Sehat"
                              : summary.tier === "waspada"
                                ? "Waspada"
                                : "Gangguan"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Tanpa data</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openRename(summary.device)}
                            aria-label={`Ganti nama ${summary.device}`}
                          >
                            <IconPencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDelete(summary.device)}
                            aria-label={`Hapus ${summary.device}`}
                          >
                            <IconTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(dialog?.type === "add" || dialog?.type === "rename") && (
        <Dialog
          isOpen
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {dialog.type === "add" ? "Tambah device baru" : "Ganti nama device"}
            </DialogTitle>
            <DialogDescription>
              {dialog.type === "add"
                ? "Nama device akan muncul di form laporan dan tabel monitoring."
                : "Laporan lama atas " + dialog.name + " ikut diganti namanya."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="contoh: CCTV Area Produksi 4"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitName();
              }
            }}
          />
          <div className="space-y-1.5">
            <Label>Area CCTV</Label>
            <Select
              selectedKey={draftArea || null}
              onSelectionChange={(key) => setDraftArea(String(key ?? DEFAULT_DEVICE_AREA))}
              className="w-full"
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} id={area} textValue={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button onClick={submitName}>Simpan</Button>
          </DialogFooter>
        </Dialog>
      )}

      {dialog?.type === "delete" && (
        <Dialog
          isOpen
          onOpenChange={(open) => {
            if (!open) setDialog(null);
          }}
        >
          <DialogHeader>
            <DialogTitle>Hapus device?</DialogTitle>
            <DialogDescription>
              Device {dialog.name} beserta semua laporannya akan dihapus permanen
              dari browser ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <IconTrash />
              Hapus
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
