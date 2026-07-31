from fastapi import APIRouter

from app.api.v1 import auth, health, students, tenants

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(tenants.router)
api_router.include_router(auth.router)
api_router.include_router(students.router)
