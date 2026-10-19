import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

const relFmt = new Intl.RelativeTimeFormat("it-IT", { numeric: "auto" });

export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
  ];
  let value = diff;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return relFmt.format(Math.round(value), unit);
    value /= size;
  }
  return formatDate(iso);
}

export function pct(n: number) {
  return `${Math.round(n)}%`;
}
