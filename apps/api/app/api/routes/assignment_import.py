from typing import Annotated
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from app.api.common import envelope
from app.api.deps import DbSession, capability_guard
from app.api.routes.project_excel import workbook_response
from app.enums import Capability
from app.models.core import User
from app.services import assignment_import

router = APIRouter()
ImportUser = Annotated[User, Depends(capability_guard(Capability.ASSIGNMENT_MANAGE))]


class ApplyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    validation_id: str
    file_sha256: str
    acknowledge_warnings: bool = False


@router.get("/status")
def status(session: DbSession, user: ImportUser):
    return envelope(assignment_import.status(session, user))


@router.get("/template")
def template(session: DbSession, user: ImportUser):
    return workbook_response(assignment_import.template(session, user), "최초투입전환_템플릿")


@router.get("/references")
def references(session: DbSession, user: ImportUser):
    return workbook_response(assignment_import.template(session, user, references=True), "최초투입전환_참조")


@router.post("/validate")
async def validate(request: Request, session: DbSession, user: ImportUser,
                   x_upload_filename: Annotated[str | None, Header()] = None):
    assignment_import.require_open(session, user)
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > assignment_import.MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="20MB 이하의 .xlsx 파일이 필요합니다.")
    return envelope(assignment_import.validate_workbook(session, user, unquote(x_upload_filename or "assignments.xlsx"), bytes(raw)))


@router.post("/apply")
def apply(payload: ApplyPayload, session: DbSession, user: ImportUser):
    return envelope(assignment_import.apply_workbook(session, user, payload.validation_id, payload.file_sha256, payload.acknowledge_warnings))
