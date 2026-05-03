from fastapi import APIRouter
from app.api.endpoints import auth, users, patients, studies, results, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(studies.router)
api_router.include_router(results.router)
api_router.include_router(admin.router)
