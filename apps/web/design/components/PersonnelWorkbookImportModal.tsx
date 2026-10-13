"use client";
import type { PersonnelTypeCode } from "@pmo/shared-types";
import { applyPersonnelWorkbook, downloadPersonnelExcel, validatePersonnelWorkbook } from "../../app/lib/api";
import MasterWorkbookImportModal from "./MasterWorkbookImportModal";

export default function PersonnelWorkbookImportModal({ personnelType, ...props }: {
  personnelType?: PersonnelTypeCode;
  onClose: () => void;
  onApplied: (message: string) => Promise<void>;
}) {
  return <MasterWorkbookImportModal {...props} kind="인력"
    description="기존 인력은 personnel_id로 수정하고 신규 인력은 ID를 비워 서버에서 발급합니다. 누락 확인은 선택한 유형 범위로 제한하며 기본 유지합니다. 기존 배정·이력·과거 MM은 보존합니다."
    validateWorkbook={file => validatePersonnelWorkbook(file, personnelType)} applyWorkbook={applyPersonnelWorkbook}
    downloadTemplate={() => downloadPersonnelExcel()} />;
}
