# TideCloak integration map

Tide's network could not license our realm during the hackathon (see RUNBOOK §1), so the app at
`/dashboard` runs on a **TideCloak simulation** that applies the same rules. This file maps each
simulated piece to the real TideCloak piece that replaces it. The real integration code is
already in the repo; only the wiring is switched.

| What the user sees | Simulation now (`safesignal/lib/demo/`) | Real TideCloak (already in repo) |
|---|---|---|
| Sign in ("Đăng nhập bằng Tide") | `tidecloak-sim.ts` `issueToken()`: fixed demo accounts, ES256 access token signed by a realm key in the browser | `TideCloakProvider` + `login()` from `@tidecloak/nextjs` (`app/layout.tsx`, `app/page.tsx`); user enrolls in the Tide enclave |
| Session / token | `verifyToken()`: signature, `iss`, `azp`, `exp`; silent refresh before the 10-minute expiry | `verifyTideCloakToken()` in `lib/server/auth.ts` with the realm JWK from `tidecloak.json`; SDK refresh |
| Roles | `tokenRolesFor()`: same names as `init/realm.json` (`safesignal-reporter` + `_tide_encryptor`, `independent-reviewer` + `_tide_decryptor`, `realm-management: tide-realm-admin`) | Realm roles from `init/realm.json`, issued by TideCloak in `realm_access` / `resource_access` |
| Access checks | `authorize(claims, action)`: `submit` → reporter role, `review` → reviewer role, `approve` → `tide-realm-admin` | `requireUser(req, [role])` on every API route (`app/api/cases/*`, `app/api/policies`) |
| Report encryption | `store.tsx`: WebCrypto AES-256-GCM per report, key wrapped with the reviewer's RSA-OAEP key | `encryptForRecord()` / `decryptForRecord()` in `lib/tide/relationship.ts`: Tide threshold encryption under the admin-signed RelationshipAttestation policies (reporter write-only, reviewer read-only) |
| Grant access to a report (3 admins) | `tide-sim.ts`: request + ECDSA P-256 signature per admin; active only with 3 valid signatures from admins other than the requester | TideCloak IGA change request on the role grant, approved by the admin quorum in the Tide enclave (RUNBOOK §9, Gate 5) |
| Encrypted copy for the reporter | `receiptOf()` / `restore()`: id + time + ciphertext | Same idea over the server store: the copy holds Tide ciphertext that only the Tide network can decrypt for a reviewer |
| Stored data | `localStorage` (`ss-demo-*` keys) | `lib/server/store.ts` → `data/store.json`: ids, timestamps, status, ciphertext only |

## What the simulation does not give

- The realm key, reviewer key and all admin keys live in one browser, so anyone with that browser
  can act as anyone. In Tide no single machine holds a whole key.
- Checks run in the browser only; the real build also enforces them on the server (`requireUser`).

## Switching to real TideCloak

1. Run `bash scripts/init-realm.sh` until `safesignal/tidecloak.json` is written (RUNBOOK §1).
2. The layout then mounts `TideCloakProvider`, and `/` shows "Đăng nhập bằng Tide".
3. Point the dashboard's data calls at the API routes (`lib/client/api.ts`) and its crypto at
   `lib/tide/relationship.ts`, replacing `lib/demo/store.tsx` and `lib/demo/tidecloak-sim.ts`.

Tide's MCP was not connected in the coding session, so this map was written from the repo's own
Tide integration code rather than generated with the MCP.
