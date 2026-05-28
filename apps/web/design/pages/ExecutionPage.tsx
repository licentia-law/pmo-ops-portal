"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getP1Screen } from "../../app/lib/api";
import { CommonPeriodPicker } from "../components/CommonPeriodPicker";
import { PmoShell } from "../components/PmoShell";
import ProjectMasterEditModal from "../components/ProjectMasterEditModal";
import LightweightLoading from "../components/LightweightLoading";
import { downloadProjectWorkbook } from "./projectWorkbookExport";

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
  | "calendar"
  | "folder"
  | "check"
  | "play"
  | "execution"
  | "report"
  | "circle"
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
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v3M16 4v3",
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  check: "M5 12l4 4 10-10",
  play: "M8 5.5v13l11-6.5z",
  execution: "M14.5 4.5l5 5L8 21H3v-5zM13 6l5 5",
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  circle: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
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

function StatusBadge({ code, fontSize }: { code: string; fontSize?: number }) {
  return <span className={`pmo-badge pmo-badge--${code}`} style={fontSize ? { fontSize } : undefined}>{STATUS_LABEL[code] ?? code}</span>;
}

const BIZ_TONE: Record<string, { fg: string; bg: string }> = {
  "주사업": { fg: "#1d4ed8", bg: "#e3eefe" },
  "부사업": { fg: "#7c3aed", bg: "#ede5fd" },
  "하도": { fg: "#b45309", bg: "#fef4e1" },
  "협력": { fg: "#475569", bg: "#eef2f7" }
};

function BizChip({ type }: { type: string }) {
  const t = BIZ_TONE[type] ?? BIZ_TONE["주사업"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: t.fg, background: t.bg }}>{type}</span>;
}

function formatAmountPair(amountText: string) {
  const raw = String(amountText ?? "").trim();
  if (!raw || raw === "-") return "-";
  const parts = raw.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return `${parts[0]}/${parts[0]}`;
}

type ExecutionFilterState = {
  businessType: string;
  status: string;
  proposalPm: string;
  salesOwner: string;
  periodPreset: "all" | "recent3m" | "thisMonth" | "lastMonth" | "thisYear" | "custom";
  from: string;
  to: string;
  query: string;
};

function fmtDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function downloadExecutionCsv(rows: any[], codeRows: any[]) {
  const byCode = new Map((codeRows ?? []).map((row: any) => [String(row.code ?? ""), row]));
  const normalizedRows = rows.map((row) => {
    const code = String(row.code ?? "");
    const detail = byCode.get(code) ?? {};
    return {
      code: detail.code ?? row.code ?? "-",
      name: detail.name ?? row.name ?? "-",
      clientName: detail.clientName ?? row.clientName ?? "-",
      projectType: detail.projectType ?? row.businessType ?? "-",
      certainty: detail.certainty ?? "-",
      amountText: detail.amountText ?? "-",
      bidNoticeNo: detail.bidNoticeNo ?? "-",
      bidNoticeDate: detail.bidNoticeDate ?? "-",
      statusLabel: STATUS_LABEL[detail.status ?? row.status] ?? detail.status ?? row.status ?? "-",
      salesDept: detail.salesDept ?? "-",
      salesOwner: detail.salesOwner ?? row.salesOwner ?? "-",
      proposalPm: detail.proposalPm ?? row.proposalPm ?? "-",
      presentPm: detail.presentPm ?? row.presentPm ?? "-",
      deliveryPm: detail.deliveryPm ?? row.deliveryPm ?? "-",
      proposalDeliveryTeam: detail.proposalDeliveryTeam ?? row.proposalDeliveryTeam ?? "-",
      fromDate: detail.fromDate ?? "-",
      toDate: detail.toDate ?? row.endDate ?? "-",
      proposalSubmissionAt: detail.proposalSubmissionAt ?? row.submission?.datetime ?? "-",
      submissionFormat: detail.submissionFormat ?? "-",
      submissionNote: detail.submissionNote ?? "-",
      proposalPresentationAt: detail.proposalPresentationAt ?? "-",
      presentationFormat: detail.presentationFormat ?? "-",
      presentationNote: detail.presentationNote ?? "-",
      recentActivityAt: detail.recentActivityAt ?? row.recentActivity?.datetime ?? "-",
      useStatus: detail.useStatus ?? "-",
    };
  });
  await downloadProjectWorkbook(normalizedRows, "업무수행현황", "업무수행현황");
}

