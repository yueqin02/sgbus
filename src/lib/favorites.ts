"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "sgbus.favorites.v1";

type FavoritesMap = Record<string, { addedAt: number }>;

function read(): FavoritesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FavoritesMap;
  } catch {
    return {};
  }
}

function write(map: FavoritesMap) {
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("sgbus:favorites"));
}

const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("sgbus:favorites", handler);
  subscribers.add(cb);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("sgbus:favorites", handler);
    subscribers.delete(cb);
  };
}

function snapshot(): FavoritesMap {
  return read();
}

function serverSnapshot(): FavoritesMap {
  return {};
}

export function useFavorites() {
  const map = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const toggle = useCallback((code: string) => {
    const current = read();
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
