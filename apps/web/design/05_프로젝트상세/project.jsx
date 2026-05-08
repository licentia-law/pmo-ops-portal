/* PMO · project.jsx — 프로젝트 상세
   - 사이드바: current="execution" (목록의 sub-view라 별도 NAV 항목 X)
   - 페이지 헤더: 브레드크럼 / hero / 사업유형·상태 chip / 상태 전환 / 수정 / 목록으로
   - Info 3 cards: 기본 정보 / 일정 정보(타임라인) / 핵심 지표
   - 투입 인력 / 참여 정보 (테이블)
   - 최근 진행사항 (테이블)
*/

/* PRD §4.3 transition: 수행중 → 완료만 활성 */
const STATUS_NEXT = {
  proposing: ["presented", "drop"],
  presented: ["win", "loss", "drop"],
  win:       ["running", "support"],
  loss:      [],
  drop:      [],
  running:   ["done"],
  support:   ["done"],
  done:      [],
};
const ALL_STATUSES = ["proposing","presented","win","loss","drop","running","support","done"];

/* 사업유형 chip */
const BTYPE_TONE = {
  "주사업":   { bg: "var(--brand-bg)",  fg: "var(--brand-700)", line: "var(--brand-line)" },
  "보조사업": { bg: "var(--info-bg)",   fg: "#1d4ed8",          line: "var(--info-line)" },
  "단독제안": { bg: "var(--ok-bg)",     fg: "#047857",          line: "var(--ok-line)" },
  "업무지원": { bg: "var(--warn-bg)",   fg: "#b45309",          line: "var(--warn-line)" },
};
const BusinessTypeChip = ({ name }) => {
  const t = BTYPE_TONE[name] || BTYPE_TONE["주사업"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: "var(--r-sm)",
      fontSize: 12, fontWeight: 600, lineHeight: 1.5,
      whiteSpace: "nowrap",
    }}>{name}</span>
  );
};

/* 역할 chip — 시안 표 */
const ROLE_TONE = {
  indigo: { bg: "#eef1ff", fg: "#4338CA",   line: "#c7d0fb" },
  purple: { bg: "#ede5fd", fg: "#7c3aed",   line: "#d8c8fa" },
  amber:  { bg: "#fef4e1", fg: "#b45309",   line: "#f5d99c" },
  blue:   { bg: "#e3eefe", fg: "#1d4ed8",   line: "#c2d8fb" },
  cyan:   { bg: "#dff5fa", fg: "#0e7490",   line: "#bee5ee" },
  rose:   { bg: "#fde7eb", fg: "#be123c",   line: "#f4b8c4" },
};
const RoleChip = ({ role, tone }) => {
  const t = ROLE_TONE[tone] || ROLE_TONE.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: 6, fontSize: 11.5, fontWeight: 700, lineHeight: 1.6,
      whiteSpace: "nowrap",
    }}>{role}</span>
  );
};

/* 배정유형 / 투입상태 small chip */
const SmallChip = ({ label, tone }) => {
  const TONE = {
    ok:      { bg: "var(--ok-bg)",   fg: "#15803d",   line: "var(--ok-line)" },
    info:    { bg: "var(--info-bg)", fg: "#1d4ed8",   line: "var(--info-line)" },
    crit:    { bg: "var(--crit-bg)", fg: "var(--crit)", line: "var(--crit-line)" },
    neutral: { bg: "var(--bg-3)",    fg: "var(--tx-3)", line: "var(--line-2)" },
  };
  const t = TONE[tone] || TONE.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: 6, fontSize: 11.5, fontWeight: 700, lineHeight: 1.6,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
};

/* 진행/완료 상태 chip (최근 진행사항) */
const LogStateChip = ({ label }) => {
  const tone = label === "진행" ? "info" : "ok";
  const TONE = {
    info: { bg: "var(--info-bg)", fg: "#1d4ed8", line: "var(--info-line)" },
    ok:   { bg: "var(--ok-bg)",   fg: "#15803d", line: "var(--ok-line)" },
  };
  const t = TONE[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: 6, fontSize: 11.5, fontWeight: 700, lineHeight: 1.6,
    }}>{label}</span>
  );
};

