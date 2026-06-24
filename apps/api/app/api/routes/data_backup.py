from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel

from app.api.common import envelope
from app.api.deps import CurrentUser, DbSession
from app.services.data_backup import (
    _require_admin,
    apply_validated_upload,
    backup_detail,
    create_backup as create_backup_service,
    overview,
    restore_backup as restore_backup_service,
    validate_upload,
)

router = APIRouter()


class BackupCreatePayload(BaseModel):
    memo: str | None = None


class UploadApplyPayload(BaseModel):
    validation_id: str
    memo: str | None = None


class RestorePayload(BaseModel):
    backup_id: str
    memo: str | None = None


@router.get("/overview")
def get_overview(session: DbSession, user: CurrentUser) -> dict[str, object]:
    _require_admin(user)
    return envelope(overview(session))


@router.post("/backups")
def create_backup(payload: BackupCreatePayload, session: DbSession, user: CurrentUser) -> dict[str, object]:
    _require_admin(user)
    record = create_backup_service(session, actor_name=user.name or "관리자", kind="manual_backup", memo=payload.memo)
    return envelope(record)


@router.get("/backups/{backup_id}")
def get_backup_detail(backup_id: str, user: CurrentUser) -> dict[str, object]:
    _require_admin(user)
    return envelope(backup_detail(backup_id))


@router.post("/validate")
async def validate_workbook(
    request: Request,
    session: DbSession,
    user: CurrentUser,
    x_upload_filename: Annotated[str | None, Header()] = None,
) -> dict[str, object]:
    _require_admin(user)
    raw = await request.body()
    return envelope(validate_upload(session, x_upload_filename or "upload.xlsx", raw))


@router.post("/apply")
def apply_workbook(payload: UploadApplyPayload, session: DbSession, user: CurrentUser) -> dict[str, object]:
    return envelope(apply_validated_upload(session, validation_id=payload.validation_id, memo=payload.memo, user=user))


@router.post("/restore")
def restore_backup(payload: RestorePayload, session: DbSession, user: CurrentUser) -> dict[str, object]:
    return envelope(restore_backup_service(session, backup_id=payload.backup_id, memo=payload.memo, user=user))
