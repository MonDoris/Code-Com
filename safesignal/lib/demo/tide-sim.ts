"use client";
// TIDE SIMULATION (prototype). Stands in for Tide's quorum-enforced change requests while the real
// TideCloak realm cannot be enrolled. Each admin holds an ECDSA P-256 key pair in this browser; an
// approval is that admin's signature over the request. A grant activates only with QUORUM valid
// signatures from distinct admins other than the requester. Unlike Tide, every admin key lives in
// this one browser, so this demonstrates the rule, not its security.
export const QUORUM = 3;

export type Approval = { admin: string; signature: string; at: string };
export type GrantRequest = {
  id: string;
  caseId: string;
  grantee: string;
  requestedBy: string;
  createdAt: string;
  approvals: Approval[];
};

const K_ADMIN_KEYS = "ss-demo-admin-keys";
const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };
type KeyRing = Record<string, { pub: JsonWebKey; priv: JsonWebKey }>;

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function ring(): KeyRing {
  try { return JSON.parse(localStorage.getItem(K_ADMIN_KEYS) || "{}") as KeyRing; } catch { return {}; }
}

// Serialize key creation so two first-time signers never overwrite each other's ring entry.
let ringLock: Promise<unknown> = Promise.resolve();
function adminKeys(admin: string): Promise<{ pub: JsonWebKey; priv: JsonWebKey }> {
  const run = ringLock.then(async () => {
    const r = ring();
    if (r[admin]) return r[admin];
    const pair = await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"]);
    r[admin] = { pub: await crypto.subtle.exportKey("jwk", pair.publicKey), priv: await crypto.subtle.exportKey("jwk", pair.privateKey) };
    try { localStorage.setItem(K_ADMIN_KEYS, JSON.stringify(r)); } catch { /* storage blocked */ }
    return r[admin];
  });
  ringLock = run.catch(() => undefined);
  return run;
}

/** What each admin signs: the request's immutable fields, never the approvals themselves. */
const payload = (r: GrantRequest) => new TextEncoder().encode(JSON.stringify([r.id, r.caseId, r.grantee, r.requestedBy, r.createdAt]));

export async function signApproval(r: GrantRequest, admin: string): Promise<Approval> {
  const { priv } = await adminKeys(admin);
  const key = await crypto.subtle.importKey("jwk", priv, ECDSA, false, ["sign"]);
  return { admin, signature: b64(await crypto.subtle.sign(SIGN, key, payload(r))), at: new Date().toISOString() };
}

/** Admins whose signature on this request verifies, excluding the requester and duplicates. */
export async function verifiedApprovers(r: GrantRequest): Promise<string[]> {
  const keys = ring();
  const ok = new Set<string>();
  for (const a of r.approvals) {
    if (a.admin === r.requestedBy || ok.has(a.admin) || !keys[a.admin]) continue;
    try {
      const key = await crypto.subtle.importKey("jwk", keys[a.admin].pub, ECDSA, false, ["verify"]);
      if (await crypto.subtle.verify(SIGN, key, unb64(a.signature), payload(r))) ok.add(a.admin);
    } catch { /* malformed signature: not counted */ }
  }
  return [...ok];
}
