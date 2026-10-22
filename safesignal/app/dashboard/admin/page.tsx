"use client";
import { useState } from "react";
import { DEMO_ACCOUNTS, QUORUM, ROLES, useDemo } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

const ADMINS = DEMO_ACCOUNTS.filter((a) => a.role === "admin").map((a) => a.email);
const GRANTEES = DEMO_ACCOUNTS.filter((a) => a.role === "staff" || a.role === "reporter");
const short = (email: string) => email.split("@")[0];

export default function AdminPage() {
  const { can, session, cases, grants, approvers, requestGrant, approveGrant } = useDemo();
  const [caseId, setCaseId] = useState("");
  const [grantee, setGrantee] = useState(GRANTEES[0]?.email ?? "");
  const [busy, setBusy] = useState("");

  if (!can("approve")) {
    return (
      <section className="card locked-card denied-card reveal">
        <span className="role-icon"><Icon d={ICONS.ban} /></span>
        <div>
          <h2>Chỉ dành cho quản trị viên</h2>
          <p className="muted">Đăng nhập bằng một trong các tài khoản quantri1…quantri4@codecom.demo.</p>
        </div>
      </section>
    );
  }

  const approve = async (id: string) => {
    setBusy(id);
    try { await approveGrant(id); } finally { setBusy(""); }
  };

  return (
    <>
      <section className="card tide-card reveal">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Tide · bản mô phỏng</p>
            <h2>Cấp quyền cần {QUORUM} quản trị viên khác cùng ký</h2>
          </div>
          <span className="chip demo">Mô phỏng</span>
        </div>
        <p className="muted">
          Không một quản trị viên nào tự cấp quyền được. Người tạo yêu cầu không được tự phê duyệt; quyền xem hồ sơ chỉ kích
          hoạt khi đủ {QUORUM} chữ ký số hợp lệ (ECDSA P-256) của {QUORUM} quản trị viên khác. Bản mô phỏng này giữ khóa của các
          quản trị viên trong cùng trình duyệt để trình diễn quy tắc; trong Tide thật, khóa được chia trên mạng lưới Tide.
        </p>
      </section>

      <section className="card reveal d1">
        <div className="panel-head"><h2>Tạo yêu cầu cấp quyền</h2></div>
        <div className="form-grid">
          <label className="field">
            <span>Hồ sơ</span>
            <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="" disabled>Chọn hồ sơ</option>
              {[...cases].reverse().map((c) => (
                <option key={c.id} value={c.id}>{c.id} · {new Date(c.createdAt).toLocaleDateString("vi-VN")}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Cấp quyền xem cho</span>
            <select value={grantee} onChange={(e) => setGrantee(e.target.value)}>
              {GRANTEES.map((g) => <option key={g.email} value={g.email}>{ROLES[g.role].label} · {g.email}</option>)}
            </select>
          </label>
        </div>
        <div className="row form-actions">
          <button disabled={!caseId || !grantee} onClick={() => { requestGrant(caseId, grantee); setCaseId(""); }}>
            <Icon d={ICONS.shield} />Tạo yêu cầu
          </button>
          <span className="muted">Người tạo: {session?.email}</span>
        </div>
      </section>

      <section className="card reveal d2">
        <div className="panel-head">
          <h2>Yêu cầu cấp quyền</h2>
          <span className="muted">{grants.length} yêu cầu</span>
        </div>
        {grants.length === 0 ? (
          <p className="muted empty-state">Chưa có yêu cầu nào.</p>
        ) : (
          <div className="requests">
            {[...grants].reverse().map((g) => {
              const ok = approvers[g.id] ?? [];
              const active = ok.length >= QUORUM;
              const mine = g.requestedBy === session?.email;
              const signed = g.approvals.some((a) => a.admin === session?.email);
              return (
                <article key={g.id} className={`request${active ? " active" : ""}`}>
                  <div className="request-head">
                    <div>
                      <strong className="mono">{g.id}</strong>
                      <span className="muted"> · hồ sơ <span className="mono">{g.caseId}</span> → {g.grantee}</span>
                    </div>
                    <span className={`badge ${active ? "reviewed" : "referred"}`}>
                      {active ? "Đã kích hoạt" : `Chờ phê duyệt ${Math.min(ok.length, QUORUM)}/${QUORUM}`}
                    </span>
                  </div>
                  <div className="quorum" aria-label={`${ok.length} trên ${QUORUM} chữ ký`}>
                    {Array.from({ length: QUORUM }, (_, i) => <span key={i} className={`dot${i < ok.length ? " on" : ""}`} />)}
                  </div>
                  <ul className="signers">
                    {ADMINS.filter((a) => a !== g.requestedBy).map((a) => {
                      const sig = g.approvals.find((x) => x.admin === a);
                      return (
                        <li key={a} className={sig && ok.includes(a) ? "signed" : ""}>
                          <Icon d={sig ? ICONS.check : ICONS.lock} size={14} />
                          {short(a)}
                          {sig && <span className="mono sig">{sig.signature.slice(0, 14)}…</span>}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="row">
                    <span className="muted">Tạo bởi {short(g.requestedBy)} · {new Date(g.createdAt).toLocaleString("vi-VN")}</span>
                    {!active && !mine && !signed && (
                      <button onClick={() => approve(g.id)} disabled={busy === g.id}>
                        <Icon d={ICONS.check} />{busy === g.id ? "Đang ký…" : "Ký phê duyệt"}
                      </button>
                    )}
                    {!active && mine && <span className="warn">Bạn tạo yêu cầu này nên không được tự phê duyệt.</span>}
                    {!active && signed && <span className="ok">Bạn đã ký.</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
