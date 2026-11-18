# Technovation OS Testing & Verification Guide

This guide details automated unit tests and manual end-to-end verification workflows for Technovation OS.

---

## 1. Automated Checks

Run the automated suite:
```powershell
npm test        # Runs Vitest unit and role permission checks
npm run build   # Validates TypeScript compilation and generates production assets
npm run lint    # Lints JavaScript/TypeScript codebase
supabase db lint # Lints local database schemas and RLS policies
```

### What Vitest Currently Validates
- Member event and proposal creation permissions.
- Faculty and President proposal approval authorization.
- HOD task assignment and delegation restrictions.
- Groq AI agent tool-calling loop execution and schema validation.
- Fallback mock responses when API keys are absent or invalid.

---

## 2. Test Environment Setup

1. Launch Docker Desktop.
2. Initialize local Supabase containers:
   ```powershell
   supabase start
   supabase db reset
   ```
3. Start the application frontend:
   ```powershell
   npm run dev -- --host 127.0.0.1
   ```
4. Start the background worker (in a separate terminal):
   ```powershell
   npm run worker
   ```

---

## 3. Seeded Accounts Matrix

| Role | Email | Password | Allowed Dashboards & Areas |
|---|---|---|---|
| **President** | `president@demo.techno` | `President@123` | `/dashboard/president`, `/approvals`, `/departments`, `/roles`, `/automation`, `/settings/society` |
| **Vice President** | `vicepresident@demo.techno` | `VicePresident@123` | `/dashboard/president`, `/approvals`, `/automation`, `/tasks`, `/events` |
| **HOD** | `hod@demo.techno` | `HOD@123` | `/dashboard/hod`, `/departments`, `/events`, `/tasks`, `/members` |
| **Faculty Advisor** | `faculty@demo.techno` | `Faculty@123` | `/dashboard/faculty`, `/approvals`, `/events`, `/tasks` |
| **Member** | `member@demo.techno` | `Member@123` | `/dashboard/member`, `/events`, `/tasks`, `/letters`, `/certificates`, `/assistant` |

---

## 4. Test Scenarios

### Authentication & RBAC

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| **AUTH-01** | Standard Member Login | Sign in with `member@demo.techno` | Opens Member Dashboard; hides admin links (Approvals, Roles, Automations) |
| **AUTH-02** | URL Tampering Guard | As a logged-in member, navigate manually to `/approvals` or `/roles` | `ProtectedRoute` redirects to `/dashboard/member` |
| **AUTH-03** | President Login | Sign in with `president@demo.techno` | Full access to Approval Queue, Society Settings, Roles, and Automations |

### Dual Theme System

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| **THM-01** | Dark/Light Toggle | Click the Sun/Moon icon in the top header | UI switches between deep dark mode and bright mode immediately |
| **THM-02** | Theme Persistence | Refresh browser after toggling theme | Selected theme persists without unstyled flash |

### AI Event Ideation & President Approval

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| **EVT-01** | AI Brainstorming | On `/events`, click **"Generate Ideas with AI"**, enter topic "AI Hackathon", click Brainstorm | Groq generates 3 structured concepts with budget and description |
| **EVT-02** | Submit to President | Click **"Submit to President"** on an AI card | Event status becomes `proposal_submitted`, proposal created, all members notified |
| **EVT-03** | AI Executive Audit | Sign in as President, open `/approvals`, click proposal, click **"Run AI Audit"** | Feasibility score, risks, and recommended comments are computed |
| **EVT-04** | Grant Approval | President clicks **"Grant Approval"** | Event updates to `approved`, submitter receives notification |

### Skill-Based Member Task Assignment

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| **TSK-01** | AI Event Breakdown | On `/tasks`, click **"AI Breakdown"**, select an event | Groq creates 4–6 deliverable tasks with target deadlines in the database |
| **TSK-02** | AI Smart Assign | On a task card, click **"AI Assign"** | Candidate pool excludes heads (Presidents/HODs/Faculty) and matches operational members by skillset |
| **TSK-03** | Status Move | Move task from To Do to In Progress or Done | Task status updates across Kanban columns |

### Autonomous Document & Certificate Generation

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| **DOC-01** | AI Letter Generator | Open `/letters`, select "Permission Request", fill details, click **"Generate Letter with AI"** | Groq drafts formal society letter; printable letterhead renders with copy/print buttons |
| **DOC-02** | Certificate Studio | Open `/certificates`, select theme and category, enter recipient name | Generates landscape A4 certificate with seal, authority lines, and print styling |
