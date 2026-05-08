/* PMO · dashboard.jsx — 대시보드 페이지
   - Filter bar (기준일/조직/기간)
   - KPI 6장 (KPICard 재사용)
   - 6개월 가동률·가득률 추이 (SVG line chart)
   - 팀별 인력 현황 (mini stacked bars)
   - 팀별 가동률/가득률 (가로 막대, 현재 기준)
*/

/* ---------- Filter Bar ---------- */
const FilterBar = ({ asOf }) => {
  const [period, setPeriod] = React.useState("6m");
  const [org, setOrg]     = React.useState("all");

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

  const Toggle = ({ id, label }) => (
    <button onClick={() => setPeriod(id)}
      style={{
        height: 32, padding: "0 14px",
        border: 0, background: period === id ? "var(--bg-1)" : "transparent",
        boxShadow: period === id ? "0 1px 2px rgba(15,23,42,.08)" : "none",
        color: period === id ? "var(--tx-1)" : "var(--tx-4)",
        fontSize: 12.5, fontWeight: period === id ? 700 : 500,
        borderRadius: 6, transition: "all .12s",
      }}>{label}</button>
  );

  return (
    <section className="pmo-panel" style={{
      padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
      marginBottom: 20, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 500 }}>본부 KPI 한눈에 보기</span>
        <span style={{ fontSize: 12, color: "var(--tx-5)", marginTop: 2 }}>
          기준일 <strong style={{ color: "var(--brand)", fontWeight: 600 }}>{asOf}</strong>
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>기준일</span>
        <div style={{
          height: 36, padding: "0 12px",
          background: "var(--bg-1)", border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 13, color: "var(--tx-2)", fontWeight: 500, fontVariantNumeric: "tabular-nums",
        }}>
          <Icon name="calendar" size={14} stroke={1.8} style={{ color: "var(--tx-4)" }} />
          {asOf}
        </div>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>조직</span>
        <Select value={org} onChange={setOrg} w={140}>
          <option value="all">전체</option>
          <option value="hq">PMO본부</option>
          <option value="t1">PMO1팀</option>
          <option value="t2">PMO2팀</option>
          <option value="tech">기술지원팀</option>
        </Select>
      </label>

      <div style={{
        display: "inline-flex", padding: 3, gap: 2,
        background: "var(--bg-0)",
        border: "1px solid var(--line-2)",
        borderRadius: 8,
      }}>
        <Toggle id="3m" label="3개월" />
        <Toggle id="6m" label="6개월" />
        <Toggle id="12m" label="12개월" />
      </div>

      <button className="pmo-btn" title="새로고침">
        <Icon name="trending" size={14} stroke={1.8} />
        새로고침
      </button>
      <button className="pmo-btn pmo-btn-primary">
        <Icon name="report" size={14} stroke={1.8} />
        엑셀 내보내기
      </button>
    </section>
  );
};

