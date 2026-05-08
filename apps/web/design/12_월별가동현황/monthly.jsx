/* PMO · monthly.jsx — 월별가동현황 페이지
   - Filter bar (연도 / 본부 / 팀 / 새로고침 / 엑셀)
   - 연 요약 KPI 6장 (전년 동기 대비)
   - 메인: 좌 12개월 추이 라인차트 + 우 선택월 단면 패널
   - 월별 상세 매트릭스 (행=지표, 열=12개월 + YTD)
   - 팀별 YTD 요약 표
*/

const fmt = (v, dp) => (v == null ? "—"
  : (typeof v === "number"
      ? (dp != null ? v.toFixed(dp) : v.toLocaleString())
      : v));

/* ---------- Filter Bar ---------- */
const MonthlyFilter = ({ year, asOf }) => {
  const [yr, setYr] = React.useState(String(year));
  const [hq, setHq] = React.useState("all");
  const [team, setTeam] = React.useState("all");
  const [sold, setSold] = React.useState(false);

  const Select = ({ value, onChange, children, w }) => (
    <div style={{ position: "relative", width: w || 140 }}>
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
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        color: "var(--tx-5)", pointerEvents: "none",
      }}>
        <Icon name="chevronDown" size={14} stroke={2} />
      </span>
    </div>
  );

  const Switch = ({ checked, onChange, label, hint }) => (
    <button onClick={() => onChange(!checked)} aria-pressed={checked}
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
        position: "relative", flex: "0 0 auto", transition: "background .15s",
      }}>
        <i style={{
          position: "absolute", top: 2, left: checked ? 14 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left .15s",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }} />
      </span>
      <span>{label}</span>
      {hint && <span style={{ color: "var(--tx-5)", fontWeight: 500, marginLeft: 2 }}>{hint}</span>}
    </button>
  );

  return (
    <section className="pmo-panel" style={{
      padding: "14px 18px", display: "flex", alignItems: "center",
      gap: 14, marginBottom: 16, flexWrap: "wrap",
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>연도</span>
        <Select value={yr} onChange={setYr} w={110}>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </Select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>본부</span>
        <Select value={hq} onChange={setHq} w={130}>
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
        display: "inline-flex", alignItems: "center",
        height: 36, padding: "0 12px",
        background: "var(--bg-0)",
        border: "1px solid var(--line-2)",
        borderRadius: 8,
      }}>
        <Switch checked={sold} onChange={setSold} label="Sold 기준" hint="(확도 가중 미적용)" />
      </div>

      <span style={{ fontSize: 12, color: "var(--tx-5)", marginLeft: 4 }}>
        기준일 <strong style={{ color: "var(--brand)", fontWeight: 600 }}>{asOf}</strong>
      </span>

      <div style={{ flex: 1 }} />

      <button className="pmo-btn">
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

/* ---------- Year KPI Row ---------- */
const YearKPIRow = ({ kpis }) => (
  <section style={{ marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
    </div>
  </section>
);

/* ---------- Trend Line Chart (12 months, asOf-aware) ---------- */
const TrendChart = ({ trend }) => {
  const W = 720, H = 320;
  const padL = 44, padR = 24, padT = 28, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const months = trend.months;
  const u = trend.utilization;
  const c = trend.contractRate;
  const cutoff = trend.asOfMonthIdx;       // 마지막 실측 인덱스

  const yMin = 30, yMax = 100;
  const x = (i) => padL + (i * innerW) / (months.length - 1);
  const y = (v) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  /* solid path: indices 0..cutoff (실측 데이터) */
  const buildPath = (vals) => {
    const segs = [];
    let started = false;
    vals.forEach((v, i) => {
      if (v == null) { started = false; return; }
      if (i > cutoff) return;
      segs.push(`${!started ? "M" : "L"}${x(i)},${y(v)}`);
      started = true;
    });
    return segs.join(" ");
  };

  const yTicks = [30, 50, 70, 90, 100];
  const fmtMonth = (m) => m;

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
          월별 가동률 / 가득률 추이
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--tx-4)" }}>
            (1월 ~ 12월, 실측은 {months[cutoff]}까지)
          </span>
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
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxHeight: 340 }}
             role="img" aria-label="월별 가동률 가득률 추이">
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)}
                stroke="var(--line-2)" strokeDasharray={t === yMin ? "0" : "3 4"} />
              <text x={padL - 10} y={y(t) + 4} fontSize="11" fill="var(--tx-5)" textAnchor="end"
                fontFamily="var(--font-num)">{t}%</text>
            </g>
          ))}

          {months.map((m, i) => (
            <text key={m} x={x(i)} y={H - 12} fontSize="11"
                  fill={i <= cutoff ? "var(--tx-4)" : "var(--tx-5)"}
                  textAnchor="middle" fontFamily="var(--font-num)">{fmtMonth(m)}</text>
          ))}

          {/* 미래 영역 음영 표시 */}
          {cutoff < months.length - 1 && (
            <rect x={x(cutoff)} y={padT} width={x(months.length - 1) - x(cutoff)} height={innerH}
                  fill="var(--bg-3)" opacity="0.5" />
          )}

          <path d={buildPath(u)} fill="none" stroke="var(--brand)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
          <path d={buildPath(c)} fill="none" stroke="var(--info)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />

          {u.map((v, i) => v != null && i <= cutoff && (
            <circle key={`u${i}`} cx={x(i)} cy={y(v)} r={i === cutoff ? 5 : 3.2}
              fill="#fff" stroke="var(--brand)" strokeWidth={i === cutoff ? 2.5 : 2} />
          ))}
          {c.map((v, i) => v != null && i <= cutoff && (
            <circle key={`c${i}`} cx={x(i)} cy={y(v)} r={i === cutoff ? 5 : 3.2}
              fill="#fff" stroke="var(--info)" strokeWidth={i === cutoff ? 2.5 : 2} />
          ))}

          {/* 마지막 실측 라벨 */}
          <text x={x(cutoff)} y={y(u[cutoff]) - 12} fontSize="12" fontWeight="700"
            fill="var(--brand)" textAnchor="middle" fontFamily="var(--font-num)">
            {u[cutoff].toFixed(1)}%
          </text>
          <text x={x(cutoff)} y={y(c[cutoff]) + 18} fontSize="12" fontWeight="700"
            fill="var(--info)" textAnchor="middle" fontFamily="var(--font-num)">
            {c[cutoff].toFixed(1)}%
          </text>
        </svg>
      </div>

      <div style={{
        marginTop: 8, paddingTop: 10, borderTop: "1px dashed var(--line-2)",
        fontSize: 11.5, color: "var(--tx-4)",
      }}>
        음영 영역은 기준일({months[cutoff]}) 이후 미래 월 — 데이터 없음.
      </div>
    </section>
  );
};

