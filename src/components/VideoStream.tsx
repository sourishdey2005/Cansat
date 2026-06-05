/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, ChangeEvent } from "react";
import { Camera, CameraOff, Sparkles, Filter, Download, HelpCircle, RefreshCw, Radio } from "lucide-react";
import { TelemetryData } from "../types";

interface VideoProps {
  isSeparated: boolean;
  state: string;
  current: TelemetryData | null;
}

type StreamSource = "PHYSICAL" | "DUE_DRONE" | "MARS_ROVER";
type VisionFilter = "NORMAL" | "NIGHT_VISION" | "THERMAL_HUD" | "CRT_MONITOR";

export default function VideoStream({ isSeparated, state, current }: VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [source, setSource] = useState<StreamSource>("DUE_DRONE");
  const [filter, setFilter] = useState<VisionFilter>("NORMAL");
  const [isScanning, setIsScanning] = useState(true);

  // Web camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);

  // Procedural landscape coordinates for simulation scrolling
  const terrainOffsetRef = useRef({ x: 100, y: 100, frame: 0 });

  // Reset consent whenever source changes
  useEffect(() => {
    if (source !== "PHYSICAL") {
      setHasConsent(false);
    }
  }, [source]);

  // Scan for physical camera devices
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((allDevices) => {
          const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
          setDevices(videoDevices);
          if (videoDevices.length > 0) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        })
        .catch((err) => {
          console.error("Camera enumeration failed:", err);
        });
    }
  }, []);

  // Web camera lifecycle
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Camera permission blocked or inaccessible. Please select simulated overlays.");
      setSource("DUE_DRONE"); // Fallback to simulated
      setHasConsent(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleDeviceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedDeviceId(id);
    if (isCameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  useEffect(() => {
    if (source === "PHYSICAL") {
      if (hasConsent) {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [source, selectedDeviceId, hasConsent]);

  // Main canvas animation and rendering pipeline (60 FPS)
  useEffect(() => {
    let animationId: number;
    
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(renderFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationId = requestAnimationFrame(renderFrame);
        return;
      }

      const tState = terrainOffsetRef.current;
      tState.frame += 1;

      const alt = current ? current.altitude : 0;
      const pt = current ? current.pitch : 0;
      const rl = current ? current.roll : 0;
      const yw = current ? current.yaw : 0;
      const descRate = current ? current.descentRate : 0;
      const pktCnt = current ? current.packetCount : 0;
      const mTime = current ? current.missionTime : "--:--:--";
      const team = current ? current.teamId : "7784";

      // 1. CLEAR & DRAW BACKGROUNDS based on selected source
      if (source === "PHYSICAL" && isCameraActive && videoRef.current) {
        // Draw real webcam stream onto canvas with fits
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // DRAW SIMULATED FLIGHT FEEDS
        if (source === "DUE_DRONE") {
          // Drone scrolling terrain
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Update terrain offsets based on telemetry velocities
          const velX = Math.sin(yw * Math.PI / 180) * (descRate + 2) * 0.15;
          const velY = Math.cos(yw * Math.PI / 180) * (descRate + 2) * 0.15;
          tState.x = (tState.x + velX + 1000) % 200;
          tState.y = (tState.y + velY + 1000) % 200;

          // Drawing landscape grid (Vector mesh terrain look)
          ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
          ctx.lineWidth = 1;
          for (let i = -200; i < canvas.width + 200; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i + (tState.x % 40) - pt, 0);
            ctx.lineTo(i + (tState.x % 40) + rl - pt, canvas.height);
            ctx.stroke();
          }
          for (let j = -200; j < canvas.height + 200; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j + (tState.y % 40) + pt);
            ctx.lineTo(canvas.width, j + (tState.y % 40) - rl + pt);
            ctx.stroke();
          }

          // Topographical contours simulation
          ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(canvas.width/2 + (yw%60) - 30, canvas.height/2 + pt, 120 + (alt % 50), 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(canvas.width/2, canvas.height/2, 60 + (alt % 30), 0, Math.PI * 2);
          ctx.stroke();

          // Flight path vectors
          ctx.strokeStyle = "rgba(16, 185, 129, 0.18)";
          ctx.beginPath();
          ctx.moveTo(canvas.width / 4, canvas.height / 3);
          ctx.lineTo(canvas.width / 2, canvas.height / 2);
          ctx.lineTo(canvas.width * 3 / 4, canvas.height / 4);
          ctx.stroke();
          
        } else if (source === "MARS_ROVER") {
          // Mars crater simulation
          ctx.fillStyle = "#1e0b06";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Render orange dusty mountains/craters
          tState.x = (tState.x + 0.3) % 400;
          ctx.fillStyle = "#2d1009";
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          for (let x = 0; x <= canvas.width; x += 20) {
            const h = 80 + Math.sin((x + tState.x) * 0.01) * 30 + Math.cos((x - tState.x * 2) * 0.02) * 10;
            ctx.lineTo(x, canvas.height - h);
          }
          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();
          ctx.fill();

          // Grid horizon lines
          ctx.strokeStyle = "rgba(249, 115, 22, 0.15)";
          ctx.lineWidth = 1;
          for (let i = 0; i < canvas.width; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i, canvas.height / 2);
            ctx.lineTo(i + (rl * 2), canvas.height);
            ctx.stroke();
          }

          // Circular telemetry rings for martian analyzer
          ctx.strokeStyle = "rgba(239, 68, 68, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(canvas.width * 0.7, canvas.height * 0.4, 45, 0, Math.PI * 2);
          ctx.stroke();

          // Coordinates targeting locks
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
          ctx.fillText("TARGET ACCREDITED", canvas.width * 0.7 - 40, canvas.height * 0.4 - 55);
          ctx.fillText("DIST: 1.48 AU", canvas.width * 0.7 - 25, canvas.height * 0.4 + 60);

          ctx.beginPath();
          ctx.moveTo(canvas.width * 0.7 - 10, canvas.height * 0.4);
          ctx.lineTo(canvas.width * 0.7 + 10, canvas.height * 0.4);
          ctx.moveTo(canvas.width * 0.7, canvas.height * 0.4 - 10);
          ctx.lineTo(canvas.width * 0.7, canvas.height * 0.4 + 10);
          ctx.stroke();
        }
      }

      // 2. STATIC SCAN LINES & INTERFERENCE ON CAM_FEEDS
      if (isScanning) {
        // High-altitude transmission glitch noise simulation
        if (Math.random() > 0.985) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.fillRect(0, Math.random() * canvas.height, canvas.width, Math.random() * 8);
        }
        
        // Scanlines grid
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillRect(0, y, canvas.width, 1.5);
        }
      }

      // 3. FLIGHT INSTRUMENT OSD OVERLAYS (Professional military-grade HUD)
      ctx.save();
      
      // Pitch/Roll ladder card centered
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rl * Math.PI) / 180);

      ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
      ctx.lineWidth = 1.5;

      // Central avionics circle
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Pitch ticks
      const pitchOffset = pt * -2;
      for (let pitchTick = -45; pitchTick <= 45; pitchTick += 15) {
        if (pitchTick === 0) continue;
        const tickY = (pitchTick * 2) + pitchOffset;

        // Angle indicator lines
        ctx.beginPath();
        ctx.moveTo(-30, tickY);
        ctx.lineTo(-10, tickY);
        ctx.lineTo(-10, tickY + (pitchTick > 0 ? 5 : -5));
        
        ctx.moveTo(30, tickY);
        ctx.lineTo(10, tickY);
        ctx.lineTo(10, tickY + (pitchTick > 0 ? 5 : -5));
        ctx.stroke();

        ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
        ctx.font = "8px monospace";
        ctx.fillText(pitchTick.toString(), -45, tickY + 3);
        ctx.fillText(pitchTick.toString(), 35, tickY + 3);
      }

      // Wings flight symbols (Dynamic Roll reference)
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.lineTo(-50, 0);
      ctx.lineTo(-40, 10);
      ctx.moveTo(70, 0);
      ctx.lineTo(50, 0);
      ctx.lineTo(40, 10);
      ctx.stroke();

      ctx.restore();

      // 4. HEADER & FOOTER STATIC SYSTEM DATA OVERLAYS
      ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
      ctx.font = "bold 9px monospace";

      // Compass strip on top tape
      const compassX = (yw % 360) * -1;
      ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 25);
      ctx.lineTo(canvas.width - 30, 25);
      ctx.stroke();

      for (let angle = 0; angle < 720; angle += 15) {
        const xPos = (canvas.width / 2) + (angle + compassX) % 360 - 180;
        if (xPos > 30 && xPos < canvas.width - 30) {
          ctx.beginPath();
          ctx.moveTo(xPos, 20);
          ctx.lineTo(xPos, 25);
          ctx.stroke();

          // Draw coordinates codes
          const actAngle = angle % 360;
          let codeStr = actAngle.toString();
          if (actAngle === 0) codeStr = "N";
          if (actAngle === 90) codeStr = "E";
          if (actAngle === 180) codeStr = "S";
          if (actAngle === 270) codeStr = "W";

          ctx.fillStyle = "rgba(34, 211, 238, 0.8)";
          ctx.font = "7px monospace";
          ctx.textAlign = "center";
          ctx.fillText(codeStr, xPos, 15);
        }
      }
      ctx.textAlign = "start";

      // Digital values lists (HUD Sidebar elements)
      ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`ALTITUDE: ${alt.toFixed(1)} M`, 20, 50);
      ctx.fillText(`DESCENT:  ${descRate.toFixed(1)} M/S`, 20, 65);
      ctx.fillText(`ROLL:     ${rl.toFixed(1)}°`, 20, 80);
      ctx.fillText(`PITCH:    ${pt.toFixed(1)}°`, 20, 95);

      ctx.fillText(`TEAM_ID:  ${team}`, canvas.width - 130, 50);
      ctx.fillText(`PACKET:   #${pktCnt}`, canvas.width - 130, 65);
      ctx.fillText(`TIME:     ${mTime}`, canvas.width - 130, 80);
      ctx.fillText(`STATE:    ${state}`, canvas.width - 130, 95);

      // 5. PRIMARY ENGINEER AND DESIGN CREDITS (Always visible on Canvas Downlink feeds)
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.fillRect(15, canvas.height - 24, 155, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.fillText("DESIGNED BY: ARUNIMA DUTTA", 20, canvas.height - 14);

      ctx.fillStyle = "rgba(34, 211, 238, 0.7)";
      ctx.font = "7px monospace";
      ctx.fillText("GCS SYSTEM CAMERA LINK ACTIVE", canvas.width - 145, canvas.height - 14);

      animationId = requestAnimationFrame(renderFrame);
    };

    animationId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [source, filter, current, isCameraActive, isScanning, state]);

  // Capture current telemetry vision snapshot, including baked-in credits watermarks!
  const takeVisionSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Generate simulated snapshot on file systems
    const stampCanvas = document.createElement("canvas");
    stampCanvas.width = canvas.width;
    stampCanvas.height = canvas.height;
    const sCtx = stampCanvas.getContext("2d");
    if (!sCtx) return;

    // Direct clone current canvas frame
    sCtx.drawImage(canvas, 0, 0);

    // Apply high contrast design overlays stamp at bottom-right
    sCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
    sCtx.fillRect(0, canvas.height - 30, canvas.width, 30);
    
    sCtx.strokeStyle = "#22d3ee";
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    sCtx.moveTo(0, canvas.height - 30);
    sCtx.lineTo(canvas.width, canvas.height - 30);
    sCtx.stroke();

    sCtx.fillStyle = "#22d3ee";
    sCtx.font = "9px monospace";
    const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
    sCtx.fillText(`SNAPSHOT: ${ts} UTC | STREAMING SOURCE: ${source}`, 15, canvas.height - 11);
    
    sCtx.fillStyle = "#10b981";
    sCtx.font = "bold 9px monospace";
    sCtx.textAlign = "end";
    sCtx.fillText("OFFICIAL ENGINEER: ARUNIMA DUTTA", canvas.width - 15, canvas.height - 11);
    sCtx.textAlign = "start";

    // Export image as raw downloading element
    const dataUrl = stampCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `GCS_CANSAT_SNAP_${new Date().getTime()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Switch filter class names dynamically for CSS filter aesthetics
  const getFilterCSSClass = () => {
    switch (filter) {
      case "NIGHT_VISION":
        return "brightness-[1.15] contrast-[1.4] sepia saturate-[5] hue-rotate-[90deg] grayscale-[0.25]";
      case "THERMAL_HUD":
        return "contrast-[1.65] invert hue-rotate-[190deg] saturate-[2.4] hover:animate-pulse";
      case "CRT_MONITOR":
        return "contrast-[1.25] brightness-[1.1] saturate-[0.75] shadow-[inset_0_0_80px_rgba(34,211,238,0.25)]";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative">
      {/* Visual camera stream header */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-slate-300 tracking-wider flex items-center gap-1.5">
            OPTICAL DOWNLINK FEED 
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" title="Arunima Dutta Extended Edition" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded ${
            source === "PHYSICAL" && isCameraActive 
              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" 
              : "bg-cyan-950 text-cyan-400 border border-cyan-500/20"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${source === "PHYSICAL" && isCameraActive ? "bg-emerald-500 animate-pulse" : "bg-cyan-400 animate-pulse"}`}></span>
            {source === "PHYSICAL" ? "WEBCAM LINK" : source === "DUE_DRONE" ? "DRONE SIM" : "MARS_OSD"}
          </span>
        </div>
      </div>

      {/* Video stream rendering center */}
      <div className="flex-1 min-h-[220px] bg-black relative flex items-center justify-center overflow-hidden">
        {/* Hidden video element for pulling web cam pixels into Canvas */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Main interactive responsive high-definition drawing Canvas with Live Filter styles applied */}
        <div className="w-full h-full relative aspect-video flex items-center justify-center bg-black">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`w-full h-full max-h-[365px] object-contain select-none transition-all duration-300 ${getFilterCSSClass()}`}
          />
        </div>

        {/* Dynamic User Consent Box for physical web cam permissions */}
        {source === "PHYSICAL" && !hasConsent && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-[50] flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-4 border border-slate-800 bg-slate-900/60 p-5 rounded-lg shadow-2xl relative z-[100] animate-none">
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-cyan-400">
                <Camera className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
                  CAMERA ACCESS PERMISSION REQUEST
                </h3>
                <p className="font-mono text-[9px] text-slate-400 leading-normal">
                  The Ground Control Station requests linkage to your local hardware webcam to display live telemetry overlay and capture telemetry recordings.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setSource("DUE_DRONE")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-[9px] font-bold rounded uppercase cursor-pointer transition-colors"
                >
                  CANCEL / DENY
                </button>
                <button
                  type="button"
                  onClick={() => setHasConsent(true)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-[9px] font-bold rounded uppercase cursor-pointer border border-cyan-500/10 transition-colors"
                >
                  AUTHORIZE & LINK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live dynamic laser visual marker HUD frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Tactical cyber brackets decoration */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400/35"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400/35"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400/35"></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400/35"></div>

          {/* live OSD blinking indicator */}
          <div className="absolute top-3 right-3 bg-red-950/80 border border-red-500/30 font-mono text-[8.5px] text-red-400 px-2.5 py-0.5 rounded flex items-center gap-1">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            <span>LIVE DOWNLINK DEPLOYED</span>
          </div>

          {/* Active OSD watermark in corner */}
          <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 font-mono text-[8px] text-slate-400 px-2 py-0.5 rounded">
            <span>ENG-LINK: A. DUTTA</span>
          </div>
        </div>

        {/* Dynamic warning if client blocked camera but requested PHYSICAL mode */}
        {source === "PHYSICAL" && cameraError && (
          <div className="absolute top-10 left-3 right-3 bg-red-950/90 border border-red-500/30 font-mono text-[9px] text-red-200 p-2 rounded shadow-lg uppercase leading-relaxed text-center">
            {cameraError}
          </div>
        )}
      </div>

      {/* Controller inputs and dropdown selections (Extended functional tools) */}
      <div className="bg-slate-900 border-t border-slate-800 p-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Feed Source Selector */}
          <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <span className="font-mono text-[8.5px] text-slate-500 font-bold uppercase">FEED:</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as StreamSource)}
              className="flex-1 bg-transparent text-[10px] font-mono text-slate-300 border-none focus:outline-none cursor-pointer"
            >
              <option value="DUE_DRONE" className="bg-slate-900 text-slate-300">SIM DRONE CAM</option>
              <option value="MARS_ROVER" className="bg-slate-900 text-slate-300">PLANET FEED</option>
              <option value="PHYSICAL" className="bg-slate-900 text-slate-300">PHYSICAL WEBCAM</option>
            </select>
          </div>

          {/* vision filter selector */}
          <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <Filter className="h-3 w-3 text-cyan-400" />
            <span className="font-mono text-[8.5px] text-slate-500 font-bold uppercase">MODE:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as VisionFilter)}
              className="flex-1 bg-transparent text-[10px] font-mono text-slate-300 border-none focus:outline-none cursor-pointer"
            >
              <option value="NORMAL" className="bg-slate-900 text-slate-300">NORMAL COLOR</option>
              <option value="NIGHT_VISION" className="bg-slate-900 text-slate-300">NIGHT-VISION</option>
              <option value="THERMAL_HUD" className="bg-slate-900 text-slate-300">THERMAL HUD</option>
              <option value="CRT_MONITOR" className="bg-slate-900 text-slate-300">CRT SECURITY</option>
            </select>
          </div>

          {/* Web camera selector (only if webcam source is active) */}
          {source === "PHYSICAL" && devices.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              <RefreshCw className="h-3 w-3 text-slate-500" />
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-transparent text-[9px] font-mono text-slate-300 border-none focus:outline-none cursor-pointer"
              >
                {devices.map((d, index) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-slate-300">
                    CAM {index + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Interactive toggle command buttons */}
        <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-850/40">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`font-mono text-[9px] px-2.5 py-1 border rounded cursor-pointer transition-colors ${
              isScanning 
                ? "border-cyan-500/30 text-cyan-400 bg-cyan-950/15" 
                : "border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Scan noise overlays"
          >
            {isScanning ? "DISABLE DISTORTION" : "STIMULATE INTEFERENCE"}
          </button>

          <button
            onClick={takeVisionSnapshot}
            className="flex items-center gap-1 font-mono text-[9.5px] text-emerald-400 border border-emerald-500/20 bg-emerald-950/15 hover:bg-emerald-950 hover:border-emerald-400 px-3 py-1.5 rounded transition-all cursor-pointer font-bold uppercase shadow-[0_0_8px_rgba(16,185,129,0.05)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>DOWNLINK SNAPSHOT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
