/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  Compass,
  TrendingUp,
  Gauge,
  Zap,
  Award,
  CheckCircle,
  AlertCircle,
  MapPin,
  Battery,
  Clock,
  Plus,
  Trash2,
  ListRestart,
  Sliders,
  Target,
} from "lucide-react";
import { TelemetryData, Waypoint } from "../types";
import { LAUNCHPAD_LAT, LAUNCHPAD_LNG } from "../utils/constants";

interface MissionAnalyticsProps {
  history: TelemetryData[];
  current: TelemetryData | null;
  waypoints: Waypoint[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
}

// Helper: Haversine distance formula to calculate distance in meters between two GPS coordinates
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MissionAnalytics({
  history,
  current,
  waypoints,
  onUpdateWaypoints,
}: MissionAnalyticsProps) {
  const [activePlanPreset, setActivePlanPreset] = useState<string>("SPIRAL");
  
  // Custom manual waypoint editor inputs state
  const [newWpName, setNewWpName] = useState("");
  const [newWpLat, setNewWpLat] = useState(LAUNCHPAD_LAT.toString());
  const [newWpLng, setNewWpLng] = useState(LAUNCHPAD_LNG.toString());
  const [newWpAlt, setNewWpAlt] = useState("500");

  // Presets creator function
  const applyPresetWaypoints = (presetKey: string) => {
    setActivePlanPreset(presetKey);
    let generated: Waypoint[] = [];
    
    if (presetKey === "SPIRAL") {
      // Helix spiraling style descent plan
      generated = [
        { id: "wp1", name: "Launchpad Apex", lat: LAUNCHPAD_LAT, lng: LAUNCHPAD_LNG, alt: 850 },
        { id: "wp2", name: "North Descent Node", lat: LAUNCHPAD_LAT + 0.0003, lng: LAUNCHPAD_LNG + 0.0004, alt: 600 },
        { id: "wp3", name: "Estward Re-entry Cluster", lat: LAUNCHPAD_LAT + 0.0006, lng: LAUNCHPAD_LNG + 0.0008, alt: 400 },
        { id: "wp4", name: "South Outer Orbit Anchor", lat: LAUNCHPAD_LAT + 0.0009, lng: LAUNCHPAD_LNG + 0.0011, alt: 200 },
        { id: "wp5", name: "Stabilized Ground Zero Target", lat: LAUNCHPAD_LAT + 0.0011, lng: LAUNCHPAD_LNG + 0.0015, alt: 0 },
      ];
    } else if (presetKey === "LINEAR") {
      // Linear glide transverse profile
      generated = [
        { id: "wp1", name: "North Ascent Gate", lat: LAUNCHPAD_LAT, lng: LAUNCHPAD_LNG, alt: 800 },
        { id: "wp2", name: "Mid-Flight Separation Hub", lat: LAUNCHPAD_LAT + 0.0004, lng: LAUNCHPAD_LNG + 0.0006, alt: 500 },
        { id: "wp3", name: "Transvection Line Node", lat: LAUNCHPAD_LAT + 0.0008, lng: LAUNCHPAD_LNG + 0.0012, alt: 250 },
        { id: "wp4", name: "Runway Approach Corridor", lat: LAUNCHPAD_LAT + 0.0012, lng: LAUNCHPAD_LNG + 0.0018, alt: 0 },
      ];
    } else if (presetKey === "STATION") {
      // Static Station keeping high altitude orbit
      generated = [
        { id: "wp1", name: "Launch Apex", lat: LAUNCHPAD_LAT, lng: LAUNCHPAD_LNG, alt: 850 },
        { id: "wp2", name: "Station Point A", lat: LAUNCHPAD_LAT + 0.0001, lng: LAUNCHPAD_LNG + 0.0001, alt: 850 },
        { id: "wp3", name: "Station Point B", lat: LAUNCHPAD_LAT + 0.0001, lng: LAUNCHPAD_LNG - 0.0001, alt: 830 },
        { id: "wp4", name: "Safe Corridor Core", lat: LAUNCHPAD_LAT, lng: LAUNCHPAD_LNG, alt: 800 },
      ];
    }
    onUpdateWaypoints(generated);
  };

  // Add customized manual waypoint
  const handleAddWaypoint = () => {
    const latNum = parseFloat(newWpLat);
    const lngNum = parseFloat(newWpLng);
    const altNum = parseFloat(newWpAlt);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(altNum)) {
      alert("Please specify valid latitude, longitude, and target altitude values.");
      return;
    }

    const name = newWpName.trim() || `WP-${waypoints.length + 1}`;
    const newWp: Waypoint = {
      id: `wp-custom-${Date.now()}`,
      name,
      lat: latNum,
      lng: lngNum,
      alt: altNum,
    };

    onUpdateWaypoints([...waypoints, newWp]);
    setNewWpName("");
    // Keep user's last lat/lng for easy sequential placing with minor offset adjustments
    setNewWpLat((latNum + 0.0001).toFixed(6));
    setNewWpLng((lngNum + 0.0001).toFixed(6));
  };

