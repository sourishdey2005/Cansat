/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from "react";
import { TelemetryData } from "../types";

interface GraphsProps {
  history: TelemetryData[];
  maxEntries?: number;
}

type MetricKey = "altitude" | "pressure" | "temp" | "descentRate" | "voltage";

interface MetricInfo {
  key: MetricKey;
  label: string;
  unit: string;
  color: string; // Tailwind color class & hex
  hex: string;
  gradientHex: string;
  guideMin: number;
  guideMax: number;
}

const METRICS: MetricInfo[] = [
  {
    key: "altitude",
    label: "ALTITUDE",
    unit: "m",
    color: "cyan",
    hex: "#22d3ee",
    gradientHex: "rgba(6, 182, 212, 0.15)",
    guideMin: 0,
    guideMax: 1000,
  },
  {
    key: "pressure",
    label: "BAROMETRIC PRESSURE",
    unit: "Pa",
    color: "purple",
    hex: "#c084fc",
    gradientHex: "rgba(168, 85, 247, 0.15)",
    guideMin: 80000,
    guideMax: 101325,
  },
  {
    key: "temp",
    label: "TEMPERATURE",
    unit: "°C",
    color: "emerald",
    hex: "#34d399",
    gradientHex: "rgba(16, 185, 129, 0.15)",
    guideMin: -10,
    guideMax: 40,
  },
  {
    key: "descentRate",
    label: "DESCENT RATE",
    unit: "m/s",
    color: "rose",
    hex: "#fb7185",
    gradientHex: "rgba(244, 63, 94, 0.15)",
    guideMin: -5,
    guideMax: 25,
  },
  {
    key: "voltage",
    label: "BATTERY VOLTAGE",
    unit: "V",
    color: "amber",
    hex: "#fbbf24",
    gradientHex: "rgba(245, 158, 11, 0.15)",
    guideMin: 6.0,
    guideMax: 9.0,
  },
];

