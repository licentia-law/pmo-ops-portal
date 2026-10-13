"use client";

import { useCallback, useEffect, useState } from "react";
import { ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES, PROJECT_ASSIGNMENT_ROLES, WORK_LOCATION_TYPES, PERSONNEL_TYPES, labelFor,
  type AssignmentTypeCode, type AssignmentStatusCode, type ProjectAssignmentRoleCode, type WorkLocationTypeCode } from "@pmo/shared-types";
import { getMyCapabilities, getDevUserContext, getProjectAssignments, getAssignmentCandidates, validateAssignment, saveAssignment,
  type AssignmentCandidate, type AssignmentRecord, type AssignmentInput, type AssignmentPreview } from "../../app/lib/api";

const roleType: Record<ProjectAssignmentRoleCode, AssignmentTypeCode> = {
  proposal_pm: "proposal", presentation_pm: "proposal", proposal_team: "proposal",
  delivery_pm: "delivery", delivery_team: "delivery", support_team: "support"
};
const errorText = (error: unknown) => error instanceof Error ? error.message : "배정 처리에 실패했습니다.";
const personnelLabel = (row: AssignmentRecord) => row.personnel_type ? labelFor(PERSONNEL_TYPES, row.personnel_type) : "참조 인력 없음";
const localToday = () => {
  const day = new Date();
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};

type Form = {
  personnel: string; type: AssignmentTypeCode; role: ProjectAssignmentRoleCode | ""; status: AssignmentStatusCode | "";
  start: string; end: string; base: string; rate: string; location: string; primary: boolean; sequence: string; note: string;
};
const initialForm = (row?: AssignmentRecord): Form => ({
  personnel: row?.personnel_id ?? "", type: row?.assignment_type ?? "delivery", role: row?.assignment_role ?? "",
  status: row ? row.assignment_status ?? "" : "planned", start: row ? row.start_date ?? "" : localToday(), end: row?.end_date ?? "",
  base: row ? row.monthly_base_mm === null ? "" : String(row.monthly_base_mm) : "1",
  rate: row?.certainty_rate === null || row?.certainty_rate === undefined ? "" : String(row.certainty_rate),
  location: row?.onsite_type ?? "", primary: row?.is_primary ?? false, sequence: row?.sequence_no === null || !row ? "0" : String(row.sequence_no), note: row?.note ?? ""
});

