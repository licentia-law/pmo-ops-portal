import { ROUTES } from "@pmo/shared-types";
import { assignmentsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, FilterBar, Pagination, SummaryCard, TextFilter, type Column } from "@pmo/shared-ui";

const rows = assignmentsMock.filter((item) => item.assignmentType === "unassigned");

const columns: Column<(typeof rows)[number]>[] = [
  { key: "personnel", header: "인원", render: (row) => row.personnelName },
  { key: "project", header: "직전 프로젝트", render: (row) => row.projectName },
  { key: "period", header: "기간", render: (row) => `${row.startDate} ~ ${row.endDate}` },
  { key: "mm", header: "MM", align: "right", render: (row) => row.mm.toFixed(1) }
];

export default function IdlePage() {
  return (
    <AppShell currentPath={ROUTES.peopleWaiting} pageTitle="대기현황">
      <div className="pmo-page-stack">
        <FilterBar actions={<button className="pmo-btn">조회</button>}>
          <TextFilter label="기준일" placeholder="YYYY-MM-DD" />
          <TextFilter label="검색어" placeholder="인원/비고" />
        </FilterBar>
        <section className="pmo-grid">
          <SummaryCard label="대기 인원" value={rows.length} unit="명" />
          <SummaryCard label="금주 변동" value={0} unit="명" note="TODO: 전주/금주/차주 비교 로직" />
        </section>
        <BaseTable columns={columns} rows={rows} />
        <Pagination page={1} pageSize={10} total={rows.length} />
      </div>
    </AppShell>
  );
}

