"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { getP1ScreenWithQuery } from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";

type IconName =
  | "home" | "briefcase" | "users" | "trending" | "settings"
  | "chevronDown" | "chevronUp" | "chevronRight" | "chevronLeft"
  | "search" | "bell" | "menu" | "folder" | "calendar" | "report" | "arrowRight";

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
  folder: "M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v3M16 4v3",
  report: "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  arrowRight: "M5 12h14M13 5l7 7-7 7"
};

function Icon({ name, size = 16, stroke = 1.6, style }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const STATUS_LABEL: Record<string, string> = { proposing: "제안중", presented: "발표완료", win: "WIN", loss: "LOSS", drop: "DROP", running: "수행중", support: "업무지원", done: "완료" };
const STATUS_NEXT: Record<string, string[]> = {
  proposing: ["presented", "drop"], presented: ["win", "loss", "drop"], win: ["running", "support"], loss: [], drop: [], running: ["done"], support: ["done"], done: []
};
const ALL_STATUSES = ["proposing","presented","win","loss","drop","running","support","done"];

function StatusBadge({ code }: { code: string }) {
  return <span className={`pmo-badge pmo-badge--${code}`} style={{ fontSize: 14 }}>{STATUS_LABEL[code] ?? code}</span>;
}
function BusinessTypeChip({ name }: { name: string }) {
  const tones: Record<string, { bg: string; fg: string; line: string }> = {
    "주사업": { bg: "var(--brand-bg)", fg: "var(--brand-700)", line: "var(--brand-line)" },
    "보조사업": { bg: "var(--info-bg)", fg: "#1d4ed8", line: "var(--info-line)" },
    "단독제안": { bg: "var(--ok-bg)", fg: "#047857", line: "var(--ok-line)" },
    "업무지원": { bg: "var(--warn-bg)", fg: "#b45309", line: "var(--warn-line)" }
  };
  const t = tones[name] ?? tones["주사업"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 600 }}>{name}</span>;
}

function Breadcrumb() {
  return <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-4)", fontWeight: 500, marginBottom: 10 }} aria-label="breadcrumb"><Icon name="folder" size={13} stroke={1.8} style={{ color: "var(--tx-5)" }} /><a href="/projects/operations" style={{ color: "var(--tx-4)" }}>프로젝트</a><Icon name="chevronRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} /><span style={{ color: "var(--tx-2)", fontWeight: 600 }}>프로젝트 상세</span></nav>;
}

function StatusTransitionSelect({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const allowed = new Set(STATUS_NEXT[current] ?? []);
  return <div ref={ref} style={{ position: "relative" }}>
    <button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", background: "#fff", border: `1.5px solid ${open ? "var(--brand)" : "var(--line-2)"}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--tx-1)", minWidth: 132 }}>
      <span style={{ flex: 1, textAlign: "left" }}><StatusBadge code={value} /></span><Icon name="chevronDown" size={13} stroke={2} style={{ color: "var(--tx-4)" }} />
    </button>
    {open ? <div style={{ position: "absolute", top: 40, right: 0, zIndex: 30, minWidth: 220, padding: 6, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "var(--sh-pop)", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, color: "var(--tx-5)", fontWeight: 700, padding: "6px 10px 4px" }}>허용된 다음 상태</div>
      {ALL_STATUSES.map((code) => {
        const isCurrent = code === current; const isAllowed = allowed.has(code); const disabled = !isAllowed && !isCurrent;
        return <button key={code} disabled={disabled} onClick={() => { if (!disabled) { setValue(code); setOpen(false); } }} style={{ display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 10px", textAlign: "left", border: 0, borderRadius: 6, background: code === value ? "var(--brand-bg)" : "transparent", color: disabled ? "var(--tx-5)" : "var(--tx-2)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, fontSize: 13, fontWeight: 600 }}><StatusBadge code={code} />{isCurrent ? <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-4)", fontWeight: 600 }}>현재</span> : null}{disabled && !isCurrent ? <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-5)", fontWeight: 500 }}>불가</span> : null}</button>;
      })}
    </div> : null}
  </div>;
}

