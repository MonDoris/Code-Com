"use client";
import { useCallback, useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import { Nav, Synthetic } from "../nav";
import { describeTideError, useApi } from "@/lib/client/api";
import { decryptForRecord, encryptForRecord } from "@/lib/tide/relationship";
import { REFERRAL_RECORD_ID, ROLE_REPORTER } from "@/lib/safesignal";

function syntheticExample() {
  // A random canary lets the team grep server files and logs to prove the plaintext never arrived.
  const canary = `CANARY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return (
    `[SYNTHETIC] Night shift, Ward 7 (invented). Two medication cartons with near-identical labels were stored ` +
    `side by side. A colleague almost selected the wrong one; it was caught before administration. ` +
    `Immediate risk handled through normal procedure. Earlier internal report has had no response. ${canary}`
  );
}

export default function ReportPage() {
  const { authenticated, isInitializing, hasRealmRole, login } = useTideCloak();
  const api = useApi();
  const [policy, setPolicy] = useState<string | null>(null);
  const [policyMsg, setPolicyMsg] = useState("Loading submit policy…");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; ciphertext: string } | null>(null);
  const [err, setErr] = useState("");
  const [readBack, setReadBack] = useState("");

  useEffect(() => {
    if (!authenticated) return;
    api<{ policy: string }>("/api/policies?kind=submit").then((r) => {
      if (r.ok) { setPolicy(r.data.policy); setPolicyMsg(""); }
      else setPolicyMsg(r.status === 403 ? `Access denied: you do not hold ${ROLE_REPORTER}.` : `${r.status}: ${r.data.error ?? "error"}`);
    });
  }, [authenticated, api]);

  const submit = useCallback(async () => {
    if (!policy) return;
    setBusy(true); setErr(""); setResult(null); setReadBack("");
    try {
      // Encryption happens here, in the browser, through the Tide network. Plaintext is never sent to our server.
      const ciphertext = await encryptForRecord(text, REFERRAL_RECORD_ID, policy);
      const r = await api<{ id: string }>("/api/cases", { method: "POST", body: JSON.stringify({ recordId: REFERRAL_RECORD_ID, ciphertext }) });
      if (!r.ok) throw new Error(`${r.status}: ${r.data.error ?? "store failed"}`);
      setResult({ id: r.data.id, ciphertext });
      setText(""); // drop the plaintext from page state once it is safely encrypted
    } catch (e) {
      setErr(describeTideError(e));
    } finally {
      setBusy(false);
    }
  }, [api, policy, text]);

  // Negative check: the submit policy is write-only, so the reporter cannot decrypt even their own referral.
  const tryReadBack = useCallback(async () => {
    if (!result || !policy) return;
    try {
      await decryptForRecord(result.ciphertext, REFERRAL_RECORD_ID, policy);
      setReadBack("UNEXPECTED: decryption succeeded. Stop and report this; the write-only policy is not being enforced.");
    } catch (e) {
      setReadBack(`Refused by the Tide network, as expected: ${describeTideError(e)}`);
    }
  }, [policy, result]);

  if (isInitializing) return <main><p>Loading…</p></main>;
  if (!authenticated) return <main><button onClick={() => login()}>Log in</button></main>;

  return (
    <main>
      <Nav />
      <h1>Report a near miss</h1>
      <Synthetic />
      {!hasRealmRole(ROLE_REPORTER) && <p className="bad">Your token has no {ROLE_REPORTER} role. The server will refuse your submission.</p>}
      {policyMsg && <p className="warn">{policyMsg}</p>}
      <div className="card">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Synthetic narrative only" maxLength={4000} />
        <div className="row">
          <button className="secondary" onClick={() => setText(syntheticExample())}>Fill synthetic example</button>
          <button onClick={submit} disabled={busy || !policy || !text.trim()}>{busy ? "Encrypting…" : "Encrypt in browser and submit"}</button>
        </div>
        {err && <p className="bad">{err}</p>}
      </div>
      {result && (
        <div className="card">
          <h2 className="ok">Stored as case {result.id}</h2>
          <p>The server received and stored only this ciphertext ({result.ciphertext.length} characters, base64):</p>
          <p className="mono">{result.ciphertext.slice(0, 160)}…</p>
          <p className="muted">Bound to record <code>{REFERRAL_RECORD_ID}</code> under the admin-signed write-only policy.</p>
          <button className="secondary" onClick={tryReadBack}>Can I read it back? (expected: no)</button>
          {readBack && <p className={readBack.startsWith("UNEXPECTED") ? "bad" : "ok"}>{readBack}</p>}
        </div>
      )}
    </main>
  );
}
