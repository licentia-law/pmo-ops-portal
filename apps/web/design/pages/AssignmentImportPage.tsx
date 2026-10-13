"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PmoShell } from "../components/PmoShell";
import { applyAssignmentImport, downloadAssignmentImport, getAssignmentImportStatus, getMyCapabilities, validateAssignmentImport,
  type AssignmentImportPreview, type AssignmentImportStatus, type UserCapabilitiesRecord } from "../../app/lib/api";
import { PERSONNEL_TYPES, ASSIGNMENT_STATUSES, labelFor } from "@pmo/shared-types";

export default function AssignmentImportPage() {
  const [access, setAccess] = useState<UserCapabilitiesRecord | null>(null);
  const [status, setStatus] = useState<AssignmentImportStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AssignmentImportPreview | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([getMyCapabilities(), getAssignmentImportStatus()]).then(([user, result]) => {
      if (active) { setAccess(user.data); setStatus(result.data); }
    }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "권한과 상태 조회 실패"); });
    return () => { active = false; };
  }, []);
  const open = Boolean(status?.enabled && !status.completed);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "작업에 실패했습니다."); }
    finally { setBusy(false); }
  }
  async function validate() {
    if (!file) return;
    setPreview(null); setAck(false); setNotice("");
    await run(async () => { setPreview((await validateAssignmentImport(file)).data); });
  }
  async function apply() {
    if (!preview || !ack) return;
    await run(async () => {
      const result = (await applyAssignmentImport(preview)).data;
      setNotice(result.message);
      setStatus({ enabled: true, completed: true, message: result.message, completion: result });
      setPreview(null); setFile(null); setAck(false);
    });
  }
  return <PmoShell currentId="admin-data-backup" pageTitle="최초 투입 배정 전환"
    user={{ name: access?.name ?? "사용자", team: "PMO본부", role: "", permission: access?.permission, capabilities: access?.capabilities }}>
    <section className="pmo-panel" style={{ padding: 24, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>최초 투입 배정 전환</h2>
      <p>프로젝트·인력 마스터를 먼저 등록하고, 기존 엑셀의 배정 정보를 전환 양식에 옮겨 주세요. 이 도구는 한 데이터에 한 번만 사용합니다.</p>
      <p>기존 배정·이력은 유지합니다. 새 배정의 과거 MM과 누락된 PMO 재직 MM·KPI를 생성하며, 기존 과거 원장·스냅샷·KPI는 보존합니다. PMO KPI에는 PMO 유형만 포함됩니다.</p>
      <Link href="/admin/data-backup">백업/복원으로 돌아가기</Link>
      {error && <p role="alert" style={{ color: "var(--crit)" }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!status && !error && <p>권한과 전환 상태를 확인하고 있습니다.</p>}
      {status && <p>{status.message}</p>}
      {status?.completion && <div><p>완료 파일: {status.completion.file_name} · 반영 {status.completion.counts.assignments_created}건</p><p>복구용 사전 백업: {status.completion.pre_backup_id}</p><p>재전환이 필요하면 전환 전 백업으로 복원하여 데이터 상태를 먼저 확인해 주세요.</p></div>}
      {open && <>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="pmo-btn" disabled={busy} onClick={() => void run(async () => downloadAssignmentImport("template"))}>전환 양식 다운로드</button>
          <button className="pmo-btn" disabled={busy} onClick={() => void run(async () => downloadAssignmentImport("references"))}>인력 UUID·프로젝트 코드·입력 안내 다운로드</button>
        </div>
        <label>전환 파일 (.xlsx)<input type="file" accept=".xlsx" disabled={busy} onChange={(event) => {
          setFile(event.target.files?.[0] ?? null); setPreview(null); setAck(false); setError(""); setNotice("");
        }} /></label>
        <button className="pmo-btn" disabled={busy || !file} onClick={() => void validate()}>{busy ? "처리 중…" : "파일 검증"}</button>
        {preview && <>
          <p>검증 결과: 추가 {preview.summary.new}건 · 오류 {preview.summary.error}건 · {preview.file_name}</p>
          <p style={{ overflowWrap: "anywhere" }}>파일 SHA-256: {preview.file_sha256}</p>
          {preview.issues.map((issue, index) => <p role="alert" key={index} style={{ color: "var(--crit)" }}>{issue.row_number}행: {issue.message}</p>)}
          <div style={{ overflow: "auto", maxHeight: 400 }}><table className="pmo-table"><thead><tr><th>행 / 배정키</th><th>프로젝트</th><th>인력 / 유형</th><th>상태</th><th>월 기준 MM</th><th>주의사항</th></tr></thead><tbody>
            {preview.rows.map((row) => <tr key={row.row_number}><td>{row.row_number} / {row.source_key}</td><td>{row.project_code}</td><td>{row.personnel_name} / {labelFor(PERSONNEL_TYPES, row.personnel_type)}</td><td>{labelFor(ASSIGNMENT_STATUSES, row.assignment_status)}</td><td>{row.monthly_base_mm}</td><td>{row.warnings.join(" / ") || "-"}</td></tr>)}
          </tbody></table></div>
          <label><input type="checkbox" checked={ack} disabled={busy || preview.summary.error > 0} onChange={(event) => setAck(event.target.checked)} /> 주의사항·과거 데이터 보존·1회 반영을 확인했습니다. 반영 전에 자동 백업합니다.</label>
          <button className="pmo-btn" disabled={busy || !ack || preview.summary.error > 0} onClick={() => void apply()}>백업 후 1회 반영</button>
        </>}
      </>}
    </section>
  </PmoShell>;
}
