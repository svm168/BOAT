import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim();
  const phone = String(body.phone ?? "").trim() || null;
  const hostel = String(body.hostel ?? "").trim() || null;
  const room = String(body.room ?? "").trim() || null;

  if (!email.includes("@") || password.length < 8 || displayName.length < 2) {
    return NextResponse.json(
      {
        error:
          "Need a valid email, a password of at least 8 characters, and your name.",
      },
      { status: 400 }
    );
  }

  const existing = await query<Array<{ id: number }>>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  if (existing[0]) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const result = await query<ResultSetHeader>(
    `INSERT INTO users (email, password_hash, display_name, phone, hostel, room)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, displayName, phone, hostel, room]
  );

  await createSession(result.insertId);
  return NextResponse.json({ ok: true });
}
