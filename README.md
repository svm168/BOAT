<div align="center">

# 🚲 BOAT - Bicycle Ownership and Address Tag

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/TiDB-Serverless-orange?style=for-the-badge&logo=mysql)](https://tidbcloud.com)
[![Deployment](https://img.shields.io/badge/Hosted_on-Vercel-black?style=for-the-badge&logo=vercel)](https://boat-eight-lemon.vercel.app)

<p align="center">
  <b>A smart campus bicycle ownership verification and decentralized BLE tracking mesh.</b>
</p>

[🌐 Live Web Portal](https://boat-eight-lemon.vercel.app) • [📱 Mobile App Repository](https://github.com/svm168/BOAT_flutter_application) • [⚡ Firmware Utilities](./firmware)

</div>

---

## 📌 Overview

**BOAT** combines physical NFC identification plates with low-power Bluetooth Low Energy (BLE) microcontrollers and community mesh scanning to solve campus bicycle management:

1. **Ownership (Physical NFC Tap — Zero App Required)**:
   - Anyone finding a parked, unattended, or lost bicycle taps the physical NTAG215 plate on the bike frame using any modern smartphone (iOS or Android).
   - The device immediately resolves to `https://boat-eight-lemon.vercel.app/bike/<publicId>`, displaying authorized owner details (name, contact number, department) and offering a 1-tap anonymous location report.

2. **Address & Passive Tracking (Decentralized Mesh)**:
   - An onboard **ESP32-C3** microcontroller broadcasts periodic, non-connectable Apple-standard iBeacon advertisement pulses.
   - Community smartphones running the companion BOAT mobile app (or stationary campus gate scanners) passively detect nearby beacons, attach current coordinates, and transmit updates to the cloud.
   - Owners can inspect their bicycle's live coordinates, view recent sightings, and navigate using road-following pedestrian routing.

---

## 🏗️ System Architecture

```
                               ┌────────────────────────────────┐
                               │  Campus Bicycle Hardware       │
                               │  - NTAG215 NFC NDEF Plate      │
                               │  - ESP32-C3 BLE Beacon         │
                               └──────────────┬─────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        Physical Smartphone Tap                              Passive BLE Broadcast
          (No App Required)                                (Community App / Gateways)
                     │                                                 │
                     ▼                                                 ▼
       Browser opens /bike/[publicId]                        POST /api/location
                     │                                                 │
                     └────────────────────────┬────────────────────────┘
                                              ▼
                             ┌──────────────────────────────────┐
                             │    BOAT Full-Stack Cloud API     │
                             │  (Next.js 15 + TiDB Serverless)  │
                             └────────────────┬─────────────────┘
                                              ▼
                             ┌──────────────────────────────────┐
                             │       User Dashboard & Map       │
                             │  - Real-time location marker     │
                             │  - Road-following shortest path  │
                             │  - Sighting telemetry history    │
                             └──────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org)
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [Lucide Icons](https://lucide.dev)
- **Database**: [TiDB Cloud](https://tidbcloud.com) (Serverless MySQL protocol) via `mysql2`
- **Mapping & Routing**: [Leaflet](https://leafletjs.com) + OpenStreetMap & OSRM routing engine
- **Authentication**: Stateless JWT session tokens with HTTP-only cookies and Bearer header support
- **Hardware & Firmware**: Arduino C++ for ESP32 / ESP32-C3 and RC522 RFID/NFC transceivers

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org) (v18.18 or higher)
- [Git](https://git-scm.com)
- A MySQL or TiDB database instance

### 1. Clone & Install
```bash
git clone https://github.com/svm168/boat.git
cd boat
npm install
```

### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env.local
```
Fill in your database credentials and secret key:
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/boat?ssl={\"rejectUnauthorized\":true}"
JWT_SECRET="your-secure-random-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CAMPUS_LAT="29.8649"
NEXT_PUBLIC_CAMPUS_LNG="77.8966"
NEXT_PUBLIC_CAMPUS_NAME="University Campus"
NEXT_PUBLIC_BEACON_UUID="f7826da6-4fa2-4e98-8024-bc5b71e0893e"
```

### 3. Initialize Database Schema
Execute the SQL DDL statements located in `db/schema.sql` against your TiDB/MySQL database to create the required tables:
- `users`
- `bikes`
- `missing_reports`
- `location_reports`

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health probe & TiDB connection verification |
| `POST` | `/api/auth/register` | Register new user account (returns JWT token) |
| `POST` | `/api/auth/login` | Authenticate with Email / Enrollment ID + Password |
| `GET` | `/api/auth/me` | Fetch active authenticated session user profile |
| `POST` | `/api/auth/logout` | Clear session authentication cookie |
| `GET` | `/api/bikes` | Retrieve authenticated user's bicycles & latest fixes |
| `POST` | `/api/bikes` | Register a new bicycle and allocate hardware identifiers |
| `GET` | `/api/bikes/[id]` | Bicycle profile, sighting breadcrumbs, and active reports |
| `PATCH` | `/api/bikes/[id]` | Toggle bicycle status (`active` / `missing`) |
| `POST` | `/api/location` | Ingestion endpoint for community BLE, NFC, & gateway fixes |
| `GET` | `/api/public/bikes/[publicId]` | Public data endpoint for NFC sticker taps |

---

## 🔌 Hardware & Firmware Utilities

All hardware source code is located in the [`firmware/`](./firmware) directory:

- **`firmware/nfc_ndef_flasher/`**: Writes standardized NFC Forum Type 2 NDEF URI records onto NTAG215 stickers.
- **`firmware/boat_ibeacon.ino`**: Ultra-low-power ESP32-C3 firmware broadcasting BLE iBeacon pulses with deep sleep duty-cycling.
- **`firmware/esp32_rfid_ble_scanner/`**: Stationary campus gateway sketch connecting to Wi-Fi to push RFID and BLE scans directly to the cloud.
- **`firmware/rfid_uid_reader/`**: Serial diagnostic utility to detect and verify raw RFID/NFC tag UIDs.

Refer to the [Firmware Guide](./firmware/README.md) for full pinout diagrams, Arduino IDE instructions, and flashing procedures.

---

## 📁 Repository Layout

```
├── app/               # Next.js 15 App Router pages, layouts, and API routes
├── components/        # Reusable UI components (Interactive map, navigation, modals)
├── db/                # SQL schema definitions and migrations
├── firmware/          # ESP32 and ESP32-C3 Arduino firmware utilities
├── lib/               # Database client, auth utilities, campus config, and queries
├── public/            # Static assets and iconography
└── .env.example       # Example environment configuration template
```
