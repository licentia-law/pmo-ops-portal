/* PMO · code.jsx — 프로젝트코드 (간이 마스터 + KPI 마스터 통합)
   - Filter bar (상태 / 사업유형 / 영업부서 / 연도 / 검색 + 조회/초기화/신규등록)
   - 상태별 요약 카드 8장 (PRD §4.1) — 클릭 시 상태 필터 토글
   - 프로젝트코드 목록 표 + 페이지네이션
*/

/* =========================================================
   Status card icons (8개) — 인라인 SVG, currentColor stroke
   ========================================================= */
const STATUS_SVG = {
  proposing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" /><path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
  </svg>,
  presented: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="1.2" />
    <path d="M3 16l4 4M21 16l-4 4M12 16v4" />
    <path d="M7 12V9M11 12V7M15 12v-4M19 12v-2" />
  </svg>,
  win: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M9 14h6l1 4H8z" /><path d="M7 21h10" />
  </svg>,
  loss: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>,
  drop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v14" /><path d="M6 12l6 6 6-6" />
  </svg>,
  running: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4l13 8-13 8z" fill="currentColor" fillOpacity="0.15" />
  </svg>,
  support: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" />
    <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
    <path d="M14.5 19c.3-2.4 2-3.5 4-3.5s3 1 3.5 3" />
  </svg>,
  done: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>,
};

/* =========================================================
   상태 카드 톤 매핑 (PRD §4.1)
   ========================================================= */
const STATUS_CARD_TONE = {
  proposing: { fg: "#7c3aed", bg: "#ede5fd", line: "#dbcaf9" }, // neutral→연보라 (시안 톤)
  presented: { fg: "#1d4ed8", bg: "#e3eefe", line: "var(--info-line)" },
  win:       { fg: "#047857", bg: "#dcf2e3", line: "var(--ok-line)" },
  loss:      { fg: "var(--crit)", bg: "var(--crit-bg)", line: "var(--crit-line)" },
  drop:      { fg: "#c2410c", bg: "#fde7d8", line: "#f5c9a4" },
  running:   { fg: "var(--brand-700)", bg: "#dde3ff", line: "var(--brand-line)" },
  support:   { fg: "#b45309", bg: "var(--warn-bg)", line: "var(--warn-line)" },
  done:      { fg: "#0f766e", bg: "#d6f1ec", line: "#a3dad1" },
};

/* =========================================================
   사업유형 chip — 4종
   ========================================================= */
const BIZ_TYPE_TONE = {
  "주사업": { fg: "var(--brand-700)", bg: "var(--brand-bg)", line: "var(--brand-line)" },
  "부사업": { fg: "#0f766e",          bg: "#d6f1ec",         line: "#a3dad1" },
  "하도":   { fg: "#b45309",          bg: "var(--warn-bg)",  line: "var(--warn-line)" },
  "협력":   { fg: "var(--tx-3)",      bg: "var(--bg-subtle)",line: "var(--line-2)" },
};
const BusinessTypeChip = ({ name }) => {
  const t = BIZ_TYPE_TONE[name] || BIZ_TYPE_TONE["협력"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: "var(--r-sm)",
      fontSize: 11.5, fontWeight: 600, lineHeight: 1.6,
      whiteSpace: "nowrap",
    }}>{name}</span>
  );
};

/* =========================================================
   확도 chip — 우세 / 경쟁 / 열세 / 확보 / "-"
   ========================================================= */
const CERTAINTY_TONE = {
  "우세": { fg: "#047857",          bg: "var(--ok-bg)",     line: "var(--ok-line)" },
  "경쟁": { fg: "#b45309",          bg: "var(--warn-bg)",   line: "var(--warn-line)" },
  "열세": { fg: "var(--crit)",      bg: "var(--crit-bg)",   line: "var(--crit-line)" },
  "확보": { fg: "var(--brand-700)", bg: "var(--brand-bg)",  line: "var(--brand-line)" },
};
const CertaintyChip = ({ value }) => {
  if (!value || value === "-") {
    return <span style={{ color: "var(--tx-5)" }}>-</span>;
  }
  const t = CERTAINTY_TONE[value];
  if (!t) return <span style={{ color: "var(--tx-3)" }}>{value}</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: "var(--r-sm)",
      fontSize: 11.5, fontWeight: 600, lineHeight: 1.6,
    }}>{value}</span>
  );
};

