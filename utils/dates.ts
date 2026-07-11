import type { Weekday } from "@/types";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function localDateKey(date = new Date(), timezone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function dateFromKey(key: string): Date {
  if (!DATE_KEY_PATTERN.test(key)) return new Date(Number.NaN);
  return new Date(`${key}T12:00:00Z`);
}

export function addDays(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(earlier: string, later: string): number {
  return Math.round((dateFromKey(later).getTime() - dateFromKey(earlier).getTime()) / 86_400_000);
}

export function weekdayFromKey(key: string): Weekday {
  return dateFromKey(key).getUTCDay() as Weekday;
}

export function formatLongDate(key: string): string {
  const date = dateFromKey(key);
  if (Number.isNaN(date.getTime())) return key;
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(key: string): string {
  const date = dateFromKey(key);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function isValidDateKey(value: string): boolean {
  return DATE_KEY_PATTERN.test(value) && !Number.isNaN(dateFromKey(value).getTime());
}
