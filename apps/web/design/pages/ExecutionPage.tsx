"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import executionData from "../03_업무수행현황/execution.json";

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

const NAV = [
  { kind: "item", id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [{ id: "dashboard", label: "대시보드" }, { id: "execution", label: "업무수행현황" }, { id: "code", label: "프로젝트코드" }, { id: "project-detail", label: "프로젝트 상세" }, { id: "history", label: "진행이력" }] },
  { kind: "group", id: "people", label: "인력", icon: "users", items: [{ id: "active", label: "인력재직현황" }, { id: "assignment", label: "인력배치/투입현황" }, { id: "current", label: "인원별 투입(현재)" }, { id: "idle", label: "대기현황" }] },
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [{ id: "weekly", label: "주간현황" }, { id: "monthly", label: "월별가동현황" }] },
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

function AppShell({ user, notifications, current = "execution", pageTitle = "업무수행현황", children }: { user: any; notifications?: number; current?: string; pageTitle?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <aside style={{ width: "var(--side-w)", flex: "0 0 var(--side-w)", background: "var(--bg-side)", borderRight: "1px solid var(--line-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 64, flex: "0 0 auto", borderBottom: "1px solid var(--line-2)" }}>
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

function SummaryCard({ item, active, onClick }: { item: any; active: boolean; onClick: () => void }) {
  const iconMap: Record<string, IconName> = { all: "folder", proposal: "execution", running: "play", closed: "circle" };
  const toneMap: Record<string, string> = { all: "#3b6df0", proposal: "#ede5fd", running: "#dcf2e3", closed: "#f08c1f" };
  const fgMap: Record<string, string> = { all: "#fff", proposal: "#7c3aed", running: "#16a34a", closed: "#fff" };
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
      <div style={{ fontSize: 14, color: "var(--tx-4)", lineHeight: 1.4 }}>{item.hint ?? (item.breakdown ? item.breakdown.map((b: any) => `${b.label} ${b.value}`).join(" · ") : "")}</div>
    </button>
  );
}

export default function ExecutionPage() {
  const data = executionData as any;
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState(data.selectedRow.code);
  const statusFilterBySummary: Record<string, string[]> = {
    all: [],
    proposal: ["proposing", "presented"],
    running: ["running", "support"],
    closed: ["win", "loss", "drop", "done"]
  };
  const filteredRows = useMemo(() => {
    if (!activeSummary) return data.rows;
    const allowed = statusFilterBySummary[activeSummary] ?? [];
    if (allowed.length === 0) return data.rows;
    return data.rows.filter((row: any) => allowed.includes(row.status));
  }, [activeSummary, data.rows]);
  const selectedRow = useMemo(() => filteredRows.find((row: any) => row.code === selectedCode) ?? filteredRows[0] ?? data.rows[0], [filteredRows, selectedCode, data.rows]);
  useEffect(() => {
    if (!filteredRows.some((row: any) => row.code === selectedCode) && filteredRows[0]) {
      setSelectedCode(filteredRows[0].code);
    }
  }, [filteredRows, selectedCode]);
  const currentDetail = selectedCode === data.selectedRow.code
    ? data.selectedRow
    : {
        ...selectedRow,
        presentPm: selectedRow.leadPm,
        team: `${selectedRow.leadPm} 중심 배치`,
        period: `${selectedRow.startDate} ~ ${selectedRow.endDate}`,
        submission: { datetime: "-", format: "-", note: "-" },
        presentation: { datetime: "-", format: "-", note: "-" },
        rfpNo: "-",
        rfpDate: "-",
        recentActivity: { datetime: selectedRow.modifiedAt, lines: [selectedRow.remark] },
        memo: [selectedRow.remark]
      };
  const amountPair = formatAmountPair(currentDetail.amountText ?? "");
  const teamText = String(currentDetail.team ?? "");
  const teamHead = teamText.replace(/\s*\(총\s*\d+명\)\s*$/, "").trim();
  const teamCount = teamText.match(/\(총\s*\d+명\)/)?.[0] ?? "";
  const summaryFilterLabel = activeSummary ? (data.summary.find((s: any) => s.id === activeSummary)?.label ?? null) : null;

  return (
    <AppShell user={data.meta.user} notifications={data.meta.notifications} current="execution" pageTitle="업무수행현황">
      <section className="pmo-panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
          {["본부", "팀", "사업유형", "상태", "총괄PM", "영업대표"].map((label, idx) => (
            <label key={label} className="pmo-field">
              <span style={{ fontSize: 14 }}>{label}</span>
              <select defaultValue="전체" style={{ fontSize: 14 }}>
                {(idx === 0 ? data.filters.headquarters : idx === 1 ? data.filters.teams : idx === 2 ? data.filters.businessTypes : idx === 3 ? data.filters.statuses : idx === 4 ? data.filters.leadPms : data.filters.salesOwners).map((opt: string) => <option value={opt} key={opt}>{opt}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
          <label className="pmo-field" style={{ minWidth: 320 }}>
            <span style={{ fontSize: 14 }}>기간 (제안접수 기준)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="date" defaultValue={data.filters.from} style={{ fontSize: 14 }} />
              <span style={{ color: "var(--tx-5)" }}>~</span>
              <input type="date" defaultValue={data.filters.to} style={{ fontSize: 14 }} />
            </div>
          </label>
          <label className="pmo-field" style={{ flex: 1 }}>
            <span style={{ fontSize: 14 }}>검색어</span>
            <input placeholder="프로젝트명, 코드, PM, 메모 검색" style={{ fontSize: 14 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }}>
              <Icon name="search" size={14} stroke={2} style={{ marginRight: 4 }} />
              조회
            </button>
            <button className="pmo-btn">초기화</button>
            <button className="pmo-btn"><Icon name="report" size={14} stroke={1.8} style={{ marginRight: 4 }} />엑셀 내보내기</button>
            <button className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" }}>
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
            onClick={() => setActiveSummary(activeSummary === item.id ? null : item.id)}
          />
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16 }}>
        <div className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 18 }}>프로젝트 목록</strong>
            <span style={{ fontSize: 14, color: "var(--tx-4)" }}>
              총 {filteredRows.length}건
              {summaryFilterLabel ? <span style={{ color: "var(--brand)", fontWeight: 600 }}> · 필터: {summaryFilterLabel}</span> : null}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="pmo-table pmo-table--recent">
              <thead>
                <tr>
                  <th>코드</th><th>사업명</th><th>사업유형</th><th>상태</th><th>사업금액</th><th>총괄PM</th><th>영업대표</th><th>변경일시</th><th>변경자</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 12).map((row: any) => (
                  <tr key={row.code} onClick={() => setSelectedCode(row.code)} style={{ cursor: "pointer", background: selectedCode === row.code ? "var(--brand-bg)" : undefined }}>
                    <td className="num" style={{ color: "var(--brand)", fontWeight: 700 }}>{row.code}</td>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td><BizChip type={row.businessType} /></td>
                    <td><StatusBadge code={row.status} /></td>
                    <td className="num">{formatAmountPair(row.amountText)}</td>
                    <td>{row.leadPm}</td>
                    <td>{row.salesOwner}</td>
                    <td className="num">{row.modifiedAt}</td>
                    <td>{row.modifier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px", borderTop: "1px solid var(--line-2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flex: 1 }}>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }}>«</button>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }}>‹</button>
            {Array.from({ length: data.pagination.totalPages }).map((_, i) => (
              <button key={i + 1} className="pmo-btn" style={{ height: 32, minWidth: 34, padding: "0 8px", justifyContent: "center", textAlign: "center", background: i + 1 === data.pagination.currentPage ? "var(--brand)" : "#fff", color: i + 1 === data.pagination.currentPage ? "#fff" : "var(--tx-2)", borderColor: i + 1 === data.pagination.currentPage ? "var(--brand)" : "var(--line-2)" }}>
                {i + 1}
              </button>
            ))}
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }}>›</button>
            <button className="pmo-btn" style={{ height: 32, padding: "0 10px" }}>»</button>
            </div>
            <select className="pmo-btn" style={{ height: 32, marginLeft: "auto" }}>
              <option>20개씩 보기</option>
              <option>50개씩 보기</option>
              <option>100개씩 보기</option>
            </select>
          </div>
        </div>

        <aside className="pmo-panel" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>선택 프로젝트 상세</h2>
            <button style={{ border: 0, background: "transparent", color: "var(--tx-4)", fontSize: 24, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 700 }}>프로젝트코드</div>
          <div style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 800, color: "var(--brand)", marginBottom: 8 }}>{currentDetail.code}</div>
          <div style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 700 }}>사업명</div>
          <div style={{ fontSize: 20, lineHeight: 1.3, fontWeight: 700, color: "var(--tx-1)", marginBottom: 14 }}>{currentDetail.name}</div>

          <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12, display: "grid", gap: 10, fontSize: 14 }}>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>총괄PM</span><strong>{currentDetail.leadPm}</strong></div>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>발표PM</span><strong>{currentDetail.presentPm}</strong></div>
            <div className="pmo-kv">
              <span style={{ fontWeight: 700, color: "var(--tx-2)" }}>제안팀</span>
              <span style={{ textAlign: "right" }}>
                {teamHead}
                {teamCount ? <><br />{teamCount}</> : null}
              </span>
            </div>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>프로젝트 기간</span><span>{currentDetail.period}</span></div>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>상태</span><StatusBadge code={currentDetail.status} fontSize={14} /></div>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>사업유형</span><BizChip type={currentDetail.businessType} /></div>
            <div className="pmo-kv"><span style={{ fontWeight: 700, color: "var(--tx-2)" }}>사업금액</span><strong>{amountPair}</strong></div>
          </div>

          <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 12, paddingTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--tx-1)" }}>제출 일정</div>
            <div className="pmo-kv"><span>일시</span><span>{currentDetail.submission.datetime}</span></div>
            <div className="pmo-kv"><span>형식</span><span>{currentDetail.submission.format}</span></div>
            <div className="pmo-kv"><span>비고</span><span>{currentDetail.submission.note}</span></div>
          </div>

          <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 12, paddingTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--tx-1)" }}>발표 일정</div>
            <div className="pmo-kv"><span>일시</span><span>{currentDetail.presentation.datetime}</span></div>
            <div className="pmo-kv"><span>형식</span><span>{currentDetail.presentation.format}</span></div>
            <div className="pmo-kv"><span>비고</span><span>{currentDetail.presentation.note}</span></div>
            <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 6, paddingTop: 6 }} />
            <div className="pmo-kv"><span>공고번호</span><span>{currentDetail.rfpNo}</span></div>
            <div className="pmo-kv"><span>공고일</span><span>{currentDetail.rfpDate}</span></div>
          </div>

          <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", marginBottom: 6 }}>최근 활동</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)", marginBottom: 4 }}>{currentDetail.recentActivity.datetime}</div>
            {currentDetail.recentActivity.lines.map((line: string) => <div key={line} style={{ fontSize: 14, color: "var(--tx-3)", lineHeight: 1.55 }}>• {line}</div>)}
          </div>

          <div style={{ borderTop: "1px solid var(--line-2)", marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)", marginBottom: 6 }}>참고 메모</div>
            {currentDetail.memo.map((line: string) => <div key={line} style={{ fontSize: 14, color: "var(--tx-3)", lineHeight: 1.55 }}>{line}</div>)}
          </div>

          <button className="pmo-btn pmo-btn-primary" style={{ width: "100%", height: 40, marginTop: 14, justifyContent: "center", background: "var(--brand)" }}>
            프로젝트 상세 보기
            <Icon name="chevronRight" size={14} stroke={2} />
          </button>
        </aside>
      </section>
    </AppShell>
  );
}