/* =========================================================
   필드 — Select / Input
   ========================================================= */
const fieldLabel = { fontSize: 12, color: "var(--tx-4)", fontWeight: 600, marginBottom: 6, display: "block" };
const selectStyle = {
  height: 38, padding: "0 32px 0 12px",
  border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
  background: "var(--bg-1)",
  fontSize: 13.5, color: "var(--tx-1)", fontWeight: 500,
  appearance: "none",
  width: "100%",
  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

const FieldSelect = ({ label, options, value, onChange }) => (
  <div style={{ minWidth: 0, flex: 1 }}>
    <span style={fieldLabel}>{label}</span>
    <select style={selectStyle} value={value} onChange={(e) => onChange?.(e.target.value)}>
      {options.map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  </div>
);

const FieldInput = ({ label, placeholder, value, onChange }) => (
  <div style={{ minWidth: 0, flex: 2 }}>
    <span style={fieldLabel}>{label}</span>
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      height: 38, padding: "0 12px",
      border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
      background: "var(--bg-1)",
    }}>
      <Icon name="search" size={15} stroke={1.8} style={{ color: "var(--tx-5)" }} />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          border: 0, outline: "none", background: "transparent",
          flex: 1, font: "inherit", fontSize: 13.5, color: "var(--tx-1)",
        }}
      />
    </div>
  </div>
);

/* =========================================================
   FilterBar — 시안: 상태 / 영업대표 / 사용여부 / 검색어
   ========================================================= */
const FilterBar = ({ filterOptions, statusFilter, onStatusFilter, owners }) => {
  const statusOpts = [
    { value: "all", label: "전체" },
    ...Object.keys(STATUS_LABEL).map((c) => ({ value: c, label: STATUS_LABEL[c] })),
  ];
  const ownerOpts  = ["전체", ...owners];
  const useOpts    = ["전체", "사용", "미사용"];

  return (
    <section className="pmo-panel" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 16, alignItems: "flex-end" }}>
        <FieldSelect label="상태" options={statusOpts} value={statusFilter}
          onChange={(v) => onStatusFilter?.(v)} />
        <FieldSelect label="영업대표" options={ownerOpts} value="전체" onChange={() => {}} />
        <FieldSelect label="사용여부" options={useOpts} value="전체" onChange={() => {}} />
        <FieldInput  label="검색어" placeholder="프로젝트코드, 프로젝트명 검색"
          value="" onChange={() => {}} />
      </div>
    </section>
  );
};

/* =========================================================
   상태별 요약 카드 (8개)
   ========================================================= */
const StatusCard = ({ s, active, onClick }) => {
  const t = STATUS_CARD_TONE[s.code];
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="pmo-panel"
      style={{
        padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14,
        border: active ? `1.5px solid ${t.fg}` : "1px solid var(--line-2)",
        background: active ? t.bg : "var(--bg-1)",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color .12s, background .12s, transform .12s",
        minHeight: 88,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = t.line; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--line-2)"; }}
    >
      <span style={{
        width: 44, height: 44, borderRadius: 10,
        background: active ? "var(--bg-1)" : t.bg, color: t.fg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flex: "0 0 auto",
      }}>
        {React.cloneElement(STATUS_SVG[s.code], { width: 22, height: 22 })}
      </span>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 4 }}>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>{s.label}</span>
        <span style={{
          fontSize: 24, lineHeight: 1.05, fontWeight: 700, color: "var(--tx-1)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {s.value}
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{s.unit}</span>
        </span>
      </div>
    </button>
  );
};

