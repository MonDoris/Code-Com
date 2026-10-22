import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getCase, setStatus } from "@/lib/server/store";
import { ROLE_REVIEWER } from "@/lib/safesignal";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Returns the ciphertext to an independent reviewer. This route check is defence in depth only:
 * the real control is the Tide network, which refuses decryption unless the caller holds
 * independent-reviewer (+ _tide_decryptor) and presents the admin-signed review policy.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, [ROLE_REVIEWER]);
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const c = await getCase(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json(c, { headers: NO_STORE });
}

/** Synthetic workflow only: a reviewer marks a referral REVIEWED. Not an audit guarantee. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, [ROLE_REVIEWER]);
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const ok = await setStatus(id, "REVIEWED");
  return ok
    ? NextResponse.json({ id, status: "REVIEWED" }, { headers: NO_STORE })
    : NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
}