/* Avatar pool */
const AVATAR_GRADIENTS = {
  "이정": ["#cfe1f7", "#92b8ec", "#1e3a8a"],
  "김민": ["#dcc7fb", "#b89af0", "#4c1d95"],
  "박소": ["#fcd9b8", "#f5b681", "#7a3d0f"],
  "최병": ["#bfe3d4", "#86d0b1", "#0f5132"],
  "장우": ["#c7d0fb", "#a5b4fc", "#3730a3"],
  "한지": ["#f7c1c8", "#f08a99", "#831843"],
  "김책": ["#c7d0fb", "#a5b4fc", "#3730a3"],
  "이수": ["#dcc7fb", "#b89af0", "#4c1d95"],
  "박P":  ["#fcd9b8", "#f5b681", "#7a3d0f"],
  "정책": ["#bfe3d4", "#86d0b1", "#0f5132"],
};
const Avatar = ({ initials, size = 32 }) => {
  const g = AVATAR_GRADIENTS[initials] || ["#e2e8f0", "#cbd5e1", "#1f2937"];
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
      color: g[2], fontWeight: 700,
      fontSize: size <= 28 ? 10.5 : 11.5,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flex: "0 0 auto", letterSpacing: -0.3,
    }}>{initials}</span>
  );
};

/* ============================================================
   Page Header
   ============================================================ */
const Breadcrumb = () => (
  <nav style={{
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 12.5, color: "var(--tx-4)", fontWeight: 500,
    marginBottom: 10,
  }} aria-label="breadcrumb">
    <Icon name="folder" size={13} stroke={1.8} style={{ color: "var(--tx-5)" }} />
    <a href="#" style={{ color: "var(--tx-4)" }}>프로젝트</a>
    <Icon name="chevronRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} />
    <span style={{ color: "var(--tx-2)", fontWeight: 600 }}>프로젝트 상세</span>
  </nav>
);

