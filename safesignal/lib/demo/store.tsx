"use client";
// DEMO MODE (no Tide): shared state for /dashboard while TideCloak enrollment is blocked.
// A demo login (fixed accounts, one shared password shown on the login page) stands in for Tide
// login, localStorage stands in for the server store, and a reviewer key pair generated in this
// browser (WebCrypto RSA-OAEP + AES-GCM) stands in for Tide threshold encryption. Not secure: the
// password check runs in the browser and the reviewer's private key sits in this browser's storage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "reporter" | "reviewer" | "staff";
export type CaseStatus = "REFERRED" | "REVIEWED";
export type Case = { id: string; createdAt: string; status: CaseStatus; ciphertext: string };

export const ROLES: Record<Role, { label: string; short: string; cap: string; initials: string }> = {
  reporter: { label: "Người báo cáo", short: "Người báo cáo", cap: "Gửi báo cáo sự cố. Không xem lại được.", initials: "BC" },
  reviewer: { label: "Người thẩm định độc lập", short: "Người thẩm định", cap: "Xem và xử lý các báo cáo được chuyển tới.", initials: "TĐ" },
  staff: { label: "Nhân viên khác", short: "Nhân viên", cap: "Không có vai trò. Không xem được báo cáo.", initials: "NV" },
};
export const STATUS_LABELS: Record<CaseStatus, string> = { REFERRED: "Chờ thẩm định", REVIEWED: "Đã xem xét" };

export const DEMO_PASSWORD = "demo123";
export const DEMO_ACCOUNTS: { email: string; role: Role }[] = [
  { email: "baocao@codecom.demo", role: "reporter" },
  { email: "thamdinh@codecom.demo", role: "reviewer" },
  { email: "nhanvien@codecom.demo", role: "staff" },
];
export type Session = { email: string; role: Role };

/** The incident report form. The whole object is what gets encrypted; the list only shows id, time, status. */
export type Report = {
  department: string;
  occurredAt: string; // datetime-local value
  category: string;
  outcome: string;
  severity: string;
  description: string;
  immediateAction: string;
  suggestion: string;
};

export const DEPARTMENTS = ["Hồi sức tích cực", "Cấp cứu", "Nội", "Ngoại - Phẫu thuật", "Nhi", "Sản", "Dược", "Xét nghiệm", "Chẩn đoán hình ảnh", "Khác"];
export const CATEGORIES = [
  "Thuốc và dịch truyền",
  "Thực hiện quy trình kỹ thuật, thủ thuật",
  "Nhận diện người bệnh",
  "Máu và chế phẩm máu",
  "Thiết bị y tế",
  "Nhiễm khuẩn bệnh viện",
  "Tai nạn đối với người bệnh (té ngã…)",
  "Hồ sơ, tài liệu, y lệnh",
  "Cơ sở vật chất, hạ tầng",
  "Khác",
];
export const OUTCOMES = ["Suýt xảy ra (chưa tới người bệnh)", "Đã xảy ra"];
export const SEVERITIES = ["Chưa ảnh hưởng", "Nhẹ", "Trung bình", "Nặng"];

export const EMPTY_REPORT: Report = {
  department: "",
  occurredAt: "",
  category: "",
  outcome: OUTCOMES[0],
  severity: SEVERITIES[0],
  description: "",
  immediateAction: "",
  suggestion: "",
};

// K_CASES is versioned: a browser that never stored this key gets the sample referrals once.
const K_SESSION = "ss-demo-session", K_CASES = "ss-demo-cases-v3", K_PUB = "ss-demo-reviewer-pub", K_PRIV = "ss-demo-reviewer-priv";
const RSA = { name: "RSA-OAEP", hash: "SHA-256" };

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function save(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: state still works for this page view */ }
}

// One shared promise: concurrent first calls (e.g. React dev double effects seeding samples) must not
// each generate and store a different key pair, or ciphertext made with the losing pair is unreadable.
let keysPromise: Promise<{ pub: JsonWebKey; priv: JsonWebKey }> | null = null;

function reviewerKeys(): Promise<{ pub: JsonWebKey; priv: JsonWebKey }> {
  keysPromise ??= (async () => {
    const pub = load<JsonWebKey | null>(K_PUB, null), priv = load<JsonWebKey | null>(K_PRIV, null);
    if (pub && priv) return { pub, priv };
    const pair = await crypto.subtle.generateKey({ ...RSA, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["encrypt", "decrypt"]);
    const keys = { pub: await crypto.subtle.exportKey("jwk", pair.publicKey), priv: await crypto.subtle.exportKey("jwk", pair.privateKey) };
    save(K_PUB, keys.pub); save(K_PRIV, keys.priv);
    return keys;
  })().catch((e) => { keysPromise = null; throw e; });
  return keysPromise;
}

/** Hybrid encryption: a fresh AES-256-GCM key per referral, wrapped with the reviewer's RSA public key. */
async function encryptForReviewer(text: string, pubJwk: JsonWebKey): Promise<string> {
  const pub = await crypto.subtle.importKey("jwk", pubJwk, RSA, false, ["encrypt"]);
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(text));
  const k = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, await crypto.subtle.exportKey("raw", aes));
  return b64(new TextEncoder().encode(JSON.stringify({ k: b64(k), iv: b64(iv), ct: b64(ct) })));
}

