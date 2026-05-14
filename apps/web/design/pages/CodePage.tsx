"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { getP1Screen, updateProject, updateProjectCode } from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";

type IconName =
  | "home"
  | "briefcase"
  | "users"
  | "trending"
  | "settings"
  | "chevronDown"
  | "chevronUp"
  | "chevronRight"
  | "search"
  | "bell"
  | "menu"
  | "report"
  | "lightbulb"
  | "presentation"
  | "trophy"
  | "xCircle"
  | "arrowDown"
  | "play"
  | "checkCircle"
  | "plus";

const ICONS: Record<IconName, string> = {
  home: "M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  briefcase: "M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  trending: "M3 17l5-5 4 4 7-7M14 9h6v6",
  settings: "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.4a2 2 0 0 1-4 0v-.2a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H5a2 2 0 0 1 0-4h.2a1 1 0 0 0 .7-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.7-.7V5a2 2 0 0 1 4 0v.2a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.7 1.7H19a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.4 0",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  menu: "M4 6h16M4 12h16M4 18h16",
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z",
  presentation: "M3 4h18v12H3zM3 16l4 4M21 16l-4 4M12 16v4M7 12V9M11 12V7M15 12v-4M19 12v-2",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M9 14h6l1 4H8zM7 21h10",
  xCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6",
  arrowDown: "M12 4v14M6 12l6 6 6-6",
  play: "M7 4l13 8-13 8z",
  checkCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.5 2.5L16 9.5",
  plus: "M12 5v14M5 12h14"
};

