"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import dashboardData from "../02_대시보드/dashboard.json";

type IconName =
  | "home" | "briefcase" | "users" | "trending" | "settings"
  | "chevronDown" | "chevronUp" | "chevronRight" | "chevronLeft"
  | "search" | "bell" | "menu" | "calendar" | "report" | "clock" | "check";

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
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  check: "M5 12l4 4 10-10"
};

function Icon({ name, size = 16, stroke = 1.6, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden><path d={ICONS[name]} /></svg>;
}

const NAV = [
  { kind: "item", id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [{ id: "dashboard", label: "대시보드" }, { id: "execution", label: "업무수행현황" }, { id: "code", label: "프로젝트코드" }, { id: "project-detail", label: "프로젝트 상세" }, { id: "history", label: "진행이력" }] },
  { kind: "group", id: "people", label: "인력", icon: "users", items: [{ id: "active", label: "인력재직현황" }, { id: "assignment", label: "인력배치/투입현황" }, { id: "current", label: "인원별 투입(현재)" }, { id: "idle", label: "대기현황" }] },
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [{ id: "weekly", label: "주간현황" }, { id: "monthly", label: "월별가동현황" }] },
  { kind: "group", id: "admin", label: "관리", icon: "settings", items: [{ id: "users", label: "사용자/권한 관리" }, { id: "master", label: "기준정보 관리" }] }
] as const;

const ROUTE_BY_ID: Record<string, string> = {
  home: "/", dashboard: "/dashboard", execution: "/projects/operations", code: "/projects/codes", "project-detail": "/projects/1", history: "/projects/logs",
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

function AppShell({ user, notifications, current = "dashboard", pageTitle = "대시보드", children }: { user: any; notifications?: number; current?: string; pageTitle?: string; children: ReactNode }) {
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

function Delta({ dir = "up", abs }: { dir?: "up" | "down"; abs: string }) {
  return <span className={`pmo-delta pmo-delta--${dir}`}><span className="pmo-delta__tri" style={{ fontSize: 12 }}>{dir === "up" ? "▲" : "▼"}</span>{abs}</span>;
}

function Donut({ value = 0, size = 56, stroke = 7, color = "var(--brand)", track = "#eef1f6" }: { value?: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>;
}
const TONE_BG: Record<string, { fg: string; bg: string }> = { blue: { fg: "#2563eb", bg: "#e3eefe" }, green: { fg: "#16a34a", bg: "#dcf2e3" }, purple: { fg: "#7c3aed", bg: "#ede5fd" }, amber: { fg: "#d97706", bg: "#fdf0d8" }, brand: { fg: "#4F46E5", bg: "#eef1ff" }, rose: { fg: "#be123c", bg: "#fde7eb" }, slate: { fg: "#475569", bg: "#eef2f7" } };
function ToneIcon({ tone = "blue", icon, size = 44, iconSize }: { tone?: string; icon: IconName; size?: number; iconSize?: number }) {
  const t = TONE_BG[tone] ?? TONE_BG.blue;
  return <span style={{ width: size, height: size, borderRadius: 10, background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} stroke={1.7} /></span>;
}

function KPICard({ kpi }: { kpi: any }) {
  const { label, donut, value, unit, icon, tone, delta } = kpi;
  return <div className="pmo-panel" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 132 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {donut ? <Donut value={value} color={kpi.color === "info" ? "var(--info)" : "var(--brand)"} size={48} stroke={6} /> : <ToneIcon tone={tone} icon={icon} size={40} iconSize={20} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 15, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 26, lineHeight: 1, fontWeight: 700, color: "var(--tx-1)" }}>{value}<span style={{ fontSize: 16, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{unit}</span></span>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--tx-4)", marginTop: "auto", paddingTop: 4, borderTop: "1px dashed var(--line-2)" }}><span>전월 대비</span>{delta ? <Delta {...delta} /> : null}</div>
  </div>;
}

function FilterBar({ asOf }: { asOf: string }) {
  const [period, setPeriod] = useState("6m");
  const [org, setOrg] = useState("all");
  const Select = ({ value, onChange, children, w }: { value: string; onChange: (v: string) => void; children: ReactNode; w?: number }) => <div style={{ position: "relative", width: w ?? 160 }}><select value={value} onChange={(e) => onChange(e.target.value)} style={{ appearance: "none", width: "100%", height: 36, padding: "0 32px 0 12px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--tx-2)", fontSize: 14, fontFamily: "inherit", fontWeight: 500, cursor: "pointer" }}>{children}</select><span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tx-5)", pointerEvents: "none" }}><Icon name="chevronDown" size={14} stroke={2} /></span></div>;
  const Toggle = ({ id, label }: { id: string; label: string }) => <button onClick={() => setPeriod(id)} style={{ height: 32, padding: "0 14px", border: 0, background: period === id ? "var(--bg-1)" : "transparent", boxShadow: period === id ? "0 1px 2px rgba(15,23,42,.08)" : "none", color: period === id ? "var(--tx-1)" : "var(--tx-4)", fontSize: 13, fontWeight: period === id ? 700 : 500, borderRadius: 6 }}>{label}</button>;
  return <section className="pmo-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 700 }}>본부 KPI 한눈에 보기</span><span style={{ fontSize: 13, color: "var(--tx-5)", marginTop: 2 }}>기준일 <strong style={{ color: "var(--brand)", fontWeight: 600 }}>{asOf}</strong></span></div>
    <div style={{ flex: 1 }} />
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13.5, color: "var(--tx-4)", fontWeight: 600 }}>기준일</span><div style={{ height: 36, padding: "0 12px", background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--tx-2)", fontWeight: 500 }}><Icon name="calendar" size={14} stroke={1.8} style={{ color: "var(--tx-4)" }} />{asOf}</div></label>
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13.5, color: "var(--tx-4)", fontWeight: 600 }}>조직</span><Select value={org} onChange={setOrg} w={140}><option value="all">전체</option><option value="hq">PMO본부</option><option value="t1">PMO1팀</option><option value="t2">PMO2팀</option><option value="tech">기술지원팀</option></Select></label>
    <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--bg-0)", border: "1px solid var(--line-2)", borderRadius: 8 }}><Toggle id="3m" label="3개월" /><Toggle id="6m" label="6개월" /><Toggle id="12m" label="12개월" /></div>
    <button className="pmo-btn" style={{ fontSize: 14 }}><Icon name="trending" size={14} stroke={1.8} />새로고침</button>
    <button className="pmo-btn pmo-btn-primary" style={{ fontSize: 14, background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }}><Icon name="report" size={14} stroke={1.8} />엑셀 내보내기</button>
  </section>;
}

