/* PMO · history.jsx — 진행이력 (본부 단위 타임라인)
   - Filter bar (프로젝트 / 이력 유형 / 작성자 / 기간 + presets / 검색어)
   - 요약 카드 4장 (전체 이력 / 최근 7일 등록 / 최근 7일 상태 변경 / 활성 프로젝트)
   - 좌(2/3): 진행 이력 목록 표 + 페이지네이션
   - 우(1/3): 최근 상태 변경 / 프로젝트별 이력 건수 / 선택 이력 상세
*/

/* ----- inline SVGs (avoid extending _shared ICONS for page-local icons) ----- */
const exchangeSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h13l-3-3" /><path d="M20 17H7l3 3" />
  </svg>
);
const reportSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    <path d="M8 9h6M8 13h8M8 17h5" />
  </svg>
);
const calSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="6" width="16" height="14" rx="1" /><path d="M4 10h16M8 4v3M16 4v3" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);
const briefcaseSvg = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
  </svg>
);

const TONE_BG = {
  blue:   { fg: "#2563eb", bg: "#e3eefe" },
  green:  { fg: "#16a34a", bg: "#dcf2e3" },
  purple: { fg: "#7c3aed", bg: "#ede5fd" },
  amber:  { fg: "#b45309", bg: "#fef4e1" },
};
const BigToneIcon = ({ tone, children }) => {
  const t = TONE_BG[tone] || TONE_BG.blue;
  return (
    <span style={{
      width: 48, height: 48, borderRadius: 12,
      background: t.bg, color: t.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flex: "0 0 auto",
    }}>{children}</span>
  );
};

/* ---------- 카테고리(이력 유형) chip ---------- */
const CAT_TONE = {
  "상태 변경":      { bg: "var(--ok-bg)",      fg: "#15803d",          line: "var(--ok-line)" },
  "투입 인력 변경": { bg: "var(--info-bg)",    fg: "var(--info)",      line: "var(--info-line)" },
  "발표 일정 등록": { bg: "var(--warn-bg)",    fg: "#b45309",          line: "var(--warn-line)" },
  "진행 메모":      { bg: "#fef3c7",           fg: "#92400e",          line: "#fde68a" },
  "업무지정 등록":  { bg: "var(--brand-bg)",   fg: "var(--brand-700)", line: "var(--brand-line)" },
  "일정 변경":      { bg: "#f3e8ff",           fg: "#7c3aed",          line: "#e9d5ff" },
  "이슈":           { bg: "var(--crit-bg)",    fg: "var(--crit)",      line: "var(--crit-line)" },
  "기타":           { bg: "var(--bg-subtle)",  fg: "var(--tx-4)",      line: "var(--line-2)" },
};
const CategoryChip = ({ name }) => {
  const t = CAT_TONE[name] || CAT_TONE["기타"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px",
      background: t.bg, color: t.fg,
      border: `1px solid ${t.line}`,
      borderRadius: "var(--r-sm)",
      fontSize: 11.5, fontWeight: 600, lineHeight: 1.5,
      whiteSpace: "nowrap",
    }}>{name}</span>
  );
};

/* ---------- Avatar ---------- */
const AVATAR_GRADIENTS = {
  "김책": ["#cfe1f7", "#92b8ec", "#1e3a8a"],
  "이수": ["#fcd9b8", "#f5b681", "#7a3d0f"],
  "박P":  ["#bfe3d4", "#86d0b1", "#0f5132"],
  "정책": ["#c7d0fb", "#a5b4fc", "#3730a3"],
  "최P":  ["#dcc7fb", "#b89af0", "#4c1d95"],
  "강책": ["#f7c1c8", "#f08a99", "#831843"],
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

/* ---------- common Select ---------- */
const Select = ({ value, onChange, children, w = 180, height = 40 }) => (
  <div style={{ position: "relative", width: w }}>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none", width: "100%", height,
        padding: "0 36px 0 14px",
        background: "var(--bg-1)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-md)",
        color: "var(--tx-1)", fontSize: 13.5, fontFamily: "inherit",
        fontWeight: 600, cursor: "pointer",
      }}>{children}</select>
    <span style={{
      position: "absolute", right: 12, top: "50%",
      transform: "translateY(-50%)", color: "var(--tx-4)",
      pointerEvents: "none",
    }}>
      <Icon name="chevronDown" size={14} stroke={2} />
    </span>
  </div>
);