/* ---------- Selected Month Snapshot (우측 패널) ---------- */
const SelectedMonthPanel = ({ snap }) => {
  const items = [
    { label: "현재 인원", value: snap.headcount,   unit: "명", tone: "blue",   icon: "users" },
    { label: "수행",      value: snap.running,     unit: "명", tone: "green",  icon: "check" },
    { label: "제안",      value: snap.proposing,   unit: "명", tone: "purple", icon: "users" },
    { label: "비가동",    value: snap.idle + snap.headOfDept + snap.support, unit: "명", tone: "amber", icon: "clock" },
  ];

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
          월간 인력 현황
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--tx-4)" }}>
            {snap.month}
          </span>
        </h2>
      </header>

      {/* 도넛 2개 (가동률 / 가득률) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <DonutTile label="가동률" value={snap.utilization} color="brand" />
        <DonutTile label="가득률" value={snap.contractRate} color="info" />
      </div>

      {/* 인원 분해 4개 */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <li key={it.label} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 4px", borderBottom: "1px solid var(--line-1)",
          }}>
            <ToneIcon tone={it.tone} icon={it.icon} size={32} iconSize={16} />
            <span style={{ flex: 1, fontSize: 13, color: "var(--tx-3)", fontWeight: 500 }}>{it.label}</span>
            <span style={{
              fontSize: 16, fontWeight: 700, color: "var(--tx-1)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {it.value}
              <span style={{ fontSize: 11, color: "var(--tx-4)", fontWeight: 500, marginLeft: 2 }}>{it.unit}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const DonutTile = ({ label, value, color }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    padding: "14px 10px",
    background: "var(--bg-3)", borderRadius: 10,
  }}>
    <Donut value={value} color={color} size={64} stroke={7} />
    <span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span>
    <span style={{
      fontSize: 18, fontWeight: 700, color: "var(--tx-1)",
      fontVariantNumeric: "tabular-nums",
    }}>{value.toFixed(1)}%</span>
  </div>
);

