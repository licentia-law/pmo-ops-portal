"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createProjectLog, getP1Screen, listProjectLogs, listProjects, updateProjectLog } from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";

type IconName =
  | "home" | "briefcase" | "users" | "trending" | "settings"
  | "chevronDown" | "chevronUp" | "chevronRight" | "chevronLeft"
  | "search" | "bell" | "menu" | "calendar" | "report" | "arrowRight" | "minus" | "plus";

const ICONS: Record<IconName, string> = {
  home: "M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  briefcase: "M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  trending: "M3 17l5-5 4 4 7-7M14 9h6v6",
  settings: "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.4a2 2 0 0 1-4 0v-.2a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H5a2 2 0 0 1 0-4h.2a1 1 0 0 0 .7-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.7-.7V5a2 2 0 0 1 4 0v.2a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.7 1.7H19a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.4 0",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  menu: "M4 6h16M4 12h16M4 18h16",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v3M16 4v3",
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h6M8 13h8M8 17h5",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  minus: "M6 12h12",
  plus: "M12 5v14M5 12h14"
};

function Icon({ name, size = 16, stroke = 1.6, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden><path d={ICONS[name]} /></svg>;
}

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };
function StatusBadge({ code }: { code: string }) {
  return <span className={`pmo-badge pmo-badge--${code}`} style={{ fontSize: 13 }}>{STATUS_LABEL[code] ?? code}</span>;
}

const CAT_TONE: Record<string, { bg: string; fg: string; line: string }> = {
  "메모": { bg: "#f3f4f6", fg: "#374151", line: "#d1d5db" },
  "진행": { bg: "#e0ecff", fg: "#1d4ed8", line: "#bfdbfe" },
  "완료": { bg: "#dcfce7", fg: "#166534", line: "#86efac" },
  "상태 변경": { bg: "var(--ok-bg)", fg: "#15803d", line: "var(--ok-line)" },
  "투입 인력 변경": { bg: "var(--info-bg)", fg: "var(--info)", line: "var(--info-line)" },
  "발표 일정 등록": { bg: "var(--warn-bg)", fg: "#b45309", line: "var(--warn-line)" },
  "진행 메모": { bg: "#fef3c7", fg: "#92400e", line: "#fde68a" },
  "업무지정 등록": { bg: "var(--brand-bg)", fg: "var(--brand-700)", line: "var(--brand-line)" },
  "일정 변경": { bg: "#f3e8ff", fg: "#7c3aed", line: "#e9d5ff" },
  "이슈": { bg: "var(--crit-bg)", fg: "var(--crit)", line: "var(--crit-line)" },
  "기타": { bg: "var(--bg-subtle)", fg: "var(--tx-4)", line: "var(--line-2)" }
};
function CategoryChip({ name }: { name: string }) {
  const t = CAT_TONE[name] ?? CAT_TONE["기타"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap" }}>{name}</span>;
}

const AVATAR_GRADIENTS: Record<string, [string, string, string]> = { "김책": ["#cfe1f7", "#92b8ec", "#1e3a8a"], "이수": ["#fcd9b8", "#f5b681", "#7a3d0f"], "박P": ["#bfe3d4", "#86d0b1", "#0f5132"], "정책": ["#c7d0fb", "#a5b4fc", "#3730a3"], "최P": ["#dcc7fb", "#b89af0", "#4c1d95"], "강책": ["#f7c1c8", "#f08a99", "#831843"] };
function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  const g = AVATAR_GRADIENTS[initials] ?? ["#e2e8f0", "#cbd5e1", "#1f2937"];
  return <span style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: g[2], fontWeight: 700, fontSize: size <= 28 ? 10.5 : 11.5, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{initials}</span>;
}

