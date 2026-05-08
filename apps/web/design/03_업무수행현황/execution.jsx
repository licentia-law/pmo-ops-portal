/* PMO · execution.jsx — 03 업무수행현황 (운영 원장)
   list-detail 패턴 · 좌 표 + 우 선택 프로젝트 상세 패널
*/

/* =========================================================
   Atom: BusinessTypeChip — 4종 사업유형
   ========================================================= */
const BIZ_CHIP = {
  "주사업": { fg: "var(--brand-700)", bg: "var(--brand-bg)", ln: "var(--brand-line)" },
  "부사업": { fg: "var(--info)",      bg: "var(--info-bg)",  ln: "var(--info-line)" },
  "하도":   { fg: "var(--warn)",      bg: "var(--warn-bg)",  ln: "var(--warn-line)" },
  "협력":   { fg: "var(--tx-3)",      bg: "var(--bg-3)",     ln: "var(--line-2)" },
};
const BusinessTypeChip = ({ type }) => {
  const t = BIZ_CHIP[type] || BIZ_CHIP["협력"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: "var(--r-sm)",
      fontSize: "var(--t-cap)", fontWeight: "var(--w-sem)",
      color: t.fg, background: t.bg,
      border: `1px solid ${t.ln}`, lineHeight: 1.4,
    }}>{type}</span>
  );
};

/* =========================================================
   Filter bar — 2 rows
   ========================================================= */
