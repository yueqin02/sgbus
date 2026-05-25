import type { BusLoad } from "./types";

export const LOAD_META: Record<
  BusLoad | "",
  { label: string; color: string; bg: string }
> = {
  SEA: {
    label: "Seats",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  SDA: {
    label: "Standing",
    color: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  LSD: {
    label: "Packed",
    color: "text-rose-300",
    bg: "bg-rose-500/10 border-rose-500/30",
  },
  "": {
    label: "—",
    color: "text-zinc-500",
    bg: "bg-zinc-800/40 border-zinc-700/50",
  },
};

export const TYPE_LABEL: Record<string, string> = {
  SD: "Single",
  DD: "Double",
  BD: "Bendy",
};

export function minutesUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return -1;
  return Math.round((target - Date.now()) / 60_000);
}
