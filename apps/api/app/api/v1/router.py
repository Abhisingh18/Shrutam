from fastapi import APIRouter

from app.api.v1 import (
    academics,
    admissions,
    attendance,
    auth,
    examinations,
    faculty,
    finance,
    health,
    students,
    tenants,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenants.router)
api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(academics.router)
api_router.include_router(admissions.router)
api_router.include_router(attendance.router)
api_router.include_router(examinations.router)
api_router.include_router(faculty.router)
api_router.include_router(finance.router)
