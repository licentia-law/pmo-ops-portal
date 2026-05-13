"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getP1Screen } from "../../app/lib/api";

type IconName =
  | "home" | "briefcase" | "users" | "trending" | "settings"
  | "chevronDown" | "chevronUp" | "chevronRight" | "chevronLeft"
  | "search" | "bell" | "menu" | "calendar" | "report" | "arrowRight";

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
  arrowRight: "M5 12h14M13 5l7 7-7 7"
};

function Icon({ name, size = 16, stroke = 1.6, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden><path d={ICONS[name]} /></svg>;
}

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };
function StatusBadge({ code }: { code: string }) {
  return <span className={`pmo-badge pmo-badge--${code}`} style={{ fontSize: 13 }}>{STATUS_LABEL[code] ?? code}</span>;
}

const NAV = [
  { kind: "item", id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [{ id: "execution", label: "업무수행현황" }, { id: "project-detail", label: "프로젝트 상세" }, { id: "history", label: "진행이력" }] },
  { kind: "group", id: "people", label: "인력", icon: "users", items: [{ id: "active", label: "인력재직현황" }, { id: "assignment", label: "인력배치/투입현황" }, { id: "current", label: "인원별 투입(현재)" }, { id: "idle", label: "대기현황" }] },
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [{ id: "weekly", label: "주간현황" }, { id: "monthly", label: "월별가동현황" }] },
  { kind: "group", id: "admin", label: "관리", icon: "settings", items: [{ id: "users", label: "사용자/권한 관리" }, { id: "master", label: "기준정보 관리" }, { id: "code", label: "프로젝트 마스터" }] }
] as const;

const ROUTE_BY_ID: Record<string, string> = {
  home: "/", execution: "/projects/operations", code: "/projects/codes", "project-detail": "/projects/1", history: "/projects/logs",
  active: "/people/employment", assignment: "/people/assignments", current: "/people/current", idle: "/people/waiting", weekly: "/reports/weekly", monthly: "/reports/monthly"
};

function SidebarItem({ id, label, current, indent }: { id: string; label: string; current: string; indent?: boolean }) {
  const active = id === current;
  return <a href={ROUTE_BY_ID[id] ?? "#"} style={{ display: "flex", alignItems: "center", height: 36, padding: indent ? "0 16px 0 44px" : "0 16px", borderRadius: 8, margin: "0 8px", fontSize: 15.5, fontWeight: active ? 600 : 500, color: active ? "var(--brand)" : "var(--tx-3)", background: active ? "var(--brand-bg)" : "transparent" }}>{label}</a>;
}
function SidebarGroup({ group, current }: { group: any; current: string }) {
  const [open, setOpen] = useState(group.id === "project");
  return <div style={{ marginBottom: 4 }}><button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 16px)", height: 36, padding: "0 12px", margin: "0 8px", background: "transparent", border: 0, borderRadius: 8, color: "var(--tx-3)", fontWeight: 600, fontSize: 15.5 }}><Icon name={group.icon as IconName} size={16} stroke={1.7} style={{ color: "var(--tx-4)" }} /><span style={{ flex: 1, textAlign: "left" }}>{group.label}</span><Icon name={open ? "chevronUp" : "chevronDown"} size={14} stroke={2} style={{ color: "var(--tx-5)" }} /></button>{open ? <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>{group.items.map((it: any) => <SidebarItem key={it.id} id={it.id} label={it.label} current={current} indent />)}</div> : null}</div>;
}

