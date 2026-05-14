"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { MENU_CONFIG, type MenuGroup } from "@pmo/shared-types";

type ShellIconName =
  | "home"
  | "briefcase"
  | "users"
  | "trending"
  | "settings"
  | "chevronDown"
  | "chevronUp"
  | "search"
  | "bell"
  | "menu";

const SHELL_ICONS: Record<ShellIconName, string> = {
  home: "M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  briefcase: "M3 7.5h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM8 7.5V5.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20.5c0-3.5 3.1-6 7-6s7 2.5 7 6M16 14.5c3 .3 6 2.5 6 6",
  trending: "M3 17l5-5 4 4 7-7M14 9h6v6",
  settings: "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.7.7v.4a2 2 0 0 1-4 0v-.2a1 1 0 0 0-1.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0-.7-1.7H5a2 2 0 0 1 0-4h.2a1 1 0 0 0 .7-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.7-.7V5a2 2 0 0 1 4 0v.2a1 1 0 0 0 1.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.7 1.7H19a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.4 0",
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M6 15l6-6 6 6",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.3-4.3",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 5 3 9H3c0-4 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  menu: "M4 6h16M4 12h16M4 18h16"
};

const GROUP_ICON: Record<string, ShellIconName> = {
  home: "home",
  projects: "briefcase",
  people: "users",
  reports: "trending",
  admin: "settings"
};

type PmoShellUser = {
  name: string;
  team: string;
  role: string;
};

type PmoShellProps = {
  children: ReactNode;
  currentId: string;
  pageTitle: string;
  notifications?: number;
  searchPlaceholder?: string;
  user?: Partial<PmoShellUser>;
};

function ShellIcon({ name, size = 16, stroke = 1.6, style }: { name: ShellIconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d={SHELL_ICONS[name]} />
    </svg>
  );
}

function SidebarItem({ id, label, href, currentId, indent = false }: { id: string; label: string; href: string; currentId: string; indent?: boolean }) {
  const active = id === currentId;
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        height: 36,
        padding: indent ? "0 16px 0 44px" : "0 16px",
        borderRadius: 8,
        margin: "0 8px",
        fontSize: 15.5,
        fontWeight: active ? 600 : 500,
        color: active ? "var(--brand)" : "var(--tx-3)",
        background: active ? "var(--brand-bg)" : "transparent",
        transition: "background .12s"
      }}
    >
      {label}
    </a>
  );
}

function SidebarGroup({ group, currentId }: { group: MenuGroup; currentId: string }) {
  const containsActive = group.items.some((item) => item.id === currentId);
  const [open, setOpen] = useState(containsActive || group.id === "projects");
  const icon = GROUP_ICON[group.id] ?? "briefcase";

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "calc(100% - 16px)",
          height: 36,
          padding: "0 12px",
          margin: "0 8px",
          background: "transparent",
          border: 0,
          borderRadius: 8,
          color: "var(--tx-3)",
          fontWeight: 600,
          fontSize: 15.5
        }}
      >
        <ShellIcon name={icon} size={16} stroke={1.7} style={{ color: "var(--tx-4)" }} />
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <ShellIcon name={open ? "chevronUp" : "chevronDown"} size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {group.items.map((item) => (
            <SidebarItem key={item.id} id={item.id} label={item.label} href={item.href} currentId={currentId} indent />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PmoShell({
  children,
  currentId,
  pageTitle,
  notifications,
  searchPlaceholder = "프로젝트/인력 검색",
  user
}: PmoShellProps) {
  const currentUser: PmoShellUser = {
    name: user?.name ?? "김PMO 책임",
    team: user?.team ?? "PMO본부",
    role: user?.role ?? "관리자"
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <aside style={{ width: "var(--side-w)", flex: "0 0 var(--side-w)", background: "var(--bg-side)", borderRight: "1px solid var(--line-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 64, flex: "0 0 auto", borderBottom: "1px solid var(--line-2)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7c3aed)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "0 0 auto", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.15)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d="M3 4l5-2 5 2v5c0 3-3 5-5 5s-5-2-5-5z" />
            </svg>
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--tx-1)", letterSpacing: "0.01em", lineHeight: 1.2 }}>PMO 업무수행<br />관리시스템</span>
        </a>
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {MENU_CONFIG.map((group) => {
            if (group.id === "home") {
              return group.items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    height: 38,
                    padding: "0 12px",
                    margin: "0 8px 6px",
                    borderRadius: 8,
                    background: item.id === currentId ? "var(--brand-bg)" : "transparent",
                    color: item.id === currentId ? "var(--brand)" : "var(--tx-2)",
                    fontSize: 16,
                    fontWeight: item.id === currentId ? 700 : 600
                  }}
                >
                  <ShellIcon name="home" size={16} stroke={1.8} />
                  {item.label}
                </a>
              ));
            }

            return <SidebarGroup key={group.id} group={group} currentId={currentId} />;
          })}
        </nav>
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: "var(--header-h)", flex: "0 0 var(--header-h)", background: "var(--bg-1)", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16, position: "sticky", top: 0, zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--tx-3)", fontSize: 16, fontWeight: 600 }}>
            <ShellIcon name="menu" size={18} stroke={1.8} style={{ color: "var(--tx-4)" }} />
            <span style={{ color: "var(--tx-1)", fontSize: 18, fontWeight: 700 }}>{pageTitle}</span>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div className="pmo-search">
              <ShellIcon name="search" size={16} stroke={1.8} />
              <input placeholder={searchPlaceholder} />
            </div>
          </div>
          <button style={{ position: "relative", width: 38, height: 38, border: 0, borderRadius: 10, background: "transparent", color: "var(--tx-3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ShellIcon name="bell" size={18} stroke={1.8} />
            {notifications && notifications > 0 ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--crit)", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-1)", boxSizing: "content-box" }}>{notifications}</span> : null}
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 10px 0 6px", border: 0, borderRadius: 10, background: "transparent" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #c7d0fb, #a5b4fc)", color: "#3730a3", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>김P</span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--tx-1)" }}>{currentUser.name}</span>
              <span style={{ fontSize: 13, color: "var(--tx-4)" }}>{currentUser.team} · {currentUser.role}</span>
            </span>
            <ShellIcon name="chevronDown" size={14} stroke={2} style={{ color: "var(--tx-5)" }} />
          </button>
        </header>
        <main style={{ flex: 1, padding: "24px 28px 32px" }}>{children}</main>
      </div>
    </div>
  );
}