  const handleDeleteWaypoint = (id: string) => {
    onUpdateWaypoints(waypoints.filter((wp) => wp.id !== id));
  };

  // 1. CALCULATE CUMULATIVE CORE STATISTICS
  const analytics = useMemo(() => {
    if (history.length === 0) {
      return {
        totalFlightTime: 0,
        peakAltitude: 0,
        batteryDrainTotal: 0,
        avgBatteryDrainRate: 0, // V per minute
        deviationMin: 0,
        deviationMax: 0,
        deviationAvg: 0,
        systemIntegrity: 100,
        safetyRating: "EXCELLENT",
        activeWaypointsMetCount: 0,
      };
    }

    // A. Total Uptime / Flight Time
    const startTime = history[0].timestamp.getTime();
    const endTime = history[history.length - 1].timestamp.getTime();
    const totalFlightTime = Math.max(0, (endTime - startTime) / 1000); // seconds

    // B. Peak Altitude reached
    const peakAltitude = Math.max(...history.map((h) => h.altitude));

    // C. Battery Drain rate
    const startVolt = history[0].voltage;
    const endVolt = history[history.length - 1].voltage;
    const batteryDrainTotal = Math.max(0, startVolt - endVolt);
    const durationMinutes = totalFlightTime / 60;
    const avgBatteryDrainRate = durationMinutes > 0 ? batteryDrainTotal / durationMinutes : 0; // V/min

    // D. Trajectory Deviation stats vs planned Waypoint path
    // For each history packet, find nearest waypoint's horizontal coordinate distance (Haversine)
    let totalDeviation = 0;
    let deviationMax = 0;
    let deviationMin = Infinity;
    let validDeviationCount = 0;

    history.forEach((pkt) => {
      if (waypoints.length === 0) return;
      // find nearest waypoint horizontally
      const distances = waypoints.map((wp) => calculateHaversineDistance(pkt.gpsLat, pkt.gpsLng, wp.lat, wp.lng));
      const minDistance = Math.min(...distances);
      
      deviationMax = Math.max(deviationMax, minDistance);
      deviationMin = Math.min(deviationMin, minDistance);
      totalDeviation += minDistance;
      validDeviationCount++;
    });

    const deviationAvg = validDeviationCount > 0 ? totalDeviation / validDeviationCount : 0;
    const cleanDeviationMin = deviationMin === Infinity ? 0 : deviationMin;

    // E. System Integrity Score Calculation
    // Starts at 100%, drops for fault flags, GPS sat drops, abnormal descent rates or severe off-track deviation
    let integrity = 100;
    const last = history[history.length - 1];

    if (last) {
      if (last.descentRateFault) integrity -= 20;
      if (last.gpsUnavailable) integrity -= 30;
      if (last.separationFailure) integrity -= 25;
      if (last.gpsSats < 6) integrity -= 15;
      if (last.voltage < 7.0) integrity -= Math.round((7.0 - last.voltage) * 35);
    }
    
    // Penalize if average deviation is huge (e.g. over 150m off track)
    if (deviationAvg > 150) {
      integrity -= Math.min(25, Math.round((deviationAvg - 150) / 10));
    }
    integrity = Math.max(5, Math.min(100, integrity));

    // F. Flight Safety Quality Label
    let safetyRating = "EXCELLENT";
    if (integrity < 50) safetyRating = "CRITICAL FAIL";
    else if (integrity < 75) safetyRating = "RISKY / CAUTION";
    else if (integrity < 90) safetyRating = "MARGINAL STABLE";

    // G. Waypoint meetings (Count waypoints having telemetry within 50 meters of coordinate boundaries)
    let waypointsMet = 0;
    waypoints.forEach((wp) => {
      const reached = history.some((pkt) => {
        const hDist = calculateHaversineDistance(pkt.gpsLat, pkt.gpsLng, wp.lat, wp.lng);
        const altDiff = Math.abs(pkt.altitude - wp.alt);
        return hDist < 50 && altDiff < 60; // Met condition: horizontal distance < 50m and altitude delta < 60m
      });
      if (reached) waypointsMet++;
    });

    return {
      totalFlightTime,
      peakAltitude,
      batteryDrainTotal,
      avgBatteryDrainRate,
      deviationMin: cleanDeviationMin,
      deviationMax,
      deviationAvg,
      systemIntegrity: integrity,
      safetyRating,
      activeWaypointsMetCount: waypointsMet,
    };
  }, [history, waypoints]);

