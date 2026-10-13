from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.common import error_envelope
from app.api.routes import (
    assignment_import,
    data_backup,
    health,
    holidays,
    monthly_employment_mm,
    p1_screens,
    personnel,
    personnel_excel,
    project_codes,
    project_excel,
    project_assignments,
    project_logs,
    projects,
    roles,
    users,
)
from app.core.config import settings

app = FastAPI(title="PMO 업무수행 관리시스템 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router, prefix="/api")
app.include_router(assignment_import.router, prefix="/api/assignment-import", tags=["assignment-import"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(project_codes.router, prefix="/api/project-codes", tags=["project-codes"])
app.include_router(project_logs.router, prefix="/api/project-logs", tags=["project-logs"])
app.include_router(personnel.router, prefix="/api/personnel", tags=["personnel"])
app.include_router(personnel_excel.router, prefix="/api/personnel-excel", tags=["personnel-excel"])
app.include_router(roles.router, prefix="/api/roles", tags=["roles"])
app.include_router(monthly_employment_mm.router, prefix="/api/monthly-employment-mm", tags=["monthly-employment-mm"])
app.include_router(holidays.router, prefix="/api/holidays", tags=["holidays"])
app.include_router(p1_screens.router, prefix="/api/p1-screens", tags=["p1-screens"])
app.include_router(data_backup.router, prefix="/api/data-backup", tags=["data-backup"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(project_excel.router, prefix="/api/project-excel", tags=["project-excel"])
app.include_router(project_assignments.router, prefix="/api/project-assignments", tags=["project-assignments"])
app.include_router(project_assignments.monthly_router, prefix="/api/monthly-assignment-mm", tags=["monthly-assignment-mm"])


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    message = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(code=f"HTTP_{exc.status_code}", message=message),
    )
