import type { MenuGroup } from "@pmo/shared-types";

type SidebarNavProps = {
  groups: MenuGroup[];
  currentPath: string;
};

export function SidebarNav({ groups, currentPath }: SidebarNavProps) {
  return (
    <aside className="pmo-sidebar">
      <a className="pmo-sidebar-logo" href="/">
        <span className="pmo-logo-mark">PM</span>
        <span>PMO 업무수행<br />관리시스템</span>
      </a>
      <nav className="pmo-sidebar-nav" aria-label="주 메뉴">
        {groups.map((group) => (
          <section className="pmo-sidebar-group" key={group.id}>
            <div className="pmo-sidebar-group-title">{group.label}</div>
            {group.items.map((item) => {
              const active = item.href === currentPath || (item.href.includes("TODO_PROJECT_ID") && currentPath.startsWith("/projects/"));
              return (
                <a className={active ? "pmo-sidebar-link is-active" : "pmo-sidebar-link"} href={item.href} key={item.id}>
                  {item.label}
                </a>
              );
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
}
