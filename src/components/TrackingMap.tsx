/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { GPS_BOUNDS, SPACEX_THEME_COLORS } from "../utils/constants";
import { Waypoint } from "../types";

interface TrackingMapProps {
  latitude: number;
  longitude: number;
  altitude: number;
  gpsSats: number;
  history: Array<{ lat: number; lng: number }>;
  waypoints?: Waypoint[];
  descentRate: number;
}

declare const window: any;

export default function TrackingMap({
  latitude,
  longitude,
  altitude,
  gpsSats,
  history,
  waypoints,
  descentRate,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);
  const plannedPathRef = useRef<any>(null);
  const waypointLayerRef = useRef<any>(null);
  const landingCircleRef = useRef<any>(null);
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

      // Add real planned route waypoints path
      plannedPathRef.current = L.polyline([], {
        color: "#c084fc", // Purple-400
        weight: 2.5,
        opacity: 0.7,
        dashArray: "5, 8",
      }).addTo(mapRef.current);

      // Create LayerGroup for individual waypoint markers
      waypointLayerRef.current = L.layerGroup().addTo(mapRef.current);

      // Create dynamic projected landing zone prediction circle
      landingCircleRef.current = L.circle([latitude, longitude], {
        radius: 0,
        color: "#f43f5e", // Rose-500
        fillColor: "#f43f5e",
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "3, 6",
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

    // Update planned path waypoints
    if (plannedPathRef.current && waypoints && waypoints.length > 0) {
      const plannedPoints = waypoints.map((wp) => [wp.lat, wp.lng]);
      plannedPathRef.current.setLatLngs(plannedPoints);
    }

    // Update active waypoint markers on leaf map
    if (waypointLayerRef.current && waypoints) {
      waypointLayerRef.current.clearLayers();
      waypoints.forEach((wp, index) => {
        const wpIcon = L.divIcon({
          className: "relative",
          html: `
            <div class="flex items-center justify-center">
              <span class="absolute inline-flex h-5 w-5 rounded-full bg-purple-500 opacity-25"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500 border border-slate-900"></span>
              <span class="absolute -top-3 bg-slate-950/95 border border-slate-850 text-[7px] font-mono text-purple-300 font-bold px-1.2 py-0.4 rounded shadow whitespace-nowrap">${index + 1}. ${wp.name}</span>
            </div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(waypointLayerRef.current);
      });
    }

    // Compute dynamic Projected Landing Zone uncertainty circle (radius based on current flight decay vectors)
    if (landingCircleRef.current) {
      let radius = 0;
      if (altitude > 1.5 && descentRate > 0.4) {
        const remainingTimeSec = altitude / descentRate;
        // Radial error grows linearly with descent remaining duration at standard offset drift speed (3.2 m/s), 10m base margin
        radius = remainingTimeSec * 3.2 + 10;
        // Cap the radius to fit the bounds beautifully
        radius = Math.max(10, Math.min(800, radius));
      }

      if (radius > 0) {
        landingCircleRef.current.setLatLng(newLatLng);
        landingCircleRef.current.setRadius(radius);
        landingCircleRef.current.setStyle({
          color: "#f43f5e",
          fillColor: "#f43f5e",
          opacity: 0.8,
          fillOpacity: 0.12,
        });
      } else {
        // Render a high-precision landing mark if altitude is low
        if (altitude <= 2) {
          landingCircleRef.current.setLatLng(newLatLng);
          landingCircleRef.current.setRadius(5);
          landingCircleRef.current.setStyle({
            color: "#10b981", // Emerald success confirmation
            fillColor: "#10b981",
            opacity: 0.8,
            fillOpacity: 0.35,
          });
        } else {
          landingCircleRef.current.setRadius(0);
          landingCircleRef.current.setStyle({
            opacity: 0,
            fillOpacity: 0,
          });
        }
      }
    }
  }, [latitude, longitude, altitude, descentRate, history, waypoints]);

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
      <div className="bg-slate-950/90 border-t border-slate-800 font-mono text-[10px] text-slate-400 px-3 py-2 flex flex-wrap items-center justify-between gap-y-1 z-10">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div>
            <span className="text-slate-500">LAT:</span> <span className="text-cyan-400 font-bold">{latitude.toFixed(6)}°</span>
          </div>
          <div>
            <span className="text-slate-500">LNG:</span> <span className="text-cyan-400 font-bold">{longitude.toFixed(6)}°</span>
          </div>
          <div>
            <span className="text-slate-500">GPS ALT:</span> <span className="text-cyan-400 font-bold">{altitude.toFixed(1)} m</span>
          </div>
          {altitude > 1.5 && descentRate > 0.4 && (
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 mr-1">PLZ PLOT:</span>
              <span className="text-rose-400 font-bold">R = {Math.round((altitude / descentRate) * 3.2 + 10)}m</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-emerald-400">{gpsSats} SATS CONNECTED</span>
        </div>
      </div>
    </div>
  );
}
