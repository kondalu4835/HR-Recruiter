from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from database import engine, Base, SessionLocal
from models import User
from auth_utils import get_password_hash
from routers import (
    auth, employees, recruitment, leave,
    performance, onboarding, analytics, ai_features
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Powered HRMS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(BASE_DIR, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.on_event("startup")
def ensure_default_admin():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@hrms.com").first():
            db.add(User(
                email="admin@hrms.com",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            ))
            db.commit()
    finally:
        db.close()

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(recruitment.router, prefix="/api/recruitment", tags=["Recruitment"])
app.include_router(leave.router, prefix="/api/leave", tags=["Leave"])
app.include_router(performance.router, prefix="/api/performance", tags=["Performance"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_features.router, prefix="/api/ai", tags=["AI Features"])

@app.get("/")
def root():
    return {"message": "AI-Powered HRMS API is running"}
