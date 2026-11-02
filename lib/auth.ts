import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "./db";
import type { User } from "./types";
import { randomInt } from "crypto";

const COOKIE = "boat_session";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 16) {
    throw new Error("JWT_SECRET must be set to a long random string in .env.local");
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: number): Promise<string> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());

  try {
    const jar = await cookies();
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  } catch {}

  return token;
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(COOKIE);
  } catch {}
}

export async function getSessionUser(): Promise<User | null> {
  let token: string | undefined;

  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  } catch {}

  if (!token) {
    try {
      const jar = await cookies();
      token = jar.get(COOKIE)?.value;
    } catch {}
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!uid) return null;
    const rows = await query<User[]>(
      "SELECT id, email, display_name, enrollment_id, phone, hostel, room FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export function publicIdFromRandom() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}
