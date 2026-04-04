from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os, json
from datetime import datetime
from database import get_db
from models import (
    Employee, Candidate, JobPosting, PerformanceReview,
    PolicyDocument, ChatbotQuery, User
)
from auth_utils import get_current_user
import requests
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# --- Initialize Mistral API ---
# MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_API_KEY =os.getenv("MISTRAL_API_KEY")
MISTRAL_API_URL = "https://api.mistral.ai/v1"

def call_mistral(prompt: str) -> str:
    """Call Mistral API via REST and return the response text"""
    if not MISTRAL_API_KEY:
        return "AI service not available. Please set MISTRAL_API_KEY environment variable."
    
    try:
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "mistral-small",
            "messages": [{"role": "user", "content": prompt}]
        }
        
        response = requests.post(
            f"{MISTRAL_API_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("choices") and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            return ""
        else:
            print(f"Mistral API Error: {response.status_code} - {response.text}")
            return f"AI error: {response.status_code}"
    except Exception as e:
        print(f"Mistral API Error: {str(e)}")
        return f"AI error: {str(e)}"

# --- Employee Bio Generation ---
class BioRequest(BaseModel):
    employee_id: int

@router.post("/generate-bio")
def generate_bio(req: BioRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    prompt = f"""Generate a professional employee bio (2-3 paragraphs) based on:
Name: {emp.name}
Designation: {emp.designation}
Department: {emp.department}
Joining Date: {emp.joining_date}
Skills: {emp.skills}
Write in third person, professional tone."""
    bio = call_mistral(prompt)
    emp.bio = bio
    db.commit()
    return {"bio": bio}

# --- Duplicate/Incomplete Profile Detection ---
@router.get("/check-profiles")
def check_profiles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).all()
    flags = []
    emails = {}
    for e in employees:
        issues = []
        if not e.phone: issues.append("Missing phone")
        if not e.designation: issues.append("Missing designation")
        if not e.department: issues.append("Missing department")
        if not e.joining_date: issues.append("Missing joining date")
        if not e.skills: issues.append("Missing skills")
        if e.email in emails:
            issues.append(f"Duplicate email with employee ID {emails[e.email]}")
        else:
            emails[e.email] = e.id
        if issues:
            flags.append({"employee_id": e.id, "name": e.name, "issues": issues})
    return {"flagged_profiles": flags}

# --- Resume Scoring ---
class ResumeScoreRequest(BaseModel):
    candidate_id: int

@router.post("/score-resume")
def score_resume(req: ResumeScoreRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = db.query(JobPosting).filter(JobPosting.id == candidate.job_posting_id).first()
    resume_text = ""
    if candidate.resume_path and os.path.exists(candidate.resume_path):
        ext = os.path.splitext(candidate.resume_path)[1].lower()
        if ext == ".pdf":
            try:
                import PyPDF2
                with open(candidate.resume_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        resume_text += page.extract_text() or ""
            except Exception as e:
                print(f"PDF extraction error: {e}")
                resume_text = "Could not extract PDF text"
        elif ext in [".txt", ".md"]:
            try:
                with open(candidate.resume_path, "r") as f:
                    resume_text = f.read()
            except Exception as e:
                print(f"File read error: {e}")
                resume_text = "Could not read resume file"

    prompt = f"""You are an expert HR recruiter. Analyze this candidate for the job and respond in JSON only.

JOB TITLE: {job.title if job else 'N/A'}
JOB DESCRIPTION: {job.description if job else 'N/A'}
REQUIRED SKILLS: {job.required_skills if job else 'N/A'}
EXPERIENCE LEVEL: {job.experience_level if job else 'N/A'}

CANDIDATE NAME: {candidate.name}
RESUME TEXT: {resume_text[:3000] if resume_text else 'No resume text available'}

Respond with ONLY valid JSON:
{{
  "match_score": 85,
  "reasoning": "The candidate has strong relevant experience",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "interview_questions": ["q1", "q2", "q3", "q4", "q5"]
}}"""

    response = call_mistral(prompt)
    try:
        clean = response.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        
        data = json.loads(clean)
        candidate.ai_score = data.get("match_score", 0)
        candidate.ai_reasoning = data.get("reasoning", "")
        candidate.ai_strengths = json.dumps(data.get("strengths", []))
        candidate.ai_gaps = json.dumps(data.get("gaps", []))
        candidate.ai_questions = json.dumps(data.get("interview_questions", []))
        db.commit()
        return data
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"error": "Could not parse AI response", "raw": response[:500]}

# --- Performance Review AI Summary ---
class ReviewSummaryRequest(BaseModel):
    review_id: int

@router.post("/generate-review-summary")
def generate_review_summary(req: ReviewSummaryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(PerformanceReview).filter(PerformanceReview.id == req.review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    prompt = f"""You are an HR professional. Generate a balanced performance review summary.

EMPLOYEE SELF-ASSESSMENT:
Achievements: {r.self_achievements or 'Not provided'}
Challenges: {r.self_challenges or 'Not provided'}
Goals for next period: {r.self_goals or 'Not provided'}

MANAGER RATINGS (out of 5):
Quality: {r.rating_quality}
Delivery: {r.rating_delivery}
Communication: {r.rating_communication}
Initiative: {r.rating_initiative}
Teamwork: {r.rating_teamwork}
Manager Comments: {r.manager_comments or 'None'}

Provide:
1. A 2-3 paragraph professional summary
2. Any mismatches between self-assessment and manager ratings (if significant)
3. 2-3 specific development action recommendations

Format as JSON:
{{
  "summary": "Professional summary paragraph",
  "flags": "Any mismatches observed",
  "development_actions": ["action1", "action2", "action3"]
}}"""
    
    response = call_mistral(prompt)
    try:
        clean = response.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        
        data = json.loads(clean)
        r.ai_summary = data.get("summary", "")
        r.ai_flags = data.get("flags", "")
        r.ai_development_actions = json.dumps(data.get("development_actions", []))
        r.status = "completed"
        db.commit()
        return data
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"error": "Could not parse AI response", "raw": response[:500]}

# --- Onboarding Chatbot ---
class ChatRequest(BaseModel):
    question: str
    employee_id: Optional[int] = None

@router.post("/chatbot")
def chatbot(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(PolicyDocument).all()
    context = "\n\n".join([f"Document: {d.title}\n{d.content_text[:2000]}" for d in docs if d.content_text])
    if not context:
        answer = "No policy documents uploaded. Contact HR."
        was_answered = False
    else:
        prompt = f"""You are an HR onboarding assistant. Answer ONLY based on the policy documents:
{context[:6000]}

EMPLOYEE QUESTION: {req.question}

Answer concisely and helpfully."""
        answer = call_mistral(prompt)
        was_answered = "contact HR" not in answer.lower()
    log = ChatbotQuery(employee_id=req.employee_id, question=req.question, answer=answer, was_answered=was_answered)
    db.add(log)
    db.commit()
    return {"answer": answer, "was_answered": was_answered}

# --- HR Analytics AI Summary ---
@router.get("/hr-monthly-summary")
def hr_monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import LeaveRequest
    total = db.query(Employee).count()
    active = db.query(Employee).filter(Employee.is_active == True).count()
    terminated = db.query(Employee).filter(Employee.is_active == False).count()
    open_jobs = db.query(JobPosting).filter(JobPosting.status == "open").count()
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()
    prompt = f"""Generate a concise monthly HR summary report with key highlights, risks, and recommended actions.

HR DATA:
- Total Employees: {total}
- Active Employees: {active}
- Terminated/Deactivated: {terminated}
- Open Job Positions: {open_jobs}
- Pending Leave Requests: {pending_leaves}
- Attrition Rate: {round(terminated/total*100, 1) if total else 0}%

Write a professional 3-paragraph summary covering:
1. Current workforce status and highlights
2. Risks and concerns
3. Recommended HR actions for next month"""
    summary = call_mistral(prompt)
    return {"summary": summary, "generated_at": str(datetime.now())}

# --- Offer Letter Generation ---
class OfferLetterRequest(BaseModel):
    candidate_id: int
    salary: float
    start_date: str
    reporting_manager: str

@router.post("/generate-offer-letter")
def generate_offer_letter(req: OfferLetterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = db.query(JobPosting).filter(JobPosting.id == candidate.job_posting_id).first()
    prompt = f"""Generate a professional employment offer letter.

Candidate Name: {candidate.name}
Position: {job.title if job else 'Software Engineer'}
Department: {job.department if job else 'Engineering'}
Annual Salary: ₹{req.salary:,.0f}
Start Date: {req.start_date}
Reporting Manager: {req.reporting_manager}
Company: HRMS Technologies Pvt. Ltd.

Write a complete, formal offer letter with all standard sections."""
    letter = call_mistral(prompt)
    return {"offer_letter": letter}

# --- Team Capacity Risk ---
class CapacityRequest(BaseModel):
    department: Optional[str] = None
    start_date: str
    end_date: str

@router.post("/capacity-risk")
def capacity_risk(req: CapacityRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import LeaveRequest
    from datetime import date as dt
    
    try:
        start = dt.fromisoformat(req.start_date)
        end = dt.fromisoformat(req.end_date)
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}
    
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
        LeaveRequest.status.in_(["pending", "approved"])
    ).all()
    total_active = db.query(Employee).filter(Employee.is_active == True).count()
    prompt = f"""Analyze team capacity risk:

Period: {req.start_date} to {req.end_date}
Total Active Employees: {total_active}
Leave Requests in Period: {len(leaves)}
Department Filter: {req.department or 'All departments'}
Employees on leave: {', '.join([l.employee.name for l in leaves if l.employee][:10])}

Provide a brief capacity risk assessment and recommendations."""
    analysis = call_mistral(prompt)
    return {
        "leave_count": len(leaves),
        "total_employees": total_active,
        "risk_analysis": analysis
    }