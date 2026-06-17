"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  createHoliday,
  deleteHoliday,
  getDevUserContext,
  listHolidays,
  updateHoliday,
  type DevUserContext,
  type HolidayListMeta,
  type HolidayMonthlyCount,
  type HolidayRecord,
  type HolidayUpcomingRecord,
  type OrganizationRole,
  type UserPermission,
} from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";
import LightweightLoading from "../components/LightweightLoading";
import { downloadHolidayWorkbook } from "./holidayWorkbookExport";

type HolidayTypeCode = HolidayRecord["holiday_type"];
type HolidayTypeFormValue = HolidayTypeCode | "";
type RepeatFormValue = boolean | "";

type SummaryItem = {
  id: string;
  label: string;
  value: number;
  note?: string;
  icon: IconName;
  tone: string;
  fg: string;
};

type HolidayForm = {
  holiday_date: string;
  name: string;
  holiday_type: HolidayTypeFormValue;
  repeats_annually: RepeatFormValue;
  is_active: boolean;
  note: string;
};

type IconName = "calendar" | "building" | "switch" | "check" | "plus" | "download" | "edit" | "trash" | "chevronLeft" | "chevronRight";

const FORM_INPUT_STYLE: CSSProperties = { height: 40, minWidth: 0, width: "100%", borderRadius: 8 };
const GROUP_SECTION_STYLE: CSSProperties = { padding: 14, marginBottom: 12, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" };
const GROUP_TITLE_STYLE: CSSProperties = { margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--tx-2)", padding: "6px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)", letterSpacing: "0.01em" };

const ICONS: Record<IconName, string> = {
  calendar: "M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1z",
  building: "M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2M17 13h.01M17 17h.01",
  switch: "M7 7h10M7 17h10M17 7l-3-3m3 3-3 3M7 17l3-3m-3 3 3 3",
  check: "M20 6 9 17l-5-5",
  plus: "M12 5v14M5 12h14",
  download: "M12 4v10M8 10l4 4 4-4M5 18h14",
  edit: "M4 20h4l10-10-4-4L4 16v4zm11-13 4 4",
  trash: "M4 7h16M9 7V4h6v3M8 11v6M12 11v6M16 11v6M6 7l1 13a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9L18 7",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
};

const HOLIDAY_TYPE_LABEL: Record<HolidayTypeCode, string> = {
  public: "법정공휴일",
  company: "회사휴무",
  alternative: "대체휴일",
};

const HOLIDAY_TYPE_TONE: Record<HolidayTypeCode, { fg: string; bg: string; line: string }> = {
  public: { fg: "#e11d48", bg: "#fff1f4", line: "#fecdd6" },
  company: { fg: "#059669", bg: "#e8fbf2", line: "#bce7d0" },
  alternative: { fg: "#f97316", bg: "#fff4ea", line: "#ffd7bd" },
};

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;

const DEFAULT_FORM: HolidayForm = {
  holiday_date: "",
  name: "",
  holiday_type: "",
  repeats_annually: "",
  is_active: true,
  note: "",
};

