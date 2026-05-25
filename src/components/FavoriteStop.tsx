"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import type { ArrivalsResponse, BusStop } from "@/lib/types";
import { StarButton } from "./StarButton";
import { minutesUntil } from "@/lib/load";
import { cn } from "@/lib/cn";

type Props = {
  stop: BusStop;
};

const POLL_MS = 30_000;
const MAX_CHIPS = 4;

type ChipTone = "urgent" | "soon" | "normal" | "gone";

function chipTone(mins: number): ChipTone {
  if (mins < 0) return "gone";
  if (mins <= 1) return "urgent";
  if (mins <= 5) return "soon";
  return "normal";
}

function chipLabel(mins: number): string {
  if (mins < 0) return "—";
  if (mins <= 0) return "Arr";
  return `${mins} min`;
}

const TONE_CLASS: Record<ChipTone, string> = {
  urgent: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  soon: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  gone: "border-zinc-800 bg-zinc-900/40 text-zinc-500",
};

export function FavoriteStop({ stop }: Props) {
  const [data, setData] = useState<ArrivalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tick to re-render countdowns even between fetches.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/arrivals/${stop.code}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ArrivalsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (!cancelled) {
          setError((err as Error).message || "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOnce();
    const pollId = setInterval(fetchOnce, POLL_MS);
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [stop.code]);

  const chips = (data?.services ?? [])
    .slice(0, MAX_CHIPS)
    .map((service) => {
      const mins = service.next ? minutesUntil(service.next.estimatedArrival) : -1;
      return {
        serviceNo: service.serviceNo,
        mins,
        tone: chipTone(mins),
      };
    });

  return (
    <article className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-4 transition-colors hover:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/stop/${stop.code}`}
          className="group flex min-w-0 flex-1 items-start gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold text-zinc-100">
                {stop.code}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
            </div>
            <p className="mt-0.5 truncate text-sm text-zinc-400">{stop.name}</p>
          </div>
        </Link>
        <StarButton code={stop.code} />
      </div>

      <div className="mt-3 min-h-[28px]">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading arrivals…
          </div>
        ) : error && !data ? (
          <p className="text-xs text-rose-300">Couldn’t load arrivals.</p>
        ) : chips.length === 0 ? (
          <p className="text-xs text-zinc-500">No buses arriving soon.</p>
        ) : (
          <ul className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <li key={chip.serviceNo}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs tabular-nums",
                    TONE_CLASS[chip.tone],
                  )}
                >
                  <span className="font-mono font-semibold">{chip.serviceNo}</span>
                  <span className="text-[11px] opacity-80">
                    {chipLabel(chip.mins)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
