"use client";

import { useEffect, useState } from "react";
import { updateProject } from "../../app/lib/api";

type ProjectEditModel = {
  id: string;
  code: string;
  name: string;
  salesDept: string;
  salesOwner: string;
  proposalPm: string;
  presentPm: string;
  deliveryPm: string;
  bidNoticeNo: string;
  memo: string;
};

function norm(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  return v === "-" ? "" : v;
}

export default function ProjectEditModal({
  open,
  project,
  onClose,
  onSaved,
}: {
  open: boolean;
  project: ProjectEditModel | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<ProjectEditModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    setForm({
      ...project,
      name: norm(project.name),
      salesDept: norm(project.salesDept),
      salesOwner: norm(project.salesOwner),
      proposalPm: norm(project.proposalPm),
      presentPm: norm(project.presentPm),
      deliveryPm: norm(project.deliveryPm),
      bidNoticeNo: norm(project.bidNoticeNo),
      memo: norm(project.memo),
    });
    setError(null);
  }, [open, project]);

  if (!open || !form) return null;

  const save = async () => {
    if (!form.name.trim()) {
      setError("프로젝트명은 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProject(form.id, {
        name: form.name.trim(),
        sales_department: form.salesDept.trim() || null,
        sales_owner: form.salesOwner.trim() || null,
        proposal_pm_name: form.proposalPm.trim() || null,
        presentation_pm_name: form.presentPm.trim() || null,
        delivery_pm_name: form.deliveryPm.trim() || null,
        bid_notice_no: form.bidNoticeNo.trim() || null,
        memo: form.memo.trim() || null,
      } as any);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(1200px, 92vw)", height: "88vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto", background: "#ffffff", zIndex: 5, padding: "14px 20px 10px", borderBottom: "1px solid var(--line-2)", boxShadow: "0 2px 10px rgba(15,23,42,.06)" }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>프로젝트 편집</h3>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px 12px" }}>
          <section className="pmo-panel" style={{ padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)" }}>프로젝트 기본정보</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field"><span>코드</span><input value={form.code} readOnly /></label>
              <label className="pmo-field"><span>프로젝트명</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="pmo-field"><span>공고번호</span><input value={form.bidNoticeNo} onChange={(e) => setForm({ ...form, bidNoticeNo: e.target.value })} /></label>
              <label className="pmo-field"><span>영업부서</span><input value={form.salesDept} onChange={(e) => setForm({ ...form, salesDept: e.target.value })} /></label>
            </div>
          </section>
          <section className="pmo-panel" style={{ padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)" }}>인력 목록</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <label className="pmo-field"><span>영업대표</span><input value={form.salesOwner} onChange={(e) => setForm({ ...form, salesOwner: e.target.value })} /></label>
              <div />
              <div />
              <label className="pmo-field"><span>제안PM</span><input value={form.proposalPm} onChange={(e) => setForm({ ...form, proposalPm: e.target.value })} /></label>
              <label className="pmo-field"><span>발표PM</span><input value={form.presentPm} onChange={(e) => setForm({ ...form, presentPm: e.target.value })} /></label>
              <label className="pmo-field"><span>수행PM</span><input value={form.deliveryPm} onChange={(e) => setForm({ ...form, deliveryPm: e.target.value })} /></label>
            </div>
          </section>
          <section className="pmo-panel" style={{ padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)" }}>기타</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              <div />
              <label className="pmo-field" style={{ gridColumn: "2 / 5" }}>
                <span>메모</span>
                <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="사업 관련 특이사항 기입" style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }} />
              </label>
            </div>
          </section>
          {error ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 600 }}>{error}</div> : null}
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button className="pmo-btn" onClick={onClose} disabled={saving}>취소</button>
          <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={() => void save()} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </aside>
    </div>
  );
}
