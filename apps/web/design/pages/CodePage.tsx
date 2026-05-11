"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import codeData from "../04_프로젝트코드/code.json";

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
  | "checkCircle";

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
  checkCircle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.5 2.5L16 9.5"
};

function Icon({ name, size = 16, stroke = 1.6, fill = "none", style }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };

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

const NAV = [
  { kind: "item", id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [{ id: "dashboard", label: "대시보드" }, { id: "execution", label: "업무수행현황" }, { id: "code", label: "프로젝트코드" }, { id: "project-detail", label: "프로젝트 상세" }, { id: "history", label: "진행이력" }] },
  { kind: "group", id: "people", label: "인력", icon: "users", items: [{ id: "active", label: "인력재직현황" }, { id: "assignment", label: "인력배치/투입현황" }, { id: "current", label: "인원별 투입(현재)" }, { id: "idle", label: "대기현황" }] },
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [{ id: "weekly", label: "주간현황" }, { id: "monthly", label: "월별가동현황" }] },
  { kind: "group", id: "admin", label: "관리", icon: "settings", items: [{ id: "users", label: "사용자/권한 관리" }, { id: "master", label: "기준정보 관리" }] }
] as const;

function SidebarItem({ id, label, current, indent }: { id: string; label: string; current: string; indent?: boolean }) {
  const active = id === current;
  return <a href={ROUTE_BY_ID[id] ?? "#"} style={{ display: "flex", alignItems: "center", height: 36, padding: indent ? "0 16px 0 44px" : "0 16px", borderRadius: 8, margin: "0 8px", fontSize: 15.5, fontWeight: active ? 600 : 500, color: active ? "var(--brand)" : "var(--tx-3)", background: active ? "var(--brand-bg)" : "transparent" }}>{label}</a>;
}

function SidebarGroup({ group, current }: { group: any; current: string }) {
  const [open, setOpen] = useState(group.id === "project");
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 16px)", height: 36, padding: "0 12px", margin: "0 8px", background: "transparent", border: 0, borderRadius: 8, color: "var(--tx-3)", fontWeight: 600, fontSize: 15.5 }}>
        <Icon name={group.icon as IconName} size={16} stroke={1.7} style={{ color: "var(--tx-4)" }} />
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
      </button>
      {open ? <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>{group.items.map((it: any) => <SidebarItem key={it.id} id={it.id} label={it.label} current={current} indent />)}</div> : null}
    </div>
  );
}

