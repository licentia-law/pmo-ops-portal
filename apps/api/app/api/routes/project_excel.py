from datetime import datetime
from io import BytesIO
from typing import Annotated, Literal
from urllib.parse import quote, unquote

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from app.api.common import envelope
from app.api.deps import DbSession, capability_guard
from app.enums import Capability
from app.models.core import User
from app.services import project_excel

router = APIRouter()
ExcelUser = Annotated[User, Depends(capability_guard(Capability.PROJECT_EXCEL_MANAGE))]


class ExportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    codes: list[str] | None = Field(default=None, max_length=5000)


class ApplyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    validation_id: str
    file_sha256: str
    missing_actions: dict[str, Literal["keep", "deactivate"]] = Field(default_factory=dict)


def workbook_response(raw: bytes, prefix: str) -> StreamingResponse:
    name = f"{prefix}_{datetime.now():%y%m%d_%H%M}.xlsx"
    return StreamingResponse(
        BytesIO(raw), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(name)}"},
    )


@router.get("/template")
def template(session: DbSession, user: ExcelUser):
    return workbook_response(project_excel.export_workbook(session, user, []), "프로젝트관리_템플릿")


@router.post("/export")
def export(payload: ExportPayload, session: DbSession, user: ExcelUser):
    return workbook_response(project_excel.export_workbook(session, user, payload.codes), "프로젝트관리")


@router.post("/validate")
async def validate(
    request: Request, session: DbSession, user: ExcelUser,
    x_upload_filename: Annotated[str | None, Header()] = None,
):
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > project_excel.MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="20MB 이하의 .xlsx 파일을 선택해 주세요.")
    return envelope(project_excel.validate_workbook(session, user, unquote(x_upload_filename or "projects.xlsx"), bytes(raw)))


@router.post("/apply")
def apply(payload: ApplyPayload, session: DbSession, user: ExcelUser):
    return envelope(project_excel.apply_workbook(session, user, payload.validation_id, payload.file_sha256, payload.missing_actions))
