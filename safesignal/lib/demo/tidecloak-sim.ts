"use client";
// TIDECLOAK SIMULATION. Mirrors the real integration (docs/TIDE-INTEGRATION.md) while Tide's network
// cannot license the realm: login issues a signed access token carrying the realm roles defined in
// init/realm.json, and every access check verifies that token first, the way lib/server/auth.ts does
// with verifyTideCloakToken. The realm signing key lives in this browser, so this demonstrates the
// checks, not their security.
import { ROLE_REALM_ADMIN, ROLE_REPORTER, ROLE_REVIEWER } from "../safesignal";

export const SIM_REALM = "safesignal";
export const SIM_ISSUER = `http://localhost:8080/realms/${SIM_REALM}`;
export const SIM_CLIENT = "safesignal-app";
const LIFESPAN_S = 600; // init/realm.json accessTokenLifespan
const K_REALM_KEY = "ss-sim-realm-key";
const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };

export type Claims = {
  iss: string;
  aud: string;
  azp: string;
  sub: string;
  email: string;
  preferred_username: string;
  iat: number;
  exp: number;
  realm_access: { roles: string[] };
  resource_access: Record<string, { roles: string[] }>;
};

export type SimRole = "reporter" | "reviewer" | "staff" | "admin";

/** Same role names as init/realm.json; composites expanded the way TideCloak puts them in the token. */
export function tokenRolesFor(role: SimRole): Pick<Claims, "realm_access" | "resource_access"> {
  const realm: Record<SimRole, string[]> = {
    reporter: [ROLE_REPORTER, "_tide_encryptor", "appUser"],
    reviewer: [ROLE_REVIEWER, "_tide_decryptor", "appUser"],
    staff: ["appUser"],
    admin: ["appUser"],
  };
  return {
    realm_access: { roles: realm[role] },
    resource_access: role === "admin" ? { "realm-management": { roles: [ROLE_REALM_ADMIN] } } : {},
  };
}

const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

let realmKey: Promise<{ pub: JsonWebKey; priv: JsonWebKey }> | null = null;
function realmKeys() {
  realmKey ??= (async () => {
    try {
      const stored = localStorage.getItem(K_REALM_KEY);
      if (stored) return JSON.parse(stored) as { pub: JsonWebKey; priv: JsonWebKey };
    } catch { /* storage blocked */ }
    const pair = await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"]);
    const keys = { pub: await crypto.subtle.exportKey("jwk", pair.publicKey), priv: await crypto.subtle.exportKey("jwk", pair.privateKey) };
    try { localStorage.setItem(K_REALM_KEY, JSON.stringify(keys)); } catch { /* storage blocked */ }
    return keys;
  })().catch((e) => { realmKey = null; throw e; });
  return realmKey;
}

/** The realm "issues" an ES256 access token after a successful login. */
export async function issueToken(email: string, role: SimRole): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Claims = {
    iss: SIM_ISSUER,
    aud: SIM_CLIENT,
    azp: SIM_CLIENT,
    sub: `sim-${email.split("@")[0]}`,
    email,
    preferred_username: email.split("@")[0],
    iat: now,
    exp: now + LIFESPAN_S,
    ...tokenRolesFor(role),
  };
  const head = `${enc({ alg: "ES256", typ: "JWT", kid: "tidecloak-sim" })}.${enc(claims)}`;
  const key = await crypto.subtle.importKey("jwk", (await realmKeys()).priv, ECDSA, false, ["sign"]);
  return `${head}.${b64url(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(head)))}`;
}

/** Signature, issuer, authorized party and expiry, like verifyTideCloakToken. */
export async function verifyToken(token: string): Promise<{ claims: Claims; expired: boolean } | null> {
  try {
    const [h, p, s] = token.split(".");
    const key = await crypto.subtle.importKey("jwk", (await realmKeys()).pub, ECDSA, false, ["verify"]);
    if (!(await crypto.subtle.verify(SIGN, key, unb64url(s), new TextEncoder().encode(`${h}.${p}`)))) return null;
    const claims = JSON.parse(new TextDecoder().decode(unb64url(p))) as Claims;
    if (claims.iss !== SIM_ISSUER || claims.azp !== SIM_CLIENT) return null;
    return { claims, expired: claims.exp * 1000 <= Date.now() };
  } catch {
    return null;
  }
}

export const hasRealmRole = (c: Claims, role: string) => (c.realm_access?.roles ?? []).includes(role);
export const isRealmAdmin = (c: Claims) => (c.resource_access?.["realm-management"]?.roles ?? []).includes(ROLE_REALM_ADMIN);

/** One place for every access decision, same rules as the API routes' requireUser(). */
export type Action = "submit" | "review" | "approve";
const RULES: Record<Action, (c: Claims) => boolean> = {
  submit: (c) => hasRealmRole(c, ROLE_REPORTER),
  review: (c) => hasRealmRole(c, ROLE_REVIEWER),
  approve: (c) => isRealmAdmin(c),
};
export function authorize(claims: Claims | null, action: Action): boolean {
  return !!claims && claims.exp * 1000 > Date.now() && RULES[action](claims);
}

export function roleFromClaims(c: Claims): SimRole {
  if (isRealmAdmin(c)) return "admin";
  if (hasRealmRole(c, ROLE_REVIEWER)) return "reviewer";
  if (hasRealmRole(c, ROLE_REPORTER)) return "reporter";
  return "staff";
}
