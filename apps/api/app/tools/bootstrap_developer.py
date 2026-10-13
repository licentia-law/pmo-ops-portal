"""Local, explicit bootstrap of a confirmed existing user; never infer from admin."""
import argparse

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.enums import UserPermission
from app.models.core import User


def bootstrap_developer(session: Session, *, user_id: str, email: str, name: str) -> User:
    target = session.get(User, user_id)
    if target is None or target.name != name:
        raise HTTPException(status_code=409, detail="확인한 사용자 ID와 성명이 일치하지 않습니다.")
    normalized_email = email.strip().lower()
    if not normalized_email or "@" not in normalized_email:
        raise HTTPException(status_code=400, detail="개발자 이메일이 필요합니다.")
    conflict = session.scalar(select(User.id).where(User.email == normalized_email, User.id != user_id))
    other_developer = session.scalar(select(User.id).where(User.is_developer.is_(True), User.id != user_id))
    if conflict or other_developer:
        raise HTTPException(status_code=409, detail="이메일 또는 기존 개발자 지정이 충돌합니다.")
    target.email = normalized_email
    target.permission = UserPermission.ADMIN
    target.is_developer = True
    session.flush()
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap one explicitly confirmed developer account.")
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    with SessionLocal() as session:
        try:
            user = bootstrap_developer(session, user_id=args.user_id, email=args.email, name=args.name)
            session.commit()
            print(f"DEVELOPER_READY user_id={user.id} email={user.email}")
        except Exception:
            session.rollback()
            raise


if __name__ == "__main__":
    main()
