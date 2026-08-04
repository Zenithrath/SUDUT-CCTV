import { DEFAULT_DEVICES } from "@/lib/reports";

export const DEVICES_STORAGE_KEY = "sudut-cctv-devices-v1";
export const DEVICE_AREAS_STORAGE_KEY = "sudut-cctv-device-areas-v1";
export const DEFAULT_DEVICE_AREA = "Belum dikelompokkan";

function defaultAreaForDevice(device: string) {
  if (device.startsWith("CCTV Head Office ")) return "Head Office";
  if (device.startsWith("CCTV Kantor APS ")) return "Kantor APS";
  return DEFAULT_DEVICE_AREA;
}

function defaultDeviceAreas() {
  const devices = loadDevices();
  const splitAt = Math.ceil(devices.length / 2);
  return Object.fromEntries(
    devices.map((device, index) => {
      const knownArea = defaultAreaForDevice(device);
      return [
        device.toLowerCase(),
        knownArea === DEFAULT_DEVICE_AREA
          ? index < splitAt
            ? "Head Office"
            : "Kantor APS"
          : knownArea,
      ];
    }),
  );
}

export function loadDeviceAreas(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DEVICE_AREAS_STORAGE_KEY);
    const defaults = defaultDeviceAreas();
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
    return {
      ...defaults,
      ...Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) => key.trim().length > 0 && typeof value === "string" && value.trim().length > 0,
      ).map(([key, value]) => [key.toLowerCase(), value.trim()]),
      ),
    };
  } catch {
    return defaultDeviceAreas();
  }
}

export function saveDeviceArea(device: string, area: string) {
  if (typeof window === "undefined") return;
  const name = device.trim();
  const group = area.trim();
  if (!name || !group) return;
  const areas = loadDeviceAreas();
  areas[name.toLowerCase()] = group;
  window.localStorage.setItem(DEVICE_AREAS_STORAGE_KEY, JSON.stringify(areas));
}

export function removeDeviceArea(device: string) {
  if (typeof window === "undefined") return;
  const areas = loadDeviceAreas();
  delete areas[device.trim().toLowerCase()];
  window.localStorage.setItem(DEVICE_AREAS_STORAGE_KEY, JSON.stringify(areas));
}

export function renameDeviceArea(oldDevice: string, newDevice: string, area: string) {
  if (typeof window === "undefined") return;
  const areas = loadDeviceAreas();
  delete areas[oldDevice.trim().toLowerCase()];
  areas[newDevice.trim().toLowerCase()] = area.trim() || DEFAULT_DEVICE_AREA;
  window.localStorage.setItem(DEVICE_AREAS_STORAGE_KEY, JSON.stringify(areas));
}

export function loadDevices(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_DEVICES];
  try {
    const raw = window.localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) return [...DEFAULT_DEVICES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_DEVICES];
    const names = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return names.length > 0 ? names : [...DEFAULT_DEVICES];
  } catch {
    return [...DEFAULT_DEVICES];
  }
}

export function saveDevices(names: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(names));
}