function TrendChart({ trend }: { trend: any }) {
  const W = 720, H = 320;
  const padL = 44, padR = 24, padT = 28, padB = 36;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const months = trend.months, u = trend.utilization, c = trend.contractRate;
  const yMin = 30, yMax = 100;
  const x = (i: number) => padL + (months.length === 1 ? innerW / 2 : (i * innerW) / (months.length - 1));
  const y = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const yTicks = [30, 50, 70, 90, 100];
  return <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>최근 6개월 가동률 / 가득률 추이</h2><div style={{ display: "inline-flex", alignItems: "center", gap: 16, fontSize: 13, color: "var(--tx-3)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand)" }} />가동률(%)</span><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--info)" }} />가득률(%)</span></div></header>
    <div style={{ width: "100%", overflow: "hidden" }}><svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxHeight: 340 }} role="img" aria-label="6개월 가동률 가득률 추이">{yTicks.map((t) => <g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line-2)" strokeDasharray={t === yMin ? "0" : "3 4"} /><text x={padL - 10} y={y(t) + 4} fontSize="12" fill="var(--tx-1)" textAnchor="end">{t}%</text></g>)}{months.map((m: string, i: number) => <text key={m} x={x(i)} y={H - 12} fontSize="13" fill="var(--tx-1)" textAnchor="middle">{m.replace("-", ".")}</text>)}<path d={line(u)} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d={line(c)} fill="none" stroke="var(--info)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />{u.map((v: number, i: number) => <circle key={`u${i}`} cx={x(i)} cy={y(v)} r={i === u.length - 1 ? 5 : 3.2} fill="#fff" stroke="var(--brand)" strokeWidth={i === u.length - 1 ? 2.5 : 2} />)}{c.map((v: number, i: number) => <circle key={`c${i}`} cx={x(i)} cy={y(v)} r={i === c.length - 1 ? 5 : 3.2} fill="#fff" stroke="var(--info)" strokeWidth={i === c.length - 1 ? 2.5 : 2} />)}{u.map((v: number, i: number) => i !== u.length - 1 && <text key={`ul${i}`} x={x(i)} y={y(v) - 10} fontSize="12" fill="var(--tx-4)" textAnchor="middle">{v.toFixed(1)}</text>)}{c.map((v: number, i: number) => i !== c.length - 1 && <text key={`cl${i}`} x={x(i)} y={y(v) + 16} fontSize="12" fill="var(--tx-4)" textAnchor="middle">{v.toFixed(1)}</text>)}{(() => { const last = u.length - 1; return <g><text x={x(last)} y={y(u[last]) - 12} fontSize="13" fontWeight="700" fill="var(--brand)" textAnchor="middle">{u[last].toFixed(1)}%</text><text x={x(last)} y={y(c[last]) + 18} fontSize="13" fontWeight="700" fill="var(--info)" textAnchor="middle">{c[last].toFixed(1)}%</text></g>; })()}</svg></div>
  </section>;
}

