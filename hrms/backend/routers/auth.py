from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, Employee
from auth_utils import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "employee"

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    employee_id: int | None

    class Config:
        from_attributes = True

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created", "id": user.id}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "employee_id": user.employee_id
    }

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == "admin@hrms.com").first():
        return {"message": "Admin already exists"}
    user = User(
        email="admin@hrms.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(user)
    db.commit()
    return {"message": "Admin seeded", "email": "admin@hrms.com", "password": "admin123"}