function Icon({ name, size = 16, stroke = 1.6, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };

function StatusBadge({ code }: { code: string }) {
  return <span className={`pmo-badge pmo-badge--${code}`}>{STATUS_LABEL[code] ?? code}</span>;
}

const STATUS_CARD_TONE: Record<string, { fg: string; bg: string; line: string }> = {
  proposing: { fg: "#7c3aed", bg: "#ede5fd", line: "#dbcaf9" },
  presented: { fg: "#1d4ed8", bg: "#e3eefe", line: "#c2d8fb" },
  win: { fg: "#047857", bg: "#dcf2e3", line: "#bce5cb" },
  loss: { fg: "#be123c", bg: "#fde7eb", line: "#f4b8c4" },
  drop: { fg: "#c2410c", bg: "#fde7d8", line: "#f5c9a4" },
  running: { fg: "#4338CA", bg: "#dde3ff", line: "#c7d0fb" },
  support: { fg: "#b45309", bg: "#fef4e1", line: "#f5d99c" },
  done: { fg: "#0f766e", bg: "#d6f1ec", line: "#a3dad1" }
};

const STATUS_ICON: Record<string, IconName> = {
  proposing: "lightbulb",
  presented: "presentation",
  win: "trophy",
  loss: "xCircle",
  drop: "arrowDown",
  running: "play",
  support: "users",
  done: "checkCircle"
};

function StatusCard({ s, active, onClick }: { s: any; active: boolean; onClick: () => void }) {
  const t = STATUS_CARD_TONE[s.code];
  return (
    <button
      onClick={onClick}
      className="pmo-panel"
      style={{
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        border: active ? `1.5px solid ${t.fg}` : "1px solid var(--line-2)",
        background: active ? t.bg : "var(--bg-1)",
        cursor: "pointer",
        textAlign: "left",
        minHeight: 88
      }}
    >
      <span style={{ width: 44, height: 44, borderRadius: 10, background: active ? "#fff" : t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
        <Icon name={STATUS_ICON[s.code]} size={22} stroke={s.code === "running" ? 0 : 1.7} fill={s.code === "running" ? "currentColor" : "none"} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 4 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>{s.label}</span>
        <span style={{ fontSize: 24, lineHeight: 1.05, fontWeight: 700, color: "var(--tx-1)" }}>{s.value}<span style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{s.unit}</span></span>
      </div>
    </button>
  );
}

function BusinessTypeChip({ name }: { name: string }) {
  const tones: Record<string, { fg: string; bg: string; line: string }> = {
    "주사업": { fg: "#4338CA", bg: "#eef1ff", line: "#c7d0fb" },
    "부사업": { fg: "#0f766e", bg: "#d6f1ec", line: "#a3dad1" },
    "하도": { fg: "#b45309", bg: "#fef4e1", line: "#f5d99c" },
    "협력": { fg: "#475569", bg: "#eef1f6", line: "#e5e9f1" }
  };
  const t = tones[name] ?? tones["협력"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap" }}>{name}</span>;
}

const PROJECT_TYPE_LABEL: Record<string, string> = {
  main: "주사업",
  sub: "부사업",
  subcontract: "하도",
  partner: "협력",
};

function resolveBusinessType(row: any): string {
  const direct = String(row?.projectType ?? row?.businessType ?? "").trim();
  if (direct) return direct;
  const rawType = String(row?.project_type ?? "").trim().toLowerCase();
  return PROJECT_TYPE_LABEL[rawType] ?? "-";
}

function CertaintyChip({ value }: { value: string }) {
  if (!value || value === "-") return <span style={{ color: "var(--tx-5)" }}>-</span>;
  const tones: Record<string, { fg: string; bg: string; line: string }> = {
    "우세": { fg: "#047857", bg: "#e3f6ec", line: "#bce5cb" },
    "경쟁": { fg: "#b45309", bg: "#fef4e1", line: "#f5d99c" },
    "열세": { fg: "#be123c", bg: "#fde7eb", line: "#f4b8c4" },
    "확보": { fg: "#4338CA", bg: "#eef1ff", line: "#c7d0fb" }
  };
  const t = tones[value];
  if (!t) return <span style={{ color: "var(--tx-3)" }}>{value}</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{value}</span>;
}

function UseChip({ value }: { value: string }) {
  const on = value !== "미사용";
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", background: on ? "#e3f6ec" : "#eef1f6", color: on ? "#047857" : "#64748b", border: `1px solid ${on ? "#bce5cb" : "#e5e9f1"}`, borderRadius: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{value || "사용"}</span>;
}

function ViewMenu() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      <button style={{ height: 26, padding: "0 12px", border: "1px solid var(--line-2)", borderRight: 0, borderRadius: "6px 0 0 6px", background: "#fff", color: "var(--tx-2)", fontSize: 14, fontWeight: 600 }}>보기</button>
      <button title="더 보기" style={{ width: 26, height: 26, padding: 0, border: "1px solid var(--line-2)", borderRadius: "0 6px 6px 0", background: "#fff", color: "var(--tx-4)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronDown" size={12} stroke={2} /></button>
    </div>
  );
}

type EditForm = {
  code: string;
  name: string;
  clientName: string;
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
  recentActivityAt: string;
  memo: string;
  useStatus: string;
};

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

const SELECT_STYLE: CSSProperties = {
  height: 38,
  padding: "0 32px 0 12px",
  border: "1px solid var(--line-2)",
  borderRadius: 8,
  background: "#fff",
  fontSize: 13.5,
  color: "var(--tx-1)",
  fontWeight: 500,
  appearance: "none",
  width: "100%",
  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center"
};

function CodePageImpl() {
  const [data, setData] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("전체");
  const [leadPmFilter, setLeadPmFilter] = useState("전체");
  const [useFilter, setUseFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getP1Screen("code").then((result) => {
      if (alive) setData(result.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const owners = useMemo<string[]>(() => ["전체", ...Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.salesOwner))))], [data]);
  const leadPms = useMemo<string[]>(() => ["전체", ...Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.proposalPm))))], [data]);
  const salesOwnersForEdit = useMemo<string[]>(
    () =>
      Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.salesOwner ?? "").trim()).filter((v: string) => v && v !== "-")))
        .sort((a, b) => a.localeCompare(b, "ko-KR")),
    [data]
  );
  const leadPmsForEdit = useMemo<string[]>(
    () =>
      Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.proposalPm ?? "").trim()).filter((v: string) => v && v !== "-")))
        .sort((a, b) => a.localeCompare(b, "ko-KR")),
    [data]
  );
  const certainties = useMemo<string[]>(
    () =>
      Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.certainty ?? "").trim()).filter((v: string) => v && v !== "-")))
        .sort((a, b) => a.localeCompare(b, "ko-KR")),
    [data]
  );
  const filteredRows = useMemo(() => {
    return (data?.rows ?? []).filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (ownerFilter !== "전체" && r.salesOwner !== ownerFilter) return false;
      if (leadPmFilter !== "전체" && r.proposalPm !== leadPmFilter) return false;
      if (useFilter !== "전체" && r.useStatus !== useFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!(String(r.code).toLowerCase().includes(q) || String(r.name).toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, statusFilter, ownerFilter, leadPmFilter, useFilter, query]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, totalPages]);

  if (!data) return null;

  const openEdit = (row: any) => {
    setEditingRow(row);
    setEditForm({
      code: row.code ?? "",
      name: row.name ?? "",
      clientName: row.clientName && row.clientName !== "-" ? row.clientName : "",
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
      recentActivityAt: toDateTimeLocal(row.recentActivityAt),
      memo: row.memo && row.memo !== "-" ? row.memo : "",
      useStatus: row.useStatus ?? "사용"
    });
    setSaveError(null);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingRow(null);
    setEditForm(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editingRow || !editForm) return;
    setSaving(true);
    setSaveError(null);
    try {
      const mappedProjectType = ({ "주사업": "main", "부사업": "sub", "하도": "subcontract", "협력": "partner" } as const)[editForm.projectType as "주사업" | "부사업" | "하도" | "협력"] ?? "main";
      const payload = {
        code: editForm.code.trim() || undefined,
        name: editForm.name.trim() || undefined,
        project_type: mappedProjectType,
        status: editForm.status as any,
        certainty: editForm.certainty.trim() || null,
        sales_owner: editForm.salesOwner.trim() || null,
        start_date: editForm.fromDate || null,
        end_date: editForm.toDate || null,
        is_active: editForm.useStatus !== "미사용",
      };
      const updated = await updateProjectCode(editingRow.id, payload);
      const updatedData = updated.data as any;
      const totalAmountValue = toNumberOrNull(editForm.totalAmount);
      const companyAmountValue = toNumberOrNull(editForm.companyAmount);
      const amountTextValue = toAmountText(totalAmountValue, companyAmountValue);
      const submissionAtValue = joinDateTime(editForm.proposalSubmissionDate, editForm.proposalSubmissionTime, editForm.useProposalSubmissionTime);
      const presentationAtValue = joinDateTime(editForm.proposalPresentationDate, editForm.proposalPresentationTime, editForm.useProposalPresentationTime);
      if (editingRow.projectId) {
        await updateProject(editingRow.projectId, {
          code: editForm.code.trim() || undefined,
          name: editForm.name.trim() || undefined,
          client_name: editForm.clientName.trim() || null,
          project_type: mappedProjectType as any,
          status: editForm.status as any,
          sales_owner: editForm.salesOwner.trim() || null,
          proposal_pm_name: editForm.proposalPm.trim() || null,
          presentation_pm_name: editForm.presentPm.trim() || null,
          delivery_pm_name: editForm.deliveryPm.trim() || null,
          amount_text: amountTextValue,
          total_amount: totalAmountValue,
          company_amount: companyAmountValue,
          bid_notice_no: editForm.bidNoticeNo.trim() || null,
          bid_notice_date: editForm.bidNoticeDate || null,
          submission_at: submissionAtValue,
          submission_format: editForm.submissionFormat.trim() || null,
          submission_note: editForm.submissionNote.trim() || null,
          presentation_at: presentationAtValue,
          presentation_format: editForm.presentationFormat.trim() || null,
          presentation_note: editForm.presentationNote.trim() || null,
          recent_activity_at: fromDateTimeLocal(editForm.recentActivityAt),
          memo: editForm.memo.trim() || null,
          start_date: editForm.fromDate || null,
          end_date: editForm.toDate || null,
        } as any);
      }
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row: any) =>
            row.id === editingRow.id
              ? {
                  ...row,
                  code: updatedData.code,
                  name: updatedData.name,
                  clientName: editForm.clientName || "-",
                  status: updatedData.status,
                  projectType: PROJECT_TYPE_LABEL[String(updatedData.project_type ?? "").toLowerCase()] ?? row.projectType ?? "-",
                  certainty: updatedData.certainty ?? "-",
                  amountText: amountTextValue ?? row.amountText ?? "-",
                  totalAmount: totalAmountValue,
                  companyAmount: companyAmountValue,
                  salesDept: row.salesDept ?? "-",
                  salesOwner: updatedData.sales_owner ?? "-",
                  proposalPm: editForm.proposalPm || row.proposalPm || "-",
                  presentPm: editForm.presentPm || "-",
                  deliveryPm: editForm.deliveryPm || "-",
                  fromDate: updatedData.start_date ?? "-",
                  toDate: updatedData.end_date ?? "-",
                  bidNoticeNo: editForm.bidNoticeNo || "-",
                  bidNoticeDate: editForm.bidNoticeDate || "-",
                  proposalSubmissionAt: submissionAtValue || "-",
                  submissionFormat: editForm.submissionFormat || "-",
                  submissionNote: editForm.submissionNote || "-",
                  proposalPresentationAt: presentationAtValue || "-",
                  presentationFormat: editForm.presentationFormat || "-",
                  presentationNote: editForm.presentationNote || "-",
                  recentActivityAt: fromDateTimeLocal(editForm.recentActivityAt) || "-",
                  memo: editForm.memo || "-",
                  useStatus: updatedData.is_active ? "사용" : "미사용",
                }
              : row
          )
        };
      });
      closeEdit();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PmoShell user={data.meta.user} notifications={data.meta.notifications} currentId="project-codes" pageTitle="프로젝트 관리">
      <section className="pmo-panel" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr auto auto", gap: 12, alignItems: "flex-end" }}>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>영업대표</span>
            <select style={SELECT_STYLE} value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}>
              {owners.map((owner: string) => <option key={owner} value={owner}>{owner}</option>)}
            </select>
          </label>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>제안PM</span>
            <select style={SELECT_STYLE} value={leadPmFilter} onChange={(e) => { setLeadPmFilter(e.target.value); setPage(1); }}>
              {leadPms.map((pm: string) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </label>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>사용여부</span>
            <select style={SELECT_STYLE} value={useFilter} onChange={(e) => { setUseFilter(e.target.value); setPage(1); }}>
              {["전체", "사용", "미사용"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="pmo-field" style={{ minWidth: 0, flex: 2 }}>
            <span style={{ fontSize: 14 }}>검색어</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid var(--line-2)", borderRadius: 8, background: "#fff" }}>
              <Icon name="search" size={15} stroke={1.8} style={{ color: "var(--tx-5)" }} />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="프로젝트 관리, 프로젝트명 검색" style={{ border: 0, outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--tx-1)" }} />
            </div>
          </label>
          <button className="pmo-btn" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap", alignSelf: "end" }}>
            <Icon name="report" size={14} stroke={1.8} style={{ marginRight: 4 }} />
            엑셀 내보내기
          </button>
          <button className="pmo-btn pmo-btn-primary" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap", alignSelf: "end", background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}>
            <Icon name="plus" size={14} stroke={2} style={{ marginRight: 4 }} />
            신규 프로젝트 등록
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        {data.summary.map((s: any) => (
          <StatusCard key={s.id} s={s} active={statusFilter === s.code} onClick={() => { setStatusFilter(statusFilter === s.code ? "all" : s.code); setPage(1); }} />
        ))}
      </section>

      <section className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line-2)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>프로젝트 목록</h2>
          <span style={{ fontSize: 12.5, color: "var(--tx-4)" }}>
            검색결과 <span style={{ color: "var(--tx-1)", fontWeight: 700 }}>{filteredRows.length}</span>건
            {statusFilter !== "all" ? <span style={{ marginLeft: 10 }}><StatusBadge code={statusFilter} /></span> : null}
          </span>
        </header>
        <div style={{ overflowX: "auto" }}>
          <table className="pmo-table pmo-table--recent pmo-table--code-master" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: 108 }}>코드</th>
                <th style={{ textAlign: "center", width: 200 }}>사업명</th>
                <th style={{ textAlign: "center", width: 128 }}>고객사</th>
                <th style={{ textAlign: "center", width: 90 }}>사업유형</th>
                <th style={{ textAlign: "center", width: 70 }}>확도</th>
                <th style={{ textAlign: "center", width: 120 }}>사업금액</th>
                <th style={{ textAlign: "center", width: 110 }}>공고번호</th>
                <th style={{ textAlign: "center", width: 110 }}>공고일</th>
                <th style={{ textAlign: "center", width: 88 }}>상태</th>
                <th style={{ textAlign: "center", width: 120 }}>영업부서</th>
                <th style={{ textAlign: "center", width: 92 }}>영업대표</th>
                <th style={{ textAlign: "center", width: 100 }}>제안PM</th>
                <th style={{ textAlign: "center", width: 100 }}>발표PM</th>
                <th style={{ textAlign: "center", width: 100 }}>수행PM</th>
                <th style={{ textAlign: "center", width: 220 }}>제안/수행팀</th>
                <th style={{ textAlign: "center", width: 108 }}>시작일</th>
                <th style={{ textAlign: "center", width: 108 }}>종료일</th>
                <th style={{ textAlign: "center", width: 124 }}>제안 제출일</th>
                <th style={{ textAlign: "center", width: 96 }}>제출 형식</th>
                <th style={{ textAlign: "center", width: 132 }}>제출 유의사항</th>
                <th style={{ textAlign: "center", width: 124 }}>제안 발표일</th>
                <th style={{ textAlign: "center", width: 96 }}>발표 형식</th>
                <th style={{ textAlign: "center", width: 132 }}>발표 유의사항</th>
                <th style={{ textAlign: "center", width: 124 }}>최근활동일</th>
                <th style={{ textAlign: "center", width: 84 }}>사용여부</th>
                <th style={{ textAlign: "center", width: 104 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={26} style={{ padding: "60px 20px", textAlign: "center", color: "var(--tx-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Icon name="search" size={28} stroke={1.5} style={{ color: "var(--tx-5)" }} />
                      <span style={{ fontWeight: 600, color: "var(--tx-3)" }}>해당 조건의 프로젝트 코드가 없습니다.</span>
                      <span style={{ fontSize: 12 }}>필터를 초기화하거나 다른 상태를 선택해 보세요.</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.map((r: any) => (
                <tr key={r.code}>
                  <td className="num" style={{ textAlign: "center", color: "var(--brand-700)", fontWeight: 600, fontSize: 14 }}>{r.code}</td>
                  <td className="name" style={{ textAlign: "center", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.45, fontSize: 14 }}>{r.name}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.clientName || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>
                    {resolveBusinessType(r) === "-" ? <span style={{ color: "var(--tx-5)" }}>-</span> : <BusinessTypeChip name={resolveBusinessType(r)} />}
                  </td>
                  <td style={{ textAlign: "center", fontSize: 14 }}><CertaintyChip value={r.certainty} /></td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.amountText || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.bidNoticeNo || "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.bidNoticeDate || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}><StatusBadge code={r.status} /></td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.salesDept}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.salesOwner}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.proposalPm}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.presentPm || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.deliveryPm || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{r.proposalDeliveryTeam || "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.fromDate && r.fromDate !== "-" ? r.fromDate : "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.toDate && r.toDate !== "-" ? r.toDate : "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.proposalSubmissionAt || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.submissionFormat || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{r.submissionNote || "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.proposalPresentationAt || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>{r.presentationFormat || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{r.presentationNote || "-"}</td>
                  <td className="num" style={{ textAlign: "center", fontSize: 14 }}>{r.recentActivityAt || "-"}</td>
                  <td style={{ textAlign: "center", fontSize: 14 }}><UseChip value={r.useStatus} /></td>
                  <td style={{ textAlign: "center", fontSize: 14 }}>
                    <button className="pmo-btn" style={{ height: 30, padding: "0 12px", fontSize: 14 }} onClick={() => openEdit(r)}>
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px", marginTop: 4, borderTop: "1px solid var(--line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
          <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {[1, 2, 3, 4, 5].map((p) => (
            <button key={p} className="pmo-btn" style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", textAlign: "center", background: p === page ? "var(--brand)" : "#fff", color: p === page ? "#fff" : "var(--tx-2)", borderColor: p === page ? "var(--brand)" : "var(--line-2)" }} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
        <select className="pmo-btn" style={{ height: 32, marginLeft: "auto", width: 130 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          <option value="10">10개씩 보기</option>
          <option value="20">20개씩 보기</option>
          <option value="50">50개씩 보기</option>
          <option value="100">100개씩 보기</option>
        </select>
      </footer>

      {editingRow && editForm ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.28)", zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
          <aside className="pmo-panel" style={{ width: 460, maxWidth: "100%", height: "100%", borderRadius: 0, padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>프로젝트 관리 편집</h3>
              <button onClick={closeEdit} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <label className="pmo-field"><span>코드</span><input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} /></label>
              <label className="pmo-field"><span>프로젝트명</span><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
              <label className="pmo-field"><span>고객사</span><input value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} /></label>
              <label className="pmo-field"><span>사업유형</span>
                <select value={editForm.projectType} onChange={(e) => setEditForm({ ...editForm, projectType: e.target.value })}>
                  {["주사업", "부사업", "하도", "협력"].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="pmo-field"><span>상태</span>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {Object.keys(STATUS_LABEL).map((code) => <option key={code} value={code}>{STATUS_LABEL[code]}</option>)}
                </select>
              </label>
              <label className="pmo-field">
                <span>확도</span>
                <select value={editForm.certainty} onChange={(e) => setEditForm({ ...editForm, certainty: e.target.value })}>
                  <option value="">선택 안함</option>
                  {certainties.map((certainty) => (
                    <option key={certainty} value={certainty}>{certainty}</option>
                  ))}
                </select>
              </label>
              <label className="pmo-field">
                <span>사업금액</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={editForm.totalAmount} onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })} placeholder="총액(억)" />
                  <input value={editForm.companyAmount} onChange={(e) => setEditForm({ ...editForm, companyAmount: e.target.value })} placeholder="당사금액(억)" />
                </div>
              </label>
              <label className="pmo-field">
                <span>영업대표</span>
                <select value={editForm.salesOwner} onChange={(e) => setEditForm({ ...editForm, salesOwner: e.target.value })}>
                  <option value="">선택 안함</option>
                  {salesOwnersForEdit.map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </label>
              <label className="pmo-field">
                <span>제안PM</span>
                <select value={editForm.proposalPm} onChange={(e) => setEditForm({ ...editForm, proposalPm: e.target.value })}>
                  <option value="">선택 안함</option>
                  {leadPmsForEdit.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </label>
              <label className="pmo-field">
                <span>발표PM</span>
                <select value={editForm.presentPm} onChange={(e) => setEditForm({ ...editForm, presentPm: e.target.value })}>
                  <option value="">선택 안함</option>
                  {leadPmsForEdit.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </label>
              <label className="pmo-field">
                <span>수행PM</span>
                <select value={editForm.deliveryPm} onChange={(e) => setEditForm({ ...editForm, deliveryPm: e.target.value })}>
                  <option value="">선택 안함</option>
                  {leadPmsForEdit.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="pmo-field"><span>시작일</span><input type="date" value={editForm.fromDate} onChange={(e) => setEditForm({ ...editForm, fromDate: e.target.value })} /></label>
                <label className="pmo-field"><span>종료일</span><input type="date" value={editForm.toDate} onChange={(e) => setEditForm({ ...editForm, toDate: e.target.value })} /></label>
              </div>
              <label className="pmo-field"><span>공고번호</span><input value={editForm.bidNoticeNo} onChange={(e) => setEditForm({ ...editForm, bidNoticeNo: e.target.value })} /></label>
              <label className="pmo-field"><span>공고일</span><input type="date" value={editForm.bidNoticeDate} onChange={(e) => setEditForm({ ...editForm, bidNoticeDate: e.target.value })} /></label>
              <label className="pmo-field">
                <span>제안 제출일/방법</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <input type="date" value={editForm.proposalSubmissionDate} onChange={(e) => setEditForm({ ...editForm, proposalSubmissionDate: e.target.value })} />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-3)", fontWeight: 600 }}>
                    <input type="checkbox" checked={editForm.useProposalSubmissionTime} onChange={(e) => setEditForm({ ...editForm, useProposalSubmissionTime: e.target.checked })} />
                    시간 사용
                  </label>
                </div>
                <input type="time" value={editForm.proposalSubmissionTime} disabled={!editForm.useProposalSubmissionTime} onChange={(e) => setEditForm({ ...editForm, proposalSubmissionTime: e.target.value })} />
                <select value={editForm.submissionFormat} onChange={(e) => setEditForm({ ...editForm, submissionFormat: e.target.value })}>
                  <option value="">선택 안함</option>
                  <option value="온라인">온라인</option>
                  <option value="오프라인">오프라인</option>
                </select>
                <input value={editForm.submissionNote} onChange={(e) => setEditForm({ ...editForm, submissionNote: e.target.value })} placeholder="제출 유의사항" />
              </label>
              <label className="pmo-field">
                <span>제안 발표일/방법</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <input type="date" value={editForm.proposalPresentationDate} onChange={(e) => setEditForm({ ...editForm, proposalPresentationDate: e.target.value })} />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-3)", fontWeight: 600 }}>
                    <input type="checkbox" checked={editForm.useProposalPresentationTime} onChange={(e) => setEditForm({ ...editForm, useProposalPresentationTime: e.target.checked })} />
                    시간 사용
                  </label>
                </div>
                <input type="time" value={editForm.proposalPresentationTime} disabled={!editForm.useProposalPresentationTime} onChange={(e) => setEditForm({ ...editForm, proposalPresentationTime: e.target.value })} />
                <select value={editForm.presentationFormat} onChange={(e) => setEditForm({ ...editForm, presentationFormat: e.target.value })}>
                  <option value="">선택 안함</option>
                  <option value="온라인">온라인</option>
                  <option value="오프라인">오프라인</option>
                </select>
                <input value={editForm.presentationNote} onChange={(e) => setEditForm({ ...editForm, presentationNote: e.target.value })} placeholder="발표 유의사항" />
              </label>
              <label className="pmo-field"><span>최근활동일</span><input type="datetime-local" value={editForm.recentActivityAt} onChange={(e) => setEditForm({ ...editForm, recentActivityAt: e.target.value })} /></label>
              <label className="pmo-field"><span>메모</span><textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} rows={3} style={{ resize: "vertical", minHeight: 84 }} /></label>
              <label className="pmo-field"><span>사용여부</span>
                <select value={editForm.useStatus} onChange={(e) => setEditForm({ ...editForm, useStatus: e.target.value })}>
                  <option value="사용">사용</option>
                  <option value="미사용">미사용</option>
                </select>
              </label>
              {saveError ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 600 }}>{saveError}</div> : null}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button className="pmo-btn" onClick={closeEdit} disabled={saving}>취소</button>
              <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={saveEdit} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </PmoShell>
  );
}

export default CodePageImpl;
