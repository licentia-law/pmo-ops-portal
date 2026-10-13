import type { Metadata } from "next";
import DataBackupRestorePage from "@/design/pages/DataBackupRestorePage";

export const metadata: Metadata = {
  title: "데이터 백업/복원",
};

export default function DataBackupRoute() {
  return <DataBackupRestorePage />;
}
