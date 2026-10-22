import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { addCase, listCases } from "@/lib/server/store";
import { REFERRAL_RECORD_ID, ROLE_REPORTER, ROLE_REVIEWER } from "@/lib/safesignal";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
// base64 (standard or url-safe) only. Tide ciphertext is binary; anything else is refused.
const B64 = /^[A-Za-z0-9+/_-]+={0,2}$/;

/** Reporter submits exactly two fields: the fixed record id and the ciphertext from their browser. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, [ROLE_REPORTER]);
  if (!auth.ok) return auth.res;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400, headers: NO_STORE });
  }
  const keys = body && typeof body === "object" ? Object.keys(body as object) : [];
  // Reject any extra field so a client bug cannot smuggle plaintext or identity metadata in.
  if (keys.length !== 2 || !keys.includes("ciphertext") || !keys.includes("recordId")) {
    return NextResponse.json({ error: "Body must be exactly { ciphertext, recordId }" }, { status: 400, headers: NO_STORE });
  }
  const { ciphertext, recordId } = body as { ciphertext: unknown; recordId: unknown };
  if (recordId !== REFERRAL_RECORD_ID) return NextResponse.json({ error: "Unknown recordId" }, { status: 400, headers: NO_STORE });
  if (typeof ciphertext !== "string" || ciphertext.length < 64 || ciphertext.length > 200_000 || !B64.test(ciphertext)) {
    return NextResponse.json({ error: "ciphertext must be base64 output of Tide doEncrypt" }, { status: 400, headers: NO_STORE });
  }
  const c = await addCase(recordId, ciphertext);
  // Log only the case id: never ciphertext, tokens or claims.
  console.info(`[cases] stored ${c.id}`);
  return NextResponse.json({ id: c.id, createdAt: c.createdAt, status: c.status }, { status: 201, headers: NO_STORE });
}

/** Reviewers see the minimal list: id, server timestamp, synthetic status. No ciphertext. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req, [ROLE_REVIEWER]);
  if (!auth.ok) return auth.res;
  return NextResponse.json({ cases: await listCases() }, { headers: NO_STORE });
}
