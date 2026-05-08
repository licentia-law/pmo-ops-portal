/* PMO · weekly.jsx — 주간현황 페이지
   - Filter bar (기준주차 / 본부 / 팀 / 전월 비교 토글 / 차주 포함 토글)
   - KPI 6장 (현재/수행/제안/비가동/가동률/가득률) — _shared의 KPICard 재사용
   - 주간 요약 표 (PMO본부 합계 + 팀 행), 비가동 = 대기/사업부장/지원 분해
   - 인력 가동 예상 (전월 ↔ 당월 비교 카드)
   - 대기 인원 / 제안 인원 리스트 (Snapshot)
*/

/* ---------- Filter Bar ---------- */
const WeeklyFilter = ({ asOf, weekLabel }) => {
  const [hq, setHq] = React.useState("all");
  const [team, setTeam] = React.useState("all");
  const [compare, setCompare] = React.useState(true);
  const [includeNext, setIncludeNext] = React.useState(false);

  const Select = ({ value, onChange, children, w }) => (
    <div style={{ position: "relative", width: w || 160 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", width: "100%", height: 36,
          padding: "0 32px 0 12px",
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          color: "var(--tx-2)", fontSize: 13, fontFamily: "inherit",
          fontWeight: 500, cursor: "pointer",
        }}>
        {children}
      </select>
      <span style={{
        position: "absolute", right: 10, top: "50%",
        transform: "translateY(-50%)", color: "var(--tx-5)",
        pointerEvents: "none",
      }}>
        <Icon name="chevronDown" size={14} stroke={2} />
      </span>
    </div>
  );

  const Switch = ({ checked, onChange, label }) => (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        height: 32, padding: "0 6px 0 4px",
        background: "transparent", border: 0,
        color: checked ? "var(--tx-1)" : "var(--tx-4)",
        fontSize: 12.5, fontWeight: 600,
      }}>
      <span style={{
        width: 30, height: 18, borderRadius: 999,
        background: checked ? "var(--brand)" : "var(--bg-subtle)",
        position: "relative", flex: "0 0 auto",
        transition: "background .15s",
      }}>
        <i style={{
          position: "absolute", top: 2, left: checked ? 14 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left .15s",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }} />
      </span>
      {label}
    </button>
  );

  return (
    <section className="pmo-panel" style={{
      padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 14,
      marginBottom: 16, flexWrap: "wrap",
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>기준주차</span>
        <div style={{
          height: 36, padding: "0 12px",
          background: "var(--bg-1)", border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 13, color: "var(--tx-2)", fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}>
          <Icon name="calendar" size={14} stroke={1.8} style={{ color: "var(--tx-4)" }} />
          {weekLabel}
        </div>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>본부</span>
        <Select value={hq} onChange={setHq} w={140}>
          <option value="all">전체</option>
          <option value="pmo">PMO본부</option>
        </Select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>팀</span>
        <Select value={team} onChange={setTeam} w={150}>
          <option value="all">전체</option>
          <option value="t1">PMO1팀</option>
          <option value="t2">PMO2팀</option>
          <option value="tech">기술지원팀</option>
        </Select>
      </label>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        height: 36, padding: "0 10px",
        background: "var(--bg-0)",
        border: "1px solid var(--line-2)",
        borderRadius: 8,
      }}>
        <Switch checked={compare} onChange={setCompare} label="전월 비교" />
        <span style={{ width: 1, height: 16, background: "var(--line-2)", margin: "0 4px" }} />
        <Switch checked={includeNext} onChange={setIncludeNext} label="차주 포함" />
      </div>

      <div style={{ flex: 1 }} />

      <button className="pmo-btn pmo-btn-primary">
        <Icon name="search" size={14} stroke={1.8} />
        조회
      </button>
      <button className="pmo-btn">초기화</button>
      <button className="pmo-btn">
        <Icon name="report" size={14} stroke={1.8} />
        엑셀 내보내기
      </button>
    </section>
  );
};

/* ---------- KPI Row (공용 KPICard 재사용, footer "전월 대비" 자동 표시) ---------- */
const KPIRow = ({ kpis }) => (
  <section style={{ marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
    </div>
  </section>
);

/* ---------- Weekly Summary Table (비가동 = 대기 / 사업부장 / 지원 분해) ---------- */
const fmt = (n, dp) => (typeof n === "number"
  ? (dp ? n.toFixed(dp) : n.toLocaleString())
  : "—");

const WeeklySummary = ({ rows }) => {
  const total = rows.find((r) => r.isTotal);
  const teams = rows.filter((r) => !r.isTotal);

  const NumCell = ({ v, color, weight }) => (
    <td className="num" style={{
      textAlign: "center",
      color: color || "var(--tx-1)",
      fontWeight: weight || 600,
    }}>{fmt(v)}</td>
  );

  const PctCell = ({ v, color }) => (
    <td className="num" style={{
      textAlign: "center",
      color: color, fontWeight: 700,
    }}>{fmt(v, 1)}%</td>
  );

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <header style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <h2 className="pmo-section-title" style={{ margin: 0 }}>
          주간 요약 현황
        </h2>
        <span style={{ fontSize: 12, color: "var(--tx-5)" }}>단위: 명, %</span>
      </header>

      <div style={{ overflowX: "auto" }}>
        <table className="pmo-table weekly-table">
          <colgroup>
            <col style={{ width: 130 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 86 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 92 }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle" }}>구분</th>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle" }}>현재 인원</th>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle" }}>수행</th>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle" }}>제안</th>
              <th colSpan="3" style={{ textAlign: "center", borderLeft: "1px solid var(--line-2)" }}>비가동</th>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle", borderLeft: "1px solid var(--line-2)" }}>가동률</th>
              <th rowSpan="2" style={{ textAlign: "center", verticalAlign: "middle" }}>가득률</th>
            </tr>
            <tr>
              <th style={{ textAlign: "center", borderLeft: "1px solid var(--line-2)" }}>대기</th>
              <th style={{ textAlign: "center" }}>사업부장</th>
              <th style={{ textAlign: "center" }}>지원</th>
            </tr>
          </thead>
          <tbody>
            {total && (
              <tr className="weekly-total">
                <td className="name" style={{ textAlign: "center" }}>합계</td>
                <NumCell v={total.current} weight={700} />
                <NumCell v={total.running} weight={700} />
                <NumCell v={total.proposing} weight={700} />
                <NumCell v={total.idle} weight={700} />
                <NumCell v={total.headOfDept} weight={700} />
                <NumCell v={total.support} weight={700} />
                <PctCell v={total.utilization}  color="var(--brand)" />
                <PctCell v={total.contractRate} color="var(--info)" />
              </tr>
            )}
            {teams.map((r) => (
              <tr key={r.org}>
                <td className="name" style={{ textAlign: "center", color: "var(--tx-2)", fontWeight: 500 }}>{r.org}</td>
                <NumCell v={r.current} weight={600} />
                <NumCell v={r.running} weight={500} color="var(--tx-2)" />
                <NumCell v={r.proposing} weight={500} color="var(--tx-2)" />
                <NumCell v={r.idle} weight={500} color="var(--tx-2)" />
                <NumCell v={r.headOfDept} weight={500} color="var(--tx-2)" />
                <NumCell v={r.support} weight={500} color="var(--tx-2)" />
                <PctCell v={r.utilization}  color="var(--tx-1)" />
                <PctCell v={r.contractRate} color="var(--tx-1)" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: "flex", gap: 18, marginTop: 14, paddingTop: 12,
        borderTop: "1px dashed var(--line-2)",
        fontSize: 11.5, color: "var(--tx-4)", flexWrap: "wrap",
      }}>
        <span>비가동 = 대기 + 사업부장 + 지원</span>
        <span style={{ color: "var(--tx-5)" }}>·</span>
        <span>가동률 = (수행 + 제안) / 현재 인원</span>
        <span style={{ color: "var(--tx-5)" }}>·</span>
        <span>가득률 = 수행 / 현재 인원</span>
      </div>
    </section>
  );
};

