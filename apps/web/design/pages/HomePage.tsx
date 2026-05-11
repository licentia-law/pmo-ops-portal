"use client";

import { useEffect, useRef, useState } from "react";
import homeData from "../01_홈/home.json";

type IconName =
  | "home"
  | "briefcase"
  | "users"
  | "trending"
  | "settings"
  | "chevronDown"
  | "chevronUp"
  | "chevronRight"
  | "chevronLeft"
  | "chevronsLeft"
  | "search"
  | "bell"
  | "arrowRight"
  | "menu"
  | "execution"
  | "folder"
  | "report"
  | "clock"
  | "calendar"
  | "check";

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
  chevronsLeft: "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  arrowRight: "M5 12h14M13 5l7 7-7 7",
  menu: "M4 6h16M4 12h16M4 18h16",
  execution: "M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 11h8M8 15h6M8 7h5",
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v3M16 4v3",
  check: "M5 12l4 4 10-10"
};

function Icon({ name, size = 16, stroke = 1.6, className, style, fill = "none" }: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

type Tone = "blue" | "green" | "purple" | "amber" | "brand" | "rose" | "slate";

const TONE_BG: Record<Tone, { fg: string; bg: string }> = {
  blue: { fg: "#2563eb", bg: "#e3eefe" },
  green: { fg: "#16a34a", bg: "#dcf2e3" },
  purple: { fg: "#7c3aed", bg: "#ede5fd" },
  amber: { fg: "#d97706", bg: "#fdf0d8" },
  brand: { fg: "#4F46E5", bg: "#eef1ff" },
  rose: { fg: "#be123c", bg: "#fde7eb" },
  slate: { fg: "#475569", bg: "#eef2f7" }
};

function ToneIcon({ tone = "blue", icon, size = 44, iconSize }: {
  tone?: Tone;
  icon: IconName;
  size?: number;
  iconSize?: number;
}) {
  const t = TONE_BG[tone] ?? TONE_BG.blue;
  return (
    <span style={{ width: size, height: size, borderRadius: 10, background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} stroke={1.7} />
    </span>
  );
}

function Donut({ value = 0, size = 56, stroke = 7, color = "var(--brand)", track = "#eef1f6" }: {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function Delta({ dir = "up", abs }: { dir?: "up" | "down"; abs: string }) {
  return <span className={`pmo-delta pmo-delta--${dir}`}><span className="pmo-delta__tri">{dir === "up" ? "▲" : "▼"}</span>{abs}</span>;
}

const STATUS_LABEL: Record<string, string> = {
  proposing: "제안중",
  presented: "발표완료",
  win: "WIN",
  loss: "LOSS",
  drop: "DROP",
  running: "수행중",
  support: "업무지원",
  done: "완료"
};

function StatusBadge({ code }: { code: string }) {
  return <span className={`pmo-badge pmo-badge--${code}`}>{STATUS_LABEL[code] ?? code}</span>;
}

function KPICard({ kpi }: { kpi: any }) {
  const { label, donut, value, unit, icon, tone, delta, footer } = kpi;
  return (
    <div className="pmo-panel" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 132 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {donut ? <Donut value={value} color={kpi.color === "info" ? "var(--info)" : "var(--brand)"} size={48} stroke={6} /> : <ToneIcon tone={tone} icon={icon} size={40} iconSize={20} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 15, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 26, lineHeight: 1, fontWeight: 700, color: "var(--tx-1)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {value}
            <span style={{ fontSize: 16, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{unit}</span>
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--tx-4)", marginTop: "auto", paddingTop: 4, borderTop: "1px dashed var(--line-2)" }}>
        <span>{footer ?? "전월 대비"}</span>
        {delta ? <Delta {...delta} /> : null}
      </div>
    </div>
  );
}

function QuickLinkCard({ item }: { item: any }) {
  return (
    <a href={item.href ?? "#"} className="pmo-panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, transition: "box-shadow .15s ease, border-color .15s ease, transform .15s ease", minHeight: 116 }}>
      <ToneIcon tone={item.tone} icon={item.icon} size={48} iconSize={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--tx-1)", marginBottom: 4 }}>{item.title}</div>
        <div style={{ fontSize: 15, color: "var(--tx-4)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{item.desc}</div>
      </div>
      <span style={{ color: "var(--tx-5)", flex: "0 0 auto" }}>
        <Icon name="arrowRight" size={18} stroke={1.7} />
      </span>
    </a>
  );
}

const NAV = [
  { kind: "item", id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [{ id: "dashboard", label: "대시보드" }, { id: "execution", label: "업무수행현황" }, { id: "code", label: "프로젝트코드" }, { id: "project-detail", label: "프로젝트 상세" }, { id: "history", label: "진행이력" }] },
  { kind: "group", id: "people", label: "인력", icon: "users", items: [{ id: "active", label: "인력재직현황" }, { id: "assignment", label: "인력배치/투입현황" }, { id: "current", label: "인원별 투입(현재)" }, { id: "idle", label: "대기현황" }] },
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [{ id: "weekly", label: "주간현황" }, { id: "monthly", label: "월별가동현황" }, { id: "idleProp", label: "대기/제안인원" }, { id: "propPrj", label: "제안PRJ" }, { id: "execPrj", label: "이행PRJ" }, { id: "report", label: "보고서 다운로드" }] },
  { kind: "group", id: "admin", label: "관리", icon: "settings", items: [{ id: "users", label: "사용자/권한 관리" }, { id: "master", label: "기준정보 관리" }] }
] as const;

const ROUTE_BY_ID: Record<string, string> = {
  home: "/",
  dashboard: "/dashboard",
  execution: "/projects/operations",
  code: "/projects/codes",
  "project-detail": "/projects/1",
  history: "/projects/logs",
  active: "/people/employment",
  assignment: "/people/assignments",
  current: "/people/current",
  idle: "/people/waiting",
  weekly: "/reports/weekly",
  monthly: "/reports/monthly"
};

function SidebarItem({ id, label, current, indent }: { id: string; label: string; current: string; indent?: boolean }) {
  const active = id === current;
  const href = ROUTE_BY_ID[id] ?? "#";
  return (
    <a href={href} style={{ display: "flex", alignItems: "center", height: 36, padding: indent ? "0 16px 0 44px" : "0 16px", borderRadius: 8, margin: "0 8px", fontSize: 15.5, fontWeight: active ? 600 : 500, color: active ? "var(--brand)" : "var(--tx-3)", background: active ? "var(--brand-bg)" : "transparent", transition: "background .12s" }}>
      {label}
    </a>
  );
}

function SidebarGroup({ group, current }: { group: any; current: string }) {
  const containsActive = group.items.some((it: any) => it.id === current);
  const [open, setOpen] = useState(containsActive);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 16px)", height: 36, padding: "0 12px", margin: "0 8px", background: "transparent", border: 0, borderRadius: 8, color: "var(--tx-3)", fontWeight: 600, fontSize: 15.5 }}>
        <Icon name={group.icon} size={16} stroke={1.7} style={{ color: "var(--tx-4)" }} />
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
      </button>
      {open ? <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>{group.items.map((it: any) => <SidebarItem key={it.id} id={it.id} label={it.label} current={current} indent />)}</div> : null}
    </div>
  );
}

function AppShell({ user, notifications, current = "home", pageTitle = "홈", children }: { user: any; notifications?: number; current?: string; pageTitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <aside style={{ width: "var(--side-w)", flex: "0 0 var(--side-w)", background: "var(--bg-side)", borderRight: "1px solid var(--line-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 64, flex: "0 0 auto", borderBottom: "1px solid var(--line-2)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "0 0 auto", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.15)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 4l5-2 5 2v5c0 3-3 5-5 5s-5-2-5-5z" /></svg>
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", letterSpacing: "0.01em", lineHeight: 1.2 }}>PMO 업무수행<br />관리시스템</span>
        </a>
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {NAV.map((node) =>
            node.kind === "item" ? (
              <a key={node.id} href={ROUTE_BY_ID[node.id] ?? "#"} style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 12px", margin: "0 8px 6px", borderRadius: 8, background: node.id === current ? "var(--brand-bg)" : "transparent", color: node.id === current ? "var(--brand)" : "var(--tx-2)", fontSize: 16, fontWeight: node.id === current ? 700 : 600 }}>
                <Icon name={node.icon as IconName} size={16} stroke={1.8} />
                {node.label}
              </a>
            ) : (
              <SidebarGroup key={node.id} group={node} current={current} />
            )
          )}
        </nav>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: "var(--header-h)", flex: "0 0 var(--header-h)", background: "var(--bg-1)", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx-3)", fontSize: 16, fontWeight: 600 }}>
            <Icon name="menu" size={18} stroke={1.8} style={{ color: "var(--tx-4)" }} />
            <span style={{ color: "var(--tx-1)", fontSize: 18, fontWeight: 700 }}>{pageTitle}</span>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div className="pmo-search">
              <Icon name="search" size={16} stroke={1.8} />
              <input placeholder="프로젝트/인력 검색" />
            </div>
          </div>
          <button style={{ position: "relative", width: 38, height: 38, border: 0, borderRadius: 10, background: "transparent", color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="bell" size={18} stroke={1.8} />
            {notifications && notifications > 0 ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--crit)", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-1)", boxSizing: "content-box" }}>{notifications}</span> : null}
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 10px 0 6px", border: 0, borderRadius: 10, background: "transparent" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c7d0fb, #a5b4fc)", color: "#3730a3", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>김P</span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--tx-1)" }}>{user.name}</span>
              <span style={{ fontSize: 13, color: "var(--tx-4)" }}>{user.team} · {user.role}</span>
            </span>
            <Icon name="chevronDown" size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
          </button>
        </header>
        <main style={{ flex: 1, padding: "24px 28px 32px" }}>{children}</main>
      </div>
    </div>
  );
}

function Hero({ asOf, hero }: { asOf: string; hero: { title: string; subtitle: string } }) {
  return (
    <section className="pmo-panel" style={{ padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 29, lineHeight: "35px", fontWeight: 700, color: "var(--tx-1)", letterSpacing: "0.005em" }}>{hero.title}</h1>
        <p style={{ margin: "8px 0 0", fontSize: 16, color: "var(--tx-4)" }}><span style={{ color: "var(--brand)", fontWeight: 600 }}>{asOf}</span> 기준 · {hero.subtitle}</p>
      </div>
      <button className="pmo-btn"><Icon name="calendar" size={14} stroke={1.8} />기준일 변경</button>
    </section>
  );
}

function QuickLinks({ items }: { items: any[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 className="pmo-section-title">주요 화면 바로가기</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {items.map((it) => <QuickLinkCard key={it.id} item={it} />)}
      </div>
    </section>
  );
}

function KPIRow({ asOf, kpis }: { asOf: string; kpis: any[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 className="pmo-section-title">핵심 현황<span style={{ marginLeft: 8, fontSize: 15, fontWeight: 500, color: "var(--tx-4)" }}>(기준일 {asOf})</span></h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
      </div>
    </section>
  );
}

const BUSINESS_TYPE_TONE: Record<string, { fg: string; bg: string }> = {
  주사업: { fg: "#1d4ed8", bg: "#e3eefe" },
  부사업: { fg: "#7c3aed", bg: "#ede5fd" },
  하도: { fg: "#b45309", bg: "#fef4e1" },
  협력: { fg: "#475569", bg: "#eef2f7" }
};

function BusinessTypeChip({ type }: { type: string }) {
  const t = BUSINESS_TYPE_TONE[type] ?? BUSINESS_TYPE_TONE.주사업;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: t.fg, background: t.bg }}>{type}</span>;
}

function RecentProjects({ rows }: { rows: any[] }) {
  return (
    <section className="pmo-panel" style={{ overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>최근 변경 프로젝트</h2>
        <a href="#" className="pmo-link">전체 보기 <Icon name="chevronRight" size={14} stroke={2} /></a>
      </header>
      <table className="pmo-table pmo-table--recent">
        <thead>
          <tr>
            <th style={{ width: 110 }}>코드</th>
            <th style={{ width: "36%" }}>사업명</th>
            <th>사업유형</th>
            <th>상태</th>
            <th>변경일시</th>
            <th style={{ textAlign: "right", paddingRight: 22 }}>변경자</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="num">{r.code}</td>
              <td className="name">{r.name}</td>
              <td><BusinessTypeChip type={r.businessType} /></td>
              <td><StatusBadge code={r.status} /></td>
              <td className="num">{r.updatedAt}</td>
              <td style={{ textAlign: "right", paddingRight: 22, color: "var(--tx-3)" }}>{r.updatedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MonthSummaryRow({ row }: { row: any }) {
  const isMetric = Boolean(row.donut);
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid var(--line-1)" }}>
      {isMetric ? <Donut value={row.pct} color={row.color === "info" ? "var(--info)" : "var(--brand)"} size={36} stroke={5} /> : <ToneIcon tone={row.tone} icon={row.icon} size={36} iconSize={18} />}
      <span style={{ flex: 1, fontSize: 16, color: "var(--tx-2)", fontWeight: 500 }}>{row.label}</span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>{row.value}</span>
        {row.delta ? <Delta {...row.delta} /> : null}
      </span>
    </li>
  );
}

function MonthSummary({ summary }: { summary: any }) {
  return (
    <section className="pmo-panel" style={{ display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 6px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>이번 달 요약<span style={{ marginLeft: 8, fontSize: 14, fontWeight: 500, color: "var(--tx-4)" }}>{summary.month}</span></h2>
        <a href="#" className="pmo-link">상세 보기 <Icon name="chevronRight" size={14} stroke={2} /></a>
      </header>
      <ul style={{ listStyle: "none", margin: 0, padding: "0 22px 18px" }}>
        {summary.rows.map((r: any) => <MonthSummaryRow key={r.id} row={r} />)}
      </ul>
    </section>
  );
}

export default function HomePage() {
  const data = homeData as any;
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div ref={rootRef} />;

  return (
    <AppShell user={data.meta.user} notifications={data.meta.notifications} current="home" pageTitle="홈">
      <Hero asOf={data.meta.asOf} hero={data.hero} />
      <QuickLinks items={data.quickLinks} />
      <KPIRow asOf={data.meta.asOf} kpis={data.kpis} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <RecentProjects rows={data.recentProjects.rows} />
        <MonthSummary summary={data.monthSummary} />
      </div>
    </AppShell>
  );
}
