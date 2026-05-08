import { ASSIGNMENT_TYPES, ROUTES, labelFor } from "@pmo/shared-types";
import { assignmentsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, SummaryCard, TextFilter, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof assignmentsMock)[number]>[] = [
  { key: "personnel", header: "인원", render: (row) => row.personnelName },
  { key: "assignmentType", header: "현재상태", render: (row) => labelFor(ASSIGNMENT_TYPES, row.assignmentType) },
  { key: "project", header: "현재 프로젝트", render: (row) => row.projectName },
  { key: "period", header: "기간", render: (row) => `${row.startDate} ~ ${row.endDate}` }
];

export default function PeopleCurrentPage() {
  const activeCount = assignmentsMock.filter((item) => item.assignmentType !== "unassigned").length;
  return (
    <AppShell currentPath={ROUTES.peopleCurrent} pageTitle="인원별 투입(현재)">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="기준일" placeholder="YYYY-MM-DD" />
          <TextFilter label="검색어" placeholder="인원/프로젝트" />
        </FilterBar>
        <section className="pmo-grid">
          <SummaryCard label="현재 투입" value={activeCount} unit="명" />
          <SummaryCard label="미투입" value={assignmentsMock.length - activeCount} unit="명" />
          <SummaryCard label="기준일" value="2026-05-06" note="TODO: 기준일 기본값 확정 필요" />
          <SummaryCard label="스냅샷" value="mock" note="API/월마감 연계 미구현" />
        </section>
        <BaseTable columns={columns} rows={assignmentsMock} />
      </div>
    </AppShell>
  );
}