function AmountChip({ amount }: { amount: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#fff", border: "1.5px solid var(--crit-line)", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "var(--crit)" }}><span style={{ color: "var(--tx-3)", fontWeight: 600, fontSize: 13 }}>사업금액</span>{amount}</span>;
}
function PageHeader({ project }: { project: any }) {
  return <section className="pmo-panel" style={{ padding: "22px 24px", marginBottom: 16 }}>
    <Breadcrumb />
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 29, lineHeight: "35px", fontWeight: 800, color: "var(--tx-1)" }}>{project.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}><StatusBadge code={project.status} /><BusinessTypeChip name={project.businessType} /><AmountChip amount={project.amountTotal} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 600 }}>상태 전환</span><StatusTransitionSelect current={project.status} /></div>
        <span style={{ width: 1, height: 24, background: "var(--line-2)" }} />
        <button className="pmo-btn" style={{ height: 36, padding: "0 14px", fontWeight: 600, color: "var(--brand-700)", borderColor: "var(--brand-line)", background: "var(--brand-bg)" }}><Icon name="settings" size={14} stroke={1.8} />수정</button>
        <a href="/projects/operations" className="pmo-btn" style={{ height: 36, padding: "0 14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="chevronLeft" size={14} stroke={2} />목록으로</a>
      </div>
    </div>
  </section>;
}

function CardTitle({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <header style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--line-2)" }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand-bg)", color: "var(--brand-700)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={15} stroke={1.8} /></span><h2 style={{ margin: 0, fontSize: 18, lineHeight: "22px", fontWeight: 700, color: "var(--tx-1)" }}>{children}</h2></header>;
}
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "112px 1fr", gap: 12, padding: "9px 0", alignItems: "center", minHeight: 32 }}><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span><span style={{ fontSize: 14, color: "var(--tx-1)", fontWeight: 500, lineHeight: 1.5 }}>{children ?? <span style={{ color: "var(--tx-5)" }}>—</span>}</span></div>;
}

function BasicInfoCard({ project }: { project: any }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <CardTitle icon="report">기본 정보</CardTitle>
    <InfoRow label="프로젝트 코드"><span style={{ fontWeight: 700 }}>{project.code}</span></InfoRow>
    <InfoRow label="사업명">{project.name}</InfoRow>
    <InfoRow label="사업유형"><BusinessTypeChip name={project.businessType} /></InfoRow>
    <InfoRow label="상태"><StatusBadge code={project.status} /></InfoRow>
    <InfoRow label="사업금액"><span style={{ fontWeight: 700 }}>{project.amountTotal}</span></InfoRow>
    <InfoRow label="주관부서">{project.ownerDept}</InfoRow>
    <InfoRow label="영업대표">{project.salesOwner}</InfoRow>
    <InfoRow label="제안PM">{project.proposalPm}</InfoRow>
    <InfoRow label="발표PM">{project.presentPm}</InfoRow>
    <InfoRow label="수행PM">{project.deliveryPm}</InfoRow>
    <InfoRow label="사업공고번호">{project.bidNoticeNo}</InfoRow>
    <InfoRow label="메모">{project.memo}</InfoRow>
  </section>;
}

