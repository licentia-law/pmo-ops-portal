from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_projects() -> dict[str, object]:
    # TODO: repository 연결 전까지 API contract envelope 형태만 고정.
    return {"items": [], "page": 1, "page_size": 10, "total": 0, "summary": {}}