const StatusTransitionSelect = ({ current }) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(current);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const allowed = new Set(STATUS_NEXT[current] || []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          height: 36, padding: "0 12px",
          background: "var(--bg-1)",
          border: `1.5px solid ${open ? "var(--brand)" : "var(--line-2)"}`,
          borderRadius: "var(--r-md)",
          fontSize: 13, fontWeight: 600, color: "var(--tx-1)",
          minWidth: 132,
          boxShadow: open ? "var(--sh-focus)" : "none",
        }}>
        <span style={{ flex: 1, textAlign: "left" }}>
          <StatusBadge code={value} />
        </span>
        <Icon name="chevronDown" size={13} stroke={2} style={{ color: "var(--tx-4)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 40, right: 0, zIndex: 30,
          minWidth: 220, padding: 6,
          background: "var(--bg-1)", border: "1px solid var(--line-2)",
          borderRadius: 10, boxShadow: "var(--sh-pop)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{ fontSize: 11, color: "var(--tx-5)", fontWeight: 700, padding: "6px 10px 4px", letterSpacing: 0.2 }}>
            허용된 다음 상태
          </div>
          {ALL_STATUSES.map((code) => {
            const isCurrent = code === current;
            const isAllowed = allowed.has(code);
            const disabled  = !isAllowed && !isCurrent;
            return (
              <button key={code}
                disabled={disabled}
                onClick={() => { if (!disabled) { setValue(code); setOpen(false); } }}
                title={disabled ? "허용된 다음 상태만 선택 가능" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  height: 34, padding: "0 10px",
                  textAlign: "left", border: 0, borderRadius: 6,
                  background: code === value ? "var(--brand-bg)" : "transparent",
                  color: disabled ? "var(--tx-5)" : "var(--tx-2)",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.55 : 1,
                  fontSize: 13, fontWeight: 600,
                }}>
                <StatusBadge code={code} />
                {isCurrent && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-4)", fontWeight: 600 }}>
                    현재
                  </span>
                )}
                {disabled && !isCurrent && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-5)", fontWeight: 500 }}>
                    불가
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AmountChip = ({ amount }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 12px",
    background: "var(--bg-1)",
    border: "1.5px solid var(--crit-line)",
    borderRadius: 8,
    fontSize: 13, fontWeight: 700, color: "var(--crit)",
    fontVariantNumeric: "tabular-nums",
  }}>
    <span style={{ color: "var(--tx-3)", fontWeight: 600, fontSize: 12 }}>사업금액</span>
    {amount}
  </span>
);

const PageHeader = ({ project }) => (
  <section className="pmo-panel" style={{ padding: "22px 24px", marginBottom: 16 }}>
    <Breadcrumb />
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          margin: 0,
          fontSize: 26, lineHeight: "34px", fontWeight: 800,
          color: "var(--tx-1)", letterSpacing: -0.6,
        }}>{project.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <StatusBadge code={project.status} />
          <BusinessTypeChip name={project.businessType} />
          <AmountChip amount={project.amountTotal} />
        </div>
      </div>

      {/* right action area */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>상태 전환</span>
          <StatusTransitionSelect current={project.status} />
        </div>
        <span style={{ width: 1, height: 24, background: "var(--line-2)" }} />
        <button className="pmo-btn"
          title="PM/제안팀만 수정 가능"
          style={{ height: 36, padding: "0 14px", fontWeight: 600,
            color: "var(--brand-700)", borderColor: "var(--brand-line)", background: "var(--brand-bg)" }}>
          <Icon name="settings" size={14} stroke={1.8} />
          수정
        </button>
        <button className="pmo-btn" style={{ height: 36, padding: "0 14px", fontWeight: 600 }}>
          <Icon name="chevronLeft" size={14} stroke={2} />
          목록으로
        </button>
      </div>
    </div>
  </section>
);

/* ============================================================
   Card primitives
   ============================================================ */
const CardTitle = ({ icon, children }) => (
  <header style={{
    display: "flex", alignItems: "center", gap: 8,
    paddingBottom: 14, marginBottom: 14,
    borderBottom: "1px solid var(--line-2)",
  }}>
    <span style={{
      width: 28, height: 28, borderRadius: 8,
      background: "var(--brand-bg)", color: "var(--brand-700)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon name={icon} size={15} stroke={1.8} />
    </span>
    <h2 style={{ margin: 0, fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "var(--tx-1)" }}>
      {children}
    </h2>
  </header>
);

const InfoRow = ({ label, children }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "112px 1fr",
    gap: 12, padding: "9px 0", alignItems: "center", minHeight: 32,
  }}>
    <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 13.5, color: "var(--tx-1)", fontWeight: 500, lineHeight: 1.5 }}>
      {children ?? <span style={{ color: "var(--tx-5)" }}>—</span>}
    </span>
  </div>
);

/* ============================================================
   Card A — 기본 정보
   ============================================================ */
