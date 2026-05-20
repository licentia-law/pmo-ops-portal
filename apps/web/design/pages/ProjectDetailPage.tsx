"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { getP1ScreenWithQuery, updateProject, updateProjectLog } from "../../app/lib/api";
import { PmoShell } from "../components/PmoShell";
import ProjectMasterEditModal from "../components/ProjectMasterEditModal";

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
const ALL_STATUSES = ["proposing", "presented", "win", "loss", "drop", "running", "support", "done"];

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

function StatusTransitionSelect({ current, value, onChange }: { current: string; value: string; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const allowed = new Set(STATUS_NEXT[current] ?? []);
  const visibleStatuses = ALL_STATUSES.filter((code) => code === current || allowed.has(code));
  return <div ref={ref} style={{ position: "relative" }}>
    <button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", background: "#fff", border: `1.5px solid ${open ? "var(--brand)" : "var(--line-2)"}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--tx-1)", minWidth: 132 }}>
      <span style={{ flex: 1, textAlign: "left" }}><StatusBadge code={value} /></span><Icon name="chevronDown" size={13} stroke={2} style={{ color: "var(--tx-4)" }} />
    </button>
    {open ? <div style={{ position: "absolute", top: 40, right: 0, zIndex: 30, minWidth: 220, padding: 6, background: "#fff", border: "1px solid var(--line-2)", borderRadius: 10, boxShadow: "var(--sh-pop)", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, color: "var(--tx-5)", fontWeight: 700, padding: "6px 10px 4px" }}>허용된 다음 상태</div>
      {visibleStatuses.map((code) => {
        const isCurrent = code === current;
        return <button key={code} onClick={() => { onChange(code); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, height: 34, padding: "0 10px", textAlign: "left", border: 0, borderRadius: 6, background: code === value ? "var(--brand-bg)" : "transparent", color: "var(--tx-2)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}><StatusBadge code={code} />{isCurrent ? <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-4)", fontWeight: 600 }}>현재</span> : null}</button>;
      })}
    </div> : null}
  </div>;
}

function AmountChip({ amount }: { amount: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#fff", border: "1.5px solid var(--crit-line)", borderRadius: 8, fontSize: 14, fontWeight: 700, color: "var(--crit)" }}><span style={{ color: "var(--tx-3)", fontWeight: 600, fontSize: 13 }}>사업금액</span>{amount}</span>;
}
function PageHeader({
  project,
  onClickEdit,
  pendingStatus,
  onPendingStatusChange,
  onApplyStatus,
  applyingStatus,
  statusError
}: {
  project: any;
  onClickEdit: () => void;
  pendingStatus: string;
  onPendingStatusChange: (status: string) => void;
  onApplyStatus: () => void;
  applyingStatus: boolean;
  statusError: string | null;
}) {
  return <section className="pmo-panel" style={{ padding: "22px 24px", marginBottom: 16 }}>
    <Breadcrumb />
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 29, lineHeight: "35px", fontWeight: 800, color: "var(--tx-1)" }}>{project.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}><StatusBadge code={project.status} /><BusinessTypeChip name={project.businessType} /><AmountChip amount={project.amountTotal} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 600 }}>상태 전환</span>
            <StatusTransitionSelect current={project.status} value={pendingStatus} onChange={onPendingStatusChange} />
            <button
              className="pmo-btn pmo-btn-primary"
              style={{ background: "var(--brand)", color: "#fff", borderColor: "var(--brand)", height: 36, padding: "0 14px", fontWeight: 700 }}
              onClick={onApplyStatus}
              disabled={applyingStatus || pendingStatus === project.status}
            >
              {applyingStatus ? "적용 중..." : "적용"}
            </button>
          </div>
          {statusError ? <span style={{ fontSize: 12, color: "var(--crit)", fontWeight: 600 }}>{statusError}</span> : null}
        </div>
        <span style={{ width: 1, height: 24, background: "var(--line-2)" }} />
        <button className="pmo-btn" onClick={onClickEdit} style={{ height: 36, padding: "0 14px", fontWeight: 600, color: "var(--brand-700)", borderColor: "var(--brand-line)", background: "var(--brand-bg)" }}><Icon name="settings" size={14} stroke={1.8} />편집</button>
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

function DisplayValue({ value }: { value: unknown }) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return <span style={{ color: "var(--tx-5)" }}>-</span>;
  return <>{text}</>;
}

function GroupSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="pmo-panel" style={{ padding: 12, marginBottom: 10, border: "1.5px solid #cfd8e7", background: "#f8fbff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)" }}>
    <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, color: "var(--tx-2)", padding: "5px 10px", borderRadius: 8, border: "1px solid #d8e2f0", background: "linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%)" }}>{title}</h4>
    {children}
  </section>;
}

function CompactField({ label, value }: { label: string; value: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 2, minHeight: 38 }}>
    <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13.5, color: "var(--tx-1)", fontWeight: 600, lineHeight: 1.3 }}>{value}</span>
  </div>;
}

function hasValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return !!text && text !== "-";
}

function pickDisplay(...values: unknown[]): string {
  for (const value of values) {
    if (hasValue(value)) return String(value);
  }
  return "-";
}

function splitAmountText(amountText: unknown): { total: string; company: string } {
  const raw = String(amountText ?? "").trim();
  if (!raw || raw === "-") return { total: "-", company: "-" };
  const parts = raw.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { total: parts[0], company: parts[1] };
  return { total: parts[0] ?? "-", company: parts[0] ?? "-" };
}

function BasicInfoCard({ project, projectMaster, assignments }: { project: any; projectMaster: any; assignments: any[] }) {
  const m = projectMaster ?? {};
  const excludedNames = new Set([project?.proposalPm, project?.presentPm, project?.deliveryPm].map((name) => String(name ?? "").trim()).filter(Boolean));
  const filteredMasterTeam = String(m.proposalDeliveryTeam ?? "")
    .split("/")
    .map((name) => name.trim())
    .filter((name) => !!name && name !== "-" && !excludedNames.has(name))
    .join(" / ");
  return <section className="pmo-panel" style={{ padding: "16px 18px" }}>
    <CardTitle icon="report">기본 정보</CardTitle>
    <GroupSection title="사업 정보">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px 12px" }}>
        <CompactField label="프로젝트 코드" value={<span style={{ fontWeight: 700 }}><DisplayValue value={m.code ?? project.code} /></span>} />
        <CompactField label="공고번호" value={<DisplayValue value={pickDisplay(m.bidNoticeNo, project.bidNoticeNo)} />} />
        <CompactField label="공고일" value={<DisplayValue value={pickDisplay(m.bidNoticeDate, project.bidNoticeDate)} />} />
        <CompactField label="고객사" value={<DisplayValue value={pickDisplay(m.clientName, project.clientName)} />} />
        <CompactField label="확도" value={<DisplayValue value={m.certainty} />} />
        <div style={{ gridColumn: "3 / 4" }} />
      </div>
    </GroupSection>
    <GroupSection title="인력 정보">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px 12px" }}>
        <CompactField label="영업부서" value={<DisplayValue value={pickDisplay(m.salesDept, project.salesDept)} />} />
        <CompactField label="영업대표" value={<DisplayValue value={m.salesOwner ?? project.salesOwner} />} />
        <div />
        <CompactField label="제안PM" value={<DisplayValue value={m.proposalPm ?? project.proposalPm} />} />
        <CompactField label="발표PM" value={<DisplayValue value={m.presentPm ?? project.presentPm} />} />
        <CompactField label="수행PM" value={<DisplayValue value={m.deliveryPm ?? project.deliveryPm} />} />
        <div style={{ gridColumn: "1 / -1" }}>
          <CompactField label="제안/수행팀" value={<DisplayValue value={filteredMasterTeam} />} />
        </div>
      </div>
    </GroupSection>
    <GroupSection title="사업 일정">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px 12px" }}>
        <CompactField label="시작일" value={<DisplayValue value={pickDisplay(m.fromDate, project.startDate)} />} />
        <CompactField label="종료일" value={<DisplayValue value={pickDisplay(m.toDate, project.endDate)} />} />
        <CompactField
          label="제안 제출"
          value={
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
              <DisplayValue value={m.proposalSubmissionAt} />
              <span style={{ color: "var(--tx-5)" }}>/</span>
              <DisplayValue value={m.submissionFormat} />
              <span style={{ color: "var(--tx-5)" }}>/</span>
              <DisplayValue value={m.submissionNote} />
            </span>
          }
        />
        <CompactField
          label="제안 발표"
          value={
            <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
              <DisplayValue value={m.proposalPresentationAt} />
              <span style={{ color: "var(--tx-5)" }}>/</span>
              <DisplayValue value={m.presentationFormat} />
              <span style={{ color: "var(--tx-5)" }}>/</span>
              <DisplayValue value={m.presentationNote} />
            </span>
          }
        />
      </div>
    </GroupSection>
    <GroupSection title="기타">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px 12px" }}>
        <div style={{ gridColumn: "1 / 3" }}>
          <CompactField label="메모" value={<DisplayValue value={m.memo ?? project.memo} />} />
        </div>
        <CompactField label="최근활동일" value={<DisplayValue value={pickDisplay(m.recentActivityAt, project.recentActivityAt)} />} />
      </div>
    </GroupSection>
  </section>;
}

