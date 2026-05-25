"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BusFront, RefreshCcw } from "lucide-react";
import type { ArrivalsResponse } from "@/lib/types";
import { ArrivalCard } from "@/components/ArrivalCard";
import { EmptyState } from "@/components/EmptyState";
import { pushRecent } from "@/components/SearchInput";
import { cn } from "@/lib/cn";

type Props = {
  code: string;
  stopName: string;
};

const POLL_MS = 30_000;

export function ArrivalsLive({ code, stopName }: Props) {
  const [data, setData] = useState<ArrivalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  const fetchArrivals = useCallback(async () => {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/arrivals/${code}`, {
        cache: "no-store",
        signal: ctl.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as ArrivalsResponse;
      setData(json);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || "Failed to load arrivals");
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Initial fetch + 30s polling
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on mount; setLoading/setError happen before first await
    fetchArrivals();
    const id = setInterval(fetchArrivals, POLL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchArrivals]);

  // Push recent on mount
  useEffect(() => {
    pushRecent({ code, name: stopName });
  }, [code, stopName]);

  // Tick "Xs ago" every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchedAtMs = data ? new Date(data.fetchedAt).getTime() : null;
  const secondsAgo =
    fetchedAtMs != null
      ? Math.max(0, Math.round((now - fetchedAtMs) / 1000))
      : null;

  const sourceLabel =
    data?.source === "mock"
      ? "Sample data — LTA key inactive (see README)"
      : "LTA live";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-zinc-500">
          {secondsAgo != null ? (
            <>
              Updated {secondsAgo}s ago{" "}
              <span className="text-zinc-700">·</span>{" "}
              <span
                className={cn(
                  data?.source === "mock" ? "text-amber-300" : "text-emerald-300",
                )}
              >
                {sourceLabel}
              </span>
            </>
          ) : loading ? (
            "Loading arrivals…"
          ) : (
            "Not yet updated"
          )}
        </p>
        <button
          type="button"
          onClick={fetchArrivals}
          disabled={loading}
          aria-label="Refresh arrivals"
          className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-60"
        >
          <RefreshCcw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </button>
      </div>

      {error && !data && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Couldn’t load arrivals: {error}
        </div>
      )}

      {!data && loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-900 bg-zinc-900/30"
            />
          ))}
        </div>
      )}

      {data && data.services.length === 0 && (
        <EmptyState
          icon={BusFront}
          title="No buses now"
          description="No services arriving at this stop in the next hour."
        />
      )}

      {data && data.services.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.services.map((s) => (
            <ArrivalCard key={s.serviceNo} service={s} />
          ))}
        </div>
      )}
    </section>
  );
}
