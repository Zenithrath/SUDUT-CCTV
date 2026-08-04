import { describe, expect, it } from "vitest";
import {
  calculateDowntimeMinutes,
  calculateUptimePercentage,
  formatDuration,
  formatHumanDuration,
  hoursMinutesToMinutes,
  minutesToHoursMinutes,
  parsePastedDuration,
} from "./duration";

describe("duration helpers", () => {
  it("converts hours and minutes to whole minutes", () => {
    expect(hoursMinutesToMinutes(24, 0)).toBe(1440);
    expect(hoursMinutesToMinutes(5, 30)).toBe(330);
    expect(() => hoursMinutesToMinutes(24, 1)).toThrow("Durasi tidak valid");
    expect(() => hoursMinutesToMinutes(-1, 0)).toThrow("Durasi tidak valid");
  });

  it("converts aggregate minutes without imposing the daily 24-hour limit", () => {
    expect(minutesToHoursMinutes(330)).toEqual({ hours: 5, minutes: 30 });
    expect(minutesToHoursMinutes(44670)).toEqual({ hours: 744, minutes: 30 });
    expect(() => minutesToHoursMinutes(-1)).toThrow("Menit tidak valid");
  });

  it("formats daily and aggregate durations consistently", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(330)).toBe("05:30");
    expect(formatDuration(44670)).toBe("744:30");
  });

  it("formats human-readable totals with days", () => {
    expect(formatHumanDuration(0)).toBe("0 mnt");
    expect(formatHumanDuration(330)).toBe("5 jam 30 mnt");
    expect(formatHumanDuration(1440)).toBe("1 hari");
    expect(formatHumanDuration(1500)).toBe("1 hari 1 jam");
    expect(formatHumanDuration(4530)).toBe("3 hari 3 jam 30 mnt");
  });

  it("parses the supported Excel paste formats", () => {
    expect(parsePastedDuration("24")).toBe(1440);
    expect(parsePastedDuration("5")).toBe(300);
    expect(parsePastedDuration("5.5")).toBe(330);
    expect(parsePastedDuration("05:30")).toBe(330);
    expect(parsePastedDuration("5:30")).toBe(330);
    expect(parsePastedDuration("  ")).toBeNull();
    expect(parsePastedDuration("5,5")).toBe(330);
    expect(() => parsePastedDuration("24:01")).toThrow("Durasi tidak valid");
    expect(() => parsePastedDuration("25")).toThrow("tidak boleh lebih dari 24:00");
    expect(() => parsePastedDuration("lima jam")).toThrow("Format waktu tidak dikenali");
  });

  it("calculates downtime and uptime percentage", () => {
    expect(calculateDowntimeMinutes(330)).toBe(1110);
    expect(calculateDowntimeMinutes(null)).toBeNull();
    expect(calculateUptimePercentage(330, 1440)).toBeCloseTo(22.916666, 5);
    expect(calculateUptimePercentage(0, 0)).toBe(0);
  });
});
