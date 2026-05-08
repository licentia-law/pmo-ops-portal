import { ROUTES } from "@pmo/shared-types";
import { dashboardSummary, projectsMock } from "@pmo/shared-mocks";
import { AppShell, BaseTable, SummaryCard, StatusBadge, type Column } from "@pmo/shared-ui";

const columns: Column<(typeof projectsMock)[number]>[] = [
  { key: "name", header: "주요 프로젝트", render: (row) => row.name },
  { key: "client", header: "고객사", render: (row) => row.clientName },
  { key: "period", header: "기간", render: (row) => `${row.startDate} ~ ${row.endDate}` },
  { key: "status", header: "상태", render: (row) => <StatusBadge code={row.status} /> }
];

export default function DashboardPage() {
  return (
    <AppShell currentPath={ROUTES.dashboard} pageTitle="대시보드">
      <div className="pmo-page-stack">
        <section className="pmo-grid">
          <SummaryCard label="가동률" value={dashboardSummary.utilizationRate} unit="%" note="TODO: 계산식 DTL 상세 확정 필요" />
          <SummaryCard label="가득률" value={dashboardSummary.contractRate} unit="%" note="TODO: 명칭/공식 PRD 충돌 여부 확인" />
          <SummaryCard label="수행 인원" value={dashboardSummary.running} unit="명" />
          <SummaryCard label="제안 인원" value={dashboardSummary.proposing} unit="명" />
        </section>
        <BaseTable columns={columns} rows={projectsMock} />
      </div>
    </AppShell>
  );
}
