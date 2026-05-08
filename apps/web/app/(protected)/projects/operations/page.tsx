import { PROJECT_STATUSES, PROJECT_TYPES, ROUTES, labelFor } from "@pmo/shared-types";
import { projectsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, StatusBadge, TextFilter, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof projectsMock)[number]>[] = [
  { key: "code", header: "프로젝트코드", render: (row) => row.code },
  { key: "name", header: "프로젝트명", render: (row) => row.name },
  { key: "type", header: "사업유형", render: (row) => labelFor(PROJECT_TYPES, row.projectType) },
  { key: "pm", header: "PM", render: (row) => row.pmName },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function ProjectOperationsPage() {
  return (
    <AppShell currentPath={ROUTES.projectOperations} pageTitle="업무수행현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="검색어" placeholder="프로젝트명/코드/PM" />
          <SelectFilter label="상태" options={PROJECT_STATUSES} />
          <SelectFilter label="사업유형" options={PROJECT_TYPES} />
        </FilterBar>
        <BaseTable columns={columns} rows={projectsMock} />
        <Pagination page={1} pageSize={10} total={projectsMock.length} />
      </div>
    </AppShell>
  );
}
