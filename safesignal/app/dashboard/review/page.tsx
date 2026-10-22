"use client";
import { useState } from "react";
import { STATUS_LABELS, useDemo, type Case, type CaseStatus, type Report } from "@/lib/demo/store";
import { Icon, ICONS } from "@/lib/demo/icons";

type Filter = "ALL" | CaseStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "REFERRED", label: STATUS_LABELS.REFERRED },
  { id: "REVIEWED", label: STATUS_LABELS.REVIEWED },
];

const fmtOccurred = (v: string) => (v ? new Date(v).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—");

function ReportView({ id, report }: { id: string; report: Report }) {
  const meta: [string, string][] = [
    ["Khoa/phòng", report.department || "—"],
    ["Thời điểm xảy ra", fmtOccurred(report.occurredAt)],
    ["Nhóm sự cố", report.category || "—"],
    ["Phân loại", report.outcome || "—"],
    ["Mức độ ảnh hưởng", report.severity || "—"],
  ];
  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Phiếu báo cáo sự cố</p>
          <h2>{id}</h2>
        </div>
      </div>
      <dl className="report-meta">
        {meta.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <h3 className="form-section">Mô tả sự việc</h3>
      <p className="letter">{report.description}</p>
      {report.immediateAction && <><h3 className="form-section">Xử lý ban đầu</h3><p className="letter">{report.immediateAction}</p></>}
      {report.suggestion && <><h3 className="form-section">Đề xuất, kiến nghị</h3><p className="letter">{report.suggestion}</p></>}
    </>
  );
}

export default function ReviewPage() {
  const { role, cases, open, markReviewed, loadSamples, reset } = useDemo();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [opened, setOpened] = useState<{ id: string; report?: Report; error?: string } | null>(null);

  const view = async (c: Case) => {
    try {
      setOpened({ id: c.id, report: await open(c) });
    } catch (e) {
      setOpened({ id: c.id, error: (e as Error).message || "không mở được báo cáo" });
    }
  };

  if (role !== "reviewer") {
    return (
      <section className="card locked-card denied-card reveal">
        <span className="role-icon"><Icon d={ICONS.ban} /></span>
        <div>
          <h2>Từ chối truy cập</h2>
          <p className="muted">
            {role === "reporter"
              ? "Người báo cáo chỉ gửi được báo cáo, không xem được danh sách hay nội dung đã gửi."
              : "Bạn không có vai trò người thẩm định độc lập."}{" "}
            Vai trò thẩm định chỉ được cấp khi nhóm quản trị cùng phê duyệt.
          </p>
        </div>
      </section>
    );
  }

  const shown = [...cases].reverse().filter((c) => filter === "ALL" || c.status === filter);

  return (
    <>
      <section className="card reveal">
        <div className="panel-head">
          <div className="tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>
                {f.label} <span className="tab-count">{f.id === "ALL" ? cases.length : cases.filter((c) => c.status === f.id).length}</span>
              </button>
            ))}
          </div>
          <span className="muted">Danh sách chỉ hiện mã hồ sơ, thời gian nhận và trạng thái</span>
        </div>
        {shown.length === 0 ? (
          <p className="muted empty-state">Không có hồ sơ nào trong mục này.</p>
        ) : (
          <table>
            <thead><tr><th>Mã hồ sơ</th><th>Thời điểm nhận</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className={opened?.id === c.id ? "selected" : ""}>
                  <td className="mono">{c.id}</td>
                  <td>{new Date(c.createdAt).toLocaleString("vi-VN")}</td>
                  <td><span className={`badge ${c.status.toLowerCase()}`}>{STATUS_LABELS[c.status]}</span></td>
                  <td className="row actions">
                    <button onClick={() => view(c)}><Icon d={ICONS.eye} />Xem báo cáo</button>
                    {c.status !== "REVIEWED" && <button className="secondary" onClick={() => markReviewed(c.id)}>Đánh dấu đã xem xét</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {opened && (
        <section className="card report-view reveal">
          {opened.report
            ? <ReportView id={opened.id} report={opened.report} />
            : <p className="bad">Không mở được báo cáo: {opened.error}</p>}
          <div className="row form-actions">
            <button className="secondary" onClick={() => setOpened(null)}>Đóng</button>
          </div>
        </section>
      )}

      <p className="row reset-row">
        <button className="secondary" onClick={loadSamples}>Nạp dữ liệu mẫu</button>
        <button className="secondary" onClick={() => { reset(); setOpened(null); }}>Xóa dữ liệu demo</button>
      </p>
    </>
  );
}