/* ---------- Compare Card (전월 ↔ 당월) ---------- */
const CompareCard = ({ compare }) => {
  const rows = [
    { key: "headcount",    label: "현재 인원", unit: "명", prev: compare.prevMonth.headcount,    cur: compare.current.headcount },
    { key: "running",      label: "수행",      unit: "명", prev: compare.prevMonth.running,      cur: compare.current.running },
    { key: "proposing",    label: "제안",      unit: "명", prev: compare.prevMonth.proposing,    cur: compare.current.proposing },
    { key: "inactive",     label: "비가동",    unit: "명", prev: compare.prevMonth.inactive,     cur: compare.current.inactive },
    { key: "utilization",  label: "가동률",    unit: "%",  prev: compare.prevMonth.utilization,  cur: compare.current.utilization,  dp: 1 },
    { key: "contractRate", label: "가득률",    unit: "%",  prev: compare.prevMonth.contractRate, cur: compare.current.contractRate, dp: 1 },
  ];

  return (
    <section className="pmo-panel" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 className="pmo-section-title" style={{ margin: 0 }}>
          인력 가동 예상
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--tx-4)" }}>
            전월({compare.prevMonth.month}) ↔ 당월({compare.current.month})
          </span>
        </h2>
        <span style={{ fontSize: 12, color: "var(--tx-5)" }}>PMO본부 합계 기준</span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {rows.map((r) => {
          const diff = +(r.cur - r.prev).toFixed(r.dp || 0);
          const dir = diff > 0 ? "up" : diff < 0 ? "down" : null;
          return (
            <div key={r.key} style={{
              padding: "12px 14px",
              background: "var(--bg-3)",
              border: "1px solid var(--line-1)",
              borderRadius: 10,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600 }}>{r.label}</span>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8,
                fontVariantNumeric: "tabular-nums",
              }}>
                <span style={{ fontSize: 12, color: "var(--tx-5)" }}>{fmt(r.prev, r.dp)}</span>
                <Icon name="arrowRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--tx-1)" }}>
                  {fmt(r.cur, r.dp)}
                  <span style={{ fontSize: 11, color: "var(--tx-4)", fontWeight: 500, marginLeft: 2 }}>{r.unit}</span>
                </span>
              </div>
              {dir && (
                <span className={`pmo-delta pmo-delta--${dir}`} style={{ fontSize: 11.5 }}>
                  <span className="pmo-delta__tri">{dir === "up" ? "▲" : "▼"}</span>
                  {Math.abs(diff)}{r.unit === "%" ? "%p" : r.unit}
                </span>
              )}
              {!dir && <span style={{ fontSize: 11.5, color: "var(--tx-5)" }}>변동 없음</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ---------- Snapshot Lists (대기 / 제안 인원) ---------- */
const SnapshotPanel = ({ title, hint, count, children }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
    <header style={{
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
      marginBottom: 12,
    }}>
      <h2 className="pmo-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        <span style={{
          display: "inline-flex", padding: "1px 8px",
          fontSize: 11, fontWeight: 700,
          background: "var(--bg-subtle)", color: "var(--tx-3)",
          borderRadius: 999,
        }}>{count}</span>
      </h2>
      <span style={{ fontSize: 12, color: "var(--tx-5)" }}>{hint}</span>
    </header>
    {children}
  </section>
);

