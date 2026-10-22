"use client";
// STATIC UI PREVIEW. No Tide SDK, no API calls, no encryption, no authorization.
// It exists so the team can look at the screens while realm licensing is blocked.
// Nothing on this page is evidence of a security property; do not present it as the working demo.
import Link from "next/link";
import { useState } from "react";
import { ROLE_REPORTER, ROLE_REVIEWER, REFERRAL_RECORD_ID } from "@/lib/safesignal";

const SAMPLE_NARRATIVE =
  "[SYNTHETIC] Night shift, Ward 7 (invented). Two medication cartons with near-identical labels were stored side by side. " +
  "A colleague almost selected the wrong one; it was caught before administration. Earlier internal report has had no response.";

const SCREENS = [
  ["report", "Reporter: submit"],
  ["denied", "Reviewer: no access"],
  ["list", "Reviewer: list"],
  ["opened", "Reviewer: authorized view"],
  ["admin", "Admin: policies"],
  ["qea", "Governance: QEA"],
] as const;
type Screen = (typeof SCREENS)[number][0];

function PreviewBanner() {
  return (
    <p className="banner danger">
      <strong>UI PREVIEW ONLY.</strong> Static sample data. No Tide, no encryption, no login, no authorization.
      This is not evidence that any security feature works.
      <br />
      <em>CHỈ XEM TRƯỚC GIAO DIỆN. Dữ liệu mẫu tĩnh, không có Tide, không mã hóa, không đăng nhập, không kiểm tra quyền.</em>
    </p>
  );
}

export default function PreviewPage() {
  const [screen, setScreen] = useState<Screen>("report");
  const [submitted, setSubmitted] = useState(false);

  return (
    <main>
      <nav>
        <strong>Code Cơm</strong>
        <span className="muted">UI preview</span>
        <Link href="/">Back to login</Link>
      </nav>
      <PreviewBanner />
      <div className="row" style={{ margin: "12px 0" }}>
        {SCREENS.map(([id, label]) => (
          <button key={id} className={screen === id ? "" : "secondary"} onClick={() => setScreen(id)}>{label}</button>
        ))}
      </div>

      {screen === "report" && (
        <>
          <h1>Report a near miss</h1>
          <div className="card">
            <textarea defaultValue={SAMPLE_NARRATIVE} />
            <div className="row">
              <button className="secondary">Fill synthetic example</button>
              <button onClick={() => setSubmitted(true)}>Encrypt in browser and submit</button>
            </div>
          </div>
          {submitted && (
            <div className="card">
              <h2 className="ok">Stored as case SS-SAMPLE01</h2>
              <p>The server received and stored only the ciphertext:</p>
              <p className="mono">[sample placeholder: the real page shows the first characters of the Tide ciphertext here]</p>
              <p className="muted">Bound to record <code>{REFERRAL_RECORD_ID}</code> under the admin-signed write-only policy.</p>
              <button className="secondary">Can I read it back? (expected: no)</button>
              <p className="ok">Refused by the Tide network, as expected: [the real page shows the network&apos;s exact refusal message]</p>
            </div>
          )}
        </>
      )}

      {screen === "denied" && (
        <>
          <h1>Independent review</h1>
          <div className="card">
            <p className="bad">
              Access denied by the server: your verified token has no {ROLE_REVIEWER} role. That role can only be granted
              through a TideCloak change request approved by the admin quorum.
            </p>
          </div>
        </>
      )}

      {(screen === "list" || screen === "opened") && (
        <>
          <h1>Independent review</h1>
          <div className="card">
            <h2>Referrals (2)</h2>
            <p className="muted">The list shows only id, server time and a synthetic workflow status.</p>
            <table>
              <thead><tr><th>Case</th><th>Received</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {[["SS-SAMPLE01", "22/10/2026 14:20", "REFERRED"], ["SS-SAMPLE02", "22/10/2026 14:35", "REVIEWED"]].map(([id, t, s]) => (
                  <tr key={id}>
                    <td className="mono">{id}</td><td>{t}</td><td>{s}</td>
                    <td className="row">
                      <button onClick={() => setScreen("opened")}>Decrypt</button>
                      {s !== "REVIEWED" && <button className="secondary">Mark reviewed</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {screen === "opened" && (
            <div className="card">
              <h2>SS-SAMPLE01</h2>
              <p className="warn">Preview: nothing was decrypted. The real page shows the text the Tide network decrypts for an authorized reviewer, like this sample:</p>
              <p>{SAMPLE_NARRATIVE}</p>
            </div>
          )}
        </>
      )}

      {screen === "admin" && (
        <>
          <h1>Admin: access policies</h1>
          <div className="card">
            <p>
              Both policies use Tide&apos;s built-in contract <code>RelationshipAttestation:1</code> and the single record
              <code> {REFERRAL_RECORD_ID}</code>. Signing opens the Tide enclave, where you approve.
            </p>
            {[["Reporters: encrypt only", true], ["Independent reviewers: decrypt only", false]].map(([label, on]) => (
              <div key={String(label)} className="row" style={{ margin: "8px 0" }}>
                <span className={`chip ${on ? "on" : ""}`}>{on ? "✓ stored" : "not signed"}</span>
                <span>{label}</span>
                <button>Sign {on ? "submit" : "review"} policy</button>
              </div>
            ))}
          </div>
        </>
      )}

      {screen === "qea" && (
        <>
          <h1>Governance: who may decrypt</h1>
          <div className="card">
            <p>
              Granting <code>{ROLE_REVIEWER}</code> is a change request in the Tide console, not in this app.
              With three linked realm admins:
            </p>
            <table>
              <thead><tr><th>Step</th><th>Approvals</th><th>State</th></tr></thead>
              <tbody>
                <tr><td>admin1 proposes the grant and authorizes</td><td>1 of 3</td><td className="warn">PENDING</td></tr>
                <tr><td>admin2 authorizes</td><td>quorum</td><td className="ok">COMMITTED</td></tr>
                <tr><td>reviewer signs out and in again</td><td></td><td>role present, decrypt allowed</td></tr>
              </tbody>
            </table>
            <p className="muted">
              Exact quorum for three admins is shown by TideCloak (&quot;roughly 70%&quot; per Tide docs). Reporter role:
              {" "}<code>{ROLE_REPORTER}</code>, write-only.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