const fieldLabel = {
  fontSize: "var(--t-cap)", color: "var(--tx-4)",
  fontWeight: 600, marginBottom: 6, display: "block",
};
const fieldStyle = {
  width: "100%", height: 36,
  background: "var(--bg-1)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  padding: "0 12px",
  fontSize: 13.5, color: "var(--tx-2)",
  fontFamily: "var(--font-ui)",
  outline: "none",
};
const Select = ({ label, options, value, onChange }) => (
  <label style={{ display: "block" }}>
    <span style={fieldLabel}>{label}</span>
    <select style={fieldStyle} value={value} onChange={(e) => onChange?.(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);
const DateField = ({ value, onChange }) => (
  <input type="date" style={fieldStyle} value={value || ""}
    onChange={(e) => onChange?.(e.target.value)} />
);

const FilterBar = ({ filters }) => {
  const [hq, setHq] = React.useState(filters.headquarters[0]);
  const teamOptions = filters.teams || ["전체", "PMO1팀", "PMO2팀", "기술지원팀"];
  const [tm, setTm] = React.useState(teamOptions[0]);
  const [bt, setBt] = React.useState(filters.businessTypes[0]);
  const [st, setSt] = React.useState(filters.statuses[0]);
  const [pm, setPm] = React.useState(filters.leadPms[0]);
  const [so, setSo] = React.useState(filters.salesOwners[0]);
  const [from, setFrom] = React.useState(filters.from);
  const [to, setTo] = React.useState(filters.to);
  const [q, setQ] = React.useState("");

  return (
    <section className="pmo-panel" style={{ padding: 16, marginBottom: 16 }}>
      {/* Row 1 — 6 selects (본부 → 팀 → 사업유형 → 상태 → 총괄PM → 영업대표) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
        <Select label="본부"     options={filters.headquarters} value={hq} onChange={setHq} />
        <Select label="팀"       options={teamOptions} value={tm} onChange={setTm} />
        <Select label="사업유형" options={filters.businessTypes} value={bt} onChange={setBt} />
        <Select label="상태"     options={filters.statuses} value={st} onChange={setSt} />
        <Select label="총괄PM"   options={filters.leadPms} value={pm} onChange={setPm} />
        <Select label="영업대표" options={filters.salesOwners} value={so} onChange={setSo} />
      </div>
      {/* Row 2 — period + search + actions */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
        <div style={{ flex: "0 0 auto", minWidth: 280 }}>
          <span style={fieldLabel}>기간 (제안접수 기준)</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DateField value={from} onChange={setFrom} />
            <span style={{ color: "var(--tx-5)", fontSize: 13 }}>~</span>
            <DateField value={to} onChange={setTo} />
          </div>
        </div>
        <label style={{ flex: 1 }}>
          <span style={fieldLabel}>검색어</span>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 36, padding: "0 12px",
            border: "1px solid var(--line-2)", borderRadius: "var(--r-md)",
            background: "var(--bg-1)",
          }}>
            <Icon name="search" size={15} stroke={1.8} style={{ color: "var(--tx-5)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="프로젝트명, 코드, PM, 메모 검색"
              style={{
                flex: 1, height: "100%", border: 0, outline: "none",
                background: "transparent", fontSize: 13.5, color: "var(--tx-1)",
                fontFamily: "var(--font-ui)",
              }} />
          </div>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pmo-btn-primary pmo-btn">
            <Icon name="search" size={14} stroke={2} />
            조회
          </button>
          <button className="pmo-btn">초기화</button>
          <button className="pmo-btn">
            <Icon name="report" size={14} stroke={1.8} />
            엑셀 내보내기
          </button>
          <button className="pmo-btn-primary pmo-btn">
            <span style={{ fontSize: 14, lineHeight: 1, marginRight: 2 }}>＋</span>
            신규 프로젝트 등록
          </button>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   Summary card — uses bespoke inline SVGs to match the spec
   ========================================================= */
const TONE_PRESET = {
  blueSolid:   { fg: "#fff",     bg: "#3b6df0" },           // 전체 — solid filled
  purpleSoft:  { fg: "#7c3aed",  bg: "#ede5fd" },           // 제안중
  greenSoft:   { fg: "#16a34a",  bg: "#dcf2e3" },           // 수행중
  amberSolid:  { fg: "#fff",     bg: "#f08c1f" },           // 종료
};
const InfoDot = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8.2" r="0.6" fill="currentColor" />
  </svg>
);
const SummaryGlyph = ({ kind }) => {
  // returns a 56×56 glyph with bespoke svg per kind
  const presets = {
    all:      TONE_PRESET.blueSolid,
    proposal: TONE_PRESET.purpleSoft,
    running:  TONE_PRESET.greenSoft,
    closed:   TONE_PRESET.amberSolid,
  };
  const t = presets[kind] || TONE_PRESET.blueSolid;
  return (
    <span style={{
      width: 56, height: 56, borderRadius: 14,
      background: t.bg, color: t.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flex: "0 0 auto",
    }}>
      {kind === "all" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      )}
      {kind === "proposal" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.5 4.5l5 5L8 21H3v-5z" />
          <path d="M13 6l5 5" />
        </svg>
      )}
      {kind === "running" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      )}
      {kind === "closed" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </span>
  );
};

const SummaryCard = ({ item, active, onClick }) => {
  return (
    <button onClick={onClick} className="pmo-panel"
      style={{
        textAlign: "left", padding: "20px 22px",
        background: active ? "var(--brand-bg)" : "var(--bg-1)",
        borderColor: active ? "var(--brand-line)" : "var(--line-2)",
        boxShadow: active ? "var(--sh-card), 0 0 0 1px var(--brand-line)" : "var(--sh-card)",
        display: "flex", flexDirection: "column", gap: 12,
        minHeight: 132, cursor: "pointer",
        transition: "background .12s, border-color .12s",
        border: "1px solid var(--line-2)",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SummaryGlyph kind={item.id} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: "var(--tx-3)", fontWeight: 600 }}>{item.label}</span>
          <span style={{
            fontSize: 30, lineHeight: 1, fontWeight: 700,
            color: "var(--tx-1)", fontVariantNumeric: "tabular-nums",
            fontFamily: "var(--font-num)",
          }}>
            {item.value}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{item.unit}</span>
          </span>
        </div>
      </div>
      <div style={{
        marginTop: "auto", paddingTop: 8,
        fontSize: 12.5, color: "var(--tx-4)", lineHeight: 1.5,
        fontVariantNumeric: "tabular-nums",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {item.breakdown ? (
          <span>
            {item.breakdown.map((b, i) => (
              <React.Fragment key={b.code}>
                <span style={{ color: "var(--tx-3)", fontWeight: 500 }}>{b.label}</span>
                {i < item.breakdown.length - 1 && <span style={{ margin: "0 6px", color: "var(--tx-5)" }}>·</span>}
              </React.Fragment>
            ))}
          </span>
        ) : item.subline ? (
          <span title={item.subline.note}>
            <span style={{ color: "var(--tx-3)", fontWeight: 500 }}>{item.subline.label}</span>
            <span style={{ marginLeft: 4, color: "var(--tx-2)", fontWeight: 700, fontFamily: "var(--font-num)" }}>{item.subline.value}</span>
            <span style={{ color: "var(--tx-5)", fontWeight: 500, marginLeft: 1 }}>건</span>
            <span style={{ marginLeft: 6, color: "var(--tx-5)" }}>· 수행중에 미포함</span>
          </span>
        ) : (
          <span>{item.hint || "전체 등록 프로젝트"}</span>
        )}
        <span style={{ color: "var(--tx-5)", marginLeft: "auto", display: "inline-flex" }}>
          <InfoDot />
        </span>
      </div>
    </button>
  );
};

/* =========================================================
   Table
   ========================================================= */
const COLS = [
  { key: "code",      label: "프로젝트코드", w: 110, sticky: true, num: true },
  { key: "name",      label: "사업명",       w: 200 },
  { key: "type",      label: "사업유형",     w: 80 },
  { key: "status",    label: "상태",         w: 84 },
  { key: "amount",    label: "사업금액",     w: 90, num: true, alignRight: true },
  { key: "leadPm",    label: "총괄PM",       w: 80 },
  { key: "sales",     label: "영업대표",     w: 80 },
  { key: "leadDept",  label: "총괄부서",     w: 110 },
  { key: "start",     label: "시작일",       w: 100, num: true },
  { key: "end",       label: "완료일",       w: 100, num: true },
  { key: "memo",      label: "메모",         w: 160, ellipsis: true },
  { key: "modifier",  label: "수정자",       w: 80 },
  { key: "action",    label: "작업",         w: 80, alignCenter: true },
];

const TableCell = ({ col, children, selected }) => {
  const base = {
    padding: "12px 14px",
    borderBottom: "1px solid var(--line-1)",
    fontSize: "var(--t-sm)",
    color: "var(--tx-2)",
    background: selected ? "var(--brand-bg)" : "transparent",
    whiteSpace: "nowrap",
    overflow: col.ellipsis ? "hidden" : "visible",
    textOverflow: col.ellipsis ? "ellipsis" : "clip",
    maxWidth: col.ellipsis ? col.w : undefined,
    fontVariantNumeric: col.num ? "tabular-nums" : undefined,
    textAlign: col.alignRight ? "right" : col.alignCenter ? "center" : "left",
    fontFamily: col.num ? "var(--font-num)" : "var(--font-ui)",
  };
  if (col.sticky) {
    Object.assign(base, {
      position: "sticky", left: 0, zIndex: 1,
      background: selected ? "var(--brand-bg)" : "var(--bg-1)",
      borderRight: "1px solid var(--line-1)",
    });
  }
  return <td style={base}>{children}</td>;
};
const TableHead = () => (
  <thead>
    <tr>
      {COLS.map((c) => (
        <th key={c.key} style={{
          padding: "11px 14px",
          fontSize: "var(--t-cap)",
          fontWeight: "var(--w-sem)",
          color: "var(--tx-4)",
          background: "var(--bg-3)",
          textAlign: c.alignRight ? "right" : c.alignCenter ? "center" : "left",
          borderTop: "1px solid var(--line-1)",
          borderBottom: "1px solid var(--line-1)",
          whiteSpace: "nowrap",
          position: c.sticky ? "sticky" : "static",
          left: c.sticky ? 0 : undefined,
          zIndex: c.sticky ? 2 : 1,
          minWidth: c.w,
        }}>{c.label}</th>
      ))}
    </tr>
  </thead>
);

const Pagination = ({ pageSize, totalCount, current, totalPages, onChange, onPageSizeChange }) => {
  // window: 1..5 always shown if totalPages >= 5; then ellipsis; last
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("…");
    pages.push(totalPages);
  }

  const btn = (active, disabled) => ({
    minWidth: 32, height: 32, padding: "0 10px",
    border: `1px solid ${active ? "var(--brand)" : "var(--line-2)"}`,
    borderRadius: "var(--r-md)",
    background: active ? "var(--brand)" : "var(--bg-1)",
    color: active ? "#fff" : "var(--tx-2)",
    fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "var(--font-num)",
    fontVariantNumeric: "tabular-nums",
  });
  const arrow = (disabled) => ({
    width: 32, height: 32,
    border: "1px solid var(--line-2)",
    borderRadius: "var(--r-md)",
    background: "var(--bg-1)",
    color: "var(--tx-3)",
    fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  });

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
      padding: "16px 18px", borderTop: "1px solid var(--line-1)", gap: 12,
    }}>
      <div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button style={arrow(current === 1)} disabled={current === 1} onClick={() => onChange(1)} aria-label="처음">«</button>
        <button style={arrow(current === 1)} disabled={current === 1} onClick={() => onChange(current - 1)} aria-label="이전">‹</button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} style={{ color: "var(--tx-5)", padding: "0 4px", fontSize: 13 }}>…</span>
          ) : (
            <button key={p} style={btn(p === current)} onClick={() => onChange(p)}>{p}</button>
          )
        )}
        <button style={arrow(current === totalPages)} disabled={current === totalPages} onClick={() => onChange(current + 1)} aria-label="다음">›</button>
        <button style={arrow(current === totalPages)} disabled={current === totalPages} onClick={() => onChange(totalPages)} aria-label="마지막">»</button>
      </div>
      <div style={{ justifySelf: "end" }}>
        <select onChange={(e) => onPageSizeChange?.(+e.target.value)} defaultValue={pageSize}
          style={{ ...fieldStyle, height: 32, width: 116, fontSize: 13 }}>
          <option value={10}>10개씩 보기</option>
          <option value={20}>20개씩 보기</option>
          <option value={50}>50개씩 보기</option>
        </select>
      </div>
    </div>
  );
};

