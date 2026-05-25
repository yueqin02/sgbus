import type {
  ArrivalsResponse,
  ArrivingService,
  BusLoad,
  BusType,
  Feature,
  NextBus,
} from "./types";

const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";

type RawNextBus = {
  EstimatedArrival: string;
  Latitude: string;
  Longitude: string;
  Load: string;
  Feature: string;
  Type: string;
};

type RawService = {
  ServiceNo: string;
  Operator: string;
  NextBus: RawNextBus;
  NextBus2: RawNextBus;
  NextBus3: RawNextBus;
};

type RawArrivalsResponse = {
  BusStopCode: string;
  Services: RawService[];
};

function normalizeNextBus(raw: RawNextBus | undefined): NextBus | null {
  if (!raw || !raw.EstimatedArrival) return null;
  return {
    estimatedArrival: raw.EstimatedArrival,
    latitude: parseFloat(raw.Latitude) || 0,
    longitude: parseFloat(raw.Longitude) || 0,
    load: (raw.Load as BusLoad) || "",
    feature: (raw.Feature as Feature) || "",
    type: (raw.Type as BusType) || "",
  };
}

function normalizeService(raw: RawService): ArrivingService {
  return {
    serviceNo: raw.ServiceNo,
    operator: raw.Operator,
    next: normalizeNextBus(raw.NextBus),
    next2: normalizeNextBus(raw.NextBus2),
    next3: normalizeNextBus(raw.NextBus3),
  };
}

export async function fetchArrivals(
  busStopCode: string,
): Promise<ArrivalsResponse> {
  const key = process.env.LTA_ACCOUNT_KEY;
  if (!key) {
    return mockArrivals(busStopCode, "LTA_ACCOUNT_KEY not set in .env.local");
  }

  try {
    const res = await fetch(
      `${LTA_BASE}/v3/BusArrival?BusStopCode=${encodeURIComponent(busStopCode)}`,
      {
        headers: { AccountKey: key, accept: "application/json" },
        cache: "no-store",
      },
    );

    if (res.status === 401) {
      return mockArrivals(
        busStopCode,
        "LTA key rejected (401) — confirm the registration email or regenerate the key at datamall.lta.gov.sg",
      );
    }
    if (!res.ok) {
      return mockArrivals(busStopCode, `LTA returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as RawArrivalsResponse;
    return {
      busStopCode: data.BusStopCode || busStopCode,
      services: (data.Services || []).map(normalizeService),
      fetchedAt: new Date().toISOString(),
      source: "lta",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return mockArrivals(busStopCode, `LTA fetch failed: ${msg}`);
  }
}

function mockArrivals(busStopCode: string, note: string): ArrivalsResponse {
  const now = Date.now();
  const iso = (msOffset: number) => new Date(now + msOffset).toISOString();
  return {
    busStopCode,
    fetchedAt: new Date().toISOString(),
    source: "mock",
    note,
    services: [
      {
        serviceNo: "174",
        operator: "SBST",
        next: {
          estimatedArrival: iso(2 * 60_000),
          latitude: 1.2821,
          longitude: 103.81722,
          load: "SEA",
          feature: "WAB",
          type: "DD",
        },
        next2: {
          estimatedArrival: iso(10 * 60_000),
          latitude: 1.275,
          longitude: 103.812,
          load: "SDA",
          feature: "WAB",
          type: "DD",
        },
        next3: {
          estimatedArrival: iso(22 * 60_000),
          latitude: 1.27,
          longitude: 103.81,
          load: "LSD",
          feature: "",
          type: "SD",
        },
      },
      {
        serviceNo: "61",
        operator: "SBST",
        next: {
          estimatedArrival: iso(4 * 60_000),
          latitude: 1.28,
          longitude: 103.815,
          load: "SEA",
          feature: "WAB",
          type: "SD",
        },
        next2: {
          estimatedArrival: iso(14 * 60_000),
          latitude: 1.276,
          longitude: 103.814,
          load: "SEA",
          feature: "WAB",
          type: "DD",
        },
        next3: null,
      },
      {
        serviceNo: "961",
        operator: "SMRT",
        next: {
          estimatedArrival: iso(7 * 60_000),
          latitude: 1.281,
          longitude: 103.819,
          load: "SDA",
          feature: "WAB",
          type: "DD",
        },
        next2: null,
        next3: null,
      },
    ],
  };
}
