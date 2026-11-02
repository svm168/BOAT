import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim();
  const enrollmentId = String(body.enrollmentId ?? body.enrollment_id ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const hostel = String(body.hostel ?? "").trim() || null;
  const room = String(body.room ?? "").trim() || null;

  const iitrEmailRegex = /^[^\s@]+@([a-zA-Z0-9-]+\.)*iitr\.ac\.in$/i;
  if (!iitrEmailRegex.test(email)) {
    return NextResponse.json(
      { error: "Email must belong to the .iitr.ac.in domain." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (displayName.length < 2) {
    return NextResponse.json(
      { error: "Please enter your full name." },
      { status: 400 }
    );
  }

  if (!enrollmentId) {
    return NextResponse.json(
      { error: "Enrollment No. / Faculty ID / Employee ID is required." },
      { status: 400 }
    );
  }

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 }
    );
  }

  const existingEmail = await query<Array<{ id: number }>>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  if (existingEmail[0]) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const existingEnrollment = await query<Array<{ id: number }>>(
    "SELECT id FROM users WHERE enrollment_id = ? LIMIT 1",
    [enrollmentId]
  );
  if (existingEnrollment[0]) {
    return NextResponse.json(
      { error: "An account with that Enrollment No. / ID already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const result = await query<ResultSetHeader>(
    `INSERT INTO users (email, password_hash, display_name, enrollment_id, phone, hostel, room)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, displayName, enrollmentId, phone, hostel, room]
  );

  const token = await createSession(result.insertId);
  const userRows = await query<User[]>(
    "SELECT id, email, display_name, enrollment_id, phone, hostel, room FROM users WHERE id = ? LIMIT 1",
    [result.insertId]
  );

  return NextResponse.json({
    ok: true,
    token,
    user: userRows[0] ?? null,
  });
}
