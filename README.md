# CanSat Ground Control Station

An aerospace-grade Ground Control Station (GCS) telemetry dashboard for visualizing and commanding simulated CanSat/CubeSat payloads.

---

## 🛰️ Overview

The **CanSat Ground Control Station** is a highly interactive, real-time telemetry dashboard designed for avionics monitoring. It delivers full spatial positioning, 3D orientation rendering, simulated payload video streaming with strict sensor security constraints, dynamic flight charts, and safety-critical failure diagnostics.

## 🛠️ The Tech Stack

- **Framework:** React 19 + TypeScript (Vite bundler)
- **Styling:** Tailwind CSS v4 (Aerospace Slate custom UI theme)
- **3D Visualization:** Three.js + WebGL (hardware-accelerated live orientation rendering)
- **Dynamic Maps:** Leaflet.js + OpenStreetMap (flight trajectory plotting)
- **Data Analytics:** Recharts + CSV Logging Engines
- **Hardware Integrations:** MediaDevices Camera Capture API

---

## 🌟 Key Features

1. **Real-time Telemetry Grid:** Monitored sensor parameters including Altitude, Temperature, Pressure, Battery Voltage, Vertical Descent Velocity, and multi-satellite GPS telemetry.
2. **Dynamic Projected Landing Zone (PLZ):** Real-time spatial drift modeling that calculates remaining flight times and maps an uncertainty radius circle (scales down to high-precision emerald marker upon touchdown).
3. **Responsive 3D Attitude Simulator:** Real-time pitch, roll, and yaw representation on simulated satellite models using WebGL.
4. **Onboard Video Stream & Consent Gates:** Secure hardware linkage requesting camera use permissions with simulated fallback options.
5. **Uplink Command & Control (CD&H):** Manual sequence triggers for payload separations, ejectors, and recovery parachutes.
6. **Unified Error-Registry:** Binary-encoded status checking register auditing sensor anomalies.

---

## 📘 Comprehensive Documentation

For a highly detailed technical breakdown, testing summaries, architecture layouts, design philosophy, and scientific formulas (such as Haversine distance calculations and projected landing rate estimators), please refer to the main project report:

👉 **[Exhaustive Project Report (PROJECT_REPORT.md)](./PROJECT_REPORT.md)**

---

## 🚀 Development Quickstart

To run the Ground Control Station locally:

```bash
# Install package dependencies
npm install

# Start local server to bind on port 3000
npm run dev
```