function TeamHeadcount({ rows }: { rows: any[] }) {
  const total = rows.reduce((a, r) => a + r.total, 0);
  return <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>팀별 인력 현황</h2><span style={{ fontSize: 13, color: "var(--tx-5)", fontWeight: 700 }}>합계 {total}명</span></header>
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>{rows.map((r) => <li key={r.team} style={{ display: "flex", flexDirection: "column", gap: 6 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-1)" }}>{r.team}</span><span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)" }}>{r.total}<span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 500, marginLeft: 2 }}>명</span></span></div><div style={{ display: "flex", height: 8, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden" }}>{r.running > 0 && <i title={`수행 ${r.running}`} style={{ width: `${(r.running / r.total) * 100}%`, background: "var(--brand)" }} />}{r.proposing > 0 && <i title={`제안 ${r.proposing}`} style={{ width: `${(r.proposing / r.total) * 100}%`, background: "var(--info)" }} />}{r.idle > 0 && <i title={`대기 ${r.idle}`} style={{ width: `${(r.idle / r.total) * 100}%`, background: "var(--warn)" }} />}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--tx-1)" }}><span><i style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--brand)", marginRight: 5, verticalAlign: 1 }} />수행 {r.running}</span><span><i style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--info)", marginRight: 5, verticalAlign: 1 }} />제안 {r.proposing}</span><span><i style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--warn)", marginRight: 5, verticalAlign: 1 }} />대기 {r.idle}</span></div></li>)}</ul>
  </section>;
}

function DualBar({ utilization, contractRate }: { utilization: number; contractRate: number }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="num" style={{ fontSize: 14, color: "var(--tx-1)", width: 28, textAlign: "right", fontWeight: 600 }}>가동</span><div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden" }}><i style={{ display: "block", width: `${utilization}%`, height: "100%", background: "var(--brand)", borderRadius: 999 }} /></div><span className="num" style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700, width: 46, textAlign: "right" }}>{utilization.toFixed(1)}%</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="num" style={{ fontSize: 14, color: "var(--tx-1)", width: 28, textAlign: "right", fontWeight: 600 }}>가득</span><div style={{ flex: 1, height: 10, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden" }}><i style={{ display: "block", width: `${contractRate}%`, height: "100%", background: "var(--info)", borderRadius: 999 }} /></div><span className="num" style={{ fontSize: 12, color: "var(--info)", fontWeight: 700, width: 46, textAlign: "right" }}>{contractRate.toFixed(1)}%</span></div>
  </div>;
}

function TeamUtilization({ rows }: { rows: any[] }) {
  const [sortDesc, setSortDesc] = useState(true);
  const sorted = useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => (sortDesc ? b.utilization - a.utilization : a.utilization - b.utilization));
    return r;
  }, [rows, sortDesc]);
  return <section className="pmo-panel" style={{ padding: "20px 22px", marginTop: 16 }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}><div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>팀별 가동률 / 가득률</h2><p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--tx-4)" }}>현재 기준(스냅샷) · 본부 합계와 정합</p></div><button className="pmo-btn" onClick={() => setSortDesc((s) => !s)} style={{ height: 32, padding: "0 12px", fontSize: 13 }}><Icon name={sortDesc ? "chevronDown" : "chevronUp"} size={12} stroke={2} />가동률 {sortDesc ? "내림차순" : "오름차순"}</button></header>
    <table className="pmo-table pmo-table--recent" style={{ tableLayout: "fixed" }}><colgroup><col style={{ width: 120 }} /><col style={{ width: 80 }} /><col /><col style={{ width: 80 }} /></colgroup><thead><tr><th>팀명</th><th style={{ textAlign: "right" }}>인원</th><th>가동률 / 가득률</th><th style={{ textAlign: "right", paddingRight: 22 }}>가동률</th></tr></thead><tbody>{sorted.map((r) => <tr key={r.team}><td className="name" style={{ color: "var(--tx-1)", fontWeight: 600 }}>{r.team}</td><td className="num" style={{ textAlign: "right" }}>{r.headcount}명</td><td><DualBar utilization={r.utilization} contractRate={r.contractRate} /></td><td className="num" style={{ textAlign: "right", paddingRight: 22, color: "var(--tx-1)", fontWeight: 700, fontSize: 16 }}>{r.utilization.toFixed(1)}%</td></tr>)}</tbody></table>
    <div style={{ display: "flex", gap: 18, marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line-2)", fontSize: 13, color: "var(--tx-4)", flexWrap: "wrap" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--brand)" }} />가동률 = (수행 + 제안) / 현재 인원</span><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--info)" }} />가득률 = 수행 / 현재 인원</span></div>
  </section>;
}

export default function DashboardPage() {
  const data = dashboardData as any;
  return <AppShell user={data.meta.user} notifications={data.meta.notifications} current="dashboard" pageTitle="대시보드">
    <FilterBar asOf={data.meta.asOf} />
    <section style={{ marginBottom: 20 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>{data.kpis.map((k: any) => <KPICard key={k.id} kpi={k} />)}</div></section>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}><TrendChart trend={data.trend} /><TeamHeadcount rows={data.teamHeadcount} /></div>
    <TeamUtilization rows={data.teamUtilization} />
  </AppShell>;
}