/* ---------- Period Picker ---------- */
const PeriodPicker = ({ presets, defaultPreset, from, to }) => {
  const [preset, setPreset] = React.useState(defaultPreset);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = `${preset} (${from} ~ ${to})`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          height: 40, padding: "0 14px",
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md)",
          fontSize: 13.5, color: "var(--tx-1)", fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          minWidth: 280,
        }}>
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <Icon name="calendar" size={15} stroke={1.8} style={{ color: "var(--tx-4)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 44, right: 0, zIndex: 40,
          minWidth: 200, padding: 6,
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: 10,
          boxShadow: "var(--sh-pop)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {presets.map((p) => (
            <button key={p} onClick={() => { setPreset(p); setOpen(false); }}
              style={{
                height: 34, padding: "0 12px",
                textAlign: "left", border: 0, borderRadius: 6,
                background: preset === p ? "var(--brand-bg)" : "transparent",
                color: preset === p ? "var(--brand-700)" : "var(--tx-2)",
                fontSize: 13, fontWeight: preset === p ? 700 : 500,
              }}>{p}</button>
          ))}
          <div style={{ height: 1, background: "var(--line-2)", margin: "4px 0" }} />
          <button style={{
            height: 34, padding: "0 12px", textAlign: "left",
            border: 0, borderRadius: 6, background: "transparent",
            color: "var(--tx-3)", fontSize: 12.5, fontWeight: 500,
          }}>직접 선택…</button>
        </div>
      )}
    </div>
  );
};

/* ---------- Filter Bar ---------- */
const HistoryFilter = ({ filters }) => {
  const [project, setProject] = React.useState(filters.projects[0].value);
  const [cat,     setCat]     = React.useState("전체");
  const [author,  setAuthor]  = React.useState("전체");
  const [q,       setQ]       = React.useState("");

  const FieldLabel = ({ children }) => (
    <div style={{ fontSize: 12.5, color: "var(--tx-3)", fontWeight: 600, marginBottom: 8 }}>{children}</div>
  );

  return (
    <section className="pmo-panel" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 320px) minmax(0, 160px) minmax(0, 160px) 1fr",
        gap: 16, alignItems: "end",
      }}>
        <div>
          <FieldLabel>프로젝트</FieldLabel>
          <Select value={project} onChange={setProject} w="100%">
            {filters.projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>이력 유형</FieldLabel>
          <Select value={cat} onChange={setCat} w="100%">
            {filters.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>작성자</FieldLabel>
          <Select value={author} onChange={setAuthor} w="100%">
            {filters.authors.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>기간</FieldLabel>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PeriodPicker
              presets={filters.periodPresets}
              defaultPreset={filters.defaultPreset}
              from={filters.from}
              to={filters.to}
            />
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16, alignItems: "end", marginTop: 14,
      }}>
        <div>
          <FieldLabel>검색어</FieldLabel>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 40, padding: "0 14px",
            background: "var(--bg-1)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            color: "var(--tx-5)",
          }}>
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="프로젝트코드, 프로젝트명, 내용, 작성자 검색"
              style={{
                border: 0, outline: "none", background: "transparent",
                font: "inherit", flex: 1, color: "var(--tx-1)", fontSize: 13.5,
              }} />
            <Icon name="search" size={15} stroke={1.8} />
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button className="pmo-btn pmo-btn-primary" style={{ height: 40, padding: "0 22px", fontSize: 14, fontWeight: 700 }}>조회</button>
          <button className="pmo-btn" style={{ height: 40, padding: "0 22px", fontSize: 14, fontWeight: 600 }}>초기화</button>
        </div>
      </div>
    </section>
  );
};

