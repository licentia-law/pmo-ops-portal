/* PMO · primitives.jsx
   - Icon set (lucide-style hand-picked)
   - Donut, ProgressBar, Delta, StatusBadge
   - KPICard, QuickLinkCard, ToneIcon
   - Used by: home.jsx (and future shared pages)
*/

/* =========================================================
   Icon — small inline SVG set, currentColor stroke
   ========================================================= */
const ICONS = {
  /* nav */
  home:      "M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  briefcase: "M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  users:     "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  trending:  "M3 17l5-5 4 4 7-7M14 9h6v6",
  settings:  "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.4a2 2 0 0 1-4 0v-.2a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H5a2 2 0 0 1 0-4h.2a1 1 0 0 0 .7-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.7-.7V5a2 2 0 0 1 4 0v.2a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.7 1.7H19a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.4 0",

  /* common */
  chevronDown:   "M6 9l6 6 6-6",
  chevronUp:     "M6 15l6-6 6 6",
  chevronRight:  "M9 6l6 6-6 6",
  chevronLeft:   "M15 6l-6 6 6 6",
  chevronsLeft:  "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  search:        "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  bell:          "M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  arrowRight:    "M5 12h14M13 5l7 7-7 7",
  menu:          "M4 6h16M4 12h16M4 18h16",

  /* quick links / kpi */
  execution: "M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 11h8M8 15h6M8 7h5",
  folder:    "M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  report:    "M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 17v-4M13 17v-7M17 17v-2",
  clock:     "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  calendar:  "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8 4v3M16 4v3",
  check:     "M5 12l4 4 10-10",
};

const Icon = ({ name, size = 16, stroke = 1.6, className, style, fill = "none" }) =>
  React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24",
    fill, stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round",
    className, style, "aria-hidden": true,
  }, React.createElement("path", { d: ICONS[name] || ICONS.check }));

/* =========================================================
   ToneIcon — large rounded square holding an icon, in tone color
   used by quick-link cards & month summary rows
   ========================================================= */
const TONE_BG = {
  blue:   { fg: "#2563eb", bg: "#e3eefe" },
  green:  { fg: "#16a34a", bg: "#dcf2e3" },
  purple: { fg: "#7c3aed", bg: "#ede5fd" },
  amber:  { fg: "#d97706", bg: "#fdf0d8" },
  brand:  { fg: "#4F46E5", bg: "#eef1ff" },
  rose:   { fg: "#be123c", bg: "#fde7eb" },
  slate:  { fg: "#475569", bg: "#eef2f7" },
};
const ToneIcon = ({ tone = "blue", icon, size = 44, iconSize }) => {
  const t = TONE_BG[tone] || TONE_BG.blue;
  return (
    <span style={{
      width: size, height: size, borderRadius: 10,
      background: t.bg, color: t.fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flex: "0 0 auto",
    }}>
      <Icon name={icon} size={iconSize || Math.round(size * 0.5)} stroke={1.7} />
    </span>
  );
};

/* =========================================================
   Donut — minimal SVG ring, percentage centered
   ========================================================= */
const COLOR_VAR = {
  brand:   "var(--brand)",
  info:    "var(--info)",
  ok:      "var(--ok)",
  warn:    "var(--warn)",
  crit:    "var(--crit)",
  neutral: "var(--tx-4)",
};
const Donut = ({ value = 0, size = 56, stroke = 7, color = "brand", track = "#eef1f6" }) => {
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  const col = COLOR_VAR[color] || color;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={col} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};

/* =========================================================
   Delta — ▲ 12명 / ▼ 2.4%p
   ========================================================= */
const Delta = ({ dir = "up", abs }) => (
  <span className={`pmo-delta pmo-delta--${dir}`}>
    <span className="pmo-delta__tri">{dir === "up" ? "▲" : "▼"}</span>
    {abs}
  </span>
);

/* =========================================================
   StatusBadge — 8 standard codes
   ========================================================= */
const STATUS_LABEL = {
  proposing: "제안중",
  presented: "발표완료",
  win:       "WIN",
  loss:      "LOSS",
  drop:      "DROP",
  running:   "수행중",
  support:   "업무지원",
  done:      "완료",
};
const StatusBadge = ({ code }) => (
  <span className={`pmo-badge pmo-badge--${code}`}>{STATUS_LABEL[code] || code}</span>
);

/* =========================================================
   ProgressBar — used in 진행률 column
   ========================================================= */
const ProgressBar = ({ value = 0 }) => (
  <span className="pmo-progress" aria-label={`${value}%`}>
    <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </span>
);

/* =========================================================
   KPICard
   ========================================================= */
const KPICard = ({ kpi }) => {
  const { label, donut, color, value, unit, icon, tone, delta, footer } = kpi;
  return (
    <div className="pmo-panel" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 132 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {donut ? (
          <Donut value={value} color={color} size={48} stroke={6} />
        ) : (
          <ToneIcon tone={tone} icon={icon} size={40} iconSize={20} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: "var(--tx-4)", fontWeight: 500 }}>{label}</span>
          <span style={{
            fontSize: 26, lineHeight: 1, fontWeight: 700, color: "var(--tx-1)",
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
          }}>
            {value}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--tx-4)", marginLeft: 4 }}>{unit}</span>
          </span>
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "var(--tx-4)", marginTop: "auto",
        paddingTop: 4, borderTop: "1px dashed var(--line-2)",
      }}>
        <span>{footer || "전월 대비"}</span>
        {delta && <Delta {...delta} />}
      </div>
    </div>
  );
};

/* =========================================================
   QuickLinkCard
   ========================================================= */
const QuickLinkCard = ({ item }) => (
  <a href={item.href || "#"}
    className="pmo-panel"
    style={{
      padding: "20px 22px",
      display: "flex", alignItems: "center", gap: 16,
      transition: "box-shadow .15s ease, border-color .15s ease, transform .15s ease",
      minHeight: 116,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = "var(--sh-hover)";
      e.currentTarget.style.borderColor = "var(--brand-line)";
      e.currentTarget.style.transform = "translateY(-1px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = "var(--sh-card)";
      e.currentTarget.style.borderColor = "var(--line-2)";
      e.currentTarget.style.transform = "";
    }}>
    <ToneIcon tone={item.tone} icon={item.icon} size={48} iconSize={22} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", marginBottom: 4 }}>{item.title}</div>
      <div style={{ fontSize: 13, color: "var(--tx-4)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{item.desc}</div>
    </div>
    <span style={{ color: "var(--tx-5)", flex: "0 0 auto" }}>
      <Icon name="arrowRight" size={18} stroke={1.7} />
    </span>
  </a>
);

Object.assign(window, {
  Icon, ToneIcon, Donut, Delta, StatusBadge, ProgressBar,
  KPICard, QuickLinkCard, STATUS_LABEL,
});
