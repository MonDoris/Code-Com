"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, DEPARTMENTS, EMPTY_REPORT, OUTCOMES, SEVERITIES, receiptOf, syntheticExample, useDemo, type Case, type Report } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

export default function ReportPage() {
  const { can, logout, submit } = useDemo();
  const router = useRouter();
  const [form, setForm] = useState<Report>(EMPTY_REPORT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState<Case | null>(null);

  const set = <K extends keyof Report>(k: K, v: Report[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(""); setSent(null);
    try {
      setSent(await submit(form));
      setForm(EMPTY_REPORT); // drop the content from the page once it is sent
    } catch (err) {
      setMsg(`Không gửi được báo cáo: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!can("submit")) {
    return (
      <section className="card locked-card reveal">
        <span className="role-icon"><Icon d={ICONS.lock} /></span>
        <div>
          <h2>Chỉ người báo cáo mới gửi được báo cáo</h2>
          <p className="muted">Tài khoản hiện tại không có quyền gửi. Hãy đăng nhập bằng tài khoản người báo cáo.</p>
        </div>
        <button onClick={() => { logout(); router.push("/login"); }}>Đổi tài khoản</button>
      </section>
    );
  }

  if (sent) {
    const receipt = receiptOf(sent);
    const download = () => {
      const url = URL.createObjectURL(new Blob([receipt], { type: "text/plain" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${sent.id}-ban-sao-ma-hoa.txt` });
      a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <section className="card sent-card reveal">
        <span className="role-icon ok-icon"><Icon d={ICONS.check} /></span>
        <h2>Đã gửi báo cáo</h2>
        <p>Mã hồ sơ <strong className="mono">{sent.id}</strong></p>
        <p className="muted">
          Báo cáo đã được chuyển tới người thẩm định độc lập. Nội dung được bảo mật: chỉ người thẩm định đọc được, kể cả bạn
          cũng không xem lại được sau khi gửi.
        </p>
        <div className="receipt">
          <div className="panel-head">
            <h3><Icon d={ICONS.lock} /> Bản sao mã hóa của báo cáo</h3>
          </div>
          <p className="muted">
            Hãy lưu lại bản sao này. Nếu hệ thống gặp sự cố hoặc hồ sơ bị xóa, người thẩm định dùng nó để khôi phục đúng báo
            cáo của bạn. Bản sao đã được mã hóa: không ai đọc được nội dung nếu không có khóa của người thẩm định.
          </p>
          <textarea className="mono receipt-text" readOnly value={receipt} onFocus={(e) => e.currentTarget.select()} />
          <div className="row">
            <button onClick={download}>Tải bản sao (.txt)</button>
            <button className="secondary" onClick={() => navigator.clipboard?.writeText(receipt)}>Sao chép</button>
          </div>
        </div>
        <button className="secondary" onClick={() => setSent(null)}>Gửi báo cáo khác</button>
      </section>
    );
  }

  return (
    <div className="grid-2">
      <form className="card incident-form reveal" onSubmit={onSubmit}>
        <div className="panel-head">
          <h2>Phiếu báo cáo sự cố y khoa</h2>
          <button type="button" className="secondary" onClick={() => setForm(syntheticExample())}>Điền ví dụ mẫu</button>
        </div>
        <p className="muted form-note">Báo cáo tự nguyện. Không ghi họ tên người bệnh hoặc đồng nghiệp. Chỉ dùng thông tin giả lập.</p>

        <h3 className="form-section">1. Thông tin sự cố</h3>
        <div className="form-grid">
          <label className="field">
            <span>Khoa/phòng xảy ra sự cố *</span>
            <select value={form.department} onChange={(e) => set("department", e.target.value)} required>
              <option value="" disabled>Chọn khoa/phòng</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Thời điểm xảy ra *</span>
            <input type="datetime-local" value={form.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} required />
          </label>
          <label className="field span-2">
            <span>Nhóm sự cố *</span>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} required>
              <option value="" disabled>Chọn nhóm sự cố</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <h3 className="form-section">2. Phân loại ban đầu</h3>
        <fieldset className="field">
          <legend>Sự cố đã xảy ra chưa?</legend>
          <div className="choices">
            {OUTCOMES.map((o) => (
              <label key={o} className={`choice${form.outcome === o ? " on" : ""}`}>
                <input type="radio" name="outcome" checked={form.outcome === o} onChange={() => set("outcome", o)} />{o}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>Mức độ ảnh hưởng tới người bệnh</legend>
          <div className="choices">
            {SEVERITIES.map((s) => (
              <label key={s} className={`choice${form.severity === s ? " on" : ""}`}>
                <input type="radio" name="severity" checked={form.severity === s} onChange={() => set("severity", s)} />{s}
              </label>
            ))}
          </div>
        </fieldset>

        <h3 className="form-section">3. Nội dung</h3>
        <label className="field">
          <span>Mô tả sự việc *</span>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Chuyện gì đã xảy ra, phát hiện như thế nào? Mô tả khách quan, không quy lỗi cá nhân." maxLength={3000} required />
        </label>
        <label className="field">
          <span>Xử lý ban đầu đã thực hiện</span>
          <textarea className="short" value={form.immediateAction} onChange={(e) => set("immediateAction", e.target.value)} placeholder="Ví dụ: dừng thuốc, báo bác sĩ điều trị…" maxLength={1000} />
        </label>
        <label className="field">
          <span>Đề xuất, kiến nghị</span>
          <textarea className="short" value={form.suggestion} onChange={(e) => set("suggestion", e.target.value)} placeholder="Cần thay đổi gì để sự cố không lặp lại?" maxLength={1000} />
        </label>

        {msg && <p className="bad">{msg}</p>}
        <div className="row form-actions">
          <button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</button>
          <button type="button" className="secondary" onClick={() => setForm(EMPTY_REPORT)}>Xóa nội dung</button>
        </div>
      </form>

      <aside className="card reveal d1">
        <h2>Hướng dẫn</h2>
        <ol className="timeline">
          <li><strong>Báo cáo sớm</strong><span className="muted">Ghi lại ngay khi còn nhớ rõ, kể cả sự cố suýt xảy ra.</span></li>
          <li><strong>Mô tả khách quan</strong><span className="muted">Nêu sự việc và hoàn cảnh, không quy lỗi cho cá nhân.</span></li>
          <li><strong>Không ghi danh tính</strong><span className="muted">Không ghi họ tên người bệnh, người nhà hay đồng nghiệp.</span></li>
          <li><strong>Được bảo mật</strong><span className="muted">Chỉ người thẩm định độc lập đọc được nội dung báo cáo.</span></li>
        </ol>
        <p className="muted form-note">Báo cáo này không thay thế việc xử trí cấp cứu và quy trình báo cáo sự cố bắt buộc của bệnh viện.</p>
      </aside>
    </div>
  );
}
