/**
 * Durations in SUDUT CCTV are always represented as whole minutes.  Keeping
 * these functions free of UI and database concerns makes the same rules usable
 * by the monthly grid, server actions, exports, and tests.
 */
export function hoursMinutesToMinutes(hours: number, minutes: number) {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59 ||
    (hours === 24 && minutes !== 0)
  ) {
    throw new Error("Durasi tidak valid. Gunakan 0–24 jam dan 0–59 menit.");
  }

  return hours * 60 + minutes;
}

/** Converts an aggregate duration too, so values above 24 hours are valid. */
export function minutesToHoursMinutes(totalMinutes: number) {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0) {
    throw new Error("Menit tidak valid.");
  }

  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

/** Formats both daily durations (05:30) and monthly totals (744:00). */
export function formatDuration(totalMinutes: number) {
  const { hours, minutes } = minutesToHoursMinutes(totalMinutes);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Human-friendly totals, e.g. 4530 minutes becomes "3 hari 3 jam 30 mnt". */
export function formatHumanDuration(totalMinutes: number) {
  const { hours, minutes } = minutesToHoursMinutes(totalMinutes);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (remainingHours > 0) parts.push(`${remainingHours} jam`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} mnt`);
  return parts.join(" ");
}

export function calculateDowntimeMinutes(
  uptimeMinutes: number | null,
  availableMinutes = 1440,
) {
  if (!Number.isInteger(availableMinutes) || availableMinutes < 1) {
    throw new Error("Waktu tersedia tidak valid.");
  }
  if (uptimeMinutes === null) return null;
  if (!Number.isInteger(uptimeMinutes) || uptimeMinutes < 0 || uptimeMinutes > availableMinutes) {
    throw new Error("Uptime tidak valid.");
  }

  return availableMinutes - uptimeMinutes;
}

/**
 * Parses values commonly copied from Excel. Decimal values are decimal hours,
 * never a duration stored as a float: 5.5 becomes exactly 330 minutes.
 */
export function parsePastedDuration(value: string) {
  const raw = value.trim();
  if (!raw) return null;

  const clock = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) {
    return hoursMinutesToMinutes(Number(clock[1]), Number(clock[2]));
  }

  const normalizedDecimal = raw.replace(",", ".");
  if (/^\d+(?:\.\d+)?$/.test(normalizedDecimal)) {
    const decimalHours = Number(normalizedDecimal);
    if (!Number.isFinite(decimalHours) || decimalHours < 0) {
      throw new Error("Format waktu tidak dikenali.");
    }

    const totalMinutes = Math.round(decimalHours * 60);
    if (totalMinutes > 1440) {
      throw new Error("Durasi tidak boleh lebih dari 24:00.");
    }
    return totalMinutes;
  }

  throw new Error("Format waktu tidak dikenali. Gunakan contoh 24, 5.5, atau 05:30.");
}

export function calculateUptimePercentage(uptimeMinutes: number, availableMinutes: number) {
  if (!Number.isFinite(uptimeMinutes) || !Number.isFinite(availableMinutes) || availableMinutes <= 0) {
    return 0;
  }

  return (uptimeMinutes / availableMinutes) * 100;
}

/** `month` is one-based: January is 1 and December is 12. */
export function getDaysInSelectedMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Periode tidak valid.");
  }

  return new Date(year, month, 0).getDate();
}
