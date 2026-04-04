from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from collections import defaultdict

from database import get_db
from models import Employee, JobPosting, LeaveRequest, LeaveBalance, User
from auth_utils import get_current_user

router = APIRouter()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(Employee).count()
    active = db.query(Employee).filter(Employee.is_active == True).count()
    terminated = db.query(Employee).filter(Employee.is_active == False).count()
    open_jobs = db.query(JobPosting).filter(JobPosting.status == "open").count()
    return {
        "total_employees": total,
        "active_employees": active,
        "terminated_employees": terminated,
        "open_positions": open_jobs,
        "attrition_rate": round(terminated / total * 100, 2) if total else 0
    }

@router.get("/headcount-by-department")
def headcount_by_dept(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = db.query(Employee.department, func.count(Employee.id)).filter(
        Employee.is_active == True, Employee.department != None
    ).group_by(Employee.department).all()
    return [{"department": r[0], "count": r[1]} for r in result]

@router.get("/average-tenure")
def avg_tenure(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).filter(
        Employee.is_active == True, Employee.joining_date != None
    ).all()
    dept_data = defaultdict(list)
    today = date.today()
    for e in employees:
        if e.department and e.joining_date:
            tenure_years = (today - e.joining_date).days / 365
            dept_data[e.department].append(tenure_years)
    return [{
        "department": dept,
        "avg_tenure_years": round(sum(tenures) / len(tenures), 2)
    } for dept, tenures in dept_data.items()]

@router.get("/leave-utilisation")
def leave_utilisation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    year = datetime.now().year
    balances = db.query(LeaveBalance).filter(LeaveBalance.year == year).all()
    total_days = sum(b.total_days for b in balances)
    used_days = sum(b.used_days for b in balances)
    return {
        "total_days": total_days,
        "used_days": used_days,
        "utilisation_rate": round(used_days / total_days * 100, 2) if total_days else 0
    }

@router.get("/open-vs-filled")
def open_vs_filled(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    open_jobs = db.query(JobPosting).filter(JobPosting.status == "open").count()
    closed_jobs = db.query(JobPosting).filter(JobPosting.status == "closed").count()
    return {"open": open_jobs, "filled": closed_jobs}

@router.get("/attrition-trend")
def attrition_trend(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    terminated = db.query(Employee).filter(
        Employee.is_active == False,
        Employee.termination_date != None
    ).all()
    monthly = defaultdict(int)
    for e in terminated:
        key = f"{e.termination_date.year}-{e.termination_date.month:02d}"
        monthly[key] += 1
    return [{"month": k, "count": v} for k, v in sorted(monthly.items())]
