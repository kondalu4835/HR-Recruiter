from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    hr = "hr"
    manager = "manager"
    employee = "employee"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="employee")
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    employee = relationship("Employee", back_populates="user", foreign_keys=[employee_id])


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    designation = Column(String)
    department = Column(String)
    joining_date = Column(Date)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    skills = Column(Text)  # comma-separated
    bio = Column(Text)
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    termination_date = Column(Date, nullable=True)
    salary = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    manager = relationship("Employee", remote_side=[id], backref="reports")
    user = relationship("User", back_populates="employee", foreign_keys=[User.employee_id])
    documents = relationship("EmployeeDocument", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    doc_type = Column(String)  # offer_letter, id_proof, etc.
    filename = Column(String)
    file_path = Column(String)
    uploaded_at = Column(DateTime, server_default=func.now())
    employee = relationship("Employee", back_populates="documents")


class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    department = Column(String)
    description = Column(Text)
    required_skills = Column(Text)
    experience_level = Column(String)
    status = Column(String, default="open")  # open, closed
    created_at = Column(DateTime, server_default=func.now())
    candidates = relationship("Candidate", back_populates="job_posting")


class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"))
    name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    resume_path = Column(String)
    stage = Column(String, default="applied")  # applied, screening, interview, offer, hired, rejected
    ai_score = Column(Float, nullable=True)
    ai_reasoning = Column(Text, nullable=True)
    ai_strengths = Column(Text, nullable=True)
    ai_gaps = Column(Text, nullable=True)
    ai_questions = Column(Text, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    job_posting = relationship("JobPosting", back_populates="candidates")


class LeaveType(Base):
    __tablename__ = "leave_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # sick, casual, earned, wfh
    default_days = Column(Integer, default=12)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"))
    year = Column(Integer)
    total_days = Column(Float, default=0)
    used_days = Column(Float, default=0)
    employee = relationship("Employee")
    leave_type = relationship("LeaveType")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    reason = Column(Text)
    status = Column(String, default="pending")  # pending, approved, rejected
    manager_comment = Column(Text)
    ai_flag = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    employee = relationship("Employee", back_populates="leave_requests")
    leave_type = relationship("LeaveType")


class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(Date)
    status = Column(String)  # present, wfh, half_day, absent
    check_in = Column(String, nullable=True)
    check_out = Column(String, nullable=True)
    employee = relationship("Employee", back_populates="attendances")


class ReviewCycle(Base):
    __tablename__ = "review_cycles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # e.g. Q2 2025
    period_start = Column(Date)
    period_end = Column(Date)
    status = Column(String, default="active")
    created_at = Column(DateTime, server_default=func.now())
    reviews = relationship("PerformanceReview", back_populates="cycle")


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"
    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("review_cycles.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    manager_id = Column(Integer, ForeignKey("employees.id"))

    # Self assessment
    self_achievements = Column(Text)
    self_challenges = Column(Text)
    self_goals = Column(Text)

    # Manager ratings (1-5)
    rating_quality = Column(Float)
    rating_delivery = Column(Float)
    rating_communication = Column(Float)
    rating_initiative = Column(Float)
    rating_teamwork = Column(Float)
    manager_comments = Column(Text)

    # AI generated
    ai_summary = Column(Text)
    ai_flags = Column(Text)
    ai_development_actions = Column(Text)

    status = Column(String, default="pending")  # pending, self_submitted, manager_submitted, completed
    created_at = Column(DateTime, server_default=func.now())

    cycle = relationship("ReviewCycle", back_populates="reviews")
    employee = relationship("Employee", foreign_keys=[employee_id])
    manager = relationship("Employee", foreign_keys=[manager_id])


class OnboardingChecklist(Base):
    __tablename__ = "onboarding_checklists"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)
    title = Column(String)
    items = relationship("OnboardingItem", back_populates="checklist")


class OnboardingItem(Base):
    __tablename__ = "onboarding_items"
    id = Column(Integer, primary_key=True, index=True)
    checklist_id = Column(Integer, ForeignKey("onboarding_checklists.id"))
    title = Column(String)
    description = Column(Text)
    due_days = Column(Integer, default=7)  # due within N days of joining
    assignee_role = Column(String)  # hr, manager, employee
    checklist = relationship("OnboardingChecklist", back_populates="items")


class EmployeeOnboarding(Base):
    __tablename__ = "employee_onboardings"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    checklist_id = Column(Integer, ForeignKey("onboarding_checklists.id"))
    progress = Column(Text, default="{}")  # JSON: {item_id: bool}
    created_at = Column(DateTime, server_default=func.now())
    employee = relationship("Employee")
    checklist = relationship("OnboardingChecklist")


class PolicyDocument(Base):
    __tablename__ = "policy_documents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    filename = Column(String)
    file_path = Column(String)
    content_text = Column(Text)  # extracted text for AI
    uploaded_at = Column(DateTime, server_default=func.now())


class ChatbotQuery(Base):
    __tablename__ = "chatbot_queries"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    question = Column(Text)
    answer = Column(Text)
    was_answered = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
