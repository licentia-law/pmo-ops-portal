/* PMO · shell.jsx — Sidebar + Header + AppShell
   Reused across all pages (홈 / 대시보드 / 주간현황 / 월별가동현황 / ...).
   NAV 정렬은 PRD §8.1을 따름.
*/

const NAV = [
  { kind: "item",  id: "home", label: "홈", icon: "home" },
  { kind: "group", id: "project", label: "프로젝트", icon: "briefcase", items: [
    { id: "dashboard",   label: "대시보드" },
    { id: "execution",   label: "업무수행현황" },
    { id: "code",        label: "프로젝트코드" },
    { id: "project-detail", label: "프로젝트 상세" },
    { id: "history",     label: "진행이력" },
  ]},
  { kind: "group", id: "people", label: "인력", icon: "users", items: [
    { id: "active",      label: "인력재직현황" },
    { id: "assignment",  label: "인력배치/투입현황" },
    { id: "current",     label: "인원별 투입(현재)" },
    { id: "idle",        label: "대기현황" },
  ]},
  { kind: "group", id: "kpi", label: "KPI/보고", icon: "trending", items: [
    { id: "weekly",      label: "주간현황" },
    { id: "monthly",     label: "월별가동현황" },
    { id: "idleProp",    label: "대기/제안인원" },
    { id: "propPrj",     label: "제안PRJ" },
    { id: "execPrj",     label: "이행PRJ" },
    { id: "report",      label: "보고서 다운로드" },
  ]},
  { kind: "group", id: "admin", label: "관리", icon: "settings", items: [
    { id: "users",       label: "사용자/권한 관리" },
    { id: "master",      label: "기준정보 관리" },
  ]},
];

