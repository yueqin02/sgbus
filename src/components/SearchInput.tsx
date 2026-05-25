"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { BusStop } from "@/lib/types";
import { loadStops } from "@/lib/stops";
import Link from "next/link";

const RECENT_KEY = "sgbus.recent.v1";

type Recent = { code: string; name: string; ts: number };

function readRecent(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushRecent(stop: { code: string; name: string }) {
  if (typeof window === "undefined") return;
  const cur = readRecent().filter((r) => r.code !== stop.code);
  cur.unshift({ code: stop.code, name: stop.name, ts: Date.now() });
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 6)));
}

export function SearchInput() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stops, setStops] = useState<BusStop[] | null>(null);
  const [recent, setRecent] = useState<Recent[]>(() => readRecent());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStops().then(setStops).catch(() => setStops([]));
    const sync = () => setRecent(readRecent());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const matches = useMemo(() => {
    if (!stops || q.trim().length === 0) return [];
    const needle = q.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(needle);
    const list = stops
      .filter((s) =>
        isNumeric
          ? s.code.startsWith(needle)
          : s.name.toLowerCase().includes(needle),
      )
      .slice(0, 8);
    return list;
  }, [q, stops]);

  const submit = () => {
    const trimmed = q.trim();
    if (/^\d{4,6}$/.test(trimmed)) {
      router.push(`/stop/${trimmed}`);
    } else if (matches[0]) {
      router.push(`/stop/${matches[0].code}`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          inputMode="search"
          autoComplete="off"
          placeholder="Enter stop code or street"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 py-3.5 pl-11 pr-11 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {matches.length === 0 && (
            <p className="px-1 text-sm text-zinc-500">No stops match. Try a 5-digit code.</p>
          )}
          {matches.map((s) => (
            <Link
              key={s.code}
              href={`/stop/${s.code}`}
              className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-2.5 text-sm hover:bg-zinc-900/80"
            >
              <span className="truncate text-zinc-200">{s.name}</span>
              <span className="ml-3 shrink-0 font-mono text-xs text-zinc-500">{s.code}</span>
            </Link>
          ))}
        </div>
      )}

      {q.length === 0 && recent.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          <p className="px-1 text-xs uppercase tracking-wider text-zinc-500">Recent</p>
          <div className="flex flex-col gap-1.5">
            {recent.map((r) => (
              <Link
                key={r.code}
                href={`/stop/${r.code}`}
                className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/30 px-4 py-2.5 text-sm hover:bg-zinc-900/70"
              >
                <span className="truncate text-zinc-200">{r.name}</span>
                <span className="ml-3 shrink-0 font-mono text-xs text-zinc-500">{r.code}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
