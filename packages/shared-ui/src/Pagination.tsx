export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pmo-pagination" aria-label="페이지네이션">
      <button disabled>이전</button>
      <span>{page} / {lastPage}</span>
      <button disabled>다음</button>
    </nav>
  );
}
