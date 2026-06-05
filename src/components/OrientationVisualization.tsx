/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { getRotationMatrix } from "../utils/constants";

interface OrientationProps {
  pitch: number;    // degrees (-90 to +90)
  roll: number;     // degrees (-180 to +180)
  yaw: number;      // degrees (0 to 360)
  onManualOverride?: (pitch: number, roll: number, yaw: number) => void;
  isStreaming: boolean;
}

export default function OrientationVisualization({
  pitch,
  roll,
  yaw,
  onManualOverride,
  isStreaming,
}: OrientationProps) {
  const horizonCanvasRef = useRef<HTMLCanvasElement>(null);
  const cubeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<"horizon" | "model" | "both">("both");
  const [localPitch, setLocalPitch] = useState(pitch);
  const [localRoll, setLocalRoll] = useState(roll);
  const [localYaw, setLocalYaw] = useState(yaw);

  // Sync state with parent telemetry unless user overrides manually
  useEffect(() => {
    if (isStreaming) {
      setLocalPitch(pitch);
      setLocalRoll(roll);
      setLocalYaw(yaw);
    }
  }, [pitch, roll, yaw, isStreaming]);

  // Render Artificial Horizon
  useEffect(() => {
    const canvas = horizonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Save context for clipping mask
    ctx.save();
    
    // Draw circular frame
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.clip(); // Mask sky/ground inside circle
    
    // Rotate canvas for Roll and shift for Pitch
    ctx.translate(cx, cy);
    ctx.rotate((-localRoll * Math.PI) / 180);
    
    // 1 degree Pitch is roughly equal to 2 pixels shift
    const pitchShift = localPitch * 2.5;
    ctx.translate(0, pitchShift);

    // Sky Background (Top) - Cyber Cyan
    ctx.fillStyle = "#1e293b"; // Core space base
    ctx.fillRect(-width * 2, -height * 2, width * 4, height * 2 + 0.5);
    
    // Sky gradient aura
    const skyGrad = ctx.createLinearGradient(0, -radius, 0, 0);
    skyGrad.addColorStop(0, "#083344"); // Cyan border
    skyGrad.addColorStop(1, "#1e1b4b"); // Indigo sky base
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-width * 2, -height * 2, width * 4, height * 2);

    // Ground Background (Bottom) - Earth Slate
    ctx.fillStyle = "#27272a"; // Zinc ground base
    ctx.fillRect(-width * 2, 0, width * 4, height * 2);
    
    const groundGrad = ctx.createLinearGradient(0, 0, 0, radius);
    groundGrad.addColorStop(0, "#1c1917"); // Dark stone
    groundGrad.addColorStop(1, "#451a03"); // Amber brown ground core
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-width * 2, 0, width * 4, height * 2);

    // Horizon line
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-width * 2, 0);
    ctx.lineTo(width * 2, 0);
    ctx.stroke();

    // Pitch ladder scale
    ctx.strokeStyle = "rgba(165, 180, 252, 0.4)"; // indigo-300 transparent
    ctx.fillStyle = "rgba(165, 180, 252, 0.8)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;

    for (let p = -80; p <= 80; p += 10) {
      if (p === 0) continue;
      const py = -p * 2.5; // Offset placement
      const lineLen = p % 20 === 0 ? 36 : 20;

      ctx.beginPath();
      // Draw ladder ticks
      ctx.moveTo(-lineLen / 2, py);
      ctx.lineTo(lineLen / 2, py);
      ctx.stroke();

      // Side brackets
      ctx.beginPath();
      ctx.moveTo(-lineLen / 2, py);
      ctx.lineTo(-lineLen / 2, py + (p > 0 ? 5 : -5));
      ctx.moveTo(lineLen / 2, py);
      ctx.lineTo(lineLen / 2, py + (p > 0 ? 5 : -5));
      ctx.stroke();

      // Degrees numeric texts
      ctx.fillText(`${Math.abs(p)}`, -lineLen / 2 - 8, py);
      ctx.fillText(`${Math.abs(p)}`, lineLen / 2 + 8, py);
    }

    // Restore rotation transformation
    ctx.restore();

    // Draw Static Avionics Reference HUD Frame (Doesn't rotate with satellite)
    ctx.save();
    
    // Outer Dial Ring
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Roll indicator ticks along outer ring (every 10 deg up to 60)
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.translate(cx, cy);
    for (let r = -60; r <= 60; r += 10) {
      const angle = ((r - 90) * Math.PI) / 180;
      const tickOuter = radius;
      const tickLen = r % 30 === 0 ? 8 : 4;
      const tickInner = radius - tickLen;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * tickInner, Math.sin(angle) * tickInner);
      ctx.lineTo(Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter);
      ctx.stroke();
    }
    
    // Static pointer at 0-degree roll
    ctx.fillStyle = "#e11d48"; // vibrant warning red pointer arrow
    ctx.beginPath();
    ctx.moveTo(0, -radius + 3);
    ctx.lineTo(-6, -radius + 12);
    ctx.lineTo(6, -radius + 12);
    ctx.closePath();
    ctx.fill();

    // Local static aircraft indicator symbol (Yellow) in the alignment center
    ctx.strokeStyle = "#eab308"; // solid aviation amber yellow
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(-45, 0);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-15, 10);
    ctx.stroke();

    // Left wing
    ctx.beginPath();
    ctx.moveTo(45, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(15, 10);
    ctx.stroke();

    // Center focal point dot
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  }, [localPitch, localRoll]);

  // Render 3D Canvas CubeSat wireframe/shaded projection
  useEffect(() => {
    const canvas = cubeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Center references
    const cx = width / 2;
    const cy = height / 2;
    const scale =  65; // Drawing scale factor

    // Define 3D coordinates for a standard aerospace CubeSat satellite chassis
    // Outer bounds: standard octagonal structure or cube configuration
    // Vertices [x,y,z] of a rectangular solid representing the satellite
    const vertices = [
      [-0.6, -1.0, -0.6], // 0: Top front left
      [ 0.6, -1.0, -0.6], // 1: Top front right
      [ 0.6,  1.0, -0.6], // 2: Bottom front right
      [-0.6,  1.0, -0.6], // 3: Bottom front left
      [-0.6, -1.0,  0.6], // 4: Top back left
      [ 0.6, -1.0,  0.6], // 5: Top back right
      [ 0.6,  1.0,  0.6], // 6: Bottom back right
      [-0.6,  1.0,  0.6], // 7: Bottom back left
      
      // Solar Panel wings (Left Wing tip)
      [-2.4, -0.4, 0.0],  // 8: Solar wing left far top
      [-2.4,  0.4, 0.0],  // 9: Solar wing left far bottom
      [-0.6, -0.4, 0.0],  // 10: Solar wing left root top
      [-0.6,  0.4, 0.0],  // 11: Solar wing left root bottom

      // Solar Panel wings (Right Wing tip)
      [ 2.4, -0.4, 0.0],  // 12: Solar wing right far top
      [ 2.4,  0.4, 0.0],  // 13: Solar wing right far bottom
      [ 0.6, -0.4, 0.0],  // 14: Solar wing right root top
      [ 0.6,  0.4, 0.0],  // 15: Solar wing right root bottom
    ];

    // Face structures mapping vertices to form colored solid planes
    const faces = [
      { indices: [0, 1, 2, 3], color: "rgba(6, 182, 212, 0.15)", border: "#06b6d4" }, // Front
      { indices: [1, 5, 6, 2], color: "rgba(99, 102, 241, 0.15)", border: "#6366f1" }, // Right
      { indices: [5, 4, 7, 6], color: "rgba(6, 182, 212, 0.10)", border: "#06b6d4" }, // Back
      { indices: [4, 0, 3, 7], color: "rgba(99, 102, 241, 0.15)", border: "#6366f1" }, // Left
      { indices: [4, 5, 1, 0], color: "rgba(16, 185, 129, 0.15)", border: "#10b981" }, // Top (Antenna interface)
      { indices: [3, 2, 6, 7], color: "rgba(16, 185, 129, 0.15)", border: "#10b981" }, // Bottom
      
      // Solar wings polygons (L / R)
      { indices: [8, 10, 11, 9], color: "rgba(14, 165, 233, 0.45)", border: "#38bdf8" }, // Left Solar
      { indices: [14, 12, 13, 15], color: "rgba(14, 165, 233, 0.45)", border: "#38bdf8" }, // Right Solar
    ];

    // Compute rotation matrices representation of Yaw Pitch Roll using aerospace standards
    const rm = getRotationMatrix(localPitch, localRoll, localYaw);

    // Dynamic Coordinate projection: Transform 3D coordinates into orthographic 2D planes
    const projectedVertices = vertices.map(([x, y, z]) => {
      // Apply rotation transformation matrix
      const rx = x * rm.r11 + y * rm.r12 + z * rm.r13;
      const ry = x * rm.r21 + y * rm.r22 + z * rm.r23;
      const rz = x * rm.r31 + y * rm.r32 + z * rm.r33;

      // Apply coordinates offset perspective calculation
      const distance = 4.5;
      const scaleProj = scale * (distance / (distance + rz));

      return {
        x: cx + rx * scaleProj,
        y: cy + ry * scaleProj,
        z: rz, // Cache original Z-depth for 3D sorting drawing queue (painters algorithm)
      };
    });

    // Face rendering queue with Z-depth depth calculation (Painters Algorithm to avoid rendering overlaps)
    const sortedFaces = faces
      .map((face) => {
        // Average Z depth coordinates of face vertices
        const avgZ = face.indices.reduce((sum, idx) => sum + projectedVertices[idx].z, 0) / face.indices.length;
        return { face, avgZ };
      })
      .sort((a, b) => b.avgZ - a.avgZ); // Sort back faces (higher depth) to render first

    // Draw faces in sequential depth layers
    sortedFaces.forEach(({ face }) => {
      ctx.beginPath();
      const firstIdx = face.indices[0];
      ctx.moveTo(projectedVertices[firstIdx].x, projectedVertices[firstIdx].y);

      for (let i = 1; i < face.indices.length; i++) {
        const nextIdx = face.indices[i];
        ctx.lineTo(projectedVertices[nextIdx].x, projectedVertices[nextIdx].y);
      }
      ctx.closePath();

      // Fill solids with transparency, stroke perimeter borders
      ctx.fillStyle = face.color;
      ctx.fill();

      ctx.strokeStyle = face.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Detail wing solar segment cell lines (visual cyber grids!)
      if (face.indices[0] === 8 || face.indices[0] === 14) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 0.5;
        // Mid divisions
        ctx.beginPath();
        const startX = (projectedVertices[face.indices[0]].x + projectedVertices[face.indices[1]].x) / 2;
        const startY = (projectedVertices[face.indices[0]].y + projectedVertices[face.indices[1]].y) / 2;
        const endX = (projectedVertices[face.indices[3]].x + projectedVertices[face.indices[2]].x) / 2;
        const endY = (projectedVertices[face.indices[3]].y + projectedVertices[face.indices[2]].y) / 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });

    // Drawing GCS orientation vectors / Axis lines (X - Red, Y - Green, Z - Blue)
    const axes = [
      { vec: [1.5, 0, 0], color: "#ef4444", label: "X" }, // Yaw line
      { vec: [0, 1.8, 0], color: "#10b981", label: "Y" }, // Pitch reference
      { vec: [0, 0, 1.5], color: "#3b82f6", label: "Z" }, // Antenna alignment
    ];

    axes.forEach(({ vec: [x, y, z], color, label }) => {
      // Rotational matrix coordinate transformation
      const rx = x * rm.r11 + y * rm.r12 + z * rm.r13;
      const ry = x * rm.r21 + y * rm.r22 + z * rm.r23;
      const rz = x * rm.r31 + y * rm.r32 + z * rm.r33;

      const distance = 4.5;
      const scaleProj = scale * (distance / (distance + rz));

      const px = cx + rx * scaleProj;
      const py = cy + ry * scaleProj;

      // Draw vector lines
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // End cap point
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Axes vectors labels
      ctx.fillStyle = color;
      ctx.font = "8px monospace";
      ctx.fillText(label, px + 5, py - 2);
    });

    // Antenna design on top of satellite
    const antBaseSec = projectedVertices[4];
    const antBaseThr = projectedVertices[0];
    const antennaX = (antBaseSec.x + antBaseThr.x) / 2;
    const antennaY = (antBaseSec.y + antBaseThr.y) / 2;

    // Draw antenna pole extending off the visual grid
    ctx.beginPath();
    ctx.strokeStyle = "#a855f7"; // purple-500
    ctx.lineWidth = 2.0;
    ctx.moveTo(antennaX, antennaY);
    // Project small cylinder offset
    const antTipX = antennaX + (antennaX - cx) * 0.2;
    const antTipY = antennaY + (antennaY - cy) * 0.2 - 20;
    ctx.lineTo(antTipX, antTipY);
    ctx.stroke();

    // Antenna tip transceiver emitter circle
    ctx.beginPath();
    ctx.fillStyle = "#a855f7";
    ctx.arc(antTipX, antTipY, 4, 0, 2 * Math.PI);
    ctx.fill();

  }, [localPitch, localRoll, localYaw]);

  const handleSliderChange = (axis: "pitch" | "roll" | "yaw", val: number) => {
    if (axis === "pitch") {
      setLocalPitch(val);
      if (onManualOverride) onManualOverride(val, localRoll, localYaw);
    } else if (axis === "roll") {
      setLocalRoll(val);
      if (onManualOverride) onManualOverride(localPitch, val, localYaw);
    } else {
      setLocalYaw(val);
      if (onManualOverride) onManualOverride(localPitch, localRoll, val);
    }
  };

  const handleResetSliders = () => {
    setLocalPitch(0);
    setLocalRoll(0);
    setLocalYaw(0);
    if (onManualOverride) onManualOverride(0, 0, 0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Visual orientation header */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
          <span className="font-mono text-xs font-semibold text-slate-300 tracking-wider">
            ORIENTATION DIRECTIVE DISPLAY
          </span>
        </div>
        <div className="flex p-0.5 bg-slate-900 rounded border border-slate-800">
          <button
            onClick={() => setActiveTab("horizon")}
            className={`font-mono text-[10px] px-2 py-1 rounded cursor-pointer transition-all ${
              activeTab === "horizon" ? "bg-slate-950 text-indigo-400" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            HUD
          </button>
          <button
            onClick={() => setActiveTab("model")}
            className={`font-mono text-[10px] px-2 py-1 rounded cursor-pointer transition-all ${
              activeTab === "model" ? "bg-slate-950 text-indigo-400" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            3D MODEL
          </button>
          <button
            onClick={() => setActiveTab("both")}
            className={`font-mono text-[10px] px-2 py-1 rounded cursor-pointer transition-all ${
              activeTab === "both" ? "bg-slate-950 text-indigo-400" : "text-slate-300 hover:text-slate-100"
            }`}
          >
            DUAL
          </button>
        </div>
      </div>

      {/* Drawing Space Grid */}
      <div className="flex-1 min-h-[160px] bg-slate-950 p-2 flex items-center justify-center gap-4 relative overflow-hidden">
        {/* Sky radar line decorations */}
        <div className="absolute inset-0 border border-slate-900/40 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[1px] bg-slate-900/30 transform rotate-12"></div>
          <div className="w-[120%] h-[1px] bg-slate-900/30 transform -rotate-12"></div>
        </div>

        {/* TAB 1: Artificial Horizon Display */}
        {(activeTab === "horizon" || activeTab === "both") && (
          <div className="flex flex-col items-center justify-center relative">
            <canvas
              ref={horizonCanvasRef}
              width={160}
              height={160}
              className="bg-transparent border border-slate-800/40 rounded-full shadow-lg shadow-indigo-950/20"
            />
            <span className="font-mono text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
              Avionics Horizon PFD
            </span>
          </div>
        )}

        {/* TAB 2: Dynamic 3D cubesat rendering */}
        {(activeTab === "model" || activeTab === "both") && (
          <div className="flex flex-col items-center justify-center relative">
            <canvas
              ref={cubeCanvasRef}
              width={160}
              height={160}
              className="bg-transparent"
            />
            <span className="font-mono text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
              3D Orthogonal Matrix Projection
            </span>
          </div>
        )}

        {/* Streaming Overlay */}
        {isStreaming && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/50 backdrop-blur border border-indigo-500/20 px-1.5 py-0.5 rounded">
            <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-ping"></span>
            <span className="text-[8px] font-mono text-indigo-400 font-semibold tracking-wider">AUTO-GYRO</span>
          </div>
        )}
      </div>

      {/* Manual Controller Interface and sliders (helps in simulation & manual tuning) */}
      <div className="bg-slate-900 border-t border-slate-800 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">ORIENTATION ANGLES</span>
          <button
            onClick={handleResetSliders}
            className="font-mono text-[8px] text-emerald-400 px-1.5 py-0.5 border border-emerald-500/30 rounded bg-emerald-950/20 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-400 transition-colors cursor-pointer"
          >
            STABILIZE GIMBAL (0,0,0)
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Pitch Slider dial */}
          <div className="space-y-0.5 bg-slate-950/60 border border-slate-800/80 p-1.5 rounded">
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-slate-500">PITCH</span>
              <span className="text-cyan-400 font-bold">{localPitch.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              value={localPitch}
              disabled={isStreaming}
              onChange={(e) => handleSliderChange("pitch", Number(e.target.value))}
              className={`w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer ${isStreaming ? "opacity-30 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Roll Slider dial */}
          <div className="space-y-0.5 bg-slate-950/60 border border-slate-800/80 p-1.5 rounded">
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-slate-500">ROLL</span>
              <span className="text-indigo-400 font-bold">{localRoll.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={localRoll}
              disabled={isStreaming}
              onChange={(e) => handleSliderChange("roll", Number(e.target.value))}
              className={`w-full accent-indigo-500 h-1 rounded bg-slate-800 cursor-pointer ${isStreaming ? "opacity-30 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Yaw Slider dial */}
          <div className="space-y-0.5 bg-slate-950/60 border border-slate-800/80 p-1.5 rounded">
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-slate-500">YAW (α)</span>
              <span className="text-purple-400 font-bold">{localYaw.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={localYaw}
              disabled={isStreaming}
              onChange={(e) => handleSliderChange("yaw", Number(e.target.value))}
              className={`w-full accent-purple-500 h-1 rounded bg-slate-800 cursor-pointer ${isStreaming ? "opacity-30 cursor-not-allowed" : ""}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