const StatusCardGrid = ({ summary, statusFilter, onStatusFilter }) => (
  <section style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  }}>
    {summary.map((s) => (
      <StatusCard
        key={s.id}
        s={s}
        active={statusFilter === s.code}
        onClick={() => onStatusFilter(statusFilter === s.code ? "all" : s.code)}
      />
    ))}
  </section>
);

/* =========================================================
   목록 표
   ========================================================= */
const HeaderCell = ({ children, align = "center", width }) => (
  <th style={{ textAlign: align, width }}>{children}</th>
);

const fmtDate = (s) => (s && s !== "-" ? s : "-");

/* 사용여부 chip — '사용' / '미사용' */
const UseChip = ({ value }) => {
  const on = value !== "미사용";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px",
      background: on ? "var(--ok-bg)" : "var(--bg-subtle)",
      color:      on ? "#047857"     : "var(--tx-4)",
      border: `1px solid ${on ? "var(--ok-line)" : "var(--line-2)"}`,
      borderRadius: "var(--r-sm)",
      fontSize: 11.5, fontWeight: 600, lineHeight: 1.6,
    }}>{value || "사용"}</span>
  );
};

/* 작업 셀 — '보기' + 드롭다운 */
const ViewMenu = () => (
  <div style={{ display: "inline-flex", alignItems: "center" }}>
    <button style={{
      height: 26, padding: "0 12px",
      border: "1px solid var(--line-2)",
      borderRight: 0,
      borderRadius: "6px 0 0 6px",
      background: "var(--bg-1)", color: "var(--tx-2)",
      fontSize: 12, fontWeight: 600,
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-3)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-1)"}>보기</button>
    <button title="더 보기" style={{
      width: 26, height: 26, padding: 0,
      border: "1px solid var(--line-2)", borderRadius: "0 6px 6px 0",
      background: "var(--bg-1)", color: "var(--tx-4)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-3)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-1)"}>
      <Icon name="chevronDown" size={12} stroke={2} />
    </button>
  </div>
);

const ProjectTable = ({ rows, totalCount, statusFilter }) => {
  const filtered = statusFilter === "all"
    ? rows
    : rows.filter((r) => r.status === statusFilter);

  return (
    <section className="pmo-panel" style={{ padding: 0, overflow: "hidden" }}>
      {/* table header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--line-2)",
      }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--tx-1)" }}>
          프로젝트코드 목록
        </h2>
        <span style={{ fontSize: 12.5, color: "var(--tx-4)" }}>
          검색결과 <span style={{ color: "var(--tx-1)", fontWeight: 700 }}>{totalCount}</span>건
          {statusFilter !== "all" && (
            <span style={{ marginLeft: 10 }}>
              <StatusBadge code={statusFilter} />
            </span>
          )}
        </span>
      </header>

      {/* table */}
      <div style={{ overflowX: "auto" }}>
        <table className="pmo-table">
          <thead>
            <tr>
              <HeaderCell width={108}>프로젝트코드</HeaderCell>
              <HeaderCell>프로젝트명</HeaderCell>
              <HeaderCell width={88}>상태</HeaderCell>
              <HeaderCell width={70}>확도</HeaderCell>
              <HeaderCell width={120}>영업부서</HeaderCell>
              <HeaderCell width={92}>영업대표</HeaderCell>
              <HeaderCell width={100}>제안PM</HeaderCell>
              <HeaderCell width={108}>시작일</HeaderCell>
              <HeaderCell width={108}>종료일</HeaderCell>
              <HeaderCell width={84}>사용여부</HeaderCell>
              <HeaderCell width={64}>비고</HeaderCell>
              <HeaderCell width={104}>작업</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: "60px 20px", textAlign: "center", color: "var(--tx-4)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <Icon name="search" size={28} stroke={1.5} style={{ color: "var(--tx-5)" }} />
                    <span style={{ fontWeight: 600, color: "var(--tx-3)" }}>해당 조건의 프로젝트 코드가 없습니다.</span>
                    <span style={{ fontSize: 12 }}>필터를 초기화하거나 다른 상태를 선택해 보세요.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.code}>
                  <td className="num" style={{ textAlign: "center", color: "var(--brand-700)", fontWeight: 600, fontFamily: "var(--font-num)" }}>{r.code}</td>
                  <td className="name" style={{ textAlign: "center" }}>{r.name}</td>
                  <td style={{ textAlign: "center" }}><StatusBadge code={r.status} /></td>
                  <td style={{ textAlign: "center" }}><CertaintyChip value={r.certainty} /></td>
                  <td style={{ textAlign: "center" }}>{r.salesDept}</td>
                  <td style={{ textAlign: "center" }}>{r.salesOwner}</td>
                  <td style={{ textAlign: "center" }}>{r.supportLead}</td>
                  <td className="num" style={{ textAlign: "center" }}>{fmtDate(r.fromDate)}</td>
                  <td className="num" style={{ textAlign: "center" }}>{fmtDate(r.toDate)}</td>
                  <td style={{ textAlign: "center" }}><UseChip value={r.useStatus} /></td>
                  <td style={{ textAlign: "center", color: "var(--tx-5)" }}>{r.note || "-"}</td>
                  <td style={{ textAlign: "center" }}><ViewMenu /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

/* =========================================================
   페이지네이션 — 시안 형식 (« ‹ 1..5 … 13 › »)
   ========================================================= */
const Pagination = ({ pagination }) => {
  const { currentPage, totalPages } = pagination;
  const [page, setPage] = React.useState(currentPage);

  const navBtn = (active = false, disabled = false) => ({
    minWidth: 34, height: 34, padding: "0 8px",
    border: "1px solid var(--line-2)", borderRadius: 6,
    background: active ? "var(--brand)" : "var(--bg-1)",
    color: active ? "#fff" : (disabled ? "var(--tx-5)" : "var(--tx-2)"),
    borderColor: active ? "var(--brand)" : "var(--line-2)",
    fontSize: 13, fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const pages = [1, 2, 3, 4, 5];
  const go = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

  return (
    <footer style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
      padding: "20px 4px 0", marginTop: 4,
    }}>
      <span />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button style={navBtn(false, page === 1)} onClick={() => go(1)}        title="맨 앞">«</button>
        <button style={navBtn(false, page === 1)} onClick={() => go(page - 1)} title="이전">‹</button>
        {pages.map((p) => (
          <button key={p} style={navBtn(p === page)} onClick={() => go(p)}>{p}</button>
        ))}
        <span style={{ color: "var(--tx-5)", padding: "0 6px", fontWeight: 600 }}>…</span>
        <button style={navBtn(page === totalPages)} onClick={() => go(totalPages)}>{totalPages}</button>
        <button style={navBtn(false, page === totalPages)} onClick={() => go(page + 1)}        title="다음">›</button>
        <button style={navBtn(false, page === totalPages)} onClick={() => go(totalPages)}      title="맨 뒤">»</button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <select style={{ ...selectStyle, height: 34, fontSize: 13, width: 130 }} defaultValue="10">
          <option value="10">10개씩 보기</option>
          <option value="20">20개씩 보기</option>
          <option value="50">50개씩 보기</option>
          <option value="100">100개씩 보기</option>
        </select>
      </div>
    </footer>
  );
};

/* =========================================================
   Page root
   ========================================================= */
const CodePage = ({ data }) => {
  const [statusFilter, setStatusFilter] = React.useState("all");

  return (
    <AppShell
      user={data.meta.user}
      notifications={data.meta.notifications}
      current="code"
      pageTitle="프로젝트코드"
    >
      <FilterBar
        filterOptions={data.filterOptions}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        owners={Array.from(new Set(data.rows.map((r) => r.salesOwner)))}
      />

      <StatusCardGrid
        summary={data.summary}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      <ProjectTable
        rows={data.rows}
        totalCount={data.pagination.totalCount}
        statusFilter={statusFilter}
      />

      <Pagination pagination={data.pagination} />
    </AppShell>
  );
};

window.CodePage = CodePage;
