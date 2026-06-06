# CanSat Ground Control Station Dashboard
### Real-Time Aerospace Telemetry Monitoring System

**Submitted By:** Arunima Dutta
**Project Domain:** Aerospace Engineering / Embedded Systems / Avionics  
**Project Type:** Real-Time Ground Control Software Simulation  

---

## Technical Stack & Architecture

The application is built upon a high-performance, modern, full-stack reactive architecture using:

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 & Vite** | Component-driven reactivity, fast state synchronization, and high-frequency UI rendering pipeline. |
| **Styling Module** | **Tailwind CSS v4** | Hardware-accelerated layouts, fluid custom grids, and unified aerospace aesthetic palette. |
| **3D Rendering** | **Three.js & WebGL** | Real-time 3D simulation of the CanSat's physical rotation (pitch, yaw, roll). |
| **Mapping Engine** | **Leaflet.js & OpenStreetMap** | Interactive dynamic path-tracking, real-time waypoint rendering, and live Projected Landing Zone calculations. |
| **Telemetry Analytics** | **Recharts & HTML5 Canvas** | Multi-channel sensor logs, altitude graphs, and low-latency audio/tactical telemetry visualizers. |
| **Media Operations** | **HTML5 MediaDevices API** | Local webcam feed capture with hardware detection and permission enforcement. |
| **Animation Engine** | **motion/react (Framer Motion)** | Fluid state transition, card entrance animations, and dynamic ticker alerts. |
| **Icons Library** | **Lucide React** | Consistent, high-fidelity vector HUD display symbols. |

---

## 1. Abstract

The **CanSat Ground Control Station Dashboard** is a real-time aerospace telemetry simulation system designed to monitor, analyze, and visualize critical telemetry parameters during CanSat and CubeSat launch, descent, and landing phases. The GCS platform processes multi-channel telemetry streams containing altitude, pressure, environmental temperature, descent rate, multi-axis orientation (pitch, yaw, roll), GPS positioning, battery chemistry conditions, and localized warning codes.

By integrating state-of-the-art browser engines—including Leaflet coordinate mapping, Three.js WebGL rendering, and Recharts vectors—this ground station demonstrates critical avionics features such as:
1. **Dynamic Ascent & Descent Charting:** Low-latency historical line logging.
2. **Projected Landing Zone (PLZ):** Real-time mathematical error estimation mapping.
3. **Onboard Video Stream Emulation:** Direct webcam hardware projection with built-in consent protection overlays.
4. **4-Digit Binary Fault Detection System:** Automated telemetry audit checks.
5. **CSV Telemetry Data Export:** Structured Blob logs for post-mission data review.

---

## 2. Introduction

A **CanSat** is a miniature satellite system designed to simulate the working principles of spacebound projects within a rigid, soda-can-sized cylindrical container (typically 115mm height, 66mm diameter). Widely utilized in engineering education, CanSat competitions model real flight operations, environmental sensor payload parsing, communication protocols, and flight recovery sequences.

The **Ground Control Station (GCS)** acts as the central command node. It is responsible for:
- Receiving and processing remote packets transmitted over RF links (e.g., LoRa, XBee).
- Auditing avionics status and flight trajectory in real-time.
- Visualizing vertical and lateral drift velocity states.
- Issuing critical manual commands (e.g., payload release, parachute deployment) to optimize secondary mission sequences.

This system provides a high-fidelity simulation of an aerospace command deck, implementing critical subsystems such as interactive mapping, orientation tracking, and hardware-integrated camera diagnostics.

---

## 3. Interface Layout Design

### Objective
To build an intuitive, aesthetic, single-page, multi-panel aerospace dashboard optimized for fast operator response times, minimum visual fatigue under dark-room environments, and exceptional data density.

### Background Knowledge & Standards
Aerospace interfaces must present safety-critical information without causing cognitive overload. To achieve this:
1. **Unified Grid Structure:** Layout is segmented using modular grids. Critical metrics appear in unified "Bento Box" cards.
2. **Chromatic Hierarchy:** High-contrast neutral bases (deep slates/charcoals) protect operator night vision, while bright neon feedback colors denote telemetry channels:
   - **Cyan (`#22d3ee`)**: Telemetry signals and normal data paths.
   - **Rose (`#f43f5e`)**: Fault codes, critical status, and emergency operations.
   - **Emerald (`#34d399`)**: Successful linkages, target status, and safe landing indicators.

### Interface Design Implementation
The system is implemented as a single-page aerospace layout utilizing Tailwind CSS Grid and Flexbox structures. It consists of the following components:

