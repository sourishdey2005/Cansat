/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelemetryData {
  teamId: string;
  packetCount: number;
  missionTime: string; // Elapsed time or UTC
  
  // Container Sensors
  altitude: number;      // meters
  pressure: number;      // Pascal or kPa
  temp: number;          // Celsius
  voltage: number;       // Volts
  
  // Payload GPS & Navigation
  gpsLat: number;
  gpsLng: number;
  gpsAlt: number;
  gpsSats: number;
  
  // Orientation
  pitch: number;         // degrees
  roll: number;          // degrees
  yaw: number;           // degrees
  
  // Descent
  descentRate: number;   // m/s
  
  // Mission States
  state: "PRE_LAUNCH" | "ASCENT" | "SEPARATED" | "DESCENT" | "PARACHUTE_DEPLOYED" | "LANDED";
  
  // Error state components
  descentRateFault: boolean;   // Digit 1: descent rate is outside 8-10 m/s (when descending)
  gpsUnavailable: boolean;      // Digit 2: GPS data unavailable
  separationFailure: boolean;   // Digit 3: Payload separation failure
  parachuteActive: boolean;     // Digit 4: Parachute active
  
  // Raw string for debugging logs
  rawPacket: string;
  timestamp: Date;
}

export interface MissionStats {
  maxAltitude: number;
  maxSpeed: number;
  uptime: number; // in seconds
  signalStrength: number; // dBm or percentage
  vibration: number; // Gs
}

export interface ControlCommand {
  id: string;
  name: string;
  status: "PENDING" | "EXECUTED" | "FAILED" | "IDLE";
  timestamp?: string;
  type: "CRITICAL" | "STANDARD";
}
