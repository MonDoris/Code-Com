// Plain TCP relay: localhost:8080 (IPv4 + IPv6 loopback) -> TideCloak in the VMware VM.
// Bytes are passed through untouched, so TideCloak sees Host: localhost:8080 and builds
// localhost URLs (the image runs with hostname-strict=false). Binds loopback only.
import net from "net";
const TARGET_HOST = process.env.TIDE_VM_IP || "192.168.148.50";
const PORT = Number(process.env.TIDE_PORT || 8080);
const serve = (host) =>
  net.createServer((client) => {
    const upstream = net.connect(PORT, TARGET_HOST);
    client.pipe(upstream).pipe(client);
    const close = () => { client.destroy(); upstream.destroy(); };
    client.on("error", close); upstream.on("error", close);
  }).listen(PORT, host, () => console.log(`relay ${host}:${PORT} -> ${TARGET_HOST}:${PORT}`))
    .on("error", (e) => console.error(`relay ${host}: ${e.message}`));
serve("127.0.0.1");
serve("::1");
