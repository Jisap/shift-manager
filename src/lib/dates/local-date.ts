const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatLocalDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function addLocalDays(date: string, days: number): string {
  const parsed = parseLocalDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatLocalDate(parsed);
}

export function daysBetweenLocal(from: string, to: string): number {
  return Math.round(
    (parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

export function weekdayOf(date: string): number {
  return parseLocalDate(date).getUTCDay();
}

export function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return formatLocalDate(new Date(Date.UTC(year, month - 1, day))) === value;
}

export function isValidLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

export function rangesOverlap(
  firstStart: string,
  firstEnd: string | undefined,
  secondStart: string,
  secondEnd: string | undefined,
): boolean {
  const firstEndDate = firstEnd ?? "9999-12-31";
  const secondEndDate = secondEnd ?? "9999-12-31";
  if (firstEndDate < firstStart || secondEndDate < secondStart) {
    return false;
  }
  return firstStart <= secondEndDate && secondStart <= firstEndDate;
}

export function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
