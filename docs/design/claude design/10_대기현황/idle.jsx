/* PMO · idle.jsx — 대기현황 (시안 정렬본) */

const CELL_STYLE = {
  running:   { bg: "#dcf2e3", fg: "#0f8a3e", label: "수행" },
  proposing: { bg: "#e9f0ff", fg: "#2563eb", label: "제안" },
  wait:      { bg: "#fff4df", fg: "#d97706", label: "대기" },
  plan:      { bg: "#e9f0ff", fg: "#2563eb", label: "투입예정" },
  leave:     { bg: "#fde7eb", fg: "#be123c", label: "휴직" },
  transfer:  { bg: "#eef2ff", fg: "#3b82f6", label: "전배" },
  retire:    { bg: "#f2f4f7", fg: "#6b7280", label: "퇴직" },
  dash:      { bg: "transparent", fg: "var(--tx-5)", label: "-" },
  text:      { bg: "transparent", fg: "var(--tx-2)", label: "텍스트" },
};

const FilterBar = ({ asOf }) => {
  const [category, setCategory] = React.useState("all");
  const [team, setTeam] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [keyword, setKeyword] = React.useState("");

  const Select = ({ value, onChange, children, w }) => (
    <div style={{ position: "relative", width: w }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        appearance: "none", width: "100%", height: 36, padding: "0 32px 0 12px",
        border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
        background: "var(--bg-1)", color: "var(--tx-2)", fontSize: 13, fontFamily: "inherit",
      }}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--tx-5)" }}>
        <Icon name="chevronDown" size={14} stroke={2} />
      </span>
    </div>
  );

  return (
    <section className="pmo-panel" style={{ padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 140px 140px 140px 1fr auto auto auto", gap: 10, alignItems: "end" }}>
        <label>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--tx-4)", marginBottom: 6, fontWeight: 600 }}>기준일</span>
          <div style={{
            height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
            background: "var(--bg-1)", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
            color: "var(--tx-2)", fontSize: 13, fontVariantNumeric: "tabular-nums",
          }}>
            <Icon name="calendar" size={14} stroke={1.8} style={{ color: "var(--tx-4)" }} />
            {asOf}
          </div>
        </label>
        <label>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--tx-4)", marginBottom: 6, fontWeight: 600 }}>본부</span>
          <Select value={category} onChange={setCategory} w={140}>
            <option value="all">전체</option>
            <option value="pmo">PMO본부</option>
          </Select>
        </label>
        <label>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--tx-4)", marginBottom: 6, fontWeight: 600 }}>팀</span>
          <Select value={team} onChange={setTeam} w={140}>
            <option value="all">전체</option>
            <option value="t1">PMO1팀</option>
            <option value="t2">PMO2팀</option>
            <option value="tech">기술지원팀</option>
          </Select>
        </label>
        <label>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--tx-4)", marginBottom: 6, fontWeight: 600 }}>상태</span>
          <Select value={status} onChange={setStatus} w={140}>
            <option value="all">전체</option>
            <option value="wait">대기</option>
            <option value="leave">휴직</option>
            <option value="transfer">전배</option>
            <option value="retire">퇴직</option>
          </Select>
        </label>
        <label>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--tx-4)", marginBottom: 6, fontWeight: 600 }}>검색어</span>
          <div style={{
            height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
            background: "var(--bg-1)", display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
          }}>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="성명, 프로젝트명, 역할"
              style={{ border: 0, outline: 0, background: "transparent", width: "100%", fontSize: 13, color: "var(--tx-2)" }} />
            <Icon name="search" size={14} stroke={1.8} style={{ color: "var(--tx-5)" }} />
          </div>
        </label>
        <button className="pmo-btn pmo-btn-primary"><Icon name="search" size={14} stroke={1.8} />조회</button>
        <button className="pmo-btn">초기화</button>
        <button className="pmo-btn"><Icon name="report" size={14} stroke={1.8} />엑셀 다운로드</button>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--brand)", fontWeight: 500 }}>
        전주 / 금주 / 차주는 기준일 기준으로 자동 산출됩니다. 대기 인원은 대기 상태만 집계하며, 휴직·전배·퇴직은 별도 분류합니다.
      </div>
    </section>
  );
};

