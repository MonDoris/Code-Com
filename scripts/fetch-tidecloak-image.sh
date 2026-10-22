#!/usr/bin/env bash
# Download tideorg/tidecloak-dev:latest (linux/amd64) layers from Docker Hub without Docker and
# extract /opt/keycloak into tidecloak-local/server. The Keycloak distribution is pure Java and the
# Tide native core (MidgardJava.jar) ships a win32-x86-64 build, so it runs on Windows JVMs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; WORK="${WORK:-$(mktemp -d)}"; DEST="$ROOT/tidecloak-local/server"
REPO=tideorg/tidecloak-dev; TAG="${TAG:-latest}"
tok() { curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:$REPO:pull" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).token))'; }
ACC='application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json'
T=$(tok)
IDX=$(curl -s -H "Authorization: Bearer $T" -H "Accept: $ACC" "https://registry-1.docker.io/v2/$REPO/manifests/$TAG")
DIG=$(node -e 'const i=JSON.parse(process.argv[1]);console.log(i.manifests.find(m=>m.platform&&m.platform.architecture==="amd64"&&m.platform.os==="linux").digest)' "$IDX")
MAN=$(curl -s -H "Authorization: Bearer $T" -H "Accept: $ACC" "https://registry-1.docker.io/v2/$REPO/manifests/$DIG")
mkdir -p "$DEST"
for L in $(node -e 'JSON.parse(process.argv[1]).layers.forEach(l=>console.log(l.digest))' "$MAN"); do
  T=$(tok); curl -sL -H "Authorization: Bearer $T" "https://registry-1.docker.io/v2/$REPO/blobs/$L" -o "$WORK/layer.tgz"
  if tar -tzf "$WORK/layer.tgz" | grep -q '^opt/keycloak/'; then tar -xzf "$WORK/layer.tgz" -C "$DEST" --strip-components=2 opt/keycloak; echo "extracted $L"; fi
done
cat "$DEST/version.txt"
