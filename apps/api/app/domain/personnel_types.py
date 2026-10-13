"""Legacy input conversion only. Stored personnel scope uses personnel_type."""
from app.enums import PersonnelType

SALES_OWNER_ROLE_CODE = "SALES_OWNER"
PMO_GROUP_NAME = "PMO본부"
TECHNICAL_GROUP_NAMES = frozenset({"기술본부"})
EXTERNAL_GROUP_NAMES = frozenset({"외부", "기타", "회사 외부", "기타/외부", "기타/회사 외부 인력"})


def classify_legacy_personnel(
    group_name: str | None, role_code: str | None = None, role_name: str | None = None,
) -> PersonnelType:
    """Do not guess technical/external for unknown organizations."""
    if role_code == SALES_OWNER_ROLE_CODE or (not role_code and role_name == "영업대표"):
        return PersonnelType.SALES
    group = (group_name or "").strip()
    if group == PMO_GROUP_NAME:
        return PersonnelType.PMO
    if group in TECHNICAL_GROUP_NAMES:
        return PersonnelType.TECHNICAL
    if group in EXTERNAL_GROUP_NAMES:
        return PersonnelType.EXTERNAL
    raise ValueError(f"인력 유형을 확인할 수 없는 소속입니다: {group!r}. personnel_type을 지정해 주세요.")
