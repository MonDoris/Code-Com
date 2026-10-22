"use client";
import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import type { TidecloakConfig } from "@tidecloak/nextjs/server";
import rawConfig from "../../tidecloak.json";
import { Nav, Synthetic } from "../nav";
import { describeTideError, useApi } from "@/lib/client/api";
import { describeRelationshipPolicy, signRelationshipPolicy } from "@/lib/tide/relationship";
import { POLICY_SPECS, REFERRAL_RECORD_ID, ROLE_REALM_ADMIN, type PolicyKind } from "@/lib/safesignal";

const tcConfig = rawConfig as TidecloakConfig & Record<string, any>;
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export default function AdminPage() {
  const { authenticated, isInitializing, hasClientRole, login } = useTideCloak();
  const api = useApi();
  const [status, setStatus] = useState<{ submit: boolean; review: boolean } | null>(null);
  const [adminPolicy, setAdminPolicy] = useState<Uint8Array | null>(null);
  const [msg, setMsg] = useState("");
  const isAdmin = authenticated && hasClientRole(ROLE_REALM_ADMIN, "realm-management");

  const refresh = useCallback(async () => {
    const s = await api<{ submit: boolean; review: boolean }>("/api/policies?kind=status");
    if (s.ok) setStatus(s.data);
  }, [api]);

  useEffect(() => {
    if (!authenticated) return;
    refresh();
    // Pre-fetch so the click below opens the enclave pop-up directly (pop-up blockers need a user gesture).
    if (isAdmin) api<{ policy: string }>("/api/admin-policy").then((r) => {
      if (r.ok) setAdminPolicy(fromB64(r.data.policy));
      else setMsg(`Could not load the realm admin policy: ${r.status} ${r.data.error ?? ""}`);
    });
  }, [authenticated, isAdmin, api, refresh]);

  const sign = useCallback(async (kind: PolicyKind) => {
    if (!adminPolicy) return;
    setMsg(`Opening the Tide enclave to approve the ${kind} policy…`);
    try {
      const spec = POLICY_SPECS[kind];
      const signed = await signRelationshipPolicy(
        { vendorId: String(tcConfig.vendorId), subject: spec.subject, recordId: REFERRAL_RECORD_ID, access: spec.access },
        adminPolicy,
      );
      const d = describeRelationshipPolicy(signed);
      const r = await api("/api/policies", { method: "POST", body: JSON.stringify({ kind, policy: signed }) });
      if (!r.ok) throw new Error(`${r.status}: ${r.data.error}`);
      setMsg(`Signed and stored ${kind} policy: ${d.subjectType}=${d.subjectId}, record=${d.recordId}, roles=${d.roles}, signed=${d.signed}`);
      refresh();
    } catch (e) {
      setMsg(`Signing failed: ${describeTideError(e)}`);
    }
  }, [adminPolicy, api, refresh]);

  if (isInitializing) return <main><p>Loading…</p></main>;
  if (!authenticated) return <main><button onClick={() => login()}>Log in</button></main>;

  return (
    <main>
      <Nav />
      <h1>Admin: access policies</h1>
      <Synthetic />
      {!isAdmin && <p className="bad">Only a {ROLE_REALM_ADMIN} can sign policies. The server also enforces this.</p>}
      <div className="card">
        <p>
          Both policies use Tide&apos;s built-in contract <code>RelationshipAttestation:1</code> and the single record
          <code> {REFERRAL_RECORD_ID}</code>. Signing opens the Tide enclave, where you approve. These policies say
          <em> which role</em> may encrypt or decrypt; <em>who holds the role</em> is decided by QEA-governed role grants.
        </p>
        {(Object.keys(POLICY_SPECS) as PolicyKind[]).map((k) => (
          <div key={k} className="row" style={{ margin: "8px 0" }}>
            <span className={`chip ${status?.[k] ? "on" : ""}`}>{status?.[k] ? "✓ stored" : "not signed"}</span>
            <span>{POLICY_SPECS[k].label}</span>
            <button onClick={() => sign(k)} disabled={!isAdmin || !adminPolicy}>Sign {k} policy</button>
          </div>
        ))}
        {msg && <p className="mono">{msg}</p>}
      </div>
    </main>
  );
}