/* current === item.id 로 활성 표시 */
const SidebarLogo = () => (
  <a href="#" style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "0 16px", height: 64, flex: "0 0 auto",
    borderBottom: "1px solid var(--line-2)",
  }}>
    <span style={{
      width: 32, height: 32, borderRadius: 8,
      background: "linear-gradient(135deg, #4F46E5, #7c3aed)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", flex: "0 0 auto",
      boxShadow: "inset 0 -2px 0 rgba(0,0,0,.15)",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 4l5-2 5 2v5c0 3-3 5-5 5s-5-2-5-5z" />
      </svg>
    </span>
    <span style={{
      fontSize: 14, fontWeight: 700, color: "var(--tx-1)",
      letterSpacing: -0.2, lineHeight: 1.2,
    }}>
      PMO 업무수행<br/>관리시스템
    </span>
  </a>
);

const SidebarItem = ({ id, label, current, indent }) => {
  const active = id === current;
  return (
    <a href="#" style={{
      display: "flex", alignItems: "center",
      height: 36, padding: indent ? "0 16px 0 44px" : "0 16px",
      borderRadius: 8, margin: "0 8px",
      fontSize: 13.5, fontWeight: active ? 600 : 500,
      color: active ? "var(--brand)" : "var(--tx-3)",
      background: active ? "var(--brand-bg)" : "transparent",
      transition: "background .12s",
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-2)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      {label}
    </a>
  );
};

const SidebarGroup = ({ group, current }) => {
  const containsActive = group.items.some((it) => it.id === current);
  const [open, setOpen] = React.useState(containsActive);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "calc(100% - 16px)", height: 36, padding: "0 12px",
        margin: "0 8px",
        background: "transparent", border: 0, borderRadius: 8,
        color: "var(--tx-3)", fontWeight: 600, fontSize: 13.5,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        <Icon name={group.icon} size={16} stroke={1.7} style={{ color: "var(--tx-4)" }} />
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {group.items.map((it) => (
            <SidebarItem key={it.id} id={it.id} label={it.label} current={current} indent />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ current = "home" }) => (
  <aside style={{
    width: "var(--side-w)", flex: "0 0 var(--side-w)",
    background: "var(--bg-side)",
    borderRight: "1px solid var(--line-2)",
    display: "flex", flexDirection: "column",
    position: "sticky", top: 0, height: "100vh",
  }}>
    <SidebarLogo />
    <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
      {NAV.map((node) => {
        if (node.kind === "item") {
          const active = node.id === current;
          return (
            <a key={node.id} href="#" style={{
              display: "flex", alignItems: "center", gap: 10,
              height: 38, padding: "0 12px", margin: "0 8px 6px",
              borderRadius: 8,
              background: active ? "var(--brand-bg)" : "transparent",
              color: active ? "var(--brand)" : "var(--tx-2)",
              fontSize: 14, fontWeight: active ? 700 : 600,
            }}>
              <Icon name={node.icon} size={16} stroke={1.8} />
              {node.label}
            </a>
          );
        }
        return <SidebarGroup key={node.id} group={node} current={current} />;
      })}
    </nav>
    <button style={{
      display: "flex", alignItems: "center", gap: 8,
      height: 44, padding: "0 16px",
      border: 0,
      borderTop: "1px solid var(--line-2)",
      background: "transparent", color: "var(--tx-4)",
      fontSize: 13, fontWeight: 500, textAlign: "left",
    }}>
      <Icon name="chevronsLeft" size={14} stroke={2} />
      메뉴 접기
    </button>
  </aside>
);

const Header = ({ user, notifications = 0, pageTitle = "홈" }) => (
  <header style={{
    height: "var(--header-h)", flex: "0 0 var(--header-h)",
    background: "var(--bg-1)",
    borderBottom: "1px solid var(--line-2)",
    display: "flex", alignItems: "center",
    padding: "0 24px", gap: 16,
    position: "sticky", top: 0, zIndex: 5,
  }}>
    {/* breadcrumb */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx-3)", fontSize: 14, fontWeight: 600 }}>
      <Icon name="menu" size={18} stroke={1.8} style={{ color: "var(--tx-4)" }} />
      <span style={{ color: "var(--tx-1)", fontSize: 16, fontWeight: 700 }}>{pageTitle}</span>
    </div>
    {/* search */}
    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
      <div className="pmo-search">
        <Icon name="search" size={16} stroke={1.8} />
        <input placeholder="프로젝트/인력 검색" />
      </div>
    </div>
    {/* notifications */}
    <button style={{
      position: "relative", width: 38, height: 38,
      border: 0, borderRadius: 10, background: "transparent",
      color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <Icon name="bell" size={18} stroke={1.8} />
      {notifications > 0 && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          minWidth: 16, height: 16, padding: "0 4px",
          borderRadius: 8, background: "var(--crit)", color: "#fff",
          fontSize: 10, fontWeight: 700,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "2px solid var(--bg-1)", boxSizing: "content-box",
        }}>{notifications}</span>
      )}
    </button>
    {/* user */}
    <button style={{
      display: "flex", alignItems: "center", gap: 10,
      height: 38, padding: "0 10px 0 6px",
      border: 0, borderRadius: 10, background: "transparent",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <span style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "linear-gradient(135deg, #c7d0fb, #a5b4fc)",
        color: "#3730a3", fontWeight: 700, fontSize: 12,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>김P</span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-1)" }}>{user.name}</span>
        <span style={{ fontSize: 11, color: "var(--tx-4)" }}>{user.team} · {user.role}</span>
      </span>
      <Icon name="chevronDown" size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
    </button>
  </header>
);

const Footer = () => (
  <footer style={{
    height: 48, padding: "0 28px",
    borderTop: "1px solid var(--line-2)",
    background: "var(--bg-1)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: 12, color: "var(--tx-4)",
  }}>
    <span>© 2026 PMO 업무수행 관리시스템</span>
    <div style={{ display: "flex", gap: 24 }}>
      <a href="#" style={{ color: "var(--tx-4)" }}>시스템 문의</a>
      <span>v0.1.0 (MVP)</span>
    </div>
  </footer>
);

const AppShell = ({ user, notifications, current = "home", pageTitle = "홈", children }) => (
  <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
    <Sidebar current={current} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Header user={user} notifications={notifications} pageTitle={pageTitle} />
      <main style={{ flex: 1, padding: "24px 28px 32px" }}>{children}</main>
      <Footer />
    </div>
  </div>
);

Object.assign(window, { AppShell, Sidebar, Header, Footer, NAV });