const RowMenu = () => (
  <button aria-label="더보기" style={{
    width: 26, height: 26, border: 0, borderRadius: 6,
    background: "transparent", color: "var(--tx-4)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  }}
    onClick={(e) => e.stopPropagation()}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-3)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
    <span style={{ fontSize: 16, lineHeight: 0.5, letterSpacing: 1 }}>⋮</span>
  </button>
);

const ProjectTable = ({ rows, totalCount, pagination, selectedCode, onSelect, activeFilter }) => {
  const [page, setPage] = React.useState(pagination.currentPage);
  const [pageSize, setPageSize] = React.useState(pagination.pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section className="pmo-panel" style={{ overflow: "hidden" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--line-2)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="pmo-section-title" style={{ margin: 0 }}>프로젝트 목록</h2>
          <span style={{ fontSize: 13, color: "var(--tx-4)" }}>
            총 <span style={{ color: "var(--tx-2)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totalCount}</span>건
            {activeFilter && (
              <>
                {" · "}
                <span style={{ color: "var(--brand)", fontWeight: 600 }}>필터: {activeFilter}</span>
              </>
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--tx-4)" }}>표시 항목:</span>
          <select defaultValue="기본"
            style={{ ...fieldStyle, height: 32, width: 92, fontSize: 13 }}>
            <option>기본</option>
            <option>전체</option>
            <option>최소</option>
          </select>
          <button className="pmo-btn" style={{ height: 32, padding: "0 12px", fontSize: 13 }}>
            <Icon name="settings" size={13} stroke={1.7} />
            설정
          </button>
        </div>
      </header>

      <div style={{ overflowX: "auto" }}>
        <table className="pmo-table" style={{ minWidth: 1280 }}>
          <TableHead />
          <tbody>
            {rows.map((r) => {
              const selected = r.code === selectedCode;
              return (
                <tr key={r.code} onClick={() => onSelect(r)}
                  style={{
                    cursor: "pointer",
                    background: selected ? "var(--brand-bg)" : undefined,
                  }}
                  onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "var(--bg-2)"; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = ""; }}>
                  <TableCell col={COLS[0]} selected={selected}>
                    <span style={{ color: "var(--brand)", fontWeight: 600 }}>{r.code}</span>
                  </TableCell>
                  <TableCell col={COLS[1]} selected={selected}>
                    <span style={{ color: "var(--tx-1)", fontWeight: 600 }}>{r.name}</span>
                  </TableCell>
                  <TableCell col={COLS[2]} selected={selected}>
                    <BusinessTypeChip type={r.businessType} />
                  </TableCell>
                  <TableCell col={COLS[3]} selected={selected}>
                    <StatusBadge code={r.status} />
                  </TableCell>
                  <TableCell col={COLS[4]} selected={selected}>
                    <span style={{ color: r.amountText === "-" ? "var(--tx-5)" : "var(--tx-2)" }}>{r.amountText}</span>
                  </TableCell>
                  <TableCell col={COLS[5]} selected={selected}>{r.leadPm}</TableCell>
                  <TableCell col={COLS[6]} selected={selected}>{r.salesOwner}</TableCell>
                  <TableCell col={COLS[7]} selected={selected}>{r.leadDept}</TableCell>
                  <TableCell col={COLS[8]} selected={selected}>{r.startDate}</TableCell>
                  <TableCell col={COLS[9]} selected={selected}>
                    <span style={{ color: r.endDate === "-" ? "var(--tx-5)" : "var(--tx-2)" }}>{r.endDate}</span>
                  </TableCell>
                  <TableCell col={COLS[10]} selected={selected}>
                    <span title={r.remark} style={{ color: "var(--tx-3)" }}>{r.remark}</span>
                  </TableCell>
                  <TableCell col={COLS[11]} selected={selected}>
                    <span>{r.modifier}</span>
                    <div style={{ fontSize: 11, color: "var(--tx-5)", fontFamily: "var(--font-num)" }}>{r.modifiedAt}</div>
                  </TableCell>
                  <TableCell col={COLS[12]} selected={selected}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); onSelect(r); }} style={{
                        height: 26, padding: "0 10px",
                        border: "1px solid var(--line-2)", borderRadius: 6,
                        background: "var(--bg-1)", color: "var(--brand)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>상세</button>
                      <RowMenu />
                    </div>
                  </TableCell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        pageSize={pageSize} totalCount={totalCount}
        current={page} totalPages={totalPages}
        onChange={setPage}
        onPageSizeChange={setPageSize} />
    </section>
  );
};

/* =========================================================
   Right panel — selected project DETAIL (per spec image)
   ========================================================= */
const DetailRow = ({ label, children, num, alignTop }) => (
  <div style={{
    display: "flex", alignItems: alignTop ? "flex-start" : "center",
    padding: "10px 0", gap: 16,
  }}>
    <span style={{
      fontSize: 13, color: "var(--tx-1)", fontWeight: 700,
      width: 84, flex: "0 0 auto",
    }}>{label}</span>
    <span style={{
      fontSize: 13, color: "var(--tx-2)", fontWeight: 500,
      flex: 1, lineHeight: 1.55,
      fontFamily: num ? "var(--font-num)" : "var(--font-ui)",
      fontVariantNumeric: num ? "tabular-nums" : undefined,
      whiteSpace: "pre-line",
    }}>{children}</span>
  </div>
);

const DetailDivider = () => (
  <div style={{ borderTop: "1px solid var(--line-2)", margin: "4px 0" }}></div>
);

const DetailSection = ({ title, children }) => (
  <div style={{ marginTop: 14 }}>
    <div style={{
      fontSize: 14, color: "var(--tx-1)", fontWeight: 700,
      letterSpacing: -0.2, marginBottom: 4,
    }}>{title}</div>
    {children}
  </div>
);

const SelectedDetailPanel = ({ row, base, onClose }) => {
  // Always render base (선택된 행 정보를 base 정보와 함께 보여줌)
  const merged = row.code === base.code
    ? base
    : {
        ...base,
        code: row.code, name: row.name,
        leadPm: row.leadPm, presentPm: base.presentPm,
        period: `${row.startDate} ~ ${row.endDate}`,
        status: row.status, businessType: row.businessType,
        amountText: row.amountText,
      };

  return (
    <aside className="pmo-panel" style={{
      padding: "20px 22px",
      position: "sticky", top: "calc(var(--header-h) + 16px)",
      alignSelf: "start",
    }}>
      {/* header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <h2 style={{
          margin: 0, fontSize: 16, fontWeight: 700,
          color: "var(--tx-1)", letterSpacing: -0.2,
        }}>선택 프로젝트 상세</h2>
        <button onClick={onClose} aria-label="닫기" style={{
          width: 28, height: 28, border: 0, borderRadius: 6,
          background: "transparent", color: "var(--tx-4)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-3)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>×</button>
      </header>

      {/* code → name */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600, marginBottom: 2 }}>프로젝트코드</div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: "var(--brand)",
          fontFamily: "var(--font-num)", letterSpacing: 0.2,
        }}>{merged.code}</div>
      </div>
      <div style={{ marginTop: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600, marginBottom: 2 }}>사업명</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-1)" }}>{merged.name}</div>
      </div>

      <DetailDivider />

      <DetailRow label="총괄PM">{merged.leadPm}</DetailRow>
      <DetailRow label="발표PM">{merged.presentPm}</DetailRow>
      <DetailRow label="제안팀" alignTop>{merged.team}</DetailRow>

      <DetailDivider />

      <DetailRow label="프로젝트 기간" num>{merged.period}</DetailRow>
      <DetailRow label="상태"><StatusBadge code={merged.status} /></DetailRow>
      <DetailRow label="사업유형"><BusinessTypeChip type={merged.businessType} /></DetailRow>
      <DetailRow label="총 사업금액" num>
        <span style={{ fontWeight: 700 }}>{merged.amountText}</span>
      </DetailRow>

      <DetailDivider />

      <DetailSection title="제출 일정">
        <DetailRow label="일시" num>{merged.submission.datetime}</DetailRow>
        <DetailRow label="형식">{merged.submission.format}</DetailRow>
        <DetailRow label="비고">{merged.submission.note}</DetailRow>
      </DetailSection>

      <DetailDivider />

      <DetailSection title="발표 일정">
        <DetailRow label="일시" num>{merged.presentation.datetime}</DetailRow>
        <DetailRow label="형식">{merged.presentation.format}</DetailRow>
        <DetailRow label="비고">{merged.presentation.note}</DetailRow>
      </DetailSection>

      <DetailDivider />

      <DetailRow label="공고번호" num>{merged.rfpNo}</DetailRow>
      <DetailRow label="공고일" num>{merged.rfpDate}</DetailRow>

      <DetailDivider />

      {/* 최근 활동 */}
      <DetailSection title="최근 활동">
        <div style={{
          fontSize: 12, color: "var(--tx-4)", fontWeight: 600,
          fontFamily: "var(--font-num)", marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}>{merged.recentActivity.datetime}</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: "var(--tx-2)", fontSize: 13, lineHeight: 1.7 }}>
          {merged.recentActivity.lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </DetailSection>

      <DetailDivider />

      {/* 참고 메모 */}
      <DetailSection title="참고 메모">
        {merged.memo.map((line, i) => (
          <div key={i} style={{
            fontSize: 13, color: "var(--tx-2)",
            lineHeight: 1.6, padding: "2px 0",
          }}>{line}</div>
        ))}
      </DetailSection>

      {/* button */}
      <button className="pmo-btn-primary pmo-btn" style={{
        width: "100%", height: 42, marginTop: 18,
        justifyContent: "center", fontSize: 13.5, gap: 6,
      }}>
        프로젝트 상세 보기
        <Icon name="arrowRight" size={14} stroke={2} />
      </button>
    </aside>
  );
};

/* =========================================================
   Page root
   ========================================================= */
const ExecutionPage = ({ data }) => {
  const [selected, setSelected] = React.useState(
    data.rows.find((r) => r.code === data.selectedRow.code) || data.rows[0]
  );
  const [activeSummary, setActiveSummary] = React.useState(null);
  const [panelOpen, setPanelOpen] = React.useState(true);

  const summaryFilterLabel = activeSummary ? data.summary.find((s) => s.id === activeSummary)?.label : null;

  return (
    <AppShell user={data.meta.user} notifications={data.meta.notifications}
      current="execution" pageTitle="업무수행현황">

      <FilterBar filters={data.filters} />

      {/* Summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12, marginBottom: 16,
      }}>
        {data.summary.map((s) => (
          <SummaryCard key={s.id} item={s}
            active={activeSummary === s.id}
            onClick={() => setActiveSummary(activeSummary === s.id ? null : s.id)} />
        ))}
      </div>

      {/* 2-col body */}
      <div style={{
        display: "grid",
        gridTemplateColumns: panelOpen ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)",
        gap: 16, alignItems: "start",
      }}>
        <ProjectTable
          rows={data.rows}
          totalCount={data.pagination.totalCount}
          pagination={data.pagination}
          selectedCode={selected.code}
          onSelect={(r) => { setSelected(r); setPanelOpen(true); }}
          activeFilter={summaryFilterLabel} />

        {panelOpen && (
          <SelectedDetailPanel row={selected} base={data.selectedRow}
            onClose={() => setPanelOpen(false)} />
        )}
      </div>
    </AppShell>
  );
};

Object.assign(window, { ExecutionPage });
