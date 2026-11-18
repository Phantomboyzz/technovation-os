# Technovation OS

Technovation OS is a full-stack prototype for managing a college society, its departments, members, events, proposals, tasks, approvals, notifications, automations, and AI-assisted operations.

The current prototype includes:

- Role-based dashboards and navigation
- Department and member management
- Event creation and event lifecycle tracking
- Groq-powered event ideation and proposal generation
- Faculty-style proposal approval
- Automatic execution-task creation after approval
- Task assignment, responsibility handover, and status tracking
- In-app notifications
- pg_cron reminders and a local polling worker
- An agentic Groq assistant that can read and act on society data

## Technology

| Area | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand, TanStack Query |
| Authentication | Supabase Auth |
| Database | PostgreSQL through Supabase |
| Authorization | Row-level security and role permissions |
| AI | Groq API |
| Automation | PostgreSQL triggers, pg_cron, and Node worker |
| Local infrastructure | Supabase CLI and Docker |

## Prerequisites

Install the following:

- Node.js 20 or newer
- npm
- Docker Desktop
- Supabase CLI

Install the CLI with npm:

```powershell
npm install -g supabase
```

Verify the tools:

```powershell
node --version
npm --version
docker --version
supabase --version
```

Docker Desktop must remain running while Supabase is started.

## Installation

From the project directory:

```powershell
npm install
```

## Start Supabase locally

Start Docker Desktop, then run:

```powershell
supabase start
```

The first start downloads the Supabase containers. A successful start prints the API, database, Studio, anon, and service-role values.

Reset and seed the local database:

```powershell
supabase db reset
```

The reset applies all SQL migrations and the seed data. It also recreates the local database, so do not use it against data you need to preserve.

Useful Supabase commands:

```powershell
supabase status
supabase db lint
supabase db reset
supabase stop
```

Supabase Studio is normally available at:

- http://127.0.0.1:54323

## Configure environment variables

Copy the example file:

```powershell
Copy-Item .env.example .env
```

For local development, obtain the current keys with:

```powershell
supabase status -o env
```

Update `.env` with the local API URL and keys:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-local-publishable-or-anon-key>
VITE_SUPABASE_PROJECT_ID=technovation-os
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>

VITE_GROQ_API_KEY=<your-groq-api-key>
VITE_AI_MODEL=openai/gpt-oss-20b
AI_MODEL=openai/gpt-oss-20b

