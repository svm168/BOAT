import { query } from "./db";
import type { Bike, LocationReport, MissingReport, PublicBike } from "./types";

export async function listBikesForOwner(ownerId: number) {
  return query<Bike[]>(
    `SELECT id, owner_id, public_id, name, color, model, COALESCE(tag_id, '') AS tag_id, status,
            beacon_uuid, beacon_major, beacon_minor, created_at
     FROM bikes WHERE owner_id = ? ORDER BY created_at DESC`,
    [ownerId]
  );
}

export async function getBikeByPublicId(publicId: string) {
  const rows = await query<Bike[]>(
    `SELECT id, owner_id, public_id, name, color, model, COALESCE(tag_id, '') AS tag_id, status,
            beacon_uuid, beacon_major, beacon_minor, created_at
     FROM bikes WHERE public_id = ? LIMIT 1`,
    [publicId]
  );
  return rows[0] ?? null;
}

export async function getBikeByTagId(tagId: string) {
  const rows = await query<Bike[]>(
    `SELECT id, owner_id, public_id, name, color, model, COALESCE(tag_id, '') AS tag_id, status,
            beacon_uuid, beacon_major, beacon_minor, created_at
     FROM bikes WHERE LOWER(tag_id) = LOWER(?) LIMIT 1`,
    [tagId.trim()]
  );
  return rows[0] ?? null;
}

export async function getBikeForOwner(id: number, ownerId: number) {
  const rows = await query<Bike[]>(
    `SELECT id, owner_id, public_id, name, color, model, COALESCE(tag_id, '') AS tag_id, status,
            beacon_uuid, beacon_major, beacon_minor, created_at
     FROM bikes WHERE id = ? AND owner_id = ? LIMIT 1`,
    [id, ownerId]
  );
  return rows[0] ?? null;
}

export async function getActiveMissingReport(bikeId: number) {
  const rows = await query<MissingReport[]>(
    `SELECT id, bike_id, status, reported_at, resolved_at, notes
     FROM missing_reports
     WHERE bike_id = ? AND status = 'active'
     ORDER BY reported_at DESC
     LIMIT 1`,
    [bikeId]
  );
  return rows[0] ?? null;
}

export async function latestLocation(bikeId: number) {
  const rows = await query<LocationReport[]>(
    `SELECT id, bike_id, lat, lng, accuracy_m, source, reporter_note, recorded_at
     FROM location_reports
     WHERE bike_id = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [bikeId]
  );
  return rows[0] ?? null;
}

export async function locationTrail(bikeId: number, limit = 200) {
  return query<LocationReport[]>(
    `SELECT id, bike_id, lat, lng, accuracy_m, source, reporter_note, recorded_at
     FROM location_reports
     WHERE bike_id = ?
     ORDER BY recorded_at DESC
     LIMIT ?`,
    [bikeId, limit]
  );
}

export async function nextBeaconMinor() {
  const rows = await query<Array<{ next_minor: number }>>(
    "SELECT COALESCE(MAX(beacon_minor), 0) + 1 AS next_minor FROM bikes"
  );
  return Number(rows[0]?.next_minor ?? 1);
}

export async function getPublicBike(publicId: string): Promise<PublicBike | null> {
  const rows = await query<
    Array<{
      public_id: string;
      name: string;
      color: string | null;
      model: string | null;
      tag_id: string | null;
      status: "active" | "missing";
      display_name: string;
      phone: string | null;
      hostel: string | null;
      room: string | null;
      lat: number | null;
      lng: number | null;
      accuracy_m: number | null;
      source: "web" | "ble" | "rfid" | "manual" | null;
      recorded_at: string | null;
      email: string;
      created_at: string;
    }>
  >(
    `WITH LatestLocations AS (
       SELECT bike_id, lat, lng, accuracy_m, source, recorded_at,
              ROW_NUMBER() OVER(PARTITION BY bike_id ORDER BY recorded_at DESC) as rn
       FROM location_reports
     )
     SELECT b.public_id, b.name, b.color, b.model, b.tag_id, b.status, b.created_at,
            u.email, u.display_name, u.phone, u.hostel, u.room,
            r.lat, r.lng, r.accuracy_m, r.source, r.recorded_at
     FROM bikes b
     JOIN users u ON u.id = b.owner_id
     LEFT JOIN LatestLocations r ON b.id = r.bike_id AND r.rn = 1
     WHERE b.public_id = ?
     LIMIT 1`,
    [publicId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    publicId: row.public_id,
    name: row.name,
    color: row.color,
    model: row.model,
    tagId: row.tag_id ?? "",
    status: row.status,
    registeredAt: row.created_at,
    owner: {
      displayName: row.display_name,
      phone: row.phone,
      hostel: row.hostel,
      room: row.room,
      email: row.email,
    },
    lastLocation:
      row.lat != null && row.lng != null && row.recorded_at
        ? {
            lat: Number(row.lat),
            lng: Number(row.lng),
            accuracyM: row.accuracy_m,
            source: row.source ?? "web",
            recordedAt: row.recorded_at,
          }
        : null,
  };
}

export async function findBikeByBeacon(
  uuid: string,
  major: number,
  minor: number
) {
  const rows = await query<Bike[]>(
    `SELECT id, owner_id, public_id, name, color, model, COALESCE(tag_id, '') AS tag_id, status,
            beacon_uuid, beacon_major, beacon_minor, created_at
     FROM bikes
     WHERE beacon_uuid = ? AND beacon_major = ? AND beacon_minor = ?
     LIMIT 1`,
    [uuid.toLowerCase(), major, minor]
  );
  return rows[0] ?? null;
}