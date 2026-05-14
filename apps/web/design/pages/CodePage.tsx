"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createProject, createProjectCode, getP1Screen, updateProject, updateProjectCode } from "../../app/lib/api";
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

function CompactSelect({
  value,
  options,
  disabled,
  onChange,
  width = 56,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (next: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div style={{ position: "relative", width, minWidth: width }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: 38,
          border: "1px solid var(--line-2)",
          borderRadius: 8,
          background: "#fff",
          color: "var(--tx-1)",
          fontSize: 12.5,
          fontWeight: 600,
          padding: "0 18px 0 6px",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          position: "relative",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
        <span
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--tx-5)",
            pointerEvents: "none",
            fontSize: 11,
          }}
        >
          ▾
        </span>
      </button>
      {open && !disabled ? (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            zIndex: 120,
            width,
            minWidth: width,
            maxWidth: width,
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 8px 18px rgba(15,23,42,.12)",
            padding: 4,
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              style={{
                width: "100%",
                height: 30,
                border: 0,
                borderRadius: 6,
                background: option === value ? "var(--brand-bg)" : "transparent",
                color: option === value ? "var(--brand-700)" : "var(--tx-2)",
                fontSize: 12.5,
                fontWeight: option === value ? 700 : 500,
                textAlign: "left",
                padding: "0 8px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      {open && !disabled ? (
        <button
          type="button"
          aria-label="close"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, border: 0, background: "transparent", cursor: "default", zIndex: 110 }}
        />
      ) : null}
    </div>
  );
}

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

type ModalMode = "edit" | "create";
type FieldErrorMap = Partial<Record<keyof EditForm, string>>;

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
  return {
    period,
    hour: String(hour12).padStart(2, "0"),
    minute: String(validMinute).padStart(2, "0"),
  };
}

