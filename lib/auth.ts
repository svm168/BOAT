import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
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

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!uid) return null;
    const rows = await query<User[]>(
      "SELECT id, email, display_name, phone, hostel, room FROM users WHERE id = ? LIMIT 1",
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
