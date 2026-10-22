import { NextRequest, NextResponse } from "next/server";
import { Models } from "@tideorg/js";
import { isRealmAdmin, requireUser } from "@/lib/server/auth";
import { getPolicy, policyStatus, putPolicy } from "@/lib/server/store";
import {
  EXPECTED_POLICY_ROLES,
  POLICY_SPECS,
  REFERRAL_RECORD_ID,
  ROLE_REPORTER,
  ROLE_REVIEWER,
  type PolicyKind,
} from "@/lib/safesignal";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const KINDS: PolicyKind[] = ["submit", "review"];
const ROLE_FOR: Record<PolicyKind, string> = { submit: ROLE_REPORTER, review: ROLE_REVIEWER };

/**
 * GET ?kind=submit|review  -> the signed policy (base64) for a caller holding the matching role.
 *                             A policy is an authorization object, not a key: holding it without
 *                             the role still fails at the Tide network.
 * GET ?kind=status         -> which policies exist (any signed-in user).
 */
export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  if (kind === "status") {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;
    return NextResponse.json(await policyStatus(), { headers: NO_STORE });
  }
  if (!KINDS.includes(kind as PolicyKind)) {
    return NextResponse.json({ error: "kind must be submit|review|status" }, { status: 400, headers: NO_STORE });
  }
  const k = kind as PolicyKind;
  const auth = await requireUser(req, [ROLE_FOR[k]]);
  if (!auth.ok) return auth.res;
  const p = await getPolicy(k);
  if (!p) {
    return NextResponse.json({ error: `The ${k} policy has not been signed by a realm admin yet` }, { status: 409, headers: NO_STORE });
  }
  return NextResponse.json({ kind: k, policy: p }, { headers: NO_STORE });
}

/** A tide-realm-admin uploads a policy they just signed in the Tide enclave. We parse and check it. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!isRealmAdmin(auth.claims)) {
    return NextResponse.json({ error: "Requires tide-realm-admin" }, { status: 403, headers: NO_STORE });
  }
  const { kind, policy } = (await req.json().catch(() => ({}))) as { kind?: PolicyKind; policy?: string };
  if (!kind || !KINDS.includes(kind) || typeof policy !== "string") {
    return NextResponse.json({ error: "Body must be { kind, policy }" }, { status: 400, headers: NO_STORE });
  }
  let p: InstanceType<typeof Models.Policy>;
  try {
    p = Models.Policy.from(Uint8Array.from(Buffer.from(policy, "base64")));
  } catch {
    return NextResponse.json({ error: "Not a Tide policy" }, { status: 400, headers: NO_STORE });
  }
  const param = (n: string) => String(p.params.entries.get(n) ?? "");
  const spec = POLICY_SPECS[kind];
  const problems = [
    p.contractId !== "RelationshipAttestation:1" && "contractId",
    !(p.signature && p.signature.length > 0) && "unsigned",
    param("subjectType") !== spec.subject.type && "subjectType",
    param("subjectId") !== spec.subject.id && "subjectId",
    param("assignmentId") !== REFERRAL_RECORD_ID && "assignmentId",
    param("roles") !== EXPECTED_POLICY_ROLES[kind] && "roles",
  ].filter(Boolean);
  if (problems.length) {
    return NextResponse.json({ error: `Policy does not match the ${kind} spec: ${problems.join(", ")}` }, { status: 400, headers: NO_STORE });
  }
  await putPolicy(kind, policy, String(auth.claims.sub ?? "unknown"));
  console.info(`[policies] stored ${kind} policy`);
  return NextResponse.json({ ok: true, kind }, { status: 201, headers: NO_STORE });
}
