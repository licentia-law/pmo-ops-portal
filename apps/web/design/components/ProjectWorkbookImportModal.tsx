"use client";
import { applyProjectWorkbook, downloadProjectExcel, validateProjectWorkbook } from "../../app/lib/api";
import MasterWorkbookImportModal from "./MasterWorkbookImportModal";

export default function ProjectWorkbookImportModal(props: {
  onClose: () => void;
  onApplied: (message: string) => Promise<void>;
}) {
  return <MasterWorkbookImportModal {...props} kind="프로젝트"
    description="프로젝트 코드로 신규·수정 여부를 확인합니다. 파일에 없는 프로젝트는 기본 유지하며, 인력·배정·기존 이력은 보존합니다."
    validateWorkbook={validateProjectWorkbook} applyWorkbook={applyProjectWorkbook}
    downloadTemplate={() => downloadProjectExcel()} />;
}
