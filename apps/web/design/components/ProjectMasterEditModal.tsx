"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createProject, createProjectCode, updateProject, updateProjectCode } from "../../app/lib/api";
import { SUBMISSION_FORMAT_OPTIONS } from "../constants/projectFormOptions";

type EditForm = {
  code: string;
  name: string;
  clientName: string;
  salesDept: string;
  projectType: string;
  status: string;
  certainty: string;
  totalAmount: string;
  companyAmount: string;
  salesOwner: string;
  proposalPm: string;
  presentPm: string;
  deliveryPm: string;
  fromDate: string;
  toDate: string;
  bidNoticeNo: string;
  bidNoticeDate: string;
  proposalSubmissionDate: string;
  proposalSubmissionTime: string;
  useProposalSubmissionTime: boolean;
  submissionFormat: string;
  submissionNote: string;
  proposalPresentationDate: string;
  proposalPresentationTime: string;
  useProposalPresentationTime: boolean;
  presentationFormat: string;
  presentationNote: string;
  memo: string;
  useStatus: string;
};

type FieldErrorMap = Partial<Record<keyof EditForm, string>>;

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };
const PROJECT_TYPE_LABEL: Record<string, string> = { main: "주사업", sub: "부사업", subcontract: "하도", partner: "협력" };
const GROUP_SECTION_STYLE: CSSProperties = { padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" };
const GROUP_TITLE_STYLE: CSSProperties = { margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)", letterSpacing: "0.01em" };
const MEMO_MAX_LENGTH = 50;

function parseAmountText(amountText: string): { totalAmount: string; companyAmount: string } {
  const raw = String(amountText ?? "").trim();
  if (!raw || raw === "-") return { totalAmount: "", companyAmount: "" };
  const parts = raw.split("/").map((p) => p.trim());
  const clean = (value: string) => value.replace(/억/g, "").replace(/,/g, "").trim();
  if (parts.length >= 2) return { totalAmount: clean(parts[0]), companyAmount: clean(parts[1]) };
  const one = clean(parts[0]);
  return { totalAmount: one, companyAmount: one };
}

function toNumberOrNull(value: string): number | null {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/억/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toAmountText(totalAmount: number | null, companyAmount: number | null): string | null {
  if (totalAmount === null && companyAmount === null) return null;
  const total = totalAmount ?? companyAmount;
  const company = companyAmount ?? totalAmount;
  if (total === null || company === null) return null;
  const fmt = (n: number) => `${Number.isInteger(n) ? n.toFixed(0) : n.toString()}억`;
  return `${fmt(total)}/${fmt(company)}`;
}

function splitDateTime(value: string): { date: string; time: string; useTime: boolean } {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return { date: "", time: "", useTime: false };
  const [datePart = "", timePart = ""] = raw.split(" ");
  const hasTime = /^\d{2}:\d{2}$/.test(timePart);
  return { date: datePart, time: hasTime ? timePart : "", useTime: hasTime };
}

function joinDateTime(date: string, time: string, useTime: boolean): string | null {
  const d = String(date ?? "").trim();
  if (!d) return null;
  if (!useTime) return `${d} 00:00`;
  const t = String(time ?? "").trim();
  if (!t) return `${d} 00:00`;
  return `${d} ${t}`;
}

function toDateTimeLocal(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "";
  const [d = "", t = "00:00"] = raw.split(" ");
  if (!d) return "";
  return `${d}T${t}`;
}

function fromDateTimeLocal(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const [d = "", t = "00:00"] = raw.split("T");
  if (!d) return null;
  return `${d} ${t}`;
}

function toTimeParts(value: string): { period: "오전" | "오후"; hour: string; minute: string } {
  const raw = String(value ?? "").trim();
  const [hRaw = "09", mRaw = "00"] = raw.split(":");
  const hNum = Number(hRaw);
  const mNum = Number(mRaw);
  const validHour = Number.isFinite(hNum) ? Math.min(23, Math.max(0, hNum)) : 9;
  const validMinute = Number.isFinite(mNum) ? Math.min(59, Math.max(0, mNum)) : 0;
  const period: "오전" | "오후" = validHour >= 12 ? "오후" : "오전";
  const hour12 = validHour % 12 === 0 ? 12 : validHour % 12;
  return { period, hour: String(hour12).padStart(2, "0"), minute: String(validMinute).padStart(2, "0") };
}

function fromTimeParts(period: "오전" | "오후", hour: string, minute: string): string {
  const hourNum = Math.min(12, Math.max(1, Number(hour) || 12));
  const minuteNum = Math.min(59, Math.max(0, Number(minute) || 0));
  let h24 = hourNum % 12;
  if (period === "오후") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}`;
}

function CompactSelect({ value, options, disabled, onChange, width = 56 }: { value: string; options: string[]; disabled?: boolean; onChange: (next: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return (
    <div style={{ position: "relative", width, minWidth: width }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((prev) => !prev)} style={{ width: "100%", height: 38, border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff", color: "var(--tx-1)", fontSize: 12.5, fontWeight: 600, padding: "0 18px 0 6px", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, position: "relative", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}<span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "var(--tx-5)", pointerEvents: "none", fontSize: 11 }}>▾</span>
      </button>
      {open && !disabled ? <div style={{ position: "absolute", top: 40, left: 0, zIndex: 120, width, minWidth: width, maxWidth: width, maxHeight: 220, overflowY: "auto", border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff", boxShadow: "0 8px 18px rgba(15,23,42,.12)", padding: 4 }}>
        {options.map((option) => <button key={option} type="button" onClick={() => { onChange(option); setOpen(false); }} style={{ width: "100%", height: 30, border: 0, borderRadius: 6, background: option === value ? "var(--brand-bg)" : "transparent", color: option === value ? "var(--brand-700)" : "var(--tx-2)", fontSize: 12.5, fontWeight: option === value ? 700 : 500, textAlign: "left", padding: "0 8px", cursor: "pointer", whiteSpace: "nowrap" }}>{option}</button>)}
      </div> : null}
      {open && !disabled ? <button type="button" aria-label="close" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, border: 0, background: "transparent", cursor: "default", zIndex: 110 }} /> : null}
    </div>
  );
}

export default function ProjectMasterEditModal({
  mode,
  open,
  row,
  rows,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  open: boolean;
  row: any | null;
  rows: any[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [memoLengthError, setMemoLengthError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  const salesOwnersForEdit = useMemo<string[]>(() => Array.from(new Set<string>((rows ?? []).map((r: any) => String(r.salesOwner ?? "").trim()).filter((v: string) => v && v !== "-"))).sort((a, b) => a.localeCompare(b, "ko-KR")), [rows]);
  const ownerDeptBySalesOwner = useMemo<Record<string, string>>(() => (rows ?? []).reduce((acc: Record<string, string>, r: any) => { const owner = String(r.salesOwner ?? "").trim(); const dept = String(r.salesDept ?? "").trim(); if (owner && owner !== "-" && dept && dept !== "-" && !acc[owner]) acc[owner] = dept; return acc; }, {}), [rows]);
  const leadPmsForEdit = useMemo<string[]>(() => Array.from(new Set<string>((rows ?? []).map((r: any) => String(r.proposalPm ?? "").trim()).filter((v: string) => v && v !== "-"))).sort((a, b) => a.localeCompare(b, "ko-KR")), [rows]);
  const certainties = useMemo<string[]>(() => Array.from(new Set<string>((rows ?? []).map((r: any) => String(r.certainty ?? "").trim()).filter((v: string) => v && v !== "-"))).sort((a, b) => a.localeCompare(b, "ko-KR")), [rows]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      const year = new Date().getFullYear();
      const currentYearPrefix = `P${year}`;
      const sequenceByYear = rows
        .map((item: any) => String(item.code ?? "").trim())
        .filter((code: string) => code.startsWith(currentYearPrefix))
        .map((code: string) => Number(code.slice(currentYearPrefix.length)))
        .filter((seq: number) => Number.isFinite(seq));
      const next = (sequenceByYear.length ? Math.max(...sequenceByYear) : 0) + 1;
      const nextCode = `${currentYearPrefix}${String(next).padStart(3, "0")}`;
      setEditForm({
        code: nextCode,
        name: "",
        clientName: "",
        salesDept: "",
        projectType: "주사업",
        status: "proposing",
        certainty: "",
        totalAmount: "",
        companyAmount: "",
        salesOwner: "",
        proposalPm: "",
        presentPm: "",
        deliveryPm: "",
        fromDate: "",
        toDate: "",
        bidNoticeNo: "",
        bidNoticeDate: "",
        proposalSubmissionDate: "",
        proposalSubmissionTime: "",
        useProposalSubmissionTime: false,
        submissionFormat: "",
        submissionNote: "",
        proposalPresentationDate: "",
        proposalPresentationTime: "",
        useProposalPresentationTime: false,
        presentationFormat: "",
        presentationNote: "",
        memo: "",
        useStatus: "사용",
      });
    } else {
      if (!row) return;
      setEditForm({
        code: row.code ?? "",
        name: row.name ?? "",
        clientName: row.clientName && row.clientName !== "-" ? row.clientName : "",
        salesDept: row.salesDept && row.salesDept !== "-" ? row.salesDept : "",
        projectType: String(row.projectType ?? "주사업"),
        status: row.status ?? "proposing",
        certainty: row.certainty ?? "",
        totalAmount: row.totalAmount != null ? String(row.totalAmount) : parseAmountText(row.amountText ?? "").totalAmount,
        companyAmount: row.companyAmount != null ? String(row.companyAmount) : parseAmountText(row.amountText ?? "").companyAmount,
        salesOwner: row.salesOwner ?? "",
        proposalPm: row.proposalPm ?? "",
        presentPm: row.presentPm ?? "",
        deliveryPm: row.deliveryPm ?? "",
        fromDate: row.fromDate && row.fromDate !== "-" ? row.fromDate : "",
        toDate: row.toDate && row.toDate !== "-" ? row.toDate : "",
        bidNoticeNo: row.bidNoticeNo && row.bidNoticeNo !== "-" ? row.bidNoticeNo : "",
        bidNoticeDate: row.bidNoticeDate && row.bidNoticeDate !== "-" ? row.bidNoticeDate : "",
        proposalSubmissionDate: splitDateTime(row.proposalSubmissionAt).date,
        proposalSubmissionTime: splitDateTime(row.proposalSubmissionAt).time,
        useProposalSubmissionTime: splitDateTime(row.proposalSubmissionAt).useTime,
        submissionFormat: row.submissionFormat && row.submissionFormat !== "-" ? row.submissionFormat : "",
        submissionNote: row.submissionNote && row.submissionNote !== "-" ? row.submissionNote : "",
        proposalPresentationDate: splitDateTime(row.proposalPresentationAt).date,
        proposalPresentationTime: splitDateTime(row.proposalPresentationAt).time,
        useProposalPresentationTime: splitDateTime(row.proposalPresentationAt).useTime,
        presentationFormat: row.presentationFormat && row.presentationFormat !== "-" ? row.presentationFormat : "",
        presentationNote: row.presentationNote && row.presentationNote !== "-" ? row.presentationNote : "",
        memo: row.memo && row.memo !== "-" ? row.memo : "",
        useStatus: row.useStatus ?? "사용",
      });
    }
    setSaveError(null);
    setMemoLengthError(null);
    setValidationError(null);
    setFieldErrors({});
  }, [open, row, mode, rows]);

  const errorInputStyle = (key: keyof EditForm): CSSProperties => fieldErrors[key] ? { borderColor: "var(--crit)", boxShadow: "0 0 0 1px var(--crit) inset" } : {};
  const fieldLabelErrorStyle = (key: keyof EditForm): CSSProperties => fieldErrors[key] ? { color: "var(--crit)" } : {};
  const clearFieldError = (key: keyof EditForm) => setFieldErrors((prev) => { if (!prev[key]) return prev; const next = { ...prev }; delete next[key]; return next; });
  const scrollToField = (key: keyof EditForm) => {
    const target = document.querySelector(`[data-field="${key}"]`) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = target.querySelector("input, select, button") as HTMLElement | null;
    focusable?.focus();
  };

  const renderTimeControl = (currentValue: string, enabled: boolean, onChange: (next: string) => void, label: string, fieldKey?: keyof EditForm) => {
    const parts = toTimeParts(currentValue || "09:00");
    const setPeriod = (period: "오전" | "오후") => onChange(fromTimeParts(period, parts.hour, parts.minute));
    const setHour = (hour: string) => onChange(fromTimeParts(parts.period, hour, parts.minute));
    const setMinute = (minute: string) => onChange(fromTimeParts(parts.period, parts.hour, minute));
    const minuteOptions = Array.from(new Set([parts.minute, ...Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, "0"))])).map((m) => Number(m)).filter((m) => Number.isFinite(m) && m >= 0 && m <= 59).sort((a, b) => a - b).map((m) => String(m).padStart(2, "0"));
    const selectedHour = `${parts.hour}시`;
    const selectedMinute = `${parts.minute}분`;
    return (
      <label className="pmo-field" data-field={fieldKey}>
        <span style={{ color: enabled ? "var(--tx-3)" : "var(--tx-5)", ...(fieldKey ? fieldLabelErrorStyle(fieldKey) : {}) }}>{label}</span>
        <div style={{ display: "grid", gridTemplateColumns: "56px 56px 56px", gap: 4, minWidth: 0 }}>
          <CompactSelect value={parts.period} options={["오전", "오후"]} disabled={!enabled} onChange={(next) => setPeriod(next as "오전" | "오후")} width={56} />
          <CompactSelect value={selectedHour} options={Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}시`)} disabled={!enabled} onChange={(next) => setHour(next.replace("시", ""))} width={56} />
          <CompactSelect value={selectedMinute} options={minuteOptions.map((m) => `${m}분`)} disabled={!enabled} onChange={(next) => setMinute(next.replace("분", ""))} width={56} />
        </div>
      </label>
    );
  };

  const validateForm = (): { errors: FieldErrorMap; firstKey: keyof EditForm | null } => {
    const errors: FieldErrorMap = {};
    if (!editForm) return { errors: { name: "입력값을 확인할 수 없습니다." }, firstKey: "name" };
    const requiredChecks: Array<{ key: keyof EditForm; label: string; valid: boolean }> = [
      { key: "name", label: "프로젝트명", valid: !!editForm.name.trim() },
      { key: "clientName", label: "고객사", valid: !!editForm.clientName.trim() },
      { key: "status", label: "상태", valid: !!editForm.status.trim() },
      { key: "projectType", label: "사업유형", valid: !!editForm.projectType.trim() },
      { key: "certainty", label: "확도", valid: !!editForm.certainty.trim() },
      { key: "totalAmount", label: "총 사업금액", valid: !!editForm.totalAmount.trim() },
      { key: "companyAmount", label: "당사 사업금액", valid: !!editForm.companyAmount.trim() },
      { key: "salesOwner", label: "영업대표", valid: !!editForm.salesOwner.trim() },
      { key: "fromDate", label: "시작일", valid: !!editForm.fromDate.trim() },
      { key: "toDate", label: "종료일", valid: !!editForm.toDate.trim() },
    ];
    for (const check of requiredChecks) if (!check.valid) errors[check.key] = `${check.label}은(는) 필수입니다.`;
    if (!editForm.proposalPm.trim() && !editForm.deliveryPm.trim()) {
      const message = "제안PM 또는 수행PM 중 1명 이상 선택하세요.";
      errors.proposalPm = message;
      errors.deliveryPm = message;
    }
    if (editForm.proposalPm.trim() && !editForm.presentPm.trim()) {
      errors.presentPm = "제안PM 선택 시 발표PM을 선택하세요.";
    }
    if (editForm.proposalPm.trim()) {
      if (!editForm.proposalSubmissionDate.trim()) {
        errors.proposalSubmissionDate = "제안PM 선택 시 제출일을 입력하세요.";
      }
      if (!editForm.proposalPresentationDate.trim()) {
        errors.proposalPresentationDate = "제안PM 선택 시 발표일을 입력하세요.";
      }
      if (!editForm.submissionFormat.trim()) {
        errors.submissionFormat = "제안PM 선택 시 제출 형식을 선택하세요.";
      }
      if (!editForm.presentationFormat.trim()) {
        errors.presentationFormat = "제안PM 선택 시 발표 형식을 선택하세요.";
      }
    }
    if (!editForm.salesDept.trim()) errors.salesOwner = errors.salesOwner ?? "영업대표를 선택하면 영업부서가 자동 반영됩니다.";
    if (editForm.useProposalSubmissionTime && !editForm.proposalSubmissionTime.trim()) errors.proposalSubmissionTime = "제안 제출시간을 입력하세요.";
    if (editForm.useProposalPresentationTime && !editForm.proposalPresentationTime.trim()) errors.proposalPresentationTime = "제안 발표시간을 입력하세요.";
    const firstKey = (Object.keys(errors)[0] as keyof EditForm | undefined) ?? null;
    return { errors, firstKey };
  };

  const saveEdit = async () => {
    if (!editForm) return;
    const { errors, firstKey } = validateForm();
    if (firstKey) {
      setFieldErrors(errors);
      setValidationError(`입력 확인 필요 ${Object.keys(errors).length}건`);
      scrollToField(firstKey);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setValidationError(null);
    setFieldErrors({});
    try {
      const mappedProjectType = ({ "주사업": "main", "부사업": "sub", "하도": "subcontract", "협력": "partner" } as const)[editForm.projectType as "주사업" | "부사업" | "하도" | "협력"] ?? "main";
      const payload: any = {
        code: editForm.code.trim() || undefined,
        name: editForm.name.trim() || undefined,
        project_type: mappedProjectType,
        status: editForm.status as any,
        certainty: editForm.certainty.trim() || null,
        is_active: editForm.useStatus !== "미사용",
      };
      const totalAmountValue = toNumberOrNull(editForm.totalAmount);
      const companyAmountValue = toNumberOrNull(editForm.companyAmount);
      const amountTextValue = toAmountText(totalAmountValue, companyAmountValue);
      const submissionAtValue = joinDateTime(editForm.proposalSubmissionDate, editForm.proposalSubmissionTime, editForm.useProposalSubmissionTime);
      const presentationAtValue = joinDateTime(editForm.proposalPresentationDate, editForm.proposalPresentationTime, editForm.useProposalPresentationTime);
      if (mode === "create") {
        const createdCode = await createProjectCode(payload);
        await createProject({
          code: editForm.code.trim() || undefined,
          name: editForm.name.trim() || undefined,
          client_name: editForm.clientName.trim() || null,
          project_type: mappedProjectType as any,
          status: editForm.status as any,
          certainty: editForm.certainty.trim() || null,
          sales_department: editForm.salesDept.trim() || null,
          sales_owner: editForm.salesOwner.trim() || null,
          proposal_pm_name: editForm.proposalPm.trim() || null,
          presentation_pm_name: editForm.presentPm.trim() || null,
          delivery_pm_name: editForm.deliveryPm.trim() || null,
          amount_text: amountTextValue,
          total_amount: totalAmountValue,
          company_amount: companyAmountValue,
          bid_notice_no: editForm.bidNoticeNo.trim() || null,
          bid_notice_date: editForm.bidNoticeDate || null,
          submission_at: submissionAtValue ? fromDateTimeLocal(toDateTimeLocal(submissionAtValue)) : null,
          submission_format: editForm.submissionFormat.trim() || null,
          submission_note: editForm.submissionNote.trim() || null,
          presentation_at: presentationAtValue ? fromDateTimeLocal(toDateTimeLocal(presentationAtValue)) : null,
          presentation_format: editForm.presentationFormat.trim() || null,
          presentation_note: editForm.presentationNote.trim() || null,
          memo: editForm.memo.trim() || null,
          start_date: editForm.fromDate || null,
          end_date: editForm.toDate || null,
          project_code_id: createdCode.data.id,
        } as any);
      } else {
        if (row?.id) {
          await updateProjectCode(row.id, payload);
        }
        if (row?.projectId) {
          await updateProject(row.projectId, {
            code: editForm.code.trim() || undefined,
            name: editForm.name.trim() || undefined,
            client_name: editForm.clientName.trim() || null,
            project_type: mappedProjectType as any,
            status: editForm.status as any,
            sales_department: editForm.salesDept.trim() || null,
            sales_owner: editForm.salesOwner.trim() || null,
            proposal_pm_name: editForm.proposalPm.trim() || null,
            presentation_pm_name: editForm.presentPm.trim() || null,
            delivery_pm_name: editForm.deliveryPm.trim() || null,
            amount_text: amountTextValue,
            total_amount: totalAmountValue,
            company_amount: companyAmountValue,
            bid_notice_no: editForm.bidNoticeNo.trim() || null,
            bid_notice_date: editForm.bidNoticeDate || null,
            submission_at: submissionAtValue ? fromDateTimeLocal(toDateTimeLocal(submissionAtValue)) : null,
            submission_format: editForm.submissionFormat.trim() || null,
            submission_note: editForm.submissionNote.trim() || null,
            presentation_at: presentationAtValue ? fromDateTimeLocal(toDateTimeLocal(presentationAtValue)) : null,
            presentation_format: editForm.presentationFormat.trim() || null,
            presentation_note: editForm.presentationNote.trim() || null,
            memo: editForm.memo.trim() || null,
            start_date: editForm.fromDate || null,
            end_date: editForm.toDate || null,
          } as any);
        }
      }
      await onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !editForm) return null;
  const uniqueFieldErrors = Object.entries(fieldErrors).reduce<Array<[keyof EditForm, string]>>((acc, [key, message]) => {
    const typedKey = key as keyof EditForm;
    if (!message) return acc;
    if (acc.some(([, existingMessage]) => existingMessage === message)) return acc;
    acc.push([typedKey, message]);
    return acc;
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(1200px, 92vw)", height: "88vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: "0 0 auto", background: "#ffffff", zIndex: 5, padding: "14px 20px 10px", borderBottom: "1px solid var(--line-2)", boxShadow: "0 2px 10px rgba(15,23,42,.06)" }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{mode === "create" ? "프로젝트 등록" : "프로젝트 편집"}</h3>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px 12px" }}>
          {Object.keys(fieldErrors).length > 0 ? <section className="pmo-panel" style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #fecaca", background: "#fff1f2" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>입력 확인 필요 항목 {Object.keys(fieldErrors).length}건이 있습니다.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {uniqueFieldErrors.map(([key, message]) => <button key={key} type="button" onClick={() => scrollToField(key)} style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{message}</button>)}
            </div>
          </section> : null}
          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>프로젝트 기본정보</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-field="status" style={{ gridRow: 1, gridColumn: 1 }}><span style={fieldLabelErrorStyle("status")}>상태</span><select value={editForm.status} onChange={(e) => { clearFieldError("status"); setEditForm({ ...editForm, status: e.target.value }); }} style={errorInputStyle("status")}>{Object.keys(STATUS_LABEL).map((code) => <option key={code} value={code}>{STATUS_LABEL[code]}</option>)}</select></label>
              <div style={{ gridRow: 1, gridColumn: 2 }} /><div style={{ gridRow: 1, gridColumn: 3 }} /><div style={{ gridRow: 1, gridColumn: 4 }} />
              <label className="pmo-field" style={{ gridRow: 2, gridColumn: 1 }}><span>코드</span><input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} /></label>
              <label className="pmo-field" data-field="name" style={{ gridRow: 2, gridColumn: 2 }}><span style={fieldLabelErrorStyle("name")}>프로젝트명</span><input value={editForm.name} onChange={(e) => { clearFieldError("name"); setEditForm({ ...editForm, name: e.target.value }); }} style={errorInputStyle("name")} /></label>
              <label className="pmo-field" style={{ gridRow: 2, gridColumn: 3 }}><span>공고번호</span><input value={editForm.bidNoticeNo} onChange={(e) => setEditForm({ ...editForm, bidNoticeNo: e.target.value })} /></label>
              <label className="pmo-field" style={{ gridRow: 2, gridColumn: 4 }}><span>공고일</span><input type="date" value={editForm.bidNoticeDate} onChange={(e) => setEditForm({ ...editForm, bidNoticeDate: e.target.value })} /></label>
              <label className="pmo-field" data-field="clientName" style={{ gridRow: 3, gridColumn: 1 }}><span style={fieldLabelErrorStyle("clientName")}>고객사</span><input value={editForm.clientName} onChange={(e) => { clearFieldError("clientName"); setEditForm({ ...editForm, clientName: e.target.value }); }} style={errorInputStyle("clientName")} /></label>
              <label className="pmo-field" data-field="projectType" style={{ gridRow: 3, gridColumn: 2 }}><span style={fieldLabelErrorStyle("projectType")}>사업유형</span><select value={editForm.projectType} onChange={(e) => { clearFieldError("projectType"); setEditForm({ ...editForm, projectType: e.target.value }); }} style={errorInputStyle("projectType")}>{["주사업", "부사업", "하도", "협력"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
              <label className="pmo-field" data-field="certainty" style={{ gridRow: 3, gridColumn: 3 }}><span style={fieldLabelErrorStyle("certainty")}>확도</span><select value={editForm.certainty} onChange={(e) => { clearFieldError("certainty"); setEditForm({ ...editForm, certainty: e.target.value }); }} style={errorInputStyle("certainty")}><option value="">선택 안함</option>{certainties.map((certainty) => <option key={certainty} value={certainty}>{certainty}</option>)}</select></label>
              <label className="pmo-field" style={{ gridRow: 3, gridColumn: 4 }}><span>사업금액 (총액 / 당사금액, 억)</span><div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(120px, 1fr)", gap: 8 }}><input data-field="totalAmount" value={editForm.totalAmount} onChange={(e) => { clearFieldError("totalAmount"); setEditForm({ ...editForm, totalAmount: e.target.value }); }} placeholder="총액(억)" style={{ minWidth: 0, ...errorInputStyle("totalAmount") }} /><input data-field="companyAmount" value={editForm.companyAmount} onChange={(e) => { clearFieldError("companyAmount"); setEditForm({ ...editForm, companyAmount: e.target.value }); }} placeholder="당사금액(억)" style={{ minWidth: 0, ...errorInputStyle("companyAmount") }} /></div></label>
            </div>
          </section>
          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>인력 목록</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <label className="pmo-field" data-field="salesOwner" style={{ gridRow: 1, gridColumn: 1 }}><span style={fieldLabelErrorStyle("salesOwner")}>영업대표</span><select value={editForm.salesOwner} onChange={(e) => { clearFieldError("salesOwner"); const nextOwner = e.target.value; const nextDept = ownerDeptBySalesOwner[nextOwner] ?? editForm.salesDept; setEditForm({ ...editForm, salesOwner: nextOwner, salesDept: nextDept }); }} style={errorInputStyle("salesOwner")}><option value="">선택 안함</option>{salesOwnersForEdit.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
              <div style={{ gridRow: 1, gridColumn: 2 }} /><div style={{ gridRow: 1, gridColumn: 3 }} />
              <label className="pmo-field" data-field="proposalPm" style={{ gridRow: 2, gridColumn: 1 }}><span style={fieldLabelErrorStyle("proposalPm")}>제안PM</span><select value={editForm.proposalPm} onChange={(e) => { clearFieldError("proposalPm"); clearFieldError("deliveryPm"); clearFieldError("presentPm"); setEditForm({ ...editForm, proposalPm: e.target.value }); }} style={errorInputStyle("proposalPm")}><option value="">선택 안함</option>{leadPmsForEdit.map((pm) => <option key={pm} value={pm}>{pm}</option>)}</select></label>
              <label className="pmo-field" data-field="presentPm" style={{ gridRow: 2, gridColumn: 2 }}><span style={fieldLabelErrorStyle("presentPm")}>발표PM</span><select value={editForm.presentPm} onChange={(e) => { clearFieldError("presentPm"); setEditForm({ ...editForm, presentPm: e.target.value }); }} style={errorInputStyle("presentPm")}><option value="">선택 안함</option>{leadPmsForEdit.map((pm) => <option key={pm} value={pm}>{pm}</option>)}</select></label>
              <label className="pmo-field" data-field="deliveryPm" style={{ gridRow: 2, gridColumn: 3 }}><span style={fieldLabelErrorStyle("deliveryPm")}>수행PM</span><select value={editForm.deliveryPm} onChange={(e) => { clearFieldError("deliveryPm"); clearFieldError("proposalPm"); setEditForm({ ...editForm, deliveryPm: e.target.value }); }} style={errorInputStyle("deliveryPm")}><option value="">선택 안함</option>{leadPmsForEdit.map((pm) => <option key={pm} value={pm}>{pm}</option>)}</select></label>
            </div>
          </section>
          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>일정</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "1 / 2", gridRow: 1 }}>
                <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>기본 일정</h5>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label className="pmo-field" data-field="fromDate"><span style={fieldLabelErrorStyle("fromDate")}>사업 시작일</span><input type="date" value={editForm.fromDate} onChange={(e) => { clearFieldError("fromDate"); setEditForm({ ...editForm, fromDate: e.target.value }); }} style={errorInputStyle("fromDate")} /></label>
                  <label className="pmo-field" data-field="toDate"><span style={fieldLabelErrorStyle("toDate")}>사업 종료일</span><input type="date" value={editForm.toDate} onChange={(e) => { clearFieldError("toDate"); setEditForm({ ...editForm, toDate: e.target.value }); }} style={errorInputStyle("toDate")} /></label>
                </div>
              </section>
              <div style={{ gridColumn: "2 / 3", gridRow: 1 }} />
              <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "1 / 2", gridRow: 2 }}>
                <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>제안서 제출</h5>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 180px)", gap: 8, alignItems: "end" }}>
                  <label className="pmo-field" data-field="proposalSubmissionDate" style={{ minWidth: 0 }}><span style={fieldLabelErrorStyle("proposalSubmissionDate")}>제출일</span><input type="date" value={editForm.proposalSubmissionDate} onChange={(e) => { clearFieldError("proposalSubmissionDate"); setEditForm({ ...editForm, proposalSubmissionDate: e.target.value }); }} style={errorInputStyle("proposalSubmissionDate")} /></label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600, whiteSpace: "nowrap", marginBottom: 10 }}><input type="checkbox" style={{ width: 14, height: 14 }} checked={editForm.useProposalSubmissionTime} onChange={(e) => setEditForm({ ...editForm, useProposalSubmissionTime: e.target.checked })} />시간 사용</label>
                  <div style={{ minWidth: 0 }}>{renderTimeControl(editForm.proposalSubmissionTime, editForm.useProposalSubmissionTime, (next) => { clearFieldError("proposalSubmissionTime"); setEditForm({ ...editForm, proposalSubmissionTime: next }); }, "제출시간", "proposalSubmissionTime")}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 3fr)", gap: 10, marginTop: 10 }}>
                  <label className="pmo-field" data-field="submissionFormat" style={{ minWidth: 0 }}><span style={fieldLabelErrorStyle("submissionFormat")}>제출 형식</span><select style={{ minWidth: 0, width: "100%", ...errorInputStyle("submissionFormat") }} value={editForm.submissionFormat} onChange={(e) => { clearFieldError("submissionFormat"); setEditForm({ ...editForm, submissionFormat: e.target.value }); }}>{SUBMISSION_FORMAT_OPTIONS.map((option) => <option key={option || "none"} value={option}>{option || "선택 안함"}</option>)}</select></label>
                  <label className="pmo-field" style={{ minWidth: 0 }}><span>제출 유의사항</span><input value={editForm.submissionNote} onChange={(e) => setEditForm({ ...editForm, submissionNote: e.target.value })} placeholder="제본 여부 등 제출 유의사항 기입" style={{ minWidth: 0, width: "100%" }} /></label>
                </div>
              </section>
              <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "2 / 3", gridRow: 2 }}>
                <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>제안 발표</h5>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 180px)", gap: 8, alignItems: "end" }}>
                  <label className="pmo-field" data-field="proposalPresentationDate" style={{ minWidth: 0 }}><span style={fieldLabelErrorStyle("proposalPresentationDate")}>발표일</span><input type="date" value={editForm.proposalPresentationDate} onChange={(e) => { clearFieldError("proposalPresentationDate"); setEditForm({ ...editForm, proposalPresentationDate: e.target.value }); }} style={errorInputStyle("proposalPresentationDate")} /></label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600, whiteSpace: "nowrap", marginBottom: 10 }}><input type="checkbox" style={{ width: 14, height: 14 }} checked={editForm.useProposalPresentationTime} onChange={(e) => setEditForm({ ...editForm, useProposalPresentationTime: e.target.checked })} />시간 사용</label>
                  <div style={{ minWidth: 0 }}>{renderTimeControl(editForm.proposalPresentationTime, editForm.useProposalPresentationTime, (next) => { clearFieldError("proposalPresentationTime"); setEditForm({ ...editForm, proposalPresentationTime: next }); }, "발표시간", "proposalPresentationTime")}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 3fr)", gap: 10, marginTop: 10 }}>
                  <label className="pmo-field" data-field="presentationFormat" style={{ minWidth: 0 }}><span style={fieldLabelErrorStyle("presentationFormat")}>발표 형식</span><select style={{ minWidth: 0, width: "100%", ...errorInputStyle("presentationFormat") }} value={editForm.presentationFormat} onChange={(e) => { clearFieldError("presentationFormat"); setEditForm({ ...editForm, presentationFormat: e.target.value }); }}><option value="">선택 안함</option><option value="온라인">온라인</option><option value="오프라인">오프라인</option></select></label>
                  <label className="pmo-field" style={{ minWidth: 0 }}><span>발표 유의사항</span><input value={editForm.presentationNote} onChange={(e) => setEditForm({ ...editForm, presentationNote: e.target.value })} placeholder="발표 유의사항 기입" style={{ minWidth: 0, width: "100%" }} /></label>
                </div>
              </section>
            </div>
          </section>
          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>기타</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
              <label className="pmo-field" style={{ gridColumn: "1 / 2" }}><span>사용여부</span><select value={editForm.useStatus} onChange={(e) => setEditForm({ ...editForm, useStatus: e.target.value })}><option value="사용">사용</option><option value="미사용">미사용</option></select></label>
              <label className="pmo-field" style={{ gridColumn: "2 / 5" }}>
                <span>메모</span>
                <input value={editForm.memo} onChange={(e) => { const nextMemo = e.target.value; if (nextMemo.length > MEMO_MAX_LENGTH) { setMemoLengthError(`메모는 ${MEMO_MAX_LENGTH}자까지만 입력할 수 있습니다.`); return; } setMemoLengthError(null); setEditForm({ ...editForm, memo: nextMemo }); }} placeholder="프로젝트 관련 특이사항 기입" style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }} />
                {memoLengthError ? <span style={{ color: "var(--crit)", fontSize: 12, fontWeight: 700 }}>{memoLengthError}</span> : null}
              </label>
            </div>
          </section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {saveError ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 600 }}>{saveError}</div> : null}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button className="pmo-btn" onClick={onClose} disabled={saving}>취소</button>
          <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={() => void saveEdit()} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </aside>
    </div>
  );
}
