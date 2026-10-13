"use client";

import { useRef, useState } from "react";
import {
  type MasterExcelPreview, type ApiEnvelope
} from "../../app/lib/api";

const ACTION_LABELS = { new: "신규", update: "수정", unchanged: "동일", error: "오류" };
type MissingAction = "keep" | "deactivate";

export default function MasterWorkbookImportModal({ kind, description, validateWorkbook, applyWorkbook, downloadTemplate, onClose, onApplied }: {
  kind: "프로젝트" | "인력";
  description: string;
  validateWorkbook: (file: File) => Promise<ApiEnvelope<MasterExcelPreview>>;
  applyWorkbook: (preview: MasterExcelPreview, actions: Record<string, MissingAction>) => Promise<ApiEnvelope<{ counts: Record<string, number>; message: string }>>;
  downloadTemplate: () => Promise<void>;
  onClose: () => void;
  onApplied: (message: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MasterExcelPreview | null>(null);
  const [missingActions, setMissingActions] = useState<Record<string, MissingAction>>({});
  const [bulkAction, setBulkAction] = useState<MissingAction>("keep");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileVersion = useRef(0);
  const appliedMessage = useRef<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowAction, setRowAction] = useState<"all" | keyof typeof ACTION_LABELS>("all");
  const rows = (preview?.rows ?? []).filter(row => rowAction === "all" || row.action === rowAction);
  const pageCount = Math.max(1, Math.ceil(rows.length / 50));
  const safePage = Math.min(page, pageCount);
  const deactivated = Object.values(missingActions).filter(action => action === "deactivate").length;

  const validate = async () => {
    if (!file) return;
    const version = fileVersion.current;
    setBusy(true); setError(null); setPreview(null); setConfirmed(false);
    try {
      const result = await validateWorkbook(file);
      if (version !== fileVersion.current) return;
      setPreview(result.data);
      setMissingActions(Object.fromEntries(result.data.missing.map(row => [row.code, "keep"])));
      setPage(1); setRowAction("all");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "엑셀 검증에 실패했습니다.");
    } finally { setBusy(false); }
  };

  const apply = async () => {
    if (!preview || !confirmed || preview.summary.error) return;
    setBusy(true); setError(null);
    try {
      const result = await applyWorkbook(preview, missingActions);
      appliedMessage.current = `${kind} 반영 완료: 신규 ${result.data.counts.new}건, 수정 ${result.data.counts.update}건, 동일 ${result.data.counts.unchanged}건, 비활성화 ${result.data.counts.deactivated}건. ${result.data.message}`;
      await onApplied(appliedMessage.current);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "반영에 실패했습니다.");
    } finally { setBusy(false); }
  };

  const selectMissing = (code: string, action: MissingAction) => {
    setMissingActions(previous => ({ ...previous, [code]: action }));
    setConfirmed(false);
  };

  return <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <section role="dialog" aria-modal="true" aria-label={`${kind} 엑셀 업로드`} className="pmo-panel" style={{ width: "min(1160px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line-2)" }}>
        <h2 style={{ margin: 0, fontSize: 19 }}>{kind} 엑셀 업로드</h2>
        <button className="pmo-btn" disabled={busy} onClick={onClose}>닫기</button>
      </header>
      <div style={{ overflow: "auto", padding: 20 }}>
        <p style={{ marginTop: 0, color: "var(--tx-3)", fontSize: 13 }}>{description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input type="file" accept=".xlsx" disabled={busy || !!appliedMessage.current} aria-label={`${kind} 엑셀 파일`} onChange={event => {
            fileVersion.current += 1;
            setFile(event.target.files?.[0] ?? null); setPreview(null); setMissingActions({}); setConfirmed(false); setError(null);
          }} />
          <button className="pmo-btn" disabled={busy} onClick={async () => {
            setError(null);
            try { await downloadTemplate(); } catch (caught) { setError(caught instanceof Error ? caught.message : "템플릿 다운로드에 실패했습니다."); }
          }}>템플릿 다운로드</button>
          <button className="pmo-btn pmo-btn-primary" disabled={!file || busy || !!appliedMessage.current} onClick={() => void validate()}>{busy ? "처리 중…" : "파일 검증"}</button>
        </div>
        {error && <p role="alert" style={{ color: "var(--crit)", fontSize: 13 }}>{error}</p>}
        {appliedMessage.current && <p role="status">{appliedMessage.current} 목록 재조회에 실패했다면 창을 닫고 화면을 새로고침해 주세요.</p>}
        {preview && <>
          <div style={{ display: "flex", gap: 16, margin: "18px 0", fontWeight: 700 }}>
            {(Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>).map(action => <span key={action}>{ACTION_LABELS[action]} {preview.summary[action]}건</span>)}
          </div>
          {preview.warnings.map(warning => <p key={warning} style={{ fontSize: 12.5, color: "var(--tx-3)" }}>{warning}</p>)}
          {preview.issues.length > 0 && <div role="alert" style={{ border: "1px solid var(--crit)", padding: 12, maxHeight: 180, overflow: "auto" }}>
            {preview.issues.map((issue, index) => <div key={index} style={{ fontSize: 13 }}>{issue.row_number}행 · {issue.column}: {issue.message}</div>)}
          </div>}
          <h3 style={{ fontSize: 15 }}>반영 미리보기</h3>
          <select aria-label="미리보기 분류" value={rowAction} onChange={event => { setRowAction(event.target.value as typeof rowAction); setPage(1); }}>
            <option value="all">전체</option>
            {Object.entries(ACTION_LABELS).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
          </select>
          <table className="pmo-table" style={{ width: "100%", marginTop: 10 }}>
            <thead><tr><th>행</th><th>분류</th><th>식별자</th><th>사업명</th><th>변경 내용</th></tr></thead>
            <tbody>{rows.slice((safePage - 1) * 50, safePage * 50).map(row => <tr key={row.row_number}>
              <td>{row.row_number}</td><td>{ACTION_LABELS[row.action]}</td><td>{row.code}</td><td>{row.name}</td>
              <td style={{ whiteSpace: "normal" }}>{row.changes.map(change => `${change.field}: ${String(change.before ?? "빈 값")} → ${String(change.after ?? "빈 값")}`).join(" / ") || "변경 없음"}</td>
            </tr>)}</tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button className="pmo-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>이전</button><span>{safePage} / {pageCount}</span>
            <button className="pmo-btn" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>다음</button>
          </div>
          <h3 style={{ fontSize: 15 }}>파일에 없는 기존 {kind} {preview.missing.length}건</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select aria-label="누락 데이터 일괄 처리" value={bulkAction} disabled={busy} onChange={event => setBulkAction(event.target.value as MissingAction)}>
              <option value="keep">유지</option><option value="deactivate">삭제(비활성화)</option>
            </select>
            <button className="pmo-btn" disabled={busy} onClick={() => {
              setMissingActions(Object.fromEntries(preview.missing.map(row => [row.code, bulkAction]))); setConfirmed(false);
            }}>누락 목록 전체에 적용</button>
            <span style={{ fontSize: 13 }}>비활성화 선택 {deactivated}건</span>
          </div>
          <div style={{ maxHeight: 240, overflow: "auto", marginTop: 10 }}>
            <table className="pmo-table" style={{ width: "100%" }}><thead><tr><th>식별자</th><th>사업명</th><th>현재 사용여부</th><th>처리</th></tr></thead>
              <tbody>{preview.missing.map(row => <tr key={row.code}><td>{row.code}</td><td>{row.name}</td><td>{row.is_active ? "사용" : "미사용"}</td><td>
                <select aria-label={`${row.code} 누락 처리`} value={missingActions[row.code] ?? "keep"} disabled={busy} onChange={event => selectMissing(row.code, event.target.value as MissingAction)}><option value="keep">유지</option><option value="deactivate">삭제(비활성화)</option></select>
              </td></tr>)}</tbody>
            </table>
          </div>
        </>}
      </div>
      <footer style={{ padding: "14px 20px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <label style={{ fontSize: 13 }}><input type="checkbox" disabled={!preview || busy || !!preview?.summary.error || !!appliedMessage.current} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> 신규·수정 및 누락 데이터 처리 내용을 확인했습니다.</label>
        <button className="pmo-btn pmo-btn-primary" disabled={!preview || !!preview.summary.error || !confirmed || busy || !!appliedMessage.current} onClick={() => void apply()}>{kind} 반영</button>
      </footer>
    </section>
  </div>;
}