function AppShell({ user, notifications, current = "history", pageTitle = "진행이력", children }: { user: any; notifications?: number; current?: string; pageTitle?: string; children: ReactNode }) {
  return <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
    <aside style={{ width: "var(--side-w)", flex: "0 0 var(--side-w)", background: "var(--bg-side)", borderRight: "1px solid var(--line-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 64, borderBottom: "1px solid var(--line-2)" }}><span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.15)" }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 4l5-2 5 2v5c0 3-3 5-5 5s-5-2-5-5z" /></svg></span><span style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", lineHeight: 1.2, letterSpacing: "0.01em" }}>PMO 업무수행<br />관리시스템</span></a>
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>{NAV.map((node) => node.kind === "item" ? <a key={node.id} href={ROUTE_BY_ID[node.id] ?? "#"} style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 12px", margin: "0 8px 6px", borderRadius: 8, background: node.id === current ? "var(--brand-bg)" : "transparent", color: node.id === current ? "var(--brand)" : "var(--tx-2)", fontSize: 16, fontWeight: node.id === current ? 700 : 600 }}><Icon name={node.icon as IconName} size={16} stroke={1.8} />{node.label}</a> : <SidebarGroup key={node.id} group={node} current={current} />)}</nav>
    </aside>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <header style={{ height: "var(--header-h)", background: "var(--bg-1)", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx-3)", fontSize: 16, fontWeight: 600 }}><Icon name="menu" size={18} stroke={1.8} style={{ color: "var(--tx-4)" }} /><span style={{ color: "var(--tx-1)", fontSize: 18, fontWeight: 700 }}>{pageTitle}</span></div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}><div className="pmo-search"><Icon name="search" size={16} stroke={1.8} /><input placeholder="프로젝트/인력 검색" /></div></div>
        <button style={{ position: "relative", width: 38, height: 38, border: 0, borderRadius: 10, background: "transparent", color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="bell" size={18} stroke={1.8} />{notifications && notifications > 0 ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--crit)", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-1)", boxSizing: "content-box" }}>{notifications}</span> : null}</button>
        <button style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 10px 0 6px", border: 0, borderRadius: 10, background: "transparent" }}><span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c7d0fb, #a5b4fc)", color: "#3730a3", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>김P</span><span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}><span style={{ fontSize: 15, fontWeight: 600, color: "var(--tx-1)" }}>{user.name}</span><span style={{ fontSize: 13, color: "var(--tx-4)" }}>{user.team} · {user.role}</span></span><Icon name="chevronDown" size={14} stroke={2} style={{ color: "var(--tx-5)" }} /></button>
      </header>
      <main style={{ flex: 1, padding: "24px 28px 32px" }}>{children}</main>
    </div>
  </div>;
}

