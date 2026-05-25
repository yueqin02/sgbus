"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
  Popup,
} from "react-map-gl/maplibre";
import type {
  MapRef,
  MapLayerMouseEvent,
  LayerProps,
  StyleSpecification,
} from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import { Loader2 } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import { loadStops } from "@/lib/stops";
import type { ArrivalsResponse, BusStop } from "@/lib/types";
import { ArrivalCard } from "@/components/ArrivalCard";
import { StarButton } from "@/components/StarButton";

const SG_CENTER = { longitude: 103.8198, latitude: 1.3521, zoom: 11 };

const MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

type StopProperties = { code: string; name: string };

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "stops",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#10b981", // emerald-500 for small
      25,
      "#059669", // emerald-600
      100,
      "#047857", // emerald-700
    ],
    "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24],
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(16, 185, 129, 0.25)",
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "stops",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
    "text-font": ["Open Sans Regular"],
  },
  paint: {
    "text-color": "#ecfdf5",
  },
};

const stopPointsLayer: LayerProps = {
  id: "stop-points",
  type: "circle",
  source: "stops",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-radius": 4,
    "circle-color": "#34d399", // emerald-400
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#ffffff",
  },
};

const busPointsLayer: LayerProps = {
  id: "bus-points",
  type: "circle",
  source: "buses",
  paint: {
    "circle-radius": 5,
    "circle-color": "#6ee7b7", // emerald-300
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(110, 231, 183, 0.35)",
    "circle-opacity": 0.95,
  },
};

export function MapView() {
  const mapRef = useRef<MapRef | null>(null);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [selected, setSelected] = useState<BusStop | null>(null);
  const [arrivals, setArrivals] = useState<ArrivalsResponse | null>(null);
  const [loadingArrivals, setLoadingArrivals] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStops().then((data) => {
      if (!cancelled) setStops(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopsGeoJSON = useMemo<FeatureCollection<Point, StopProperties>>(
    () => ({
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: { code: s.code, name: s.name },
      })),
    }),
    [stops],
  );

  const busesGeoJSON = useMemo<FeatureCollection<Point>>(() => {
    if (!arrivals) return { type: "FeatureCollection", features: [] };
    const features = arrivals.services
      .map((svc) => svc.next)
      .filter(
        (n): n is NonNullable<typeof n> =>
          !!n && Number.isFinite(n.latitude) && Number.isFinite(n.longitude) &&
          n.latitude !== 0 && n.longitude !== 0,
      )
      .map((bus, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [bus.longitude, bus.latitude],
        },
        properties: { id: i },
      }));
    return { type: "FeatureCollection", features };
  }, [arrivals]);

  async function selectStop(stop: BusStop) {
    setSelected(stop);
    setArrivals(null);
    setLoadingArrivals(true);
    mapRef.current?.flyTo({
      center: [stop.lng, stop.lat],
      zoom: Math.max(mapRef.current.getZoom() ?? 11, 15),
      duration: 700,
    });
    try {
      const res = await fetch(`/api/arrivals/${stop.code}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ArrivalsResponse;
      setArrivals(data);
    } catch {
      setArrivals(null);
    } finally {
      setLoadingArrivals(false);
    }
  }

  function handleClick(e: MapLayerMouseEvent) {
    const feature = e.features?.[0];
    if (!feature) return;
    if (feature.layer?.id === "clusters") {
      const coords =
        feature.geometry.type === "Point"
          ? (feature.geometry.coordinates as [number, number])
          : null;
      if (coords) {
        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: coords,
            zoom: Math.min((map.getZoom() ?? 11) + 2, 16),
            duration: 500,
          });
        }
      }
      return;
    }
    if (feature.layer?.id === "stop-points") {
      const props = feature.properties as StopProperties | undefined;
      if (!props) return;
      const stop = stops.find((s) => s.code === props.code);
      if (stop) selectStop(stop);
    }
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={SG_CENTER}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["clusters", "stop-points"]}
      cursor="auto"
      onClick={handleClick}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl
        position="top-right"
        trackUserLocation
        showAccuracyCircle
      />

      <Source
        id="stops"
        type="geojson"
        data={stopsGeoJSON}
        cluster
        clusterMaxZoom={14}
        clusterRadius={40}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...stopPointsLayer} />
      </Source>

      <Source id="buses" type="geojson" data={busesGeoJSON}>
        <Layer {...busPointsLayer} />
      </Source>

      {selected && (
        <Popup
          longitude={selected.lng}
          latitude={selected.lat}
          anchor="bottom"
          offset={12}
          closeOnClick={false}
          closeButton
          maxWidth="320px"
          onClose={() => {
            setSelected(null);
            setArrivals(null);
          }}
        >
          <div className="w-[280px] max-w-[80vw] rounded-xl bg-zinc-950 p-3 text-zinc-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selected.name}</p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                  Stop {selected.code}
                </p>
              </div>
              <StarButton code={selected.code} />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {loadingArrivals && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading arrivals…
                </div>
              )}
              {!loadingArrivals && arrivals && arrivals.services.length === 0 && (
                <p className="text-xs text-zinc-500">No buses right now.</p>
              )}
              {!loadingArrivals &&
                arrivals?.services.slice(0, 4).map((svc) => (
                  <ArrivalCard key={svc.serviceNo} service={svc} />
                ))}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
