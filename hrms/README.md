# AI-Powered HRMS 🤖

A fully functional Human Resource Management System with AI woven into core workflows — built with **FastAPI + SQLite** (backend) and **React + Tailwind CSS** (frontend), powered by **Claude (Anthropic)**.

---

## 🧩 Modules Implemented

| Module | Features |
|--------|----------|
| **1. Employee Records** | Add/Edit/Deactivate, Document upload, Search, Org Chart, CSV Export, AI Bio, Duplicate detection |
| **2. Recruitment & ATS** | Job postings, Candidate pipeline (Kanban), AI resume scoring, AI interview questions, AI offer letter |
| **3. Leave & Attendance** | Leave requests, Manager approvals, Balance tracker, Calendar view, AI pattern detection |
| **4. Performance Reviews** | Review cycles, Self-assessment, Manager ratings, AI summary, AI mismatch flags, AI dev actions |
| **5. Onboarding** | Checklists, Progress tracking, Policy doc upload, AI chatbot (RAG from docs only) |
| **6. Analytics** | Headcount charts, Attrition trend, Tenure, Leave utilisation, AI monthly summary |

---

## 🏗️ Tech Stack

- **Backend**: FastAPI, SQLite (SQLAlchemy), Python 3.10+
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts
- **AI**: Anthropic Claude (claude-opus-4-6)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Anthropic API key → https://console.anthropic.com

---

### 1. Clone / Extract the project

```bash
cd hrms
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
```

**Edit `.env`:**
```
SECRET_KEY=change-this-to-a-random-secret
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

```bash
# Start the backend server
uvicorn main:app --reload --port 8000
```

The API will be live at: **http://localhost:8000**
Swagger docs: **http://localhost:8000/docs**

**Seed the admin user** (run once):
```
POST http://localhost:8000/api/auth/seed-admin
```
Or visit: http://localhost:8000/api/auth/seed-admin in browser / Swagger

---

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be live at: **http://localhost:3000**

---

### 4. Login

| Field | Value |
|-------|-------|
| Email | admin@hrms.com |
| Password | admin123 |

---

## 📁 Project Structure

```
hrms/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite DB config
│   ├── models.py            # All SQLAlchemy models
│   ├── config.py            # Settings / env vars
│   ├── auth_utils.py        # JWT auth helpers
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── auth.py          # Login, register, seed
│       ├── employees.py     # Employee CRUD, docs, org chart
│       ├── recruitment.py   # Jobs, candidates, pipeline
│       ├── leave.py         # Leave requests, attendance, calendar
│       ├── performance.py   # Review cycles, self/manager forms
│       ├── onboarding.py    # Checklists, policy docs, chatbot logs
│       ├── analytics.py     # Charts data endpoints
│       └── ai_features.py   # All AI-powered endpoints
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── context/
        │   └── AuthContext.jsx
        ├── utils/
        │   └── api.js
        ├── components/
        │   └── Layout.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── EmployeesPage.jsx
            ├── EmployeeDetailPage.jsx
            ├── OrgChartPage.jsx
            ├── RecruitmentPage.jsx
            ├── JobDetailPage.jsx
            ├── LeavePage.jsx
            ├── AttendancePage.jsx
            ├── PerformancePage.jsx
            ├── OnboardingPage.jsx
            └── AnalyticsPage.jsx
```

---

## 🤖 AI Features Summary

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Auto-generate bio | `POST /api/ai/generate-bio` | Professional bio from profile data |
| Profile health check | `GET /api/ai/check-profiles` | Detects duplicates & incomplete profiles |
| Resume scoring | `POST /api/ai/score-resume` | Match %, strengths, gaps, interview Qs |
| Review summary | `POST /api/ai/generate-review-summary` | Balanced summary + mismatch flags + actions |
| HR chatbot | `POST /api/ai/chatbot` | RAG from uploaded policy documents only |
| HR monthly summary | `GET /api/ai/hr-monthly-summary` | Highlights, risks, recommended actions |
| Offer letter | `POST /api/ai/generate-offer-letter` | Full AI-generated offer letter (bonus) |
| Capacity risk | `POST /api/ai/capacity-risk` | Team capacity analysis for date range |

---

## ⚙️ API Documentation

Once backend is running, full Swagger UI is available at:
```
http://localhost:8000/docs
```

---

## 🔐 Roles

| Role | Access |
|------|--------|
| `admin` | Full access |
| `hr` | Most HR operations |
| `manager` | Team management, approvals |
| `employee` | Self-service (leave, checklist) |

---

## 📝 Notes

- The SQLite database (`hrms.db`) is auto-created on first run
- Uploaded files are stored in `backend/uploads/`
- The AI chatbot only answers from uploaded policy documents — no hallucination
- All AI features require a valid `ANTHROPIC_API_KEY` in `.env`