function ScheduleTimelineItem({ item, last }: { item: any; last: boolean }) {
  return <div style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 14, alignItems: "start", paddingBottom: last ? 0 : 16 }}>
    <div style={{ position: "relative", width: 20, alignSelf: "stretch", paddingTop: 4 }}><span style={{ position: "absolute", left: 5, top: 4, width: 10, height: 10, borderRadius: "50%", background: "var(--brand)", boxShadow: "0 0 0 3px var(--brand-bg)" }} />{!last ? <span style={{ position: "absolute", left: 9.5, top: 16, bottom: -16, width: 1, background: "var(--brand-line)" }} /> : null}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 1 }}><span style={{ fontSize: 14, color: "var(--tx-2)", fontWeight: 600 }}>{item.label}</span>{item.extras ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 0", fontSize: 12, color: "var(--tx-5)" }}>{item.extras.map((e: any, i: number) => <span key={i}>{i > 0 ? <span style={{ margin: "0 6px", color: "var(--tx-5)" }}>|</span> : null}{e.k ? <><span style={{ color: "var(--tx-4)", fontWeight: 600 }}>{e.k}</span><span style={{ margin: "0 4px", color: "var(--tx-5)" }}>·</span></> : null}<span style={{ color: "var(--tx-3)", fontWeight: 500 }}>{e.v}</span></span>)}</div> : null}</div>
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
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-5)" }}>{kpi.accumMmNote ?? "(투입 인원 × 누적 기간)"}</span>
      </span>
    </KpiRow>
    <KpiRow icon="users" label="총 투입 인원">{kpi.headcountTotal ?? kpi.headcount}</KpiRow>
    <KpiRow icon="users" label="현재 투입 인원" last>{kpi.headcountCurrent ?? kpi.headcount}</KpiRow>
  </section>;
}

