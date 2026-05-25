export type BusStop = {
  code: string;
  lat: number;
  lng: number;
  name: string;
};

export type BusLoad = "SEA" | "SDA" | "LSD";

export type BusType = "SD" | "DD" | "BD";

export type Feature = "WAB" | "";

export type NextBus = {
  estimatedArrival: string;
  latitude: number;
  longitude: number;
  load: BusLoad | "";
  feature: Feature;
  type: BusType | "";
};

export type ArrivingService = {
  serviceNo: string;
  operator: string;
  next: NextBus | null;
  next2: NextBus | null;
  next3: NextBus | null;
};

export type ArrivalsResponse = {
  busStopCode: string;
  services: ArrivingService[];
  fetchedAt: string;
  source: "lta" | "mock";
  note?: string;
};
