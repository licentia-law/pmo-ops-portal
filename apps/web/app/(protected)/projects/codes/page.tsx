import { PROJECT_STATUSES, PROJECT_TYPES, ROUTES, labelFor } from "@pmo/shared-types";
import { projectCodesMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, StatusBadge, TextFilter, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof projectCodesMock)[number]>[] = [
  { key: "code", header: "코드", render: (row) => row.code },
  { key: "name", header: "프로젝트명", render: (row) => row.name },
  { key: "type", header: "사업유형", render: (row) => labelFor(PROJECT_TYPES, row.projectType) },
  { key: "owner", header: "담당", render: (row) => row.ownerName },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function ProjectCodesPage() {
  return (
    <AppShell currentPath={ROUTES.projectCodes} pageTitle="프로젝트코드">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="검색어" placeholder="코드/프로젝트명" />
          <SelectFilter label="상태" options={PROJECT_STATUSES} />
        </FilterBar>
        <BaseTable columns={columns} rows={projectCodesMock} />
        <Pagination page={1} pageSize={10} total={projectCodesMock.length} />
      </div>
    </AppShell>
  );
}