function ScheduleTimelineItem({ item, last }: { item: any; last: boolean }) {
  return <div style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 14, alignItems: "start", paddingBottom: last ? 0 : 16 }}>
    <div style={{ position: "relative", width: 20, alignSelf: "stretch", paddingTop: 4 }}><span style={{ position: "absolute", left: 5, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--brand)", boxShadow: "0 0 0 3px var(--brand-bg)" }} />{!last ? <span style={{ position: "absolute", left: 9.5, top: 16, bottom: -16, width: 1, background: "var(--brand-line)" }} /> : null}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 1 }}><span style={{ fontSize: 14, color: "var(--tx-2)", fontWeight: 600 }}>{item.label}</span>{item.extras ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", fontSize: 12, color: "var(--tx-5)" }}>{item.extras.map((e: any, i: number) => <span key={i}><span style={{ color: "var(--tx-4)", fontWeight: 600 }}>{e.k}</span><span style={{ margin: "0 4px", color: "var(--tx-5)" }}>·</span><span style={{ color: "var(--tx-3)", fontWeight: 500 }}>{e.v}</span></span>)}</div> : null}</div>
    <span style={{ fontSize: 14, color: "var(--tx-1)", fontWeight: 700, paddingTop: 1 }}>{item.date}</span>
  </div>;
}
function ScheduleCard({ schedule }: { schedule: any }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px" }}><CardTitle icon="calendar">일정 정보</CardTitle><div>{schedule.items.map((it: any, i: number) => <ScheduleTimelineItem key={i} item={it} last={i === schedule.items.length - 1} />)}</div></section>;
}
function KpiRow({ icon, label, children, last }: { icon: IconName; label: string; children: ReactNode; last?: boolean }) {
  return <div style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? 0 : "1px solid var(--line-1)" }}><span style={{ color: "var(--brand-700)", display: "inline-flex" }}><Icon name={icon} size={16} stroke={1.7} /></span><span style={{ fontSize: 14, color: "var(--tx-3)", fontWeight: 600 }}>{label}</span><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tx-1)", textAlign: "right" }}>{children}</span></div>;
}
function KpiCard({ kpi }: { kpi: any }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <CardTitle icon="trending">핵심 지표</CardTitle>
    <KpiRow icon="trending" label="D-day"><span style={{ color: "var(--crit)" }}>{kpi.dDay}</span></KpiRow>
    <KpiRow icon="report" label="누적 MM(산정)">
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.25 }}>
        <span>{kpi.accumMm}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-5)" }}>(투입 4명 × 누적 기간)</span>
      </span>
    </KpiRow>
    <KpiRow icon="users" label="투입 인원">{kpi.headcount}</KpiRow>
    <KpiRow icon="report" label="보고서 상태"><span style={{ display: "inline-flex", padding: "2px 10px", background: "var(--ok-bg)", color: "#15803d", border: "1px solid var(--ok-line)", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>{kpi.reportStatus}</span></KpiRow>
    <KpiRow icon="report" label="최근 보고서" last><span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-2)" }}>{kpi.lastReport}</span></KpiRow>
  </section>;
}

function RoleChip({ role, tone }: { role: string; tone: string }) {
  const tones: Record<string, { bg: string; fg: string; line: string }> = {
    indigo: { bg: "#eef1ff", fg: "#4338CA", line: "#c7d0fb" }, purple: { bg: "#ede5fd", fg: "#7c3aed", line: "#d8c8fa" }, amber: { bg: "#fef4e1", fg: "#b45309", line: "#f5d99c" },
    blue: { bg: "#e3eefe", fg: "#1d4ed8", line: "#c2d8fb" }, cyan: { bg: "#dff5fa", fg: "#0e7490", line: "#bee5ee" }, rose: { bg: "#fde7eb", fg: "#be123c", line: "#f4b8c4" }
  };
  const t = tones[tone] ?? tones.blue;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 700 }}>{role}</span>;
}
function SmallChip({ label, tone }: { label: string; tone: "ok" | "info" | "crit" | "neutral" }) {
  const tones = { ok: { bg: "var(--ok-bg)", fg: "#15803d", line: "var(--ok-line)" }, info: { bg: "var(--info-bg)", fg: "#1d4ed8", line: "var(--info-line)" }, crit: { bg: "var(--crit-bg)", fg: "var(--crit)", line: "var(--crit-line)" }, neutral: { bg: "var(--bg-3)", fg: "var(--tx-3)", line: "var(--line-2)" } };
  const t = tones[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 700 }}>{label}</span>;
}
function LogStateChip({ label }: { label: string }) {
  const t = label === "진행" ? { bg: "var(--info-bg)", fg: "#1d4ed8", line: "var(--info-line)" } : { bg: "var(--ok-bg)", fg: "#15803d", line: "var(--ok-line)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", background: t.bg, color: t.fg, border: `1px solid ${t.line}`, borderRadius: 6, fontSize: 14, fontWeight: 700 }}>{label}</span>;
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  const map: Record<string, [string, string, string]> = {
    "김책": ["#c7d0fb", "#a5b4fc", "#3730a3"], "이수": ["#dcc7fb", "#b89af0", "#4c1d95"], "박P": ["#fcd9b8", "#f5b681", "#7a3d0f"], "정책": ["#bfe3d4", "#86d0b1", "#0f5132"]
  };
  const g = map[initials] ?? ["#e2e8f0", "#cbd5e1", "#1f2937"];
  return <span style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: g[2], fontWeight: 700, fontSize: size <= 28 ? 10.5 : 11.5, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{initials}</span>;
}