const SummaryCard = ({ kpi }) => {
  const footerStyle = { display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" };
  const dot = (tone) => (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: tone === "rose" ? "#f43f5e" : tone === "info" ? "#3b82f6" : tone === "slate" ? "#9ca3af" : "#f59e0b",
      display: "inline-block",
    }} />
  );
  const iconTone = kpi.id === "headcount" ? "brand" : kpi.id === "idlePrev" ? "blue" : kpi.id === "idleNow" ? "green" : "purple";
  const iconName = kpi.id === "headcount" ? "users" : kpi.id === "idleNow" ? "check" : "calendar";
  return (
    <div className="pmo-panel" style={{ padding: "18px 20px", minHeight: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          width: 44, height: 44, borderRadius: "50%",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: iconTone === "brand" ? "#e7efff" : iconTone === "blue" ? "#e7efff" : iconTone === "green" ? "#dcf2e3" : "#ede5fd",
          color: iconTone === "green" ? "#16a34a" : iconTone === "purple" ? "#7c3aed" : "#2563eb",
          flex: "0 0 auto",
        }}>
          <Icon name={iconName} size={20} stroke={1.9} />
        </span>
        <div>
          <div style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 500 }}>
            {kpi.label} {kpi.rangeLabel ? <span style={{ color: "var(--brand)", marginLeft: 4 }}>{kpi.rangeLabel}</span> : null}
          </div>
          <div style={{ marginTop: 4, fontSize: 40, lineHeight: 1, color: "var(--tx-1)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {kpi.value}<span style={{ fontSize: 20, marginLeft: 4 }}>{kpi.unit}</span>
            {kpi.ratio ? <span style={{ fontSize: 28, color: "var(--brand)", marginLeft: 8 }}>({kpi.ratio})</span> : null}
          </div>
        </div>
      </div>
      <div style={footerStyle}>
        {kpi.footer.map((item, idx) => (
          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600 }}>
            {item.dot ? dot(item.dot) : null}{item.label} {item.value}
          </span>
        ))}
      </div>
    </div>
  );
};

const SummaryRow = ({ summary }) => (
  <section style={{ marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {summary.map((k) => <SummaryCard key={k.id} kpi={k} />)}
    </div>
  </section>
);

const renderCell = (cell) => {
  if (!cell) return <span style={{ color: "var(--tx-5)" }}>-</span>;
  const style = CELL_STYLE[cell.kind] || CELL_STYLE.text;
  if (cell.kind === "dash") return <span style={{ color: "var(--tx-5)" }}>-</span>;
  if (cell.kind === "text") return <span style={{ color: "var(--tx-3)" }}>{cell.label}</span>;
  if (cell.kind === "wait") return <span style={{ color: style.fg, fontWeight: 700 }}>대기</span>;
  return (
    <span style={{
      display: "inline-flex", minWidth: 54, height: 24, padding: "0 6px", alignItems: "center", justifyContent: "center",
      borderRadius: 5, background: style.bg, color: style.fg, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
    }}>
      {cell.code || style.label}
    </span>
  );
};

const MatrixLegend = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    {[
      ["프로젝트 수행", "running"], ["제안", "proposing"], ["대기", "wait"], ["투입예정", "plan"],
      ["휴직", "leave"], ["전배", "transfer"], ["퇴직", "retire"], ["공백", "dash"],
    ].map(([label, key]) => (
      <span key={label} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontSize: 12, color: key === "dash" ? "var(--tx-3)" : CELL_STYLE[key].fg, fontWeight: 700,
        height: 28, padding: "0 10px", borderRadius: 6,
        background: key === "dash" ? "transparent" : CELL_STYLE[key].bg,
        border: key === "dash" ? "1px solid var(--line-2)" : "1px solid transparent",
      }}>
        {label}
      </span>
    ))}
  </div>
);

const WaitingMatrix = ({ data }) => (
  <section className="pmo-panel" style={{ padding: "16px 16px 12px" }}>
    <header style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--brand)",
          color: "var(--brand)", display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, lineHeight: 1,
        }}>i</span>
        행에 마우스를 올리거나 클릭하면 프로젝트명, 역할, 계약기간, 현재 정보, 차기 이행 정보를 확인할 수 있습니다.
      </div>
      <div style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 600 }}>
        대기 인원은 '대기' 상태만 집계하며, 휴직·전배·퇴직은 별도 분류합니다.
      </div>
    </header>
    <div style={{ overflowX: "auto", border: "1px solid var(--line-2)", borderRadius: 10 }}>
      <table className="pmo-table idle-table" style={{ minWidth: 1180 }}>
        <thead>
          <tr>
            <th rowSpan="2" style={{ textAlign: "center" }}>No.</th>
            <th rowSpan="2" style={{ textAlign: "center" }}>성명</th>
            <th rowSpan="2" style={{ textAlign: "center" }}>역할</th>
            <th colSpan="4" style={{ textAlign: "center" }}>{data.weeks.prev.label} ({data.weeks.prev.range})</th>
            <th colSpan="4" style={{ textAlign: "center" }}>{data.weeks.current.label} ({data.weeks.current.range})</th>
            <th colSpan="4" style={{ textAlign: "center" }}>{data.weeks.next.label} ({data.weeks.next.range})</th>
          </tr>
          <tr>
            {["대기", "휴직", "전배", "퇴직"].concat(["대기", "휴직", "전배", "퇴직"], ["대기", "휴직", "전배", "퇴직"]).map((h, i) => (
              <th key={i} style={{ textAlign: "center" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.matrix.rows.map((row) => (
            <tr key={row.no}>
              <td className="num" style={{ textAlign: "center" }}>{row.no}</td>
              <td className="name" style={{ textAlign: "center" }}>{row.name}</td>
              <td style={{ textAlign: "center" }}>{row.role}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.prev.wait)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.prev.leave)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.prev.transfer)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.prev.retire)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.current.wait)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.current.leave)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.current.transfer)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.current.retire)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.next.wait)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.next.leave)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.next.transfer)}</td>
              <td style={{ textAlign: "center" }}>{renderCell(row.next.retire)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <MatrixLegend />
      <div style={{ fontSize: 12.5, color: "var(--tx-3)", fontWeight: 700 }}>전체 {data.matrix.rows.length}명</div>
    </div>
  </section>
);

