/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Square, Download, RotateCcw, Clock, Radio, Cpu, Power, RefreshCw } from "lucide-react";

interface TopControlBarProps {
  isStreaming: boolean;
  isSimulating: boolean;
  isSerialConnected: boolean;
  lastPacketTime: string;
  packetCount: number;
  baudRate: number;
  onStartStream: () => void;
  onStopStream: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onExportCSV: () => void;
  onExportGraphPrint: () => void;
  onResetPackets: () => void;
  onSyncTime: () => void;
  onBaudRateChange: (baud: number) => void;
}

export default function TopControlBar({
  isStreaming,
  isSimulating,
  isSerialConnected,
  lastPacketTime,
  packetCount,
  baudRate,
  onStartStream,
  onStopStream,
  onStartSimulation,
  onStopSimulation,
  onConnectSerial,
  onDisconnectSerial,
  onExportCSV,
  onExportGraphPrint,
  onResetPackets,
  onSyncTime,
  onBaudRateChange,
}: TopControlBarProps) {
  
  // Checks if browser supports Web Serial API
  const isSerialSupported = typeof navigator !== "undefined" && "serial" in navigator;

  return (
    <div id="top-control-bar" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
      {/* Target logo / Satellite telemetry status indicators */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="p-2 bg-slate-950 border border-slate-800 rounded-md flex items-center justify-center">
          <Radio className={`h-5 w-5 ${isStreaming || isSimulating ? "text-cyan-400 animate-pulse" : "text-slate-600"}`} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-mono">
            <h1 className="text-sm font-black text-slate-100 tracking-wider">CANSAT GCS</h1>
            <span className="text-[9px] bg-slate-950 border border-slate-8 w-[50px] text-center text-slate-500 rounded py-0.2 px-1">
              v1.0.4
            </span>
          </div>
          <p className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">
            Real-time Aerospace Ground Telemetry
          </p>
        </div>
      </div>

      {/* CORE OPERATIONAL STREAM TOGGLES */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-center">
        {/* Run Telemetry (Hardware Link or Virtual Sim) */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded border border-slate-800">
          {/* SIMULATION CONTROLLER BUTTONS */}
          {!isSimulating ? (
            <button
              onClick={onStartSimulation}
              disabled={isStreaming}
              className={`font-mono text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                isStreaming
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-amber-400 hover:text-amber-300 hover:bg-slate-900"
              }`}
              title="Boot telemetry physics generator"
            >
              <Cpu className="h-3 w-3" /> BOOT SIMULATOR
            </button>
          ) : (
            <button
              onClick={onStopSimulation}
              className="font-mono text-[10px] bg-amber-950/40 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer hover:bg-amber-950 transition-all"
            >
              <Square className="h-3 w-3 fill-amber-400" /> HALT SIMULATOR
            </button>
          )}

          <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>

          {/* HARDWARE WEB SERIAL CONNECTORS */}
          {!isSerialConnected ? (
            <button
              onClick={onConnectSerial}
              disabled={isSimulating}
              className={`font-mono text-[10px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                isSimulating
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-cyan-400 hover:text-cyan-300 hover:bg-slate-900"
              }`}
              title={isSerialSupported ? "Connect USB microcontroller over COM Port" : "Web Serial not supported in target browser"}
            >
              <Power className="h-3 w-3" /> CONNECT HARDWARE (COM)
            </button>
          ) : (
            <button
              onClick={onDisconnectSerial}
              className="font-mono text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer hover:bg-cyan-950 transition-all"
            >
              <Square className="h-3 w-3 fill-cyan-400" /> DISCONNECT COM
            </button>
          )}
        </div>

        {/* Baud Selection */}
        <div className="bg-slate-950 border border-slate-805 rounded px-2.5 py-1.5 flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-slate-500">BAUD:</span>
          <select
            value={baudRate}
            onChange={(e) => onBaudRateChange(Number(e.target.value))}
            disabled={isSerialConnected}
            className="bg-transparent text-slate-300 border-none focus:outline-none cursor-pointer text-[10px]"
          >
            <option value="9600" className="bg-slate-900 text-slate-300">9600 bps</option>
            <option value="19200" className="bg-slate-900 text-slate-300">19200 bps</option>
            <option value="57600" className="bg-slate-900 text-slate-300">57600 bps</option>
            <option value="115200" className="bg-slate-900 text-slate-300">115200 bps</option>
          </select>
        </div>
      </div>

      {/* COMPACT UTILITY PANEL (Export CSV, Sync PC, Clear state) */}
      <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
        {/* Sync Time button */}
        <button
          onClick={onSyncTime}
          className="font-mono text-[9px] hover:text-white border border-slate-800 hover:border-slate-500 px-2.5 py-1.5 rounded bg-slate-950/40 flex items-center gap-1 cursor-pointer transition-colors"
          title="Align telemetry clock with ground RTC"
        >
          <Clock className="h-3 w-3 text-indigo-400" /> SYNC PC TIME
        </button>

        {/* Clear packets database */}
        <button
          onClick={onResetPackets}
          className="font-mono text-[9px] text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 hover:bg-rose-950/20 px-2.5 py-1.5 rounded bg-slate-950/40 flex items-center gap-1 cursor-pointer transition-colors"
          title="Reset index packet logs"
        >
          <RotateCcw className="h-3 w-3" /> RESET PCKTS
        </button>

        {/* Export Full CSV Logs */}
        <button
          onClick={onExportCSV}
          disabled={packetCount === 0}
          className={`font-mono text-[9px] px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer border transition-colors ${
            packetCount === 0
              ? "border-slate-850 text-slate-600 cursor-not-allowed bg-slate-950/10"
              : "border-emerald-500/20 text-emerald-400 hover:text-white hover:bg-emerald-950/20 hover:border-emerald-500"
          }`}
          title="Export CSV history dump"
        >
          <Download className="h-3 w-3" /> EXPORT FULL CSV
        </button>

        {/* Print Layout */}
        <button
          onClick={onExportGraphPrint}
          className="font-mono text-[9px] hover:text-white border border-slate-800 hover:border-slate-500 px-2.5 py-1.5 rounded bg-slate-950/40 flex items-center gap-1 cursor-pointer transition-colors"
          title="Capture active visual telemetry graph"
        >
          <RefreshCw className="h-3 w-3 text-cyan-400" /> CAPTURE LAYOUT
        </button>
      </div>
    </div>
  );
}
