"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
  source?: string;
  note?: string;
  isMock?: boolean;
};

function createPinIcon(isMock?: boolean) {
  const pinColor = isMock ? "#d97706" : "#1f4d3a"; // Amber for mock scanner, moss green for real fix
  const ringColor = isMock ? "rgba(217, 119, 6, 0.35)" : "rgba(31, 77, 58, 0.35)";

  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="17" cy="41" rx="6" ry="2.5" fill="rgba(0,0,0,0.22)"/>
      <path d="M17 0C7.61 0 0 7.61 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61 26.39 0 17 0Z" fill="${pinColor}"/>
      <circle cx="17" cy="17" r="12" fill="#FAF6EE"/>
      <path d="M12.5 18.5a2 2 0 100-4 2 2 0 000 4zm9 0a2 2 0 100-4 2 2 0 000 4zm-7-2h2l1.5-3h2.5m-5.5 3l1.5 2.5h3" stroke="${pinColor}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <span style="position:absolute;width:28px;height:28px;border-radius:50%;background:${ringColor};"></span>
        ${svg}
      </div>
    `,
    className: "boat-map-pin",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

function createDeviceIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;">
        <span style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(25, 118, 210, 0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <span style="width:14px;height:14px;border-radius:50%;background:#1976D2;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></span>
      </div>
    `,
    className: "boat-device-pin",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function FitInitial({ point }: { point: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([point.lat, point.lng], 16.5);
  }, [map, point.lat, point.lng]);
  return null;
}

function FitRouteBounds({
  device,
  dest,
  coords,
}: {
  device: { lat: number; lng: number } | null;
  dest: { lat: number; lng: number } | null;
  coords: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (device && dest && coords.length > 0) {
      const bounds = L.latLngBounds([
        [device.lat, device.lng],
        [dest.lat, dest.lng],
        ...coords,
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }, [map, device, dest, coords]);
  return null;
}

export type BikeMapProps = {
  center: { lat: number; lng: number };
  trail?: MapPoint[];
  last: MapPoint | null;
  label: string;
};

export function BikeMap({ center, last, label }: BikeMapProps) {
  const target = last ?? center;

  const [deviceLoc, setDeviceLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const markerIcon = useMemo(
    () => (last ? createPinIcon(last.isMock) : undefined),
    [last?.isMock]
  );

  const deviceIcon = useMemo(() => createDeviceIcon(), []);

  const fetchShortestPath = () => {
    if (!last) return;
    setIsLoadingRoute(true);
    setRouteError(null);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setRouteError("Geolocation is not supported by your browser");
      setIsLoadingRoute(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dev = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDeviceLoc(dev);

        try {
          // Query OpenStreetMap OSRM Routing API for shortest road path
          const url = `https://router.project-osrm.org/route/v1/driving/${dev.lng},${dev.lat};${last.lng},${last.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            );
            setRouteCoords(coords);
            // Pedestrian walking speed ~5 km/h (1.39 m/s or 83.3 m/min)
            const walkingDurationS = route.distance / 1.39;
            setRouteInfo({
              distanceM: route.distance,
              durationS: walkingDurationS,
            });
          } else {
            // Fallback direct line between device and bike
            setRouteCoords([[dev.lat, dev.lng], [last.lat, last.lng]]);
          }
        } catch (err) {
          console.error("OSRM road routing error:", err);
          // Fallback direct line
          setRouteCoords([[dev.lat, dev.lng], [last.lat, last.lng]]);
        } finally {
          setIsLoadingRoute(false);
        }
      },
      (err) => {
        setRouteError(err.message || "Could not acquire device location");
        setIsLoadingRoute(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Attempt auto-routing when bike location is present
  useEffect(() => {
    if (last) {
      fetchShortestPath();
    }
  }, [last?.lat, last?.lng]);

  const clearRoute = () => {
    setRouteCoords([]);
    setRouteInfo(null);
    setRouteError(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={[target.lat, target.lng]}
        zoom={16.5}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Shortest Road Route Polyline from Device to Bike */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: "#1F4D3A",
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Device Current Location Marker */}
        {deviceLoc && (
          <Marker position={[deviceLoc.lat, deviceLoc.lng]} icon={deviceIcon}>
            <Popup>
              <div className="space-y-0.5 py-0.5 text-xs">
                <div className="font-bold text-sm text-[#1976D2]">Your Device</div>
                <div className="text-ink/75">
                  {deviceLoc.lat.toFixed(5)}, {deviceLoc.lng.toFixed(5)}
                </div>
                {routeInfo && (
                  <div className="font-medium text-moss">
                    {routeInfo.distanceM < 1000
                      ? `${Math.round(routeInfo.distanceM)} m away`
                      : `${(routeInfo.distanceM / 1000).toFixed(2)} km away`}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Bike Last Location Marker */}
        {last && markerIcon ? (
          <Marker position={[last.lat, last.lng]} icon={markerIcon}>
            <Popup>
              <div className="space-y-1 py-0.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-sm text-moss">
                  <span>{label}</span>
                  {last.isMock && (
                    <span className="rounded bg-amber-100 px-1 py-0.2 text-[10px] font-semibold text-amber-800">
                      Mock Scanner
                    </span>
                  )}
                </div>
                <div className="text-ink/75">
                  <strong>Lat, Lng:</strong> {last.lat.toFixed(5)}, {last.lng.toFixed(5)}
                </div>
                {last.note && (
                  <div className="text-ink/70">
                    <strong>Location:</strong> {last.note}
                  </div>
                )}
                {last.source && (
                  <div className="text-ink/60 capitalize">
                    <strong>Source:</strong> {last.source}
                  </div>
                )}
                {last.recordedAt && (
                  <div className="text-ink/50 text-[11px]">
                    {new Date(last.recordedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null}

        {/* Camera auto-fit */}
        {routeCoords.length > 0 && deviceLoc && last ? (
          <FitRouteBounds device={deviceLoc} dest={last} coords={routeCoords} />
        ) : (
          <FitInitial point={target} />
        )}
      </MapContainer>

      {/* Floating Road Route Navigation Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {routeInfo && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur border border-ink/10 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-leaf"></span>
            <span className="font-semibold text-moss">
              {routeInfo.distanceM < 1000
                ? `${Math.round(routeInfo.distanceM)} m`
                : `${(routeInfo.distanceM / 1000).toFixed(2)} km`}
            </span>
            <span className="text-ink/50">·</span>
            <span className="text-ink/75">
              ~{Math.round(routeInfo.durationS / 60) || 1} min on foot
            </span>
            <button
              onClick={clearRoute}
              title="Clear Route"
              className="ml-1 text-ink/40 hover:text-ink/80 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {routeError && !routeInfo && (
          <div className="pointer-events-auto rounded-xl bg-white/90 px-3 py-1 text-[11px] text-clay shadow backdrop-blur">
            {routeError}
          </div>
        )}

        <div className="pointer-events-auto ml-auto flex items-center gap-1.5">
          <button
            onClick={fetchShortestPath}
            disabled={isLoadingRoute}
            title="Calculate shortest road path from your location to bicycle"
            className="flex items-center gap-1.5 rounded-xl bg-moss px-3 py-1.5 text-xs font-semibold text-sand shadow-md transition hover:bg-moss/90 disabled:opacity-60"
          >
            {isLoadingRoute ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sand border-t-transparent"></span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            )}
            <span>{routeCoords.length > 0 ? "Refresh Road Route" : "Route to Bike"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
