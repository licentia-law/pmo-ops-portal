from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.core import Personnel, User


def normalize_name(value: str | None) -> str:
    return (value or "").strip()


def person_name_with_title(session: Session, raw_name: str | None) -> str:
    name = normalize_name(raw_name)
    if not name:
        return "-"
    if " " in name:
        return name
    person = session.scalar(
        select(Personnel).where(Personnel.name == name).order_by(desc(Personnel.is_active), Personnel.updated_at.desc())
    )
    if not person:
        return name
    title = normalize_name(person.position_name)
    return f"{name} {title}".strip() if title else name


def user_display_name(session: Session, user: User) -> str:
    # Prefer email exact match, fallback to latest same-name personnel.
    person = None
    if user.email:
        person = session.scalar(
            select(Personnel).where(Personnel.email == user.email).order_by(desc(Personnel.is_active), Personnel.updated_at.desc())
        )
    if not person and user.name:
        person = session.scalar(
            select(Personnel).where(Personnel.name == user.name).order_by(desc(Personnel.is_active), Personnel.updated_at.desc())
        )
    if person and person.name:
        title = normalize_name(person.position_name)
        return f"{person.name} {title}".strip() if title else person.name
    return person_name_with_title(session, user.name)
