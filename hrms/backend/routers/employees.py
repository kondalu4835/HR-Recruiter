from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import os, shutil, uuid, csv, io

from database import get_db
from models import Employee, EmployeeDocument, User
from auth_utils import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class EmployeeCreate(BaseModel):
    employee_code: str
    name: str
    email: str
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[date] = None
    manager_id: Optional[int] = None
    skills: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[float] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[date] = None
    manager_id: Optional[int] = None
    skills: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    salary: Optional[float] = None
    is_active: Optional[bool] = None
    termination_date: Optional[date] = None

@router.get("")
def list_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Employee)
    if search:
        q = q.filter(or_(
            Employee.name.ilike(f"%{search}%"),
            Employee.email.ilike(f"%{search}%"),
            Employee.designation.ilike(f"%{search}%"),
            Employee.skills.ilike(f"%{search}%"),
            Employee.department.ilike(f"%{search}%"),
        ))
    if department:
        q = q.filter(Employee.department == department)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    employees = q.all()
    result = []
    for e in employees:
        result.append({
            "id": e.id, "employee_code": e.employee_code, "name": e.name,
            "email": e.email, "phone": e.phone, "designation": e.designation,
            "department": e.department, "joining_date": str(e.joining_date) if e.joining_date else None,
            "manager_id": e.manager_id, "skills": e.skills, "bio": e.bio,
            "is_active": e.is_active, "salary": e.salary,
            "termination_date": str(e.termination_date) if e.termination_date else None,
            "manager_name": e.manager.name if e.manager else None,
        })
    return result

@router.post("")
def create_employee(emp: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Employee).filter(Employee.email == emp.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    employee = Employee(**emp.dict())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return {"id": employee.id, "message": "Employee created"}

@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    departments = db.query(Employee.department).distinct().filter(Employee.department != None).all()
    return [d[0] for d in departments]

@router.get("/org-chart")
def org_chart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    emp_map = {e.id: {"id": e.id, "name": e.name, "designation": e.designation,
                      "department": e.department, "manager_id": e.manager_id, "children": []} for e in employees}
    roots = []
    for e in employees:
        if e.manager_id and e.manager_id in emp_map:
            emp_map[e.manager_id]["children"].append(emp_map[e.id])
        elif not e.manager_id:
            roots.append(emp_map[e.id])
    return roots

@router.get("/export-csv")
def export_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Code", "Name", "Email", "Phone", "Designation", "Department", "Joining Date", "Skills", "Active"])
    for e in employees:
        writer.writerow([e.id, e.employee_code, e.name, e.email, e.phone, e.designation,
                         e.department, e.joining_date, e.skills, e.is_active])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
                             media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=employees.csv"})

@router.get("/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    docs = [{"id": d.id, "doc_type": d.doc_type, "filename": d.filename, "file_path": d.file_path} for d in emp.documents]
    return {
        "id": emp.id, "employee_code": emp.employee_code, "name": emp.name,
        "email": emp.email, "phone": emp.phone, "designation": emp.designation,
        "department": emp.department, "joining_date": str(emp.joining_date) if emp.joining_date else None,
        "manager_id": emp.manager_id, "skills": emp.skills, "bio": emp.bio,
        "address": emp.address, "is_active": emp.is_active, "salary": emp.salary,
        "termination_date": str(emp.termination_date) if emp.termination_date else None,
        "manager_name": emp.manager.name if emp.manager else None,
        "documents": docs
    }

@router.put("/{employee_id}")
def update_employee(employee_id: int, emp: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in emp.dict(exclude_unset=True).items():
        setattr(employee, field, value)
    db.commit()
    return {"message": "Employee updated"}

@router.delete("/{employee_id}")
def deactivate_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.is_active = False
    db.commit()
    return {"message": "Employee deactivated"}

@router.post("/{employee_id}/documents")
async def upload_document(
    employee_id: int,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    doc = EmployeeDocument(
        employee_id=employee_id,
        doc_type=doc_type,
        filename=file.filename,
        file_path=file_path
    )
    db.add(doc)
    db.commit()
    return {"message": "Document uploaded", "file_path": file_path}
