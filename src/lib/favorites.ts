"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "sgbus.favorites.v1";

type FavoritesMap = Record<string, { addedAt: number }>;

const EMPTY: FavoritesMap = Object.freeze({}) as FavoritesMap;

// Cache so getSnapshot returns a stable reference until storage actually changes.
let cachedRaw: string | null | undefined = undefined;
let cachedMap: FavoritesMap = EMPTY;

function readFresh(): FavoritesMap {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedMap;
  cachedRaw = raw;
  if (!raw) {
    cachedMap = EMPTY;
    return cachedMap;
  }
  try {
    cachedMap = JSON.parse(raw) as FavoritesMap;
  } catch {
    cachedMap = EMPTY;
  }
  return cachedMap;
}

function write(map: FavoritesMap) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
  // Invalidate cache so next snapshot re-reads
  cachedRaw = undefined;
  window.dispatchEvent(new Event("sgbus:favorites"));
}

function subscribe(cb: () => void) {
  const handler = () => {
    cachedRaw = undefined; // cross-tab or in-tab change → next snapshot re-reads
    cb();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("sgbus:favorites", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("sgbus:favorites", handler);
  };
}

function snapshot(): FavoritesMap {
  return readFresh();
}

function serverSnapshot(): FavoritesMap {
  return EMPTY;
}

export function useFavorites() {
  const map = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggle = useCallback((code: string) => {
    const current: FavoritesMap = { ...readFresh() };
    if (current[code]) {
      delete current[code];
    } else {
      current[code] = { addedAt: Date.now() };
    }
    write(current);
  }, []);

  const isFav = useCallback((code: string) => Boolean(map[code]), [map]);

  const codes = Object.keys(map).sort(
    (a, b) => (map[b].addedAt ?? 0) - (map[a].addedAt ?? 0),
  );

  return { isFav, toggle, codes };
}

export function useFavoriteCodes(): string[] {
  const { codes } = useFavorites();
  return codes;
}

export function useFavoritesMount() {
  useEffect(() => {
    // no-op, exists so callers can opt into hydration tick
  }, []);
}
