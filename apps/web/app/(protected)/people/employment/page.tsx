import { EMPLOYMENT_STATUSES, ROUTES, labelFor } from "@pmo/shared-types";
import { personnelMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SelectFilter, TextFilter, type Column } from "@pmo/shared-ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "인력 관리"
};

const columns: Column<(typeof personnelMock)[number]>[] = [
  { key: "name", header: "이름", render: (row) => row.name },
  { key: "team", header: "팀", render: (row) => row.teamName },
  { key: "role", header: "역할", render: (row) => row.roleName },
  { key: "status", header: "재직상태", render: (row) => labelFor(EMPLOYMENT_STATUSES, row.employmentStatus) }
];

export default function PeopleEmploymentPage() {
  return (
    <AppShell currentPath={ROUTES.peopleEmployment} pageTitle="인력 관리">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="검색어" placeholder="이름/팀" />
          <SelectFilter label="재직상태" options={EMPLOYMENT_STATUSES} />
        </FilterBar>
        <BaseTable columns={columns} rows={personnelMock} />
        <Pagination page={1} pageSize={10} total={personnelMock.length} />
      </div>
    </AppShell>
  );
}