```
+------------------------------------------------------------------------+
|                      TOP CONTROL & COMMAND BAR                         |
+--------------------++----------------------------++--------------------+
|                    ||   TELEMETRY REALTIME CARDS ||   ORIENTATION     |
|   MISSION CONTROL  ||   - Altitude, Temp, Press  ||   3D VISUALIZER   |
|   COMMAND PANEL    ||   - Voltage, Descent Rate  ||   (Three.js/WebGL)|
|                    ||   - GPS Lat/Lng Coordinates||                   |
+--------------------++----------------------------++--------------------+
|                                                                        |
|                       GEOGRAPHICAL GPS TRACKING MAP                    |
|                        - Interactive Leaflet Plot                      |
|                        - Dynamic Projected Landing Zone Circle         |
|                        - Descent Site Stats Overlay                    |
|                                                                        |
+--------------------++----------------------------++--------------------+
|    ENVIRONMENTAL   ||    REAL-TIME GRAPH PLOTTER ||    LIVE VIDEO HUD |
|  ANOMALY RADAR /   ||    - Dynamic Altitude      ||    - Web Camera   |
|    LINT DECK       ||    - Dynamic Pressure      ||    - Consent Box  |
+--------------------++----------------------------++--------------------+
```

---

## 4. Top Control Bar

### Objective
Provides high-altitude operators with rapid, real-time command of telemetry streams, memory clear actions, and direct-flight CSV logging.

### Implementation Detail
The bar utilizes lightweight React state variables bound to simulation cycles:
- **START Telemetry:** Initiates high-frequency periodic telemetry updates.
- **STOP Telemetry:** Pauses data updates, allowing operators to analyze specific packet snapshots.
- **EXPORT CSV:** Consolidates state history arrays into standard comma-separated text files utilizing the browser **Blob API** for immediate file generation.
- **RESET Packets:** Standardizes state arrays back to zero to prepare for subsequent launch cycles.

---

## 5. Mission Control Panel

### Objective
Simulates direct uplink command logic (Command & Data Handling - CD&H) to trigger hardware actuators on the CanSat payload.

### Implementation Details
The dashboard exposes tactile controls simulating aerospace actions:
1. **Manual Payload Separation:** Simulates firing mechanical separation burn-wires or servos to detach the CanSat from the launch container.
2. **Emergency Parachute Deployment:** Releases the drag recovery canopy immediately to counteract unplanned high-velocity descents.
3. **Redundant Activation System:** Toggles back-up power tracks and secondary telemetry transmitters on the payload.

---

## 6. Telemetry Display System

### Objective
Processes raw telemetry streams and renders key environmental and electrical diagnostic metrics on interactive high-end dashboard readouts.

### Monitored Metrics
- **Altitude:** Computed barometrically from ambient air pressure, reporting simulated descent from 850m.
- **Temperature / Pressure:** Multi-sensor array readout for thermal-stratosphere diagnostics.
- **Battery Voltage:** Real-time electrical diagnostic metric showing depletion curve characteristics.
- **Vertical Descent Rate:** First-derivative vertical velocity tracking, crucial for assessing parachute effectiveness and structural integrity prior to impact.

---

## 7. Error Code System

### Objective
Implements a 4-digit binary aerospace status register representing the overall health of the craft in real-time.

```
       [ 0 ]             [ 0 ]               [ 0 ]                [ 0 ]
  Descent Fault       GPS Status       Separation Link     Parachute Status
```

### Fault Diagnostics Table
| Hex Value | Binary Representation | Active Subsystem Fault | Operator Action Required |
| :--- | :--- | :--- | :--- |
| `0x0` | `0000` | Normal Operation | None. Flight nominal. |
| `0x8` | `1000` | High Descent Velocity ($>12 \text{ m/s}$) | Alert recovery crew. Parachute deployment audit. |
| `0x4` | `0100` | GPS Satellites Loss ($<4 \text{ sats}$) | Check redundant track arrays. |
| `0x2` | `0010` | Payload Separator Interrupted | Execute emergency separation sequence manual override. |
| `0x1` | `0001` | Emergency Parachute Deployment | Affirm positive drag factor via ground tracking. |

---

## 8. Real-Time Graph System

### Objective
Generates instant spatial and physical regression trends to predict high-end flight path developments.

### Implementation Details
The system utilizes responsive **Recharts** charts. It renders altitude gradients, pressure gradients, and environmental changes sequentially against received historical data arrays.

---

## 9. GPS Tracking System & Projected Landing Zone

### Objective
Provides geographic tracking of the CanSat's trajectory and maps an uncertainty ellipse containing the live **Projected Landing Zone (PLZ)** based on real-time flight vectors.

