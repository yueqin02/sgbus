"use client";

import { MapView } from "./MapView";

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-300">Map</h1>
        <p className="text-sm text-zinc-400">
          All ~5,000 SG bus stops, tap one for arrivals.
        </p>
      </div>
      <div
        className="overflow-hidden rounded-2xl border border-zinc-900"
        style={{ height: "calc(100dvh - 220px)" }}
      >
        <MapView />
      </div>
    </div>
  );
}
