import type { Metadata } from "next";
import CodePage from '../../../../design/pages/CodePage';

export const metadata: Metadata = {
  title: "프로젝트 관리"
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ProjectsCodesPage({ searchParams }: PageProps) {
  const createParam = firstParam(searchParams?.create);
  const editCodeParam = firstParam(searchParams?.editCode);
  return <CodePage initialCreate={createParam === "1"} initialEditCode={editCodeParam ?? null} />;
}


