/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { Terminal, Download, ShieldAlert, Wifi } from "lucide-react";
import { TelemetryData } from "../types";

interface ConsoleProps {
  history: TelemetryData[];
}

export default function TelemetryConsole({ history }: ConsoleProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [freezeConsole, setFreezeConsole] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  // Update console logs as history changes
  useEffect(() => {
    if (freezeConsole) return;

    // Map history elements into packet strings
    const packetStrings = history.map((h) => h.rawPacket);
    setLogs(packetStrings);

    // Auto-scroll to bottom of ground terminal log
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, freezeConsole]);

  const handleExportTextLogs = () => {
    if (history.length === 0) return;
    const content = history.map((h) => `[${h.timestamp.toISOString()}] RX -> ${h.rawPacket}`).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "GCS_Console_Raw_Output.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) =>
    log.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Console Header */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-300 tracking-wider">
            RAW COM PORT DECODING CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">PACKETS:</span>
          <span className="text-emerald-400 font-bold">{history.length}</span>
        </div>
      </div>

      {/* Control overlay toolbar */}
      <div className="bg-slate-950/40 p-2 border-b border-slate-800/60 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1 min-w-[150px]">
          <span className="text-[9px] text-slate-500">FILTER:</span>
          <input
            type="text"
            placeholder="Search payload fields..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 font-mono text-[10px] text-emerald-400 focus:outline-none px-2 py-0.5 rounded"
          />
        </div>

        <div className="flex gap-1.5 self-end">
          <button
            onClick={() => setFreezeConsole(!freezeConsole)}
            className={`text-[9px] px-2 py-0.5 border rounded cursor-pointer transition-colors ${
              freezeConsole
                ? "bg-amber-950 border-amber-500/40 text-amber-400"
                : "border-slate-800 text-slate-400 hover:text-slate-100"
            }`}
          >
            {freezeConsole ? "❄️ RESUME LOCK" : "⏸ FREEZE STREAM"}
          </button>
          <button
            onClick={handleExportTextLogs}
            disabled={history.length === 0}
            className={`text-[9px] px-2 py-0.5 border rounded flex items-center gap-1 cursor-pointer transition-colors ${
              history.length === 0
                ? "border-slate-850 text-slate-600 cursor-not-allowed"
                : "border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-750"
            }`}
          >
            <Download className="h-2.5 w-2.5" /> LOG .TXT
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div
        ref={terminalRef}
        className="flex-1 bg-black/90 p-3 min-h-[140px] max-h-[400px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-[10px] flex items-center justify-center h-full flex-col gap-1.5">
            <Wifi className="h-4 w-4 animate-pulse stroke-[1.5]" />
            <p>GROUND ANTENNA LISTENING ON SERIAL RX BUS...</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const hasError = log.includes("1") && log.split(",").length > 15 && log.split(",")[15].match(/[1-9]/);
            return (
              <div
                key={index}
                className={`text-[10px] leading-relaxed transition-colors border-l pl-2 ${
                  hasError
                    ? "text-rose-400 border-rose-500 bg-rose-950/10"
                    : log.includes("LANDED")
                    ? "text-emerald-400 border-emerald-500 bg-emerald-950/10"
                    : log.includes("ASCENT")
                    ? "text-cyan-400 border-cyan-500/60"
                    : "text-slate-300 border-emerald-500/20 hover:bg-slate-900/40"
                }`}
              >
                <span className="text-slate-600 mr-2">[{index + 1}]</span>
                <span className="text-slate-500 font-medium">RX &lt;- </span>
                <span className="font-semibold">{log}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Packets Format Guide */}
      <div className="bg-slate-950/60 border-t border-slate-800 p-2 font-mono text-[9px] text-slate-500">
        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
          <ShieldAlert className="h-3 w-3 text-emerald-500" />
          <span className="font-bold">DECODING PROTOCOL (CSV):</span>
        </div>
        <p className="overflow-x-auto whitespace-nowrap">
          TEAM_ID, PACKET_COUNT, MISSION_TIME, ALTITUDE, PRESSURE, TEMP, VOLTAGE, GPS_LAT, GPS_LNG, GPS_ALT, GPS_SATS, PITCH, ROLL, YAW, FLIGHT_STATE, ERROR_CODE
        </p>
      </div>
    </div>
  );
}
