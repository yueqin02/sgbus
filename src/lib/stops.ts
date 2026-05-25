import type { BusStop } from "./types";

let cache: BusStop[] | null = null;
let cachePromise: Promise<BusStop[]> | null = null;

export async function loadStops(): Promise<BusStop[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;
  cachePromise = fetch("/stops.json")
    .then((r) => r.json() as Promise<BusStop[]>)
    .then((data) => {
      cache = data;
      return data;
    });
  return cachePromise;
}

export function findStop(stops: BusStop[], code: string): BusStop | undefined {
  return stops.find((s) => s.code === code);
}