  // 2. DATA PREPARATION FOR RECHARTS
  // We want to map actual telemetry against planned values over time/packet indices
  const chartData = useMemo(() => {
    // Take a downsampled distribution of history points up to 30 elements to render comfortably
    const downsampleFactor = Math.max(1, Math.ceil(history.length / 30));
    const processed = history.filter((_, idx) => idx % downsampleFactor === 0);

    return processed.map((pkt, idx) => {
      // Find closest waypoint target altitude for this segment
      let plannedAlt = 0;
      let plannedLat = LAUNCHPAD_LAT;
      let plannedLng = LAUNCHPAD_LNG;
      let wpName = "N/A";

      if (waypoints.length > 0) {
        // Approximate which waypoint corresponds dynamically by history index percentage
        const progressPct = idx / Math.max(1, processed.length - 1);
        const targetWpIdx = Math.min(waypoints.length - 1, Math.floor(progressPct * waypoints.length));
        const targetWp = waypoints[targetWpIdx];
        plannedAlt = targetWp.alt;
        plannedLat = targetWp.lat;
        plannedLng = targetWp.lng;
        wpName = targetWp.name;
      }

      // Calculate path deviation distance in meters
      const trackingDeviation = calculateHaversineDistance(pkt.gpsLat, pkt.gpsLng, plannedLat, plannedLng);

      // Estimate battery drain percentage index
      const remainingLifePct = Math.max(0, ((pkt.voltage - 6.0) / 2.4) * 100);

      return {
        index: pkt.packetCount,
        missionTime: pkt.missionTime,
        state: pkt.state,
        actualAltitude: Math.round(pkt.altitude),
        plannedAltitude: Math.round(plannedAlt),
        voltage: parseFloat(pkt.voltage.toFixed(2)),
        drainRate: parseFloat((Math.max(0, 8.4 - pkt.voltage) * 10).toFixed(2)), // simulated depletion metrics
        pathDeviation: Math.round(trackingDeviation),
        saturation: pkt.gpsSats,
        stateLabel: pkt.state,
        wpName,
      };
    });
  }, [history, waypoints]);

  // Handle auto preset load on first boot if waypoints are empty
  useEffect(() => {
    if (waypoints.length === 0) {
      applyPresetWaypoints("SPIRAL");
    }
  }, []);

