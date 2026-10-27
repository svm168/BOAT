import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasJwt = Boolean(process.env.JWT_SECRET);

  if (!hasDb || !hasJwt) {
    return NextResponse.json(
      {
        ok: false,
        database: hasDb ? "configured" : "missing DATABASE_URL",
        auth: hasJwt ? "configured" : "missing JWT_SECRET",
      },
      { status: 503 }
    );
  }

  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json(
      { ok: false, database: "error", message },
      { status: 503 }
    );
  }
}
