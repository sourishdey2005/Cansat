/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { TelemetryData, ControlCommand, Waypoint } from "./types";
import { LAUNCHPAD_LAT, LAUNCHPAD_LNG } from "./utils/constants";

// Sub-components
import TopControlBar from "./components/TopControlBar";
import TelemetryDisplay from "./components/TelemetryDisplay";
import MissionControlPanel from "./components/MissionControlPanel";
import RealTimeGraphs from "./components/RealTimeGraphs";
import TrackingMap from "./components/TrackingMap";
import OrientationVisualization from "./components/OrientationVisualization";
import VideoStream from "./components/VideoStream";
import TelemetryConsole from "./components/TelemetryConsole";
import MissionAnalytics from "./components/MissionAnalytics";

export default function App() {
  // Telemetry stream logs database
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [current, setCurrent] = useState<TelemetryData | null>(null);

  // Connection control flags
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [baudRate, setBaudRate] = useState<number>(115200);

  // Time controls
  const [timeSyncOffset, setTimeSyncOffset] = useState<number>(0); // alignment delta to PC clock

  // Web Serial API handles
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const serialCancelRef = useRef<boolean>(false);

  // Physics simulation variables
  const simStateRef = useRef({
    state: "PRE_LAUNCH" as TelemetryData["state"],
    packetCount: 0,
    startTime: Date.now(),
    altitude: 0,
    pressure: 101325,
    temp: 24.5,
    voltage: 8.4,
    gpsLat: LAUNCHPAD_LAT,
    gpsLng: LAUNCHPAD_LNG,
    gpsAlt: 0,
    gpsSats: 8,
    pitch: 0,
    roll: 0,
    yaw: 0,
    descentRate: 0,
    descentRateFault: false,
    gpsUnavailable: false,
    separationFailure: false,
    parachuteActive: false,
  });

  // Track map coordinates history
  const [mapHistory, setMapHistory] = useState<Array<{ lat: number; lng: number }>>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  // Generate real-time telemetry stream simulator
  useEffect(() => {
    if (!isSimulating) return;

    simStateRef.current.startTime = Date.now();
    const interval = setInterval(() => {
      const stateRef = simStateRef.current;
      stateRef.packetCount += 1;

      const elapsedSec = (Date.now() - stateRef.startTime) / 1000;

      // MISSION FLIGHT PATH CONTROLLER
      if (stateRef.state === "PRE_LAUNCH") {
        stateRef.altitude = 0;
        stateRef.descentRate = 0;
        stateRef.pitch = Math.sin(elapsedSec) * 2;
        stateRef.roll = Math.cos(elapsedSec) * 2.5;
        stateRef.yaw = (stateRef.yaw + 0.5) % 360;

        // Auto transition to ASCENT after 8 seconds
        if (elapsedSec > 8) {
          stateRef.state = "ASCENT";
        }
      } else if (stateRef.state === "ASCENT") {
        // Rocket Ascent profile rising at ~24 m/s up to 850m
        stateRef.altitude += 22.5 + Math.random() * 3;
        stateRef.descentRate = -22.5;
        stateRef.voltage -= 0.001; // power discharge
        
        // Sensor fluctuations
        stateRef.pressure = 101325 * Math.pow(1 - 0.0000225577 * stateRef.altitude, 5.25588);
        stateRef.temp = 24.5 - (stateRef.altitude / 150) + (Math.random() * 0.4 - 0.2);

        // Rocket booster vibration simulation
        stateRef.pitch = Math.sin(elapsedSec * 15) * 8;
        stateRef.roll = Math.cos(elapsedSec * 12) * 10;
        stateRef.yaw = (stateRef.yaw + 3) % 360;

        // GPS trajectory displacement
        stateRef.gpsLat += 0.00004;
        stateRef.gpsLng += 0.00006;
        stateRef.gpsAlt = stateRef.altitude;

        // Separation triggering peak height at 850m
        if (stateRef.altitude >= 850) {
          stateRef.state = "SEPARATED";
        }
      } else if (stateRef.state === "SEPARATED") {
        // Instant shock drop, transition to natural free descent terminal speeds
        stateRef.pitch = Math.sin(elapsedSec * 5) * 45; // extreme tumblings
        stateRef.roll = Math.cos(elapsedSec * 4) * 60;
        stateRef.yaw = (stateRef.yaw + 10) % 360;

        stateRef.descentRate = 12.4 + (Math.random() - 0.5); // unsafe descent rate (12 m/s holds outside 8-10m/s bounds)
        stateRef.altitude -= stateRef.descentRate;

        stateRef.gpsLat += 0.00010;
        stateRef.gpsLng += 0.00015;
        stateRef.gpsAlt = stateRef.altitude;

        // Move to active descent stream simulation
        stateRef.state = "DESCENT";
      } else if (stateRef.state === "DESCENT") {
        // Falling with descent velocity fault active
        stateRef.descentRate = 12.4 + (Math.random() * 0.5 - 0.25);
        stateRef.altitude -= stateRef.descentRate;

        // Pressure rises, thermals return to sea temps
        stateRef.pressure = 101325 * Math.pow(1 - 0.0000225577 * stateRef.altitude, 5.25588);
        stateRef.temp = 24.5 - (stateRef.altitude / 150) + (Math.random() * 0.2 - 0.1);

        // Pendulum parachute oscillations
        stateRef.pitch = Math.sin(elapsedSec * 2) * 20;
        stateRef.roll = Math.cos(elapsedSec * 1.5) * 25;
        stateRef.yaw = (stateRef.yaw + 1) % 360;

        stateRef.gpsLat += 0.00006;
        stateRef.gpsLng += 0.00008;
        stateRef.gpsAlt = stateRef.altitude;

        // Auto deploy backup emergency parachute at 350m
        if (stateRef.altitude <= 350) {
          stateRef.state = "PARACHUTE_DEPLOYED";
          stateRef.parachuteActive = true;
        }
      } else if (stateRef.state === "PARACHUTE_DEPLOYED") {
        // Parachute open: Descent rate cuts cleanly into the safe 8.5 m/s zone! (Digit 1 = '0')
        stateRef.descentRate = 8.6 + (Math.random() * 0.4 - 0.2);
        stateRef.altitude -= stateRef.descentRate;

        stateRef.pressure = 101325 * Math.pow(1 - 0.0000225577 * stateRef.altitude, 5.25588);
        stateRef.temp = 24.5 - (stateRef.altitude / 150) + (Math.random() * 0.2 - 0.1);

        // Stabilized hover motion
        stateRef.pitch = Math.sin(elapsedSec) * 5;
        stateRef.roll = Math.cos(elapsedSec * 0.8) * 6;
        stateRef.yaw = (stateRef.yaw + 0.4) % 360;

        stateRef.gpsLat += 0.00003;
        stateRef.gpsLng += 0.00004;
        stateRef.gpsAlt = stateRef.altitude;

        // Landing boundary state
        if (stateRef.altitude <= 2) {
          stateRef.state = "LANDED";
          stateRef.altitude = 0;
          stateRef.descentRate = 0;
          stateRef.parachuteActive = false;
        }
      } else if (stateRef.state === "LANDED") {
        stateRef.altitude = 0;
        stateRef.descentRate = 0;
        stateRef.yaw = 180;
        stateRef.pitch = 0;
        stateRef.roll = 0;
        stateRef.gpsAlt = 0;
      }

      // FAULT CONDITIONS CALCULATION
      // Digit 1: Descent Rate is outside 8-10 m/s range (only applies when actively flying downwards)
      const isFlyingDown = stateRef.state === "DESCENT" || stateRef.state === "PARACHUTE_DEPLOYED";
      stateRef.descentRateFault = isFlyingDown && (stateRef.descentRate < 8.0 || stateRef.descentRate > 10.0);

      // Digit 2: Simulated temporary GPS fail indicator
      stateRef.gpsUnavailable = stateRef.gpsSats < 4;

      // Digit 3: Payload Separation failure (mount failure before peak height trigger)
      stateRef.separationFailure = (stateRef.state === "ASCENT" && stateRef.altitude > 800) || false;

      // Format custom aerospace style mock CSV packet line
      // Format match: TEAM_ID, PACKET_COUNT, MISSION_TIME, ...
      const curTimeStr = new Date(Date.now() + timeSyncOffset).toLocaleTimeString("en-US", { hour12: false });
      
      const dig1 = stateRef.descentRateFault ? "1" : "0";
      const dig2 = stateRef.gpsUnavailable ? "1" : "0";
      const dig3 = stateRef.separationFailure ? "1" : "0";
      const dig4 = stateRef.parachuteActive ? "1" : "0";
      const faultCode = `${dig1}${dig2}${dig3}${dig4}`;

      const packetLine = `7784,${stateRef.packetCount},${curTimeStr},${stateRef.altitude.toFixed(2)},${stateRef.pressure.toFixed(1)},${stateRef.temp.toFixed(2)},${stateRef.voltage.toFixed(2)},${stateRef.gpsLat.toFixed(6)},${stateRef.gpsLng.toFixed(6)},${stateRef.gpsAlt.toFixed(2)},${stateRef.gpsSats},${stateRef.pitch.toFixed(1)},${stateRef.roll.toFixed(1)},${stateRef.yaw.toFixed(1)},${stateRef.state},${faultCode}`;

      const newPacket: TelemetryData = {
        teamId: "7784",
        packetCount: stateRef.packetCount,
        missionTime: curTimeStr,
        altitude: stateRef.altitude,
        pressure: stateRef.pressure,
        temp: stateRef.temp,
        voltage: stateRef.voltage,
        gpsLat: stateRef.gpsLat,
        gpsLng: stateRef.gpsLng,
        gpsAlt: stateRef.gpsAlt,
        gpsSats: stateRef.gpsSats,
        pitch: stateRef.pitch,
        roll: stateRef.roll,
        yaw: stateRef.yaw,
        descentRate: stateRef.descentRate,
        state: stateRef.state,
        descentRateFault: stateRef.descentRateFault,
        gpsUnavailable: stateRef.gpsUnavailable,
        separationFailure: stateRef.separationFailure,
        parachuteActive: stateRef.parachuteActive,
        rawPacket: packetLine,
        timestamp: new Date(),
      };

      // Set state queues safely
      setCurrent(newPacket);
      setHistory((prev) => [...prev, newPacket]);

      // Add to spatial tracking route history
      setMapHistory((prev) => [...prev, { lat: stateRef.gpsLat, lng: stateRef.gpsLng }]);

    }, 500);

    return () => clearInterval(interval);
  }, [isSimulating, timeSyncOffset]);

  // ACTIVATE AND COMMUNICATE VIA WEB SERIAL API PORT (For Arduino microcontrollers)
  const connectSerialPort = async () => {
    if (!("serial" in navigator)) {
      alert("Web Serial API is not supported in this browser web iframe environment. Please try other modern devices or use our built-in high-fidelity physics simulator!");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });

      serialPortRef.current = port;
      setIsSerialConnected(true);
      setIsStreaming(true);
      serialCancelRef.current = false;

      // Start asynchronous payload decoding loop
      readSerialData(port);
    } catch (err) {
      console.error("Web Serial connection failure: ", err);
      alert("Failed to capture serial link. Confirm interface connections or verify device drivers.");
    }
  };

  const disconnectSerialPort = async () => {
    serialCancelRef.current = true;
    
    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel();
      } catch (err) {
        console.error(err);
      }
    }

    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch (err) {
        console.error(err);
      }
    }

    serialPortRef.current = null;
    setIsSerialConnected(false);
    setIsStreaming(false);
  };

  // Decode stream line-by-line using a TextDecoderStream
  const readSerialData = async (port: any) => {
    const textDecoderStream = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoderStream.writable);
    const reader = textDecoderStream.readable.getReader();
    serialReaderRef.current = reader;

    let partialLine = "";

    try {
      while (!serialCancelRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          const chunk = partialLine + value;
          const lines = chunk.split("\n");
          // Save the last partial line for the next iteration
          partialLine = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length > 0) {
              parseCOMTelemetryPacket(cleanLine);
            }
          }
        }
      }
    } catch (err) {
      console.error("COM stream reading loop failure:", err);
    } finally {
      reader.releaseLock();
    }
  };

  // Parse CSV packet lines from the physical telemetry payload
  const parseCOMTelemetryPacket = (line: string) => {
    // Expected template layout:
    // TEAM_ID, PACKET_COUNT, MISSION_TIME, ALTITUDE, PRESSURE, TEMP, VOLTAGE, GPS_LAT, GPS_LNG, GPS_ALT, GPS_SATS, PITCH, ROLL, YAW, FLIGHT_STATE, ERROR_CODE
    const parts = line.split(",");
    if (parts.length < 15) return; // incomplete packet line, discard.

    try {
      const teamId = parts[0];
      const packetCount = parseInt(parts[1]) || 0;
      const missionTime = parts[2];
      const altitude = parseFloat(parts[3]) || 0;
      const pressure = parseFloat(parts[4]) || 0;
      const temp = parseFloat(parts[5]) || 0;
      const voltage = parseFloat(parts[6]) || 0;
      const gpsLat = parseFloat(parts[7]) || LAUNCHPAD_LAT;
      const gpsLng = parseFloat(parts[8]) || LAUNCHPAD_LNG;
      const gpsAlt = parseFloat(parts[9]) || 0;
      const gpsSats = parseInt(parts[10]) || 0;
      const pitch = parseFloat(parts[11]) || 0;
      const roll = parseFloat(parts[12]) || 0;
      const yaw = parseFloat(parts[13]) || 0;
      const state = parts[14].trim() as TelemetryData["state"];
      const errorCodeStr = parts[15] ? parts[15].trim() : "0000";

      // Parse error code digits
      const d1 = errorCodeStr.charAt(0) === "1"; // descent rate fault
      const d2 = errorCodeStr.charAt(1) === "1"; // GPS loss
      const d3 = errorCodeStr.charAt(2) === "1"; // Separation fail
      const d4 = errorCodeStr.charAt(3) === "1"; // Parachute deploy

      // Estimate current descent rate mathematically using history altitude
      let descentRate = 0;
      if (history.length > 0) {
        const lastPkt = history[history.length - 1];
        descentRate = (lastPkt.altitude - altitude) * 2; // rate per second (with 500ms bounds)
      }

      const decodedPacket: TelemetryData = {
        teamId,
        packetCount,
        missionTime,
        altitude,
        pressure,
        temp,
        voltage,
        gpsLat,
        gpsLng,
        gpsAlt,
        gpsSats,
        pitch,
        roll,
        yaw,
        descentRate,
        state,
        descentRateFault: d1,
        gpsUnavailable: d2,
        separationFailure: d3,
        parachuteActive: d4,
        rawPacket: line,
        timestamp: new Date(),
      };

      // Set State queues
      setCurrent(decodedPacket);
      setHistory((prev) => [...prev, decodedPacket]);
      setMapHistory((prev) => [...prev, { lat: gpsLat, lng: gpsLng }]);
    } catch (err) {
      console.error("Payload decoding error on packet: ", line, err);
    }
  };

  // CSV Dump of entire flight telemetry path
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = "teamId,packetCount,missionTime,altitude,pressure,temp,voltage,gpsLat,gpsLng,gpsAlt,gpsSats,pitch,roll,yaw,state,errorCode\n";
    const data = history
      .map((h) => {
        const d1 = h.descentRateFault ? "1" : "0";
        const d2 = h.gpsUnavailable ? "1" : "0";
        const d3 = h.separationFailure ? "1" : "0";
        const d4 = h.parachuteActive ? "1" : "0";
        return `${h.teamId},${h.packetCount},${h.missionTime},${h.altitude.toFixed(3)},${h.pressure.toFixed(1)},${h.temp.toFixed(2)},${h.voltage.toFixed(2)},${h.gpsLat.toFixed(6)},${h.gpsLng.toFixed(6)},${h.gpsAlt.toFixed(2)},${h.gpsSats},${h.pitch.toFixed(1)},${h.roll.toFixed(1)},${h.yaw.toFixed(1)},"${h.state}","${d1}${d2}${d3}${d4}"`;
      })
      .join("\n");

    const blob = new Blob([headers + data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GCS_Complete_Telemetry_Record_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock layout printing or dashboard configuration capture to PDF/image
  const handleExportGraphPrint = () => {
    window.print();
  };

  // Clear data sets to prepare for another rocket flight path
  const handleResetPackets = () => {
    if (confirm("Reset local telemetry buffer? All cached flight packets will be cleared.")) {
      setHistory([]);
      setCurrent(null);
      setMapHistory([]);
      simStateRef.current.packetCount = 0;
      simStateRef.current.state = "PRE_LAUNCH";
    }
  };

  // Align ground reference clock to align to PC milliseconds
  const handleSyncTime = () => {
    setTimeSyncOffset(0); // clear any offsets
    alert("Microcontroller system RTC clocks aligned with client PC clock.");
  };

  // TRIGGER HARDWARE/SIMULATED MISSION COMMANDS
  const executeManualSeparation = () => {
    if (isSimulating) {
      simStateRef.current.state = "SEPARATED";
    }
    // For Web Serial, write raw command payload over port if writable
    writeCommandToPort("CMD_PAYLOAD_SEPARATION_0x0A\n");
  };

  const executeDeployParachute = () => {
    if (isSimulating) {
      simStateRef.current.state = "PARACHUTE_DEPLOYED";
      simStateRef.current.parachuteActive = true;
    }
    writeCommandToPort("CMD_CHUTE_DEPLOY_0x0C\n");
  };

  const executeRedundantActivation = () => {
    if (isSimulating) {
      // Simulate briefly dropping GPS sats to show failure then recovering
      simStateRef.current.gpsSats = 2; // GPS loss! Digit 2 becomes 1
      setTimeout(() => {
        simStateRef.current.gpsSats = 11; // recovered!
      }, 5000);
    }
    writeCommandToPort("CMD_BACKUP_CORE_ACT_0x0F\n");
  };

  // Serial port transmitter helper
  const writeCommandToPort = async (cmd: string) => {
    if (serialPortRef.current && serialPortRef.current.writable) {
      const writer = serialPortRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      try {
        await writer.write(encoder.encode(cmd));
      } catch (err) {
        console.error("Transceiver transmit failed:", err);
      } finally {
        writer.releaseLock();
      }
    }
  };

  // Safe tab switches
  const handleBaudRateChange = (baud: number) => {
    setBaudRate(baud);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Flight Progress Tracker status line */}
      <div className="h-1 bg-slate-900 w-full relative overflow-hidden">
        {current && (
          <div
            className="h-full bg-cyan-400 absolute transition-all duration-500 shadow-[0_0_8px_#22d3ee]"
            style={{ width: `${Math.min(100, (current.altitude / 850) * 100)}%` }}
          />
        )}
      </div>

      {/* Main Ground Control Frame */}
      <main className="flex-1 p-3.5 space-y-3.5 max-w-[1600px] mx-auto w-full">
        {/* Top Operational Status and Buttons control bar */}
        <TopControlBar
          isStreaming={isStreaming}
          isSimulating={isSimulating}
          isSerialConnected={isSerialConnected}
          lastPacketTime={current ? current.missionTime : "WAITING"}
          packetCount={history.length}
          baudRate={baudRate}
          onStartStream={() => {}} // obsolete, handled via serial connect or simulation start
          onStopStream={() => {}}
          onStartSimulation={() => setIsSimulating(true)}
          onStopSimulation={() => setIsSimulating(false)}
          onConnectSerial={connectSerialPort}
          onDisconnectSerial={disconnectSerialPort}
          onExportCSV={handleExportCSV}
          onExportGraphPrint={handleExportGraphPrint}
          onResetPackets={handleResetPackets}
          onSyncTime={handleSyncTime}
          onBaudRateChange={handleBaudRateChange}
        />

        {/* Dynamic Mission State Ribbon */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">FLIGHT STATE RATIO:</span>
            <div className="flex bg-slate-950 px-2.5 py-1 rounded border border-slate-850 gap-2 items-center">
              <span className={`h-2 w-2 rounded-full ${
                isSimulating || isSerialConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
              }`}></span>
              <span className="font-bold text-slate-200">
                {current ? current.state : "PRE_LAUNCH / STDBY"}
              </span>
            </div>
          </div>

          <div className="flex gap-4 text-slate-400 text-[11px] items-center">
            <div>
              <span>ALTITUDE: </span> 
              <span className="text-cyan-400 font-bold">{current ? current.altitude.toFixed(1) : "---.-"} m</span>
            </div>
            <div>
              <span>VELOCITY: </span> 
              <span className="text-rose-400 font-bold">{current ? current.descentRate.toFixed(1) : "---.-"} m/s</span>
            </div>
            <div>
              <span>GPS COORDINATES: </span> 
              <span className="text-emerald-400 font-bold">
                {current ? `${current.gpsLat.toFixed(4)}, ${current.gpsLng.toFixed(4)}` : "AWAITING FIX"}
              </span>
            </div>
          </div>
        </div>

        {/* PRIMARY BENTO GRID OPERATIONS DASHBOARD */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
          
          {/* COLUMN 1: Telemetry Instrument Display Panels */}
          <div className="xl:col-span-2 space-y-3.5 lg:block flex-col">
            
            {/* Live Numerical Readouts & Error Code Decoders */}
            <TelemetryDisplay current={current} />

            {/* Live Real-time Trend Graph Analyzer */}
            <div className="h-[360px] xl:h-[410px]">
              <RealTimeGraphs history={history} maxEntries={40} />
            </div>

            {/* COM logs text output terminal */}
            <div>
              <TelemetryConsole history={history} />
            </div>
          </div>

          {/* COLUMN 2: Spatial Navigation coordinates, Uplink and Optics down-links */}
          <div className="space-y-3.5 flex flex-col justify-between">
            
            {/* Live Payload GPS Map view */}
            <div className="h-[280px] xl:h-[350px]">
              <TrackingMap
                latitude={current ? current.gpsLat : LAUNCHPAD_LAT}
                longitude={current ? current.gpsLng : LAUNCHPAD_LNG}
                altitude={current ? current.gpsAlt : 0}
                gpsSats={current ? current.gpsSats : 0}
                history={mapHistory}
                waypoints={waypoints}
                descentRate={current ? current.descentRate : 0}
              />
            </div>

            {/* Satellite Gyroscopic Yaw, Pitch, Roll model tracker */}
            <div className="flex-1">
              <OrientationVisualization
                pitch={current ? current.pitch : 0}
                roll={current ? current.roll : 0}
                yaw={current ? current.yaw : 0}
                isStreaming={isSimulating || isSerialConnected}
              />
            </div>

            {/* Payload Separation/Parachute Critical Uplink controls */}
            <div>
              <MissionControlPanel
                onManualSeparation={executeManualSeparation}
                onDeployParachute={executeDeployParachute}
                onRedundantActivation={executeRedundantActivation}
                isStreaming={isSerialConnected}
                isSimulating={isSimulating}
                state={current ? current.state : "PRE_LAUNCH"}
              />
            </div>

            {/* Live optical camera downlink */}
            <div>
              <VideoStream
                isSeparated={current ? current.state !== "PRE_LAUNCH" && current.state !== "ASCENT" : false}
                state={current ? current.state : "PRE_LAUNCH"}
                current={current}
              />
            </div>
          </div>

        </div>

        {/* Dynamic High-End Mission Analytics Section */}
        <div className="mt-3.5">
          <MissionAnalytics
            history={history}
            current={current}
            waypoints={waypoints}
            onUpdateWaypoints={setWaypoints}
          />
        </div>
      </main>

      {/* Professional low-contrast footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 mt-auto">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[9px] text-slate-500 tracking-wider">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>GROUND LOGISTICS CORE LINKED - CANSAT GCS MISSION DEPLOYMENT STATION</span>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-slate-600 font-bold uppercase text-[8px]">ENGINEER:</span>
              <span className="font-sans font-bold text-[9.5px] text-cyan-400 uppercase tracking-widest">
                ARUNIMA DUTTA
              </span>
            </div>
          </div>
          <div>
            <span>SYSTEM UTC SECURE: {new Date().toISOString()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
