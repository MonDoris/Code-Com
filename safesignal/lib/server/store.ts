// Minimal server-side store: one JSON file (data/store.json, gitignored).
// It holds ONLY: case ids, server timestamps, a synthetic workflow status, the ciphertext of the
// narrative, and the two admin-signed Tide policies. There is no plaintext field and no reporter
// identity field. It is not tamper-proof: whoever controls this server can delete or replace rows.
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CaseStatus, PolicyKind } from "../safesignal";

export interface StoredCase {
  id: string;
  createdAt: string;
  status: CaseStatus;
  recordId: string;
  ciphertext: string; // base64, produced in the reporter's browser by IAMService.doEncrypt
}
interface StoredPolicy {
  policyB64: string;
  storedAt: string;
  storedBy: string; // the admin's token `sub`, for traceability of who uploaded it
}
interface Store {
  cases: StoredCase[];
  policies: Partial<Record<PolicyKind, StoredPolicy>>;
}

const FILE = path.join(process.cwd(), "data", "store.json");
let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch (e: any) {
    if (e?.code === "ENOENT") return { cases: [], policies: {} };
    throw e;
  }
}
async function write(s: Store): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(s, null, 2));
  await fs.rename(tmp, FILE);
}
/** Serialize read-modify-write cycles within this process. */
function mutate<T>(fn: (s: Store) => T): Promise<T> {
  const run = queue.then(async () => {
    const s = await read();
    const out = fn(s);
    await write(s);
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function addCase(recordId: string, ciphertext: string): Promise<StoredCase> {
  const c: StoredCase = { id: `SS-${randomUUID().slice(0, 8).toUpperCase()}`, createdAt: new Date().toISOString(), status: "REFERRED", recordId, ciphertext };
  await mutate((s) => s.cases.push(c));
  return c;
}
export async function listCases() {
  return (await read()).cases.map(({ id, createdAt, status }) => ({ id, createdAt, status }));
}
export async function getCase(id: string) {
  return (await read()).cases.find((c) => c.id === id) ?? null;
}
export async function setStatus(id: string, status: CaseStatus) {
  return mutate((s) => {
    const c = s.cases.find((x) => x.id === id);
    if (c) c.status = status;
    return !!c;
  });
}
export async function putPolicy(kind: PolicyKind, policyB64: string, storedBy: string) {
  await mutate((s) => {
    s.policies[kind] = { policyB64, storedAt: new Date().toISOString(), storedBy };
  });
}
export async function getPolicy(kind: PolicyKind) {
  return (await read()).policies[kind]?.policyB64 ?? null;
}
export async function policyStatus() {
  const p = (await read()).policies;
  return { submit: !!p.submit, review: !!p.review };
}
