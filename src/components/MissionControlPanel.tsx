/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ShieldAlert, Unlock, Lock, Zap, ArrowUpRight, Compass } from "lucide-react";
import { ControlCommand } from "../types";

interface MissionControlProps {
  onManualSeparation: () => void;
  onDeployParachute: () => void;
  onRedundantActivation: () => void;
  isStreaming: boolean;
  isSimulating: boolean;
  state: string;
}

export default function MissionControlPanel({
  onManualSeparation,
  onDeployParachute,
  onRedundantActivation,
  isStreaming,
  isSimulating,
  state,
}: MissionControlProps) {
  // Command lock safety covers
  const [isSepUnlocked, setIsSepUnlocked] = useState(false);
  const [isChuteUnlocked, setIsChuteUnlocked] = useState(false);
  const [isBackupUnlocked, setIsBackupUnlocked] = useState(false);

  // Uplink histories logs state
  const [commandLogs, setCommandLogs] = useState<ControlCommand[]>([
    { id: "1", name: "SYS_PING_RF", status: "EXECUTED", timestamp: "GCS_BOOT_STATION", type: "STANDARD" },
  ]);

  const addLog = (cmdName: string, isCritical = false) => {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
    const newLog: ControlCommand = {
      id: Math.random().toString(),
      name: cmdName,
      status: "PENDING",
      timestamp: timeStr,
      type: isCritical ? "CRITICAL" : "STANDARD",
    };

    setCommandLogs((prev) => [...prev, newLog]);

    // Simulate transceivers transmit handshake delays
    setTimeout(() => {
      setCommandLogs((prev) =>
        prev.map((l) => (l.id === newLog.id ? { ...l, status: "EXECUTED" } : l))
      );
    }, 1200);
  };

  const handleSepTrigger = () => {
    if (!isSepUnlocked) return;
    onManualSeparation();
    addLog("CMD_PAYLOAD_SEPARATION_0x0A", true);
    setIsSepUnlocked(false); // Lock backup cover again
  };

  const handleChuteTrigger = () => {
    if (!isChuteUnlocked) return;
    onDeployParachute();
    addLog("CMD_CHUTE_DEPLOY_0x0C", true);
    setIsChuteUnlocked(false);
  };

  const handleBackupTrigger = () => {
    if (!isBackupUnlocked) return;
    onRedundantActivation();
    addLog("CMD_BACKUP_CORE_ACT_0x0F", true);
    setIsBackupUnlocked(false);
  };

  const handlePingRf = () => {
    addLog("CMD_SYS_PING_RF_HARNESS", false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative">
      {/* Panel header */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-slate-300 tracking-wider">
            CRITICAL MISSION ACTUATIONS
          </span>
        </div>
        <span className="font-mono text-[9px] text-slate-500">UPLINK TRANSMITTER</span>
      </div>

      {/* Main operational action blocks */}
      <div className="flex-1 p-3.5 space-y-3.5 bg-slate-950/20">
        
        {/* CONTROL DEPLOYMENT BLOCK 1: Manual Separation */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex flex-col sm:flex-row gap-3 items-center justify-between relative">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest block">UPLINK CODE: 0x0A</span>
            <span className="font-mono text-xs font-bold text-slate-200">PAYLOAD STAGE SEPARATION</span>
            <p className="text-[9px] font-mono text-slate-500 max-w-[240px]">
              Fires pyrotechnic separation mechanisms. Use when automatic altitude release triggers fail.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {/* Safety Interlock sliding switch */}
            <button
              onClick={() => setIsSepUnlocked(!isSepUnlocked)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isSepUnlocked
                  ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200"
              }`}
              title="Toggle Security Interlock"
            >
              {isSepUnlocked ? <Unlock className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
            </button>

            {/* Fire Button */}
            <button
              onClick={handleSepTrigger}
              disabled={!isSepUnlocked}
              className={`font-mono text-[10px] font-bold py-2 px-4 rounded border uppercase cursor-pointer select-none transition-all duration-200 flex-1 sm:flex-none ${
                isSepUnlocked
                  ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                  : "bg-slate-900/60 text-slate-600 border-slate-950 cursor-not-allowed"
              }`}
            >
              FIRE SEPARATION
            </button>
          </div>
        </div>

        {/* CONTROL DEPLOYMENT BLOCK 2: Emergency Parachute */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex flex-col sm:flex-row gap-3 items-center justify-between relative">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest block">UPLINK CODE: 0x0C</span>
            <span className="font-mono text-xs font-bold text-slate-200">EMERGENCY PARACHUTE DEPLOY</span>
            <p className="text-[9px] font-mono text-slate-500 max-w-[240px]">
              Ejects backup canopy lines immediately. Slices terminal descent rate to prevent payload structural failure.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsChuteUnlocked(!isChuteUnlocked)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isChuteUnlocked
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200"
              }`}
            >
              {isChuteUnlocked ? <Unlock className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
            </button>

            <button
              onClick={handleChuteTrigger}
              disabled={!isChuteUnlocked}
              className={`font-mono text-[10px] font-bold py-2 px-4 rounded border uppercase cursor-pointer select-none transition-all duration-200 flex-1 sm:flex-none ${
                isChuteUnlocked
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : "bg-slate-900/60 text-slate-600 border-slate-950 cursor-not-allowed"
              }`}
            >
              DEPLOY PARACHUTE
            </button>
          </div>
        </div>

        {/* CONTROL DEPLOYMENT BLOCK 3: Redundant Activation */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex flex-col sm:flex-row gap-3 items-center justify-between relative">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest block">UPLINK CODE: 0x0F</span>
            <span className="font-mono text-xs font-bold text-slate-200">REDUNDANT INSTRUMENT COLD BOOT</span>
            <p className="text-[9px] font-mono text-slate-500 max-w-[240px]">
              Forbids current hardware lines, routing active avionics via backup secondary cold circuits. 
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsBackupUnlocked(!isBackupUnlocked)}
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isBackupUnlocked
                  ? "bg-amber-950/40 border-amber-500/30 text-amber-400"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200"
              }`}
            >
              {isBackupUnlocked ? <Unlock className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
            </button>

            <button
              onClick={handleBackupTrigger}
              disabled={!isBackupUnlocked}
              className={`font-mono text-[10px] font-bold py-2 px-4 rounded border uppercase cursor-pointer select-none transition-all duration-200 flex-1 sm:flex-none ${
                isBackupUnlocked
                  ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : "bg-slate-900/60 text-slate-600 border-slate-950 cursor-not-allowed"
              }`}
            >
              ACTIVATE REDUNDANT
            </button>
          </div>
        </div>
      </div>

      {/* COMMAND UPLINK HEX STATUS LOGGER */}
      <div className="border-t border-slate-800 bg-slate-950/95 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase font-semibold">UPLINK TRANSMISSION HISTORIES</span>
          <button
            onClick={handlePingRf}
            className="font-mono text-[9px] text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded cursor-pointer bg-cyan-950/20 hover:bg-cyan-950 hover:border-cyan-400 transition-colors flex items-center gap-1"
          >
            <Zap className="h-2.5 w-2.5" /> EMIT SYS_RF_PING
          </button>
        </div>

        <div className="h-20 overflow-y-auto space-y-1 bg-black p-2 border border-slate-900 rounded font-mono text-[9px] text-slate-400 scrollbar-thin">
          {commandLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-0.5 hover:text-slate-200">
              <div className="flex items-center gap-1">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className={`${log.type === "CRITICAL" ? "text-rose-400 font-bold" : "text-emerald-400"}`}>
                  TX -&gt; {log.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${log.status === "EXECUTED" ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`}></span>
                <span className="font-bold text-[8px]">
                  {log.status === "EXECUTED" ? "DEPARTED_OK" : "EMITTING_RF..."}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
