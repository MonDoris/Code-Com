#!/usr/bin/env bash
# Provision the "safesignal" realm by running the OFFICIAL @tidecloak/create-nextjs init script
# (safesignal/init/tcinit.sh, unmodified) against the local TideCloak, using our realm template
# (safesignal/init/realm.json: no decrypt rights in default roles).
#
# Two decisions belong to you, so this script never assumes them:
#   1. the email Tide uses to manage the realm's license  (SUBSCRIPTION_EMAIL)
#   2. acceptance of Tide's Terms & Conditions, https://tide.org/legal  (ACCEPT_TIDE_TERMS=yes)
#
# Usage (Git Bash):
#   SUBSCRIPTION_EMAIL=you@example.com ACCEPT_TIDE_TERMS=yes bash scripts/init-realm.sh
#
# The script pauses at "ACTION REQUIRED" and prints a one-time Tide enrollment link for the FIRST
# realm admin. Open it in a browser and create/sign in to a Tide account. The script continues by
# itself once enrollment is detected, then writes safesignal/tidecloak.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/tidecloak-local/bin:$PATH"   # jq wrapper (Windows jq.exe with -b)
command -v jq >/dev/null || { echo "jq not found (expected tidecloak-local/bin/jq)"; exit 1; }
: "${SUBSCRIPTION_EMAIL:?Set SUBSCRIPTION_EMAIL to the email Tide should use for this realm license}"
if [[ "${ACCEPT_TIDE_TERMS:-}" != "yes" ]]; then
  echo "Read https://tide.org/legal, then re-run with ACCEPT_TIDE_TERMS=yes if you agree."; exit 1
fi
set -a; source <(tr -d '\r' < "$ROOT/.env.tidecloak"); set +a
curl -sf -o /dev/null http://localhost:8080/ || { echo "TideCloak is not answering on :8080. Run scripts/start-tidecloak.ps1 first."; exit 1; }
cd "$ROOT/safesignal"
TIDECLOAK_LOCAL_URL="http://localhost:8080" \
NEW_REALM_NAME="safesignal" \
CLIENT_NAME="safesignal-app" \
CLIENT_APP_URL="http://localhost:3000" \
KC_USER="$KC_BOOTSTRAP_ADMIN_USERNAME" \
KC_PASSWORD="$KC_BOOTSTRAP_ADMIN_PASSWORD" \
SUBSCRIPTION_EMAIL="$SUBSCRIPTION_EMAIL" \
REALM_JSON_PATH="$ROOT/safesignal/init/realm.json" \
  bash init/tcinit.sh
echo
echo "Adapter config:"; jq '{realm, resource, "auth-server-url", vendorId: (.vendorId|tostring|.[0:12]), hasJwk: has("jwk"), homeOrkUrl}' tidecloak.json
