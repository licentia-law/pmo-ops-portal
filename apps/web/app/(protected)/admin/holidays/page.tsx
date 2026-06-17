import type { Metadata } from "next";
import AdminHolidaysPage from "@/design/pages/AdminHolidaysPage";

export const metadata: Metadata = {
  title: "공휴일 관리",
};

export default function AdminHolidaysRoute() {
  return <AdminHolidaysPage />;
}
