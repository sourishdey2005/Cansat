/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, ShieldAlert, Cpu, Activity, Compass, AlertCircle, RefreshCw } from "lucide-react";
import { TelemetryData } from "../types";

interface TelemetryDisplayProps {
  current: TelemetryData | null;
}

export default function TelemetryDisplay({ current }: TelemetryDisplayProps) {
  // Safe bounds trackers for UI visual feedback
  const isTempSafe = current ? current.temp >= -5 && current.temp <= 35 : true;
  const isVoltSafe = current ? current.voltage >= 7.0 && current.voltage <= 8.4 : true;
  const isPressSafe = current ? current.pressure >= 90000 && current.pressure <= 101500 : true;

  // Generate 4-digit error code representation
  const digit1 = current ? (current.descentRateFault ? "1" : "0") : "0";
  const digit2 = current ? (current.gpsUnavailable ? "1" : "0") : "0";
  const digit3 = current ? (current.separationFailure ? "1" : "0") : "0";
  const digit4 = current ? (current.parachuteActive ? "1" : "0") : "0";
  const errorCodeStr = `${digit1}${digit2}${digit3}${digit4}`;

  const hasAnyFault = errorCodeStr !== "0000" && errorCodeStr !== "0001"; // note: parachute active (0001) is a state status but we'll highlight it as amber instead of critical fault green

  return (
    <div className="space-y-4">
      {/* 4-DIGIT DIRECT FAULT AUDIT DIAGNOSTIC SYSTEM OVERLAYS */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-rose-500" />
            <span className="font-mono text-xs font-bold text-slate-300 tracking-wider">
              GUIDANCE COMPUTER FAULT DETECTOR
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
            <span>CODE:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              errorCodeStr === "0000" 
                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" 
                : digit4 === "1" && errorCodeStr === "0001"
                  ? "bg-indigo-950/40 text-indigo-400 border border-indigo-500/20"
                  : "bg-rose-950/40 text-rose-400 border border-rose-500/20"
            }`}>
              SYSTEMS_{errorCodeStr === "0000" ? "NORMAL" : errorCodeStr === "0001" ? "PARACHUTE_ACTIVE" : "FAULT_ALERT"}
            </span>
          </div>
        </div>

        {/* 4-digit visual block segments */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Digit 1: Descent Rate */}
          <div className={`p-3.5 rounded-lg border text-center relative overflow-hidden transition-all duration-300 ${
            digit1 === "1"
              ? "bg-rose-950/20 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.08)]"
              : "bg-slate-950/60 border-slate-800"
          }`}>
            <span className="absolute top-1 right-2 font-mono text-[8px] text-slate-500">DIGIT 1</span>
            <div className={`font-mono text-3xl font-extrabold mb-1.5 ${digit1 === "1" ? "text-rose-400 animate-pulse" : "text-emerald-500"}`}>
              {digit1}
            </div>
            <p className="font-mono text-[10px] font-bold text-slate-300 tracking-wider">DESCENT SPEED</p>
            <p className="font-mono text-[8px] text-slate-500 mt-1 uppercase">
              {digit1 === "1" ? "OUT OF BOUNDS (8-10 m/s)" : "STABLE RANGE"}
            </p>
          </div>

          {/* Digit 2: GPS Availability */}
          <div className={`p-3.5 rounded-lg border text-center relative overflow-hidden transition-all duration-300 ${
            digit2 === "1"
              ? "bg-rose-950/20 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.08)]"
              : "bg-slate-950/60 border-slate-800"
          }`}>
            <span className="absolute top-1 right-2 font-mono text-[8px] text-slate-500">DIGIT 2</span>
            <div className={`font-mono text-3xl font-extrabold mb-1.5 ${digit2 === "1" ? "text-rose-400 animate-pulse" : "text-emerald-500"}`}>
              {digit2}
            </div>
            <p className="font-mono text-[10px] font-bold text-slate-300 tracking-wider">GPS TELEMETRY</p>
            <p className="font-mono text-[8px] text-slate-500 mt-1 uppercase">
              {digit2 === "1" ? "SATELLITE LOST" : "GPS LINK HEALTHY"}
            </p>
          </div>

          {/* Digit 3: Payload Separation */}
          <div className={`p-3.5 rounded-lg border text-center relative overflow-hidden transition-all duration-300 ${
            digit3 === "1"
              ? "bg-rose-950/20 border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.08)]"
              : "bg-slate-950/60 border-slate-800"
          }`}>
            <span className="absolute top-1 right-2 font-mono text-[8px] text-slate-500">DIGIT 3</span>
            <div className={`font-mono text-3xl font-extrabold mb-1.5 ${digit3 === "1" ? "text-rose-400 animate-pulse" : "text-emerald-500"}`}>
              {digit3}
            </div>
            <p className="font-mono text-[10px] font-bold text-slate-300 tracking-wider">PAYLOAD SEPN</p>
            <p className="font-mono text-[8px] text-slate-500 mt-1 uppercase">
              {digit3 === "1" ? "SEPARATION FAILURE" : "NORMAL SEPARATED"}
            </p>
          </div>

          {/* Digit 4: Parachute Deploy state */}
          <div className={`p-3.5 rounded-lg border text-center relative overflow-hidden transition-all duration-300 ${
            digit4 === "1"
              ? "bg-indigo-950/20 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.08)]"
              : "bg-slate-950/60 border-slate-800"
          }`}>
            <span className="absolute top-1 right-2 font-mono text-[8px] text-slate-500">DIGIT 4</span>
            <div className={`font-mono text-3xl font-extrabold mb-1.5 ${digit4 === "1" ? "text-indigo-400" : "text-slate-550"}`}>
              {digit4}
            </div>
            <p className="font-mono text-[10px] font-bold text-slate-300 tracking-wider">CHUTE ACTUATION</p>
            <p className="font-mono text-[8px] text-slate-500 mt-1 uppercase">
              {digit4 === "1" ? "PARACHUTE DEPLOYED" : "PARACHUTE RETRACT"}
            </p>
          </div>
        </div>
      </div>

      {/* SEPARATE CONTAINER AND PAYLOAD BENTO GRID PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CONTAINER SENSORS PANEL */}
        <div id="container-telemetry-card" className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3.5">
              <Shield className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="font-mono text-xs font-bold text-slate-200 tracking-wide uppercase">CONTAINER TELEMETRY</h3>
                <p className="font-mono text-[8px] text-slate-500">Carrier Bus Sensor Instrumentation</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Core Altitude */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">ALTITUDE</span>
                <span className="font-mono text-xl font-bold text-cyan-400 block mt-1">
                  {current ? current.altitude.toFixed(1) : "---.-"} <span className="text-[10px] text-slate-500">m</span>
                </span>
                <div className="w-full bg-slate-800 h-1 rounded overflow-hidden mt-1.5">
                  <div 
                    className="bg-cyan-400 h-1 rounded" 
                    style={{ width: `${Math.min(100, (current?.altitude || 0) / 10)}%` }}
                  ></div>
                </div>
              </div>

              {/* Barometric Pressure */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">BARO PRESSURE</span>
                <span className="font-mono text-xl font-bold text-purple-400 block mt-1">
                  {current ? current.pressure.toFixed(0) : "------"}{" "}
                  <span className="text-[10px] text-slate-500">Pa</span>
                </span>
                <span className={`absolute top-2 right-2 text-[8px] font-mono font-semibold ${isPressSafe ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}>
                  {isPressSafe ? "SAFE" : "FLUC"}
                </span>
              </div>

              {/* Core Temperature */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">THERMALS</span>
                <span className="font-mono text-xl font-bold text-emerald-400 block mt-1">
                  {current ? current.temp.toFixed(1) : "---.-"}{" "}
                  <span className="text-[10px] text-slate-500">°C</span>
                </span>
                <span className={`absolute top-2 right-2 text-[8px] font-mono font-semibold ${isTempSafe ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}>
                  {isTempSafe ? "STABLE" : "LIMIT!"}
                </span>
              </div>

              {/* Battery Voltage */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">BATTERY POWER</span>
                <span className="font-mono text-xl font-bold text-amber-400 block mt-1">
                  {current ? current.voltage.toFixed(2) : "--.--"}{" "}
                  <span className="text-[10px] text-slate-500">V</span>
                </span>
                <span className={`absolute top-2 right-2 text-[8px] font-mono font-semibold ${isVoltSafe ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}>
                  {isVoltSafe ? "FULL" : "LOW!"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Container Diagnostics sub-bar */}
          <div className="bg-slate-950/60 p-2 border border-slate-850 rounded flex items-center justify-between font-mono text-[9px] text-slate-400 mt-2">
            <span className="text-slate-500">TEAM ID CODES:</span>
            <span className="text-cyan-400 font-bold">{current ? current.teamId : "AWAITING"}</span>
          </div>
        </div>

        {/* PAYLOAD DATA INTEGRITY PANEL */}
        <div id="payload-telemetry-card" className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3.5">
              <Compass className="h-4 w-4 text-indigo-400" />
              <div>
                <h3 className="font-mono text-xs font-bold text-slate-200 tracking-wide uppercase">PAYLOAD NAVIGATION</h3>
                <p className="font-mono text-[8px] text-slate-500">Probe Gyroscopes &amp; GPS Constellation</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Pitch, Roll, Yaw */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">GIMBAL DEVIATION</span>
                <div className="font-mono text-[10px] text-indigo-300 mt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>P:</span> <span className="font-bold text-slate-200">{current ? current.pitch.toFixed(1) : "---"}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R:</span> <span className="font-bold text-slate-200">{current ? current.roll.toFixed(1) : "---"}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y:</span> <span className="font-bold text-slate-200">{current ? current.yaw.toFixed(1) : "---"}°</span>
                  </div>
                </div>
              </div>

              {/* Descent velocity */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">DESCENT VELOCITY</span>
                <span className="font-mono text-xl font-bold text-rose-400 block mt-1">
                  {current ? current.descentRate.toFixed(1) : "---.-"}{" "}
                  <span className="text-[10px] text-slate-500">m/s</span>
                </span>
                <span className={`absolute top-2 right-2 text-[8px] font-mono font-semibold ${
                  current?.descentRateFault ? "text-rose-500 animate-pulse" : "text-emerald-500"
                }`}>
                  {current?.descentRateFault ? "O-SPEED!" : "SAFE"}
                </span>
              </div>

              {/* GPS Coordinates readout */}
              <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-lg relative col-span-2">
                <span className="font-mono text-[8px] text-slate-500 block uppercase">GPS GRID LOCALIZATION</span>
                <div className="grid grid-cols-2 mt-1.5 font-mono text-[10px] text-slate-400 gap-2">
                  <div>
                    <span className="text-slate-500">LAT:</span>{" "}
                    <span className="text-slate-200 font-bold">{current ? current.gpsLat.toFixed(6) : "-------"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">LNG:</span>{" "}
                    <span className="text-slate-200 font-bold">{current ? current.gpsLng.toFixed(6) : "-------"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ALTI:</span>{" "}
                    <span className="text-slate-200 font-bold">{current ? `${current.gpsAlt.toFixed(1)}m` : "-------"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">SATS:</span>{" "}
                    <span className="text-emerald-400 font-bold">{current ? current.gpsSats : "--"} LNK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payload Separation Indicator sub-bar */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-slate-950/60 px-2 py-1 border border-slate-850 rounded flex items-center justify-between font-mono text-[9px]">
              <span className="text-slate-500">SEPN STATE:</span>
              <span className={`font-bold ${
                current?.state === "SEPARATED" || current?.state === "DESCENT" || current?.state === "PARACHUTE_DEPLOYED" || current?.state === "LANDED"
                  ? "text-emerald-400"
                  : "text-amber-500 animate-pulse"
              }`}>
                {current?.state === "PRE_LAUNCH" || current?.state === "ASCENT" ? "MOUNTED" : "SEPARATED"}
              </span>
            </div>
            
            <div className="bg-slate-950/60 px-2 py-1 border border-slate-850 rounded flex items-center justify-between font-mono text-[9px]">
              <span className="text-slate-500">MISSION FLG:</span>
              <span className="text-indigo-400 font-bold">{current ? current.state : "STANDBY"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
