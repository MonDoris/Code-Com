"use client";
import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { Nav, Synthetic } from "../nav";
import { describeTideError, useApi } from "@/lib/client/api";
import { decryptForRecord } from "@/lib/tide/relationship";
import { REFERRAL_RECORD_ID, ROLE_REVIEWER, type CaseSummary } from "@/lib/safesignal";

export default function ReviewPage() {
  const { authenticated, isInitializing, login } = useTideCloak();
  const api = useApi();
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [denied, setDenied] = useState("");
  const [opened, setOpened] = useState<{ id: string; text?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState("");
  // Network-enforcement test inputs (pasted from data/store.json, i.e. what a server operator holds).
  const [ct, setCt] = useState("");
  const [pol, setPol] = useState("");
  const [probe, setProbe] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ cases: CaseSummary[] }>("/api/cases");
    if (r.ok) { setCases(r.data.cases); setDenied(""); }
    else setDenied(r.status === 403
      ? `Access denied by the server: your verified token has no ${ROLE_REVIEWER} role. That role can only be granted through a TideCloak change request approved by the admin quorum.`
      : `${r.status}: ${r.data.error ?? "error"}`);
  }, [api]);

  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);

  const open = useCallback(async (id: string) => {
    setBusy(id); setOpened(null);
    try {
      const [c, p] = await Promise.all([
        api<{ ciphertext: string; recordId: string }>(`/api/cases/${encodeURIComponent(id)}`),
        api<{ policy: string }>("/api/policies?kind=review"),
      ]);
      if (!c.ok) throw new Error(`${c.status}: ${c.data.error}`);
      if (!p.ok) throw new Error(`${p.status}: ${p.data.error}`);
      // Decryption is performed by the Tide network for this signed-in reviewer; our server never decrypts.
      const text = await decryptForRecord(c.data.ciphertext, c.data.recordId, p.data.policy);
      setOpened({ id, text });
    } catch (e) {
      setOpened({ id, error: describeTideError(e) });
    } finally {
      setBusy("");
    }
  }, [api]);

  const markReviewed = useCallback(async (id: string) => {
    await api(`/api/cases/${encodeURIComponent(id)}`, { method: "PATCH", body: "{}" });
    load();
  }, [api, load]);

  const runProbe = useCallback(async () => {
    setProbe("Asking the Tide network…");
    try {
      await decryptForRecord(ct.trim(), REFERRAL_RECORD_ID, pol.trim());
      setProbe("DECRYPTED. If you do not hold independent-reviewer, stop and report this.");
    } catch (e) {
      setProbe(`Refused by the Tide network: ${describeTideError(e)}`);
    }
  }, [ct, pol]);

  if (isInitializing) return <main><p>Loading…</p></main>;
  if (!authenticated) return <main><button onClick={() => login()}>Log in</button></main>;

  return (
    <main>
      <Nav />
      <h1>Independent review</h1>
      <Synthetic />
      {denied && <div className="card"><p className="bad">{denied}</p></div>}
      {cases && (
        <div className="card">
          <h2>Referrals ({cases.length})</h2>
          <p className="muted">The list shows only id, server time and a synthetic workflow status.</p>
          <table>
            <thead><tr><th>Case</th><th>Received</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                  <td>{c.status}</td>
                  <td className="row">
                    <button onClick={() => open(c.id)} disabled={!!busy}>{busy === c.id ? "Decrypting…" : "Decrypt"}</button>
                    {c.status !== "REVIEWED" && <button className="secondary" onClick={() => markReviewed(c.id)}>Mark reviewed</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {opened && (
        <div className="card">
          <h2>{opened.id}</h2>
          {opened.text !== undefined
            ? <><p className="ok">Decrypted by the Tide network for you. Shown in this page only, never sent back to the server.</p><p>{opened.text}</p></>
            : <p className="bad">Refused: {opened.error}</p>}
        </div>
      )}
      <details className="card">
        <summary>Network enforcement test: decrypt with stolen ciphertext and policy</summary>
        <p className="muted">
          Paste a <code>ciphertext</code> and the <code>review</code> policy from <code>data/store.json</code>, which is
          everything a server operator holds. Run this as a user WITHOUT {ROLE_REVIEWER}: the Tide network should refuse.
        </p>
        <textarea className="mono" placeholder="ciphertext (base64)" value={ct} onChange={(e) => setCt(e.target.value)} />
        <textarea className="mono" placeholder="review policy (base64)" value={pol} onChange={(e) => setPol(e.target.value)} />
        <button onClick={runProbe} disabled={!ct || !pol}>Try to decrypt</button>
        {probe && <p className={probe.startsWith("Refused") ? "ok" : "bad"}>{probe}</p>}
      </details>
    </main>
  );
}
