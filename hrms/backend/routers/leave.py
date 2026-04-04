from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timedelta
import json

from database import get_db
from models import LeaveRequest, LeaveBalance, LeaveType, Attendance, Employee, User
from auth_utils import get_current_user

router = APIRouter()

class LeaveRequestCreate(BaseModel):
    employee_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    reason: str

class LeaveApproval(BaseModel):
    status: str  # approved, rejected
    comment: Optional[str] = None

class AttendanceCreate(BaseModel):
    employee_id: int
    date: date
    status: str  # present, wfh, half_day, absent
    check_in: Optional[str] = None
    check_out: Optional[str] = None

@router.get("/types")
def get_leave_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(LeaveType).all()
    if not types:
        # Seed default leave types
        defaults = [
            LeaveType(name="sick", default_days=12),
            LeaveType(name="casual", default_days=12),
            LeaveType(name="earned", default_days=15),
            LeaveType(name="wfh", default_days=24),
        ]
        for lt in defaults:
            db.add(lt)
        db.commit()
        types = db.query(LeaveType).all()
    return [{"id": t.id, "name": t.name, "default_days": t.default_days} for t in types]

@router.get("/requests")
def list_leave_requests(
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(LeaveRequest)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    requests = q.order_by(LeaveRequest.created_at.desc()).all()
    return [{
        "id": r.id, "employee_id": r.employee_id,
        "employee_name": r.employee.name if r.employee else None,
        "leave_type": r.leave_type.name if r.leave_type else None,
        "leave_type_id": r.leave_type_id,
        "start_date": str(r.start_date), "end_date": str(r.end_date),
        "reason": r.reason, "status": r.status,
        "manager_comment": r.manager_comment,
        "ai_flag": r.ai_flag,
        "created_at": str(r.created_at)
    } for r in requests]

@router.post("/requests")
def create_leave_request(req: LeaveRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check leave balance
    year = req.start_date.year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == req.employee_id,
        LeaveBalance.leave_type_id == req.leave_type_id,
        LeaveBalance.year == year
    ).first()
    days_requested = (req.end_date - req.start_date).days + 1
    if balance and (balance.total_days - balance.used_days) < days_requested:
        raise HTTPException(status_code=400, detail="Insufficient leave balance")

    leave = LeaveRequest(**req.dict())
    db.add(leave)
    db.commit()
    db.refresh(leave)

    # AI flag check - detect patterns
    recent = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == req.employee_id,
        LeaveRequest.status == "approved"
    ).order_by(LeaveRequest.created_at.desc()).limit(10).all()

    monday_count = sum(1 for r in recent if r.start_date.weekday() == 0)
    friday_count = sum(1 for r in recent if r.end_date.weekday() == 4)
    if monday_count >= 3:
        leave.ai_flag = "⚠️ Pattern detected: Employee frequently takes leave starting on Mondays"
    elif friday_count >= 3:
        leave.ai_flag = "⚠️ Pattern detected: Employee frequently takes leave ending on Fridays"
    db.commit()

    return {"id": leave.id, "message": "Leave request submitted", "ai_flag": leave.ai_flag}

@router.put("/requests/{request_id}/approve")
def approve_leave(request_id: int, approval: LeaveApproval, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave.status = approval.status
    leave.manager_comment = approval.comment
    if approval.status == "approved":
        days = (leave.end_date - leave.start_date).days + 1
        year = leave.start_date.year
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type_id == leave.leave_type_id,
            LeaveBalance.year == year
        ).first()
        if balance:
            balance.used_days += days
    db.commit()
    return {"message": f"Leave {approval.status}"}

@router.get("/balance/{employee_id}")
def get_leave_balance(employee_id: int, year: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not year:
        year = datetime.now().year
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year
    ).all()
    # If no balances, initialize them
    if not balances:
        leave_types = db.query(LeaveType).all()
        if not leave_types:
            return []
        for lt in leave_types:
            b = LeaveBalance(
                employee_id=employee_id,
                leave_type_id=lt.id,
                year=year,
                total_days=lt.default_days,
                used_days=0
            )
            db.add(b)
        db.commit()
        balances = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == employee_id, LeaveBalance.year == year
        ).all()
    return [{
        "id": b.id, "leave_type": b.leave_type.name,
        "total_days": b.total_days, "used_days": b.used_days,
        "remaining": b.total_days - b.used_days
    } for b in balances]

@router.get("/calendar")
def team_calendar(
    month: int = Query(...), year: int = Query(...),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from calendar import monthrange
    _, days_in_month = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, days_in_month)
    q = db.query(LeaveRequest).filter(
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
        LeaveRequest.status == "approved"
    )
    leaves = q.all()
    result = []
    for l in leaves:
        emp = db.query(Employee).filter(Employee.id == l.employee_id).first()
        if department and emp and emp.department != department:
            continue
        result.append({
            "employee_id": l.employee_id,
            "employee_name": emp.name if emp else "Unknown",
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "leave_type": l.leave_type.name if l.leave_type else None
        })
    return result

@router.post("/attendance")
def mark_attendance(att: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Attendance).filter(
        Attendance.employee_id == att.employee_id,
        Attendance.date == att.date
    ).first()
    if existing:
        existing.status = att.status
        existing.check_in = att.check_in
        existing.check_out = att.check_out
        db.commit()
        return {"message": "Attendance updated"}
    a = Attendance(**att.dict())
    db.add(a)
    db.commit()
    return {"message": "Attendance marked"}

@router.get("/attendance/{employee_id}")
def get_attendance(employee_id: int, month: int = Query(None), year: int = Query(None),
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Attendance).filter(Attendance.employee_id == employee_id)
    if month and year:
        start = date(year, month, 1)
        from calendar import monthrange
        _, days = monthrange(year, month)
        end = date(year, month, days)
        q = q.filter(Attendance.date >= start, Attendance.date <= end)
    attendances = q.order_by(Attendance.date).all()
    return [{
        "id": a.id, "date": str(a.date), "status": a.status,
        "check_in": a.check_in, "check_out": a.check_out
    } for a in attendances]

@router.get("/attendance-summary/{employee_id}")
def attendance_summary(employee_id: int, month: int = Query(...), year: int = Query(...),
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from calendar import monthrange
    start = date(year, month, 1)
    _, days = monthrange(year, month)
    end = date(year, month, days)
    attendances = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.date >= start, Attendance.date <= end
    ).all()
    summary = {"present": 0, "wfh": 0, "half_day": 0, "absent": 0}
    for a in attendances:
        if a.status in summary:
            summary[a.status] += 1
    return summary
