"use client";
import Link from "next/link";
import { ROLES, STATUS_LABELS, useDemo, type Role } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

const PERMS: { label: string; roles: Role[] }[] = [
  { label: "Gửi báo cáo sự cố", roles: ["reporter"] },
  { label: "Xem danh sách hồ sơ", roles: ["reviewer"] },
  { label: "Đọc nội dung báo cáo", roles: ["reviewer"] },
  { label: "Ký phê duyệt cấp quyền (cần 3 QT)", roles: ["admin"] },
];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

export default function OverviewPage() {
  const { role, can, claims, cases, ready, loadSamples } = useDemo();
  const referred = cases.filter((c) => c.status === "REFERRED").length;
  const reviewed = cases.length - referred;
  const rate = cases.length ? Math.round((reviewed / cases.length) * 100) : 0;
  const recent = [...cases].reverse().slice(0, 5);

  return (
    <>
      <section className="card welcome reveal">
        <div>
          <p className="eyebrow">Xin chào</p>
          <h2>{ROLES[role].label}</h2>
          <p className="muted">{ROLES[role].cap}</p>
        </div>
        {role === "reporter" && <Link className="btn" href="/dashboard/report"><Icon d={ICONS.pen} />Gửi báo cáo mới</Link>}
        {role === "reviewer" && <Link className="btn" href="/dashboard/review"><Icon d={ICONS.eye} />Mở hàng đợi thẩm định</Link>}
        {role === "admin" && <Link className="btn" href="/dashboard/admin"><Icon d={ICONS.shield} />Yêu cầu cấp quyền</Link>}
      </section>

      <div className="kpis reveal d1">
        <Kpi label="Tổng báo cáo" value={cases.length} sub="Đã gửi tới người thẩm định" />
        <Kpi label="Chờ thẩm định" value={referred} sub="Chưa được xem xét" />
        <Kpi label="Đã xem xét" value={reviewed} sub="Đã được người thẩm định đánh dấu" />
        <Kpi label="Tỷ lệ xử lý" value={`${rate}%`} sub="Đã xem xét trên tổng số" />
      </div>

      <section className="card reveal d2">
        <div className="panel-head">
          <h2>Tình trạng xử lý</h2>
          <span className="muted">{cases.length} báo cáo</span>
        </div>
        <div className="stack-bar" role="img" aria-label={`${referred} chờ thẩm định, ${reviewed} đã xem xét`}>
          {cases.length === 0 && <span className="seg empty" />}
          {referred > 0 && <span className="seg referred" style={{ flexGrow: referred }} title={`Chờ thẩm định: ${referred}`} />}
          {reviewed > 0 && <span className="seg reviewed" style={{ flexGrow: reviewed }} title={`Đã xem xét: ${reviewed}`} />}
        </div>
        <div className="legend">
          <span><i className="swatch referred" />Chờ thẩm định <strong>{referred}</strong></span>
          <span><i className="swatch reviewed" />Đã xem xét <strong>{reviewed}</strong></span>
        </div>
        {ready && cases.length === 0 && (
          <p className="empty-state"><button className="secondary" onClick={loadSamples}>Nạp dữ liệu mẫu</button></p>
        )}
      </section>

      <div className="grid-2 reveal d3">
        <section className="card">
          <div className="panel-head">
            <h2>Hồ sơ gần đây</h2>
            {can("review") && cases.length > 0 && <Link href="/dashboard/review">Xem tất cả</Link>}
          </div>
          {!can("review") ? (
            <div className="locked">
              <span className="role-icon"><Icon d={ICONS.lock} /></span>
              <p className="muted">Danh sách hồ sơ chỉ hiển thị với người thẩm định độc lập.</p>
            </div>
          ) : recent.length === 0 ? (
            <p className="muted">Chưa có báo cáo nào.</p>
          ) : (
            <table>
              <thead><tr><th>Mã hồ sơ</th><th>Thời điểm nhận</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td>{new Date(c.createdAt).toLocaleString("vi-VN")}</td>
                    <td><span className={`badge ${c.status.toLowerCase()}`}>{STATUS_LABELS[c.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="panel-head"><h2>Phân quyền</h2></div>
          <table className="perm">
            <thead>
              <tr><th>Quyền</th>{(Object.keys(ROLES) as Role[]).map((r) => <th key={r} className={r === role ? "me" : ""}>{ROLES[r].initials}</th>)}</tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  {(Object.keys(ROLES) as Role[]).map((r) => (
                    <td key={r} className={r === role ? "me" : ""}>
                      {p.roles.includes(r) ? <span className="ok" aria-label="Có"><Icon d={ICONS.check} size={16} /></span> : <span className="muted" aria-label="Không">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted perm-key">BC: người báo cáo · TĐ: người thẩm định · NV: nhân viên khác · QT: quản trị viên</p>
        </section>
      </div>

      {claims && (
        <section className="card tide-card reveal d3">
          <div className="panel-head">
            <div>
              <p className="eyebrow">TideCloak · mô phỏng</p>
              <h2>Phiên đăng nhập</h2>
            </div>
            <span className="chip demo"><Icon d={ICONS.check} size={14} /> Token ES256 đã xác minh</span>
          </div>
          <dl className="report-meta">
            <div><dt>Issuer (realm)</dt><dd className="mono">{claims.iss}</dd></div>
            <div><dt>Client (azp)</dt><dd className="mono">{claims.azp}</dd></div>
            <div><dt>Người dùng</dt><dd>{claims.preferred_username}</dd></div>
            <div><dt>Token hết hạn</dt><dd>{new Date(claims.exp * 1000).toLocaleTimeString("vi-VN")}</dd></div>
          </dl>
          <h3 className="form-section">Vai trò trong token</h3>
          <div className="row">
            {claims.realm_access.roles.map((r) => <span key={r} className="chip mono">{r}</span>)}
            {Object.entries(claims.resource_access).flatMap(([client, v]) => v.roles.map((r) => <span key={`${client}:${r}`} className="chip mono">{client}: {r}</span>))}
          </div>
          <h3 className="form-section">Kiểm tra quyền (authorize)</h3>
          <div className="row">
            {([["submit", "Gửi báo cáo"], ["review", "Thẩm định"], ["approve", "Phê duyệt cấp quyền"]] as const).map(([a, label]) => (
              <span key={a} className={`chip${can(a) ? " on" : ""}`}>{can(a) ? "✓" : "✗"} {label}</span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
