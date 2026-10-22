#!/usr/bin/env node
// Evidence for "the server stores ciphertext only".
// Usage: node scripts/inspect-store.mjs [CANARY-XXXXXX] [path/to/dev.log ...]
// Prints every stored case with its ciphertext length, then searches the raw store file, the
// base64-decoded ciphertext bytes and any given log files for the canary word that the reporter
// typed (the "Fill synthetic example" button adds one). Plaintext is never printed by this script.
import { readFileSync, existsSync } from "fs";

const [canary, ...logs] = process.argv.slice(2);
const file = new URL("../data/store.json", import.meta.url);
if (!existsSync(file)) {
  console.log("data/store.json does not exist yet (no submissions).");
  process.exit(0);
}
const raw = readFileSync(file, "utf8");
const store = JSON.parse(raw);
console.log(`cases stored: ${store.cases.length}`);
for (const c of store.cases) {
  const fields = Object.keys(c).join(",");
  console.log(`- ${c.id} status=${c.status} record=${c.recordId} fields=[${fields}] ciphertext.length=${c.ciphertext.length} head=${c.ciphertext.slice(0, 48)}…`);
}
console.log(`policies stored: ${Object.keys(store.policies || {}).join(", ") || "none"}`);

if (canary) {
  const hits = [];
  if (raw.includes(canary)) hits.push("data/store.json (raw text)");
  for (const c of store.cases) {
    const bytes = Buffer.from(c.ciphertext, "base64");
    if (bytes.includes(Buffer.from(canary, "utf8"))) hits.push(`${c.id} decoded ciphertext bytes`);
  }
  for (const l of logs) {
    if (existsSync(l) && readFileSync(l, "utf8").includes(canary)) hits.push(l);
  }
  console.log(hits.length ? `CANARY FOUND (plaintext leaked) in: ${hits.join("; ")}` : `canary "${canary}" not found in store, decoded ciphertext, or ${logs.length} log file(s)`);
  process.exit(hits.length ? 1 : 0);
}
