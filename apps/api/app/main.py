from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.common import error_envelope
from app.api.routes import health, project_codes, project_logs, projects
from app.core.config import settings

app = FastAPI(title="PMO 업무수행 관리시스템 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(project_codes.router, prefix="/api/project-codes", tags=["project-codes"])
app.include_router(project_logs.router, prefix="/api/project-logs", tags=["project-logs"])


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    message = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_envelope(code=f"HTTP_{exc.status_code}", message=message),
    )
