/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { GPS_BOUNDS, SPACEX_THEME_COLORS } from "../utils/constants";

interface TrackingMapProps {
  latitude: number;
  longitude: number;
  altitude: number;
  gpsSats: number;
  history: Array<{ lat: number; lng: number }>;
}

declare const window: any;

export default function TrackingMap({
  latitude,
  longitude,
  altitude,
  gpsSats,
  history,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamically load Leaflet CDN assets to prevent React 19 compilation bugs or asset styling errors
  useEffect(() => {
    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    script.onerror = () => {
      setLoadError("Failed to fetch map modules from telemetry satellites.");
    };
    document.head.appendChild(script);

    return () => {
      // Keep style & script to avoid reloading on re-renders, but clean up references if appropriate
    };
  }, []);

  // Initialize and update Map instance
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = window.L;
    if (!L) return;

    // Create Map on mount if not exists
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([latitude, longitude], 15);

      // Add CartoDB Dark Matter tile layer for an authentic high-contrast aerospace interface
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(mapRef.current);

      // Customized clean aerospace scale element
      L.control.scale({ imperial: false, position: "bottomright" }).addTo(mapRef.current);

      // Create orbital icon marker
      const radarIcon = L.divIcon({
        className: "relative",
        html: `
          <div class="flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-slate-950"></span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      // Add actual marker on map
      markerRef.current = L.marker([latitude, longitude], { icon: radarIcon }).addTo(mapRef.current);

      // Add real-time visual route history path
      pathRef.current = L.polyline([], {
        color: "#22d3ee", // Cyan-400 matching premium telemetry theme
        weight: 3,
        opacity: 0.9,
        dashArray: "4, 6",
      }).addTo(mapRef.current);
    }

    return () => {
      // No-op to persist map object across fast telemetry rerenders
    };
  }, [isLeafletLoaded]);

  // Handle stream updates (Marker position and Track trajectory)
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const newLatLng = [latitude, longitude];

    // Smoothly pan map to track telemetry
    mapRef.current.setView(newLatLng);

    // Update marker location
    if (markerRef.current) {
      markerRef.current.setLatLng(newLatLng);
    }

    // Update historical path trajectory
    if (pathRef.current && history.length > 0) {
      const pathPoints = history.map((item) => [item.lat, item.lng]);
      pathRef.current.setLatLngs(pathPoints);
    }
  }, [latitude, longitude, history]);

  // Recalculate size when container width/height changes (fits perfectly under our guidelines resizing safety rules)
  useEffect(() => {
    if (!mapRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      mapRef.current.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const triggerResetMap = () => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 16);
    }
  };

  return (
    <div id="tracking-map-panel" className="relative h-full flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Module Title Header overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-md">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
        <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider">
          LIVE ORBITAL SITE COMPASS
        </span>
      </div>

      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1">
        <button
          onClick={triggerResetMap}
          className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500 font-mono text-[10px] text-cyan-400 px-2 py-1.5 rounded shadow cursor-pointer transition-colors"
        >
          RE-CENTER GPS
        </button>
      </div>

      {/* Main Map Element */}
      <div className="flex-1 w-full bg-slate-950 relative">
        {!isLeafletLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 z-20">
            <div className="w-10 h-10 border-2 border-t-cyan-400 border-r-slate-800 border-b-slate-800 border-l-slate-800 rounded-full animate-spin"></div>
            <p className="font-mono text-xs text-slate-400">Initializing GPS Orbital Layer...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 px-8 text-center">
            <span className="text-red-400 text-3xl font-bold mb-2">⚠️</span>
            <p className="font-mono text-sm text-red-400 font-bold">{loadError}</p>
            <p className="font-mono text-xs text-slate-500 mt-2">Check internet connection. GCS requires OpenStreetMap tile fetching CDN libraries.</p>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Bottom Status Ticker Overlay */}
      <div className="bg-slate-950/90 border-t border-slate-800 font-mono text-[10px] text-slate-400 px-3 py-2 flex items-center justify-between gap-2 z-10">
        <div className="flex gap-4">
          <div>
            <span className="text-slate-500">LAT:</span> <span className="text-cyan-400 font-bold">{latitude.toFixed(6)}°</span>
          </div>
          <div>
            <span className="text-slate-500">LNG:</span> <span className="text-cyan-400 font-bold">{longitude.toFixed(6)}°</span>
          </div>
          <div>
            <span className="text-slate-500">GPS ALT:</span> <span className="text-cyan-400 font-bold">{altitude.toFixed(1)} m</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-emerald-400">{gpsSats} SATS CONNECTED</span>
        </div>
      </div>
    </div>
  );
}