export default function RealTimeGraphs({ history, maxEntries = 50 }: GraphsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("altitude");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const activeMetric = METRICS.find((m) => m.key === selectedMetric)!;

  // Extract recent history for plotting (padded or sliced to match limits)
  const dataPoints = history.slice(-maxEntries);
  const dataCount = dataPoints.length;

  // Calculate dynamic bounds for custom SVG rendering
  let minVal = activeMetric.guideMin;
  let maxVal = activeMetric.guideMax;

  if (dataCount > 0) {
    const values = dataPoints.map((d) => d[activeMetric.key] as number);
    const actualMin = Math.min(...values);
    const actualMax = Math.max(...values);
    
    // Add small padding to bounds for elegant presentation
    const range = actualMax - actualMin;
    const padding = range === 0 ? 1 : range * 0.15;
    
    minVal = Math.min(activeMetric.guideMin, actualMin - padding);
    maxVal = Math.max(activeMetric.guideMax, actualMax + padding);
  }

  // Grid coordinates mapping (Width: 500, Height: 200 for SVG viewport)
  const svgW = 600;
  const svgH = 240;
  const paddingX = 50;
  const paddingY = 30;
  const chartW = svgW - paddingX * 2;
  const chartH = svgH - paddingY * 2;

  // Maps values to physical SVG coordinate system
  const getX = (index: number) => {
    if (dataCount <= 1) return paddingX;
    return paddingX + (index / (maxEntries - 1)) * chartW;
  };

  const getY = (val: number) => {
    const denominator = maxVal - minVal;
    if (denominator === 0) return paddingY + chartH / 2;
    // Lower coordinate value on screen is higher altitude (SVG coordinates are top-down)
    return paddingY + chartH - ((val - minVal) / denominator) * chartH;
  };

  // Build SVG path strings
  let linePath = "";
  let areaPath = "";

  if (dataCount > 0) {
    // Generate precise path commands
    const points = dataPoints.map((dp, i) => {
      const val = dp[activeMetric.key] as number;
      return { x: getX(i), y: getY(val) };
    });

    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    areaPath = `${linePath} L ${points[points.length - 1].x} ${getY(minVal)} L ${points[0].x} ${getY(minVal)} Z`;
  }

  // Calculate stats for current visual subset
  const currentVal = dataCount > 0 ? (dataPoints[dataCount - 1][activeMetric.key] as number) : 0;
  const maxSessionVal = dataCount > 0 ? Math.max(...dataPoints.map((d) => d[activeMetric.key] as number)) : 0;
  const minSessionVal = dataCount > 0 ? Math.min(...dataPoints.map((d) => d[activeMetric.key] as number)) : 0;

  // Handle CSV export of state subset
  const handleExportGraphCSV = () => {
    if (history.length === 0) return;
    const headers = "timestamp,packetCount,altitude,pressure,temp,descentRate,voltage,state,errors\n";
    const rows = history.map((dp) => {
      const errFlag = `${dp.descentRateFault ? '1' : '0'}${dp.gpsUnavailable ? '1' : '0'}${dp.separationFailure ? '1' : '0'}${dp.parachuteActive ? '1' : '0'}`;
      return `"${dp.timestamp.toISOString()}",${dp.packetCount},${dp.altitude},${dp.pressure},${dp.temp},${dp.descentRate},${dp.voltage},"${dp.state}","${errFlag}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GCS_Telemetry_${activeMetric.key}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Side Selectors: Sparkline Quick Views */}
      <div className="w-full lg:w-48 bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800 p-2.5 space-y-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-0 select-none">
        <div className="hidden lg:block text-[9px] font-mono font-bold text-slate-500 tracking-wider mb-2">
          TELEMETRY CHANNELS
        </div>
        
        {METRICS.map((metric) => {
          const latVal = history.length > 0 ? (history[history.length - 1][metric.key] as number) : 0;
          const isSelected = selectedMetric === metric.key;

          // Tiny sparkline draw for dynamic thumbnail
          let sparklinePoints = "";
          if (history.length > 1) {
            const sparkRecent = history.slice(-15);
            const mValues = sparkRecent.map((p) => p[metric.key] as number);
            const sMin = Math.min(...mValues);
            const sMax = Math.max(...mValues);
            const sRange = sMax - sMin === 0 ? 1 : sMax - sMin;

            sparklinePoints = sparkRecent
              .map((dp, idx) => {
                const sx = (idx / (sparkRecent.length - 1)) * 50;
                const sy = 18 - ((dp[metric.key] as number - sMin) / sRange) * 14;
                return `${sx},${sy}`;
              })
              .join(" ");
          }

          return (
            <div
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`flex-1 min-w-[120px] lg:w-full flex items-center justify-between p-2 rounded border cursor-pointer select-none transition-all ${
                isSelected
                  ? "bg-slate-900/90 border-slate-700/80 shadow"
                  : "bg-slate-950/30 border-slate-900 hover:bg-slate-900/40 hover:border-slate-800/80"
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-[9px] font-mono text-slate-400 font-semibold tracking-wider">
                  {metric.label.split(" ")[0]} {/* First word */}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {latVal.toFixed(metric.key === "voltage" ? 2 : 1)}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500">{metric.unit}</span>
                </div>
              </div>

              {/* Sparkline Visual Asset */}
              <div className="w-12 h-6 flex items-center justify-end">
                {history.length > 1 ? (
                  <svg className="overflow-visible" width="50" height="20">
                    <polyline
                      fill="none"
                      stroke={metric.hex}
                      strokeWidth="1.5"
                      points={sparklinePoints}
                    />
                  </svg>
                ) : (
                  <span className="text-[8px] font-mono text-slate-600">STILL</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Graph Scope Visual */}
      <div className="flex-1 flex flex-col bg-slate-900 relative p-3">
        {/* Main Graph Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: activeMetric.hex }}
            ></span>
            <span className="font-mono text-xs font-bold text-slate-200 tracking-wider">
              {activeMetric.label} MONITOR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGraphCSV}
              disabled={history.length === 0}
              className={`font-mono text-[9px] px-2 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                history.length === 0
                  ? "border-slate-800 text-slate-600 cursor-not-allowed"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              📊 EXPORT DATA
            </button>
          </div>
        </div>

        {/* Master Chart Space */}
        <div
          ref={chartContainerRef}
          className="flex-1 min-h-[180px] w-full flex items-center justify-center relative bg-slate-950/40 rounded border border-slate-950 p-2 overflow-hidden"
          onMouseMove={(e) => {
            if (dataCount === 0 || !chartContainerRef.current) return;
            const rect = chartContainerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left - paddingX;
            // Map clickX relative to index
            if (clickX >= 0 && clickX <= chartW) {
              const fraction = clickX / chartW;
              const computedIdx = Math.round(fraction * (maxEntries - 1));
              if (computedIdx >= 0 && computedIdx < dataCount) {
                setHoverIndex(computedIdx);
              }
            } else {
              setHoverIndex(null);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {dataCount === 0 ? (
            <div className="text-center font-mono space-y-2">
              <div className="w-8 h-8 border border-slate-800 rounded flex items-center justify-center mx-auto animate-pulse">
                <span className="text-[10px] text-slate-500">?</span>
              </div>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                Awaiting Telemetry Beacon Link...
              </p>
            </div>
          ) : (
            <svg
              className="w-full h-full max-h-[220px]"
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeMetric.hex} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={activeMetric.hex} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const val = maxVal - ratio * (maxVal - minVal);
                const cy = getY(val);
                return (
                  <g key={idx} className="opacity-40">
                    <line
                      x1={paddingX}
                      y1={cy}
                      x2={svgW - paddingX}
                      y2={cy}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3, 3"
                    />
                    <text
                      x={paddingX - 10}
                      y={cy}
                      fill="#64748b"
                      fontFamily="monospace"
                      fontSize="8"
                      textAnchor="end"
                      alignmentBaseline="middle"
                    >
                      {val.toFixed(selectedMetric === "voltage" ? 2 : 0)}
                    </text>
                  </g>
                );
              })}

              {/* Safe Descent Range Threshold Guide line (Descent Rate 8-10 m/s rule) */}
              {selectedMetric === "descentRate" && (
                <>
                  {/* Min boundary */}
                  <line
                    x1={paddingX}
                    y1={getY(8)}
                    x2={svgW - paddingX}
                    y2={getY(8)}
                    stroke="rgba(34, 197, 94, 0.3)"
                    strokeWidth="1.5"
                  />
                  {/* Max boundary */}
                  <line
                    x1={paddingX}
                    y1={getY(10)}
                    x2={svgW - paddingX}
                    y2={getY(10)}
                    stroke="rgba(34, 197, 94, 0.3)"
                    strokeWidth="1.5"
                  />
                  {/* Area */}
                  <rect
                    x={paddingX}
                    y={getY(10)}
                    width={chartW}
                    height={Math.abs(getY(8) - getY(10))}
                    fill="rgba(34, 197, 94, 0.05)"
                  />
                  <text
                    x={svgW - paddingX - 10}
                    y={getY(9)}
                    fill="#4ade80"
                    fontFamily="monospace"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    SAFE FLIGHT ZONE (8-10 m/s)
                  </text>
                </>
              )}

              {/* Main Glowing Area path drawing */}
              <path d={areaPath} fill={`url(#gradient-${selectedMetric})`} />

              {/* Main telemetry line plot */}
              <path
                d={linePath}
                fill="none"
                stroke={activeMetric.hex}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0px 2px 4px rgba(6, 182, 212, 0.2))" }}
              />

              {/* Draw a subtle circular end cap node reflecting current value */}
              {dataCount > 0 && (
                <circle
                  cx={getX(dataCount - 1)}
                  cy={getY(currentVal)}
                  r={4}
                  fill={activeMetric.hex}
                  stroke="#020617"
                  strokeWidth="1.5"
                />
              )}

              {/* Focus Line Tracker (Interactive Hover crosshair) */}
              {hoverIndex !== null && hoverIndex < dataCount && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={paddingY}
                    x2={getX(hoverIndex)}
                    y2={svgH - paddingY}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2, 2"
                  />
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getY(dataPoints[hoverIndex][activeMetric.key] as number)}
                    r={5}
                    fill="#ffffff"
                    stroke={activeMetric.hex}
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          )}

          {/* Dynamic Floating Tooltip Indicator on hover */}
          {hoverIndex !== null && hoverIndex < dataCount && (
            <div
              className="absolute bg-slate-950/95 border border-slate-700/80 px-2.5 py-1.5 rounded text-left shadow-xl pointer-events-none z-10 font-mono text-[9px] text-slate-100"
              style={{
                left: `${(hoverIndex / (maxEntries - 1)) * 60 + 10}%`,
                top: "10px",
              }}
            >
              <div className="flex gap-1.5 font-bold">
                <span className="text-slate-400">PACKET:</span>
                <span className="text-cyan-400">{dataPoints[hoverIndex].packetCount}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-slate-400">VALUE:</span>
                <span style={{ color: activeMetric.hex }}>
                  {(dataPoints[hoverIndex][activeMetric.key] as number).toFixed(2)} {activeMetric.unit}
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-slate-500">STATE:</span>
                <span className="text-slate-300 font-semibold">{dataPoints[hoverIndex].state}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Metric statistics readout footer */}
        <div className="grid grid-cols-3 gap-2.5 mt-2 text-[10px] uppercase bg-slate-950/30 border border-slate-800/60 p-2 rounded">
          <div className="font-mono text-center">
            <span className="text-slate-500 block text-[8px] tracking-wider">CURRENT</span>
            <span className="text-slate-200 font-bold tracking-tight text-xs">
              {currentVal.toFixed(selectedMetric === "voltage" ? 2 : 1)}{activeMetric.unit}
            </span>
          </div>
          <div className="font-mono text-center border-x border-slate-800/80">
            <span className="text-slate-500 block text-[8px] tracking-wider">MAX PEAK</span>
            <span className="text-emerald-400 font-bold tracking-tight text-xs">
              {maxSessionVal.toFixed(selectedMetric === "voltage" ? 2 : 1)}{activeMetric.unit}
            </span>
          </div>
          <div className="font-mono text-center">
            <span className="text-slate-500 block text-[8px] tracking-wider">MIN VAL</span>
            <span className="text-amber-400 font-bold tracking-tight text-xs">
              {minSessionVal.toFixed(selectedMetric === "voltage" ? 2 : 1)}{activeMetric.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
