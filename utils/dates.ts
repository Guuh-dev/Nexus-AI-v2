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
  const date = new Date(`${key}T12:00:00Z`);
  return date.toISOString().slice(0, 10) === key ? date : new Date(Number.NaN);
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
  return !Number.isNaN(dateFromKey(value).getTime());
}

/** Retorna o último milissegundo de uma data civil no fuso informado. */
export function endOfLocalDayIso(key: string, timezone?: string): string {
  if (!isValidDateKey(key)) throw new RangeError(`Data civil inválida: ${key}`);
  const nextKey = addDays(key, 1);
  const anchor = dateFromKey(nextKey).getTime();
  let lower = anchor - 36 * 60 * 60 * 1_000;
  let upper = anchor + 36 * 60 * 60 * 1_000;

  // Busca o primeiro instante que já pertence ao dia seguinte. Isso respeita
  // offsets não inteiros e mudanças de horário civil sem assumir UTC-3.
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (localDateKey(new Date(middle), timezone) < nextKey) lower = middle + 1;
    else upper = middle;
  }
  return new Date(lower - 1).toISOString();
}
