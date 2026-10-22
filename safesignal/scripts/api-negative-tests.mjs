#!/usr/bin/env node
// Server-side authorization tests that need no human: every protected route must refuse
//   1) no token, 2) a garbage token, 3) a token with the right claims but signed by OUR OWN key
//   (forged, including the reviewer role), 4) a genuine TideCloak token from a different realm
//   (master admin-cli). Run against `npm run dev` or `npm start` after scripts/init-realm.sh.
// Usage: node scripts/api-negative-tests.mjs [http://localhost:3000]
// Reads master admin credentials from ../.env.tidecloak only for test 4; prints no tokens.
import { readFileSync } from "fs";
import { SignJWT, generateKeyPair } from "jose";

const APP = process.argv[2] || "http://localhost:3000";
const cfg = JSON.parse(readFileSync(new URL("../tidecloak.json", import.meta.url), "utf8"));
if (!cfg.realm) { console.error("tidecloak.json has no realm: run scripts/init-realm.sh first"); process.exit(2); }
const KC = String(cfg["auth-server-url"]).replace(/\/$/, "");

// Forged token: correct issuer/azp/roles, wrong key.
const { privateKey } = await generateKeyPair("EdDSA");
const forged = await new SignJWT({
  azp: cfg.resource,
  realm_access: { roles: ["appUser", "safesignal-reporter", "independent-reviewer", "_tide_decryptor"] },
  resource_access: { "realm-management": { roles: ["tide-realm-admin"] } },
})
  .setProtectedHeader({ alg: "EdDSA", kid: cfg.jwk?.keys?.[0]?.kid })
  .setIssuer(`${KC}/realms/${cfg.realm}`).setSubject("attacker").setIssuedAt().setExpirationTime("5m")
  .sign(privateKey);

// Genuine token from another realm.
let otherRealm = null;
try {
  const env = Object.fromEntries(readFileSync(new URL("../../.env.tidecloak", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
  const r = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "password", client_id: "admin-cli", username: env.KC_BOOTSTRAP_ADMIN_USERNAME, password: env.KC_BOOTSTRAP_ADMIN_PASSWORD }),
  });
  otherRealm = (await r.json()).access_token ?? null;
} catch { /* test 4 skipped */ }

const tokens = { none: null, garbage: "not.a.jwt", forged, "master-realm": otherRealm };
const routes = [
  ["GET", "/api/cases"],
  ["POST", "/api/cases", JSON.stringify({ recordId: "safesignal-referrals-v1", ciphertext: "A".repeat(100) })],
  ["GET", "/api/cases/SS-00000000"],
  ["PATCH", "/api/cases/SS-00000000", "{}"],
  ["GET", "/api/policies?kind=submit"],
  ["GET", "/api/policies?kind=review"],
  ["POST", "/api/policies", JSON.stringify({ kind: "review", policy: "AAAA" })],
  ["GET", "/api/admin-policy"],
];
let failures = 0;
for (const [name, tok] of Object.entries(tokens)) {
  if (name === "master-realm" && !tok) { console.log("skip master-realm token (could not obtain)"); continue; }
  for (const [method, path, body] of routes) {
    const res = await fetch(APP + path, { method, body, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) } });
    const pass = res.status === 401 || res.status === 403;
    if (!pass) failures++;
    console.log(`${pass ? "PASS" : "FAIL"} ${name.padEnd(12)} ${method.padEnd(5)} ${path.padEnd(28)} -> ${res.status}`);
  }
}
console.log(failures ? `${failures} route(s) did NOT refuse` : "all protected routes refused every invalid token");
process.exit(failures ? 1 : 0);
