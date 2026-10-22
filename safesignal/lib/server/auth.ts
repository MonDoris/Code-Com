// Server-side authorization for API routes. Every protected route calls requireUser():
// the token signature, issuer, expiry and authorized party (azp) are verified with the realm's
// public JWK from tidecloak.json, then roles are checked from the VERIFIED payload only.
// Frontend role checks are UX only; they are never trusted here.
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyTideCloakToken } from "@tidecloak/nextjs/server";
import type { TidecloakConfig } from "@tidecloak/nextjs/server";
import rawConfig from "../../tidecloak.json";
import { ROLE_REALM_ADMIN } from "../safesignal";

export const tcConfig = rawConfig as TidecloakConfig & Record<string, any>;

export type Claims = Record<string, any> & {
  sub?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

type AuthResult = { ok: true; claims: Claims } | { ok: false; res: NextResponse };

const deny = (status: 401 | 403 | 503, error: string): AuthResult => ({
  ok: false,
  res: NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } }),
});

/** Verify the bearer token. If `anyOfRealmRoles` is non-empty the user must hold at least one. */
export async function requireUser(req: NextRequest, anyOfRealmRoles: string[] = []): Promise<AuthResult> {
  if (!tcConfig || !tcConfig.realm) return deny(503, "TideCloak adapter config missing: run scripts/init-realm.sh");
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return deny(401, "Missing bearer token");
  const token = header.slice("Bearer ".length).trim();
  // verifyTideCloakToken logs only an error message on failure, never the token.
  const claims = (await verifyTideCloakToken(tcConfig, token, [])) as Claims | null;
  if (!claims) return deny(401, "Invalid or expired token");
  if (anyOfRealmRoles.length > 0) {
    const roles = new Set(claims.realm_access?.roles ?? []);
    if (!anyOfRealmRoles.some((r) => roles.has(r))) return deny(403, `Requires realm role: ${anyOfRealmRoles.join(" or ")}`);
  }
  return { ok: true, claims };
}

/** tide-realm-admin is a client role of realm-management, so it is read from resource_access. */
export function isRealmAdmin(claims: Claims): boolean {
  return (claims.resource_access?.["realm-management"]?.roles ?? []).includes(ROLE_REALM_ADMIN);
}

export function bearerOf(req: NextRequest): string {
  return (req.headers.get("authorization") ?? "").slice("Bearer ".length).trim();
}