const CAT_TONE: Record<string, { bg: string; fg: string; line: string }> = {
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

function PeriodPicker({ presets, defaultPreset, from, to }: { presets: string[]; defaultPreset: string; from: string; to: string }) {
  const [preset, setPreset] = useState(defaultPreset);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return <div ref={ref} style={{ position: "relative" }}><button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", fontSize: 14, color: "var(--tx-1)", fontWeight: 600, minWidth: 280 }}><span style={{ flex: 1, textAlign: "left" }}>{preset} ({from} ~ {to})</span><Icon name="calendar" size={15} stroke={1.8} style={{ color: "var(--tx-4)" }} /></button>{open ? <div style={{ position: "absolute", top: 44, right: 0, zIndex: 40, minWidth: 200, padding: 6, background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "var(--sh-pop)", display: "flex", flexDirection: "column", gap: 2 }}>{presets.map((p) => <button key={p} onClick={() => { setPreset(p); setOpen(false); }} style={{ height: 34, padding: "0 12px", textAlign: "left", border: 0, borderRadius: 6, background: preset === p ? "var(--brand-bg)" : "transparent", color: preset === p ? "var(--brand-700)" : "var(--tx-2)", fontSize: 13, fontWeight: preset === p ? 700 : 500 }}>{p}</button>)}</div> : null}</div>;
}

function HistoryFilter({ filters }: { filters: any }) {
  const [project, setProject] = useState(filters.projects[0].value);
  const [cat, setCat] = useState("전체");
  const [author, setAuthor] = useState("전체");
  const [q, setQ] = useState("");
  const FieldLabel = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 14, color: "var(--tx-3)", fontWeight: 600, marginBottom: 8 }}>{children}</div>;
  return <section className="pmo-panel" style={{ padding: "20px 22px", marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 320px) minmax(0, 160px) minmax(0, 160px) 1fr", gap: 16, alignItems: "end" }}>
      <div><FieldLabel>프로젝트</FieldLabel><Select value={project} onChange={setProject} w="100%">{filters.projects.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></div>
      <div><FieldLabel>이력 유형</FieldLabel><Select value={cat} onChange={setCat} w="100%">{filters.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</Select></div>
      <div><FieldLabel>작성자</FieldLabel><Select value={author} onChange={setAuthor} w="100%">{filters.authors.map((a: string) => <option key={a} value={a}>{a}</option>)}</Select></div>
      <div><FieldLabel>기간</FieldLabel><div style={{ display: "flex", justifyContent: "flex-end" }}><PeriodPicker presets={filters.periodPresets} defaultPreset={filters.defaultPreset} from={filters.from} to={filters.to} /></div></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end", marginTop: 14 }}>
      <div><FieldLabel>검색어</FieldLabel><div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--tx-5)" }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로젝트코드, 프로젝트명, 내용, 작성자 검색" style={{ border: 0, outline: "none", background: "transparent", font: "inherit", flex: 1, color: "var(--tx-1)", fontSize: 14 }} /><Icon name="search" size={15} stroke={1.8} /></div></div>
      <div style={{ display: "inline-flex", gap: 8 }}><button className="pmo-btn pmo-btn-primary" style={{ height: 40, padding: "0 22px", fontSize: 14, fontWeight: 700, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}>조회</button><button className="pmo-btn" style={{ height: 40, padding: "0 22px", fontSize: 14, fontWeight: 600 }}>초기화</button></div>
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

function HistoryKPICard({ kpi }: { kpi: any }) {
  return <div className="pmo-panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, minHeight: 108 }}><BigToneIcon tone={kpi.tone}>{ICON_MAP[kpi.icon]}</BigToneIcon><div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 500 }}>{kpi.label}</span><span style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: "var(--tx-1)" }}>{kpi.value.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)", marginLeft: 6 }}>{kpi.unit}</span></span><span style={{ fontSize: 12.5, color: "var(--tx-5)", marginTop: 4 }}>{kpi.footer}</span></div></div>;
}
function SummaryRow({ items }: { items: any[] }) {
  return <section style={{ marginBottom: 16 }}><div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12 }}>{items.map((k) => <HistoryKPICard key={k.id} kpi={k} />)}</div></section>;
}