/* ---------- Summary KPI cards (4 cards) ---------- */
const ICON_MAP = { report: reportSvg, calendar: calSvg, exchange: exchangeSvg, briefcase: briefcaseSvg };

const HistoryKPICard = ({ kpi }) => (
  <div className="pmo-panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, minHeight: 108 }}>
    <BigToneIcon tone={kpi.tone}>{ICON_MAP[kpi.icon]}</BigToneIcon>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
      <span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 500 }}>{kpi.label}</span>
      <span style={{
        fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: "var(--tx-1)",
        fontVariantNumeric: "tabular-nums", letterSpacing: -0.4,
      }}>
        {kpi.value.toLocaleString()}
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-3)", marginLeft: 6 }}>{kpi.unit}</span>
      </span>
      <span style={{ fontSize: 11.5, color: "var(--tx-5)", marginTop: 4 }}>{kpi.footer}</span>
    </div>
  </div>
);

const SummaryRow = ({ items }) => (
  <section style={{ marginBottom: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12 }}>
      {items.map((k) => <HistoryKPICard key={k.id} kpi={k} />)}
    </div>
  </section>
);

/* ---------- Logs Table ---------- */
const LogsTable = ({ rows, pagination, selectedId, onSelect }) => (
  <section className="pmo-panel" style={{ padding: "20px 22px 14px", display: "flex", flexDirection: "column" }}>
    <header style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
      <h2 className="pmo-section-title" style={{ margin: 0 }}>진행 이력 목록</h2>
      <span style={{ fontSize: 12.5, color: "var(--tx-4)", fontWeight: 600 }}>
        총 {pagination.totalCount.toLocaleString()}건
      </span>
    </header>

    <div style={{ overflowX: "auto", marginLeft: -22, marginRight: -22 }}>
      <table className="pmo-table">
        <colgroup>
          <col style={{ width: 152 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 220 }} />
          <col style={{ width: 130 }} />
          <col />
          <col style={{ width: 120 }} />
          <col style={{ width: 64 }} />
        </colgroup>
        <thead>
          <tr>
            <th>일시 ↓</th>
            <th>프로젝트코드</th>
            <th>프로젝트명</th>
            <th>이력 유형</th>
            <th>요약 내용</th>
            <th>작성자</th>
            <th style={{ textAlign: "center" }}>상세</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sel = r.id === selectedId;
            return (
              <tr key={r.id}
                  onClick={() => onSelect(r.id)}
                  style={{
                    cursor: "pointer",
                    background: sel ? "var(--brand-bg)" : undefined,
                  }}>
                <td className="num" style={{
                  color: "var(--tx-2)", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ color: "var(--tx-2)" }}>{r.datetime.slice(0, 10)}</span>
                  <span style={{ color: "var(--tx-4)", marginLeft: 8 }}>{r.datetime.slice(11)}</span>
                </td>
                <td className="num" style={{ color: "var(--tx-2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.projectCode}</td>
                <td style={{ color: "var(--tx-1)", fontWeight: 600 }}>{r.projectName}</td>
                <td><CategoryChip name={r.category} /></td>
                <td style={{ color: "var(--tx-2)", whiteSpace: "normal" }}>
                  <span title={r.summary} style={{
                    display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1,
                    overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.5, maxWidth: 460,
                  }}>{r.summary}</span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={r.authorInitials} size={32} />
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                      <span style={{ fontSize: 12.5, color: "var(--tx-1)", fontWeight: 700 }}>{r.author}</span>
                      <span style={{ fontSize: 11, color: "var(--tx-5)" }}>{r.authorTeam}</span>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <button aria-label="상세 보기" style={{
                    width: 28, height: 28, padding: 0,
                    background: "transparent", border: "1px solid var(--line-2)",
                    borderRadius: 6, color: "var(--tx-3)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="chevronRight" size={13} stroke={2} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <Pagination pagination={pagination} />
  </section>
);

const Pagination = ({ pagination }) => {
  const { totalPages, currentPage, pageSize } = pagination;
  const shown = [1, 2, 3, 4, 5, 6];

  const PageBtn = ({ children, active, ariaLabel }) => (
    <button aria-label={ariaLabel} style={{
      minWidth: 32, height: 32, padding: "0 10px",
      background: active ? "var(--brand)" : "var(--bg-1)",
      color: active ? "#fff" : "var(--tx-2)",
      border: "1px solid " + (active ? "var(--brand)" : "var(--line-2)"),
      borderRadius: 8, fontSize: 12.5, fontWeight: 700,
      cursor: "pointer",
    }}>{children}</button>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px 0 6px", marginTop: 6, gap: 4, position: "relative",
    }}>
      <PageBtn ariaLabel="처음 페이지"><span style={{ fontSize: 11 }}>«</span></PageBtn>
      <PageBtn ariaLabel="이전 페이지"><Icon name="chevronLeft" size={13} stroke={2} /></PageBtn>
      {shown.map((p) => <PageBtn key={p} active={p === currentPage}>{p}</PageBtn>)}
      <span style={{ color: "var(--tx-5)", padding: "0 6px" }}>…</span>
      <PageBtn>{totalPages}</PageBtn>
      <PageBtn ariaLabel="다음 페이지"><Icon name="chevronRight" size={13} stroke={2} /></PageBtn>
      <PageBtn ariaLabel="마지막 페이지"><span style={{ fontSize: 11 }}>»</span></PageBtn>
      <div style={{ position: "absolute", right: 0 }}>
        <Select value={String(pageSize)} onChange={() => {}} w={120} height={32}>
          <option value="10">10개씩 보기</option>
          <option value="20">20개씩 보기</option>
          <option value="50">50개씩 보기</option>
        </Select>
      </div>
    </div>
  );
};

/* ---------- Right column panels ---------- */
const SidePanel = ({ title, action, children }) => (
  <section className="pmo-panel" style={{ padding: "18px 20px" }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h3 className="pmo-section-title" style={{ margin: 0, fontSize: 15, lineHeight: "20px" }}>{title}</h3>
      {action}
    </header>
    {children}
  </section>
);

const MoreLink = () => (
  <a href="#" className="pmo-link" style={{ fontSize: 12, fontWeight: 600 }}>
    더보기 <Icon name="chevronRight" size={11} stroke={2} />
  </a>
);

const RecentStatusPanel = ({ rows }) => (
  <SidePanel title="최근 상태 변경" action={<MoreLink />}>
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((r, i) => (
        <div key={r.code + r.datetime} style={{
          padding: "12px 0",
          borderBottom: i === rows.length - 1 ? 0 : "1px solid var(--line-1)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ fontSize: 11.5, color: "var(--tx-5)", fontWeight: 700 }}>{r.code}</span>
            <span style={{ fontSize: 12.5, color: "var(--tx-1)", fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>· {r.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--tx-5)", fontVariantNumeric: "tabular-nums", flex: 1 }}>{r.datetime}</span>
            <StatusBadge code={r.from} />
            <Icon name="arrowRight" size={11} stroke={2} style={{ color: "var(--tx-5)" }} />
            <StatusBadge code={r.to} />
          </div>
        </div>
      ))}
    </div>
  </SidePanel>
);

const ByProjectPanel = ({ rows }) => (
  <SidePanel title="프로젝트별 이력 건수" action={<MoreLink />}>
    <div style={{ overflowX: "auto", marginLeft: -20, marginRight: -20 }}>
      <table className="pmo-table" style={{ fontSize: 12.5 }}>
        <colgroup>
          <col style={{ width: 50 }} />
          <col />
          <col style={{ width: 80 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>순위</th>
            <th>프로젝트코드 · 프로젝트명</th>
            <th style={{ textAlign: "right", paddingRight: 20 }}>이력 건수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="num" style={{ textAlign: "center", color: "var(--tx-3)", fontWeight: 700 }}>
                {r.code === "etc" ? "—" : r.rank}
              </td>
              <td style={{ color: "var(--tx-1)", fontWeight: 600 }}>
                {r.code === "etc" ? (
                  <span style={{ color: "var(--tx-4)", fontStyle: "italic" }}>{r.name}</span>
                ) : (
                  <>
                    <span style={{ color: "var(--tx-3)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.code}</span>
                    <span style={{ color: "var(--tx-5)", margin: "0 4px" }}>·</span>
                    {r.name}
                  </>
                )}
              </td>
              <td className="num" style={{ textAlign: "right", paddingRight: 20, color: "var(--tx-1)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {r.count.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SidePanel>
);

const SelectedDetailPanel = ({ log, onClose }) => {
  if (!log) {
    return (
      <SidePanel title="선택 이력 상세">
        <div style={{
          padding: "40px 0", textAlign: "center",
          color: "var(--tx-5)", fontSize: 12.5,
          border: "1px dashed var(--line-2)", borderRadius: 10,
        }}>
          좌측 표에서 이력을 선택하세요
        </div>
      </SidePanel>
    );
  }
  const d = log.detail || {};
  const Row = ({ label, children }) => (
    <div style={{
      display: "grid", gridTemplateColumns: "76px 1fr",
      gap: 12, padding: "10px 0",
      borderBottom: "1px solid var(--line-1)",
      alignItems: "start",
    }}>
      <span style={{ fontSize: 12, color: "var(--tx-4)", fontWeight: 600, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--tx-1)", fontWeight: 600, lineHeight: 1.55 }}>{children}</span>
    </div>
  );

  return (
    <section className="pmo-panel" style={{ padding: "18px 20px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 className="pmo-section-title" style={{ margin: 0, fontSize: 15, lineHeight: "20px" }}>선택 이력 상세</h3>
        <button onClick={onClose} aria-label="닫기" style={{
          width: 24, height: 24, padding: 0,
          background: "transparent", border: 0,
          color: "var(--tx-4)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </header>

      <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
        {d["이슈"]      && <Row label="이슈">{d["이슈"]}</Row>}
        {d["조치사항"]  && <Row label="조치사항">{d["조치사항"]}</Row>}
        {d["다음 단계"] && <Row label="다음 단계">{d["다음 단계"]}</Row>}
        {d["관련 일정"] && (
          <Row label="관련 일정">
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--bg-3)", border: "1px solid var(--line-2)",
              borderRadius: 8,
              fontSize: 12, fontWeight: 600,
            }}>
              <Icon name="calendar" size={13} stroke={1.8} style={{ color: "var(--tx-4)" }} />
              <span style={{ color: "var(--tx-3)" }}>{d["관련 일정"].label}</span>
              <span style={{ color: "var(--tx-1)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d["관련 일정"].date}</span>
            </span>
          </Row>
        )}
      </div>

      <button className="pmo-btn" style={{
        width: "100%", height: 40,
        background: "var(--bg-3)", border: "1px solid var(--line-2)",
        color: "var(--tx-1)", fontWeight: 700, fontSize: 13,
        justifyContent: "center",
      }}>상세 보기</button>
    </section>
  );
};

/* ---------- Page ---------- */
const HistoryPage = ({ data }) => {
  const [selectedId, setSelectedId] = React.useState(data.logs[0]?.id ?? null);
  const selectedLog = data.logs.find((l) => l.id === selectedId);

  return (
    <AppShell user={data.meta.user} notifications={data.meta.notifications}
              current="history" pageTitle="진행이력">
      <HistoryFilter filters={data.filters} />
      <SummaryRow items={data.summary} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <LogsTable rows={data.logs} pagination={data.pagination}
                   selectedId={selectedId} onSelect={setSelectedId} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <RecentStatusPanel rows={data.recentStatusChanges} />
          <ByProjectPanel rows={data.byProject} />
          <SelectedDetailPanel log={selectedLog} onClose={() => setSelectedId(null)} />
        </div>
      </div>
    </AppShell>
  );
};

window.HistoryPage = HistoryPage;
