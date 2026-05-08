type TopHeaderProps = {
  pageTitle: string;
};

export function TopHeader({ pageTitle }: TopHeaderProps) {
  return (
    <header className="pmo-top-header">
      <div className="pmo-top-title">{pageTitle}</div>
      <label className="pmo-search" aria-label="전역 검색">
        <span>검색</span>
        <input placeholder="프로젝트/인력 검색" />
      </label>
      <div className="pmo-user-chip">
        <span className="pmo-avatar">김P</span>
        <span>
          김PMO 책임
          <small>PMO본부 · 관리자</small>
        </span>
      </div>
    </header>
  );
}