  return (
    <div id="mission-analytics-dashboard" className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Tab Header bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
            CANSAT MISSION ANALYTICS PANEL & PLANNER
          </h2>
        </div>

        {/* Action presets for quick launch planning */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-slate-800 rounded">
          <span className="font-mono text-[9px] text-slate-500 font-bold uppercase px-2">PLAN SELECTOR:</span>
          <button
            onClick={() => applyPresetWaypoints("SPIRAL")}
            className={`font-mono text-[10px] px-2.5 py-1 rounded transition-colors uppercase ${
              activePlanPreset === "SPIRAL"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Spiral Helix
          </button>
          <button
            onClick={() => applyPresetWaypoints("LINEAR")}
            className={`font-mono text-[10px] px-2.5 py-1 rounded transition-colors uppercase ${
              activePlanPreset === "LINEAR"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Linear Glide
          </button>
          <button
            onClick={() => applyPresetWaypoints("STATION")}
            className={`font-mono text-[10px] px-2.5 py-1 rounded transition-colors uppercase ${
              activePlanPreset === "STATION"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Station Anchor
          </button>
        </div>
      </div>

      {/* CORE STATS SUMMARY GRID (METRICS DISPLAY) */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 border-b border-slate-800 bg-slate-950/20">
        
        {/* Total flight time */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">FLIGHT ELAPSED</span>
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-slate-100">
              {analytics.totalFlightTime >= 60
                ? `${Math.floor(analytics.totalFlightTime / 60)}m ${Math.round(analytics.totalFlightTime % 60)}s`
                : `${Math.round(analytics.totalFlightTime)}s`}
            </span>
            <span className="block text-[8px] font-mono text-slate-500 uppercase mt-1">Uptime Duration</span>
          </div>
        </div>

        {/* Peak Altitude */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">MAX ALTITUDE</span>
            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-emerald-400">
              {analytics.peakAltitude.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500 ml-1">m</span>
            <span className="block text-[8px] font-mono text-slate-500 uppercase mt-1">Peak Height Reached</span>
          </div>
        </div>

        {/* Battery Drain Rate */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">BATTERY DRAIN</span>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-amber-400">
              {analytics.avgBatteryDrainRate.toFixed(3)}
            </span>
            <span className="text-[10px] font-mono text-slate-500 ml-1">V/min</span>
            <span className="block text-[8px] font-mono text-slate-500 uppercase mt-1">Avg Volts Decay</span>
          </div>
        </div>

        {/* Trajectory Deviation average */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">OFF-TRACK DEVIATION</span>
            <Compass className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-slate-100">
              {analytics.deviationAvg.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-500 ml-1">m</span>
            <span className="block text-[8px] font-mono text-slate-500 uppercase mt-1">Average Path Error</span>
          </div>
        </div>

        {/* Waypoint Met Progress */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">WAYPOINTS LINKED</span>
            <MapPin className="h-3.5 w-3.5 text-pink-400" />
          </div>
          <div>
            <span className="text-xl font-mono font-bold text-pink-400">
              {analytics.activeWaypointsMetCount}
            </span>
            <span className="text-xs font-mono text-slate-500">/{waypoints.length}</span>
            <span className="block text-[8px] font-mono text-slate-500 uppercase mt-1">Trajectory Markers reached</span>
          </div>
        </div>

        {/* System Integrity & Safety rating */}
        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider">FLIGHT INTEGRITY</span>
            <CheckCircle className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div>
            <span className={`text-xl font-mono font-bold ${
              analytics.systemIntegrity >= 85 
                ? "text-emerald-400" 
                : analytics.systemIntegrity >= 65 
                ? "text-yellow-400" 
                : "text-red-400"
            }`}>
              {analytics.systemIntegrity}%
            </span>
            <span className="block text-[7.5px] font-mono uppercase tracking-tight text-slate-500 mt-1">
              STATUS: {analytics.safetyRating}
            </span>
          </div>
        </div>

      </div>

      {/* CORE GRAPH VISUALIZERS LAYER */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Side: Dynamic Trajectory charts */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* RECHARTS PLOT A: Planned vs Actual Altitude Path Tracker */}
          <div className="bg-slate-950/30 border border-slate-800 p-3.5 rounded-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
              <span className="font-mono text-[10px] text-slate-300 font-bold tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                VERTICAL FLIGHT MATCH ANALYSIS (PLANNED VS ACTUAL ALTITUDE)
              </span>
              <span className="font-mono text-[8px] text-slate-500 uppercase">Interactive telemetry comparator</span>
            </div>

            <div className="h-[200px] w-full">
              {history.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-slate-600 uppercase tracking-widest">
                  Awaiting Ascent launch sequence to record coordinate telemetry...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                    <XAxis
                      dataKey="missionTime"
                      stroke="#475569"
                      fontSize={8}
                      tickLine={false}
                      className="font-mono"
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={8}
                      tickLine={false}
                      className="font-mono"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "#1e293b", fontSize: 10 }}
                      labelClassName="font-mono text-slate-400"
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }} />
                    <Area
                      name="Actual Altitude (m)"
                      type="monotone"
                      dataKey="actualAltitude"
                      stroke="#22d3ee"
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      strokeWidth={2}
                    />
                    <Area
                      name="Planned Flight Target Alt (m)"
                      type="monotone"
                      dataKey="plannedAltitude"
                      stroke="#c084fc"
                      fillOpacity={1}
                      fill="url(#colorPlanned)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RECHARTS PLOT B: Path Alignment Offset error tracker */}
          <div className="bg-slate-950/30 border border-slate-800 p-3.5 rounded-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
              <span className="font-mono text-[10px] text-slate-300 font-bold tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500"></span>
                LATERAL GPS PATH TRACKING DEVIATION DISTANCE (METERS)
              </span>
              <span className="font-mono text-[8px] text-slate-500 uppercase">Target Coordinate Drift Ratio</span>
            </div>

            <div className="h-[140px] w-full">
              {history.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-slate-600 uppercase tracking-widest">
                  Waiting for active trajectory to calculate Haversine Drift...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                    <XAxis dataKey="missionTime" stroke="#475569" fontSize={8} tickLine={false} className="font-mono" />
                    <YAxis stroke="#475569" fontSize={8} tickLine={false} className="font-mono" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderColor: "#1e293b", fontSize: 10 }}
                      labelClassName="font-mono text-slate-400"
                    />
                    <Bar
                      name="GPS Path Error (m)"
                      dataKey="pathDeviation"
                      fill="#ec4899"
                      radius={[2, 2, 0, 0]}
                      fillOpacity={0.7}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Waypoint trajectory builder and customizer */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-lg flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
                <span className="font-mono text-[10px] text-slate-300 font-bold tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                  WAYPOINT TRAJECTORY BUILDER
                </span>
                <span className="font-mono text-[8px] text-slate-500 uppercase">Target Coordinates</span>
              </div>

              {/* Waypoint creation forms */}
              <div className="space-y-2 mb-3 bg-slate-950/80 p-2.5 rounded border border-slate-850">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 font-bold uppercase">Marker Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. WP Altitude A"
                      value={newWpName}
                      onChange={(e) => setNewWpName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 font-bold uppercase">Target Alt (m):</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={newWpAlt}
                      onChange={(e) => setNewWpAlt(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 font-bold uppercase">Latitude (°):</label>
                    <input
                      type="text"
                      value={newWpLat}
                      onChange={(e) => setNewWpLat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[9.5px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500 animate-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-slate-500 font-bold uppercase">Longitude (°):</label>
                    <input
                      type="text"
                      value={newWpLng}
                      onChange={(e) => setNewWpLng(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[9.5px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  id="add-waypoint-btn"
                  onClick={handleAddWaypoint}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-[9.5px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>INSERT PLAN WAYPOINT</span>
                </button>
              </div>

              {/* Waypoints Active list */}
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                {waypoints.map((wp, i) => (
                  <div
                    key={wp.id}
                    className="bg-slate-950/60 hover:bg-slate-950 border border-slate-850 p-2 rounded flex items-center justify-between gap-1 text-[10px] font-mono"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-800 text-[8px] text-cyan-400 font-bold flex items-center justify-center leading-none">
                        {i + 1}
                      </div>
                      <div className="truncate flex-1">
                        <span className="font-bold text-slate-300 block leading-tight">{wp.name}</span>
                        <span className="text-[8px] text-slate-500">
                          Alt: <b className="text-purple-400">{wp.alt}m</b> | Lat: <b className="text-slate-400">{wp.lat.toFixed(5)}</b>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteWaypoint(wp.id)}
                      className="p-1 hover:text-red-400 text-slate-600 rounded transition-colors cursor-pointer"
                      title="Delete Waypoint"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {waypoints.length === 0 && (
                  <div className="text-center py-6 font-mono text-[9px] text-slate-600 uppercase">
                    No Trajectory Markers Defined
                  </div>
                )}
              </div>
            </div>

            {/* Path planner metadata instructions info */}
            <div className="mt-3 bg-cyan-950/15 border border-cyan-800/10 p-2.5 rounded text-[8.5px] font-mono text-cyan-400/90 leading-normal flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <div>
                <span><b>OPERATOR NOTE:</b> Telemetry evaluates Haversine Drift values live as coordinate data links align horizontally. Alter presets to shift drone path benchmarks instantly.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
