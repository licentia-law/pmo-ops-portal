from typing import Any, Literal

from fastapi import HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import Select, asc, desc, func, or_, select
from sqlalchemy.orm import Session


class ErrorBody(BaseModel):
    code: str
    message: str


class ApiEnvelope(BaseModel):
    data: Any = None
    meta: dict[str, Any] = {}
    error: ErrorBody | None = None


def envelope(data: Any = None, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"data": data, "meta": meta or {}, "error": None}


def error_envelope(code: str, message: str) -> dict[str, Any]:
    return {"data": None, "meta": {}, "error": {"code": code, "message": message}}


class ListParams(BaseModel):
    page: int = Query(default=1, ge=1)
    page_size: int = Query(default=10, ge=1, le=100)
    sort: str = "-updated_at"
    q: str | None = None
    status: str | None = None
    project_type: str | None = None


def parse_sort(sort: str, allowed: dict[str, Any], default: str = "-updated_at") -> Any:
    sort_value = sort or default
    direction: Literal["asc", "desc"] = "asc"
    field = sort_value
    if sort_value.startswith("-"):
        direction = "desc"
        field = sort_value[1:]
    if field not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 정렬 필드입니다: {field}")
    return desc(allowed[field]) if direction == "desc" else asc(allowed[field])


def apply_text_search(statement: Select[Any], q: str | None, fields: list[Any]) -> Select[Any]:
    if not q:
        return statement
    keyword = f"%{q.strip()}%"
    if keyword == "%%":
        return statement
    return statement.where(or_(*[field.ilike(keyword) for field in fields]))


def paginate(session: Session, statement: Select[Any], page: int, page_size: int) -> tuple[list[Any], int]:
    total_statement = select(func.count()).select_from(statement.order_by(None).subquery())
    total = session.scalar(total_statement) or 0
    rows = session.scalars(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return rows, total