function getPeriodRange(preset: ExecutionFilterState["periodPreset"], baseDate?: Date) {
  const today = baseDate ?? new Date();
  if (preset === "all") return { from: "", to: "", label: "전체" };
  if (preset === "custom") return { from: "", to: "", label: "직접 선택" };
  if (preset === "thisMonth") return { from: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmtDate(today), label: "이번달" };
  if (preset === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: fmtDate(start), to: fmtDate(end), label: "지난달" };
  }
  if (preset === "thisYear") return { from: `${today.getFullYear()}-01-01`, to: fmtDate(today), label: "올해" };
  const from = new Date(today);
  from.setMonth(from.getMonth() - 3);
  return { from: fmtDate(from), to: fmtDate(today), label: "최근 3개월" };
}

function PeriodPicker({
  value,
  from,
  to,
  onChange,
  onRangeChange,
}: {
  value: ExecutionFilterState["periodPreset"];
  from: string;
  to: string;
  onChange: (value: ExecutionFilterState["periodPreset"]) => void;
  onRangeChange: (next: { from?: string; to?: string }) => void;
}) {
  return (
    <CommonPeriodPicker
      value={value}
      from={from}
      to={to}
      onChange={(next) => onChange(next as ExecutionFilterState["periodPreset"])}
      onRangeChange={onRangeChange}
      icon={<Icon name="calendar" size={14} stroke={1.8} />}
      zIndex={20}
    />
  );
}

function toStatusCode(statusLabelOrCode: string) {
  if (!statusLabelOrCode || statusLabelOrCode === "전체") return "";
  const byLabel = Object.entries(STATUS_LABEL).find(([, label]) => label === statusLabelOrCode)?.[0];
  return byLabel ?? statusLabelOrCode;
}