/* ---------- KPI Row ---------- */
const KPIRow = ({ kpis }) => (
  <section style={{ marginBottom: 20 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
    </div>
  </section>
);

/* ---------- Trend Line Chart ---------- */
const TrendChart = ({ trend }) => {
  const W = 720, H = 320;
  const padL = 44, padR = 24, padT = 28, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const months = trend.months;
  const u = trend.utilization;
  const c = trend.contractRate;

  /* Dynamic Y-axis: 30~100% range to make changes visible */
  const yMin = 30, yMax = 100;
  const x = (i) => padL + (months.length === 1 ? innerW / 2 : (i * innerW) / (months.length - 1));
  const y = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const line = (vals) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const yTicks = [30, 50, 70, 90, 100];

  const fmtMonth = (m) => m.replace("-", ".");

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
          최근 6개월 가동률 / 가득률 추이
        </h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--tx-3)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand)" }} />
            가동률(%)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 2, background: "var(--info)" }} />
            가득률(%)
          </span>
        </div>
      </header>

      <div style={{ width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxHeight: 340 }} role="img"
             aria-label="6개월 가동률 가득률 추이">
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)}
                stroke="var(--line-2)" strokeDasharray={t === yMin ? "0" : "3 4"} />
              <text x={padL - 10} y={y(t) + 4} fontSize="11" fill="var(--tx-5)" textAnchor="end"
                fontFamily="var(--font-num)">{t}%</text>
            </g>
          ))}

          {months.map((m, i) => (
            <text key={m} x={x(i)} y={H - 12} fontSize="11" fill="var(--tx-4)" textAnchor="middle"
                  fontFamily="var(--font-num)">{fmtMonth(m)}</text>
          ))}

          <path d={line(u)} fill="none" stroke="var(--brand)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
          <path d={line(c)} fill="none" stroke="var(--info)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />

          {u.map((v, i) => (
            <circle key={`u${i}`} cx={x(i)} cy={y(v)} r={i === u.length - 1 ? 5 : 3.2}
              fill="#fff" stroke="var(--brand)" strokeWidth={i === u.length - 1 ? 2.5 : 2} />
          ))}
          {c.map((v, i) => (
            <circle key={`c${i}`} cx={x(i)} cy={y(v)} r={i === c.length - 1 ? 5 : 3.2}
              fill="#fff" stroke="var(--info)" strokeWidth={i === c.length - 1 ? 2.5 : 2} />
          ))}

          {(() => {
            const last = u.length - 1;
            return (
              <g>
                <text x={x(last)} y={y(u[last]) - 12} fontSize="12" fontWeight="700"
                  fill="var(--brand)" textAnchor="middle" fontFamily="var(--font-num)">
                  {u[last].toFixed(1)}%
                </text>
                <text x={x(last)} y={y(c[last]) + 18} fontSize="12" fontWeight="700"
                  fill="var(--info)" textAnchor="middle" fontFamily="var(--font-num)">
                  {c[last].toFixed(1)}%
                </text>
              </g>
            );
          })()}

          {u.map((v, i) => i !== u.length - 1 && (
            <text key={`ul${i}`} x={x(i)} y={y(v) - 10} fontSize="10.5" fill="var(--tx-4)"
              textAnchor="middle" fontFamily="var(--font-num)">{v.toFixed(1)}</text>
          ))}
          {c.map((v, i) => i !== c.length - 1 && (
            <text key={`cl${i}`} x={x(i)} y={y(v) + 16} fontSize="10.5" fill="var(--tx-4)"
              textAnchor="middle" fontFamily="var(--font-num)">{v.toFixed(1)}</text>
          ))}
        </svg>
      </div>
    </section>
  );
};

/* ---------- Team Headcount Mini Stacked ---------- */
const TeamHeadcount = ({ rows }) => {
  const total = rows.reduce((a, r) => a + r.total, 0);
  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
          팀별 인력 현황
        </h2>
        <span style={{ fontSize: 12, color: "var(--tx-5)" }}>합계 {total}명</span>
      </header>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((r) => (
          <li key={r.team} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx-1)" }}>{r.team}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-1)", fontVariantNumeric: "tabular-nums" }}>
                {r.total}<span style={{ fontSize: 11, color: "var(--tx-4)", fontWeight: 500, marginLeft: 2 }}>명</span>
              </span>
            </div>

            <div style={{
              display: "flex", height: 8, borderRadius: 999,
              background: "var(--bg-subtle)", overflow: "hidden",
            }}>
              {r.running > 0 && (
                <i title={`수행 ${r.running}`} style={{ width: `${(r.running / r.total) * 100}%`, background: "var(--brand)" }} />
              )}
              {r.proposing > 0 && (
                <i title={`제안 ${r.proposing}`} style={{ width: `${(r.proposing / r.total) * 100}%`, background: "var(--info)" }} />
              )}
              {r.idle > 0 && (
                <i title={`대기 ${r.idle}`} style={{ width: `${(r.idle / r.total) * 100}%`, background: "var(--warn)" }} />
              )}
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11.5, color: "var(--tx-4)", fontVariantNumeric: "tabular-nums",
            }}>
              <span><i style={{
                display: "inline-block", width: 6, height: 6, borderRadius: 999,
                background: "var(--brand)", marginRight: 5, verticalAlign: 1,
              }} />수행 {r.running}</span>
              <span><i style={{
                display: "inline-block", width: 6, height: 6, borderRadius: 999,
                background: "var(--info)", marginRight: 5, verticalAlign: 1,
              }} />제안 {r.proposing}</span>
              <span><i style={{
                display: "inline-block", width: 6, height: 6, borderRadius: 999,
                background: "var(--warn)", marginRight: 5, verticalAlign: 1,
              }} />대기 {r.idle}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