function AppShell({ user, notifications, current = "code", pageTitle = "프로젝트코드", children }: { user: any; notifications?: number; current?: string; pageTitle?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <aside style={{ width: "var(--side-w)", flex: "0 0 var(--side-w)", background: "var(--bg-side)", borderRight: "1px solid var(--line-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 64, flex: "0 0 auto", borderBottom: "1px solid var(--line-2)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "0 0 auto", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.15)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 4l5-2 5 2v5c0 3-3 5-5 5s-5-2-5-5z" /></svg>
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", lineHeight: 1.2, letterSpacing: "0.01em" }}>PMO 업무수행<br />관리시스템</span>
        </a>
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {NAV.map((node) => node.kind === "item" ? <a key={node.id} href={ROUTE_BY_ID[node.id] ?? "#"} style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 12px", margin: "0 8px 6px", borderRadius: 8, background: node.id === current ? "var(--brand-bg)" : "transparent", color: node.id === current ? "var(--brand)" : "var(--tx-2)", fontSize: 16, fontWeight: node.id === current ? 700 : 600 }}><Icon name={node.icon as IconName} size={16} stroke={1.8} />{node.label}</a> : <SidebarGroup key={node.id} group={node} current={current} />)}
        </nav>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: "var(--header-h)", background: "var(--bg-1)", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx-3)", fontSize: 16, fontWeight: 600 }}>
            <Icon name="menu" size={18} stroke={1.8} style={{ color: "var(--tx-4)" }} />
            <span style={{ color: "var(--tx-1)", fontSize: 18, fontWeight: 700 }}>{pageTitle}</span>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div className="pmo-search"><Icon name="search" size={16} stroke={1.8} /><input placeholder="프로젝트/인력 검색" /></div>
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
  const data = codeData as any;
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("전체");
  const [useFilter, setUseFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const owners = useMemo<string[]>(() => ["전체", ...Array.from(new Set<string>(data.rows.map((r: any) => String(r.salesOwner))))], [data.rows]);
  const filteredRows = useMemo(() => {
    return data.rows.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (ownerFilter !== "전체" && r.salesOwner !== ownerFilter) return false;
      if (useFilter !== "전체" && r.useStatus !== useFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!(String(r.code).toLowerCase().includes(q) || String(r.name).toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data.rows, statusFilter, ownerFilter, useFilter, query]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, totalPages]);

  return (
    <AppShell user={data.meta.user} notifications={data.meta.notifications} current="code" pageTitle="프로젝트코드">
      <section className="pmo-panel" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 16, alignItems: "flex-end" }}>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>상태</span>
            <select style={SELECT_STYLE} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">전체</option>
              {Object.keys(STATUS_LABEL).map((code) => <option key={code} value={code}>{STATUS_LABEL[code]}</option>)}
            </select>
          </label>
          <label className="pmo-field" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 14 }}>영업대표</span>
            <select style={SELECT_STYLE} value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}>
              {owners.map((owner: string) => <option key={owner} value={owner}>{owner}</option>)}
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
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="프로젝트코드, 프로젝트명 검색" style={{ border: 0, outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--tx-1)" }} />
            </div>
          </label>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        {data.summary.map((s: any) => (
          <StatusCard key={s.id} s={s} active={statusFilter === s.code} onClick={() => { setStatusFilter(statusFilter === s.code ? "all" : s.code); setPage(1); }} />
        ))}
      </section>

      <section className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line-2)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>프로젝트코드 목록</h2>
          <span style={{ fontSize: 12.5, color: "var(--tx-4)" }}>
            검색결과 <span style={{ color: "var(--tx-1)", fontWeight: 700 }}>{filteredRows.length}</span>건
            {statusFilter !== "all" ? <span style={{ marginLeft: 10 }}><StatusBadge code={statusFilter} /></span> : null}
          </span>
        </header>
        <div style={{ overflowX: "auto" }}>
          <table className="pmo-table pmo-table--recent">
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: 108 }}>프로젝트코드</th>
                <th style={{ textAlign: "center" }}>프로젝트명</th>
                <th style={{ textAlign: "center", width: 88 }}>상태</th>
                <th style={{ textAlign: "center", width: 70 }}>확도</th>
                <th style={{ textAlign: "center", width: 120 }}>영업부서</th>
                <th style={{ textAlign: "center", width: 92 }}>영업대표</th>
                <th style={{ textAlign: "center", width: 100 }}>총괄 PM</th>
                <th style={{ textAlign: "center", width: 108 }}>시작일</th>
                <th style={{ textAlign: "center", width: 108 }}>종료일</th>
                <th style={{ textAlign: "center", width: 84 }}>사용여부</th>
                <th style={{ textAlign: "center", width: 64 }}>비고</th>
                <th style={{ textAlign: "center", width: 104 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: "60px 20px", textAlign: "center", color: "var(--tx-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Icon name="search" size={28} stroke={1.5} style={{ color: "var(--tx-5)" }} />
                      <span style={{ fontWeight: 600, color: "var(--tx-3)" }}>해당 조건의 프로젝트 코드가 없습니다.</span>
                      <span style={{ fontSize: 12 }}>필터를 초기화하거나 다른 상태를 선택해 보세요.</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.map((r: any) => (
                <tr key={r.code}>
                  <td className="num" style={{ textAlign: "center", color: "var(--brand-700)", fontWeight: 600 }}>{r.code}</td>
                  <td className="name" style={{ textAlign: "center" }}>{r.name}</td>
                  <td style={{ textAlign: "center" }}><StatusBadge code={r.status} /></td>
                  <td style={{ textAlign: "center" }}><CertaintyChip value={r.certainty} /></td>
                  <td style={{ textAlign: "center" }}>{r.salesDept}</td>
                  <td style={{ textAlign: "center" }}>{r.salesOwner}</td>
                  <td style={{ textAlign: "center" }}>{r.supportLead}</td>
                  <td className="num" style={{ textAlign: "center" }}>{r.fromDate && r.fromDate !== "-" ? r.fromDate : "-"}</td>
                  <td className="num" style={{ textAlign: "center" }}>{r.toDate && r.toDate !== "-" ? r.toDate : "-"}</td>
                  <td style={{ textAlign: "center" }}><UseChip value={r.useStatus} /></td>
                  <td style={{ textAlign: "center", color: "var(--tx-5)" }}>{r.note || "-"}</td>
                  <td style={{ textAlign: "center" }}><ViewMenu /></td>
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
    </AppShell>
  );
}

export default CodePageImpl;
