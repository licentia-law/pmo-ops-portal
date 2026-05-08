import type { ReactNode } from "react";
import { MENU_CONFIG } from "@pmo/shared-types";
import { SidebarNav } from "./SidebarNav";
import { TopHeader } from "./TopHeader";

export type AppShellProps = {
  children: ReactNode;
  currentPath: string;
  pageTitle: string;
};

export function AppShell({ children, currentPath, pageTitle }: AppShellProps) {
  return (
    <div className="pmo-app-shell">
      <SidebarNav groups={MENU_CONFIG} currentPath={currentPath} />
      <div className="pmo-app-main">
        <TopHeader pageTitle={pageTitle} />
        <main className="pmo-page">{children}</main>
        <footer className="pmo-footer">
          <span>© 2026 PMO 업무수행 관리시스템</span>
          <span>v0.1.0 MVP</span>
        </footer>
      </div>
    </div>
  );
}
