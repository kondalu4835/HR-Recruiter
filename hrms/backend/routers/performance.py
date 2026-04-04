from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import ReviewCycle, PerformanceReview, Employee, User
from auth_utils import get_current_user

router = APIRouter()

class CycleCreate(BaseModel):
    name: str
    period_start: date
    period_end: date

class ReviewCreate(BaseModel):
    cycle_id: int
    employee_id: int
    manager_id: int

class SelfAssessment(BaseModel):
    achievements: str
    challenges: str
    goals: str

class ManagerReview(BaseModel):
    rating_quality: float
    rating_delivery: float
    rating_communication: float
    rating_initiative: float
    rating_teamwork: float
    manager_comments: Optional[str] = None

@router.get("/cycles")
def list_cycles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cycles = db.query(ReviewCycle).all()
    return [{
        "id": c.id, "name": c.name, "period_start": str(c.period_start),
        "period_end": str(c.period_end), "status": c.status,
        "review_count": len(c.reviews)
    } for c in cycles]

@router.post("/cycles")
def create_cycle(cycle: CycleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = ReviewCycle(**cycle.dict())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "message": "Cycle created"}

@router.get("/cycles/{cycle_id}/reviews")
def list_cycle_reviews(cycle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reviews = db.query(PerformanceReview).filter(PerformanceReview.cycle_id == cycle_id).all()
    return [{
        "id": r.id, "employee_id": r.employee_id,
        "employee_name": r.employee.name if r.employee else None,
        "manager_id": r.manager_id,
        "manager_name": r.manager.name if r.manager else None,
        "status": r.status,
        "rating_quality": r.rating_quality,
        "rating_delivery": r.rating_delivery,
        "rating_communication": r.rating_communication,
        "rating_initiative": r.rating_initiative,
        "rating_teamwork": r.rating_teamwork,
        "ai_summary": r.ai_summary,
        "ai_flags": r.ai_flags,
        "ai_development_actions": r.ai_development_actions,
    } for r in reviews]

@router.post("/reviews")
def create_review(review: ReviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = PerformanceReview(**review.dict())
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "message": "Review created"}

@router.get("/reviews/{review_id}")
def get_review(review_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    return {
        "id": r.id, "cycle_id": r.cycle_id, "employee_id": r.employee_id,
        "employee_name": r.employee.name if r.employee else None,
        "manager_id": r.manager_id,
        "manager_name": r.manager.name if r.manager else None,
        "self_achievements": r.self_achievements,
        "self_challenges": r.self_challenges,
        "self_goals": r.self_goals,
        "rating_quality": r.rating_quality,
        "rating_delivery": r.rating_delivery,
        "rating_communication": r.rating_communication,
        "rating_initiative": r.rating_initiative,
        "rating_teamwork": r.rating_teamwork,
        "manager_comments": r.manager_comments,
        "ai_summary": r.ai_summary,
        "ai_flags": r.ai_flags,
        "ai_development_actions": r.ai_development_actions,
        "status": r.status
    }

@router.put("/reviews/{review_id}/self-assessment")
def submit_self_assessment(review_id: int, assessment: SelfAssessment, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    r.self_achievements = assessment.achievements
    r.self_challenges = assessment.challenges
    r.self_goals = assessment.goals
    r.status = "self_submitted"
    db.commit()
    return {"message": "Self assessment submitted"}

@router.put("/reviews/{review_id}/manager-review")
def submit_manager_review(review_id: int, review: ManagerReview, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    r.rating_quality = review.rating_quality
    r.rating_delivery = review.rating_delivery
    r.rating_communication = review.rating_communication
    r.rating_initiative = review.rating_initiative
    r.rating_teamwork = review.rating_teamwork
    r.manager_comments = review.manager_comments
    r.status = "manager_submitted"
    db.commit()
    return {"message": "Manager review submitted"}
