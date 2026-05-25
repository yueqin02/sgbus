"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, MapPinOff, RefreshCcw } from "lucide-react";
import { loadStops } from "@/lib/stops";
import { haversineKm, formatDistance } from "@/lib/distance";
import { StopCard } from "@/components/StopCard";
import { EmptyState } from "@/components/EmptyState";
import type { BusStop } from "@/lib/types";

type Permission = "idle" | "asking" | "granted" | "denied" | "error";
type Coords = { lat: number; lng: number };
type Ranked = { stop: BusStop; distanceKm: number };

const MAX_RESULTS = 15;

function describeGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Enable it in your browser settings to see nearby stops.";
    case err.POSITION_UNAVAILABLE:
      return "Your location is currently unavailable. Try again in a moment.";
    case err.TIMEOUT:
      return "Locating you took too long. Check your signal and try again.";
    default:
      return err.message || "Something went wrong while finding your location.";
  }
}

export default function NearbyPage() {
  const [permission, setPermission] = useState<Permission>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<BusStop[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStops()
      .then((data) => {
        if (!cancelled) setStops(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stops.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermission("error");
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setPermission("asking");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermission("granted");
      },
      (err) => {
        setError(describeGeoError(err));
        setPermission(
          err.code === err.PERMISSION_DENIED ? "denied" : "error",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const nearest: Ranked[] =
    coords && stops
      ? stops
          .map((stop) => ({ stop, distanceKm: haversineKm(coords, stop) }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, MAX_RESULTS)
      : [];

  const maxDistance = nearest.length
    ? nearest[nearest.length - 1].distanceKm
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-zinc-50">Nearby stops</h1>
        <p className="text-zinc-400">
          Closest bus stops to your current location.
        </p>
      </header>

      {permission !== "granted" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={requestLocation}
            disabled={permission === "asking" || !stops}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-4 text-base font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {permission === "asking" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Locating…
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" />
                Use my location
              </>
            )}
          </button>

          {(permission === "denied" || permission === "error") && (
            <EmptyState
              icon={MapPinOff}
              title="Location unavailable"
              description={error ?? "We couldn't get your location."}
              action={
                <button
                  type="button"
                  onClick={requestLocation}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try again
                </button>
              }
            />
          )}
        </div>
      )}

      {permission === "granted" && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <MapPin className="h-3 w-3" />
              Within {formatDistance(maxDistance)} of you
            </span>
            <button
              type="button"
              onClick={requestLocation}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-900/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {nearest.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {nearest.map(({ stop, distanceKm }) => (
                <li key={stop.code}>
                  <StopCard stop={stop} distanceKm={distanceKm} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={MapPinOff}
              title="No stops found"
              description="We couldn't find any bus stops near you."
            />
          )}
        </section>
      )}
    </div>
  );
}