function AssignmentsPanel({ rows }: { rows: any[] }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px", marginBottom: 16 }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0 }}>투입 인력 / 참여 정보</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>총 {rows.length}명</span><button className="pmo-btn" style={{ marginLeft: "auto", height: 32, padding: "0 14px", fontSize: 14 }}>인력 배치 이력 보기<Icon name="arrowRight" size={12} stroke={2} /></button></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}><table className="pmo-table pmo-table--recent"><thead><tr><th>이름</th><th>역할</th><th>소속팀</th><th>배정유형</th><th>투입상태</th><th>상주여부</th><th>시작일</th><th>종료일</th><th>비고</th></tr></thead><tbody>{rows.map((p, i) => <tr key={i}><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar initials={p.initials} size={28} /><span style={{ color: "var(--tx-1)", fontWeight: 700, fontSize: 14 }}>{p.name}</span></div></td><td><RoleChip role={p.role} tone={p.roleTone} /></td><td style={{ color: "var(--tx-2)", fontWeight: 500 }}>{p.team}</td><td><SmallChip label={p.deployType} tone={p.deployType === "수행" ? "ok" : "info"} /></td><td><SmallChip label={p.status} tone={p.status === "투입" ? "ok" : "crit"} /></td><td style={{ color: "var(--tx-2)", fontWeight: 500 }}>{p.onsite}</td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{p.from}</td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{p.to}</td><td style={{ color: "var(--tx-3)", fontWeight: 500 }}>{p.note}</td></tr>)}</tbody></table></div>
  </section>;
}

function RecentLogsPanel({ logs, projectId }: { logs: any[]; projectId?: string }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0 }}>최근 진행사항</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>최근 {logs.length}건</span><a href={projectId ? `/projects/logs?project_id=${projectId}` : "/projects/logs"} className="pmo-btn" style={{ marginLeft: "auto", height: 32, padding: "0 14px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>전체 이력 보기<Icon name="arrowRight" size={12} stroke={2} /></a></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}>
      <table className="pmo-table pmo-table--recent">
        <thead><tr><th>일시</th><th>내용</th><th>작성자</th><th style={{ textAlign: "center" }}>상태</th></tr></thead>
        <tbody>{logs.map((r) => <tr key={r.id}><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{r.datetime}</td><td style={{ color: "var(--tx-1)", whiteSpace: "normal" }}><span style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.5, maxWidth: 720, fontWeight: 500 }}>{r.summary}</span></td><td><span style={{ color: "var(--tx-1)", fontWeight: 700, fontSize: 14 }}>{r.author}</span><span style={{ marginLeft: 6, fontSize: 13, color: "var(--tx-4)", fontWeight: 600 }}>{r.authorRole}</span></td><td style={{ textAlign: "center" }}><LogStateChip label={r.stateLabel} /></td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    const decodedProjectId = decodeURIComponent(projectId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedProjectId);
    const query: Record<string, string> = isUuid ? { project_id: decodedProjectId } : { code: decodedProjectId };
    getP1ScreenWithQuery("project-detail", query).then((result) => {
      if (alive) setData(result.data);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);
  if (!data) return null;
  return <PmoShell user={data.meta.user} notifications={data.meta.notifications} currentId="project-operations" pageTitle="프로젝트 상세">
    <PageHeader project={data.project} />
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16, marginBottom: 16, alignItems: "stretch" }}>
      <BasicInfoCard project={data.project} />
      <ScheduleCard schedule={data.schedule} />
      <KpiCard kpi={data.kpi} />
    </section>
    <AssignmentsPanel rows={data.assignments} />
    <RecentLogsPanel logs={data.logs} projectId={data.project?.id} />
  </PmoShell>;
}