/* ---------- Monthly Detail Matrix (행=지표, 열=12월 + YTD) ---------- */
const MonthlyDetailTable = ({ detail }) => {
  const { months, rows, asOfMonthIdx } = detail;

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", marginBottom: 16, overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
          월별 상세 (PMO본부)
        </h2>
        <span style={{ fontSize: 12, color: "var(--tx-5)" }}>실측: {months[asOfMonthIdx]}까지 · 이후 월 데이터 없음</span>
      </header>

      <div className="monthly-scroll" style={{ overflowX: "auto" }}>
        <table className="pmo-table monthly-detail">
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "var(--bg-3)", zIndex: 1, textAlign: "left", paddingLeft: 16, minWidth: 130 }}>
                지표
              </th>
              {months.map((m, i) => (
                <th key={m} style={{
                  textAlign: "right",
                  color: i > asOfMonthIdx ? "var(--tx-5)" : "var(--tx-4)",
                  background: i > asOfMonthIdx ? "var(--bg-0)" : "var(--bg-3)",
                  minWidth: 64,
                }}>{m}</th>
              ))}
              <th style={{
                textAlign: "right", paddingRight: 18, minWidth: 92,
                background: "var(--brand-bg)", color: "var(--brand-700)",
                borderLeft: "2px solid var(--brand-line)",
              }}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isPct = r.isPercent;
              const valueColor = r.color === "brand" ? "var(--brand)"
                              : r.color === "info"  ? "var(--info)"
                              : "var(--tx-1)";
              return (
                <tr key={r.id} className={r.isTotal ? "md-total" : ""}>
                  <td style={{
                    position: "sticky", left: 0, background: r.isTotal ? "var(--brand-bg)" : "var(--bg-1)",
                    zIndex: 1, textAlign: "left", paddingLeft: 16,
                    fontWeight: r.isTotal ? 700 : 500,
                    color: r.isTotal ? "var(--brand-700)" : "var(--tx-2)",
                  }}>
                    {r.label}
                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--tx-5)", fontWeight: 500 }}>
                      ({r.unit})
                    </span>
                  </td>
                  {r.values.map((v, i) => (
                    <td key={i} className="num" style={{
                      textAlign: "right",
                      color: v == null ? "var(--tx-5)" : (isPct ? valueColor : "var(--tx-2)"),
                      background: i > asOfMonthIdx ? "var(--bg-0)" : "transparent",
                      fontWeight: r.isTotal ? 700 : (isPct ? 600 : 500),
                    }}>
                      {v == null ? "—" : (isPct ? v.toFixed(1) : (typeof v === "number" ? v.toFixed(r.unit === "MM" ? 1 : 0) : v))}
                    </td>
                  ))}
                  <td className="num" style={{
                    textAlign: "right", paddingRight: 18,
                    background: "var(--brand-bg)",
                    borderLeft: "2px solid var(--brand-line)",
                    color: isPct ? valueColor : "var(--tx-1)",
                    fontWeight: 700,
                  }}>
                    {fmt(r.ytd, isPct ? 1 : (r.unit === "MM" ? 1 : (Number.isInteger(r.ytd) ? 0 : 1)))}
                    <span style={{ fontSize: 10, color: "var(--tx-5)", fontWeight: 500, marginLeft: 4 }}>
                      {r.ytdLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: "1px dashed var(--line-2)",
        fontSize: 11.5, color: "var(--tx-4)", display: "flex", flexWrap: "wrap", gap: 18,
      }}>
        <span>합계 MM = 수행 + 제안 + 지원 + 미투입 = 재직 인원 × NETWORKDAYS 비율</span>
        <span style={{ color: "var(--tx-5)" }}>·</span>
        <span>가동률 = (수행 + 제안) / 합계 MM</span>
        <span style={{ color: "var(--tx-5)" }}>·</span>
        <span>가득률 = 수행 / 합계 MM</span>
      </div>
    </section>
  );
};

/* ---------- Team Year Summary ---------- */
const TeamYearSummary = ({ summary }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px" }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
        팀별 YTD 요약
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--tx-4)" }}>
          누적 1월 ~ 5월
        </span>
      </h2>
      <span style={{ fontSize: 12, color: "var(--tx-5)" }}>본부 합계와 정합</span>
    </header>

    <table className="pmo-table">
      <thead>
        <tr>
          <th style={{ textAlign: "left", paddingLeft: 16 }}>팀명</th>
          <th style={{ textAlign: "right" }}>월평균 가동인원</th>
          <th style={{ textAlign: "right" }}>수행 MM</th>
          <th style={{ textAlign: "right" }}>제안 MM</th>
          <th style={{ textAlign: "right" }}>미투입 MM</th>
          <th style={{ textAlign: "right" }}>평균 가동률</th>
          <th style={{ textAlign: "right", paddingRight: 22 }}>평균 가득률</th>
        </tr>
      </thead>
      <tbody>
        {summary.rows.map((r) => (
          <tr key={r.team}>
            <td className="name" style={{ paddingLeft: 16 }}>{r.team}</td>
            <td className="num" style={{ textAlign: "right" }}>{r.avgHeadcount.toFixed(1)}명</td>
            <td className="num" style={{ textAlign: "right" }}>{r.ytdRunningMM.toFixed(1)}</td>
            <td className="num" style={{ textAlign: "right" }}>{r.ytdProposingMM.toFixed(1)}</td>
            <td className="num" style={{ textAlign: "right" }}>{r.ytdIdleMM.toFixed(1)}</td>
            <td className="num" style={{ textAlign: "right", color: "var(--brand)", fontWeight: 700 }}>
              {r.avgUtilization.toFixed(1)}%
            </td>
            <td className="num" style={{ textAlign: "right", paddingRight: 22, color: "var(--info)", fontWeight: 700 }}>
              {r.avgContractRate.toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

/* ---------- Page ---------- */
const MonthlyPage = ({ data }) => (
  <AppShell user={data.meta.user} notifications={data.meta.notifications}
            current="monthly" pageTitle="월별가동현황">
    <MonthlyFilter year={data.meta.year} asOf={data.meta.asOf} />
    <YearKPIRow kpis={data.yearKpis} />
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
      <TrendChart trend={data.trend} />
      <SelectedMonthPanel snap={data.selectedMonth} />
    </div>
    <MonthlyDetailTable detail={data.monthlyDetail} />
    <TeamYearSummary summary={data.teamYearSummary} />
  </AppShell>
);

window.MonthlyPage = MonthlyPage;
