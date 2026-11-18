# Technovation OS

Technovation OS is a full-stack society management system designed for collegiate technical chapters, student societies, and university departments. It automates society operations from initial concept brainstorming to final task execution, approvals, certifications, and administrative reporting.

---

## Key System Features

### 1. Dual Theme System (Dark & Bright Mode)
- Dynamic CSS-variable driven theming across the entire UI.
- Instant header toggle (Sun/Moon icon) with persistent state across browser reloads.
- High-contrast, polished modern aesthetic for both daytime and low-light environments.

### 2. Multi-Tier Role-Based Access Control (RBAC)
- **Role Hierarchy:**
  - `President` (Level 50): Full institutional control, roles management, society settings, approvals, automation engine.
  - `Vice President` (Level 40): Automation rules, proposal approvals, cross-department event management.
  - `HOD` (Level 30): Departmental events, departmental task delegation, member tracking.
  - `Faculty Advisor` (Level 20): Proposal review queue, executive AI feasibility audit, task oversight.
  - `Member` (Level 10): Event ideation, task execution, AI document & letter generation, certificate generation, society directory.
- **Strict Visual & Navigation Separation:**
  - Members are restricted to their operational scope (`Member Dashboard`, `Events`, `Tasks`, `Letters`, `Certificates`, `Members Directory`, `AI Assistant`).
  - Administrative routes (`/approvals`, `/departments`, `/roles`, `/automation`, `/settings/society`) are hidden from navigation and protected by authorization guards.

### 3. AI-Powered Event Ideation & President Approval Flow
- **Direct Event Brainstorming:** Members can use Groq AI directly on `/events` to generate 3 tailored event proposals by topic/department.
- **One-Click President Submission:** Launching an AI concept automatically creates an event draft, logs a formal proposal, queues it for President approval, and dispatches a broadcast notification to all members.
- **AI Idea Auto-Fill:** Form auto-completes title, comprehensive deliverables description, recommended venue, and realistic budget.

### 4. Skill-Based Task Assignment & Event Breakdown
- **AI Event Breakdown:** Converts any active event into 4–6 concrete deliverables with target deadlines.
- **Operational Member Matching:** The AI smart assignment engine excludes executive heads (Presidents, VPs, HODs, Faculty) and strictly delegates tasks to general members based on departmental competencies.

### 5. Executive AI Feasibility Audit
- **President & Faculty Review Portal (`/approvals`):** Includes an **"AI President Advisor"** that scores proposals (0–100), detects financial/logistical risks, checks timeline sanity, and auto-drafts executive decision notes.
- Automatic notifications inform submitters of approval status.

### 6. AI Document & Certificate Generation
- **Official Letter Generator (`/letters`):** Generates formal event invitations, appreciation letters, permission requests, and NOCs with professional college letterhead and print/PDF support.
- **Certificate Studio (`/certificates`):** Creates custom A4 landscape participation, achievement, and excellence awards with downloadable/printable layouts.

### 7. Conversational Society Copilot
- Context-aware assistant on `/assistant` capable of answering natural-language queries about upcoming schedules, active tasks, and departmental assignments with live Supabase database tool calls.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **State Management** | Zustand (persistent auth & theme stores), TanStack React Query |
| **Authentication** | Supabase Auth (Email/Password, session management) |
| **Database & Security** | PostgreSQL, Row-Level Security (RLS) policies, Database Triggers |
| **AI Engine** | Groq API (`openai/gpt-oss-20b`) |
| **Automation & Jobs** | PostgreSQL triggers, `pg_cron`, local background Node worker |
| **Local Infrastructure** | Supabase CLI & Docker Desktop |

---

## Prerequisites

- **Node.js** 20+ and **npm**
- **Docker Desktop** (must remain running while Supabase is active)
- **Supabase CLI**:
  ```powershell
  npm install -g supabase
  ```

---

## Installation & Setup

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Start Supabase locally:**
   ```powershell
   supabase start
   supabase db reset
   ```
   *(The reset applies all schema migrations and seeds local demo accounts.)*

3. **Configure environment variables:**
   Verify your `.env` contains:
   ```dotenv
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   VITE_GROQ_API_KEY=<your-groq-api-key>
   VITE_AI_MODEL=openai/gpt-oss-20b
   ```

4. **Start the Frontend development server:**
   ```powershell
   npm run dev -- --host 127.0.0.1
   ```
   Open: [http://127.0.0.1:5173](http://127.0.0.1:5173)

5. **Start the background automation worker (terminal 2):**
   ```powershell
   npm run worker
   ```

---

## Verified Demo Accounts

| Position | Login Email | Password | Access Scope |
|---|---|---|---|
| **President** | `president@demo.techno` | `President@123` | Full society & role management, executive approvals, automations |
| **Vice President** | `vicepresident@demo.techno` | `VicePresident@123` | Events, proposals, task delegation, automations |
| **HOD** | `hod@demo.techno` | `HOD@123` | Department events, member management, task assignment |
| **Faculty Advisor**| `faculty@demo.techno` | `Faculty@123` | Proposal review queue, AI feasibility audit, read dashboards |
| **Member** | `member@demo.techno` | `Member@123` | AI ideation, task board, letter & certificate generators, AI copilot |

---

## Recommended End-to-End Walkthrough

1. **Sign in as a Member** (`member@demo.techno` / `Member@123`).
2. Go to **Events** (`/events`) and click **"Generate Ideas with AI"**.
3. Enter a theme (e.g. *"Autonomous Robotics Derby"*), select a department, and click Brainstorm.
4. Review the generated cards and click **"Submit to President"**.
5. Notice that all members receive a notification about the new event idea.
6. Switch theme using the **Sun/Moon** button in the header.
7. Open **Letters** (`/letters`) to generate a formal permission letter for the venue.
8. Sign out and sign in as **President** (`president@demo.techno` / `President@123`).
9. Navigate to **Approvals** (`/approvals`), click the new proposal, and click **"Run AI Audit"** to view feasibility scores and risk detection.
10. Click **"Grant Approval"**.
11. Navigate to **Tasks** (`/tasks`), click **"AI Breakdown"** to auto-generate deliverable tasks, and use **"AI Assign"** to intelligently match operational members.

---

## Quality Checks & Verification

```powershell
npm test        # Runs Vitest unit and permission tests
npm run build   # Validates TypeScript compilation and Vite production bundle
npm run lint    # Runs ESLint code quality checks
supabase db lint # Lints PostgreSQL schema and RLS policies
```
