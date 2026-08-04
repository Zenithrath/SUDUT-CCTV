import { describe, expect, it } from "vitest";
import {
  buildExcelCrossTable,
  buildExcelPerDevice,
  deviceSummaries,
  filterRecords,
  type DailyRecord,
  type DeviceSummary,
} from "./reports";

const records: DailyRecord[] = [
  { id: "old", device: "CCTV A", date: "2026-07-31", downtimeMinutes: 30, savedAt: "2026-07-31T00:00:00.000Z" },
  { id: "current", device: "CCTV A", date: "2026-08-01", downtimeMinutes: 0, savedAt: "2026-08-01T00:00:00.000Z" },
];

describe("report summaries", () => {
  it("limits reports to the selected period", () => {
    expect(filterRecords(records, { from: "2026-08-01", to: "2026-08-01" }))
      .toMatchObject([{ id: "current" }]);
  });

  it("includes a newly added device before local storage is written", () => {
    expect(deviceSummaries([], "name", ["CCTV Baru"]))
      .toMatchObject([{ device: "CCTV Baru", days: 0 }]);
  });

  it("highlights downtime in the Excel export", async () => {
    const summary: DeviceSummary = {
      device: "CCTV A",
      records: [records[0]],
      days: 1,
      totalDowntime: 30,
      totalUptime: 1410,
      averageDowntime: 30,
      uptimePercent: 97.9167,
      tier: "gangguan",
    };

    const workbook = await buildExcelPerDevice([summary], "CCTV A", "", "all");
    const worksheet = workbook.Sheets["CCTV A"];
    expect(worksheet.B6.s).toMatchObject({
      fill: { fgColor: { rgb: "FEE2E2" } },
      font: { color: { rgb: "B91C1C" } },
    });
    expect(worksheet.D6.v).toBe("2.08%");
    expect(worksheet.E6.v).toBe("97.92%");
  });

  it("adds a per-date downtime tab and overall percentages", async () => {
    const summary: DeviceSummary = {
      device: "CCTV A",
      records: [records[0]],
      days: 1,
      totalDowntime: 30,
      totalUptime: 1410,
      averageDowntime: 30,
      uptimePercent: 97.9167,
      tier: "gangguan",
    };

    const workbook = await buildExcelCrossTable(
      [summary],
      "2026-07-31",
      "2026-07-31",
      "all",
      "",
    );
    expect(workbook.SheetNames).toEqual(["Semua Device", "Daftar Downtime"]);
    expect(workbook.Sheets["Semua Device"].A4.v).toContain("Uptime 97.92%");
    expect(workbook.Sheets["Daftar Downtime"].B8.v).toBe("00:30");
    expect(workbook.Sheets["Daftar Downtime"].A13.s).toMatchObject({
      font: { bold: true, sz: 14 },
    });
  });

});
