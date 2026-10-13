import type { Metadata } from "next";
import AssignmentImportPage from "@/design/pages/AssignmentImportPage";

export const metadata: Metadata = { title: "최초 투입 배정 전환" };
export default function AssignmentImportRoute() { return <AssignmentImportPage />; }
