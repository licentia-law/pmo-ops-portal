from typing import Annotated, Literal
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.api.common import envelope
from app.api.deps import DbSession, capability_guard
from app.api.routes.project_excel import workbook_response
from app.enums import Capability, PersonnelType
from app.models.core import User
from app.services import personnel_excel

router = APIRouter()
ExcelUser = Annotated[User, Depends(capability_guard(Capability.PERSONNEL_EXCEL_MANAGE))]


class ExportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[str] | None = Field(default=None, max_length=5000)


class ApplyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    validation_id: str
    file_sha256: str
    missing_actions: dict[str, Literal["keep", "deactivate"]] = Field(default_factory=dict)


@router.get("/template")
def template(session: DbSession, user: ExcelUser):
    return workbook_response(personnel_excel.export_workbook(session, user, []), "인력관리_템플릿")


@router.post("/export")
def export(payload: ExportPayload, session: DbSession, user: ExcelUser):
    return workbook_response(personnel_excel.export_workbook(session, user, payload.ids), "인력관리")


@router.post("/validate")
async def validate(request: Request, session: DbSession, user: ExcelUser,
                   personnel_type: PersonnelType | None = None,
                   x_upload_filename: Annotated[str | None, Header()] = None):
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > personnel_excel.MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="20MB 이하의 .xlsx 파일을 선택해 주세요.")
    return envelope(personnel_excel.validate_workbook(session, user, unquote(x_upload_filename or "personnel.xlsx"), bytes(raw), personnel_type))


@router.post("/apply")
def apply(payload: ApplyPayload, session: DbSession, user: ExcelUser):
    return envelope(personnel_excel.apply_workbook(session, user, payload.validation_id, payload.file_sha256, payload.missing_actions))
