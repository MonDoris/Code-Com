# SafeSignal Escalate

**Sensitive safety evidence, without unilateral access control.** RMIT UNLOCKED 2026 prototype.

> **Status, 2026-10-22 14:50 ICT:** the app builds and TideCloak runs. The Tide-dependent tests have **not** run yet:
> licensing the realm failed six times, with two emails, inside Tide's licensing service (details below). Nothing in this README
> claims a Tide capability that we have not observed.

## Project overview (for UNLOCKED judges)

**Vision & originality.** Hospitals already collect incident reports. SafeSignal Escalate targets a different trust boundary: referring a confidential, unresolved near-miss for independent review, so that no single IT administrator can quietly read it or grant someone else access.

**Trust constraint.** Frontline staff fear identification and punishment. In a 2026 *BMJ Open Quality* survey of one South Indian hospital, 40% of responding nurses were concerned about identity tracking and 36% about punitive action. That shows a reporting barrier; it does not prove that software removes it.

**Value & impact.** An authorised reviewer could examine a protected synthetic report and respond, while the hospital server holds only ciphertext. This is a potential benefit, not a measured outcome.

**Why TideCloak.** The narrative is encrypted in the reporter's browser through Tide's threshold network, under an admin-signed policy (built-in contract `RelationshipAttestation:1`). Reporters may only encrypt, and only holders of `independent-reviewer` may decrypt. That role is granted through TideCloak Quorum Enforced Authorization (QEA): with three linked realm admins, one approval stays pending until quorum. Plain Tide self-encryption cannot do this, because ciphertext is bound to the encrypting user.

**Prototype & storytelling.** One synthetic medication-label near miss: encrypted submission, refused read-back by the reporter, refused decryption by an unauthorised reviewer, a QEA grant moving from pending to committed, then authorised decryption. Each step is shown only if observed.

## How it works

| Piece | Where |
|---|---|
| Next.js 16 app on the official `@tidecloak/create-nextjs` TypeScript template, Tide SDK pinned to 0.14.x | `safesignal/` |
| Realm template: no decrypt rights in default roles; `safesignal-reporter` and `independent-reviewer` are composites of `_tide_encryptor` and `_tide_decryptor` | `safesignal/init/realm.json` |
| Policy signing, encryption and decryption helper, copied unmodified from the Tide agent pack | `safesignal/lib/tide/relationship.ts` |
| API routes verify the token on the server; the case store accepts only `{recordId, ciphertext}` | `safesignal/app/api/` |
| Evidence scripts: canary scan of the store and server log; forged, garbage and wrong-realm tokens against every route | `safesignal/scripts/` |
| Step-by-step human test plan | `docs/RUNBOOK.md` |

## Setup

Prerequisites: Node 20.9+, Git Bash, curl, jq, and a Linux host for TideCloak: Docker, or VMware Player on Windows.

```bash
# TideCloak (Docker host): the official command
docker run -d --name tidecloak -p 8080:8080 -v ./data:/opt/keycloak/data/h2 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD" \
  tideorg/tidecloak-dev:latest
# TideCloak (Windows, no Docker/WSL/admin): runs the same image layers in a VMware Player Ubuntu VM
bash scripts/tide-vm/up.sh && node scripts/tide-vm/relay.mjs

# Realm: read https://tide.org/legal first; the script prints a Tide enrollment link for admin1
SUBSCRIPTION_EMAIL=you@example.com ACCEPT_TIDE_TERMS=yes bash scripts/init-realm.sh

# App
cd safesignal && npm install && npm run dev        # http://localhost:3000
npm run test:api                                   # negative authorization tests
npm run evidence -- CANARY-XXXXXX ../dev.log       # ciphertext-only evidence
```
Admin credentials live in `.env.tidecloak` (gitignored). Never commit `.env*`, `safesignal/tidecloak.json` from a live realm, or `safesignal/data/`.

## Acceptance test status (observed only)

| Test | Status | Evidence |
|---|---|---|
| `npm run build` and type check | **PASS** | Next.js build lists every route; `tsc --noEmit` exits 0 |
| Protected API routes fail closed without realm config | **PASS** | No token: every route answers 503 (no adapter) or 401 |
| TideCloak 0.14.41 runs and reaches the Tide network | **PASS** | Linux VM: Keycloak 26.7.5 started; `/` answers 302 to the Tide console; ORK HTTPS 200 |
| Realm licensing (`setUpTideRealm`) | **BLOCKED** | Windows JVM: `UnsatisfiedLinkError initialize_wallet`. Linux: `InitializeWallet` timeout, then `FinalizeWallet` HTTP 500 twice |
| Real Tide login/logout | NOT RUN | Needs a licensed realm |
| Browser encrypts, server stores only ciphertext | NOT RUN | Needs a licensed realm |
| Unauthorised decrypt refused, also with stolen ciphertext and policy | NOT RUN | Needs a licensed realm |
| Reporter A encrypts, reviewer B decrypts after grant | NOT RUN | Self-encryption is identity-bound per Tide docs; the policy path depends on the network having `RelationshipAttestation:1` |
| QEA: one approval pending, quorum commits | NOT RUN | Needs a licensed realm and three enrolled admins |

## Limitations

- Signing in is not anonymity: IP addresses, timing and ward or shift context can identify a reporter.
- E2EE does not stop deletion or replacement of ciphertext. The store is one JSON file on one server.
- QEA governs TideCloak role and permission changes. It does not govern clinical decisions, app records, or the master realm.
- Sending a case for review is an app decision. Granting decrypt rights is a QEA change. They are different processes.
- One record id covers the whole referral queue, so a granted reviewer can read every referral.
- Plain bearer tokens are used, without DPoP token binding.
- A reviewer can copy plaintext after decrypting it.
- Synthetic data only. This does not replace mandatory reporting or emergency procedures.

## Sources

- UNLOCKED: https://tide.org/unlocked/#challenge
- TideCloak Quickstart: https://docs.tide.org/get-started/Tidecloak%20Quickstart
- Tide E2EE: https://docs.tide.org/Admin/e2ee
- Tide QEA: https://docs.tide.org/Admin/SetupIGA
- Tide agent pack (Raziel MCP), `@tideorg/mcp@1.9.33`: https://docs.tide.org/ai-agent-pack
- Loganathan et al., BMJ Open Quality 15:e003245 (2026): https://bmjopenquality.bmj.com/content/15/1/e003245
