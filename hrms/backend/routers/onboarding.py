from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os, shutil, uuid, json

from database import get_db
from models import OnboardingChecklist, OnboardingItem, EmployeeOnboarding, PolicyDocument, ChatbotQuery, User
from auth_utils import get_current_user

router = APIRouter()
POLICY_DIR = "uploads/policies"
os.makedirs(POLICY_DIR, exist_ok=True)

class ChecklistCreate(BaseModel):
    role: str
    title: str
    items: List[dict]

class OnboardingAssign(BaseModel):
    employee_id: int
    checklist_id: int

class ProgressUpdate(BaseModel):
    item_id: int
    completed: bool

@router.get("/checklists")
def list_checklists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    checklists = db.query(OnboardingChecklist).all()
    return [{
        "id": c.id, "role": c.role, "title": c.title,
        "item_count": len(c.items)
    } for c in checklists]

@router.post("/checklists")
def create_checklist(data: ChecklistCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    checklist = OnboardingChecklist(role=data.role, title=data.title)
    db.add(checklist)
    db.flush()
    for item_data in data.items:
        item = OnboardingItem(
            checklist_id=checklist.id,
            title=item_data.get("title", ""),
            description=item_data.get("description", ""),
            due_days=item_data.get("due_days", 7),
            assignee_role=item_data.get("assignee_role", "employee")
        )
        db.add(item)
    db.commit()
    return {"id": checklist.id, "message": "Checklist created"}

@router.get("/checklists/{checklist_id}")
def get_checklist(checklist_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(OnboardingChecklist).filter(OnboardingChecklist.id == checklist_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return {
        "id": c.id, "role": c.role, "title": c.title,
        "items": [{"id": i.id, "title": i.title, "description": i.description,
                   "due_days": i.due_days, "assignee_role": i.assignee_role} for i in c.items]
    }

@router.post("/assign")
def assign_onboarding(data: OnboardingAssign, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(EmployeeOnboarding).filter(
        EmployeeOnboarding.employee_id == data.employee_id,
        EmployeeOnboarding.checklist_id == data.checklist_id
    ).first()
    if existing:
        return {"id": existing.id, "message": "Already assigned"}
    onboarding = EmployeeOnboarding(
        employee_id=data.employee_id,
        checklist_id=data.checklist_id,
        progress="{}"
    )
    db.add(onboarding)
    db.commit()
    db.refresh(onboarding)
    return {"id": onboarding.id, "message": "Onboarding assigned"}

@router.get("/employee/{employee_id}")
def get_employee_onboarding(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    onboardings = db.query(EmployeeOnboarding).filter(EmployeeOnboarding.employee_id == employee_id).all()
    result = []
    for o in onboardings:
        progress = json.loads(o.progress or "{}")
        checklist = o.checklist
        items = []
        if checklist:
            for item in checklist.items:
                items.append({
                    "id": item.id, "title": item.title,
                    "description": item.description, "due_days": item.due_days,
                    "assignee_role": item.assignee_role,
                    "completed": progress.get(str(item.id), False)
                })
        total = len(items)
        completed = sum(1 for i in items if i["completed"])
        result.append({
            "id": o.id, "checklist_id": o.checklist_id,
            "checklist_title": checklist.title if checklist else None,
            "items": items, "total": total, "completed": completed,
            "progress_pct": int(completed / total * 100) if total else 0
        })
    return result

@router.put("/progress/{onboarding_id}")
def update_progress(onboarding_id: int, update: ProgressUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    o = db.query(EmployeeOnboarding).filter(EmployeeOnboarding.id == onboarding_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    progress = json.loads(o.progress or "{}")
    progress[str(update.item_id)] = update.completed
    o.progress = json.dumps(progress)
    db.commit()
    return {"message": "Progress updated"}

@router.post("/policy-documents")
async def upload_policy(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(POLICY_DIR, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    # Extract text
    text = ""
    if ext.lower() == ".pdf":
        try:
            import PyPDF2, io
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() or ""
        except Exception as e:
            text = ""
    elif ext.lower() in [".txt", ".md"]:
        text = content.decode("utf-8", errors="ignore")
    doc = PolicyDocument(title=title, filename=file.filename, file_path=file_path, content_text=text)
    db.add(doc)
    db.commit()
    return {"message": "Policy document uploaded", "id": doc.id}

@router.get("/policy-documents")
def list_policy_docs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(PolicyDocument).all()
    return [{"id": d.id, "title": d.title, "filename": d.filename, "uploaded_at": str(d.uploaded_at)} for d in docs]

@router.get("/chatbot-queries")
def list_chatbot_queries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    queries = db.query(ChatbotQuery).order_by(ChatbotQuery.created_at.desc()).limit(100).all()
    from collections import Counter
    question_counts = Counter(q.question for q in queries)
    return {
        "recent": [{"id": q.id, "question": q.question, "answer": q.answer,
                    "was_answered": q.was_answered, "created_at": str(q.created_at)} for q in queries[:20]],
        "top_questions": [{"question": q, "count": c} for q, c in question_counts.most_common(10)]
    }
