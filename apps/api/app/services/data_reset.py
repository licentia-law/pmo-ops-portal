"""Explicitly enabled, authorized reset with atomic deletion and durable audit."""
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.config import settings
from app.domain.capabilities import require_capabilities
from app.enums import Capability
from app.models.core import DataResetAudit, Holiday, Role, User, UserCapability
from app.services import data_backup as backup
from app.services.excel_common import fingerprint

CONFIRMATION = "업무 데이터 전체 초기화"
TTL = timedelta(minutes=10)
VALIDATIONS: dict[str, dict] = {}
VERSION_MODELS = (*backup.TABLE_MODELS.values(), Holiday, Role, User, UserCapability)
PRESERVED_TABLES = ["users", "user_capabilities", "roles", "holidays", "job_locks", "data_reset_audits"]


def schema_ready(session):
    return inspect(session.connection()).has_table(DataResetAudit.__tablename__)


def _state(session):
    return fingerprint(session, VERSION_MODELS)


def _counts(session):
    return {name: backup._table_count(session, model) for name, model in backup.TABLE_MODELS.items()}


def _history(session):
    rows = session.scalars(select(DataResetAudit).order_by(DataResetAudit.created_at.desc(), DataResetAudit.id.desc()).limit(20)).all()
    return [{column.name: backup._serialize_scalar(getattr(row, column.name)) for column in DataResetAudit.__table__.columns} for row in rows]


def preview(session, user):
    require_capabilities(session, user, Capability.DATA_RESET)
    before = _state(session)
    counts = _counts(session)
    ready = schema_ready(session)
    if _state(session) != before:
        raise HTTPException(status_code=409, detail="확인 중 데이터가 변경되었습니다. 다시 조회해 주세요.")
    enabled = settings.data_reset_enabled and ready
    total = sum(counts.values())
    result = {"enabled": enabled, "schema_ready": ready, "counts": counts, "total": total,
              "confirmation_phrase": CONFIRMATION, "preserved_tables": PRESERVED_TABLES,
              "history": _history(session) if ready else [], "validation_id": None,
              "message": "초기화 준비를 위한 DB 마이그레이션이 필요합니다." if not ready else "초기화 기능은 비활성화 상태입니다." if not enabled else "초기화할 업무 데이터가 없습니다." if not total else "대상과 건수를 확인하고 확인 문구를 직접 입력해 주세요."}
    if enabled and total:
        now = backup._now()
        for token, entry in list(VALIDATIONS.items()):
            if entry["created_at"] + TTL < now:
                VALIDATIONS.pop(token, None)
        if len(VALIDATIONS) >= 100:
            raise HTTPException(status_code=429, detail="초기화 확인 요청이 많습니다. 잠시 후 다시 조회해 주세요.")
        token = str(uuid4())
        VALIDATIONS[token] = {"created_at": now, "user_id": user.id, "version": before, "counts": counts}
        result["validation_id"] = token
    return result


def _require_enabled(session, user):
    require_capabilities(session, user, Capability.DATA_RESET)
    if not settings.data_reset_enabled:
        raise HTTPException(status_code=403, detail="초기화 기능은 비활성화 상태입니다.")
    if not schema_ready(session):
        raise HTTPException(status_code=409, detail="초기화 감사 이력 마이그레이션을 먼저 적용해 주세요.")


def _lock_dataset(session):
    dialect = session.get_bind().dialect
    if dialect.name == "sqlite":
        session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    elif dialect.name == "postgresql":
        # Blocks ordinary CRUD writes and SELECT FOR UPDATE, including new rows.
        names = ", ".join(dialect.identifier_preparer.quote(model.__tablename__) for model in sorted(VERSION_MODELS, key=lambda m: m.__tablename__))
        session.connection().exec_driver_sql(f"LOCK TABLE {names} IN EXCLUSIVE MODE")
    else:
        raise HTTPException(status_code=503, detail="전체 초기화는 SQLite/PostgreSQL에서만 지원합니다.")


def _verified_backup(session, actor, memo, counts):
    record = backup.create_backup(session, actor_name=actor["actor_name"], kind="reset_before_backup", memo=memo)
    path = backup.BACKUP_DIR / f"{record['backup_id']}.json"
    # Detect incomplete/corrupt backup writes before deleting a single row.
    payload = backup._load_backup_payload(record["backup_id"])
    if backup._file_sha256(path.read_bytes()) != record["file_hash"] or payload["counts"] != counts or set(payload["tables"]) != set(backup.TABLE_MODELS):
        raise HTTPException(status_code=409, detail="초기화 전 백업 검증에 실패했습니다. 업무 데이터는 삭제하지 않습니다.")
    for name, model in backup.TABLE_MODELS.items():
        stored = sorted(payload["tables"][name], key=lambda row: row["id"])
        current = sorted(backup._serialize_table_rows(session, model), key=lambda row: row["id"])
        if stored != current:
            raise HTTPException(status_code=409, detail="백업과 현재 데이터가 일치하지 않습니다. 다시 확인해 주세요.")
    return record


