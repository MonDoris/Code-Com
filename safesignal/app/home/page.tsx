"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import type { TidecloakConfig } from "@tidecloak/nextjs/server";
import rawConfig from "../../tidecloak.json";
import { Nav, Synthetic } from "../nav";
import { useApi } from "@/lib/client/api";
import { ROLE_REALM_ADMIN, ROLE_REPORTER, ROLE_REVIEWER } from "@/lib/safesignal";

const tcConfig = rawConfig as TidecloakConfig & Record<string, any>;

export default function HomePage() {
  const { authenticated, isInitializing, hasRealmRole, hasClientRole, login } = useTideCloak();
  const api = useApi();
  const [verify, setVerify] = useState<string>("");

  useEffect(() => {
    if (!authenticated) return;
    // Server-side token check: proves the API verifies the token, not just the UI.
    api<{ vuid?: string }>("/api/protected").then((r) =>
      setVerify(r.ok ? "Server verified your token (signature, issuer, expiry)." : `Server rejected token: ${r.status} ${r.data.error ?? ""}`),
    );
  }, [authenticated, api]);

  if (isInitializing) return <main><p>Loading…</p></main>;
  if (!authenticated) return <main><button onClick={() => login()}>Log in</button></main>;

  const consoleUrl = `${String(tcConfig["auth-server-url"] ?? "").replace(/\/$/, "")}/realms/${tcConfig.realm}/tide-console/`;
  // Role chips are display only. Every API route re-checks roles from the verified token.
  const chips: [string, boolean][] = [
    [ROLE_REPORTER, hasRealmRole(ROLE_REPORTER)],
    [ROLE_REVIEWER, hasRealmRole(ROLE_REVIEWER)],
    ["_tide_encryptor", hasRealmRole("_tide_encryptor")],
    ["_tide_decryptor", hasRealmRole("_tide_decryptor")],
    [`${ROLE_REALM_ADMIN} (realm-management)`, hasClientRole(ROLE_REALM_ADMIN, "realm-management")],
  ];

  return (
    <main>
      <Nav />
      <h1>Home</h1>
      <Synthetic />
      <div className="card">
        <h2>Your roles (from your token)</h2>
        <div>{chips.map(([n, on]) => <span key={n} className={`chip ${on ? "on" : ""}`}>{on ? "✓" : "✗"} {n}</span>)}</div>
        <p className="muted">{verify}</p>
        <p className="muted">New roles appear after an approved change is committed and you sign out and back in.</p>
      </div>
      <div className="card">
        <h2>What each screen does</h2>
        <p><Link href="/report">Report</Link>: a reporter encrypts a synthetic near-miss in this browser. The server receives ciphertext only.</p>
        <p><Link href="/review">Review</Link>: an independent reviewer lists referrals and asks the Tide network to decrypt one. Without the reviewer role the network refuses.</p>
        <p><Link href="/admin">Admin: policies</Link>: a realm admin signs the two access policies once, in the Tide enclave.</p>
      </div>
      <div className="card">
        <h2>Governance happens in TideCloak, not in this app</h2>
        <p>
          Granting <code>{ROLE_REVIEWER}</code> to a user is a change request in TideCloak. With several linked
          realm admins it stays pending until enough of them approve it (Quorum Enforced Authorization).
          This app cannot approve or fake that step.
        </p>
        <p><a href={consoleUrl} target="_blank" rel="noreferrer">Open the Tide console for this realm</a> and use QEA Approvals.</p>
        <p className="muted">
          Sending a case for independent review is an application decision. Granting someone the power to decrypt
          is a governed TideCloak change. They are different processes.
        </p>
      </div>
    </main>
  );
}