AUTOMATION_POLL_INTERVAL=60000
```

Groq model availability can change. To verify the configured key and list available models:

```powershell
$key = (Get-Content .env | Where-Object { $_ -match '^VITE_GROQ_API_KEY=' }).Split('=', 2)[1]
$headers = @{ Authorization = "Bearer $key" }
Invoke-RestMethod -Uri 'https://api.groq.com/openai/v1/models' -Headers $headers
```

Never commit `.env`, Groq API keys, Supabase service-role keys, or other secrets.

## Start the application

Start the frontend:

```powershell
npm run dev -- --host 127.0.0.1
```

Open:

- http://127.0.0.1:5173

In a second terminal, start the fallback automation worker:

```powershell
npm run worker
```

The frontend and worker should use the same `.env` values.

## Demo login accounts

Run `supabase db reset` first. Migration `007_demo_accounts.sql` creates these verified local accounts automatically.

| Position | Login ID | Password | Dashboard access |
|---|---|---|---|
| President | `president@demo.techno` | `President@123` | Full society and role management |
| Vice President | `vicepresident@demo.techno` | `VicePresident@123` | Events, proposals, tasks, automations, members |
| HOD | `hod@demo.techno` | `HOD@123` | Department events, proposals, members, tasks |
| Faculty Advisor | `faculty@demo.techno` | `Faculty@123` | Proposal approval, task assignment, read dashboards |
| Member | `member@demo.techno` | `Member@123` | Events, ideas, proposals, assigned tasks, AI assistant |

Open http://127.0.0.1:5173/login and sign out before changing demo roles. A browser session cache should not be used across database resets.

These credentials are intentionally public only for the local demonstration database. Do not copy them into a hosted or production Supabase project.

To create an additional account:

1. Open http://127.0.0.1:5173/register.
2. Enter a name, email, and password of at least eight characters.
3. Accept the terms and create the account.
4. The auth trigger creates a profile and assigns the `member` role automatically.
5. Assign a higher role only through an authorized SQL or president workflow.

Verify the seeded accounts and roles with Supabase SQL:

```sql
SELECT u.email, r.name AS role_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.roles r ON r.id = p.role_id
ORDER BY r.level DESC, u.email;
```

## Recommended end-to-end demo

1. Register or log in as a member.
2. Create an event under a department.
3. Open the event and generate AI ideas.
4. Submit or choose an idea.
5. Generate a Groq proposal.
6. Submit the proposal for approval.
7. Log in as a faculty or president account.
8. Approve the proposal.
9. Confirm that the event becomes `tasks_allocated`.
10. Confirm that an execution task is created automatically.
11. Open the task board and assign or transfer responsibility.
12. Approve or decline a responsibility-transfer request.
13. Open the AI Assistant and ask about events or tasks.
14. Confirm notification delivery in the notification page.

## What is working

### Authentication and roles

- Supabase email/password signup and login
- Automatic profile creation
- Default member role assignment
- President, vice-president, HOD, faculty, and member navigation
- Role and permission checks

### Society management

- Member dashboard
- Department listing
- Member directory
- Profile settings
- Event creation
- Event lifecycle status and progress

### AI

- Groq ideation uses `openai/gpt-oss-20b` or a configured accessible model.
- Proposal generation creates proposal details and associated task suggestions.
- The AI Society Assistant reads live Supabase context.
- The assistant supports Groq tool calls for:
  - Listing upcoming events
  - Listing tasks
  - Listing pending proposals
  - Creating authorized tasks
  - Updating authorized task status
  - Sending authorized notifications

### Approval workflow

- Submit proposals with draft/pending states
- Faculty-style approval queue
- Approving a proposal automatically:
  - Creates a plan-execution task
  - Moves the event to `tasks_allocated`
- Rejection creates a notification for the submitter
- Approval and rejection review comments are stored

### Tasks and responsibility

- Create tasks
- Update task status
- Drag tasks between Kanban columns
- Delete tasks where permitted
- Create responsibility-transfer assignments
- Accept or decline transfers
- Automatically update assignment ownership on acceptance

### Automation and notifications

- PostgreSQL triggers create proposal, approval, rejection, and handover notifications.
- pg_cron runs due-task reminder and cleanup jobs.
- The reminder function avoids duplicate reminders within 24 hours.
- The Node worker provides a local fallback for scheduled rule polling and reminders.
- Automation rules can be created, edited, deleted, paused, activated, and triggered manually.
- Automation execution logs are stored in PostgreSQL.

### Validation

The project currently passes:

- `npm run build`
- `supabase db lint`
- Migration reset and reapplication
- Frontend HTTP smoke test
- Signup and member-dashboard browser smoke test
- Live Groq chat and tool-calling smoke test
- Proposal approval database trigger test
- Automation worker startup

## How to prove the project works autonomously

The project has two automation layers:

1. **Database autonomy:** PostgreSQL triggers and pg_cron react without a browser action.
2. **AI autonomy:** Groq can read the database and call authorized mutation tools.

### Automatic database test

1. Reset the database: `supabase db reset`.
2. Start Supabase and the worker.
3. Create or select a demo event.
4. Insert a pending proposal, or submit one through the UI.
5. Faculty login: `faculty@demo.techno` / `Faculty@123`.
6. Open `/approvals`, approve the proposal, and add comments.
7. Return to the event detail or task board.

Success criteria:

- Event status changes to `tasks_allocated`.
- A task titled `Plan execution: <proposal title>` is inserted automatically.
- The submitter or faculty receives the appropriate notification.
- No manual task creation is performed between approval and task appearance.

Check the database directly:

```sql
SELECT id, title, status
FROM public.events
ORDER BY created_at DESC
LIMIT 10;