const BasicInfoCard = ({ project }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <CardTitle icon="report">기본 정보</CardTitle>
    <div>
      <InfoRow label="프로젝트 코드">
        <span style={{ fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums",
                       fontWeight: 700, letterSpacing: 0.2 }}>{project.code}</span>
      </InfoRow>
      <InfoRow label="사업명">{project.name}</InfoRow>
      <InfoRow label="사업유형"><BusinessTypeChip name={project.businessType} /></InfoRow>
      <InfoRow label="상태"><StatusBadge code={project.status} /></InfoRow>
      <InfoRow label="사업금액">
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{project.amountTotal}</span>
      </InfoRow>
      <InfoRow label="주관부서">{project.ownerDept}</InfoRow>
      <InfoRow label="영업대표">{project.salesOwner}</InfoRow>
      <InfoRow label="총괄 PM">{project.supportLead}</InfoRow>
      <InfoRow label="사업공고번호">
        <span style={{ fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums" }}>
          {project.bidNoticeNo}
        </span>
      </InfoRow>
    </div>
  </section>
);

/* ============================================================
   Card B — 일정 정보 (timeline)
   ============================================================ */
const ScheduleTimelineItem = ({ item, last }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "20px 1fr auto",
    gap: 14, alignItems: "start",
    paddingBottom: last ? 0 : 16,
  }}>
    {/* dot + line */}
    <div style={{ position: "relative", width: 20, alignSelf: "stretch", paddingTop: 4 }}>
      <span style={{
        position: "absolute", left: 5, top: 4,
        width: 10, height: 10, borderRadius: "50%",
        background: "var(--brand)",
        boxShadow: "0 0 0 3px var(--brand-bg)",
      }} />
      {!last && (
        <span style={{
          position: "absolute", left: 9.5, top: 16, bottom: -16,
          width: 1, background: "var(--brand-line)",
        }} />
      )}
    </div>

    {/* label + extras */}
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 1 }}>
      <span style={{ fontSize: 13, color: "var(--tx-2)", fontWeight: 600 }}>{item.label}</span>
      {item.extras && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px",
                      fontSize: 11.5, color: "var(--tx-5)" }}>
          {item.extras.map((e, i) => (
            <React.Fragment key={i}>
              <span>
                <span style={{ color: "var(--tx-4)", fontWeight: 600 }}>{e.k}</span>
                <span style={{ margin: "0 4px", color: "var(--tx-5)" }}>·</span>
                <span style={{ color: "var(--tx-3)", fontWeight: 500 }}>{e.v}</span>
              </span>
              {i < item.extras.length - 1 && <span style={{ color: "var(--tx-5)" }}>·</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>

    {/* date */}
    <span style={{
      fontSize: 13.5, color: "var(--tx-1)", fontWeight: 700,
      fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums",
      paddingTop: 1,
    }}>{item.date}</span>
  </div>
);

const ScheduleCard = ({ schedule }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <CardTitle icon="calendar">일정 정보</CardTitle>
    <div>
      {schedule.items.map((it, i) => (
        <ScheduleTimelineItem key={i} item={it} last={i === schedule.items.length - 1} />
      ))}
    </div>
  </section>
);

/* ============================================================
   Card C — 핵심 지표
   ============================================================ */
const KpiRow = ({ icon, label, children, last }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "22px 1fr auto",
    alignItems: "center", gap: 12,
    padding: "11px 0",
    borderBottom: last ? 0 : "1px solid var(--line-1)",
  }}>
    <span style={{ color: "var(--brand-700)", display: "inline-flex" }}>
      <Icon name={icon} size={16} stroke={1.7} />
    </span>
    <span style={{ fontSize: 13, color: "var(--tx-3)", fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--tx-1)",
                   fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
      {children}
    </span>
  </div>
);

const KpiCard = ({ kpi }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <CardTitle icon="trending">핵심 지표</CardTitle>
    <KpiRow icon="trending" label="D-day">
      <span style={{ color: "var(--crit)" }}>{kpi.dDay}</span>
    </KpiRow>
    <KpiRow icon="report" label="누적 MM(산정)">
      <span>{kpi.accumMm}</span>
      <div style={{ fontSize: 11, color: "var(--tx-5)", fontWeight: 500, marginTop: 2 }}>
        {kpi.accumMmNote}
      </div>
    </KpiRow>
    <KpiRow icon="users" label="투입 인원">{kpi.headcount}</KpiRow>
    <KpiRow icon="report" label="보고서 상태">
      <span style={{
        display: "inline-flex", padding: "2px 10px",
        background: "var(--ok-bg)", color: "#15803d",
        border: "1px solid var(--ok-line)", borderRadius: 6,
        fontSize: 11.5, fontWeight: 700,
      }}>{kpi.reportStatus}</span>
    </KpiRow>
    <KpiRow icon="report" label="최근 보고서" last>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--tx-2)" }}>{kpi.lastReport}</span>
    </KpiRow>
  </section>
);

/* ============================================================
   투입 인력 / 참여 정보
   ============================================================ */
const AssignmentsPanel = ({ rows }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px 14px", marginBottom: 16 }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
      <h2 className="pmo-section-title" style={{ margin: 0 }}>투입 인력 / 참여 정보</h2>
      <span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600 }}>
        총 {rows.length}명
      </span>
      <button className="pmo-btn" style={{ marginLeft: "auto", height: 32, padding: "0 14px", fontSize: 12.5 }}>
        인력 배치 이력 보기
        <Icon name="arrowRight" size={12} stroke={2} />
      </button>
    </header>

    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}>
      <table className="pmo-table">
        <colgroup>
          <col style={{ width: 140 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 120 }} />
          <col style={{ width: 120 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>이름</th>
            <th>역할</th>
            <th>소속팀</th>
            <th>배정유형</th>
            <th>투입상태</th>
            <th>상주여부</th>
            <th>시작일</th>
            <th>종료일</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar initials={p.initials} size={28} />
                  <span style={{ color: "var(--tx-1)", fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                </div>
              </td>
              <td><RoleChip role={p.role} tone={p.roleTone} /></td>
              <td style={{ color: "var(--tx-2)", fontWeight: 500 }}>{p.team}</td>
              <td><SmallChip label={p.deployType} tone={p.deployType === "수행" ? "ok" : "info"} /></td>
              <td><SmallChip label={p.status} tone={p.status === "투입" ? "ok" : "crit"} /></td>
              <td style={{ color: "var(--tx-2)", fontWeight: 500 }}>{p.onsite}</td>
              <td className="num" style={{ fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums",
                                            color: "var(--tx-2)", fontWeight: 600 }}>{p.from}</td>
              <td className="num" style={{ fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums",
                                            color: "var(--tx-2)", fontWeight: 600 }}>{p.to}</td>
              <td style={{ color: "var(--tx-3)", fontWeight: 500 }}>{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

/* ============================================================
   최근 진행사항
   ============================================================ */
const RecentLogsPanel = ({ logs }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px 14px" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
      <h2 className="pmo-section-title" style={{ margin: 0 }}>최근 진행사항</h2>
      <span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600 }}>
        최근 {logs.length}건
      </span>
      <button className="pmo-btn" style={{ marginLeft: "auto", height: 32, padding: "0 14px", fontSize: 12.5 }}>
        전체 이력 보기
        <Icon name="arrowRight" size={12} stroke={2} />
      </button>
    </header>

    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}>
      <table className="pmo-table">
        <colgroup>
          <col style={{ width: 168 }} />
          <col />
          <col style={{ width: 200 }} />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr>
            <th>일시</th>
            <th>내용</th>
            <th>작성자</th>
            <th style={{ textAlign: "center" }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((r) => (
            <tr key={r.id}>
              <td className="num" style={{
                color: "var(--tx-2)", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                fontFamily: "var(--font-num)",
              }}>
                {r.datetime}
              </td>
              <td style={{ color: "var(--tx-1)", whiteSpace: "normal" }}>
                <span style={{
                  display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1,
                  overflow: "hidden", textOverflow: "ellipsis",
                  lineHeight: 1.5, maxWidth: 720, fontWeight: 500,
                }}>{r.summary}</span>
              </td>
              <td>
                <span style={{ color: "var(--tx-1)", fontWeight: 700, fontSize: 13 }}>
                  {r.author}
                </span>
                <span style={{ marginLeft: 6, fontSize: 11.5, color: "var(--tx-4)", fontWeight: 600 }}>
                  {r.authorRole}
                </span>
              </td>
              <td style={{ textAlign: "center" }}>
                <LogStateChip label={r.stateLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

/* ============================================================
   Page
   ============================================================ */
const ProjectPage = ({ data }) => (
  <AppShell user={data.meta.user} notifications={data.meta.notifications}
            current="execution" pageTitle="프로젝트 상세">
    <PageHeader project={data.project} />

    <section style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
      gap: 16, marginBottom: 16, alignItems: "stretch",
    }}>
      <BasicInfoCard project={data.project} />
      <ScheduleCard  schedule={data.schedule} />
      <KpiCard       kpi={data.kpi} />
    </section>

    <AssignmentsPanel rows={data.assignments} />
    <RecentLogsPanel  logs={data.logs} />
  </AppShell>
);

window.ProjectPage = ProjectPage;
