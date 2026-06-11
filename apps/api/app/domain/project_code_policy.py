from __future__ import annotations

import re
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.core import Project, ProjectCode

PROJECT_CODE_SEQUENCE_LENGTH = 3


def project_code_prefix(year: int | None = None) -> str:
    return f"P{year or date.today().year}"


def generate_project_code(session: Session, year: int | None = None) -> str:
    prefix = project_code_prefix(year)
    pattern = re.compile(rf"^{re.escape(prefix)}(\d{{{PROJECT_CODE_SEQUENCE_LENGTH}}})$")
    codes = list(session.scalars(select(ProjectCode.code).where(ProjectCode.code.like(f"{prefix}%"))))
    codes.extend(session.scalars(select(Project.code).where(Project.code.like(f"{prefix}%"))))

    sequences = [
        int(match.group(1))
        for code in codes
        if (match := pattern.match(str(code or "").strip()))
    ]
    next_sequence = (max(sequences) if sequences else 0) + 1
    return f"{prefix}{next_sequence:0{PROJECT_CODE_SEQUENCE_LENGTH}d}"
