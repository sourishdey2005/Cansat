/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, ChangeEvent } from "react";
import { Camera, CameraOff, RefreshCw, Radio } from "lucide-react";

interface VideoProps {
  isSeparated: boolean;
  state: string;
}

export default function VideoStream({ isSeparated, state }: VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  // Scan for available imaging hardware devices/webcams on mount
  useEffect(() => {
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
        console.error("Camera enumeration failure:", err);
      });
  }, []);

  // Handle starting/stopping imaging camera stream
  const startCamera = async () => {
    setErrorMsg(null);
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
      console.error("Media Device Camera fetch failure:", err);
      // Give descriptive feedback or support local dummy simulation if block overlays exist
      setErrorMsg("Camera service blocked or hardware not accessible. GCS is displaying telemetry simulator mode.");
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

  // Switch between cameras dynamically
  const handleDeviceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedDeviceId(id);
    if (isCameraActive) {
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  // Autostop camera on destruct to prevent resources hogging
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative">
      {/* Visual camera stream header */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-slate-300 tracking-wider">
            OPTICAL DOWNLINK CAMERA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded ${
            isCameraActive ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isCameraActive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></span>
            {isCameraActive ? "ON-AIR" : "STDBY"}
          </span>
        </div>
      </div>

      {/* Video stream rendering center */}
      <div className="flex-1 min-h-[180px] bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Main interactive HTML5 video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover select-none ${isCameraActive ? "block" : "hidden"}`}
        />

        {/* Dummy Simulation Overlay when camera is standby */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-radial from-slate-900 via-slate-950 to-black">
            {/* Cyberpunk space telemetry visualizer map or noise generator */}
            <div className="relative mb-3 flex items-center justify-center">
              <span className="absolute animate-ping inline-flex h-12 w-12 rounded-full bg-blue-500 opacity-20"></span>
              <div className="h-10 w-10 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center">
                <CameraOff className="h-5 w-5 text-slate-500" />
              </div>
            </div>
            
            <p className="font-mono text-xs text-slate-400 tracking-wide">VIDEO FEED SYSTEM LINK INACTIVE</p>
            <p className="font-mono text-[9px] text-slate-600 max-w-[200px] mt-1.5">
              Click &quot;INITIALIZE FEED&quot; to fetch local microcontroller optics stream.
            </p>
          </div>
        )}

        {/* Tactical Crosshair Overlay for Camera calibration when active */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Camera calibration Gridlines */}
            <div className="w-[80px] h-[80px] border border-cyan-400/20 rounded-full flex items-center justify-center">
              <div className="w-[10px] h-[10px] border border-cyan-400/40 rounded-full"></div>
            </div>
            {/* Corner Bracket decorations */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400/30"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400/30"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400/30"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400/30"></div>
            
            {/* Scanning Laser Line effect */}
            {isScanning && (
              <div className="absolute left-0 right-0 h-[1.5px] bg-cyan-400/45 shadow-[0_0_10px_#22d3ee] animate-[bounce_6s_infinite] top-0"></div>
            )}

            {/* Downlink Telemetry text HUD overlay */}
            <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs font-mono text-[8px] text-cyan-400 px-2 py-1 rounded border border-cyan-400/20 uppercase">
              <div className="flex gap-1.5">
                <span className="text-slate-500">CHRES:</span> 1080P@30FPS
              </div>
              <div className="flex gap-1.5">
                <span className="text-slate-500">OPLINK:</span> DESCENT FEED
              </div>
            </div>

            <div className="absolute top-3 right-3 bg-red-950/80 border border-red-500/30 font-mono text-[8px] text-red-400 px-2.5 py-0.5 rounded flex items-center gap-1">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              <span>LIVE OSD</span>
            </div>
          </div>
        )}

        {/* Error messaging bar */}
        {errorMsg && (
          <div className="absolute top-10 left-3 right-3 bg-red-950/90 border border-red-500/30 font-mono text-[9px] text-red-200 p-2 rounded shadow-lg">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Optical Downlink Controls Footer */}
      <div className="bg-slate-900 border-t border-slate-800 p-2 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="flex-1 font-mono text-[10px] text-red-400 border border-red-500/30 bg-red-950/20 hover:bg-red-950 hover:border-red-400 font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              DISABLE OPTICAL LINK
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex-1 font-mono text-[10px] text-cyan-400 border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950 hover:border-cyan-400 font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              INITIALIZE CAMERA FEED
            </button>
          )}

          {/* Toggle Scan Line */}
          <button
            onClick={() => setIsScanning(!isScanning)}
            disabled={!isCameraActive}
            className={`font-mono text-[10px] px-2.5 py-1.5 border rounded cursor-pointer transition-colors ${
              !isCameraActive 
                ? "border-slate-850 text-slate-700 cursor-not-allowed" 
                : isScanning 
                  ? "border-cyan-500/40 text-cyan-400 bg-cyan-950/10" 
                  : "border-slate-800 text-slate-500"
            }`}
            title="Toggle Calibration Scanline"
          >
            GRID HUD
          </button>
        </div>

        {/* Hardware Dropdown switch selector */}
        {devices.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-950/40 px-2 rounded border border-slate-800">
            <RefreshCw className="h-3 w-3 text-slate-500" />
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="bg-transparent text-[9px] font-mono text-slate-300 border-none focus:outline-none py-1 select-none pr-1 cursor-pointer"
            >
              {devices.map((d, index) => (
                <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-slate-300">
                  CAMERA {index + 1}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
