import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { getSessionUser, publicIdFromRandom } from "@/lib/auth";
import { query } from "@/lib/db";
import { campusBeaconUuid } from "@/lib/campus";
import { listBikesForOwner, latestLocation, nextBeaconMinor } from "@/lib/bikes";
import type { Bike } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const bikes = await listBikesForOwner(user.id);
  const bikesWithLastLocation = await Promise.all(
    bikes.map(async (bike) => {
      const last = await latestLocation(bike.id);
      return {
        ...bike,
        lastLocation: last || null,
      };
    })
  );
  return NextResponse.json({ bikes: bikesWithLastLocation });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "").trim() || null;
  const model = String(body.model ?? "").trim() || null;

  if (name.length < 2) {
    return NextResponse.json({ error: "Give the bicycle a name (at least 2 characters)." }, { status: 400 });
  }

  const uuid = campusBeaconUuid();

  // Retry if the random id (or beacon minor, in a race) collides.
  for (let attempt = 0; attempt < 5; attempt++) {
    const publicId = publicIdFromRandom();
    const tagId = `TAG-${publicId.toUpperCase()}`;
    const minor = await nextBeaconMinor();
    try {
      const result = await query<ResultSetHeader>(
        `INSERT INTO bikes (owner_id, public_id, name, color, model, tag_id, beacon_uuid, beacon_major, beacon_minor)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [user.id, publicId, name, color, model, tagId, uuid, minor]
      );
      return NextResponse.json({
        ok: true,
        bike: { id: result.insertId, publicId, tagId, beaconUuid: uuid, beaconMajor: 1, beaconMinor: minor },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "ER_DUP_ENTRY") continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "Could not generate a unique tag. Try again." }, { status: 500 });
}
