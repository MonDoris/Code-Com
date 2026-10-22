# SafeSignal Escalate

**Verifiable safety concerns. Governed access to sensitive evidence.**

> **Project status:** This is a submission-ready README **template**. The TideCloak integration and cross-user decrypt workflow have not been verified in this conversation. Replace every [TO VERIFY] marker with actual implementation evidence; do not submit promises as completed features.

## Project overview - for UNLOCKED judges (under 300 words)

**Vision & originality.** Existing hospital incident systems already collect safety reports. SafeSignal Escalate explores a different trust boundary: sensitive safety evidence that can be referred for authorized independent review without allowing a single system administrator to unilaterally broaden decrypt permissions.

**Trust constraint.** Frontline staff can fear identity tracking and punitive action. A 2026 *BMJ Open Quality* survey of one South Indian hospital found that 40% of surveyed nurses were concerned about identity tracking, and 36% about punitive action. This is evidence of a reporting barrier, not proof our software removes that fear.

**Value & impact.** An authorized reviewer could examine a confidential unresolved near-miss report and provide a traceable response. Over time, appropriate, verified and privacy-preserving insights could support patient-safety learning. This is a potential benefit, not a measured outcome.

**Why TideCloak.** The prototype targets TideCloak client-side E2EE for confidentiality and Quorum Enforced Authorization (QEA) for protected permission changes, so access cannot be expanded unilaterally by one realm administrator when configured with a multi-admin quorum.

**Prototype & storytelling.** Demonstrate one synthetic medication-label near miss: encrypted submission; unauthorized decrypt denied; QEA role-change request pending until quorum; authorized decrypt if cross-account sharing is actually supported and verified. Disclose blocked steps instead of simulating cryptography.

## Scope

- Synthetic clinical near-miss report: a nurse notices medication labels that could be confused. No actual patient data.
- One TideCloak-protected reporter workflow; one reviewer workflow; official Tide Console for QEA.
- Optional synthetic escalation status, without pretending legal/medical independent review has been integrated.
- This is NOT an anonymous whistleblower channel, hospital EHR replacement, tamper-proof ledger, or production medical system.

## Setup

Prerequisites: Docker; Node.js/npm; internet connection for Tide enrollment. Refer to the official Tide docs for current commands.

```bash
docker run -d --name safesignal-tide -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
  tideorg/tidecloak-dev:latest
npm init @tidecloak/nextjs@latest safesignal
cd safesignal
npm install
npm run dev
```

Open `http://localhost:3000`, complete the Tide console setup/enrollment and configure the project's realm, roles and permissions as the initializer instructs. Development credentials above are **for local testing only**. Do not publish tokens or `.env` values.

### Tide permissions and QEA

1. Use a dedicated report encryption tag/role, not a global default-decrypt role.
2. Verify `doEncrypt` and `doDecrypt` (or the starter's equivalent documented API).
3. Test reporter A encrypt -> reviewer B decrypt separately; verify shared ciphertext semantics before claiming cross-user access.
4. In Tide Console, configure multiple linked `tide-realm-admin` users so quorum exceeds one, then demonstrate a protected role grant is pending until enough admins authorize it.
5. Ensure API endpoints independently validate authorization.

## Acceptance test status

| Test | Status | Evidence |
|---|---|---|
| Real TideCloak login/logout | [TO VERIFY] | |
| Client encrypts, server stores only ciphertext | [TO VERIFY] | |
| Unauthorized decrypt is denied | [TO VERIFY] | |
| A encrypts / B decrypts when authorized | [TO VERIFY - HIGH RISK] | |
| QEA pending -> quorum reached -> role change committed | [TO VERIFY] | |
| `npm run build` succeeds | [TO VERIFY] | |

## Two-minute video plan

- 0-20 s: one real-world problem (fear of identification and unresolved safety concerns).
- 20-45 s: reporter enters a **synthetic** near miss, TideCloak encrypts, server ciphertext shown.
- 45-75 s: unauthorized reviewer attempt is denied.
- 75-105 s: real Tide Console QEA approval: first admin insufficient, second reaches quorum; show authorized decrypt ONLY if verified.
- 105-120 s: articulate what Tide changes, potential value, and limitations.

Video must be MP4, under 100 MB, kept in the public GitHub repo according to the supplied competition brief.

## Limitations

- ZK login is not anonymity; network and contextual metadata may identify users.
- E2EE alone does not prevent deletion or manipulation of ciphertext in a database.
- QEA protects governed role changes, not hospital clinical determinations or the Tide master realm.
- A reporter's signed/verifiable receipt requires a real receiving/witness service; neither hash alone nor a self-issued local receipt proves the hospital accepted a report.
- Decrypted content can be copied by an authorized recipient.
- No real patients, medical data or clinical decisions. Follow mandatory incident reporting and emergency procedures separately.

## Sources

- UNLOCKED: https://tide.org/unlocked/#challenge
- TideCloak Quickstart: https://docs.tide.org/get-started/Tidecloak%20Quickstart
- Tide E2EE: https://docs.tide.org/Admin/e2ee
- Tide QEA: https://docs.tide.org/Admin/SetupIGA
- Tide Raziel MCP: https://docs.tide.org/ai-agent-pack
- Loganathan et al., *Identifying barriers to incident reporting in a quaternary care hospital*, BMJ Open Quality 15:e003245 (2026): https://bmjopenquality.bmj.com/content/15/1/e003245
