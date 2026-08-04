import { DEFAULT_DEVICES } from "@/lib/reports";

export const DEVICES_STORAGE_KEY = "sudut-cctv-devices-v1";

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