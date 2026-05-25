"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  iso: string;
  className?: string;
};

function formatRemaining(iso: string): { label: string; tone: "urgent" | "soon" | "normal" | "gone" } {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return { label: "—", tone: "gone" };
  const mins = Math.round(ms / 60_000);
  if (mins <= 0) return { label: "Arr", tone: "urgent" };
  if (mins === 1) return { label: "1 min", tone: "urgent" };
  if (mins <= 5) return { label: `${mins} min`, tone: "soon" };
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return { label: `${h}h ${m}m`, tone: "normal" };
  }
  return { label: `${mins} min`, tone: "normal" };
}

export function Countdown({ iso, className }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // include `now` in dependency by calling formatter with a tick-aware reading
  const { label, tone } = formatRemaining(iso);
  void now;

  const toneClass =
    tone === "urgent"
      ? "text-rose-300"
      : tone === "soon"
        ? "text-amber-200"
        : tone === "gone"
          ? "text-zinc-500"
          : "text-emerald-200";

  return (
    <span className={cn("tabular-nums font-mono text-2xl font-semibold tracking-tight whitespace-nowrap", toneClass, className)}>
      {label}
    </span>
  );
}
