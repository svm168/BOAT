import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const rows = await query<Array<{ id: number; password_hash: string }>>(
    "SELECT id, password_hash FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
