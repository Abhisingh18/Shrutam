from fastapi import APIRouter

from app.api.v1 import (
    academics,
    admissions,
    analytics,
    attendance,
    auth,
    communication,
    documents,
    examinations,
    faculty,
    finance,
    health,
    hostel,
    hr,
    library,
    notifications,
    students,
    students_bulk,
    tenants,
    timetable,
    transport,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenants.router)
api_router.include_router(auth.router)
api_router.include_router(students_bulk.router)
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
api_router.include_router(documents.router)
api_router.include_router(timetable.router)
api_router.include_router(notifications.router)
