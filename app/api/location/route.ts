import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { query } from "@/lib/db";
import { findBikeByBeacon, getBikeByPublicId, getBikeByTagId } from "@/lib/bikes";

/**
 * Direct ingestion for location reports from:
 * 1. Community web scans (NFC tap on phone -> GPS report)
 * 2. ESP32 BLE scanners (BLE MAC / iBeacon pulse detected)
 * 3. ESP32 RFID gate / stand scanners (RFID / NFC UID scanned)
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracyM = body.accuracyM == null ? null : Number(body.accuracyM);

  const rawSource = String(body.source ?? "web").toLowerCase();
  const source =
    rawSource === "ble" || rawSource === "rfid" || rawSource === "manual" || rawSource === "web"
      ? rawSource
      : "web";

  let note = body.note ? String(body.note).slice(0, 255) : null;
  const scannerId = body.scannerId || body.scanner_id;
  if (scannerId && !note) {
    note = `Scanner: ${String(scannerId).slice(0, 60)}`;
  } else if (scannerId && note) {
    note = `[${String(scannerId).slice(0, 40)}] ${note}`.slice(0, 255);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required and must be valid numbers." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Coordinates are out of valid GPS range." }, { status: 400 });
  }

  let bikeId: number | null = null;

  if (body.publicId) {
    const bike = await getBikeByPublicId(String(body.publicId).trim().toLowerCase());
    bikeId = bike?.id ?? null;
  } else if (body.tagId || body.tag_id || body.rfidUid || body.rfid_uid || body.bleMac || body.ble_mac) {
    const tag = String(body.tagId || body.tag_id || body.rfidUid || body.rfid_uid || body.bleMac || body.ble_mac).trim();
    const bike = await getBikeByTagId(tag);
    bikeId = bike?.id ?? null;
  } else if (body.beaconUuid != null && body.beaconMinor != null) {
    const bike = await findBikeByBeacon(
      String(body.beaconUuid),
      Number(body.beaconMajor ?? 1),
      Number(body.beaconMinor)
    );
    bikeId = bike?.id ?? null;
  } else if (body.bikeId) {
    bikeId = Number(body.bikeId);
  }

  if (!bikeId) {
    return NextResponse.json(
      { error: "Unknown bicycle tag or identification. Provide publicId, tagId, or beacon identifiers." },
      { status: 404 }
    );
  }

  await query<ResultSetHeader>(
    `INSERT INTO location_reports (bike_id, lat, lng, accuracy_m, source, reporter_note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bikeId, lat, lng, accuracyM, source, note]
  );

  return NextResponse.json({
    ok: true,
    bikeId,
    location: { lat, lng, source, recordedAt: new Date().toISOString() },
  });
}