SELECT id, event_id, title, status, assigned_to, due_date
FROM public.tasks
ORDER BY created_at DESC
LIMIT 10;
```

### Due-reminder test

1. Create or update a task assigned to a profile.
2. Set `due_date` to within the next 24 hours.
3. Run:

```sql
SELECT public.send_due_task_reminders();
```

4. Check notifications:

```sql
SELECT user_id, type, title, message, created_at
FROM public.notifications
WHERE type = 'reminder'
ORDER BY created_at DESC;
```

Success criteria:

- A `reminder` notification appears for the assignee.
- Running the reminder function again within 24 hours does not create another duplicate reminder.

Check registered cron jobs:

```sql
SELECT jobname, schedule, active
FROM cron.job
ORDER BY jobname;
```

### Groq agent autonomy test

Log in as HOD:

- ID: `hod@demo.techno`
- Password: `HOD@123`

Open `/assistant` and send:

```text
List all active society tasks and summarize what needs attention.
```

Success criteria:

- Groq calls the `list_tasks` database tool.
- The result contains live task rows from Supabase.
- The response does not contain invented task names or users.

Then test live mutation:

```text
Create a task titled "Prepare venue layout" for event ID <event-id>, due in 7 days.
```

Success criteria:

- Groq calls `create_task`.
- Supabase inserts the task.
- Groq reports the created task ID or title.
- A database query confirms the row exists.

Test a role restriction:

1. Sign out.
2. Sign in as member: `member@demo.techno` / `Member@123`.
3. Ask the assistant to create or assign a task.

Success criteria:

- Groq does not claim success.
- The agent receives and explains `HOD or president permission required`.
- No unauthorized task or assignment row is created.

Test proposal approval autonomously:

1. Sign in as `faculty@demo.techno` / `Faculty@123`.
2. Obtain a pending proposal ID from Supabase or the approval queue.
3. Ask:

```text
Approve proposal ID <proposal-id> with review comments "Approved by autonomous demo".
```

Success criteria:

- Groq calls `approve_proposal`.
- Proposal status becomes `approved`.
- The approval record is inserted.
- The event becomes `tasks_allocated`.
- An execution task is inserted automatically.
- An audit log entry is written.

### Automated autonomy checks

```powershell
npm test
npm run build
npm run lint
supabase db lint
```

The automated tests verify permission boundaries and Groq's tool-call loop, but database triggers and actual Groq mutations must also be checked using the browser and SQL steps above.

## What remains incomplete or needs configuration

The following items are implemented as a prototype but should not be described as production-complete:

- OAuth providers are configured in the UI but require provider credentials.
- The Forgot Password route is not implemented.
- Terms of Service and Privacy Policy routes are placeholder links.
- Email delivery is not a production notification channel.
- The realtime WebSocket service can be affected by local environment or network setup.
- Several React Hook dependency lint warnings remain.
- Automated browser tests are not included.
- Some role and RLS edge cases need an organization-wide authorization test matrix.
- Supabase secrets and Groq configuration must be set for each deployed environment.
- Edge-function deployment is not automatic; functions require deployment and environment secrets.
- Production cron reliability and database webhook setup require Supabase Dashboard configuration.

## Testing

See [TESTING.md](./TESTING.md) for the complete automated and manual test matrix.

Run the automated unit suite:

```powershell
npm test
```

## Build and quality checks

```powershell
npm run build
npm run lint
supabase db lint
```

Preview the production build:

```powershell
npm run preview
```

For a clean local database and current migrations:

```powershell
supabase db reset
```

## Project structure

```text
src/
  components/       Reusable UI and layout components
  hooks/            Authentication and realtime hooks
  lib/              Supabase, Groq, permission, and utility helpers
  pages/            Dashboard and feature pages
  services/         Supabase data access and AI services
  store/            Zustand application state

scripts/
  worker.ts         Local fallback automation worker

supabase/
  migrations/       PostgreSQL schema, RLS, seed data, cron, and triggers
  functions/        Supabase Edge Functions

docs/               Additional project documentation
```

## Future implementations

Recommended next features:

- Complete email and password recovery flows
- Add Google and GitHub OAuth verification
- Add email, push, and SMS notifications
- Add real Supabase Realtime reliability and unread badges
- Build a complete test suite with Playwright and Vitest
- Add organization, tenant, and multi-society isolation
- Add department-scoped dashboards and policies
- Add file uploads for proposals and event media
- Add a calendar and scheduling system
- Add a complete responsibility-transfer approval history
- Add AI proposal and budget explanations with citations
- Add human approval gates for high-risk agent actions
- Add agent audit logs and undo/rollback actions
- Add streaming AI responses
- Add vector search and a stronger RAG knowledge base
- Add production monitoring, telemetry, and error reporting
- Add deployment pipelines for Vercel and Supabase
- Add mobile/PWA offline support
- Add analytics for event participation and task performance
- Add payment or sponsorship tracking
- Add event attendance, QR check-in, and certificate generation

## Production deployment

Before deployment:

1. Create a hosted Supabase project.
2. Link this repository to the project.
3. Push migrations.
4. Deploy Edge Functions.
5. Configure production secrets in Supabase and the frontend host.
6. Configure allowed Auth URLs and OAuth redirects.
7. Enable pg_cron and required extensions.
8. Configure database webhooks only if edge-function database triggers are needed.
9. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend host.
10. Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GROQ_API_KEY` as Vite variables.

Example:

```powershell
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy
npm run build
npm run preview
```
