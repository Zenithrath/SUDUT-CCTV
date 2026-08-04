import { describe, expect, it } from "vitest";
import { deviceSummaries, filterRecords, type DailyRecord } from "./reports";

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
});
