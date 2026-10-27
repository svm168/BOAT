# BOAT — Bicycle Ownership and Address Tag

Campus bicycle plates with two jobs:

1. **Ownership (NFC, no app)** — tap an NTAG215 sticker, browser opens `/bike/<id>`, owner details and a one-tap GPS report.
2. **Address (BLE + community phones)** — ESP32-C3 broadcasts a short iBeacon; phones will later POST GPS to TiDB. The owner map already reads `ORDER BY recorded_at DESC LIMIT 1`.

This repository currently contains the **complete Next.js web app**, **TiDB schema**, and **ESP32-C3 firmware**. Flutter is intentionally not included yet.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- API routes in the same Next.js app
- TiDB (MySQL protocol) via `mysql2`
- Leaflet map loaded with `ssr: false` so it never runs on the server
- ESP32-C3 Arduino iBeacon with ~100 ms advertise / 2.5 s deep sleep

## Quick start

Follow **[SETUP.md](./SETUP.md)** from the top. Short version once tools exist:

```powershell
cd "C:\Users\Krrish Agarwal\boat"
npm install
copy .env.example .env.local
# fill DATABASE_URL and JWT_SECRET, run db/schema.sql in TiDB
npm run dev
```

Open http://localhost:3000

## How location writes work

`POST /api/location` inserts into `location_reports` immediately. There is no server-side distance filter and no requirement that the bike is marked missing.

Identification (one of):

- `{ publicId, lat, lng, source: "web" }` — NFC / browser report
- `{ beaconUuid, beaconMajor, beaconMinor, lat, lng, source: "ble" }` — future Flutter scanner

## Hardware in this design

| Part | Used now |
| --- | --- |
| NTAG215 stickers | Yes — URL record to `/bike/<id>` |
| ESP32-C3 | Yes — iBeacon firmware |
| 2000 mAh LiPo | After USB flashing works |
| RP2040-Zero, JDY-29, PN532, supercap, zeners, 800 mAh pack | Unused unless we hit a hardware dead-end |

## Repo layout

```
app/           Next.js pages and API
components/    Map, NFC report button, auth forms
db/schema.sql  TiDB tables
firmware/      ESP32-C3 sketch
lib/           db, auth, queries
```