function Select({ value, onChange, children, w = 180, height = 40 }: { value: string; onChange: (v: string) => void; children: ReactNode; w?: number | string; height?: number }) {
  return <div style={{ position: "relative", width: w }}><select value={value} onChange={(e) => onChange(e.target.value)} style={{ appearance: "none", width: "100%", height, padding: "0 36px 0 14px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--tx-1)", fontSize: 14, fontFamily: "inherit", fontWeight: 600, cursor: "pointer" }}>{children}</select><span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--tx-4)", pointerEvents: "none" }}><Icon name="chevronDown" size={14} stroke={2} /></span></div>;
}

type PeriodPreset = "all" | "recent3m" | "thisMonth" | "lastMonth" | "thisYear";
type HistoryFilterState = {
  project: string;
  category: string;
  author: string;
  query: string;
  periodPreset: PeriodPreset;
  from: string;
  to: string;
};

function fmtDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodRange(preset: PeriodPreset, baseDate?: Date) {
  const today = baseDate ?? new Date();
  if (preset === "all") {
    return { from: "", to: "", label: "전체" };
  }
  if (preset === "thisMonth") {
    return { from: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmtDate(today), label: "이번 달" };
  }
  if (preset === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: fmtDate(start), to: fmtDate(end), label: "지난달" };
  }
  if (preset === "thisYear") {
    return { from: `${today.getFullYear()}-01-01`, to: fmtDate(today), label: "올해" };
  }
  const from = new Date(today);
  from.setMonth(from.getMonth() - 3);
  return { from: fmtDate(from), to: fmtDate(today), label: "최근 3개월" };
}

function PeriodPicker({ value, from, to, onChange }: { value: PeriodPreset; from: string; to: string; onChange: (value: PeriodPreset) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
    { value: "all", label: "전체" },
    { value: "recent3m", label: "최근 3개월" },
    { value: "thisMonth", label: "이번 달" },
    { value: "lastMonth", label: "지난달" },
    { value: "thisYear", label: "올해" }
  ];
  const currentLabel = PRESETS.find((item) => item.value === value)?.label ?? "전체";
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return <div ref={ref} style={{ position: "relative" }}><button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, width: "100%", padding: "0 14px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", fontSize: 14, color: "var(--tx-1)", fontWeight: 600 }}><span style={{ flex: 1, textAlign: "left" }}>{currentLabel} ({from} ~ {to})</span><Icon name="calendar" size={15} stroke={1.8} style={{ color: "var(--tx-4)" }} /></button>{open ? <div style={{ position: "absolute", top: 44, right: 0, zIndex: 40, minWidth: 200, padding: 6, background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "var(--sh-pop)", display: "flex", flexDirection: "column", gap: 2 }}>{PRESETS.map((preset) => <button key={preset.value} onClick={() => { onChange(preset.value); setOpen(false); }} style={{ height: 34, padding: "0 12px", textAlign: "left", border: 0, borderRadius: 6, background: value === preset.value ? "var(--brand-bg)" : "transparent", color: value === preset.value ? "var(--brand-700)" : "var(--tx-2)", fontSize: 13, fontWeight: value === preset.value ? 700 : 500 }}>{preset.label}</button>)}</div> : null}</div>;
}