const Empty = ({ msg }) => (
  <div style={{
    height: 160, display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--tx-5)", fontSize: 13,
    border: "1px dashed var(--line-2)", borderRadius: 10,
  }}>
    {msg}
  </div>
);

const WaitingList = ({ rows }) => (
  <SnapshotPanel title="대기 인원 현황" hint="기준일 스냅샷" count={rows.length}>
    {rows.length === 0 ? (
      <Empty msg="대기 인원이 없습니다" />
    ) : (
      <table className="pmo-table">
        <colgroup>
          <col style={{ width: 48 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 110 }} />
          <col />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>No.</th>
            <th style={{ textAlign: "center" }}>성명</th>
            <th style={{ textAlign: "center" }}>팀</th>
            <th style={{ textAlign: "center" }}>역할</th>
            <th style={{ textAlign: "center" }}>대기 시작일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="num" style={{ color: "var(--tx-5)", textAlign: "center" }}>{i + 1}</td>
              <td className="name" style={{ textAlign: "center" }}>{r.name}</td>
              <td style={{ textAlign: "center" }}>{r.team}</td>
              <td style={{ textAlign: "center" }}>{r.role}</td>
              <td className="num" style={{ textAlign: "center" }}>{r.startDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </SnapshotPanel>
);

const ActiveList = ({ rows }) => (
  <SnapshotPanel title="제안 인원 현황" hint="기준일 스냅샷" count={rows.length}>
    {rows.length === 0 ? (
      <Empty msg="제안 인원이 없습니다" />
    ) : (
      <table className="pmo-table">
        <colgroup>
          <col style={{ width: 44 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 96 }} />
          <col />
          <col style={{ width: 92 }} />
          <col style={{ width: 100 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>No.</th>
            <th style={{ textAlign: "center" }}>성명</th>
            <th style={{ textAlign: "center" }}>코드</th>
            <th style={{ textAlign: "center" }}>프로젝트명</th>
            <th style={{ textAlign: "center" }}>상태</th>
            <th style={{ textAlign: "center" }}>제안일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="num" style={{ color: "var(--tx-5)", textAlign: "center" }}>{i + 1}</td>
              <td className="name" style={{ textAlign: "center" }}>{r.name}</td>
              <td className="num" style={{ textAlign: "center" }}>{r.code}</td>
              <td style={{ textAlign: "left", paddingLeft: 12 }}>{r.project}</td>
              <td style={{ textAlign: "center" }}><StatusBadge code={r.status} /></td>
              <td className="num" style={{ textAlign: "center" }}>{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </SnapshotPanel>
);

/* ---------- Page ---------- */
const WeeklyPage = ({ data }) => (
  <AppShell user={data.meta.user} notifications={data.meta.notifications}
            current="weekly" pageTitle="주간현황">
    <WeeklyFilter asOf={data.meta.asOf} weekLabel={data.meta.weekLabel} />
    <KPIRow kpis={data.kpis} />
    <WeeklySummary rows={data.weeklySummary} />
    <CompareCard compare={data.compare} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
      <WaitingList rows={data.waitingList} />
      <ActiveList rows={data.activeList} />
    </div>
  </AppShell>
);

window.WeeklyPage = WeeklyPage;
