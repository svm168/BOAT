"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
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

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [35, 35] });
  }, [map, points]);
  return null;
}

export type BikeMapProps = {
  center: { lat: number; lng: number };
  trail: MapPoint[];
  last: MapPoint | null;
  label: string;
};

export function BikeMap({ center, trail, last, label }: BikeMapProps) {
  const path = useMemo(
    () => trail.map((p) => [p.lat, p.lng] as [number, number]),
    [trail]
  );
  const points = useMemo(() => (last ? [...trail, last] : trail), [trail, last]);

  const markerIcon = useMemo(
    () => (last ? createPinIcon(last.isMock) : undefined),
    [last?.isMock]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={16}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {path.length > 1 ? (
        <Polyline positions={path} pathOptions={{ color: "#1f4d3a", weight: 4, opacity: 0.8 }} />
      ) : null}

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

      <Fit points={points.length ? points : [center]} />
    </MapContainer>
  );
}
