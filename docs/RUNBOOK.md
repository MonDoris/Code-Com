# SafeSignal Escalate: test runbook (human steps)

Every step marked **HUMAN** needs a person in a browser: Tide enrollment and enclave approvals cannot be scripted, by design.
Do the steps in this order. Steps 3 to 5 must happen while there is still only **one** realm admin (threshold 1); after that, every change needs the quorum.

Accounts needed (each is a separate Tide account, enrolled in the browser): `admin1`, `admin2`, `admin3`, `lan` (reporter), `reviewer-b`.
Use a separate browser profile or private window per account.

## 0. Start TideCloak on Linux (VMware Player VM; no Docker or admin rights needed)

Tide cryptography needs the image's Linux native core: on a Windows JVM, realm licensing fails
(`UnsatisfiedLinkError: initialize_wallet`). In Git Bash from the repo root:
```bash
bash scripts/tide-vm/up.sh          # boots the VM (192.168.148.50) and starts TideCloak from the image's own layers
node scripts/tide-vm/relay.mjs      # keep running: forwards localhost:8080 to the VM
```
Check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` prints `302`.
If you have Docker on another machine, the official `docker run ... tideorg/tidecloak-dev:latest` is equivalent.

## 1. Provision the realm and enroll admin1 (HUMAN, about 5 min)

Read https://tide.org/legal first. In Git Bash from the repo root:
```bash
SUBSCRIPTION_EMAIL=you@example.com ACCEPT_TIDE_TERMS=yes bash scripts/init-realm.sh
```
Known blocker (2026-10-22, 14:03 to 14:50 ICT): six attempts with two emails failed inside Tide's
licensing service. The first timed out in `InitializeWallet`; the next two got HTTP 500 from
`FinalizeWallet` and surfaced as `TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`. Before each retry, delete the
half-made realm (`DELETE /admin/realms/safesignal` with a master admin token). If it keeps failing,
try a different license email or ask Tide support (info@tide.org, Discord https://discord.gg/XBMd9ny2q5).
When it prints `ACTION REQUIRED`, open the link, create a Tide account for **admin1**, and leave the script running. It finishes by itself and writes `safesignal/tidecloak.json` (local config; do not commit it).

## 2. Gate 2: login / logout (HUMAN)

```bash
cd safesignal && npm run dev 2>&1 | tee ../dev.log
```
Open http://localhost:3000, log in as admin1. Home should say "Server verified your token". Log out, confirm you are back at the login page. Screenshot both.
Then, in a second terminal: `cd safesignal && npm run test:api` (expect every line PASS).

## 3. Sign the two access policies (HUMAN, admin1, Gate 4 stop gate)

Allow pop-ups for localhost:3000. Go to **Admin: policies**, click **Sign submit policy**, approve in the Tide enclave, then **Sign review policy**.
- Success: both chips show "stored".
- If it fails with an unknown-contract error, the production Tide network does not have `RelationshipAttestation:1`. **Stop: cross-user decryption is UNSUPPORTED on this network.** Record the exact message and tell Claude.

## 4. Create and enroll `lan` and `reviewer-b` (HUMAN)

Tide console: http://localhost:8080/realms/safesignal/tide-console/ (sign in as admin1).
People, Add a user, `lan`; send the one-time link; `lan` enrolls. Repeat for `reviewer-b`. Approve the resulting requests in **QEA Approvals**.

## 5. Grant `safesignal-reporter` to lan (HUMAN, admin1)

People, lan, turn on Advanced, Roles, grant realm role `safesignal-reporter`. Approve it in QEA Approvals (1 of 1).

## 6. Gate 3: encrypted submission (HUMAN, lan)

Log in as lan (sign out and in again after the grant). **Report**, **Fill synthetic example**, note the `CANARY-XXXXXX` word, **Encrypt in browser and submit**. Then **Can I read it back?** must be refused.
Evidence:
```bash
cd safesignal && npm run evidence -- CANARY-XXXXXX ../dev.log
```
Expected: the canary is not found in the store, the decoded ciphertext, or the server log.

## 7. Unauthorized reviewer (HUMAN, reviewer-b before any grant)

Log in as reviewer-b, open **Review**: the server must answer "Access denied".
Network check: open the **Network enforcement test**, paste one `ciphertext` and the `review` policy `policyB64` from `safesignal/data/store.json`, click **Try to decrypt**: the Tide network must refuse.

## 8. Add admin2 and admin3 (HUMAN)

For each: People, Add a user, enroll via the link, then Advanced, Roles, grant `tide-realm-admin` (client role of realm-management). Approve in QEA Approvals with the admins who exist at that moment. Note how many approvals each grant needed.

## 9. Gate 5: QEA-governed reviewer grant (HUMAN, 3 admins)

admin1: People, reviewer-b, grant realm role `independent-reviewer`. In QEA Approvals:
1. admin1 authorizes. Screenshot: request still **PENDING**.
2. admin2 authorizes (and admin3 if still pending). Screenshot: request **committed**, and reviewer-b now has the role.

## 10. Gate 4 positive: authorized decrypt (HUMAN, reviewer-b)

reviewer-b signs out and in again. **Review**, **Decrypt**: the synthetic narrative appears.
If it is refused with `'_tide_decryptor' role not found`, the composite role did not reach the Tide credential: grant `_tide_decryptor` directly (another QEA request) and retry. Record which one worked.
