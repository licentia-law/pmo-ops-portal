"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  createPersonnel,
  getDevUserContext,
  listPersonnel,
  listRoles,
  updatePersonnel,
  type DevUserContext,
  type OrganizationRole,
  type PersonnelRecord,
  type RoleRecord,
  type UserPermission,
} from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";
import LightweightLoading from "../components/LightweightLoading";
import { downloadPersonnelWorkbook } from "./personnelWorkbookExport";

type EmploymentStatus = PersonnelRecord["employment_status"];
type SummaryKey = "all" | "active" | "leave" | "transferred" | "retired";
type UseStatus = "전체" | "사용" | "미사용";
type PeopleViewMode = "pmo" | "sales_owner";

type FilterForm = {
  q: string;
  teamName: string;
  useStatus: UseStatus;
};

type PersonnelForm = {
  employee_no: string;
  name: string;
  email: string;
  group_name: string;
  team_name: string;
  position_name: string;
  role_id: string;
  employment_status: EmploymentStatus;
  mm_start_date: string;
  mm_end_date: string;
  is_active: boolean;
  note: string;
};

type FieldErrorMap = Partial<Record<keyof PersonnelForm, string>>;

type SummaryItem = {
  id: SummaryKey;
  label: string;
  value: string;
  unit: string;
  icon: IconName;
  tone: string;
  fg: string;
};

type IconName = "search" | "plus" | "download" | "users" | "userCheck" | "clock" | "shuffle" | "userX" | "calculator" | "chevronRight" | "minus";

const ICONS: Record<IconName, string> = {
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  download: "M12 4v10M8 10l4 4 4-4M5 18h14",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  userCheck: "M16 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20.5c0-3.5 3-6 6.8-6 1.3 0 2.6.3 3.6.9M15.5 19l2 2 4-4",
  clock: "M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  shuffle: "M16 3h5v5M21 3l-7 7M8 17l-5 4m0-4 5 4M21 21l-7-7M8 7 3 3",
  userX: "M16 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM14.5 17.5l5 5M19.5 17.5l-5 5M2 20.5c0-3.5 3.1-6 7-6 1.1 0 2.1.2 3 .5",
  calculator: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1 4h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h8",
  chevronRight: "M9 6l6 6-6 6",
  minus: "M5 12h14",
};

const DEFAULT_FILTER: FilterForm = {
  q: "",
  teamName: "전체",
  useStatus: "전체",
};

const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: "재직",
  leave: "휴직",
  transferred: "전배",
  retired: "퇴직",
  waiting: "대기",
};

const EMPLOYMENT_STATUS_SELECT_OPTIONS: EmploymentStatus[] = ["active", "leave", "transferred", "retired"];

const STATUS_TONE: Record<EmploymentStatus, { fg: string; bg: string; line: string }> = {
  active: { fg: "#16a34a", bg: "#e7f8ee", line: "#b7e6c8" },
  leave: { fg: "#f97316", bg: "#fff1e7", line: "#ffd6bf" },
  transferred: { fg: "#6d28d9", bg: "#f1ebff", line: "#ddd0ff" },
  retired: { fg: "#ef4444", bg: "#ffe8ea", line: "#ffc6cd" },
  waiting: { fg: "#475569", bg: "#eef2f7", line: "#d9e2ec" },
};

