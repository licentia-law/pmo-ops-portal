/* PMO · home.jsx — Home (대시보드 허브) page */

const Hero = ({ asOf, hero }) => (
  <section className="pmo-panel" style={{
    padding: "28px 32px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 24, marginBottom: 24,
  }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{
        margin: 0, fontSize: 26, lineHeight: "32px",
        fontWeight: 700, color: "var(--tx-1)", letterSpacing: -0.4,
      }}>{hero.title}</h1>
      <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--tx-4)" }}>
        <span style={{ color: "var(--brand)", fontWeight: 600 }}>{asOf}</span> 기준 · {hero.subtitle}
      </p>
    </div>
    <button className="pmo-btn">
      <Icon name="calendar" size={14} stroke={1.8} />
      기준일 변경
    </button>
  </section>
);

const QuickLinks = ({ items }) => (
  <section style={{ marginBottom: 28 }}>
    <h2 className="pmo-section-title">주요 화면 바로가기</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {items.map((it) => <QuickLinkCard key={it.id} item={it} />)}
    </div>
  </section>
);

const KPIRow = ({ asOf, kpis }) => (
  <section style={{ marginBottom: 28 }}>
    <h2 className="pmo-section-title">
      핵심 현황
      <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: "var(--tx-4)" }}>
        (기준일 {asOf})
      </span>
    </h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
      {kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
    </div>
  </section>
);

const BUSINESS_TYPE_TONE = {
  "주사업": { fg: "#1d4ed8", bg: "#e3eefe" },
  "부사업": { fg: "#7c3aed", bg: "#ede5fd" },
  "하도":   { fg: "#b45309", bg: "#fef4e1" },
  "협력":   { fg: "#475569", bg: "#eef2f7" },
};
const BusinessTypeChip = ({ type }) => {
  const t = BUSINESS_TYPE_TONE[type] || BUSINESS_TYPE_TONE["주사업"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 6,
      fontSize: 12, fontWeight: 600, lineHeight: 1.5,
      color: t.fg, background: t.bg,
    }}>{type}</span>
  );
};

const RecentProjects = ({ rows }) => (
  <section className="pmo-panel" style={{ overflow: "hidden" }}>
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 22px 14px",
    }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
        최근 변경 프로젝트
      </h2>
      <a href="#" className="pmo-link">
        전체 보기 <Icon name="chevronRight" size={14} stroke={2} />
      </a>
    </header>
    <table className="pmo-table">
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
            <td style={{ textAlign: "right", paddingRight: 22, color: "var(--tx-3)" }}>
              {r.updatedBy}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const MonthSummaryRow = ({ row }) => {
  const isMetric = row.donut;
  return (
    <li style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "13px 0",
      borderBottom: "1px solid var(--line-1)",
    }}>
      {isMetric
        ? <Donut value={row.pct} color={row.color} size={36} stroke={5} />
        : <ToneIcon tone={row.tone} icon={row.icon} size={36} iconSize={18} />}
      <span style={{ flex: 1, fontSize: 14, color: "var(--tx-2)", fontWeight: 500 }}>{row.label}</span>
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx-1)" }}>{row.value}</span>
        {row.delta && <Delta {...row.delta} />}
      </span>
    </li>
  );
};

const MonthSummary = ({ summary }) => (
  <section className="pmo-panel" style={{ display: "flex", flexDirection: "column" }}>
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 22px 6px",
    }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--tx-1)" }}>
        이번 달 요약
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--tx-4)" }}>
          {summary.month}
        </span>
      </h2>
      <a href="#" className="pmo-link">
        상세 보기 <Icon name="chevronRight" size={14} stroke={2} />
      </a>
    </header>
    <ul style={{ listStyle: "none", margin: 0, padding: "0 22px 18px" }}>
      {summary.rows.map((r) => <MonthSummaryRow key={r.id} row={r} />)}
    </ul>
  </section>
);

const HomePage = ({ data }) => (
  <AppShell
    user={data.meta.user}
    notifications={data.meta.notifications}
    current="home"
    pageTitle="홈"
  >
    <Hero asOf={data.meta.asOf} hero={data.hero} />
    <QuickLinks items={data.quickLinks} />
    <KPIRow asOf={data.meta.asOf} kpis={data.kpis} />
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <RecentProjects rows={data.recentProjects.rows} />
      <MonthSummary summary={data.monthSummary} />
    </div>
  </AppShell>
);

window.HomePage = HomePage;
