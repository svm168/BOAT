import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
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

  const token = await createSession(user.id);
  const userRows = await query<User[]>(
    "SELECT id, email, display_name, phone, hostel, room FROM users WHERE id = ? LIMIT 1",
    [user.id]
  );

  return NextResponse.json({
    ok: true,
    token,
    user: userRows[0] ?? null,
  });
}
