import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBikeForOwner, getActiveMissingReport, latestLocation, locationTrail } from "@/lib/bikes";
import { query } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const bike = await getBikeForOwner(Number(id), user.id);
  if (!bike) return NextResponse.json({ error: "Bike not found." }, { status: 404 });

  const [last, trail, activeMissing] = await Promise.all([
    latestLocation(bike.id),
    locationTrail(bike.id),
    getActiveMissingReport(bike.id),
  ]);

  return NextResponse.json({
    bike,
    lastLocation: last,
    trail: trail.reverse(),
    activeMissingReport: activeMissing,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const bike = await getBikeForOwner(Number(id), user.id);
  if (!bike) return NextResponse.json({ error: "Bike not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const status = body.status === "missing" ? "missing" : body.status === "active" ? "active" : null;
  if (!status) {
    return NextResponse.json({ error: "Status must be active or missing." }, { status: 400 });
  }

  // Idempotency / Unique Entry check:
  // Strictly enforce only one active missing entry per unique bicycle at any time.
  const activeReport = await getActiveMissingReport(bike.id);

  if (status === "missing") {
    if (bike.status === "missing" || activeReport) {
      return NextResponse.json(
        {
          error: "An active missing entry already exists for this bicycle.",
          alreadyMissing: true,
          status: "missing",
        },
        { status: 409 }
      );
    }

    // Insert active missing record and update bike status
    const note = body.notes ? String(body.notes).slice(0, 255) : null;
    await query(
      "INSERT INTO missing_reports (bike_id, status, notes) VALUES (?, 'active', ?)",
      [bike.id, note]
    );
    await query("UPDATE bikes SET status = 'missing' WHERE id = ?", [bike.id]);

    return NextResponse.json({
      ok: true,
      status: "missing",
      message: "Bicycle reported as missing successfully.",
    });
  }

  if (status === "active") {
    // Resolve any active missing entry
    await query(
      "UPDATE missing_reports SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE bike_id = ? AND status = 'active'",
      [bike.id]
    );
    await query("UPDATE bikes SET status = 'active' WHERE id = ?", [bike.id]);

    return NextResponse.json({
      ok: true,
      status: "active",
      message: "Bicycle marked as found and active.",
    });
  }

  return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
}