const UnassignedSummary = ({ summary }) => (
  <section className="pmo-panel" style={{ padding: "14px 14px 12px" }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
      <h2 className="pmo-section-title" style={{ margin: 0 }}>비배정 인원 요약</h2>
      <span style={{ fontSize: 12, color: "var(--tx-5)" }}>(단위: 명)</span>
    </header>
    <div style={{ overflowX: "auto", border: "1px solid var(--line-2)", borderRadius: 8 }}>
      <table className="pmo-table idle-summary" style={{ minWidth: 460 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>구분</th>
            {summary.weeks.map((w) => <th key={w.label} style={{ textAlign: "center" }}>{w.label}<div style={{ fontSize: 10.5, color: "var(--tx-5)" }}>({w.range})</div></th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="name" style={{ textAlign: "center" }}>대기</td>
            {summary.weeks.map((w) => <td key={`w-${w.label}`} className="num" style={{ textAlign: "center" }}>{w.wait}</td>)}
          </tr>
          <tr>
            <td className="name" style={{ textAlign: "center" }}>휴직</td>
            {summary.weeks.map((w) => <td key={`l-${w.label}`} className="num" style={{ textAlign: "center" }}>{w.leave}</td>)}
          </tr>
          <tr>
            <td className="name" style={{ textAlign: "center" }}>전배</td>
            {summary.weeks.map((w) => <td key={`t-${w.label}`} className="num" style={{ textAlign: "center" }}>{w.transfer}</td>)}
          </tr>
          <tr>
            <td className="name" style={{ textAlign: "center" }}>퇴직</td>
            {summary.weeks.map((w) => <td key={`r-${w.label}`} className="num" style={{ textAlign: "center" }}>{w.retire}</td>)}
          </tr>
          <tr>
            <td className="name" style={{ textAlign: "center", color: "var(--brand)" }}>비배정 합계</td>
            {summary.weeks.map((w) => <td key={`sum-${w.label}`} className="num" style={{ textAlign: "center", color: "var(--brand)" }}>{w.subtotal}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);

const NextPlan = ({ rows }) => (
  <section className="pmo-panel" style={{ padding: "14px 14px 12px" }}>
    <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
      <h2 className="pmo-section-title" style={{ margin: 0 }}>차주 투입 예정</h2>
      <span style={{ fontSize: 12, color: "var(--tx-5)" }}>(단위: 명)</span>
    </header>
    <table className="pmo-table idle-plan">
      <thead>
        <tr>
          <th style={{ textAlign: "center" }}>No.</th>
          <th style={{ textAlign: "center" }}>성명</th>
          <th style={{ textAlign: "center" }}>역할</th>
          <th style={{ textAlign: "center" }}>시작일</th>
          <th style={{ textAlign: "center" }}>예정 프로젝트</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.no}>
            <td className="num" style={{ textAlign: "center" }}>{r.no}</td>
            <td className="name" style={{ textAlign: "center" }}>{r.name}</td>
            <td style={{ textAlign: "center" }}>{r.role}</td>
            <td className="num" style={{ textAlign: "center" }}>{r.start}</td>
            <td className="num" style={{ textAlign: "center", color: "var(--brand)", fontWeight: 700 }}>{toProjectCode(r.project)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const toProjectCode = (value) => {
  const m = String(value || "").match(/^P(\d{4})$/);
  if (!m) return value;
  return `P2026${m[1].slice(-3)}`;
};

const IdlePage = ({ data }) => (
  <AppShell user={data.meta.user} notifications={data.meta.notifications} current="idle" pageTitle="대기현황">
    <FilterBar asOf={data.meta.asOf} />
    <SummaryRow summary={data.summary} />
    <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: 12 }}>
      <WaitingMatrix data={data} />
      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 12 }}>
        <UnassignedSummary summary={data.unassignedSummary} />
        <NextPlan rows={data.nextPlan} />
      </div>
    </div>
  </AppShell>
);

window.IdlePage = IdlePage;