function SummaryCard({ item, active, onClick }: { item: any; active: boolean; onClick: () => void }) {
  const iconMap: Record<string, IconName> = { all: "folder", proposal: "execution", running: "play", closed: "circle" };
  const toneMap: Record<string, string> = { all: "#3b6df0", proposal: "#ede5fd", running: "#dcf2e3", closed: "#f08c1f" };
  const fgMap: Record<string, string> = { all: "#fff", proposal: "#7c3aed", running: "#16a34a", closed: "#fff" };
  const footerItems = item.breakdown
    ? item.breakdown.map((b: any) => ({ label: b.label, value: b.value }))
    : (item.hint ?? "")
        .split("+")
        .map((chunk: string) => chunk.trim())
        .filter(Boolean)
        .map((chunk: string) => {
          const match = chunk.match(/^(.*?)(\d+)$/);
          if (!match) return { label: chunk, value: "" };
          return { label: match[1].trim(), value: match[2] };
        });
  return (
    <button
      onClick={onClick}
      className="pmo-panel"
      style={{
        textAlign: "left",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 136,
        cursor: "pointer",
        border: active ? "1px solid var(--brand-line)" : "1px solid var(--line-2)",
        background: active ? "var(--brand-bg)" : "var(--bg-1)",
        boxShadow: active ? "var(--sh-card), 0 0 0 1px var(--brand-line)" : "var(--sh-card)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ width: 56, height: 56, borderRadius: 14, background: toneMap[item.id], color: fgMap[item.id], display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon
            name={iconMap[item.id]}
            size={item.id === "closed" ? 34 : 24}
            stroke={item.id === "proposal" ? 2.2 : 0}
            fill={item.id === "proposal" ? "none" : "currentColor"}
          />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 15, color: "var(--tx-3)", fontWeight: 600 }}>{item.label}</span>
          <span style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, color: "var(--tx-1)" }}>{item.value}<span style={{ fontSize: 15, color: "var(--tx-4)", marginLeft: 4 }}>{item.unit}</span></span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        {footerItems.map((entry: any, idx: number) => (
          <span key={`${entry.label}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: "var(--bg-3)", border: "1px solid var(--line-2)", fontSize: 13, color: "var(--tx-3)", fontWeight: 600 }}>
            <span>{entry.label}</span>
            {entry.value !== "" ? <strong style={{ color: "var(--tx-1)", fontWeight: 800 }}>{entry.value}</strong> : null}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function ExecutionPage() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [codeRows, setCodeRows] = useState<any[]>([]);
  const [codeRowsLoaded, setCodeRowsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [downloadHover, setDownloadHover] = useState(false);
  const [filterForm, setFilterForm] = useState<ExecutionFilterState | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<ExecutionFilterState | null>(null);
  const codeRowsLoadingRef = useRef<Promise<any[]> | null>(null);
  const periodBaseDate = useMemo(() => new Date(), []);
  const ensureCodeRowsLoaded = async () => {
    if (codeRowsLoaded) return codeRows;
    if (codeRowsLoadingRef.current) return codeRowsLoadingRef.current;
    const loading = getP1Screen("code").then((result) => {
      const nextRows = ((result.data as any)?.rows ?? []) as any[];
      setCodeRows(nextRows);
      setCodeRowsLoaded(true);
      return nextRows;
    }).finally(() => {
      codeRowsLoadingRef.current = null;
    });
    codeRowsLoadingRef.current = loading;
    return loading;
  };
  useEffect(() => {
    let alive = true;
    getP1Screen("execution").then((result) => {
      if (alive) {
        const payload = result.data as any;
        const initialFilter: ExecutionFilterState = {
          businessType: "전체",
          status: "전체",
          proposalPm: "전체",
          salesOwner: "전체",
          periodPreset: "all",
          from: "",
          to: "",
          query: "",
        };
        setData(payload);
        setSelectedCode(payload.selectedRow.code);
        setFilterForm(initialFilter);
        setAppliedFilter(initialFilter);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  const statusFilterBySummary: Record<string, string[]> = {
    all: [],
    proposal: ["proposing", "presented"],
    running: ["running", "support"],
    closed: ["win", "loss", "drop", "done"]
  };
  const filteredRows = useMemo(() => {
    if (!data) return [];
    const byForm = (data.rows ?? []).filter((row: any) => {
      if (!appliedFilter) return true;
      if (appliedFilter.businessType !== "전체" && row.businessType !== appliedFilter.businessType) return false;
      if (appliedFilter.status !== "전체" && row.status !== toStatusCode(appliedFilter.status)) return false;
      if (appliedFilter.proposalPm !== "전체") {
        const selectedPm = appliedFilter.proposalPm;
        const matchedPm = [row.proposalPm, row.presentPm, row.deliveryPm].some((pm) => (pm ?? "-") === selectedPm);
        if (!matchedPm) return false;
      }
      if (appliedFilter.salesOwner !== "전체" && row.salesOwner !== appliedFilter.salesOwner) return false;
      const submitDate = String(row.submission?.datetime ?? "").slice(0, 10);
      if (appliedFilter.from && submitDate && submitDate < appliedFilter.from) return false;
      if (appliedFilter.to && submitDate && submitDate > appliedFilter.to) return false;
      if (appliedFilter.query.trim()) {
        const q = appliedFilter.query.trim().toLowerCase();
        const target = `${row.code ?? ""} ${row.name ?? ""} ${row.clientName ?? ""} ${row.proposalPm ?? ""} ${row.presentPm ?? ""} ${row.deliveryPm ?? ""} ${row.proposalDeliveryTeam ?? ""} ${row.salesOwner ?? ""} ${row.remark ?? ""}`.toLowerCase();
        if (!target.includes(q)) return false;
      }
      return true;
    });
    const bySummary = (() => {
      if (!activeSummary) return byForm;
      const allowed = statusFilterBySummary[activeSummary] ?? [];
      if (allowed.length === 0) return byForm;
      return byForm.filter((row: any) => allowed.includes(row.status));
    })();

    return [...bySummary].sort((a: any, b: any) => {
      const aDate = String(a.endDate ?? "").trim();
      const bDate = String(b.endDate ?? "").trim();
      const aValid = /^\d{4}-\d{2}-\d{2}$/.test(aDate);
      const bValid = /^\d{4}-\d{2}-\d{2}$/.test(bDate);
      if (aValid && bValid) {
        const byEndDate = bDate.localeCompare(aDate);
        if (byEndDate !== 0) return byEndDate;
        const aCode = String(a.code ?? "");
        const bCode = String(b.code ?? "");
        return bCode.localeCompare(aCode);
      }
      if (aValid) return -1;
      if (bValid) return 1;
      const aCode = String(a.code ?? "");
      const bCode = String(b.code ?? "");
      return bCode.localeCompare(aCode);
    });
  }, [activeSummary, appliedFilter, data]);
  const selectedRow = useMemo(() => filteredRows.find((row: any) => row.code === selectedCode) ?? data?.rows?.find((row: any) => row.code === selectedCode) ?? null, [filteredRows, selectedCode, data]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows.length, pageSize]);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);
  const visiblePageNumbers = useMemo(() => {
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!filteredRows.some((row: any) => row.code === selectedCode) && filteredRows[0]) {
      setSelectedCode(filteredRows[0].code);
    }
  }, [filteredRows, selectedCode]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const summaryFilterLabel = useMemo(() => {
    const labels: string[] = [];
    if (activeSummary) {
      const kpiLabel = data?.summary?.find((s: any) => s.id === activeSummary)?.label;
      if (kpiLabel) labels.push(kpiLabel);
    }
    if (appliedFilter) {
      if (appliedFilter.businessType !== "전체") labels.push(`사업유형: ${appliedFilter.businessType}`);
      if (appliedFilter.status !== "전체") labels.push(`상태: ${appliedFilter.status}`);
      if (appliedFilter.salesOwner !== "전체") labels.push(`영업대표: ${appliedFilter.salesOwner}`);
      if (appliedFilter.proposalPm !== "전체") labels.push(`PM: ${appliedFilter.proposalPm}`);
      if (appliedFilter.periodPreset !== "all" && (appliedFilter.from || appliedFilter.to)) labels.push(`기간: ${appliedFilter.from} ~ ${appliedFilter.to}`);
      if (appliedFilter.query.trim()) labels.push(`검색어: ${appliedFilter.query.trim()}`);
    }
    return labels.length ? labels.join(" · ") : null;
  }, [activeSummary, appliedFilter, data?.summary]);
  if (!data || !filterForm) return <LightweightLoading label="업무수행현황" />;

  return (
    <PmoShell user={data.meta.user} notifications={data.meta.notifications} currentId="project-operations" pageTitle="업무수행현황">
      <section className="pmo-panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          {["사업유형", "상태", "영업대표", "PM"].map((label, idx) => (
            <label key={label} className="pmo-field">
              <span style={{ fontSize: 14 }}>{label}</span>
              <select
                value={idx === 0 ? filterForm.businessType : idx === 1 ? filterForm.status : idx === 2 ? filterForm.salesOwner : filterForm.proposalPm}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterForm((prev) => {
                    if (!prev) return prev;
                    if (idx === 0) return { ...prev, businessType: value };
                    if (idx === 1) return { ...prev, status: value };
                    if (idx === 2) return { ...prev, salesOwner: value };
                    return { ...prev, proposalPm: value };
                  });
                }}
                style={{ fontSize: 14 }}
              >
                {(idx === 0 ? data.filters.businessTypes : idx === 1 ? data.filters.statuses : idx === 2 ? data.filters.salesOwners : (data.filters.proposalPms ?? data.filters.leadPms ?? [])).map((opt: string) => <option value={opt} key={opt}>{opt}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) minmax(320px, 1fr) auto", gap: 12, alignItems: "end", marginTop: 12 }}>
          <label className="pmo-field">
            <span style={{ fontSize: 14 }}>기간</span>
            <PeriodPicker
              value={filterForm.periodPreset}
              from={filterForm.from}
              to={filterForm.to}
              onChange={(preset) => {
                setFilterForm((prev) => {
                  if (!prev) return prev;
                  if (preset === "custom") return { ...prev, periodPreset: preset, from: prev.from, to: prev.to };
                  const range = getPeriodRange(preset, periodBaseDate);
                  return { ...prev, periodPreset: preset, from: range.from, to: range.to };
                });
              }}
              onRangeChange={(next) => {
                setFilterForm((prev) => (prev ? { ...prev, from: next.from ?? prev.from, to: next.to ?? prev.to } : prev));
              }}
            />
          </label>
          <label className="pmo-field">
            <span style={{ fontSize: 14 }}>검색어</span>
            <input
              value={filterForm.query}
              onChange={(e) => setFilterForm((prev) => prev ? { ...prev, query: e.target.value } : prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setAppliedFilter(filterForm);
                  setCurrentPage(1);
                }
              }}
              placeholder="사업명, 고객사, 영업대표, PM, 제안/수행팀 검색"
              style={{ fontSize: 14 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <button
              className="pmo-btn pmo-btn-primary"
              style={{ background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }}
              onClick={() => {
                setAppliedFilter(filterForm);
                setCurrentPage(1);
              }}
            >
              <Icon name="search" size={14} stroke={2} style={{ marginRight: 4 }} />
              조회
            </button>
            <button
              className="pmo-btn"
              onClick={() => {
                const reset: ExecutionFilterState = {
                  businessType: "전체",
                  status: "전체",
                  proposalPm: "전체",
                  salesOwner: "전체",
                  periodPreset: "all",
                  from: "",
                  to: "",
                  query: "",
                };
                setFilterForm(reset);
                setAppliedFilter(reset);
                setActiveSummary(null);
                setCurrentPage(1);
              }}
            >
              초기화
            </button>
            <button
              className="pmo-btn pmo-btn-primary"
              style={{ background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }}
              onClick={async () => {
                await ensureCodeRowsLoaded();
                setCreatingProject(true);
              }}
            >
              <Icon name="plus" size={14} stroke={2} style={{ marginRight: 4 }} />
              신규 프로젝트 등록
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
                {data.summary.map((item: any) => (
          <SummaryCard
            key={item.id}
            item={item}
            active={activeSummary === item.id}
            onClick={() => {
              setActiveSummary(activeSummary === item.id ? null : item.id);
              setCurrentPage(1);
            }}
          />
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <div className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 18 }}>사업 목록</strong>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--tx-4)" }}>
              <span>
                총 {filteredRows.length}건
                {summaryFilterLabel ? <span style={{ color: "var(--brand)", fontWeight: 600 }}> · 필터: {summaryFilterLabel}</span> : null}
              </span>
              <button
                className="pmo-btn"
                style={{
                  height: 30,
                  padding: "0 10px",
                  fontSize: 13,
                  fontWeight: downloadHover ? 700 : 600,
                  background: downloadHover ? "var(--brand)" : "#fff",
                  color: downloadHover ? "#fff" : "var(--tx-2)",
                  borderColor: downloadHover ? "var(--brand)" : "var(--line-2)",
                }}
                onMouseEnter={() => setDownloadHover(true)}
                onMouseLeave={() => setDownloadHover(false)}
                onClick={async () => {
                  const rowsForExport = await ensureCodeRowsLoaded();
                  await downloadExecutionCsv(filteredRows, rowsForExport);
                }}
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="pmo-table pmo-table--recent">
              <thead>
                <tr>
                  <th style={{ width: 56, textAlign: "center" }}></th><th>상태</th><th>사업명</th><th>고객사</th><th>영업대표</th><th>제안PM</th><th>발표PM</th><th>수행PM</th><th>제안/수행팀</th><th>사업 종료일</th><th style={{ textAlign: "center" }}>프로젝트 상세</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row: any) => (
                  <tr
                    key={row.code}
                    onClick={() => setSelectedCode(row.code)}
                    style={{ cursor: "pointer", background: selectedCode === row.code ? "var(--brand-bg)" : undefined }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="pmo-btn"
                        style={{ width: 24, minWidth: 24, height: 24, padding: 0, justifyContent: "center", fontSize: 12 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          void (async () => {
                            await ensureCodeRowsLoaded();
                            setEditingProject(row);
                          })();
                        }}
                        title="편집"
                        aria-label={`${row.code} 편집`}
                      >
                        ✏
                      </button>
                    </td>
                    <td><StatusBadge code={row.status} /></td>
                    <td style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.clientName ?? "-"}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.salesOwner}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.proposalPm}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.presentPm ?? "-"}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.deliveryPm ?? "-"}</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.4 }}>{row.proposalDeliveryTeam ?? "-"}</td>
                    <td className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)" }}>{row.endDate ?? "-"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        aria-label="프로젝트 상세 보기"
                        title="프로젝트 상세 보기"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (row.projectId) router.push(`/projects/${row.projectId}`);
                        }}
                        style={{ width: 28, height: 28, padding: 0, background: "transparent", border: "1px solid var(--line-2)", borderRadius: 6, color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <Icon name="chevronRight" size={13} stroke={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px", borderTop: "1px solid var(--line-2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
            {visiblePageNumbers[0] > 1 ? <span style={{ color: "var(--tx-4)", padding: "0 2px" }}>…</span> : null}
            {visiblePageNumbers.map((pageNo) => (
              <button key={pageNo} className="pmo-btn" onClick={() => setCurrentPage(pageNo)} style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", textAlign: "center", background: pageNo === currentPage ? "var(--brand)" : "#fff", color: pageNo === currentPage ? "#fff" : "var(--tx-2)", borderColor: pageNo === currentPage ? "var(--brand)" : "var(--line-2)" }}>
                {pageNo}
              </button>
            ))}
            {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages ? <span style={{ color: "var(--tx-4)", padding: "0 2px" }}>…</span> : null}
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
            </div>
            <select
              className="pmo-btn"
              style={{ height: 32, marginLeft: "auto" }}
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10개씩 보기</option>
              <option value="20">20개씩 보기</option>
              <option value="50">50개씩 보기</option>
              <option value="100">100개씩 보기</option>
            </select>
          </div>
        </div>

      </section>
      <ProjectMasterEditModal
        mode="edit"
        open={!!editingProject}
        row={editingProject}
        rows={codeRows}
        onClose={() => setEditingProject(null)}
        onSaved={async () => {
          const refreshed = await getP1Screen("execution");
          setData(refreshed.data);
          if (codeRowsLoaded) {
            const refreshedCode = await getP1Screen("code");
            setCodeRows((refreshedCode.data as any)?.rows ?? []);
          }
        }}
      />
      <ProjectMasterEditModal
        mode="create"
        open={creatingProject}
        row={null}
        rows={codeRows}
        onClose={() => setCreatingProject(false)}
        onSaved={async () => {
          const refreshed = await getP1Screen("execution");
          setData(refreshed.data);
          if (codeRowsLoaded) {
            const refreshedCode = await getP1Screen("code");
            setCodeRows((refreshedCode.data as any)?.rows ?? []);
          }
        }}
      />
    </PmoShell>
  );
}
