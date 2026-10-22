# CLAUDE - IMPLEMENTATION PROMPT (COPY TO CLAUDE CODE)

Read `SYSTEM_CONTEXT.md` and `README.md` in full. They are the authoritative project requirements and source list. This is a **time-critical RMIT UNLOCKED 2026** prototype, not a production patient-safety system.

**Your mission:** In the existing repository, build the smallest **truthful, working** Next.js TypeScript demonstration of SafeSignal Escalate: a sensitive synthetic near-miss report protected with TideCloak E2EE, permission checks, and real TideCloak QEA for governed role grants. Optimize for demo reliability, security accuracy and reproducibility, not feature count.

## Mandatory sequence

1. **Inspect first.** Report package.json, Node/Next versions, current TideCloak integration, realm, SDK APIs, `.env.example`, repo tree, whether MCP Raziel is connected. Do not overwrite existing work or change core configuration without inspecting it.
2. **Use official playbooks.** Consult Tide Raziel MCP (`claude mcp add tide-pack -- npx -y @tideorg/mcp` if required) and the four official Tide docs listed in SYSTEM_CONTEXT.md. Do not invent Tide SDK API methods, role names or permission models.
3. **Tide test 1:** Confirm real login/logout in the dev realm.
4. **Tide test 2:** Use official SDK client encryption to store an invented near-miss narrative as ciphertext only. Demonstrate the persisted value is ciphertext and the server never receives/logs plaintext.
5. **Tide test 3 - STOP GATE:** Check cross-user decrypt: reporter A encrypts, reviewer B tries decrypting the same ciphertext after a valid grant. Determine whether this SDK model supports sharing under the configured tag/realm. Show exact code/docs and test results. If not supported, STOP claiming this functionality and propose the smallest *documented* alternative that keeps the app truthful.
6. **Tide test 4:** Set up at least three linked realm admins if feasible; show a real QEA-protected role grant from Pending (one approval) to Committed (sufficient quorum). The approvals must occur in Tide Console or its actual governed API, not in an app mock.
7. **Build minimum UI:** reporter submission, reviewer list/status, access denied, legitimately authorized view. Reuse starter components. Store only synthetic data and prevent sensitive fields from being exposed in logs, error telemetry or query strings.
8. **Verify:** protected API routes check tokens and effective authorization; don't trust only frontend checks. Run the project's build/test scripts; report exact outcomes.
9. **Document:** update README overview (<=300 words answering the five UNLOCKED judging criteria), setup, tested capabilities and limitations. Prepare a factual 2-minute MP4 demo story. Do not state success before observed tests.

## Constraints

- DO NOT implement custom cryptography, pretend a hash is immutable, claim ZK login ensures anonymity, or claim TideCloak controls a hospital database's deletion rights.
- DO NOT claim the Tide master admin realm is subject to QEA, or that one admin can't approve changes in a one-admin realm.
- DO NOT grant universal `selfdecrypt` or similar powers via `default-roles`.
- DO NOT mock encryption, quorum, reviewer access or signatures for demo purposes.
- DO NOT implement medical AI, real patient data, actual hospital integrations, blockchain, full incident management, broad dashboard analytics, cross-hospital data sharing, or custom Forseti contracts without explicit reason and verified feasibility.
- The QEA-governed role grant and the application-level decision to send a case to independent review are DIFFERENT processes; never equate them.
- A signed receipt/witness is stretch scope only after all Tide P0 proofs succeed; a local hash without an independently stored attestation cannot prove the hospital received a case.
- Preserve working local functionality and version-control progress. Never commit tokens/passwords/real medical data.

## Reply format after each milestone

**Implemented:** exact files/routes changed.
**Verified:** commands, observed output and security behavior.
**Unverified/blocked:** exact limitation, no handwaving.
**Next action:** only the highest-priority next step.

Start now by inspecting the repo and executing the smallest working TideCloak login + encryption test, not by generating a complete speculative codebase.
