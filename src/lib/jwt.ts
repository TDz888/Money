/**
 * Edge-compatible JWT helpers. No Node-only imports.
 * Used by middleware (Edge runtime) and API routes.
 */

import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "auth-token";
const ALG = "HS256";

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set to a strong value (>=16 chars).");
  }
  return new TextEncoder().encode(secret);
}

export type JWTPayload = {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export async function signToken(payload: { sub: string; email: string; role: string }): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(expiresIn)
    .setSubject(payload.sub)
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
