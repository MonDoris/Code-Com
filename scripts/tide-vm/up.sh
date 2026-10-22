#!/usr/bin/env bash
# Run the official tideorg/tidecloak-dev:latest image (0.14.41, linux/amd64) on Linux inside a
# VMware Workstation Player VM, for Windows hosts that have no Docker/WSL and no admin rights.
#
# Why not the Windows JVM: the image's Windows build of Tide's native core (MidgardCore.dll in
# MidgardJava.jar) exports only 4 functions and lacks e.g. initialize_wallet, so realm licensing /
# VRK keygen fails with UnsatisfiedLinkError. The Linux build (libMidgardCore.so) is complete.
#
# How: the image's 8 layers (sha256-verified against the registry manifest; none contain
# whiteouts) are unpacked in order into /opt/tc/rootfs, which reproduces the container filesystem
# byte for byte, including the image's own Java 21. The image ENTRYPOINT runs in a chroot as
# uid 1000 with the image's ENV, as a systemd service. Same bits, no container runtime needed.
#
# Inputs in tidecloak-local/vm (all gitignored): noble.ova (Ubuntu 24.04 cloud image, checksum
# verified), seed.iso (cloud-init NoCloud: user ss + ssh key + static IP), vm_key, layers/*.tgz.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; VM="$ROOT/tidecloak-local/vm"
VMW="/c/Program Files (x86)/VMware/VMware Player"; VMRUN="$VMW/vmrun.exe"; OVFTOOL="$VMW/OVFTool/ovftool.exe"
VMX="$VM/noble/noble.vmx"; IP=192.168.148.50
OPTS=(-i "$VM/vm_key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 -o LogLevel=ERROR)
SSH=(ssh "${OPTS[@]}" ss@$IP)

if [[ ! -f "$VMX" ]]; then
  "$OVFTOOL" --acceptAllEulas --allowExtraConfig --name=noble "$(cygpath -w "$VM/noble.ova")" "$(cygpath -w "$VM")"
  sed -i -E '/^(memsize|numvcpus|ethernet0\.|ide1:0\.)/d' "$VMX"
  cat >> "$VMX" <<VMXEOF
memsize = "6144"
numvcpus = "4"
ethernet0.present = "TRUE"
ethernet0.connectionType = "nat"
ethernet0.virtualDev = "vmxnet3"
ethernet0.addressType = "generated"
ide1:0.present = "TRUE"
ide1:0.deviceType = "cdrom-image"
ide1:0.fileName = "$(cygpath -w "$VM/seed.iso")"
VMXEOF
fi

"$VMRUN" -T player start "$(cygpath -w "$VMX")" nogui || true
echo "waiting for ssh + cloud-init..."
for i in $(seq 1 90); do "${SSH[@]}" test -f /var/lib/cloud/safesignal-ready 2>/dev/null && break; sleep 5; done
"${SSH[@]}" 'uname -sr; nproc; free -m | head -2'

if ! "${SSH[@]}" test -x /opt/tc/rootfs/opt/keycloak/bin/kc.sh; then
  "${SSH[@]}" 'mkdir -p /tmp/layers'
  scp "${OPTS[@]}" "$VM"/layers/*.tgz ss@$IP:/tmp/layers/
  # Unpack in manifest order (base -> top).
  "${SSH[@]}" 'set -e; sudo mkdir -p /opt/tc/rootfs; for L in 25582d7c 03547c59 d4cdfca4 9df90751 82a719a7 8a22f584 4f4fb700 2eae8d3e; do sudo tar --same-owner -xzf /tmp/layers/layer-$L.tgz -C /opt/tc/rootfs; done; rm -rf /tmp/layers; sudo cp /etc/resolv.conf /opt/tc/rootfs/etc/resolv.conf'
fi

set -a; source <(tr -d '\r' < "$ROOT/.env.tidecloak"); set +a
# Image ENV, copied verbatim from the image config blob, plus the bootstrap admin (root-only file).
"${SSH[@]}" "sudo install -m 600 /dev/null /etc/tidecloak.env && sudo tee /etc/tidecloak.env >/dev/null" <<ENVEOF
KC_RUN_IN_CONTAINER=true
DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
USER_HOME_ORK=https://ork1.tideprotocol.com
SYSTEM_HOME_ORK=https://ork1.tideprotocol.com
THRESHOLD_T=14
THRESHOLD_N=20
PAYER_PUBLIC=200000b967a7799ffd4476e1074777ebc83bec23a3843cb2e5ca43c83561802c8e646b
LANG=en_US.UTF-8
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
KC_BOOTSTRAP_ADMIN_USERNAME=$KC_BOOTSTRAP_ADMIN_USERNAME
KC_BOOTSTRAP_ADMIN_PASSWORD=$KC_BOOTSTRAP_ADMIN_PASSWORD
ENVEOF
"${SSH[@]}" "sudo tee /etc/systemd/system/tidecloak.service >/dev/null" <<'UNITEOF'
[Unit]
Description=TideCloak dev (tideorg/tidecloak-dev rootfs, image ENTRYPOINT in chroot)
After=network-online.target
Wants=network-online.target
[Service]
EnvironmentFile=/etc/tidecloak.env
ExecStartPre=/bin/sh -c 'R=/opt/tc/rootfs; for d in proc sys dev; do mountpoint -q $R/$d || mount --rbind /$d $R/$d; done'
ExecStart=/usr/sbin/chroot --userspec=1000:0 /opt/tc/rootfs /bin/sh -c 'cd /opt/keycloak && exec /opt/keycloak/bin/kc.sh start --import-realm --optimized'
Restart=on-failure
[Install]
WantedBy=multi-user.target
UNITEOF
"${SSH[@]}" 'sudo systemctl daemon-reload && sudo systemctl enable --now tidecloak && sleep 2 && systemctl is-active tidecloak'
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://$IP:8080/" 2>/dev/null || true)
  [[ "$code" == "302" ]] && { echo "TideCloak ready at http://$IP:8080 -> now run: node scripts/tide-vm/relay.mjs"; exit 0; }
  sleep 3
done
echo "TideCloak did not answer. Logs: ssh -i tidecloak-local/vm/vm_key ss@$IP sudo journalctl -u tidecloak -n 80"; exit 1
