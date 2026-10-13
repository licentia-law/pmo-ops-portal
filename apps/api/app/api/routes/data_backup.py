from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.common import envelope
from app.api.deps import DbSession, capability_guard
from app.enums import Capability
from app.models.core import User
from app.services import data_reset
from app.services.data_backup import (
    _acquire_lock,
    _release_lock,
    delete_backup,
    backup_detail,
    create_backup as create_backup_service,
    overview,
    restore_backup as restore_backup_service,
)

router = APIRouter()
BackupUser = Annotated[User, Depends(capability_guard(Capability.BACKUP_RESTORE))]
ResetUser = Annotated[User, Depends(capability_guard(Capability.DATA_RESET))]


class BackupCreatePayload(BaseModel):
    memo: str | None = None


class RestorePayload(BaseModel):
    backup_id: str
    memo: str | None = None


class ResetPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    validation_id: str = Field(min_length=1, max_length=36)
    confirmation: str = Field(max_length=100)
    memo: str | None = Field(default=None, max_length=1000)


@router.get("/reset/preview")
def preview_reset(session: DbSession, user: ResetUser):
    return envelope(data_reset.preview(session, user))


@router.post("/reset")
def reset_data(payload: ResetPayload, session: DbSession, user: ResetUser):
    return envelope(data_reset.reset(session, user, payload.validation_id, payload.confirmation, payload.memo))


@router.get("/overview")
def get_overview(session: DbSession, user: BackupUser) -> dict[str, object]:
    return envelope(overview(session))


@router.post("/backups")
def create_backup(payload: BackupCreatePayload, session: DbSession, user: BackupUser) -> dict[str, object]:
    _acquire_lock(session, locked_by=user.name)
    try:
        record = create_backup_service(session, actor_name=user.name or "관리자", kind="manual_backup", memo=payload.memo)
        return envelope(record)
    finally:
        _release_lock(session)


@router.get("/backups/{backup_id}")
def get_backup_detail(backup_id: str, user: BackupUser) -> dict[str, object]:
    return envelope(backup_detail(backup_id))


@router.delete("/backups/{backup_id}")
def remove_backup(backup_id: str, session: DbSession, user: BackupUser) -> dict[str, object]:
    _acquire_lock(session, locked_by=user.name)
    try:
        return envelope(delete_backup(backup_id))
    finally:
        _release_lock(session)


@router.post("/restore")
def restore_backup(payload: RestorePayload, session: DbSession, user: BackupUser) -> dict[str, object]:
    return envelope(restore_backup_service(session, backup_id=payload.backup_id, memo=payload.memo, user=user))