### Core Tracking Mapping Features
The GPS Tracking module features a live Leaflet dynamic map layer with:
1. **Flight Path History Plotting:** Trace lines tracking historical coordinates of the descent vector.
2. **High-Precision Haversine Distance:** Dynamically displays the live direct spatial distance to the target launchpad coordinates:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
3. **Projected Landing Zone (PLZ) Dynamic Circle:**
   - Evaluates remaining descent duration: $t_{\text{remaining}} = \frac{\text{Altitude}}{\text{Descent Rate}}$.
   - Projects landing expansion radius reflecting standard wind-drift modeling ($3.2 \text{ m/s}$ drift factor):
     $$R_{\text{plz}} = (t_{\text{remaining}} \times 3.2\text{ m/s}) + 10\text{m reserve padding}$$
   - The boundary circle scales down dynamically as altitude decreases, concentrating on a high-precision target pin (Emerald success indicator, radius 5m) upon terminal touchdown.

---

## 10. Orientation Visualization System

### Objective
Uses WebGL acceleration to render the three-dimensional attitude (angles of rotation) of the CanSat payload.

### Telemetry Angle Map
- **Pitch:** Upward or downward orientation about the lateral axis.
- **Roll:** Rotational velocity around the longitudinal axis.
- **Yaw:** Compass heading about the vertical axis.

Three.js maps incoming raw IMU telemetry coordinates and updates a custom 3D cylinder model, allowing operators to visualize complex tumble profiles during supersonic launch phases.

---

## 11. Live Video Streaming & Consent System

### Objective
Provides onboard camera simulation by requesting permission to link to local computer webcam feeds and projecting real-time tactical telemetry overlays directly onto the video.

### Security & Consent Logic
Following safety and framework guidelines, the video stream implements strict hardware consent workflows:
1. **Consent Gate:** When the camera source is toggled, it triggers a custom full-frame UI overlay asking the user to authoritatively accept or deny webcam linkage.
2. **Hardware Request:** Upon authorization, the app interacts with `navigator.mediaDevices.getUserMedia()` to acquire the camera track.
3. **Safe Fallback:** If permission is denied or fails, the interface gracefully falls back to simulated drone views.

---

## 12. Data Management Features

The platform uses memory state arrays to build extensive, non-volatile telemetry histories. Clicking the **EXPORT CSV** button triggers a downloadable text stream containing headers and raw metadata fields format:

```csv
Packet_No,Mission_Time,Altitude,Temperature,Pressure,Battery,Descent_Rate,Lat,Lng,Pitch,Roll,Yaw,Error_Code
20,15:57:12,654.2,24.1,930.2,7.82,4.82,12.971561,77.594563,12,4,-28,1001
```

---

## 13. Testing Strategy and Results

Verification was executed via full developer tooling and lint evaluation:
- **Build Compilation:** Passed cleanly via `vite build` with standard React production outputs inside `dist/`.
- **Linter Auditing:** Completed with zero issues via `tsc --noEmit`.
- **Latency Testing:** Verified low-frequency CPU loads when simulating live 3D models and rendering Leaflet path vectors.

---

## 14. Challenges Faced & Optimized Resolutions

1. **Leaflet Container Sizing:** Fixed map rendering issues on resizing panels through the integration of standard `ResizeObserver` lifecycle watchers executing `map.invalidateSize()` dynamically.
2. **WebGL Coordinate Mappings:** Calibrated Three.js camera offsets to avoid frame clipping during extreme tumble phases.
3. **Camera Linkage Permission Overhead:** Created a localized React state latch (`hasConsent`) to decouple device-enumeration scans from active stream activation until the user clicks "Authorize".

---

## 15. Future Enhancements

- **Direct Hardware Ingestion:** Connect to real physical flight controllers using `navigator.serial` (Web Serial API).
- **Relational Backend Synchronization:** Connect with Cloud SQL or Firestore structures using secure OAuth layers to facilitate collaborative multi-operator missions.
- **Atmospheric Drift Vector Tuning:** Integrate live dynamic wind speed APIs to offset the Projected Landing Zone (PLZ) geographic center according to local meteorological currents.

---

## 16. Conclusion

The **CanSat Ground Control Station GCS App** successfully simulates spacebound mission command environments. By utilizing high-performance web systems (React, Tailwind, Three.js, Leaflet, Recharts), the dashboard ensures excellent data visibility, robust payload command simulations, dynamic Projected Landing Zone tracking, and a compliant, secure webcam observation feed. This project serves as a production-grade blueprint for advanced embedded avionic tracking.
