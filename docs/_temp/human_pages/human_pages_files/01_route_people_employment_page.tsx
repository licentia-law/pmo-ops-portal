import type { Metadata } from "next";
import PeopleEmploymentPage from "@/design/pages/PeopleEmploymentPage";

export const metadata: Metadata = {
  title: "인력 관리"
};

export default function PeopleEmploymentRoute() {
  return <PeopleEmploymentPage />;
}