function AssignmentModal({ projectId, row, version, onClose, onSaved }: {
  projectId: string; row?: AssignmentRecord; version: string; onClose: () => void; onSaved: (message: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Form>(() => initialForm(row));
  const [candidates, setCandidates] = useState<AssignmentCandidate[]>([]);
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (row) return;
    let active = true;
    getAssignmentCandidates().then(result => { if (active) setCandidates(result.data); }).catch(error => { if (active) setError(errorText(error)); });
    return () => { active = false; };
  }, [row]);
  const change = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(current => ({ ...current, [key]: value, ...(key === "type" ? { role: "" as const, ...(value === "unassigned" ? { base: "0" } : {}) } : {}) }));
    setPreview(null); setConfirmed(false); setError(null);
  };
  const payload = (): AssignmentInput => {
    const original = initialForm(row);
    const input: AssignmentInput = { expected_version: preview?.version ?? version };
    if (!row && !form.personnel) throw new Error("인력을 선택해 주세요.");
    if (!row) { input.project_id = projectId; input.personnel_id = form.personnel; }
    if (!row || form.type !== original.type) input.assignment_type = form.type;
    if (!row || form.role !== original.role) input.assignment_role = form.role || null;
    if (!row || form.status !== original.status) {
      if (!form.status) throw new Error("배정 상태를 선택해 주세요.");
      input.assignment_status = form.status;
    }
    if (!row || form.start !== original.start) input.start_date = form.start;
    if (!row || form.end !== original.end) input.end_date = form.end;
    if (!row || form.base !== original.base) {
      if (!form.base.trim()) throw new Error("월 기준 MM을 입력해 주세요.");
      input.monthly_base_mm = Number(form.base);
    }
    if (!row || form.rate !== original.rate) input.certainty_rate = form.rate ? Number(form.rate) : null;
    if (!row || form.location !== original.location) input.onsite_type = (form.location || null) as WorkLocationTypeCode | null;
    if (!row || form.primary !== original.primary) input.is_primary = form.primary;
    if (!row || form.sequence !== original.sequence) input.sequence_no = Number(form.sequence);
    if (!row || form.note !== original.note) input.note = form.note.trim() || null;
    const changesProjection = ["assignment_type", "assignment_status", "start_date", "end_date", "monthly_base_mm", "certainty_rate", "is_primary"].some(key => key in input);
    if (changesProjection && (!form.start || !form.end)) throw new Error("시작일과 종료일을 입력해 주세요.");
    if (form.start && form.end && form.end < form.start) throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
    if (input.monthly_base_mm !== undefined && (!Number.isFinite(input.monthly_base_mm) || input.monthly_base_mm < 0 || input.monthly_base_mm > 9999.99)) throw new Error("월 기준 MM은 0~9999.99로 입력해 주세요.");
    if (input.certainty_rate != null && (!Number.isFinite(input.certainty_rate) || input.certainty_rate < 0 || input.certainty_rate > 100)) throw new Error("확도율은 0~100으로 입력해 주세요.");
    if (input.sequence_no !== undefined && (!form.sequence.trim() || !Number.isInteger(input.sequence_no) || input.sequence_no < 0 || input.sequence_no > 100000)) throw new Error("표시 순서는 0~100000의 정수로 입력해 주세요.");
    return input;
  };
  const validate = async () => {
    setBusy(true); setError(null); setPreview(null); setConfirmed(false);
    try { setPreview((await validateAssignment(payload(), row?.id)).data); }
    catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!preview || (preview.warnings.length > 0 && !confirmed)) return;
    setBusy(true); setError(null);
    try {
      const result = await saveAssignment({ ...payload(), expected_version: preview.version, acknowledge_warnings: confirmed }, row?.id);
      setSaved(true);
      await onSaved(result.data.message);
      onClose();
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  };
  const cancelAllowed = !!row && (row.assignment_status === "planned" || row.assignment_status === "cancelled" || !!row.start_date && row.start_date > localToday());
  const locked = busy || saved;
  return <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <section role="dialog" aria-modal="true" aria-label={`투입 인력 ${row ? "수정" : "등록"}`} className="pmo-panel" style={{ width: "min(840px, 96vw)", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 19 }}>투입 인력 {row ? "수정" : "등록"}</h2><button className="pmo-btn" disabled={busy} onClick={onClose}>닫기</button></header>
      <p style={{ fontSize: 13, color: "var(--tx-3)" }}>프로젝트 역할은 인력의 기본 역할과 별도로 저장됩니다. 과거 월의 MM·스냅샷·KPI는 보존합니다.</p>
      {row?.legacy_mm_input && <p style={{ fontSize: 13, color: "#92400e" }}>기존 배정: 월 기준 MM을 비워 두면 기존 계산 기준({row.effective_base_mm} MM)을 유지합니다.</p>}
      <fieldset disabled={locked} style={{ border: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <label className="pmo-field" style={{ gridColumn: "1 / -1" }}><span>인력</span>{row ? <input readOnly value={`${row.personnel_name} · ${personnelLabel(row)}`} /> : <select value={form.personnel} onChange={event => change("personnel", event.target.value)}><option value="">인력을 선택해 주세요</option>{candidates.map(person => <option key={person.id} value={person.id} disabled={!person.eligible}>{person.name} · {labelFor(PERSONNEL_TYPES, person.personnel_type)} · {person.group_name ?? "-"}/{person.team_name ?? "-"} · {person.employee_no ?? person.id.slice(0, 8)}{person.reason ? ` (${person.reason})` : ""}</option>)}</select>}</label>
        <label className="pmo-field"><span>배정 유형</span><select value={form.type} onChange={event => change("type", event.target.value as AssignmentTypeCode)}>{ASSIGNMENT_TYPES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="pmo-field"><span>프로젝트 역할</span><select value={form.role} onChange={event => change("role", event.target.value as Form["role"])}><option value="">미지정</option>{form.role && roleType[form.role] !== form.type && <option value={form.role}>기존 역할: {labelFor(PROJECT_ASSIGNMENT_ROLES, form.role)}</option>}{PROJECT_ASSIGNMENT_ROLES.filter(item => roleType[item.code] === form.type).map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="pmo-field"><span>배정 상태</span><select value={form.status} onChange={event => change("status", event.target.value as Form["status"])}>{row && row.assignment_status === null && <option value="">기존 상태 유지</option>}{ASSIGNMENT_STATUSES.filter(item => row?.assignment_status === "cancelled" ? item.code === "cancelled" : item.code !== "cancelled" || cancelAllowed).map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="pmo-field"><span>상주 유형</span><select value={form.location} onChange={event => change("location", event.target.value)}><option value="">미지정</option>{form.location && !WORK_LOCATION_TYPES.some(item => item.code === form.location) && <option value={form.location}>기존값: {form.location}</option>}{WORK_LOCATION_TYPES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="pmo-field"><span>시작일</span><input type="date" value={form.start} onChange={event => change("start", event.target.value)} /></label>
        <label className="pmo-field"><span>종료일</span><input type="date" value={form.end} onChange={event => change("end", event.target.value)} /></label>
        <label className="pmo-field"><span>월 기준 MM</span><input type="number" min="0" max="9999.99" step="0.01" placeholder={row?.legacy_mm_input ? "기존 계산 기준 유지" : "1"} value={form.base} onChange={event => change("base", event.target.value)} /></label>
        <label className="pmo-field"><span>확도율 (%) · 미지정 시 100%</span><input type="number" min="0" max="100" step="0.01" value={form.rate} onChange={event => change("rate", event.target.value)} /></label>
        <label className="pmo-field"><span>표시 순서</span><input type="number" min="0" max="100000" step="1" value={form.sequence} onChange={event => change("sequence", event.target.value)} /></label>
        <label style={{ alignSelf: "center", fontSize: 14 }}><input type="checkbox" checked={form.primary} onChange={event => change("primary", event.target.checked)} /> 대표 배정</label>
        <label className="pmo-field" style={{ gridColumn: "1 / -1" }}><span>비고</span><textarea maxLength={4000} rows={3} value={form.note} onChange={event => change("note", event.target.value)} /></label>
      </fieldset>
      {preview && <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", fontSize: 13 }}><strong>검증 완료 · 변경 항목 {preview.changes.length}개</strong>{preview.warnings.map(warning => <p key={warning} style={{ color: "#92400e" }}>{warning}</p>)}{preview.overlaps.map(overlap => <p key={overlap.id}>겹침: {overlap.project_code} · {overlap.start_date} ~ {overlap.end_date}</p>)}{preview.warnings.length > 0 && <label><input type="checkbox" disabled={locked} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> 주의사항과 중복 기간을 확인했습니다.</label>}</div>}
      {saved && <p role="status">저장은 완료되었습니다. 목록 갱신에 실패했다면 창을 닫고 다시 조회해 주세요.</p>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <footer style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}><button className="pmo-btn" disabled={locked} onClick={() => void validate()}>검증</button><button className="pmo-btn primary" disabled={locked || !preview || preview.warnings.length > 0 && !confirmed} onClick={() => void save()}>{busy ? "처리 중…" : "저장"}</button></footer>
    </section>
  </div>;
}

export default function ProjectAssignmentsPanel({ projectId, onSaved }: { projectId: string; onSaved: () => Promise<void> }) {
  const [rows, setRows] = useState<AssignmentRecord[]>([]);
  const [version, setVersion] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [canManage, setCanManage] = useState(false);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilityAccount, setCapabilityAccount] = useState("");
  const [capabilityRetry, setCapabilityRetry] = useState(0);
  const [editing, setEditing] = useState<AssignmentRecord | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await getProjectAssignments(projectId, page); setRows(result.data); setTotal(result.meta.total ?? 0); setVersion(String(result.meta.version ?? "")); }
    catch (error) { setError(errorText(error)); throw error; }
    finally { setLoading(false); }
  }, [projectId, page]);
  useEffect(() => { void load().catch(() => undefined); }, [load]);
  useEffect(() => {
    let active = true;
    setCapabilityLoading(true); setCapabilityError(null); setCanManage(false);
    setCapabilityAccount(getDevUserContext().email);
    getMyCapabilities().then(result => {
      if (!active) return;
      setCanManage(result.data.capabilities.includes("assignment_manage"));
      setCapabilityAccount(`${result.data.name} (${result.data.email})`);
    }).catch(error => {
      if (active) setCapabilityError(errorText(error));
    }).finally(() => { if (active) setCapabilityLoading(false); });
    return () => { active = false; };
  }, [capabilityRetry]);
  return <section className="pmo-panel" style={{ padding: 20, marginBottom: 16 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><h2 style={{ fontSize: 17, margin: 0 }}>투입 배정 관리 · {total}건</h2><div style={{ display: "flex", gap: 8 }}><button className="pmo-btn" disabled={loading} onClick={() => void load().catch(() => undefined)}>새로고침</button>{canManage && <button className="pmo-btn primary" disabled={loading || !!error} onClick={() => setEditing("new")}>투입 인력 등록</button>}</div></header>
    <p style={{ fontSize: 13, color: "var(--tx-3)" }}>인력별 요약과 별도로 모든 배정 기간과 종료·취소 이력을 표시합니다. PMO KPI에는 PMO본부 인력만 포함됩니다.</p>
    {capabilityLoading ? <p role="status" style={{ fontSize: 13 }}>투입 인력 관리 권한을 확인하고 있습니다.</p> : capabilityError ? <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
      <p>관리 권한을 확인하지 못했습니다. 현재 계정: {capabilityAccount}. {capabilityError}</p>
      <p>WEB 재시작 후 계정 설정과 API 연결을 확인해 주세요.</p>
      <button className="pmo-btn" onClick={() => setCapabilityRetry(value => value + 1)}>권한 다시 확인</button>
    </div> : <p style={{ fontSize: 13, color: "var(--tx-3)" }}>현재 계정: {capabilityAccount}{canManage ? " · 투입 인력 관리 가능" : " · 투입 인력 관리 권한이 없어 조회만 가능합니다."}</p>}
    {message && <p role="status" style={{ fontSize: 13 }}>{message}</p>}{error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
    <div style={{ overflowX: "auto" }}><table className="pmo-table" style={{ minWidth: 960 }}><thead><tr>{["인력 / 유형", "배정 / 역할", "상태", "기간", "월 기준 MM", "당월 투입 MM", "확도율", "대표 / 순서", "관리"].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td>{row.personnel_name}<div style={{ fontSize: 12, color: "var(--tx-3)" }}>{personnelLabel(row)}</div></td><td>{labelFor(ASSIGNMENT_TYPES, row.assignment_type)} / {row.assignment_role ? labelFor(PROJECT_ASSIGNMENT_ROLES, row.assignment_role) : "미지정"}</td>
      <td>{row.assignment_status ? labelFor(ASSIGNMENT_STATUSES, row.assignment_status) : "기존 상태"}{row.is_current ? " · 현재" : ""}</td><td>{row.start_date ?? "-"} ~ {row.end_date ?? "-"}</td><td>{row.monthly_base_mm ?? `${row.effective_base_mm} (기존)`}</td><td>{row.current_month_mm.toFixed(2)}</td><td>{row.certainty_rate ?? 100}%</td><td>{row.is_primary ? "대표" : "-"} / {row.sequence_no ?? "-"}</td><td>{canManage ? <button className="pmo-btn" disabled={loading || !row.project_id || !row.personnel_id} onClick={() => setEditing(row)}>수정</button> : capabilityLoading ? "확인 중" : capabilityError ? "권한 확인 실패" : "조회"}</td>
    </tr>)}{!rows.length && <tr><td colSpan={9}>{loading ? "불러오는 중…" : "등록된 배정이 없습니다."}</td></tr>}</tbody></table></div>
    <footer style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 12 }}><button className="pmo-btn" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(total / 20))}</span><button className="pmo-btn" disabled={loading || page * 20 >= total} onClick={() => setPage(page + 1)}>다음</button></footer>
    {editing && <AssignmentModal projectId={projectId} row={editing === "new" ? undefined : editing} version={version} onClose={() => setEditing(null)} onSaved={async message => { setMessage(message); await load(); await onSaved(); }} />}
  </section>;
}