def _audit_failure(session, actor, validation_id, counts, pre_backup_id, memo, message):
    session.rollback()
    try:
        session.add(DataResetAudit(validation_id=validation_id, status="failed", before_counts=counts,
                                  pre_backup_id=pre_backup_id, memo=memo, message=message, **actor))
        session.commit()
    except Exception:
        session.rollback()
        # A broken DB must not hide the original error; independent file fallback.
        try:
            backup._append_manifest({"id": backup._make_id("OPR"), "created_at": backup._now().isoformat(),
                                     "kind": "reset_failed", "status": "failed", "source_backup_id": pre_backup_id,
                                     "actor_name": actor["actor_name"], "counts": counts, "message": message})
        except OSError:
            pass


def reset(session, user, validation_id, confirmation, memo=None):
    _require_enabled(session, user)
    if confirmation != CONFIRMATION:
        raise HTTPException(status_code=400, detail=f"확인 문구를 정확히 입력해 주세요: {CONFIRMATION}")
    cached = VALIDATIONS.get(validation_id)
    if not cached or cached["created_at"] + TTL < backup._now():
        raise HTTPException(status_code=409, detail="초기화 확인 결과가 없거나 만료되었습니다. 대상과 건수를 다시 조회해 주세요.")
    if cached["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="다른 사용자의 초기화 확인 결과를 실행할 수 없습니다.")
    actor = {"actor_user_id": user.id, "actor_name": user.name, "actor_email": user.email}
    backup._acquire_lock(session, locked_by=user.name)
    before_backup = None
    counts = cached["counts"]
    committed = False
    release_warning = False
    try:
        _lock_dataset(session)
        _require_enabled(session, user)
        if cached["created_at"] + TTL < backup._now():
            raise HTTPException(status_code=409, detail="초기화 확인 결과가 만료되었습니다. 대상과 건수를 다시 조회해 주세요.")
        if VALIDATIONS.get(validation_id) is not cached or _state(session) != cached["version"]:
            raise HTTPException(status_code=409, detail="확인 이후 데이터가 변경되었습니다. 대상과 건수를 다시 조회해 주세요.")
        require_capabilities(session, user, Capability.DATA_RESET)
        if session.scalar(select(DataResetAudit.id).where(DataResetAudit.validation_id == validation_id, DataResetAudit.status == "success").limit(1)):
            raise HTTPException(status_code=409, detail="이미 실행된 초기화 확인 결과입니다. 다시 조회해 주세요.")
        counts = _counts(session)
        if not sum(counts.values()):
            raise HTTPException(status_code=409, detail="초기화할 업무 데이터가 없습니다.")
        before_backup = _verified_backup(session, actor, memo, counts)
        backup._delete_dataset(session)
        remaining = _counts(session)
        if any(remaining.values()):
            raise HTTPException(status_code=409, detail="초기화 후 남은 업무 데이터가 있어 전체 롤백합니다.")
        audit = DataResetAudit(validation_id=validation_id, status="success", before_counts=counts,
                              pre_backup_id=before_backup["backup_id"], memo=memo,
                              message="자동 백업 후 업무 데이터 전체 초기화를 완료했습니다.", **actor)
        session.add(audit)
        session.flush()
        audit_id = audit.id
        # Success audit and deletion are committed together, never best-effort.
        session.commit()
        committed = True
    except Exception as exc:
        message = str(exc.detail if isinstance(exc, HTTPException) else exc)
        _audit_failure(session, actor, validation_id, counts, before_backup["backup_id"] if before_backup else None, memo, message)
        if isinstance(exc, (IntegrityError, OperationalError)):
            raise HTTPException(status_code=409, detail="초기화 중 DB 충돌이 발생해 전체 롤백했습니다. 다시 확인해 주세요.") from exc
        raise
    finally:
        try:
            backup._release_lock(session)
        except Exception:
            session.rollback()
            release_warning = True  # Do not misreport an already committed reset.
    VALIDATIONS.pop(validation_id, None)
    message = "업무 데이터 전체 초기화를 완료했습니다. 사용자·권한·역할·공휴일·백업·감사 이력은 유지했습니다."
    if committed and release_warning:
        message += " 작업 잠금 해제에 실패했습니다. 감사 이력을 확인하고 잠금 만료 전 추가 반영을 중단해 주세요."
    try:
        backup._append_manifest({"id": backup._make_id("OPR"), "created_at": backup._now().isoformat(),
                                 "kind": "reset_complete", "status": "success", "source_backup_id": before_backup["backup_id"],
                                 "actor_name": actor["actor_name"], "counts": counts, "memo": memo, "audit_id": audit_id})
    except OSError:
        message += " 이력 파일 기록은 실패했으나 DB 감사 이력과 복구용 백업은 보존됩니다."
    return {"audit_id": audit_id, "pre_backup_id": before_backup["backup_id"], "deleted_counts": counts,
            "remaining_counts": remaining, "message": message}
