from fastapi import APIRouter

from app.api.v1 import (
    academics,
    admissions,
    analytics,
    attendance,
    auth,
    communication,
    examinations,
    faculty,
    finance,
    health,
    hostel,
    hr,
    library,
    students,
    tenants,
    transport,
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
api_router.include_router(library.router)
api_router.include_router(hostel.router)
api_router.include_router(transport.router)
api_router.include_router(hr.router)
api_router.include_router(communication.router)
api_router.include_router(analytics.router)
