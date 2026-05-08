import { PROJECT_STATUSES, ROUTES } from "@pmo/shared-types";
import { projectLogsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, StatusBadge, TextFilter, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof projectLogsMock)[number]>[] = [
  { key: "loggedAt", header: "진행일", render: (row) => row.loggedAt },
  { key: "project", header: "프로젝트", render: (row) => row.projectName },
  { key: "author", header: "작성자", render: (row) => row.authorName },
  { key: "content", header: "내용", render: (row) => row.content },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function ProjectLogsPage() {
  return (
    <AppShell currentPath={ROUTES.projectLogs} pageTitle="진행이력">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="검색어" placeholder="프로젝트/내용/작성자" />
          <SelectFilter label="상태" options={PROJECT_STATUSES} />
        </FilterBar>
        <BaseTable columns={columns} rows={projectLogsMock} />
        <Pagination page={1} pageSize={10} total={projectLogsMock.length} />
      </div>
    </AppShell>
  );
}
