from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, shutil, uuid

from database import get_db
from models import JobPosting, Candidate, User
from auth_utils import get_current_user

router = APIRouter()
RESUME_DIR = "uploads/resumes"
os.makedirs(RESUME_DIR, exist_ok=True)

STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"]

class JobCreate(BaseModel):
    title: str
    department: Optional[str] = None
    description: str
    required_skills: Optional[str] = None
    experience_level: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    experience_level: Optional[str] = None
    status: Optional[str] = None

class StageUpdate(BaseModel):
    stage: str
    notes: Optional[str] = None

@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jobs = db.query(JobPosting).all()
    return [{
        "id": j.id, "title": j.title, "department": j.department,
        "description": j.description, "required_skills": j.required_skills,
        "experience_level": j.experience_level, "status": j.status,
        "created_at": str(j.created_at),
        "candidate_count": len(j.candidates)
    } for j in jobs]

@router.post("/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    j = JobPosting(**job.dict())
    db.add(j)
    db.commit()
    db.refresh(j)
    return {"id": j.id, "message": "Job posting created"}

@router.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    j = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = [{
        "id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
        "stage": c.stage, "ai_score": c.ai_score, "ai_reasoning": c.ai_reasoning,
        "ai_strengths": c.ai_strengths, "ai_gaps": c.ai_gaps,
        "ai_questions": c.ai_questions, "notes": c.notes,
        "resume_path": c.resume_path, "created_at": str(c.created_at)
    } for c in j.candidates]
    return {
        "id": j.id, "title": j.title, "department": j.department,
        "description": j.description, "required_skills": j.required_skills,
        "experience_level": j.experience_level, "status": j.status,
        "candidates": candidates
    }

@router.put("/jobs/{job_id}")
def update_job(job_id: int, job: JobUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    j = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, value in job.dict(exclude_unset=True).items():
        setattr(j, field, value)
    db.commit()
    return {"message": "Job updated"}

@router.post("/candidates")
async def add_candidate(
    job_posting_id: int = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    ext = os.path.splitext(resume.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(RESUME_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(resume.file, f)
    candidate = Candidate(
        job_posting_id=job_posting_id,
        name=name,
        email=email,
        phone=phone,
        resume_path=file_path
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return {"id": candidate.id, "message": "Candidate added"}

@router.put("/candidates/{candidate_id}/stage")
def update_stage(candidate_id: int, update: StageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if update.stage not in STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {STAGES}")
    c.stage = update.stage
    if update.notes:
        c.notes = update.notes
    db.commit()
    return {"message": "Stage updated"}

@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "id": c.id, "name": c.name, "email": c.email, "phone": c.phone,
        "job_posting_id": c.job_posting_id, "stage": c.stage,
        "ai_score": c.ai_score, "ai_reasoning": c.ai_reasoning,
        "ai_strengths": c.ai_strengths, "ai_gaps": c.ai_gaps,
        "ai_questions": c.ai_questions, "notes": c.notes,
        "resume_path": c.resume_path
    }

@router.get("/candidates/compare/{job_id}")
def compare_candidates(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    candidates = db.query(Candidate).filter(
        Candidate.job_posting_id == job_id,
        Candidate.stage.in_(["screening", "interview", "offer"])
    ).all()
    return [{
        "id": c.id, "name": c.name, "email": c.email,
        "stage": c.stage, "ai_score": c.ai_score,
        "ai_strengths": c.ai_strengths, "ai_gaps": c.ai_gaps,
    } for c in candidates]