/* ---------- Team Utilization (현재 기준) ---------- */
const TeamUtilization = ({ rows }) => {
  const [sortDesc, setSortDesc] = React.useState(true);
  const sorted = React.useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => (sortDesc ? b.utilization - a.utilization : a.utilization - b.utilization));
    return r;
  }, [rows, sortDesc]);

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", marginTop: 16 }}>
      <header style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
            팀별 가동률 / 가득률
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tx-4)" }}>
            현재 기준(스냅샷) · 본부 합계와 정합
          </p>
        </div>
        <button className="pmo-btn" onClick={() => setSortDesc((s) => !s)} style={{ height: 32, padding: "0 12px", fontSize: 12.5 }}>
          <Icon name={sortDesc ? "chevronDown" : "chevronUp"} size={12} stroke={2} />
          가동률 {sortDesc ? "내림차순" : "오름차순"}
        </button>
      </header>

      <table className="pmo-table" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 120 }} />
          <col style={{ width: 80 }} />
          <col />
          <col style={{ width: 80 }} />
        </colgroup>
        <thead>
          <tr>
            <th>팀명</th>
            <th style={{ textAlign: "right" }}>인원</th>
            <th>가동률 / 가득률</th>
            <th style={{ textAlign: "right", paddingRight: 22 }}>가동률</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.team}>
              <td className="name">{r.team}</td>
              <td className="num" style={{ textAlign: "right" }}>{r.headcount}명</td>
              <td>
                <DualBar utilization={r.utilization} contractRate={r.contractRate} />
              </td>
              <td className="num" style={{
                textAlign: "right", paddingRight: 22,
                color: "var(--tx-1)", fontWeight: 700, fontSize: 14,
              }}>
                {r.utilization.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{
        display: "flex", gap: 18, marginTop: 14, paddingTop: 12,
        borderTop: "1px dashed var(--line-2)",
        fontSize: 12, color: "var(--tx-4)", flexWrap: "wrap",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--brand)" }} />
          가동률 = (수행 + 제안) / 현재 인원
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i style={{ width: 12, height: 8, borderRadius: 2, background: "var(--info)" }} />
          가득률 = 수행 / 현재 인원
        </span>
      </div>
    </section>
  );
};

const DualBar = ({ utilization, contractRate }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="num" style={{ fontSize: 11, color: "var(--tx-4)", width: 28, textAlign: "right" }}>가동</span>
      <div style={{
        flex: 1, height: 10, borderRadius: 999,
        background: "var(--bg-subtle)", overflow: "hidden",
      }}>
        <i style={{
          display: "block", width: `${utilization}%`, height: "100%",
          background: "var(--brand)", borderRadius: 999,
        }} />
      </div>
      <span className="num" style={{ fontSize: 11.5, color: "var(--brand)", fontWeight: 700, width: 46, textAlign: "right" }}>
        {utilization.toFixed(1)}%
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="num" style={{ fontSize: 11, color: "var(--tx-4)", width: 28, textAlign: "right" }}>가득</span>
      <div style={{
        flex: 1, height: 10, borderRadius: 999,
        background: "var(--bg-subtle)", overflow: "hidden",
      }}>
        <i style={{
          display: "block", width: `${contractRate}%`, height: "100%",
          background: "var(--info)", borderRadius: 999,
        }} />
      </div>
      <span className="num" style={{ fontSize: 11.5, color: "var(--info)", fontWeight: 700, width: 46, textAlign: "right" }}>
        {contractRate.toFixed(1)}%
      </span>
    </div>
  </div>
);

/* ---------- Page ---------- */
const DashboardPage = ({ data }) => (
  <AppShell user={data.meta.user} notifications={data.meta.notifications}
            current="dashboard" pageTitle="대시보드">
    <FilterBar asOf={data.meta.asOf} />
    <KPIRow kpis={data.kpis} />
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <TrendChart trend={data.trend} />
      <TeamHeadcount rows={data.teamHeadcount} />
    </div>
    <TeamUtilization rows={data.teamUtilization} />
  </AppShell>
);

window.DashboardPage = DashboardPage;
