/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// GPS starting coordinates, e.g. Kennedy Space Center (Cape Canaveral)
export const LAUNCHPAD_LAT = 28.5721;
export const LAUNCHPAD_LNG = -80.6480;

export const GPS_BOUNDS = {
  minLat: 28.5000,
  maxLat: 28.6000,
  minLng: -80.7000,
  maxLng: -80.6000,
};

export const SPACEX_THEME_COLORS = {
  bgSlate950: "#020617",
  borderCyan500: "#06b6d4",
  textSlate400: "#94a3b8",
};

// Converts Yaw, Pitch, Roll to directional unit vectors or rotation matrices for coordinate spaces
export function getRotationMatrix(pitch: number, roll: number, yaw: number) {
  const p = (pitch * Math.PI) / 180;
  const r = (roll * Math.PI) / 180;
  const y = (yaw * Math.PI) / 180;

  // Rotation matrix component conversions
  const cosP = Math.cos(p);
  const sinP = Math.sin(p);
  const cosR = Math.cos(r);
  const sinR = Math.sin(r);
  const cosY = Math.cos(y);
  const sinY = Math.sin(y);

  return {
    r11: cosY * cosP,
    r12: cosY * sinP * sinR - sinY * cosR,
    r13: cosY * sinP * cosR + sinY * sinR,
    r21: sinY * cosP,
    r22: sinY * sinP * sinR + cosY * cosR,
    r23: sinY * sinP * cosR - cosY * sinR,
    r31: -sinP,
    r32: cosP * sinR,
    r33: cosP * cosR,
  };
}
