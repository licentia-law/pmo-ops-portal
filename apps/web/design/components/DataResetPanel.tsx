"use client";

import { useEffect, useState } from "react";
import { getDataResetPreview, resetBusinessData, type DataResetPreview, type DataResetResult } from "../../app/lib/api";

const labels: Record<string, string> = {
  personnel: "인력", project_codes: "프로젝트 코드", projects: "프로젝트", project_assignments: "투입 배정", project_logs: "진행이력",
  monthly_employment_mm: "월별 재직 MM", monthly_assignment_mm: "월별 투입 MM", current_assignment_snapshots: "현재 스냅샷",
  weekly_load_snapshots: "주간 스냅샷", monthly_kpi_summaries: "월별 KPI"
};
const errorText = (error: unknown) => error instanceof Error ? error.message : "초기화 처리에 실패했습니다.";

export default function DataResetPanel({ allowed, refreshToken, onReset, result, formatTime, authorizationError }: {
  allowed: boolean; refreshToken: number; onReset: (result: DataResetResult) => void; result: DataResetResult | null;
  formatTime: (value: string) => string; authorizationError: string | null;
}) {
  const [preview, setPreview] = useState<DataResetPreview | null>(null);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true); setPreview(null); setDialog(false); setConfirmation(""); setError("");
    void getDataResetPreview().then((response) => { if (active) setPreview(response.data); })
      .catch((failure: unknown) => { if (active) setError(errorText(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, refreshToken, reload]);
  async function execute() {
    if (!preview?.validation_id || confirmation !== preview.confirmation_phrase || busy) return;
    setBusy(true); setError("");
    try {
      const response = await resetBusinessData(preview, confirmation, memo);
      setDialog(false); setConfirmation(""); setMemo("");
      setPreview(null); onReset(response.data); setReload((value) => value + 1);
    } catch (failure) {
      setError(errorText(failure)); setPreview(null); setDialog(false); setConfirmation("");
    } finally { setBusy(false); }
  }
  return <section className="pmo-panel" style={{ padding: 20, borderColor: "#fecaca", background: "#fff7f7" }}>
    <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#b91c1c" }}>위험 작업 — 업무 데이터 전체 초기화</h2>
    <p>프로젝트·인력·투입 배정·진행이력·MM·스냅샷·KPI를 모두 삭제합니다. 사용자·권한·역할·공휴일·백업 파일·작업 이력은 유지합니다.</p>
    {!allowed ? <p>{authorizationError ? `초기화 권한 확인에 실패했습니다. 페이지를 새로고침해 주세요. ${authorizationError}` : "개발자 또는 지정된 시스템 관리자의 초기화 및 백업/복원 권한이 필요합니다."}</p> : <>
      {loading && <p>초기화 대상과 건수를 확인하고 있습니다.</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {result && <div role="status"><p>{result.message}</p><p>복구용 자동 백업: <strong>{result.pre_backup_id}</strong> · 삭제 {Object.values(result.deleted_counts).reduce((sum, value) => sum + value, 0).toLocaleString()}건</p><p>복구하려면 위의 데이터 복원 영역에서 이 백업을 선택해 주세요.</p></div>}
      {preview && <>
        <p>{preview.message}</p>
        <div style={{ overflowX: "auto", marginBottom: 12 }}><table className="pmo-table"><thead><tr><th>초기화 대상</th><th>현재 건수</th></tr></thead><tbody>
          {Object.entries(preview.counts).map(([table, count]) => <tr key={table}><td>{labels[table] ?? table}</td><td>{count.toLocaleString()}건</td></tr>)}
        </tbody></table></div>
        <p>총 {preview.total.toLocaleString()}건 · 실행 직전 자동 백업이 성공해야 초기화합니다.</p>
        <button className="pmo-btn" style={{ color: "#fff", background: "#b91c1c", borderColor: "#b91c1c" }}
          disabled={busy || loading || !preview.enabled || !preview.validation_id || preview.total === 0}
          onClick={() => { setDialog(true); setConfirmation(""); setError(""); }}>업무 데이터 전체 초기화</button>
      </>}
      <button className="pmo-btn" style={{ marginLeft: 10 }} disabled={busy || loading} onClick={() => setReload((value) => value + 1)}>대상 및 이력 새로고침</button>
      {preview && preview.history.length > 0 && <div style={{ marginTop: 18, overflowX: "auto" }}>
        <h3>초기화 감사 이력</h3><table className="pmo-table" style={{ minWidth: 800 }}><thead><tr><th>시각</th><th>작업자</th><th>결과</th><th>복구용 백업</th><th>메시지</th></tr></thead><tbody>
          {preview.history.map((row) => <tr key={row.id}><td>{formatTime(row.created_at)}</td><td>{row.actor_name}</td><td>{row.status === "success" ? "완료" : "실패 / 롤백"}</td><td>{row.pre_backup_id ?? "-"}</td><td style={{ whiteSpace: "normal", minWidth: 260 }}>{row.message}</td></tr>)}
        </tbody></table></div>}
    </>}
    {dialog && preview && <div role="dialog" aria-modal="true" aria-labelledby="data-reset-title" style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="pmo-panel" style={{ padding: 24, width: "min(600px, 100%)", maxHeight: "90vh", overflowY: "auto", borderColor: "#fecaca" }}>
        <h3 id="data-reset-title" style={{ color: "#b91c1c" }}>업무 데이터 전체 초기화 확인</h3>
        <p>표시된 {Object.keys(preview.counts).length}개 업무 테이블의 총 <strong>{preview.total.toLocaleString()}건</strong>을 삭제합니다. 자동 백업을 남기며 복구는 백업/복원에서 수행합니다.</p>
        <p>확인 문구를 직접 입력해 주세요: <strong>{preview.confirmation_phrase}</strong></p>
        <label style={{ display: "grid", gap: 6 }}>확인 문구<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" /></label>
        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>초기화 메모 (선택)<textarea value={memo} onChange={(event) => setMemo(event.target.value)} disabled={busy} maxLength={1000} /></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="pmo-btn" disabled={busy} onClick={() => { setDialog(false); setConfirmation(""); }}>취소</button>
          <button className="pmo-btn" style={{ color: "#fff", background: "#b91c1c", borderColor: "#b91c1c" }} disabled={busy || confirmation !== preview.confirmation_phrase}
            onClick={() => void execute()}>{busy ? "자동 백업 및 초기화 중…" : "자동 백업 후 전체 초기화"}</button>
        </div>
      </div>
    </div>}
  </section>;
}
