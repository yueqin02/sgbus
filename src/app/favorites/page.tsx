"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { loadStops, findStop } from "@/lib/stops";
import { useFavorites } from "@/lib/favorites";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteStop } from "@/components/FavoriteStop";
import type { BusStop } from "@/lib/types";

export default function FavoritesPage() {
  const { codes } = useFavorites();
  const [stops, setStops] = useState<BusStop[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStops()
      .then((data) => {
        if (!cancelled) setStops(data);
      })
      .catch(() => {
        if (!cancelled) setStops([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = stops
    ? codes
        .map((code) => findStop(stops, code))
        .filter((s): s is BusStop => Boolean(s))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="title-neon text-3xl font-bold tracking-tight">Saved stops</h1>
        <p className="text-zinc-400">
          Live arrivals at every stop you’ve starred.
        </p>
      </header>

      {codes.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No saved stops yet"
          description="Tap the star icon on any stop to save it for quick access."
          action={
            <Link
              href="/nearby"
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <MapPin className="h-4 w-4" />
              Find stops nearby
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {resolved.map((stop) => (
            <li key={stop.code}>
              <FavoriteStop stop={stop} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