function Icon({ name, size = 16, stroke = 1.8, style }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatDate(value: string) {
  return value;
}

function requiredMark(label: string) {
  return <>{label}<span style={{ color: "var(--crit)", marginLeft: 2 }}>*</span></>;
}

type FieldErrorMap = Partial<Record<keyof HolidayForm, string>>;

function weekdayLabel(dateText: string) {
  const parsed = new Date(`${dateText}T00:00:00`);
  return WEEKDAY_LABEL[parsed.getDay()] ?? "-";
}

function isWeekend(dateText: string) {
  const day = new Date(`${dateText}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function repeatLabel(row: Pick<HolidayRecord, "repeats_annually">) {
  return row.repeats_annually ? "매년" : "해당연도";
}

function useStatusLabel(row: Pick<HolidayRecord, "is_active">) {
  return row.is_active ? "사용중" : "제외";
}

function dDayLabel(dDay: number) {
  return dDay === 0 ? "D-Day" : `D-${dDay}`;
}

function makeYearOptions(currentYear: number) {
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
}

function SummaryCard({ item }: { item: SummaryItem }) {
  return (
    <section className="pmo-panel" style={{ padding: "22px 18px", display: "flex", alignItems: "center", gap: 16, minHeight: 132 }}>
      <span style={{ width: 56, height: 56, borderRadius: 16, background: item.tone, color: item.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
        <Icon name={item.icon} size={24} stroke={2} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 15, color: "var(--tx-3)", fontWeight: 700 }}>{item.label}</span>
        <span style={{ fontSize: 28, lineHeight: 1, fontWeight: 800, color: "var(--tx-1)" }}>{formatNumber(item.value)}<span style={{ fontSize: 15, color: "var(--tx-4)", marginLeft: 4 }}>건</span></span>
        {item.note ? <span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>{item.note}</span> : null}
      </span>
    </section>
  );
}

function TypeBadge({ type }: { type: HolidayTypeCode }) {
  const tone = HOLIDAY_TYPE_TONE[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 72, padding: "3px 10px", borderRadius: 10, background: tone.bg, color: tone.fg, border: `1px solid ${tone.line}`, fontSize: 13, fontWeight: 700 }}>
      {HOLIDAY_TYPE_LABEL[type]}
    </span>
  );
}

function ActiveSwitch({ checked, disabled, onToggle }: { checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={checked}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        border: 0,
        padding: 2,
        background: checked ? "var(--brand)" : "#d8deeb",
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .16s ease",
          boxShadow: "0 1px 3px rgba(15,23,42,.18)",
        }}
      />
    </button>
  );
}

function HolidayEditModal({
  open,
  row,
  canMutate,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: HolidayRecord | null;
  canMutate: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<HolidayForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  useEffect(() => {
    if (!open) return;
    setForm(row ? {
      holiday_date: row.source_holiday_date,
      name: row.name,
      holiday_type: row.holiday_type,
      repeats_annually: row.repeats_annually,
      is_active: row.is_active,
      note: row.note ?? "",
    } : DEFAULT_FORM);
    setSaving(false);
    setError(null);
    setFieldErrors({});
  }, [open, row]);

  if (!open) return null;

  const clearFieldError = (key: keyof HolidayForm) => setFieldErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });
  const errorStyle = (key: keyof HolidayForm): CSSProperties => fieldErrors[key] ? { borderColor: "var(--crit)", boxShadow: "0 0 0 1px var(--crit) inset" } : {};
  const labelStyle = (key: keyof HolidayForm): CSSProperties => fieldErrors[key] ? { color: "var(--crit)" } : {};
  const setField = <K extends keyof HolidayForm>(key: K, value: HolidayForm[K]) => {
    clearFieldError(key);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const scrollToField = (key: keyof HolidayForm) => {
    const target = document.querySelector(`[data-holiday-field="${key}"]`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    (target?.querySelector("input, select") as HTMLElement | null)?.focus();
  };

  const save = async () => {
    const errors: FieldErrorMap = {};
    if (!form.holiday_date.trim()) errors.holiday_date = "날짜는 필수입니다.";
    if (!form.name.trim()) errors.name = "명칭은 필수입니다.";
    if (!form.holiday_type) errors.holiday_type = "구분은 필수입니다.";
    if (form.repeats_annually === "") errors.repeats_annually = "반복여부는 필수입니다.";
    if (form.holiday_type === "alternative" && form.repeats_annually === true) errors.repeats_annually = "대체휴일은 해당연도 기준으로만 등록할 수 있습니다.";
    const firstKey = (Object.keys(errors)[0] as keyof HolidayForm | undefined) ?? null;
    if (firstKey) {
      setFieldErrors(errors);
      setError(null);
      scrollToField(firstKey);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        holiday_date: form.holiday_date,
        name: form.name.trim(),
        holiday_type: form.holiday_type as HolidayTypeCode,
        repeats_annually: form.repeats_annually === true,
        is_active: form.is_active,
        note: form.note.trim() || null,
      };
      if (row) {
        await updateHoliday(row.id, payload);
      } else {
        await createHoliday(payload);
      }
      await onSaved();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 50, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(980px, 92vw)", height: "84vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "14px 20px 10px", borderBottom: "1px solid var(--line-2)", boxShadow: "0 2px 10px rgba(15,23,42,.06)", zIndex: 5 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{row ? "공휴일 수정" : "신규 공휴일 등록"}</h3>
          <button onClick={onClose} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px 12px" }}>
          {Object.keys(fieldErrors).length > 0 ? (
            <section className="pmo-panel" style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #fecaca", background: "#fff1f2" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>입력 확인 필요 항목 {Object.keys(fieldErrors).length}건이 있습니다.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(fieldErrors).map(([key, message]) => (
                  <button key={key} type="button" onClick={() => scrollToField(key as keyof HolidayForm)} style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{message}</button>
                ))}
              </div>
            </section>
          ) : null}
          {error ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 700, marginBottom: 12 }}>{error}</div> : null}

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>공휴일 기본정보</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-holiday-field="holiday_date" style={{ gridColumn: "span 1" }}>
                <span style={labelStyle("holiday_date")}>{requiredMark("날짜")}</span>
                <input type="date" value={form.holiday_date} onChange={(event) => setField("holiday_date", event.target.value)} disabled={!canMutate || saving} style={{ ...FORM_INPUT_STYLE, ...errorStyle("holiday_date") }} />
              </label>
              <label className="pmo-field" data-holiday-field="holiday_type" style={{ gridColumn: "span 1" }}>
                <span style={labelStyle("holiday_type")}>{requiredMark("구분")}</span>
                <select value={form.holiday_type} onChange={(event) => {
                  const nextType = event.target.value as HolidayTypeFormValue;
                  clearFieldError("holiday_type");
                  setForm((prev) => ({
                    ...prev,
                    holiday_type: nextType,
                    repeats_annually: "",
                  }));
                }} disabled={!canMutate || saving} style={{ ...FORM_INPUT_STYLE, ...errorStyle("holiday_type") }}>
                  <option value="">선택 안함</option>
                  {Object.entries(HOLIDAY_TYPE_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label className="pmo-field" data-holiday-field="name" style={{ gridColumn: "span 2" }}>
                <span style={labelStyle("name")}>{requiredMark("명칭")}</span>
                <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="예: 어린이날, 종무일" disabled={!canMutate || saving} style={{ ...FORM_INPUT_STYLE, ...errorStyle("name") }} />
              </label>
            </div>
          </section>

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>반복</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-holiday-field="repeats_annually" style={{ gridColumn: "span 1" }}>
                <span style={labelStyle("repeats_annually")}>{requiredMark("반복여부")}</span>
                <select value={form.repeats_annually === true ? "annual" : form.repeats_annually === false ? "year" : ""} onChange={(event) => setField("repeats_annually", event.target.value === "" ? "" : event.target.value === "annual")} disabled={!canMutate || saving} style={{ ...FORM_INPUT_STYLE, ...errorStyle("repeats_annually") }}>
                  <option value="">선택 안함</option>
                  <option value="annual">매년 반복</option>
                  <option value="year">해당연도만 적용</option>
                </select>
              </label>
            </div>
          </section>

          <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
            <h4 style={GROUP_TITLE_STYLE}>기타</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <label className="pmo-field" data-holiday-field="is_active" style={{ gridColumn: "span 1" }}>
                <span>사용여부</span>
                <select value={form.is_active ? "active" : "inactive"} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.value === "active" }))} disabled={!canMutate || saving} style={FORM_INPUT_STYLE}>
                  <option value="active">사용중</option>
                  <option value="inactive">제외</option>
                </select>
              </label>
              <label className="pmo-field" data-holiday-field="note" style={{ gridColumn: "2 / 5" }}>
                <span>비고</span>
                <input value={form.note} onChange={(event) => setField("note", event.target.value)} placeholder="예: 어린이날 대체 (5/5)" disabled={!canMutate || saving} style={FORM_INPUT_STYLE} />
              </label>
            </div>
          </section>
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button className="pmo-btn" onClick={onClose} disabled={saving}>취소</button>
          <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={() => void save()} disabled={!canMutate || saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function AdminHolidaysPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HolidayRecord[]>([]);
  const [userContext, setUserContext] = useState<DevUserContext | null>(null);
  const [permission, setPermission] = useState<UserPermission>("admin");
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole>("other");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [appliedYear, setAppliedYear] = useState(currentYear);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<HolidayListMeta["summary"]>({
    total_count: 0,
    public_count: 0,
    company_count: 0,
    alternative_count: 0,
    active_count: 0,
    monthly_counts: [],
    upcoming: [],
  });
  const [basisDate, setBasisDate] = useState(`${currentYear}-01-01`);
  const [modalRow, setModalRow] = useState<HolidayRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadHover, setDownloadHover] = useState(false);

  const canAccess = permission === "admin" || organizationRole === "head";
  const canMutate = permission === "admin";

  const loadData = async (nextPage = page, nextPageSize = pageSize, year = appliedYear) => {
    setLoading(true);
    setError(null);
    try {
      const devUser = getDevUserContext();
      setUserContext(devUser);
      setPermission(devUser.permission);
      setOrganizationRole(devUser.organizationRole);
      const response = await listHolidays({
        year,
        page: nextPage,
        page_size: nextPageSize,
        sort: "holiday_date",
      });
      setRows(response.data);
      const meta = response.meta as HolidayListMeta;
      setTotal(meta.total ?? response.data.length);
      setSummary(meta.summary);
      setBasisDate(meta.basis_date);
    } catch (nextError) {
      setRows([]);
      setTotal(0);
      setSummary({
        total_count: 0,
        public_count: 0,
        company_count: 0,
        alternative_count: 0,
        active_count: 0,
        monthly_counts: [],
        upcoming: [],
      });
      setError(nextError instanceof Error ? nextError.message : "공휴일 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(page, pageSize, appliedYear);
  }, [page, pageSize, appliedYear]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, safePage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  const summaryItems = useMemo<SummaryItem[]>(() => [
    { id: "total", label: "등록 공휴일 수", value: summary.total_count, note: `${appliedYear}년 기준`, icon: "calendar", tone: "linear-gradient(135deg, #ede9fe, #e0e7ff)", fg: "#4f46e5" },
    { id: "public", label: "법정공휴일", value: summary.public_count, icon: "building", tone: "linear-gradient(135deg, #ffe4ea, #fff1f4)", fg: "#e11d48" },
    { id: "company", label: "회사휴무", value: summary.company_count, icon: "calendar", tone: "linear-gradient(135deg, #dff7e7, #edfdf4)", fg: "#059669" },
    { id: "alternative", label: "대체휴일", value: summary.alternative_count, icon: "switch", tone: "linear-gradient(135deg, #ffe8d6, #fff4ea)", fg: "#f97316" },
    { id: "active", label: "사용중", value: summary.active_count, icon: "check", tone: "linear-gradient(135deg, #dcf7f4, #edfdfc)", fg: "#0f766e" },
  ], [appliedYear, summary]);

  const monthlyCounts = useMemo(() => {
    const map = new Map(summary.monthly_counts.map((item) => [item.month, item] as const));
    return Array.from({ length: 12 }, (_, index) => map.get(index + 1) ?? { month: index + 1, count: 0, active_count: 0 } satisfies HolidayMonthlyCount);
  }, [summary.monthly_counts]);

  const yearOptions = useMemo(() => makeYearOptions(currentYear), [currentYear]);

  const openCreateModal = () => {
    setModalRow(null);
    setModalOpen(true);
  };

  const openEditModal = (row: HolidayRecord) => {
    setModalRow(row);
    setModalOpen(true);
  };

  const toggleActive = async (row: HolidayRecord) => {
    if (!canMutate) return;
    try {
      await updateHoliday(row.id, { is_active: !row.is_active });
      await loadData(safePage, pageSize, appliedYear);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "사용여부를 변경하지 못했습니다.");
    }
  };

  const removeRow = async (row: HolidayRecord) => {
    if (!canMutate) return;
    if (!window.confirm(`${row.name} 공휴일을 삭제하시겠습니까?`)) return;
    try {
      await deleteHoliday(row.id);
      const nextPage = safePage > 1 && rows.length === 1 ? safePage - 1 : safePage;
      setPage(nextPage);
      await loadData(nextPage, pageSize, appliedYear);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "공휴일을 삭제하지 못했습니다.");
    }
  };

  const exportWorkbook = async () => {
    try {
      const response = await listHolidays({
        year: appliedYear,
        page: 1,
        page_size: 400,
        sort: "holiday_date",
      });
      await downloadHolidayWorkbook(
        response.data.map((row) => ({
          holidayDate: row.holiday_date,
          weekdayLabel: weekdayLabel(row.holiday_date),
          name: row.name,
          holidayTypeLabel: HOLIDAY_TYPE_LABEL[row.holiday_type],
          repeatLabel: repeatLabel(row),
          useStatusLabel: useStatusLabel(row),
          note: row.note ?? "-",
        })),
        `공휴일관리_${appliedYear}`,
        "공휴일관리",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "엑셀 다운로드에 실패했습니다.");
    }
  };

  if (loading && !userContext) return <LightweightLoading label="공휴일 관리" />;

  return (
    <PmoShell user={{ name: userContext?.name ?? "관리자", team: userContext?.team ?? "PMO본부", role: userContext?.role ?? "관리자", permission, organizationRole }} notifications={3} currentId="admin-holidays" pageTitle="공휴일 관리">
      {!canAccess ? (
        <section className="pmo-panel" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>권한 없음</h2>
          <p style={{ margin: 0, color: "var(--tx-4)", fontWeight: 600 }}>관리자 또는 본부장 권한이 있어야 공휴일 관리 화면에 접근할 수 있습니다.</p>
        </section>
      ) : (
        <div className="pmo-page-stack">
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {summaryItems.map((item) => <SummaryCard key={item.id} item={item} />)}
          </section>

          {error ? <section className="pmo-panel pmo-error" style={{ padding: 12 }}>{error}</section> : null}

          <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 400px)", gap: 16, alignItems: "start" }}>
            <section className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--line-2)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <strong style={{ fontSize: 18 }}>공휴일 목록</strong>
                  <span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 700 }}>총 {formatNumber(summary.total_count)}건</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <label className="pmo-field" style={{ gap: 4 }}>
                    <span style={{ fontSize: 13 }}>기준연도</span>
                    <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} style={{ height: 38, minWidth: 116 }}>
                      {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                  <button className="pmo-btn" style={{ height: 38, marginTop: 18 }} onClick={() => { setAppliedYear(selectedYear); setPage(1); }}>
                    조회
                  </button>
                  {canMutate ? (
                    <button className="pmo-btn pmo-btn-primary" style={{ height: 38, marginTop: 18, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={openCreateModal}>
                      <Icon name="plus" size={15} stroke={2} />
                      신규 공휴일 등록
                    </button>
                  ) : null}
                  <button
                    className="pmo-btn"
                    style={{ height: 38, marginTop: 18, color: downloadHover ? "#fff" : "var(--brand)", borderColor: "var(--brand)", background: downloadHover ? "var(--brand)" : "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={() => setDownloadHover(true)}
                    onMouseLeave={() => setDownloadHover(false)}
                    onClick={() => void exportWorkbook()}
                  >
                    <Icon name="download" size={15} stroke={2} />
                    엑셀 다운로드
                  </button>
                </div>
              </div>

              <div style={{ overflowX: "auto", borderBottom: "1px solid var(--line-2)" }}>
                <table className="pmo-table pmo-table--recent" style={{ minWidth: 940, textAlign: "center" }}>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>요일</th>
                      <th>명칭</th>
                      <th>구분</th>
                      <th>반복여부</th>
                      <th>사용여부</th>
                      <th>비고</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "56px 20px", textAlign: "center", color: "var(--tx-4)", fontWeight: 700 }}>등록된 공휴일이 없습니다.</td>
                      </tr>
                    ) : rows.map((row) => {
                      const weekend = isWeekend(row.holiday_date);
                      const weekday = weekdayLabel(row.holiday_date);
                      const weekdayColor = weekday === "일" ? "#ef4444" : weekday === "토" ? "#2563eb" : "var(--tx-3)";
                      return (
                        <tr key={`${row.id}-${row.holiday_date}`}>
                          <td className="num" style={{ fontWeight: 700, color: "var(--tx-2)" }}>{formatDate(row.holiday_date)}</td>
                          <td style={{ color: weekdayColor, fontWeight: 800 }}>{weekday}</td>
                          <td style={{ color: "var(--tx-1)", fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                              <span>{row.name}</span>
                              {row.is_projected ? <span style={{ fontSize: 11, color: "var(--tx-5)", fontWeight: 700 }}>반복 적용</span> : null}
                            </div>
                          </td>
                          <td><TypeBadge type={row.holiday_type} /></td>
                          <td style={{ color: "var(--tx-2)", fontWeight: 700 }}>{repeatLabel(row)}</td>
                          <td>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                              <ActiveSwitch checked={row.is_active} disabled={!canMutate} onToggle={() => void toggleActive(row)} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: row.is_active ? "var(--brand)" : "var(--tx-4)" }}>{useStatusLabel(row)}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--tx-3)", fontWeight: 600 }}>{row.note ?? "-"}</td>
                          <td>
                            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <button className="pmo-btn" style={{ width: 28, minWidth: 28, height: 28, padding: 0, justifyContent: "center" }} onClick={() => openEditModal(row)} disabled={!canMutate} aria-label={`${row.name} 수정`}>
                                <Icon name="edit" size={13} stroke={2} />
                              </button>
                              <button className="pmo-btn" style={{ width: 28, minWidth: 28, height: 28, padding: 0, justifyContent: "center", color: "#ef4444" }} onClick={() => void removeRow(row)} disabled={!canMutate} aria-label={`${row.name} 삭제`}>
                                <Icon name="trash" size={13} stroke={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
                  <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
                  <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1}>
                    <Icon name="chevronLeft" size={14} stroke={2.2} />
                  </button>
                  {pageNumbers.map((pageNumber) => (
                    <button key={pageNumber} className="pmo-btn" style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", background: pageNumber === safePage ? "var(--brand)" : "#fff", color: pageNumber === safePage ? "#fff" : "var(--tx-2)", borderColor: pageNumber === safePage ? "var(--brand)" : "var(--line-2)" }} onClick={() => setPage(pageNumber)}>
                      {pageNumber}
                    </button>
                  ))}
                  <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages}>
                    <Icon name="chevronRight" size={14} stroke={2.2} />
                  </button>
                  <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
                </div>
                <select className="pmo-btn" style={{ height: 32, marginLeft: "auto" }} value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                  <option value="10">10개씩 보기</option>
                  <option value="20">20개씩 보기</option>
                  <option value="50">50개씩 보기</option>
                </select>
              </div>
            </section>

            <div className="pmo-page-stack">
              <section className="pmo-panel" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                  <strong style={{ fontSize: 18 }}>월별 공휴일 현황</strong>
                  <span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 700 }}>총 {formatNumber(summary.total_count)}건</span>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {monthlyCounts.map((item) => (
                    <div key={item.month} style={{ display: "grid", gridTemplateColumns: "52px 42px 1fr", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, color: "var(--tx-3)", fontWeight: 700 }}>{item.month}월</span>
                      <span style={{ fontSize: 14, color: "var(--tx-2)", fontWeight: 700 }}>{item.count}건</span>
                      <span style={{ display: "grid", gridTemplateColumns: "repeat(10, 10px)", gap: 6, alignItems: "center" }}>
                        {Array.from({ length: 10 }, (_, index) => (
                          <span key={index} style={{ width: 10, height: 10, borderRadius: "50%", background: index < Math.min(item.count, 10) ? "var(--brand)" : "#e7ebf3", opacity: index < Math.min(item.active_count, 10) ? 1 : 0.6 }} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pmo-panel" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                  <strong style={{ fontSize: 18 }}>다가오는 공휴일</strong>
                  <span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 700 }}>기준일 {basisDate}</span>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {summary.upcoming.length === 0 ? (
                    <div style={{ padding: "14px 0", color: "var(--tx-4)", fontWeight: 600 }}>기준일 이후 예정된 공휴일이 없습니다.</div>
                  ) : summary.upcoming.map((item: HolidayUpcomingRecord) => (
                    <div key={`${item.id}-${item.holiday_date}`} style={{ display: "grid", gridTemplateColumns: "82px 1fr auto", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--line-1)" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 30, borderRadius: 10, background: "#eef1ff", color: "var(--brand)", fontSize: 13, fontWeight: 800 }}>
                        {item.holiday_date.slice(5)} {weekdayLabel(item.holiday_date)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ color: "var(--tx-1)", fontWeight: 700 }}>{item.name}</span>
                        <TypeBadge type={item.holiday_type} />
                      </div>
                      <span style={{ color: "var(--tx-3)", fontWeight: 800 }}>{dDayLabel(item.d_day)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <HolidayEditModal
            open={modalOpen}
            row={modalRow}
            canMutate={canMutate}
            onClose={() => setModalOpen(false)}
            onSaved={async () => {
              await loadData(safePage, pageSize, appliedYear);
            }}
          />
        </div>
      )}
    </PmoShell>
  );
}