function HistoryFilter({ filters, form, periodBaseDate, onChange, onSearch, onReset, onCreate }: { filters: any; form: HistoryFilterState; periodBaseDate: Date; onChange: (next: Partial<HistoryFilterState>) => void; onSearch: () => void; onReset: () => void; onCreate: () => void }) {
  const FieldLabel = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 14, color: "var(--tx-3)", fontWeight: 700, marginBottom: 8 }}>{children}</div>;
  return <section className="pmo-panel" style={{ padding: "20px 22px", marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr)) minmax(320px, 1.6fr) auto", gap: 12, alignItems: "end" }}>
      <div><FieldLabel>프로젝트</FieldLabel><Select value={form.project} onChange={(value) => onChange({ project: value })} w="100%">{filters.projects.map((p: any) => <option key={p.value} value={p.value}>{p.value === "all" ? "전체" : String(p.label).split("·").slice(1).join("·").trim() || String(p.label)}</option>)}</Select></div>
      <div><FieldLabel>이력 유형</FieldLabel><Select value={form.category} onChange={(value) => onChange({ category: value })} w="100%">{filters.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</Select></div>
      <div><FieldLabel>작성자</FieldLabel><Select value={form.author} onChange={(value) => onChange({ author: value })} w="100%">{filters.authors.map((a: string) => <option key={a} value={a}>{a}</option>)}</Select></div>
      <div style={{ minWidth: 0 }}><FieldLabel>기간</FieldLabel><PeriodPicker value={form.periodPreset} from={form.from} to={form.to} onChange={(preset) => { const range = getPeriodRange(preset, periodBaseDate); onChange({ periodPreset: preset, from: range.from, to: range.to }); }} /></div>
      <div style={{ minWidth: 0 }}><FieldLabel>검색어</FieldLabel><div style={{ display: "flex", alignItems: "center", gap: 10, height: 40, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--tx-5)" }}><Icon name="search" size={15} stroke={1.8} /><input value={form.query} onChange={(e) => onChange({ query: e.target.value })} placeholder="사업명, 작성자/변경자 검색" style={{ border: 0, outline: "none", background: "transparent", font: "inherit", width: "100%", color: "var(--tx-1)", fontSize: 14 }} /></div></div>
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", paddingBottom: 1, whiteSpace: "nowrap" }}><button onClick={onSearch} className="pmo-btn pmo-btn-primary" style={{ height: 40, minWidth: 86, padding: "0 18px", fontSize: 14, fontWeight: 700, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="search" size={14} stroke={2} />조회</button><button onClick={onReset} className="pmo-btn" style={{ height: 40, minWidth: 72, padding: "0 18px", fontSize: 14, fontWeight: 600 }}>초기화</button><button onClick={onCreate} className="pmo-btn pmo-btn-primary" style={{ height: 40, minWidth: 138, padding: "0 14px", whiteSpace: "nowrap", background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}><Icon name="plus" size={14} stroke={2} style={{ marginRight: 4 }} />진행 이력 등록</button></div>
    </div>
  </section>;
}

const TONE_BG: Record<string, { fg: string; bg: string }> = { blue: { fg: "#2563eb", bg: "#e3eefe" }, green: { fg: "#16a34a", bg: "#dcf2e3" }, purple: { fg: "#7c3aed", bg: "#ede5fd" }, amber: { fg: "#b45309", bg: "#fef4e1" } };
function BigToneIcon({ tone, children }: { tone: string; children: ReactNode }) {
  const t = TONE_BG[tone] ?? TONE_BG.blue;
  return <span style={{ width: 48, height: 48, borderRadius: 12, background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{children}</span>;
}
const exchangeSvg = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h13l-3-3" /><path d="M20 17H7l3 3" /></svg>;
const reportSvg = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M8 9h6M8 13h8M8 17h5" /></svg>;
const calSvg = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="6" width="16" height="14" rx="1" /><path d="M4 10h16M8 4v3M16 4v3" /><path d="M9 14l2 2 4-4" /></svg>;
const briefcaseSvg = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /></svg>;
const ICON_MAP: Record<string, ReactNode> = { report: reportSvg, calendar: calSvg, exchange: exchangeSvg, briefcase: briefcaseSvg };

function HistoryKPICard({ kpi, active, onClick }: { kpi: any; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className="pmo-panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, minHeight: 108, cursor: "pointer", textAlign: "left", border: active ? "1px solid var(--brand-line)" : "1px solid var(--line-2)", background: active ? "var(--brand-bg)" : "var(--bg-1)" }}><BigToneIcon tone={kpi.tone}>{ICON_MAP[kpi.icon]}</BigToneIcon><div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 500 }}>{kpi.label}</span><span style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: "var(--tx-1)" }}>{kpi.value.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)", marginLeft: 6 }}>{kpi.unit}</span></span><span style={{ fontSize: 12.5, color: "var(--tx-5)", marginTop: 4 }}>{kpi.footer}</span></div></button>;
}
function SummaryRow({ items, activeId, onToggle }: { items: any[]; activeId: string | null; onToggle: (id: string) => void }) {
  return <section style={{ marginBottom: 16 }}><div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12 }}>{items.map((k) => <HistoryKPICard key={k.id} kpi={k} active={activeId === k.id} onClick={() => onToggle(k.id)} />)}</div></section>;
}