function Pagination({ pagination }: { pagination: any }) {
  const shown = [1, 2, 3, 4, 5, 6];
  const PageBtn = ({ children, active, ariaLabel }: { children: ReactNode; active?: boolean; ariaLabel?: string }) => <button aria-label={ariaLabel} style={{ minWidth: 32, height: 32, padding: "0 10px", background: active ? "var(--brand)" : "var(--bg-1)", color: active ? "#fff" : "var(--tx-2)", border: `1px solid ${active ? "var(--brand)" : "var(--line-2)"}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0 6px", marginTop: 6, gap: 4, position: "relative" }}><PageBtn ariaLabel="처음 페이지"><span style={{ fontSize: 11 }}>«</span></PageBtn><PageBtn ariaLabel="이전 페이지"><Icon name="chevronLeft" size={13} stroke={2} /></PageBtn>{shown.map((p) => <PageBtn key={p} active={p === pagination.currentPage}>{p}</PageBtn>)}<span style={{ color: "var(--tx-5)", padding: "0 6px" }}>…</span><PageBtn>{pagination.totalPages}</PageBtn><PageBtn ariaLabel="다음 페이지"><Icon name="chevronRight" size={13} stroke={2} /></PageBtn><PageBtn ariaLabel="마지막 페이지"><span style={{ fontSize: 11 }}>»</span></PageBtn><div style={{ position: "absolute", right: 0 }}><Select value={String(pagination.pageSize)} onChange={() => {}} w={132} height={32}><option value="10">10개씩 보기</option><option value="20">20개씩 보기</option><option value="50">50개씩 보기</option></Select></div></div>;
}

function LogsTable({ rows, pagination, selectedId, onSelect }: { rows: any[]; pagination: any; selectedId: number | null; onSelect: (id: number) => void }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px", display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0, fontSize: 18 }}>진행 이력 목록</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>총 {pagination.totalCount.toLocaleString()}건</span></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}><table className="pmo-table pmo-table--recent"><colgroup><col style={{ width: 152 }} /><col style={{ width: 110 }} /><col style={{ width: 220 }} /><col style={{ width: 130 }} /><col /><col style={{ width: 120 }} /><col style={{ width: 64 }} /></colgroup><thead><tr><th>일시 ↓</th><th>프로젝트코드</th><th>프로젝트명</th><th>이력 유형</th><th>요약 내용</th><th>작성자</th><th style={{ textAlign: "center" }}>상세</th></tr></thead><tbody>{rows.map((r) => { const sel = r.id === selectedId; return <tr key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer", background: sel ? "var(--brand-bg)" : undefined }}><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600, whiteSpace: "nowrap" }}><span style={{ color: "var(--tx-2)" }}>{r.datetime.slice(0, 10)}</span><span style={{ color: "var(--tx-4)", marginLeft: 8 }}>{r.datetime.slice(11)}</span></td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{r.projectCode}</td><td style={{ color: "var(--tx-1)", fontWeight: 600 }}>{r.projectName}</td><td><CategoryChip name={r.category} /></td><td style={{ color: "var(--tx-2)", whiteSpace: "normal" }}><span title={r.summary} style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1 as any, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5, maxWidth: 460 }}>{r.summary}</span></td><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar initials={r.authorInitials} size={32} /><div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}><span style={{ fontSize: 14, color: "var(--tx-1)", fontWeight: 700 }}>{r.author}</span><span style={{ fontSize: 14, color: "var(--tx-5)" }}>{r.authorTeam}</span></div></div></td><td style={{ textAlign: "center" }}><button aria-label="상세 보기" style={{ width: 28, height: 28, padding: 0, background: "transparent", border: "1px solid var(--line-2)", borderRadius: 6, color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="chevronRight" size={13} stroke={2} /></button></td></tr>; })}</tbody></table></div>
    <Pagination pagination={pagination} />
  </section>;
}

function SidePanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="pmo-panel" style={{ padding: "18px 20px" }}><header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h3 className="pmo-section-title" style={{ margin: 0, fontSize: 16, lineHeight: "20px" }}>{title}</h3>{action}</header>{children}</section>;
}
function MoreLink() {
  return <a href="#" className="pmo-link" style={{ fontSize: 12.5, fontWeight: 600 }}>더보기 <Icon name="chevronRight" size={11} stroke={2} /></a>;
}

function RecentStatusPanel({ rows }: { rows: any[] }) {
  return <SidePanel title="최근 상태 변경" action={<MoreLink />}><div style={{ display: "flex", flexDirection: "column" }}>{rows.map((r, i) => <div key={r.code + r.datetime} style={{ padding: "12px 0", borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--line-1)", display: "flex", flexDirection: "column", gap: 6 }}><div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 12, color: "var(--tx-5)", fontWeight: 700 }}>{r.code}</span><span style={{ fontSize: 13, color: "var(--tx-1)", fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>· {r.name}</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11.5, color: "var(--tx-5)", flex: 1 }}>{r.datetime}</span><StatusBadge code={r.from} /><Icon name="arrowRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} /><StatusBadge code={r.to} /></div></div>)}</div></SidePanel>;
}
function ByProjectPanel({ rows }: { rows: any[] }) {
  return <SidePanel title="프로젝트별 이력 건수" action={<MoreLink />}><div style={{ overflowX: "auto", marginLeft: -20, marginRight: -20 }}><table className="pmo-table" style={{ fontSize: 13 }}><colgroup><col style={{ width: 50 }} /><col /><col style={{ width: 80 }} /></colgroup><thead><tr><th style={{ textAlign: "center" }}>순위</th><th>프로젝트코드 · 프로젝트명</th><th style={{ textAlign: "right", paddingRight: 20 }}>이력 건수</th></tr></thead><tbody>{rows.map((r) => <tr key={r.code}><td className="num" style={{ textAlign: "center", color: "var(--tx-3)", fontWeight: 700 }}>{r.code === "etc" ? "—" : r.rank}</td><td style={{ color: "var(--tx-1)", fontWeight: 600 }}>{r.code === "etc" ? <span style={{ color: "var(--tx-4)", fontStyle: "italic" }}>{r.name}</span> : <><span style={{ color: "var(--tx-3)", fontWeight: 700 }}>{r.code}</span><span style={{ color: "var(--tx-5)", margin: "0 4px" }}>·</span>{r.name}</>}</td><td className="num" style={{ textAlign: "right", paddingRight: 20, color: "var(--tx-1)", fontWeight: 700 }}>{r.count.toLocaleString()}</td></tr>)}</tbody></table></div></SidePanel>;
}
function SelectedDetailPanel({ log, onClose }: { log: any; onClose: () => void }) {
  if (!log) return <SidePanel title="선택 이력 상세"><div style={{ padding: "40px 0", textAlign: "center", color: "var(--tx-5)", fontSize: 13, border: "1px dashed var(--line-2)", borderRadius: 10 }}>좌측 표에서 이력을 선택하세요</div></SidePanel>;
  const d = log.detail ?? {};
  const Row = ({ label, children }: { label: string; children: ReactNode }) => <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line-1)", alignItems: "start" }}><span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600, paddingTop: 1 }}>{label}</span><span style={{ fontSize: 13, color: "var(--tx-1)", fontWeight: 600, lineHeight: 1.55 }}>{children}</span></div>;
  return <section className="pmo-panel" style={{ padding: "18px 20px" }}><header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><h3 className="pmo-section-title" style={{ margin: 0, fontSize: 16, lineHeight: "20px" }}>선택 이력 상세</h3><button onClick={onClose} aria-label="닫기" style={{ width: 24, height: 24, padding: 0, background: "transparent", border: 0, color: "var(--tx-4)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg></button></header><div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>{d["이슈"] && <Row label="이슈">{d["이슈"]}</Row>}{d["조치사항"] && <Row label="조치사항">{d["조치사항"]}</Row>}{d["다음 단계"] && <Row label="다음 단계">{d["다음 단계"]}</Row>}{d["관련 일정"] && <Row label="관련 일정"><span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--line-2)", borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}><Icon name="calendar" size={13} stroke={1.8} style={{ color: "var(--tx-4)" }} /><span style={{ color: "var(--tx-3)" }}>{d["관련 일정"].label}</span><span style={{ color: "var(--tx-1)", fontWeight: 700 }}>{d["관련 일정"].date}</span></span></Row>}</div><button className="pmo-btn" style={{ width: "100%", height: 40, background: "var(--bg-3)", border: "1px solid var(--line-2)", color: "var(--tx-1)", fontWeight: 700, fontSize: 13.5, justifyContent: "center" }}>상세 보기</button></section>;
}

export default function HistoryPage() {
  const [data, setData] = useState<any | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getP1Screen("history").then((result) => {
      if (alive) {
        const payload = result.data as any;
        setData(payload);
        setSelectedId(payload.logs[0]?.id ?? null);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  const selectedLog = useMemo(() => (data?.logs ?? []).find((l: any) => l.id === selectedId), [data, selectedId]);
  if (!data) return null;
  return <AppShell user={data.meta.user} notifications={data.meta.notifications} current="history" pageTitle="진행이력">
    <HistoryFilter filters={data.filters} />
    <SummaryRow items={data.summary} />
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <LogsTable rows={data.logs} pagination={data.pagination} selectedId={selectedId} onSelect={setSelectedId} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <RecentStatusPanel rows={data.recentStatusChanges} />
        <SelectedDetailPanel log={selectedLog} onClose={() => setSelectedId(null)} />
        <ByProjectPanel rows={data.byProject} />
      </div>
    </div>
  </AppShell>;
}