async function decryptAsReviewer(ciphertext: string, privJwk: JsonWebKey): Promise<string> {
  const env = JSON.parse(new TextDecoder().decode(unb64(ciphertext))) as { k: string; iv: string; ct: string };
  const priv = await crypto.subtle.importKey("jwk", privJwk, RSA, false, ["decrypt"]);
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, unb64(env.k));
  const aes = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, aes, unb64(env.ct)));
}

/** Older free-text referrals decrypt to plain text; show them as the description. */
function parseReport(text: string): Report {
  try {
    const r = JSON.parse(text) as Partial<Report>;
    if (r && typeof r === "object" && typeof r.description === "string") return { ...EMPTY_REPORT, ...r };
  } catch { /* plain text */ }
  return { ...EMPTY_REPORT, outcome: "", severity: "", description: text };
}

const localDateTime = (hoursAgo: number) => {
  const d = new Date(Date.now() - hoursAgo * 3_600_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function syntheticExample(): Report {
  return {
    department: "Nội",
    occurredAt: localDateTime(5),
    category: "Thuốc và dịch truyền",
    outcome: OUTCOMES[0],
    severity: SEVERITIES[0],
    description:
      "[GIẢ LẬP] Ca đêm. Hai hộp thuốc có nhãn gần giống hệt nhau được để cạnh nhau trên xe thuốc. Điều dưỡng suýt lấy nhầm hộp khi chuẩn bị thuốc; phát hiện nhờ đối chiếu y lệnh trước khi dùng cho người bệnh.",
    immediateAction: "Tách riêng hai loại thuốc, dán nhãn cảnh báo, báo điều dưỡng trưởng khoa.",
    suggestion: "Sắp xếp thuốc nhìn giống nhau ở ngăn khác nhau; bổ sung nhãn cảnh báo thuốc LASA.",
  };
}

/** Synthetic sample referrals, oldest first. Encrypted like real submissions when loaded. */
const SAMPLES: { hoursAgo: number; status: CaseStatus; report: Report }[] = [
  {
    hoursAgo: 130, status: "REVIEWED",
    report: {
      department: "Hồi sức tích cực", occurredAt: localDateTime(132), category: "Thiết bị y tế", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Bơm tiêm điện được cài tốc độ 10 ml/giờ thay vì 1 ml/giờ. Điều dưỡng ca sau phát hiện khi bàn giao, chưa ảnh hưởng tới người bệnh.",
      immediateAction: "Điều chỉnh lại tốc độ truyền, báo bác sĩ điều trị.",
      suggestion: "Hai người cùng kiểm tra khi cài đặt bơm tiêm điện với thuốc nguy cơ cao.",
    },
  },
  {
    hoursAgo: 102, status: "REVIEWED",
    report: {
      department: "Nhi", occurredAt: localDateTime(104), category: "Nhận diện người bệnh", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Hai bệnh nhi trùng họ tên nằm cùng phòng; suýt lấy nhầm mẫu xét nghiệm. Được phát hiện nhờ đối chiếu ngày sinh trên vòng đeo tay.",
      immediateAction: "Lấy lại mẫu đúng người bệnh, chuyển một bệnh nhi sang phòng khác.",
      suggestion: "Gắn cảnh báo trùng tên trên bảng phòng bệnh.",
    },
  },
  {
    hoursAgo: 75, status: "REFERRED",
    report: {
      department: "Ngoại - Phẫu thuật", occurredAt: localDateTime(77), category: "Thực hiện quy trình kỹ thuật, thủ thuật", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Bước xác nhận vị trí mổ trong bảng kiểm an toàn phẫu thuật bị bỏ qua vì ca mổ gấp. Phẫu thuật viên phụ dừng lại kiểm tra kịp thời.",
      immediateAction: "Dừng lại, hoàn tất bảng kiểm trước khi rạch da.",
      suggestion: "Không bắt đầu ca mổ khi bảng kiểm chưa có đủ chữ ký.",
    },
  },
  {
    hoursAgo: 49, status: "REFERRED",
    report: {
      department: "Nội", occurredAt: localDateTime(50), category: "Hồ sơ, tài liệu, y lệnh", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Y lệnh miệng về liều insulin được ghi nhầm đơn vị. Dược sĩ phát hiện khi đối chiếu đơn thuốc, người bệnh chưa được tiêm.",
      immediateAction: "Xác nhận lại y lệnh với bác sĩ, sửa hồ sơ.",
      suggestion: "Hạn chế y lệnh miệng; nhắc lại y lệnh (read-back) với thuốc nguy cơ cao.",
    },
  },
  {
    hoursAgo: 22, status: "REFERRED",
    report: {
      department: "Cấp cứu", occurredAt: localDateTime(23), category: "Thuốc và dịch truyền", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Tủ thuốc cấp cứu thiếu adrenaline sau ca trực đêm và chưa được bổ sung. Phát hiện khi kiểm tra đầu ca.",
      immediateAction: "Bổ sung thuốc từ khoa Dược, báo trưởng ca.",
      suggestion: "Kiểm tra tủ thuốc cấp cứu sau mỗi lần sử dụng, có sổ ký bàn giao.",
    },
  },
  {
    hoursAgo: 3, status: "REFERRED",
    report: {
      department: "Sản", occurredAt: localDateTime(4), category: "Thuốc và dịch truyền", outcome: OUTCOMES[0], severity: SEVERITIES[0],
      description: "[GIẢ LẬP] Thông tin dị ứng penicillin của người bệnh không hiện trên phiếu chăm sóc. Điều dưỡng hỏi lại người bệnh trước khi tiêm nên tránh được sự cố. Báo cáo nội bộ trước đó chưa được phản hồi.",
      immediateAction: "Không tiêm, báo bác sĩ đổi thuốc, cập nhật cảnh báo dị ứng.",
      suggestion: "Hiển thị dị ứng thuốc ở đầu mọi phiếu chăm sóc.",
    },
  },
];

async function sampleCases(): Promise<Case[]> {
  const { pub } = await reviewerKeys();
  const now = Date.now();
  return Promise.all(
    SAMPLES.map(async (s) => ({
      id: `HS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date(now - s.hoursAgo * 3_600_000).toISOString(),
      status: s.status,
      ciphertext: await encryptForReviewer(JSON.stringify(s.report), pub),
    })),
  );
}

const byCreatedAt = (a: Case, b: Case) => a.createdAt.localeCompare(b.createdAt);

interface DemoState {
  ready: boolean;
  session: Session | null;
  /** The signed-in account's role; "staff" (no rights) when nobody is signed in. */
  role: Role;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  cases: Case[];
  submit: (report: Report) => Promise<Case>;
  open: (c: Case) => Promise<Report>;
  markReviewed: (id: string) => void;
  loadSamples: () => Promise<void>;
  reset: () => void;
}

const DemoContext = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cases, setCases] = useState<Case[]>([]);

  const login = useCallback((email: string, password: string) => {
    const account = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
    if (!account || password !== DEMO_PASSWORD) return false;
    setSession(account); save(K_SESSION, account);
    return true;
  }, []);
  const logout = useCallback(() => {
    setSession(null);
    try { localStorage.removeItem(K_SESSION); } catch { /* storage blocked */ }
  }, []);

  const persist = useCallback((update: (prev: Case[]) => Case[]) => {
    setCases((prev) => { const next = update(prev); save(K_CASES, next); return next; });
  }, []);

  useEffect(() => {
    setSession(load<Session | null>(K_SESSION, null));
    const stored = load<Case[] | null>(K_CASES, null);
    setCases(stored ?? []);
    setReady(true);
    // First visit: seed the sample referrals. "Reset" stores [], so it never re-seeds by itself.
    if (stored === null) sampleCases().then((seed) => persist((prev) => (prev.length ? prev : seed)));
  }, [persist]);

  const submit = useCallback(async (report: Report) => {
    const { pub } = await reviewerKeys();
    const c: Case = {
      id: `HS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "REFERRED",
      ciphertext: await encryptForReviewer(JSON.stringify(report), pub),
    };
    persist((prev) => [...prev, c]);
    return c;
  }, [persist]);

  const open = useCallback(async (c: Case) => parseReport(await decryptAsReviewer(c.ciphertext, (await reviewerKeys()).priv)), []);
  const markReviewed = useCallback((id: string) => persist((prev) => prev.map((c) => (c.id === id ? { ...c, status: "REVIEWED" } : c))), [persist]);
  const loadSamples = useCallback(async () => {
    const seed = await sampleCases();
    persist((prev) => [...prev, ...seed].sort(byCreatedAt));
  }, [persist]);
  const reset = useCallback(() => persist(() => []), [persist]);

  const role: Role = session?.role ?? "staff";
  const value = useMemo(
    () => ({ ready, session, role, login, logout, cases, submit, open, markReviewed, loadSamples, reset }),
    [ready, session, role, login, logout, cases, submit, open, markReviewed, loadSamples, reset],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