function fromTimeParts(period: "오전" | "오후", hour: string, minute: string): string {
  const hourNum = Math.min(12, Math.max(1, Number(hour) || 12));
  const minuteNum = Math.min(59, Math.max(0, Number(minute) || 0));
  let h24 = hourNum % 12;
  if (period === "오후") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}`;
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

const GROUP_SECTION_STYLE: CSSProperties = {
  padding: 14,
  marginBottom: 12,
  border: "1.5px solid #cfd8e7",
  background: "#f8fbff",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)"
};

const GROUP_TITLE_STYLE: CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 800,
  color: "var(--tx-2)",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #d8e2f0",
  background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)",
  letterSpacing: "0.01em"
};

const MEMO_MAX_LENGTH = 50;

function CodePageImpl() {
  const [data, setData] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("전체");
  const [ownerFilter, setOwnerFilter] = useState("전체");
  const [leadPmFilter, setLeadPmFilter] = useState("전체");
  const [useFilter, setUseFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("edit");
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [memoLengthError, setMemoLengthError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  useEffect(() => {
    let alive = true;
    getP1Screen("code").then((result) => {
      if (alive) setData(result.data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const owners = useMemo<string[]>(
    () => [
      "전체",
      ...Array.from(
        new Set<string>(
          (data?.rows ?? [])
            .map((r: any) => String(r.salesOwner ?? "").trim())
            .filter((v: string) => !!v && v !== "-" && v !== "undefined" && v !== "null")
        )
      ).sort((a, b) => a.localeCompare(b, "ko-KR")),
    ],
    [data]
  );
  const customers = useMemo<string[]>(
    () => ["전체", ...Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.clientName ?? "-")).filter((v: string) => v && v !== "-")))],
    [data]
  );
  const leadPms = useMemo<string[]>(() => ["전체", ...Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.proposalPm))))], [data]);
  const salesOwnersForEdit = useMemo<string[]>(
    () =>
      Array.from(new Set<string>((data?.rows ?? []).map((r: any) => String(r.salesOwner ?? "").trim()).filter((v: string) => v && v !== "-")))
        .sort((a, b) => a.localeCompare(b, "ko-KR")),
    [data]
  );
  const ownerDeptBySalesOwner = useMemo<Record<string, string>>(
    () =>
      (data?.rows ?? []).reduce((acc: Record<string, string>, row: any) => {
        const owner = String(row.salesOwner ?? "").trim();
        const dept = String(row.salesDept ?? "").trim();
        if (owner && owner !== "-" && dept && dept !== "-" && !acc[owner]) {
          acc[owner] = dept;
        }
        return acc;
      }, {}),
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
      if (customerFilter !== "전체" && String(r.clientName ?? "-") !== customerFilter) return false;
      if (ownerFilter !== "전체" && r.salesOwner !== ownerFilter) return false;
      if (leadPmFilter !== "전체" && r.proposalPm !== leadPmFilter) return false;
      if (useFilter !== "전체" && r.useStatus !== useFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystacks = [
          String(r.code ?? ""),
          String(r.name ?? ""),
          String(r.clientName ?? ""),
          String(r.salesOwner ?? ""),
          String(r.proposalPm ?? ""),
          String(r.presentPm ?? ""),
          String(r.deliveryPm ?? ""),
        ];
        if (!haystacks.some((value) => value.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, statusFilter, customerFilter, ownerFilter, leadPmFilter, useFilter, query]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, totalPages]);

  if (!data) return null;
  const errorInputStyle = (key: keyof EditForm): CSSProperties => (
    fieldErrors[key]
      ? { borderColor: "var(--crit)", boxShadow: "0 0 0 1px var(--crit) inset" }
      : {}
  );
  const fieldLabelErrorStyle = (key: keyof EditForm): CSSProperties => (
    fieldErrors[key] ? { color: "var(--crit)" } : {}
  );
  const clearFieldError = (key: keyof EditForm) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const scrollToField = (key: keyof EditForm) => {
    const target = document.querySelector(`[data-field="${key}"]`) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = target.querySelector("input, select, button") as HTMLElement | null;
    focusable?.focus();
  };

  const renderTimeControl = (
    currentValue: string,
    enabled: boolean,
    onChange: (next: string) => void,
    label: string,
    fieldKey?: keyof EditForm
  ) => {
    const parts = toTimeParts(currentValue || "09:00");
    const setPeriod = (period: "오전" | "오후") => onChange(fromTimeParts(period, parts.hour, parts.minute));
    const setHour = (hour: string) => onChange(fromTimeParts(parts.period, hour, parts.minute));
    const setMinute = (minute: string) => onChange(fromTimeParts(parts.period, parts.hour, minute));
    const minuteOptions = Array.from(new Set([parts.minute, ...Array.from({ length: 6 }, (_, i) => String(i * 10).padStart(2, "0"))]))
      .map((m) => Number(m))
      .filter((m) => Number.isFinite(m) && m >= 0 && m <= 59)
      .sort((a, b) => a - b)
      .map((m) => String(m).padStart(2, "0"));
    const periodOptions: Array<"오전" | "오후"> = ["오전", "오후"];
    const hourOptions = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}시`);
    const minuteDisplayOptions = minuteOptions.map((m) => `${m}분`);
    const selectedHour = `${parts.hour}시`;
    const selectedMinute = `${parts.minute}분`;
    return (
      <label className="pmo-field" data-field={fieldKey}>
        <span style={{ color: enabled ? "var(--tx-3)" : "var(--tx-5)", ...(fieldKey ? fieldLabelErrorStyle(fieldKey) : {}) }}>{label}</span>
        <div style={{ display: "grid", gridTemplateColumns: "56px 56px 56px", gap: 4, minWidth: 0 }}>
          <CompactSelect value={parts.period} options={periodOptions} disabled={!enabled} onChange={(next) => setPeriod(next as "오전" | "오후")} width={56} />
          <CompactSelect
            value={selectedHour}
            options={hourOptions}
            disabled={!enabled}
            onChange={(next) => setHour(next.replace("시", ""))}
            width={56}
          />
          <CompactSelect
            value={selectedMinute}
            options={minuteDisplayOptions}
            disabled={!enabled}
            onChange={(next) => setMinute(next.replace("분", ""))}
            width={56}
          />
        </div>
      </label>
    );
  };

  const openEdit = (row: any) => {
    setModalMode("edit");
    setEditingRow(row);
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
      useStatus: row.useStatus ?? "사용"
    });
    setSaveError(null);
    setMemoLengthError(null);
    setValidationError(null);
    setFieldErrors({});
  };

  const makeNextProjectCode = (): string => {
    const rows = data?.rows ?? [];
    const year = new Date().getFullYear();
    const currentYearPrefix = `P${year}`;
    const sequenceByYear = rows
      .map((row: any) => String(row.code ?? "").trim())
      .filter((code: string) => code.startsWith(currentYearPrefix))
      .map((code: string) => Number(code.slice(currentYearPrefix.length)))
      .filter((seq: number) => Number.isFinite(seq));
    const next = (sequenceByYear.length ? Math.max(...sequenceByYear) : 0) + 1;
    return `${currentYearPrefix}${String(next).padStart(3, "0")}`;
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingRow(null);
    setEditForm({
      code: makeNextProjectCode(),
      name: "",
      clientName: "",
      salesDept: "",
      projectType: "주사업",
      status: "proposing",
      certainty: "",
      totalAmount: "10",
      companyAmount: "5",
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
    setSaveError(null);
    setMemoLengthError(null);
    setValidationError(null);
    setFieldErrors({});
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingRow(null);
    setModalMode("edit");
    setEditForm(null);
    setSaveError(null);
    setMemoLengthError(null);
    setValidationError(null);
    setFieldErrors({});
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
      { key: "proposalPm", label: "제안PM", valid: !!editForm.proposalPm.trim() },
      { key: "presentPm", label: "발표PM", valid: !!editForm.presentPm.trim() },
      { key: "deliveryPm", label: "수행PM", valid: !!editForm.deliveryPm.trim() },
      { key: "fromDate", label: "시작일", valid: !!editForm.fromDate.trim() },
      { key: "toDate", label: "종료일", valid: !!editForm.toDate.trim() },
      { key: "proposalSubmissionDate", label: "제안 제출일", valid: !!editForm.proposalSubmissionDate.trim() },
      { key: "submissionFormat", label: "제출 형식", valid: !!editForm.submissionFormat.trim() },
    ];
    for (const check of requiredChecks) {
      if (!check.valid) errors[check.key] = `${check.label}은(는) 필수입니다.`;
    }
    if (!editForm.salesDept.trim()) {
      errors.salesOwner = errors.salesOwner ?? "영업대표를 선택하면 영업부서가 자동 반영됩니다.";
    }
    if (editForm.useProposalSubmissionTime && !editForm.proposalSubmissionTime.trim()) {
      errors.proposalSubmissionTime = "제안 제출시간을 입력하세요.";
    }
    if (editForm.useProposalPresentationTime && !editForm.proposalPresentationTime.trim()) {
      errors.proposalPresentationTime = "제안 발표시간을 입력하세요.";
    }
    const firstKey = (Object.keys(errors)[0] as keyof EditForm | undefined) ?? null;
    return { errors, firstKey };
  };

  const saveEdit = async () => {
    if (!editForm) return;
    const { errors, firstKey } = validateForm();
    if (firstKey) {
      setFieldErrors(errors);
      setValidationError(`필수 입력 누락 ${Object.keys(errors).length}건`);
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
        sales_department: editForm.salesDept.trim() || null,
        sales_owner: editForm.salesOwner.trim() || null,
        start_date: editForm.fromDate || null,
        end_date: editForm.toDate || null,
        is_active: editForm.useStatus !== "미사용",
      };
      const totalAmountValue = toNumberOrNull(editForm.totalAmount);
      const companyAmountValue = toNumberOrNull(editForm.companyAmount);
      const amountTextValue = toAmountText(totalAmountValue, companyAmountValue);
      const submissionAtValue = joinDateTime(editForm.proposalSubmissionDate, editForm.proposalSubmissionTime, editForm.useProposalSubmissionTime);
      const presentationAtValue = joinDateTime(editForm.proposalPresentationDate, editForm.proposalPresentationTime, editForm.useProposalPresentationTime);
      if (modalMode === "create") {
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
        if (!editingRow) return;
        const updated = await updateProjectCode(editingRow.id, payload);
        const updatedData = updated.data as any;
        if (editingRow.projectId) {
          await updateProject(editingRow.projectId, {
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
                  salesDept: editForm.salesDept || "-",
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
                  memo: editForm.memo || "-",
                  useStatus: updatedData.is_active ? "사용" : "미사용",
                }
                : row
            )
          };
        });
      }
      const refreshed = await getP1Screen("code");
      setData(refreshed.data);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr auto auto", gap: 12, alignItems: "flex-end" }}>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>고객사</span>
            <select style={SELECT_STYLE} value={customerFilter} onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}>
              {customers.map((customer) => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>
          </label>
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
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="사업명, 고객사, 영업대표, PM 검색" style={{ border: 0, outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--tx-1)" }} />
            </div>
          </label>
          <button className="pmo-btn" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap", alignSelf: "end" }}>
            <Icon name="report" size={14} stroke={1.8} style={{ marginRight: 4 }} />
            엑셀 내보내기
          </button>
          <button className="pmo-btn pmo-btn-primary" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap", alignSelf: "end", background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={openCreate}>
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
                <th style={{ textAlign: "center", width: 132 }}>코드</th>
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
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={25} style={{ padding: "60px 20px", textAlign: "center", color: "var(--tx-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Icon name="search" size={28} stroke={1.5} style={{ color: "var(--tx-5)" }} />
                      <span style={{ fontWeight: 600, color: "var(--tx-3)" }}>해당 조건의 프로젝트 코드가 없습니다.</span>
                      <span style={{ fontSize: 12 }}>필터를 초기화하거나 다른 상태를 선택해 보세요.</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.map((r: any) => (
                <tr key={r.code}>
                  <td className="num" style={{ textAlign: "center", color: "var(--brand-700)", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <button
                        className="pmo-btn"
                        style={{ width: 24, minWidth: 24, height: 24, padding: 0, justifyContent: "center", fontSize: 12 }}
                        onClick={() => openEdit(r)}
                        title="편집"
                        aria-label={`${r.code} 편집`}
                      >
                        ✏
                      </button>
                      <span>{r.code}</span>
                    </div>
                  </td>
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

      {editForm ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 40, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <aside className="pmo-panel" style={{ width: "min(1200px, 92vw)", height: "88vh", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flex: "0 0 auto",
                background: "#ffffff",
                zIndex: 5,
                padding: "14px 20px 10px",
                borderBottom: "1px solid var(--line-2)",
                boxShadow: "0 2px 10px rgba(15,23,42,.06)"
              }}
            >
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{modalMode === "create" ? "신규 프로젝트 등록" : "프로젝트 관리 편집"}</h3>
              <button onClick={closeEdit} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 20px 12px" }}>
              {Object.keys(fieldErrors).length > 0 ? (
                <section className="pmo-panel" style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #fecaca", background: "#fff1f2" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>
                    필수 항목 {Object.keys(fieldErrors).length}건이 누락되었습니다.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(fieldErrors).map(([key, message]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => scrollToField(key as keyof EditForm)}
                        style={{ height: 26, padding: "0 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {message}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
                <h4 style={GROUP_TITLE_STYLE}>프로젝트 기본정보</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                  <label className="pmo-field" data-field="status" style={{ gridRow: 1, gridColumn: 1 }}><span style={fieldLabelErrorStyle("status")}>상태</span>
                    <select value={editForm.status} onChange={(e) => { clearFieldError("status"); setEditForm({ ...editForm, status: e.target.value }); }} style={errorInputStyle("status")}>
                      {Object.keys(STATUS_LABEL).map((code) => <option key={code} value={code}>{STATUS_LABEL[code]}</option>)}
                    </select>
                  </label>
                  <div style={{ gridRow: 1, gridColumn: 2 }} />
                  <div style={{ gridRow: 1, gridColumn: 3 }} />
                  <div style={{ gridRow: 1, gridColumn: 4 }} />

                  <label className="pmo-field" style={{ gridRow: 2, gridColumn: 1 }}><span>코드</span><input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} /></label>
                  <label className="pmo-field" data-field="name" style={{ gridRow: 2, gridColumn: 2 }}><span style={fieldLabelErrorStyle("name")}>프로젝트명</span><input value={editForm.name} onChange={(e) => { clearFieldError("name"); setEditForm({ ...editForm, name: e.target.value }); }} style={errorInputStyle("name")} /></label>
                  <label className="pmo-field" style={{ gridRow: 2, gridColumn: 3 }}><span>공고번호</span><input value={editForm.bidNoticeNo} onChange={(e) => setEditForm({ ...editForm, bidNoticeNo: e.target.value })} /></label>
                  <label className="pmo-field" style={{ gridRow: 2, gridColumn: 4 }}><span>공고일</span><input type="date" value={editForm.bidNoticeDate} onChange={(e) => setEditForm({ ...editForm, bidNoticeDate: e.target.value })} /></label>

                  <label className="pmo-field" data-field="clientName" style={{ gridRow: 3, gridColumn: 1 }}><span style={fieldLabelErrorStyle("clientName")}>고객사</span><input value={editForm.clientName} onChange={(e) => { clearFieldError("clientName"); setEditForm({ ...editForm, clientName: e.target.value }); }} style={errorInputStyle("clientName")} /></label>
                  <label className="pmo-field" data-field="projectType" style={{ gridRow: 3, gridColumn: 2 }}><span style={fieldLabelErrorStyle("projectType")}>사업유형</span>
                    <select value={editForm.projectType} onChange={(e) => { clearFieldError("projectType"); setEditForm({ ...editForm, projectType: e.target.value }); }} style={errorInputStyle("projectType")}>
                      {["주사업", "부사업", "하도", "협력"].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <label className="pmo-field" data-field="certainty" style={{ gridRow: 3, gridColumn: 3 }}>
                    <span style={fieldLabelErrorStyle("certainty")}>확도</span>
                    <select value={editForm.certainty} onChange={(e) => { clearFieldError("certainty"); setEditForm({ ...editForm, certainty: e.target.value }); }} style={errorInputStyle("certainty")}>
                      <option value="">선택 안함</option>
                      {certainties.map((certainty) => (
                        <option key={certainty} value={certainty}>{certainty}</option>
                      ))}
                    </select>
                  </label>
                  <label className="pmo-field" style={{ gridRow: 3, gridColumn: 4 }}>
                    <span>사업금액 (총액 / 당사금액, 억)</span>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(120px, 1fr)", gap: 8 }}>
                      <input data-field="totalAmount" value={editForm.totalAmount} onChange={(e) => { clearFieldError("totalAmount"); setEditForm({ ...editForm, totalAmount: e.target.value }); }} placeholder="총액(억)" style={{ minWidth: 0, ...errorInputStyle("totalAmount") }} />
                      <input data-field="companyAmount" value={editForm.companyAmount} onChange={(e) => { clearFieldError("companyAmount"); setEditForm({ ...editForm, companyAmount: e.target.value }); }} placeholder="당사금액(억)" style={{ minWidth: 0, ...errorInputStyle("companyAmount") }} />
                    </div>
                  </label>
                </div>
              </section>

              <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
                <h4 style={GROUP_TITLE_STYLE}>인력 목록</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <label className="pmo-field" data-field="salesOwner" style={{ gridRow: 1, gridColumn: 1 }}>
                    <span style={fieldLabelErrorStyle("salesOwner")}>영업대표</span>
                    <select
                      value={editForm.salesOwner}
                      onChange={(e) => {
                        clearFieldError("salesOwner");
                        const nextOwner = e.target.value;
                        const nextDept = ownerDeptBySalesOwner[nextOwner] ?? editForm.salesDept;
                        setEditForm({ ...editForm, salesOwner: nextOwner, salesDept: nextDept });
                      }}
                      style={errorInputStyle("salesOwner")}
                    >
                      <option value="">선택 안함</option>
                      {salesOwnersForEdit.map((owner) => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ gridRow: 1, gridColumn: 2 }} />
                  <div style={{ gridRow: 1, gridColumn: 3 }} />
                  <label className="pmo-field" data-field="proposalPm" style={{ gridRow: 2, gridColumn: 1 }}>
                    <span style={fieldLabelErrorStyle("proposalPm")}>제안PM</span>
                    <select value={editForm.proposalPm} onChange={(e) => { clearFieldError("proposalPm"); setEditForm({ ...editForm, proposalPm: e.target.value }); }} style={errorInputStyle("proposalPm")}>
                      <option value="">선택 안함</option>
                      {leadPmsForEdit.map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </label>
                  <label className="pmo-field" data-field="presentPm" style={{ gridRow: 2, gridColumn: 2 }}>
                    <span style={fieldLabelErrorStyle("presentPm")}>발표PM</span>
                    <select value={editForm.presentPm} onChange={(e) => { clearFieldError("presentPm"); setEditForm({ ...editForm, presentPm: e.target.value }); }} style={errorInputStyle("presentPm")}>
                      <option value="">선택 안함</option>
                      {leadPmsForEdit.map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </label>
                  <label className="pmo-field" data-field="deliveryPm" style={{ gridRow: 2, gridColumn: 3 }}>
                    <span style={fieldLabelErrorStyle("deliveryPm")}>수행PM</span>
                    <select value={editForm.deliveryPm} onChange={(e) => { clearFieldError("deliveryPm"); setEditForm({ ...editForm, deliveryPm: e.target.value }); }} style={errorInputStyle("deliveryPm")}>
                      <option value="">선택 안함</option>
                      {leadPmsForEdit.map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
                <h4 style={GROUP_TITLE_STYLE}>제안 작업</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "1 / 2", gridRow: 1 }}>
                    <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>기본 일정</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label className="pmo-field" data-field="fromDate"><span style={fieldLabelErrorStyle("fromDate")}>시작일</span><input type="date" value={editForm.fromDate} onChange={(e) => { clearFieldError("fromDate"); setEditForm({ ...editForm, fromDate: e.target.value }); }} style={errorInputStyle("fromDate")} /></label>
                      <label className="pmo-field" data-field="toDate"><span style={fieldLabelErrorStyle("toDate")}>종료일</span><input type="date" value={editForm.toDate} onChange={(e) => { clearFieldError("toDate"); setEditForm({ ...editForm, toDate: e.target.value }); }} style={errorInputStyle("toDate")} /></label>
                    </div>
                  </section>
                  <div style={{ gridColumn: "2 / 3", gridRow: 1 }} />
                  <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "1 / 2", gridRow: 2 }}>
                    <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>제안 제출일/방법</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 180px)", gap: 8, alignItems: "end" }}>
                      <label className="pmo-field" data-field="proposalSubmissionDate" style={{ minWidth: 0 }}>
                        <span style={fieldLabelErrorStyle("proposalSubmissionDate")}>제출일</span>
                        <input type="date" value={editForm.proposalSubmissionDate} onChange={(e) => { clearFieldError("proposalSubmissionDate"); setEditForm({ ...editForm, proposalSubmissionDate: e.target.value }); }} style={errorInputStyle("proposalSubmissionDate")} />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600, whiteSpace: "nowrap", marginBottom: 10 }}>
                        <input type="checkbox" style={{ width: 14, height: 14 }} checked={editForm.useProposalSubmissionTime} onChange={(e) => setEditForm({ ...editForm, useProposalSubmissionTime: e.target.checked })} />
                        시간 사용
                      </label>
                      <div style={{ minWidth: 0 }}>
                        {renderTimeControl(
                          editForm.proposalSubmissionTime,
                          editForm.useProposalSubmissionTime,
                          (next) => { clearFieldError("proposalSubmissionTime"); setEditForm({ ...editForm, proposalSubmissionTime: next }); },
                          "제출시간",
                          "proposalSubmissionTime"
                        )}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 3fr)", gap: 10, marginTop: 10 }}>
                      <label className="pmo-field" data-field="submissionFormat" style={{ minWidth: 0 }}>
                        <span style={fieldLabelErrorStyle("submissionFormat")}>제출 형식</span>
                        <select
                          style={{ minWidth: 0, width: "100%" }}
                          value={editForm.submissionFormat}
                          onChange={(e) => { clearFieldError("submissionFormat"); setEditForm({ ...editForm, submissionFormat: e.target.value }); }}
                        >
                          <option value="">선택 안함</option>
                          <option value="온라인">온라인</option>
                          <option value="오프라인">오프라인</option>
                        </select>
                      </label>
                      <label className="pmo-field" style={{ minWidth: 0 }}>
                        <span>제출 유의사항</span>
                        <input
                          value={editForm.submissionNote}
                          onChange={(e) => setEditForm({ ...editForm, submissionNote: e.target.value })}
                          placeholder="제본 여부 등 유의사항 기입"
                          style={{ minWidth: 0, width: "100%" }}
                        />
                      </label>
                    </div>
                  </section>
                  <section className="pmo-panel" style={{ padding: 12, border: "1px solid #d9e2f0", background: "#fff", gridColumn: "2 / 3", gridRow: 2 }}>
                    <h5 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>제안 발표일/방법</h5>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 180px)", gap: 8, alignItems: "end" }}>
                      <label className="pmo-field" style={{ minWidth: 0 }}>
                        <span>발표일</span>
                        <input type="date" value={editForm.proposalPresentationDate} onChange={(e) => setEditForm({ ...editForm, proposalPresentationDate: e.target.value })} />
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600, whiteSpace: "nowrap", marginBottom: 10 }}>
                        <input type="checkbox" style={{ width: 14, height: 14 }} checked={editForm.useProposalPresentationTime} onChange={(e) => setEditForm({ ...editForm, useProposalPresentationTime: e.target.checked })} />
                        시간 사용
                      </label>
                      <div style={{ minWidth: 0 }}>
                        {renderTimeControl(
                          editForm.proposalPresentationTime,
                          editForm.useProposalPresentationTime,
                          (next) => { clearFieldError("proposalPresentationTime"); setEditForm({ ...editForm, proposalPresentationTime: next }); },
                          "발표시간",
                          "proposalPresentationTime"
                        )}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 3fr)", gap: 10, marginTop: 10 }}>
                      <label className="pmo-field" style={{ minWidth: 0 }}>
                        <span>발표 형식</span>
                        <select
                          style={{ minWidth: 0, width: "100%" }}
                          value={editForm.presentationFormat}
                          onChange={(e) => setEditForm({ ...editForm, presentationFormat: e.target.value })}
                        >
                          <option value="">선택 안함</option>
                          <option value="온라인">온라인</option>
                          <option value="오프라인">오프라인</option>
                        </select>
                      </label>
                      <label className="pmo-field" style={{ minWidth: 0 }}>
                        <span>발표 유의사항</span>
                      <input
                        value={editForm.presentationNote}
                        onChange={(e) => setEditForm({ ...editForm, presentationNote: e.target.value })}
                        placeholder="발표 유의사항 기입"
                        style={{ minWidth: 0, width: "100%" }}
                      />
                      </label>
                    </div>
                  </section>
                </div>
              </section>

              <section className="pmo-panel" style={GROUP_SECTION_STYLE}>
                <h4 style={GROUP_TITLE_STYLE}>기타</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
                  <label className="pmo-field" style={{ gridColumn: "1 / 2" }}>
                    <span>사용여부</span>
                    <select value={editForm.useStatus} onChange={(e) => setEditForm({ ...editForm, useStatus: e.target.value })}>
                      <option value="사용">사용</option>
                      <option value="미사용">미사용</option>
                    </select>
                  </label>
                  <label className="pmo-field" style={{ gridColumn: "2 / 5" }}>
                    <span>메모</span>
                    <input
                      value={editForm.memo}
                      onChange={(e) => {
                        const nextMemo = e.target.value;
                        if (nextMemo.length > MEMO_MAX_LENGTH) {
                          setMemoLengthError(`메모는 ${MEMO_MAX_LENGTH}자까지만 입력할 수 있습니다.`);
                          return;
                        }
                        setMemoLengthError(null);
                        setEditForm({ ...editForm, memo: nextMemo });
                      }}
                      placeholder="사업 관련 특이사항 기입"
                      style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }}
                    />
                    {memoLengthError ? <span style={{ color: "var(--crit)", fontSize: 12, fontWeight: 700 }}>{memoLengthError}</span> : null}
                  </label>
                </div>
              </section>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {validationError ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 600 }}>{validationError}</div> : null}
                {saveError ? <div style={{ fontSize: 13, color: "var(--crit)", fontWeight: 600 }}>{saveError}</div> : null}
              </div>
            </div>

            <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
              <button className="pmo-btn" onClick={closeEdit} disabled={saving}>취소</button>
              <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} onClick={saveEdit} disabled={saving}>
                {saving ? (modalMode === "create" ? "등록 중..." : "저장 중...") : (modalMode === "create" ? "등록" : "저장")}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </PmoShell>
  );
}

export default CodePageImpl;