function RoleChip({ role, tone }: { role: string; tone: string }) {
  const tones: Record<string, { bg: string; fg: string; line: string }> = {
    indigo: { bg: "#eef1ff", fg: "#4338CA", line: "#c7d0fb" }, purple: { bg: "#ede5fd", fg: "#7c3aed", line: "#d8c8fa" }, amber: { bg: "#fef4e1", fg: "#b45309", line: "#f5d99c" },
    blue: { bg: "#e3eefe", fg: "#1d4ed8", line: "#c2d8fb" }, cyan: { bg: "#dff5fa", fg: "#0e7490", line: "#bee5ee" }, rose: { bg: "#fde7eb", fg: "#be123c", line: "#f4b8c4" }
  };
  const roleToneMap: Record<string, string> = {
    "제안PM": "purple",
    "발표PM": "blue",
    "수행PM": "indigo",
    "제안팀": "cyan",
    "수행팀": "amber",
  };
  const resolvedTone = roleToneMap[role] ?? tone;
  const t = tones[resolvedTone] ?? tones.blue;
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
function statusOptionsForEdit(current: "memo" | "in_progress" | "done") {
  if (current === "memo") return [{ value: "memo", label: "메모" }];
  if (current === "in_progress") return [{ value: "in_progress", label: "진행" }, { value: "done", label: "완료" }];
  return [{ value: "done", label: "완료" }];
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  const map: Record<string, [string, string, string]> = {
    "김책": ["#c7d0fb", "#a5b4fc", "#3730a3"], "이수": ["#dcc7fb", "#b89af0", "#4c1d95"], "박P": ["#fcd9b8", "#f5b681", "#7a3d0f"], "정책": ["#bfe3d4", "#86d0b1", "#0f5132"]
  };
  const g = map[initials] ?? ["#e2e8f0", "#cbd5e1", "#1f2937"];
  return <span style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, color: g[2], fontWeight: 700, fontSize: size <= 28 ? 10.5 : 11.5, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{initials}</span>;
}

function AssignmentsPanel({ rows }: { rows: any[] }) {
  const onsiteTone = (value: string): "ok" | "info" | "crit" | "neutral" => {
    if (value === "상주") return "ok";
    if (value === "비상주") return "info";
    if (value === "혼합") return "neutral";
    return "neutral";
  };
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px", marginBottom: 16 }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0 }}>투입 인력 / 참여 정보</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>총 {rows.length}명</span><button className="pmo-btn" style={{ marginLeft: "auto", height: 32, padding: "0 14px", fontSize: 14 }}>인력 배치 이력 보기<Icon name="arrowRight" size={12} stroke={2} /></button></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}><table className="pmo-table pmo-table--recent" style={{ tableLayout: "fixed", width: "100%" }}><colgroup><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /><col style={{ width: "14.2857%" }} /></colgroup><thead><tr><th>이름</th><th>소속팀</th><th>배정유형</th><th>프로젝트 역할</th><th>상주여부</th><th>투입 시작일</th><th>투입 종료일</th></tr></thead><tbody>{rows.map((p, i) => <tr key={i}><td><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Avatar initials={p.initials} size={28} /><span style={{ color: "var(--tx-1)", fontWeight: 700, fontSize: 14 }}>{p.name}</span></div></td><td style={{ color: "var(--tx-2)", fontWeight: 500 }}>{p.team}</td><td><SmallChip label={p.deployType} tone={p.deployType === "수행" ? "ok" : "info"} /></td><td><RoleChip role={p.role} tone={p.roleTone} /></td><td><SmallChip label={p.onsite} tone={onsiteTone(String(p.onsite ?? "-"))} /></td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{p.from}</td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600 }}>{p.to}</td></tr>)}</tbody></table></div>
  </section>;
}

function RecentLogsPanel({ logs, onEdit }: { logs: any[]; onEdit: (row: any) => void }) {
  return <section className="pmo-panel" style={{ padding: "20px 22px 14px" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}><h2 className="pmo-section-title" style={{ margin: 0 }}>진행이력</h2><span style={{ fontSize: 14, color: "var(--tx-4)", fontWeight: 600 }}>총 {logs.length}건</span></header>
    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}>
      <table className="pmo-table pmo-table--recent">
        <thead><tr><th style={{ width: 56, textAlign: "center" }}></th><th>일시</th><th>내용</th><th>작성자/변경자</th><th style={{ textAlign: "center" }}>상태</th></tr></thead>
        <tbody>{logs.map((r) => <tr key={r.id}><td style={{ textAlign: "center" }}><button className="pmo-btn" style={{ width: 24, minWidth: 24, height: 24, padding: 0, justifyContent: "center", fontSize: 12 }} onClick={() => onEdit(r)} title="편집" aria-label="진행 이력 편집">✏</button></td><td className="num" style={{ color: "var(--tx-2)", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>{String(r.datetime ?? "").replace(" ", "\u00A0\u00A0\u00A0")}</td><td style={{ color: "var(--tx-2)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, fontWeight: 600, fontSize: 14 }}>{r.summary}</td><td style={{ color: "var(--tx-2)", fontWeight: 600, fontSize: 14, whiteSpace: "normal", wordBreak: "keep-all", lineHeight: 1.6 }}><span>{r.author}</span>{r.authorRole ? <span style={{ marginLeft: 6 }}>{r.authorRole}</span> : null}</td><td style={{ textAlign: "center" }}><LogStateChip label={r.stateLabel} /></td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const [data, setData] = useState<any | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ content: string; logStatus: "memo" | "in_progress" | "done" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [codeRows, setCodeRows] = useState<any[]>([]);
  const decodedProjectId = useMemo(() => (projectId ? decodeURIComponent(projectId) : ""), [projectId]);
  const query = useMemo<Record<string, string> | null>(() => {
    if (!decodedProjectId) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedProjectId);
    const next: Record<string, string> = isUuid ? { project_id: decodedProjectId } : { code: decodedProjectId };
    return next;
  }, [decodedProjectId]);
  useEffect(() => {
    if (!decodedProjectId || !query) return;
    let alive = true;
    getP1ScreenWithQuery<any>("project-detail", query).then((result) => {
      if (alive) {
        setData(result.data);
        setPendingStatus(result.data?.project?.status ?? "");
        setStatusError(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [decodedProjectId, query]);
  useEffect(() => {
    getP1ScreenWithQuery<any>("code").then((result) => setCodeRows((result.data as any)?.rows ?? []));
  }, []);
  const openEdit = (row: any) => {
    setEditingRow(row);
    setEditForm({ content: row.content ?? row.summary ?? "", logStatus: (row.logStatus ?? "memo") as "memo" | "in_progress" | "done" });
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
    const content = editForm.content.trim();
    if (!content) {
      setSaveError("내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateProjectLog(editingRow.id, { content, log_status: editForm.logStatus });
      if (!query) return;
      const refreshed = await getP1ScreenWithQuery<any>("project-detail", query);
      setData(refreshed.data);
      closeEdit();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };
  const applyProjectStatus = async () => {
    if (!data?.project?.id || !pendingStatus || pendingStatus === data.project.status) return;
    setApplyingStatus(true);
    setStatusError(null);
    try {
      await updateProject(data.project.id, { status: pendingStatus as any });
      if (!query) return;
      const refreshed = await getP1ScreenWithQuery<any>("project-detail", query);
      setData(refreshed.data);
      setPendingStatus(refreshed.data?.project?.status ?? pendingStatus);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    } finally {
      setApplyingStatus(false);
    }
  };
  const openProjectEdit = () => setProjectEditOpen(true);
  if (!data) return null;
  return <PmoShell user={data.meta.user} notifications={data.meta.notifications} currentId="project-operations" pageTitle="프로젝트 상세">
    <PageHeader
      project={data.project}
      onClickEdit={openProjectEdit}
      pendingStatus={pendingStatus}
      onPendingStatusChange={(status) => {
        setPendingStatus(status);
        setStatusError(null);
      }}
      onApplyStatus={() => void applyProjectStatus()}
      applyingStatus={applyingStatus}
      statusError={statusError}
    />
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(340px, .9fr)", gap: 16, marginBottom: 16, alignItems: "start" }}>
      <BasicInfoCard project={data.project} projectMaster={data.projectMaster} assignments={data.assignments ?? []} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <ScheduleCard schedule={data.schedule} />
        <KpiCard kpi={data.kpi} />
      </div>
    </section>
    <AssignmentsPanel rows={data.assignments} />
    <RecentLogsPanel logs={data.logs} onEdit={openEdit} />
    {editForm ? <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.4)", zIndex: 40, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <aside className="pmo-panel" style={{ width: "min(840px, 92vw)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line-2)", background: "#fff" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>진행 이력 편집</h3>
          <button onClick={closeEdit} style={{ border: 0, background: "transparent", fontSize: 24, color: "var(--tx-4)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 15, color: "var(--tx-3)", fontWeight: 700 }}>{data.project?.code} · {data.project?.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10, alignItems: "end" }}>
            <label className="pmo-field" style={{ minWidth: 0 }}>
              <span>상태</span>
              <select value={editForm.logStatus} onChange={(event) => setEditForm({ ...editForm, logStatus: event.target.value as "memo" | "in_progress" | "done" })}>
                {statusOptionsForEdit((editingRow.logStatus ?? "memo") as "memo" | "in_progress" | "done").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="pmo-field" style={{ minWidth: 0 }}>
              <span>내용</span>
              <input value={editForm.content} onChange={(event) => setEditForm({ ...editForm, content: event.target.value })} style={{ height: 36, minWidth: 0, width: "100%", fontSize: 13.5, fontWeight: 500, color: "var(--tx-1)", fontFamily: "inherit" }} />
            </label>
          </div>
          <span style={{ marginTop: 2, fontSize: 12, color: "var(--tx-5)" }}>
            진행 상태는 해당 작업 완료 시 완료로 변경해주세요.
          </span>
          {saveError ? <div style={{ color: "var(--crit)", fontSize: 13, fontWeight: 600 }}>{saveError}</div> : null}
        </div>
        <footer style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 16px", borderTop: "1px solid var(--line-2)", background: "#fff" }}>
          <button onClick={closeEdit} className="pmo-btn" disabled={saving}>취소</button>
          <button onClick={() => void saveEdit()} className="pmo-btn pmo-btn-primary" style={{ background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }} disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </footer>
      </aside>
    </div> : null}
    <ProjectMasterEditModal
      mode="edit"
      open={projectEditOpen}
      row={projectEditOpen ? (codeRows.find((r: any) => String(r.code ?? "") === String(data.project.code ?? "")) ?? null) : null}
      rows={codeRows}
      onClose={() => setProjectEditOpen(false)}
      onSaved={async () => {
        if (!query) return;
        const refreshed = await getP1ScreenWithQuery<any>("project-detail", query);
        setData(refreshed.data);
        setPendingStatus(refreshed.data?.project?.status ?? pendingStatus);
        const refreshedCode = await getP1ScreenWithQuery<any>("code");
        setCodeRows((refreshedCode.data as any)?.rows ?? []);
      }}
    />
  </PmoShell>;
}
