import { ASSIGNMENT_TYPES, ROUTES, labelFor } from "@pmo/shared-types";
import { assignmentsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, TextFilter, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof assignmentsMock)[number]>[] = [
  { key: "personnel", header: "인력", render: (row) => row.personnelName },
  { key: "project", header: "프로젝트", render: (row) => row.projectName },
  { key: "type", header: "배정구분", render: (row) => labelFor(ASSIGNMENT_TYPES, row.assignmentType) },
  { key: "period", header: "투입기간", render: (row) => `${row.startDate} ~ ${row.endDate}` },
  { key: "mm", header: "MM", align: "right", render: (row) => row.mm.toFixed(1) }
];

export default function PeopleAssignmentsPage() {
  return (
    <AppShell currentPath={ROUTES.peopleAssignments} pageTitle="인력배치/투입현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="검색어" placeholder="인력/프로젝트" />
          <SelectFilter label="배정구분" options={ASSIGNMENT_TYPES} />
        </FilterBar>
        <BaseTable columns={columns} rows={assignmentsMock} />
        <Pagination page={1} pageSize={10} total={assignmentsMock.length} />
      </div>
    </AppShell>
  );
}