function Pagination({ totalCount, page, pageSize, totalPages, onPageChange, onPageSizeChange }: { totalCount: number; page: number; pageSize: number; totalPages: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
  const blockStart = Math.floor((page - 1) / 5) * 5 + 1;
  const shown = Array.from({ length: Math.min(5, totalPages - blockStart + 1) }, (_, i) => blockStart + i);
  return <footer style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px", marginTop: 4, borderTop: "1px solid var(--line-2)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
      <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => onPageChange(1)} disabled={page === 1}>«</button>
      <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
      {shown.map((p) => (
        <button key={p} className="pmo-btn" style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", textAlign: "center", background: p === page ? "var(--brand)" : "#fff", color: p === page ? "#fff" : "var(--tx-2)", borderColor: p === page ? "var(--brand)" : "var(--line-2)" }} onClick={() => onPageChange(p)}>
          {p}
        </button>
      ))}
      <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</button>
      <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }} onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>»</button>
    </div>
    <select className="pmo-btn" style={{ height: 32, marginLeft: "auto", width: 130 }} value={String(pageSize)} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
      <option value="10">10개씩 보기</option>
      <option value="20">20개씩 보기</option>
      <option value="50">50개씩 보기</option>
    </select>
  </footer>;
}

function ProjectDetailButton({ row }: { row: any }) {
  const router = useRouter();
  const target = row.projectId || row.projectCode;
  return <button aria-label="프로젝트 상세 보기" title="프로젝트 상세 보기" onClick={(event) => { event.stopPropagation(); if (target && target !== "-") router.push(`/projects/${encodeURIComponent(target)}`); }} style={{ width: 28, height: 28, padding: 0, background: "transparent", border: "1px solid var(--line-2)", borderRadius: 6, color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="chevronRight" size={13} stroke={2} /></button>;
}

function EditLogButton({ row, onEdit }: { row: any; onEdit: (row: any) => void }) {
  return <button
    className="pmo-btn"
    aria-label="진행 이력 편집"
    title="편집"
    onClick={(event) => { event.stopPropagation(); onEdit(row); }}
    style={{ width: 24, minWidth: 24, height: 24, padding: 0, justifyContent: "center", fontSize: 12 }}
  >
    ✏
  </button>;
}

function LogsTable({ rows, totalCount, summaryFilterLabel, onEdit, page, pageSize, totalPages, onPageChange, onPageSizeChange }: { rows: any[]; totalCount: number; summaryFilterLabel: string | null; onEdit: (row: any) => void; page: number; pageSize: number; totalPages: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px", display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0, fontSize: 18 }}>진행이력 목록</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>총 {totalCount.toLocaleString()}건</span><span style={{ marginLeft: "auto", fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>검색결과 {totalCount.toLocaleString()}건{summaryFilterLabel ? <span style={{ marginLeft: 8, color: "var(--brand)", fontWeight: 700 }}>{summaryFilterLabel}</span> : null}</span></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}><table className="pmo-table pmo-table--recent"><colgroup><col style={{ width: 208 }} /><col style={{ width: 380 }} /><col style={{ width: 140 }} /><col style={{ width: 600 }} /><col style={{ width: 92 }} /><col style={{ width: 110 }} /></colgroup><thead><tr><th>일시</th><th>사업명</th><th>작성자/변경자</th><th>내용</th><th>상태</th><th style={{ textAlign: "center" }}>프로젝트 상세</th></tr></thead><tbody>{rows.map((r) => { const authorWithRole = r.authorTeam && r.authorTeam !== "-" ? `${r.author} ${r.authorTeam}` : r.author; return <tr key={r.id}><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600, whiteSpace: "nowrap" }}><div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><EditLogButton row={r} onEdit={onEdit} /><span><span style={{ color: "var(--tx-2)" }}>{r.datetime.slice(0, 10)}</span><span style={{ color: "var(--tx-4)", marginLeft: 8 }}>{r.datetime.slice(11)}</span></span></div></td><td style={{ color: "var(--tx-1)", fontWeight: 600, whiteSpace: "normal", wordBreak: "keep-all", lineHeight: 1.5 }}>{r.projectName}</td><td style={{ color: "var(--tx-1)", fontWeight: 700, whiteSpace: "normal", wordBreak: "keep-all", lineHeight: 1.5 }}>{authorWithRole}</td><td style={{ color: "var(--tx-2)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>{r.summary}</td><td><CategoryChip name={r.category} /></td><td style={{ textAlign: "center" }}><ProjectDetailButton row={r} /></td></tr>; })}</tbody></table></div>
    <Pagination totalCount={totalCount} page={page} pageSize={pageSize} totalPages={totalPages} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </section>;
}

function SidePanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="pmo-panel" style={{ padding: "18px 20px" }}><header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h3 className="pmo-section-title" style={{ margin: 0, fontSize: 18, lineHeight: "22px" }}>{title}</h3>{action}</header>{children}</section>;
}
function MoreLink() {
  return <a href="#" className="pmo-link" style={{ fontSize: 12.5, fontWeight: 600 }}>더보기 <Icon name="chevronRight" size={11} stroke={2} /></a>;
}

function RecentStatusPanel({ rows }: { rows: any[] }) {
  return <SidePanel title="최근 상태 변경" action={<MoreLink />}><div style={{ display: "flex", flexDirection: "column" }}>{rows.map((r, i) => <div key={r.code + r.datetime} style={{ padding: "12px 0", borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--line-1)", display: "flex", flexDirection: "column", gap: 6 }}><div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 12, color: "var(--tx-5)", fontWeight: 700 }}>{r.code}</span><span style={{ fontSize: 13, color: "var(--tx-1)", fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>· {r.name}</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11.5, color: "var(--tx-5)", flex: 1 }}>{r.datetime}</span><StatusBadge code={r.from} /><Icon name="arrowRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} /><StatusBadge code={r.to} /></div></div>)}</div></SidePanel>;
}
function ByProjectPanel({ rows }: { rows: any[] }) {
  return <SidePanel title="프로젝트별 이력 건수" action={<MoreLink />}><div style={{ overflowX: "hidden" }}><table className="pmo-table" style={{ fontSize: 14, width: "100%", tableLayout: "fixed" }}><colgroup><col style={{ width: 50 }} /><col /><col style={{ width: 80 }} /></colgroup><thead><tr><th style={{ textAlign: "center", fontSize: 14 }}>순위</th><th style={{ textAlign: "center", fontSize: 14 }}>사업명</th><th style={{ textAlign: "center", fontSize: 14 }}>이력 건수</th></tr></thead><tbody>{rows.map((r) => <tr key={r.code}><td className="num" style={{ textAlign: "center", color: "var(--tx-3)", fontWeight: 700, fontSize: 14 }}>{r.code === "etc" ? "—" : r.rank}</td><td style={{ textAlign: "center", color: "var(--tx-1)", fontWeight: 600, fontSize: 14, whiteSpace: "normal", wordBreak: "keep-all", overflowWrap: "anywhere", lineHeight: 1.45 }}>{r.name}</td><td className="num" style={{ textAlign: "center", color: "var(--tx-1)", fontWeight: 700, fontSize: 14 }}>{r.count.toLocaleString()}</td></tr>)}</tbody></table></div></SidePanel>;
}
export default function HistoryPage() {
  const [data, setData] = useState<any | null>(null);
  const [projectRows, setProjectRows] = useState<any[]>([]);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [filterForm, setFilterForm] = useState<HistoryFilterState | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<HistoryFilterState | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ content: string; logStatus: "memo" | "in_progress" | "done" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ projectId: string; content: string; logStatus: "memo" | "in_progress" } | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const createProjectOptions = useMemo(
    () => [...projectRows].sort((a: any, b: any) => new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime()),
    [projectRows]
  );
  const periodBaseDate = useMemo(() => {
    const list = (data?.logs ?? []).map((row: any) => String(row.datetime ?? "").slice(0, 10)).filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value));
    if (list.length === 0) return new Date();
    const max = list.sort().at(-1) ?? "";
    return new Date(`${max}T00:00:00`);
  }, [data]);

  async function loadAllProjects() {
    const merged: any[] = [];
    let page = 1;
    let total = 0;
    while (page < 20) {
      const result = await listProjects({ page, page_size: 100, sort: "code" });
      const rows = result.data ?? [];
      total = Number(result.meta?.total ?? rows.length);
      merged.push(...rows);
      if (merged.length >= total || rows.length === 0) break;
      page += 1;
    }
    return merged;
  }

  function mapLogStatusToCategory(logStatus: string) {
    if (logStatus === "done") return "완료";
    if (logStatus === "in_progress") return "진행";
    return "메모";
  }

  function formatLogDatetime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${fmtDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
  }

  async function loadTableRows(filter: HistoryFilterState, projects: any[]) {
    const selectedProject = filter.project !== "all" ? projects.find((project) => project.code === filter.project || project.id === filter.project) : null;
    const apiResult = await listProjectLogs({
      page: 1,
      page_size: 100,
      sort: "-logged_at",
      project_id: selectedProject?.id,
      log_status: filter.category === "전체" ? undefined : (filter.category === "완료" ? "done" : filter.category === "진행" ? "in_progress" : "memo"),
      q: filter.query.trim() || undefined
    });
    const mapped = (apiResult.data ?? []).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      projectCode: row.project_code ?? "-",
      projectName: row.project_name ?? "-",
      author: row.updated_by_name ?? row.author_name ?? "-",
      authorInitials: "",
      authorTeam: "",
      summary: row.content ?? "",
      category: mapLogStatusToCategory(row.log_status),
      logStatus: row.log_status,
      datetime: formatLogDatetime(row.logged_at)
    }));
    const clientFiltered = mapped.filter((row: any) => {
      if (filter.author !== "전체" && row.author !== filter.author) return false;
      const day = String(row.datetime ?? "").slice(0, 10);
      if (filter.from && day && day < filter.from) return false;
      if (filter.to && day && day > filter.to) return false;
      return true;
    });
    setTableRows(clientFiltered);
  }

  useEffect(() => {
    let alive = true;
    Promise.all([getP1Screen("history"), loadAllProjects()]).then(async ([result, projects]) => {
      if (alive) {
        const payload = result.data as any;
        setData(payload);
        setProjectRows(projects);
        const list = (payload.logs ?? []).map((row: any) => String(row.datetime ?? "").slice(0, 10)).filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value));
        const max = list.length > 0 ? list.sort().at(-1) : null;
        const baseDate = max ? new Date(`${max}T00:00:00`) : new Date();
        const range = getPeriodRange("all", baseDate);
        const initialFilter: HistoryFilterState = { project: "all", category: "전체", author: "전체", query: "", periodPreset: "all", from: range.from, to: range.to };
        setFilterForm(initialFilter);
        setAppliedFilter(initialFilter);
        await loadTableRows(initialFilter, projects);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  const filteredRows = useMemo(() => {
    if (!appliedFilter) return [];
    const rows = tableRows;
    if (!activeSummary) return rows;
    if (activeSummary === "newWeek") {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return rows.filter((row: any) => {
        const value = String(row.datetime ?? "").replace(" ", "T");
        const day = new Date(value);
        return !Number.isNaN(day.getTime()) && day >= from;
      });
    }
    if (activeSummary === "stChg") {
      return rows.filter((row: any) => String(row.summary ?? "").includes("상태 변경"));
    }
    if (activeSummary === "activePrj") {
      return rows.filter((row: any) => !!row.projectName && row.projectName !== "-");
    }
    return rows;
  }, [tableRows, appliedFilter, activeSummary]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);
  const summaryFilterLabel = activeSummary ? (data.summary.find((item: any) => item.id === activeSummary)?.label ?? null) : null;
  const openEdit = (row: any) => {
    setEditingRow(row);
    setEditForm({ content: row.summary ?? "", logStatus: (row.logStatus ?? "memo") as "memo" | "in_progress" | "done" });
    setSaveError(null);
  };
  const closeEdit = () => {
    if (saving) return;
    setEditingRow(null);
    setEditForm(null);
    setSaveError(null);
  };
  const statusOptionsForEdit = (current: "memo" | "in_progress" | "done") => {
    if (current === "in_progress") return [{ value: "in_progress", label: "진행" }, { value: "done", label: "완료" }];
    if (current === "done") return [{ value: "done", label: "완료" }];
    return [{ value: "memo", label: "메모" }];
  };
  const saveEdit = async () => {
    if (!editingRow || !editForm || !appliedFilter) return;
    const content = editForm.content.trim();
    if (!content) {
      setSaveError("내용을 입력하세요.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProjectLog(editingRow.id, { content, log_status: editForm.logStatus });
      await loadTableRows(appliedFilter, projectRows);
      closeEdit();
    } catch (error: any) {
      setSaveError(error?.message ?? "진행 이력 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };
  const openCreate = () => {
    const defaultProjectId = createProjectOptions[0]?.id ?? "";
    setCreateForm({ projectId: defaultProjectId, content: "", logStatus: "memo" });
    setCreateError(null);
    setCreating(true);
  };
  const closeCreate = () => {
    if (createSaving) return;
    setCreating(false);
    setCreateForm(null);
    setCreateError(null);
  };
  const saveCreate = async () => {
    if (!createForm || !appliedFilter) return;
    const content = createForm.content.trim();
    if (!createForm.projectId) {
      setCreateError("프로젝트를 선택하세요.");
      return;
    }
    if (!content) {
      setCreateError("내용을 입력하세요.");
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      await createProjectLog({
        project_id: createForm.projectId,
        content,
        log_status: createForm.logStatus,
      } as any);
      await loadTableRows(appliedFilter, projectRows);
      closeCreate();
    } catch (error: any) {
      setCreateError(error?.message ?? "진행 이력 등록에 실패했습니다.");
    } finally {
      setCreateSaving(false);
    }
  };
  if (!data || !filterForm) return null;
  return <PmoShell user={data.meta.user} notifications={data.meta.notifications} currentId="project-logs" pageTitle="진행이력">
    <HistoryFilter
      filters={data.filters}
      form={filterForm}
      periodBaseDate={periodBaseDate}
      onChange={(next) => setFilterForm((prev) => prev ? { ...prev, ...next } : prev)}
      onSearch={async () => {
        setPage(1);
        setAppliedFilter(filterForm);
        await loadTableRows(filterForm, projectRows);
      }}
      onReset={() => {
        const range = getPeriodRange("all", periodBaseDate);
        const reset: HistoryFilterState = { project: "all", category: "전체", author: "전체", query: "", periodPreset: "all", from: range.from, to: range.to };
        setPage(1);
        setFilterForm(reset);
        setAppliedFilter(reset);
        setActiveSummary(null);
        void loadTableRows(reset, projectRows);
      }}
      onCreate={openCreate}
    />
    <SummaryRow items={data.summary} activeId={activeSummary} onToggle={(id) => setActiveSummary(activeSummary === id ? null : id)} />
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <LogsTable rows={pagedRows} totalCount={filteredRows.length} summaryFilterLabel={summaryFilterLabel} onEdit={openEdit} page={safePage} pageSize={pageSize} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ByProjectPanel rows={data.byProject} />
      </div>
    </div>
    {editForm && editingRow ? <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.42)", zIndex: 40, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(560px, 92vw)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--line-2)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>진행 이력 편집</h3>
          <button onClick={closeEdit} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </header>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 18, color: "var(--tx-2)", fontWeight: 700, lineHeight: 1.4 }}>
            {editingRow.projectCode} · {editingRow.projectName}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
            <label className="pmo-field" style={{ minWidth: 0, gridColumn: "1 / 2" }}>
              <span>상태</span>
              <select value={editForm.logStatus} onChange={(event) => setEditForm({ ...editForm, logStatus: event.target.value as "memo" | "in_progress" | "done" })}>
                {statusOptionsForEdit((editingRow.logStatus ?? "memo") as "memo" | "in_progress" | "done").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="pmo-field" style={{ minWidth: 0, gridColumn: "2 / 5" }}>
              <span>내용</span>
              <input
                value={editForm.content}
                onChange={(event) => setEditForm({ ...editForm, content: event.target.value })}
                placeholder="진행 이력 내용을 입력하세요."
                style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }}
              />
            </label>
          </div>
          <div style={{ fontSize: 12, color: "var(--tx-5)" }}>
            진행 상태는 해당 작업 완료 시 완료로 변경해주세요.
          </div>
          {saveError ? <div style={{ color: "var(--crit)", fontSize: 13, fontWeight: 600 }}>{saveError}</div> : null}
        </div>
        <footer style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button onClick={closeEdit} className="pmo-btn" disabled={saving}>취소</button>
          <button onClick={() => void saveEdit()} className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </footer>
      </aside>
    </div> : null}
    {creating && createForm ? <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.42)", zIndex: 41, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(560px, 92vw)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--line-2)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>진행 이력 등록</h3>
          <button onClick={closeCreate} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </header>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(160px, 220px)", gap: 12, alignItems: "start" }}>
            <label className="pmo-field" style={{ minWidth: 0 }}>
              <span>프로젝트</span>
              <select value={createForm.projectId} onChange={(event) => setCreateForm({ ...createForm, projectId: event.target.value })}>
                {createProjectOptions.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="pmo-field" style={{ minWidth: 0 }}>
              <span>상태</span>
              <select value={createForm.logStatus} onChange={(event) => setCreateForm({ ...createForm, logStatus: event.target.value as "memo" | "in_progress" })}>
                <option value="memo">메모</option>
                <option value="in_progress">진행</option>
              </select>
            </label>
            <label className="pmo-field" style={{ minWidth: 0, gridColumn: "1 / 3" }}>
              <span>내용</span>
              <input
                value={createForm.content}
                onChange={(event) => setCreateForm({ ...createForm, content: event.target.value })}
                placeholder="진행 이력 내용을 입력하세요."
                style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }}
              />
              <span style={{ marginTop: 6, fontSize: 12, color: "var(--tx-5)", lineHeight: 1.45 }}>
                프로젝트는 최근 생성된 순서로 노출됩니다.
                <br />
                상태는 등록 시 메모/진행을 선택할 수 있으며 추후 편집을 통해 '진행'에서 '완료'로 변환할 수 있습니다.
              </span>
            </label>
          </div>
          {createError ? <div style={{ color: "var(--crit)", fontSize: 13, fontWeight: 600 }}>{createError}</div> : null}
        </div>
        <footer style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button onClick={closeCreate} className="pmo-btn" disabled={createSaving}>취소</button>
          <button onClick={() => void saveCreate()} className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} disabled={createSaving}>{createSaving ? "등록 중..." : "등록"}</button>
        </footer>
      </aside>
    </div> : null}
  </PmoShell>;
}