const FILTER_SELECT_STYLE: CSSProperties = { height: 40, minWidth: 0, width: "100%", borderRadius: 8, fontSize: 14 };
const FILTER_INPUT_STYLE: CSSProperties = { height: 40, minWidth: 0, width: "100%", borderRadius: 8, fontSize: 14 };
const FORM_INPUT_STYLE: CSSProperties = { height: 40, minWidth: 0, width: "100%", borderRadius: 8 };
const GROUP_SECTION_STYLE: CSSProperties = { padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" };
const GROUP_TITLE_STYLE: CSSProperties = { margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)", letterSpacing: "0.01em" };
const POSITION_PRIORITY = ["전무", "상무", "이사", "수석", "책임", "선임", "주임", "사원"];
const ROLE_PRIORITY = ["PM", "PL"];

function Icon({ name, size = 16, stroke = 1.8, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

function toOptionValues(values: Array<string | null | undefined>) {
  return ["전체", ...Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko-KR"))];
}

function toChoiceValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function sortByPriority(values: Array<string | null | undefined>, priority: string[]) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }
    return a.localeCompare(b, "ko-KR");
  });
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string) {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function shortId(id: string | null | undefined) {
  if (!id) return "-";
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}...`;
}

function displayEmployeeNo(employeeNo: string | null | undefined, fallbackId?: string | null) {
  const trimmed = employeeNo?.trim() ?? "";
  if (/^\d{7}$/.test(trimmed)) return trimmed;
  if (/^\d{1,4}$/.test(trimmed)) return `2026${trimmed.padStart(3, "0")}`;
  if (trimmed) return trimmed;
  return fallbackId ? shortId(fallbackId) : "-";
}

function deriveUseStatus(row: PersonnelRecord): "사용" | "미사용" {
  return row.is_active === false ? "미사용" : "사용";
}

function requiredMark(label: string) {
  return <>{label} <span style={{ color: "var(--crit)", fontWeight: 800 }}>*</span></>;
}

function makeCreateForm(): PersonnelForm {
  return {
    employee_no: "",
    name: "",
    email: "",
    group_name: "PMO본부",
    team_name: "",
    position_name: "",
    role_id: "",
    employment_status: "active",
    mm_start_date: "",
    mm_end_date: "",
    is_active: true,
    note: "",
  };
}

function formFromRecord(row: PersonnelRecord): PersonnelForm {
  return {
    employee_no: row.employee_no ?? "",
    name: row.name ?? "",
    email: row.email ?? "",
    group_name: row.group_name ?? "",
    team_name: row.team_name ?? "",
    position_name: row.position_name ?? "",
    role_id: row.role_id ?? "",
    employment_status: row.employment_status,
    mm_start_date: row.mm_start_date ?? "",
    mm_end_date: row.mm_end_date ?? "",
    is_active: row.is_active !== false,
    note: row.note ?? "",
  };
}

function StatusBadge({ status }: { status: EmploymentStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, padding: "3px 10px", borderRadius: 10, background: tone.bg, color: tone.fg, border: `1px solid ${tone.line}`, fontSize: 14, fontWeight: 700 }}>
      {EMPLOYMENT_STATUS_LABEL[status]}
    </span>
  );
}

function UseBadge({ useStatus }: { useStatus: "사용" | "미사용" }) {
  const isActive = useStatus === "사용";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, padding: "3px 10px", borderRadius: 10, background: isActive ? "#e3f6ec" : "#eef1f6", color: isActive ? "#047857" : "#64748b", border: `1px solid ${isActive ? "#bce5cb" : "#e5e9f1"}`, fontSize: 14, fontWeight: 700 }}>
      {useStatus}
    </span>
  );
}

function SummaryCard({ item, active, onClick }: { item: SummaryItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pmo-panel"
      style={{
        textAlign: "left",
        padding: "20px 22px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        minHeight: 116,
        cursor: "pointer",
        border: active ? `1px solid ${item.fg}33` : "1px solid var(--line-2)",
        background: active ? `${item.fg}10` : "var(--bg-1)",
        boxShadow: active ? `0 0 0 1px ${item.fg}33 inset` : "none",
      }}
    >
      <span style={{ width: 56, height: 56, borderRadius: 16, background: item.tone, color: item.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
        <Icon name={item.icon} size={24} stroke={2} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 15, color: "var(--tx-3)", fontWeight: 700 }}>{item.label}</span>
        <span style={{ fontSize: 30, lineHeight: 1, fontWeight: 800, color: "var(--tx-1)" }}>{item.value}<span style={{ fontSize: 15, color: "var(--tx-4)", marginLeft: 4 }}>{item.unit}</span></span>
      </span>
    </button>
  );
}

function PersonnelEditModal({
  mode,
  open,
  row,
  roles,
  groupOptions,
  teamOptions,
  positionOptions,
  canEditFull,
  canChangeStatus,
  viewMode,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  open: boolean;
  row: PersonnelRecord | null;
  roles: RoleRecord[];
  groupOptions: string[];
  teamOptions: string[];
  positionOptions: string[];
  canEditFull: boolean;
  canChangeStatus: boolean;
  viewMode: PeopleViewMode;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<PersonnelForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const sortedRoles = useMemo(() => {
    const eligible = roles.filter((role) => role.is_active || role.id === form?.role_id);
    return [...eligible].sort((a, b) => {
      const aKey = a.code || a.name || "";
      const bKey = b.code || b.name || "";
      const ai = ROLE_PRIORITY.indexOf(aKey);
      const bi = ROLE_PRIORITY.indexOf(bKey);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      return aKey.localeCompare(bKey, "ko-KR");
    });
  }, [roles, form?.role_id]);

  useEffect(() => {
    if (!open) return;
    const initial = mode === "create" ? makeCreateForm() : row ? formFromRecord(row) : null;
    if (initial && mode === "create" && viewMode === "sales_owner") {
      initial.group_name = "";
      initial.role_id = roles.find((role) => role.code === "SALES_OWNER")?.id ?? "";
    }
    setForm(initial);
    setSaving(false);
    setSaveError(null);
    setFieldErrors({});
  }, [open, mode, row, roles, viewMode]);

  if (!open || !form) return null;

  const formDisabled = !canEditFull;
  const statusDisabled = mode === "create" ? !canEditFull : !canChangeStatus;
  const useStatusDisabled = !canEditFull;
  const clearFieldError = (key: keyof PersonnelForm) => setFieldErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
  const errorStyle = (key: keyof PersonnelForm): CSSProperties => fieldErrors[key] ? { borderColor: "var(--crit)", boxShadow: "0 0 0 1px var(--crit) inset" } : {};
  const labelStyle = (key: keyof PersonnelForm): CSSProperties => fieldErrors[key] ? { color: "var(--crit)" } : {};

  const setField = <K extends keyof PersonnelForm>(key: K, value: PersonnelForm[K]) => {
    clearFieldError(key);
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const scrollToField = (key: keyof PersonnelForm) => {
    const target = document.querySelector(`[data-personnel-field="${key}"]`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    (target?.querySelector("input, select") as HTMLElement | null)?.focus();
  };

  const validate = () => {
    const errors: FieldErrorMap = {};
    const isSalesOwner = roles.find((role) => role.id === form.role_id)?.code === "SALES_OWNER";
    if (!form.name.trim()) errors.name = "성명은(는) 필수입니다.";
    if (!form.group_name.trim()) errors.group_name = "본부는(는) 필수입니다.";
    if (!form.team_name.trim()) errors.team_name = "팀은(는) 필수입니다.";
    if (!form.position_name.trim()) errors.position_name = "직위는(는) 필수입니다.";
    if (!form.role_id.trim()) errors.role_id = "역할은 필수입니다.";
    if (isSalesOwner) {
      if (form.group_name.trim() === "PMO본부") errors.group_name = "영업대표의 본부는 PMO본부로 지정할 수 없습니다.";
    } else {
      if (!form.employee_no.trim()) errors.employee_no = "사번은(는) 필수입니다.";
      if (!form.email.trim()) errors.email = "이메일은(는) 필수입니다.";
      if (!form.employment_status.trim()) errors.employment_status = "재직 상태는 필수입니다.";
      if (!form.mm_start_date.trim()) errors.mm_start_date = "MM 시작일은(는) 필수입니다.";
    }
    const firstKey = (Object.keys(errors)[0] as keyof PersonnelForm | undefined) ?? null;
    return { errors, firstKey };
  };

  const save = async () => {
    const { errors, firstKey } = validate();
    if (firstKey) {
      setFieldErrors(errors);
      scrollToField(firstKey);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const isSalesOwner = roles.find((role) => role.id === form.role_id)?.code === "SALES_OWNER";
      const fullPayload: Partial<PersonnelRecord> = {
        employee_no: optional(form.employee_no),
        name: form.name.trim(),
        email: optional(form.email),
        group_name: form.group_name.trim(),
        team_name: optional(form.team_name),
        position_name: optional(form.position_name),
        role_id: optional(form.role_id),
        employment_status: isSalesOwner ? "active" : form.employment_status,
        mm_start_date: isSalesOwner ? null : optional(form.mm_start_date),
        mm_end_date: isSalesOwner ? null : optional(form.mm_end_date),
        yearly_mm: null,
        is_active: form.is_active,
        note: optional(form.note),
      };
      if (mode === "create") {
        await createPersonnel(fullPayload);
      } else if (row) {
        await updatePersonnel(row.id, canEditFull ? fullPayload : { employment_status: form.employment_status });
      }
      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const uniqueErrors = Object.entries(fieldErrors).filter(([, value]) => value) as Array<[keyof PersonnelForm, string]>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(1200px, 92vw)", height: "88vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "14px 20px 10px", borderBottom: "1px solid var(--line-2)", boxShadow: "0 2px 10px rgba(15,23,42,.06)", zIndex: 5 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{mode === "create" ? "신규 인력 등록" : "인력 편집"}</h3>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px 12px" }}>
          {uniqueErrors.length > 0 ? (
            <section className="pmo-panel" style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #fecaca", background: "#fff1f2" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>입력 확인 필요 항목 {uniqueErrors.length}건이 있습니다.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {uniqueErrors.map(([key, message]) => (
                  <button key={key} type="button" onClick={() => scrollToField(key)} style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{message}</button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>인력 기본정보</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-personnel-field="employee_no"><span style={labelStyle("employee_no")}>{requiredMark("사번")}</span><input disabled={formDisabled} value={form.employee_no} onChange={(e) => setField("employee_no", e.target.value)} placeholder="회사 사번 기입" style={{ ...FORM_INPUT_STYLE, ...errorStyle("employee_no") }} /></label>
              <label className="pmo-field" data-personnel-field="name"><span style={labelStyle("name")}>{requiredMark("성명")}</span><input disabled={formDisabled} value={form.name} onChange={(e) => setField("name", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("name") }} /></label>
              <label className="pmo-field" data-personnel-field="email"><span style={labelStyle("email")}>{requiredMark("이메일")}</span><input disabled={formDisabled} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="abcd@cmtinfo.co.kr" style={{ ...FORM_INPUT_STYLE, ...errorStyle("email") }} /></label>
              <label className="pmo-field" data-personnel-field="employment_status"><span style={labelStyle("employment_status")}>{requiredMark("재직 상태")}</span><select disabled={statusDisabled} value={form.employment_status} onChange={(e) => setField("employment_status", e.target.value as EmploymentStatus)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("employment_status") }}>{EMPLOYMENT_STATUS_SELECT_OPTIONS.map((code) => <option key={code} value={code}>{EMPLOYMENT_STATUS_LABEL[code]}</option>)}</select></label>
              <label className="pmo-field" data-personnel-field="group_name">
                <span style={labelStyle("group_name")}>{requiredMark("본부")}</span>
                <select disabled={formDisabled} value={form.group_name} onChange={(e) => setField("group_name", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("group_name") }}>
                  {groupOptions.includes(form.group_name) ? null : <option value={form.group_name}>{form.group_name || "선택 안함"}</option>}
                  {groupOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="pmo-field" data-personnel-field="team_name">
                <span style={labelStyle("team_name")}>{requiredMark("팀")}</span>
                <select disabled={formDisabled} value={form.team_name} onChange={(e) => setField("team_name", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("team_name") }}>
                  <option value="">선택 안함</option>
                  {teamOptions.includes(form.team_name) ? null : form.team_name ? <option value={form.team_name}>{form.team_name}</option> : null}
                  {teamOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="pmo-field" data-personnel-field="position_name">
                <span style={labelStyle("position_name")}>{requiredMark("직위")}</span>
                <select disabled={formDisabled} value={form.position_name} onChange={(e) => setField("position_name", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("position_name") }}>
                  <option value="">선택 안함</option>
                  {positionOptions.includes(form.position_name) ? null : form.position_name ? <option value={form.position_name}>{form.position_name}</option> : null}
                  {positionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="pmo-field" data-personnel-field="role_id" style={{ gridColumn: "4 / 5" }}><span style={labelStyle("role_id")}>{requiredMark("역할")}</span><select disabled={formDisabled} value={form.role_id} onChange={(e) => setField("role_id", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("role_id") }}><option value="">선택 안함</option>{sortedRoles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.job_group ? ` / ${role.job_group}` : ""}</option>)}</select></label>
            </div>
          </section>

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>재직/MM 기준</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-personnel-field="mm_start_date"><span style={labelStyle("mm_start_date")}>{requiredMark("MM 시작일")}</span><input disabled={formDisabled} type="date" value={form.mm_start_date} onChange={(e) => setField("mm_start_date", e.target.value)} style={{ ...FORM_INPUT_STYLE, ...errorStyle("mm_start_date") }} /></label>
              <label className="pmo-field"><span>MM 종료일</span><input disabled={formDisabled} type="date" value={form.mm_end_date} onChange={(e) => setField("mm_end_date", e.target.value)} style={FORM_INPUT_STYLE} /></label>
            </div>
          </section>

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>기타</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-personnel-field="is_active"><span>사용여부</span><select disabled={useStatusDisabled} value={form.is_active ? "사용" : "미사용"} onChange={(e) => setField("is_active", e.target.value === "사용")} style={FORM_INPUT_STYLE}><option value="사용">사용</option><option value="미사용">미사용</option></select></label>
              <label className="pmo-field" data-personnel-field="note" style={{ gridColumn: "2 / 5" }}><span>비고</span><input disabled={formDisabled} value={form.note} onChange={(e) => setField("note", e.target.value)} placeholder="특이 사항 기입" style={FORM_INPUT_STYLE} /></label>
            </div>
          </section>

          {saveError ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 700 }}>{saveError}</div> : null}
          {!canEditFull && canChangeStatus ? <div style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 600 }}>본부장 권한은 재직 상태만 변경할 수 있습니다.</div> : null}
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button className="pmo-btn" onClick={onClose} disabled={saving}>취소</button>
          <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={() => void save()} disabled={saving || (mode === "create" ? !canEditFull : !canChangeStatus)}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function PeopleEmploymentPage() {
  const [allRows, setAllRows] = useState<PersonnelRecord[]>([]);
  const [viewMode, setViewMode] = useState<PeopleViewMode>("pmo");
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [filterForm, setFilterForm] = useState<FilterForm>(DEFAULT_FILTER);
  const [appliedFilter, setAppliedFilter] = useState<FilterForm>(DEFAULT_FILTER);
  const [activeSummary, setActiveSummary] = useState<SummaryKey>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row: PersonnelRecord | null } | null>(null);
  const [userContext, setUserContext] = useState<DevUserContext | null>(null);
  const [downloadHover, setDownloadHover] = useState(false);

  useEffect(() => {
    setUserContext(getDevUserContext());
  }, []);

  const permission = userContext?.permission ?? ("admin" as UserPermission);
  const organizationRole = userContext?.organizationRole ?? ("other" as OrganizationRole);
  const canAccess = permission === "admin" || organizationRole === "head";
  const canCreate = permission === "admin";
  const canEditFull = permission === "admin";
  const canChangeStatus = permission === "admin" || organizationRole === "head";

  const loadAllPages = async <T,>(loader: (nextPage: number) => Promise<{ data: T[]; meta: { total?: number } }>) => {
    const rows: T[] = [];
    let currentPage = 1;
    let total = 0;
    do {
      const result = await loader(currentPage);
      rows.push(...result.data);
      total = Number(result.meta.total ?? rows.length);
      currentPage += 1;
    } while (rows.length < total);
    return rows;
  };

  const loadData = async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rows, rolesResult] = await Promise.allSettled([
        loadAllPages((nextPage) =>
          listPersonnel({
            page: nextPage,
            page_size: 100,
            sort: "name",
            scope: viewMode,
            q: appliedFilter.q.trim() || undefined,
            team_name: appliedFilter.teamName === "전체" ? undefined : appliedFilter.teamName,
            is_active:
              appliedFilter.useStatus === "전체"
                ? undefined
                : appliedFilter.useStatus === "사용",
          })
        ),
        loadAllPages((nextPage) => listRoles({ page: nextPage, page_size: 100, sort: "sort_order" })),
      ]);

      if (rows.status === "fulfilled") {
        setAllRows(rows.value);
      } else {
        setAllRows([]);
        throw rows.reason;
      }

      if (rolesResult.status === "fulfilled") {
        setRoles(rolesResult.value);
      } else {
        setRoles([]);
      }
    } catch (reason) {
      setAllRows([]);
      setRoles([]);
      setError(reason instanceof Error ? reason.message : "인력 관리 데이터를 조회하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilter, userContext, viewMode]);

  const teamOptions = useMemo(() => toOptionValues(allRows.map((row) => row.team_name)).filter((option) => option !== "기술지원팀"), [allRows]);
  const groupOptions = useMemo(() => toChoiceValues(allRows.map((row) => row.group_name)), [allRows]);
  const positionOptions = useMemo(() => sortByPriority([...allRows.map((row) => row.position_name), "전무", "상무"], POSITION_PRIORITY), [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (activeSummary !== "all" && row.employment_status !== activeSummary) return false;
      return true;
    });
  }, [allRows, activeSummary]);

  const sortedRows = useMemo(() => {
    const getPositionRank = (row: PersonnelRecord) => {
      const position = String(row.position_name ?? "").trim();
      const index = POSITION_PRIORITY.indexOf(position);
      return index === -1 ? 999 : index;
    };
    const getEmployeeNoRank = (row: PersonnelRecord) => {
      const displayNo = displayEmployeeNo(row.employee_no, row.id);
      const numeric = Number(displayNo.replace(/\D/g, ""));
      return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.MAX_SAFE_INTEGER;
    };
    return [...filteredRows].sort((a, b) => {
      const positionDiff = getPositionRank(a) - getPositionRank(b);
      if (positionDiff !== 0) return positionDiff;
      const employeeDiff = getEmployeeNoRank(a) - getEmployeeNoRank(b);
      if (employeeDiff !== 0) return employeeDiff;
      return displayEmployeeNo(a.employee_no, a.id).localeCompare(displayEmployeeNo(b.employee_no, b.id), "ko-KR");
    });
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const visiblePageNumbers = useMemo(() => {
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, safePage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const baseRows = allRows;
    if (viewMode === "sales_owner") return [
      { id: "all", label: "전체 후보", value: formatNumber(baseRows.length, 0), unit: "명", icon: "users", tone: "#e7f0ff", fg: "#2563eb" },
      { id: "all", label: "사용", value: formatNumber(baseRows.filter((row) => row.is_active !== false).length, 0), unit: "명", icon: "userCheck", tone: "#e7f8ee", fg: "#16a34a" },
      { id: "all", label: "미사용", value: formatNumber(baseRows.filter((row) => row.is_active === false).length, 0), unit: "명", icon: "userX", tone: "#eef1f6", fg: "#64748b" },
    ];
    const totalAnnualMm = baseRows.reduce((sum, row) => sum + Number(row.yearly_mm ?? 0), 0);
    return [
      { id: "all", label: "전체 인력", value: formatNumber(baseRows.length, 0), unit: "명", icon: "users", tone: "#e7f0ff", fg: "#2563eb" },
      { id: "active", label: "재직", value: formatNumber(baseRows.filter((row) => row.employment_status === "active").length, 0), unit: "명", icon: "userCheck", tone: "#e7f8ee", fg: "#16a34a" },
      { id: "leave", label: "휴직", value: formatNumber(baseRows.filter((row) => row.employment_status === "leave").length, 0), unit: "명", icon: "clock", tone: "#fff1e7", fg: "#f97316" },
      { id: "transferred", label: "전배", value: formatNumber(baseRows.filter((row) => row.employment_status === "transferred").length, 0), unit: "명", icon: "shuffle", tone: "#f1ebff", fg: "#6d28d9" },
      { id: "retired", label: "퇴직", value: formatNumber(baseRows.filter((row) => row.employment_status === "retired").length, 0), unit: "명", icon: "userX", tone: "#ffe8ea", fg: "#ef4444" },
      { id: "all", label: "연간 재직 MM", value: formatNumber(totalAnnualMm, 1), unit: "", icon: "calculator", tone: "#e7f0ff", fg: "#2563eb" },
    ];
  }, [allRows, appliedFilter.useStatus, viewMode]);

  const summaryFilterLabel = useMemo(() => {
    const labels: string[] = [];
    if (activeSummary !== "all") labels.push(`상태: ${EMPLOYMENT_STATUS_LABEL[activeSummary]}`);
    if (appliedFilter.teamName !== "전체") labels.push(`팀: ${appliedFilter.teamName}`);
    if (appliedFilter.useStatus !== "전체") labels.push(`사용여부: ${appliedFilter.useStatus}`);
    if (appliedFilter.q.trim()) labels.push(`검색어: ${appliedFilter.q.trim()}`);
    return labels.length ? labels.join(" · ") : null;
  }, [activeSummary, appliedFilter]);

  const applyFilters = () => {
    setAppliedFilter(filterForm);
    setPage(1);
  };

  const resetFilters = () => {
    setFilterForm(DEFAULT_FILTER);
    setAppliedFilter(DEFAULT_FILTER);
    setActiveSummary("all");
    setPage(1);
  };

  const downloadPeopleWorkbook = async () => {
    const normalizedRows = sortedRows.map((row) => ({
      employeeNo: displayEmployeeNo(row.employee_no, row.id),
      name: String(row.name ?? "").trim() || "-",
      email: String(row.email ?? "").trim() || "-",
      groupName: String(row.group_name ?? "").trim() || "-",
      teamName: String(row.team_name ?? "").trim() || "-",
      positionName: String(row.position_name ?? "").trim() || "-",
      roleName: String(row.role_name ?? "").trim() || "-",
      employmentStatus: EMPLOYMENT_STATUS_LABEL[row.employment_status] ?? row.employment_status,
      mmStartDate: row.mm_start_date ?? "-",
      mmEndDate: row.mm_end_date ?? "-",
      yearlyMm: row.yearly_mm == null ? "-" : String(row.yearly_mm),
      useStatus: deriveUseStatus(row),
    }));
    await downloadPersonnelWorkbook(normalizedRows, "인력관리", "인력관리");
  };

  useEffect(() => {
    if (safePage > totalPages) {
      setPage(totalPages);
    }
  }, [safePage, totalPages]);

  if (loading) return <LightweightLoading label="인력 관리" />;

  return (
    <PmoShell user={{ name: userContext?.name ?? "관리자", team: userContext?.team ?? "PMO본부", role: userContext?.role ?? "관리자", permission, organizationRole }} notifications={3} currentId="people-employment" pageTitle="인력 관리">
      {!canAccess ? (
        <section className="pmo-panel" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>권한 없음</h2>
          <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>관리자 또는 본부장 권한이 있어야 인력 관리 화면에 접근할 수 있습니다.</p>
        </section>
      ) : (
        <div className="pmo-page-stack">
          <section className="pmo-panel" style={{ padding: 18 }}>
            <div style={{ display: "inline-flex", gap: 4, padding: 4, marginBottom: 14, border: "1px solid var(--line-2)", borderRadius: 8 }}>
              {([ ["pmo", "PMO본부 인력"], ["sales_owner", "영업대표 후보"] ] as const).map(([mode, label]) => <button key={mode} type="button" className="pmo-btn" onClick={() => { setViewMode(mode); setPage(1); setActiveSummary("all"); setFilterForm((prev) => ({ ...prev, teamName: "전체" })); setAppliedFilter((prev) => ({ ...prev, teamName: "전체" })); }} style={{ background: viewMode === mode ? "var(--brand)" : "#fff", color: viewMode === mode ? "#fff" : "var(--tx-2)", borderColor: viewMode === mode ? "var(--brand)" : "transparent" }}>{label}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr)) 1.45fr", gap: 12 }}>
              <label className="pmo-field">
                <span style={{ fontSize: 14 }}>팀</span>
                <select value={filterForm.teamName} onChange={(event) => setFilterForm((prev) => ({ ...prev, teamName: event.target.value }))} style={FILTER_SELECT_STYLE}>
                  {teamOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="pmo-field">
                <span style={{ fontSize: 14 }}>사용여부</span>
                <select value={filterForm.useStatus} onChange={(event) => setFilterForm((prev) => ({ ...prev, useStatus: event.target.value as UseStatus }))} style={FILTER_SELECT_STYLE}>
                  {["전체", "사용", "미사용"].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "end", marginTop: 12 }}>
              <label className="pmo-field">
                <span style={{ fontSize: 14 }}>검색어</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 12px", border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff" }}>
                  <Icon name="search" size={16} stroke={2} style={{ color: "var(--tx-5)" }} />
                  <input value={filterForm.q} onChange={(event) => setFilterForm((prev) => ({ ...prev, q: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyFilters(); } }} placeholder="성명, 직무 검색" style={{ border: 0, outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--tx-1)" }} />
                </div>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <button className="pmo-btn pmo-btn-primary" style={{ height: 40, minWidth: 86, padding: "0 18px", fontSize: 14, fontWeight: 700, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={applyFilters}>
                  <Icon name="search" size={15} stroke={2} />
                  조회
                </button>
                <button className="pmo-btn" style={{ height: 40, minWidth: 72, padding: "0 18px", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }} onClick={resetFilters}>초기화</button>
                {canCreate ? (
                  <button className="pmo-btn pmo-btn-primary" style={{ height: 40, minWidth: 170, padding: "0 14px", fontSize: 14, fontWeight: 700, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setModal({ mode: "create", row: null })}>
                    <Icon name="plus" size={15} stroke={2} />
                    신규 인력 등록
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 14 }}>
            {summaryItems.map((item, index) => (
              <SummaryCard key={`${item.label}-${index}`} item={item} active={index < 5 ? activeSummary === item.id : false} onClick={() => { if (index < 5) { setActiveSummary(item.id); setPage(1); } }} />
            ))}
          </section>

          {error ? <section className="pmo-panel pmo-error" style={{ padding: 12 }}>{error}</section> : null}

          <section className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 18 }}>인력 목록</strong>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--tx-4)" }}>
                <span>
                  총 {filteredRows.length}건
                  {summaryFilterLabel ? <span style={{ color: "var(--brand)", fontWeight: 600 }}> · 필터: {summaryFilterLabel}</span> : null}
                </span>
                <button
                  className="pmo-btn"
                  style={{
                    height: 32,
                    padding: "0 12px",
                    fontSize: 13,
                    fontWeight: downloadHover ? 700 : 600,
                    background: downloadHover ? "var(--brand)" : "#fff",
                    color: downloadHover ? "#fff" : "var(--tx-2)",
                    borderColor: downloadHover ? "var(--brand)" : "var(--line-2)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={() => setDownloadHover(true)}
                  onMouseLeave={() => setDownloadHover(false)}
                  onClick={() => void downloadPeopleWorkbook()}
                >
                  <Icon name="download" size={14} stroke={2} />
                  엑셀 다운로드
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto", overflowY: "visible", borderBottom: "1px solid var(--line-1)" }}>
              <table className="pmo-table pmo-table--recent pmo-table--people-master" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: 118 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 98 }} />
                  <col style={{ width: 76 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 96 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 126 }} />
                  <col style={{ width: 92 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={2} style={{ textAlign: "center", fontWeight: 800, color: "var(--tx-2)", background: "#e6eaf0" }}>인력 사번/성명</th>
                    <th colSpan={5} style={{ textAlign: "center", fontWeight: 800, color: "var(--tx-2)", background: "#eef3fb" }}>기본 정보</th>
                    <th colSpan={4} style={{ textAlign: "center", fontWeight: 800, color: "var(--tx-2)", background: "#edf6f3" }}>재직/MM 정보</th>
                    <th colSpan={1} style={{ textAlign: "center", fontWeight: 800, color: "var(--tx-2)", background: "#f7f2ea" }}>기타</th>
                  </tr>
                  <tr>
                    <th>사번</th>
                    <th>성명</th>
                    <th>이메일</th>
                    <th>본부</th>
                    <th>팀</th>
                    <th>직위</th>
                    <th>역할</th>
                    <th>재직상태</th>
                    <th>MM 시작일</th>
                    <th>MM 종료일</th>
                    <th>연간 재직 MM</th>
                    <th>사용여부</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: "56px 20px", textAlign: "center", color: "var(--tx-4)", fontWeight: 700 }}>조회된 인력이 없습니다.</td>
                    </tr>
                  ) : pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="num" title={row.id} style={{ textAlign: "center", color: "var(--brand)", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            className="pmo-btn"
                            style={{ width: 24, minWidth: 24, height: 24, padding: 0, justifyContent: "center", fontSize: 12 }}
                            onClick={() => setModal({ mode: "edit", row })}
                            title="편집"
                            aria-label={`${displayEmployeeNo(row.employee_no, row.id)} 편집`}
                          >
                            ✏
                          </button>
                          <span>{displayEmployeeNo(row.employee_no, row.id)}</span>
                        </div>
                      </td>
                      <td className="name" style={{ textAlign: "center", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.45, fontSize: 14, fontWeight: 700, color: "var(--tx-1)" }}>{row.name}</td>
                      <td style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{row.email ?? "-"}</td>
                      <td style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.group_name ?? "-"}</td>
                      <td style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.team_name ?? "-"}</td>
                      <td style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.position_name ?? "-"}</td>
                      <td style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.role_name ?? "-"}</td>
                      <td style={{ textAlign: "center", fontSize: 14 }}>{viewMode === "sales_owner" ? "-" : <StatusBadge status={row.employment_status} />}</td>
                      <td className="num" style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{viewMode === "sales_owner" ? "-" : row.mm_start_date ?? "-"}</td>
                      <td className="num" style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{viewMode === "sales_owner" ? "-" : row.mm_end_date ?? "-"}</td>
                      <td className="num" style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{viewMode === "sales_owner" ? "-" : formatNumber(row.yearly_mm, 1)}</td>
                      <td><UseBadge useStatus={deriveUseStatus(row)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
                <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
                <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1}>‹</button>
                {visiblePageNumbers[0] > 1 ? <span style={{ color: "var(--tx-4)", padding: "0 2px" }}>…</span> : null}
                {visiblePageNumbers.map((pageNo) => (
                  <button key={pageNo} className="pmo-btn" onClick={() => setPage(pageNo)} style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", textAlign: "center", background: pageNo === safePage ? "var(--brand)" : "#fff", color: pageNo === safePage ? "#fff" : "var(--tx-2)", borderColor: pageNo === safePage ? "var(--brand)" : "var(--line-2)" }}>
                    {pageNo}
                  </button>
                ))}
                {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages ? <span style={{ color: "var(--tx-4)", padding: "0 2px" }}>…</span> : null}
                <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages}>›</button>
                <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
              </div>
              <select className="pmo-btn" style={{ height: 32, marginLeft: "auto" }} value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value="10">10개씩 보기</option>
                <option value="20">20개씩 보기</option>
                <option value="50">50개씩 보기</option>
                <option value="100">100개씩 보기</option>
              </select>
            </div>
          </section>

          <PersonnelEditModal
            mode={modal?.mode ?? "create"}
            open={!!modal}
            row={modal?.row ?? null}
            roles={roles}
            groupOptions={groupOptions}
            teamOptions={teamOptions.filter((option) => option !== "전체")}
            positionOptions={positionOptions}
            canEditFull={canEditFull}
            canChangeStatus={canChangeStatus}
            viewMode={viewMode}
            onClose={() => setModal(null)}
            onSaved={async () => {
              await loadData();
            }}
          />
        </div>
      )}
    </PmoShell>
  );
}
