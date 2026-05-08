import { ROUTES } from "@pmo/shared-types";
import { dashboardSummary, projectsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, SummaryCard, StatusBadge, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof projectsMock)[number]>[] = [
  { key: "code", header: "코드", render: (row) => row.code },
  { key: "name", header: "프로젝트", render: (row) => row.name },
  { key: "pm", header: "PM", render: (row) => row.pmName },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function HomePage() {
  return (
    <AppShell currentPath={ROUTES.home} pageTitle="홈">
      <div className="pmo-page-stack">
        <section className="pmo-page-title">
          <h1>PMO 업무수행 관리시스템</h1>
          <p>mock 기반 초기 렌더링입니다. 확정되지 않은 운영 수식과 조직 기준은 TODO로 남겨둡니다.</p>
        </section>
        <section className="pmo-grid">
          <SummaryCard label="현재 인원" value={dashboardSummary.headcount} unit="명" note="시안 공통 mock 기준" />
          <SummaryCard label="수행" value={dashboardSummary.running} unit="명" />
          <SummaryCard label="제안" value={dashboardSummary.proposing} unit="명" />
          <SummaryCard label="대기" value={dashboardSummary.idle} unit="명" />
        </section>
        <BaseTable columns={columns} rows={projectsMock} />
      </div>
    </AppShell>
  );
}
