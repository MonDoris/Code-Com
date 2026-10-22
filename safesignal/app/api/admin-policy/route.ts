import { NextRequest, NextResponse } from "next/server";
import { bearerOf, isRealmAdmin, requireUser, tcConfig } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Fetches the realm's signed tide-realm-admin policy, which authorizes a policy signing request
 * (see lib/tide/relationship.ts signRelationshipPolicy). Read-only. It forwards the CALLER's own
 * admin token: this route holds no admin credentials and never approves anything for anyone.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!isRealmAdmin(auth.claims)) return NextResponse.json({ error: "Requires tide-realm-admin" }, { status: 403 });
  const base = String(tcConfig["auth-server-url"]).replace(/\/$/, "");
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(String(tcConfig.realm))}/iga/role-policies/name/tide-realm-admin`,
    { headers: { Authorization: `Bearer ${bearerOf(req)}` }, cache: "no-store" },
  );
  if (!r.ok) return NextResponse.json({ error: `TideCloak returned ${r.status} for the admin policy` }, { status: 502 });
  const j = (await r.json()) as { policy?: string };
  if (!j.policy) return NextResponse.json({ error: "Admin policy has no `policy` field" }, { status: 502 });
  return NextResponse.json({ policy: j.policy }, { headers: { "Cache-Control": "no-store" } });
}
