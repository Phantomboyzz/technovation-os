# Technovation OS Testing Guide

This guide covers automated checks and a manual end-to-end demo.

## Automated checks

```powershell
npm test
npm run build
npm run lint
supabase db lint
```

The Vitest suite currently checks:

- Member event and proposal permissions
- Faculty proposal approval permission
- HOD task permissions
- Groq agent tool-call execution
- Groq fallback behavior without a key

## Test environment

1. Start Docker Desktop.
2. Run `supabase start`.
3. Run `supabase db reset`.
4. Start `npm run dev -- --host 127.0.0.1`.
5. Start `npm run worker` in another terminal.

## Demo accounts

After `supabase db reset`, these accounts are ready:

| Position | Login ID | Password |
|---|---|---|
| President | `president@demo.techno` | `President@123` |
| Vice President | `vicepresident@demo.techno` | `VicePresident@123` |
| HOD | `hod@demo.techno` | `HOD@123` |
| Faculty Advisor | `faculty@demo.techno` | `Faculty@123` |
| Member | `member@demo.techno` | `Member@123` |

## Authentication test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| AUTH-01 | Register | Open `/register`; enter a valid name, email, password, confirmation, and terms | Account is created; member profile appears; user opens the member dashboard |
| AUTH-02 | Password mismatch | Enter different password values | Account is not created and an error or blocked submit is shown |
| AUTH-03 | Login | Open `/login`; enter valid credentials | User is logged in and redirected to `/dashboard` |
| AUTH-04 | Invalid login | Enter an unknown email or wrong password | "Invalid login credentials" is shown; no protected page is opened |
| AUTH-05 | Logout | Sign out from the user menu | Session is cleared and `/login` opens |
| AUTH-06 | Protected route | Without login, open `/events`, `/tasks`, or `/assistant` | User is redirected to `/login` |

## Role and permission test cases

| ID | Scenario | Member | Faculty | HOD | President |
|---|---|---|---|---|---|
| RBAC-01 | View events | Allowed | Allowed | Allowed | Allowed |
| RBAC-02 | Create event | Allowed | Read only | Allowed | Allowed |
| RBAC-03 | Submit proposal | Allowed | Read/approve | Allowed | Allowed |
| RBAC-04 | Approve proposal | Denied | Allowed | Not normally allowed | Allowed |
| RBAC-05 | Create task | Denied | Read/assign only | Allowed | Allowed |
| RBAC-06 | Manage automations | Denied | Denied | Read only | Allowed |
| RBAC-07 | Manage society roles | Denied | Denied | Denied | Allowed |

## Event workflow test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| EVT-01 | Create event | Open `/events/new`; complete title, department, date, venue, and budget | Event is stored with `draft` status |
| EVT-02 | Search event | Enter text in the Events search field | Matching events remain in the grid |
| EVT-03 | Filter event status | Select `Approved`, `Tasks Allocated`, or `Completed` | Event list filters to that status |
| EVT-04 | Generate AI ideas | Open an event's ideation route; click Generate Ideas | Groq returns ideas and inserts them into `event_ideas` |
| EVT-05 | Submit an idea | Enter title, description, and category | New idea appears in the ideas list |
| EVT-06 | Upvote idea | Click an idea upvote control | Upvote count changes |
| EVT-07 | Delete idea | Delete an owned idea | Idea is removed |
| EVT-08 | Generate proposal | Open a draft proposal, select a top-voted idea, and generate | Proposal fields are populated from Groq |
| EVT-09 | Save draft | Complete fields and save draft | Proposal remains stored with draft/pending-compatible status |
| EVT-10 | Submit proposal | Complete fields and submit | Proposal status becomes `pending` and faculty receive a notification |

## Approval test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| APR-01 | Faculty sees pending proposal | Log in as faculty and open Approval Queue | Pending proposal is listed |
| APR-02 | Approve proposal | Add comments and approve | Proposal becomes `approved`; event becomes `tasks_allocated`; execution task is inserted |
| APR-03 | Reject proposal | Add comments and reject | Proposal becomes `rejected`; submitter gets a notification |
| APR-04 | Unauthorized approval | Attempt approval as member or HOD | UI denies or RLS rejects the mutation |
| APR-05 | Approval audit | Inspect Supabase `approvals` and `audit_log` | Reviewer, decision, comments, and event/proposal IDs are recorded |

## Task and handover test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| TASK-01 | Create task | Open task board and create an event/department task | Task appears in `pending` |
| TASK-02 | Move task | Drag it from To Do to In Progress | Task status updates |
| TASK-03 | Complete task | Move it to Done | Task status becomes `completed` |
| TASK-04 | Overdue style | Set a past due date | UI marks the overdue task visually |
| TASK-05 | Transfer responsibility | HOD/president selects another member | Assignment becomes pending and recipient gets a notification |
| TASK-06 | Accept transfer | Log in as recipient and accept | Task `assigned_to` changes and assignment status becomes `accepted` |
| TASK-07 | Decline transfer | Log in as recipient and decline | Assignment becomes `declined`; current assignment remains unchanged |
| TASK-08 | Unauthorized assignment | Member attempts assignment | Action is denied |
| TASK-09 | Delete task | Delete as creator or HOD/president | Task is removed |

## Automation and reminder test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| AUTO-01 | Proposal insert trigger | Insert a pending proposal | Faculty or faculty-level profile gets a notification |
| AUTO-02 | Proposal approval trigger | Approve a proposal in SQL or UI | Event status and execution task update automatically |
| AUTO-03 | Proposal rejection trigger | Reject a proposal | Submitter gets a rejection notification |
| AUTO-04 | Handover trigger | Insert a task assignment | Recipient gets a handover notification |
| AUTO-05 | Reminder SQL | Run `SELECT public.send_due_task_reminders();` | Due tasks assigned in 24 hours receive at most one reminder in 24 hours |
| AUTO-06 | pg_cron registration | Query `cron.job` | Reminder and cleanup jobs are active |
| AUTO-07 | Worker polling | Run `npm run worker` | Worker starts and scheduled-rule execution is logged |
| AUTO-08 | Manual automation | Trigger a rule from Automation Rules | Automation log becomes `success` or `failed` |
| AUTO-09 | Pause automation | Deactivate a rule | Rule no longer executes automatically |

## Groq agent test cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| AI-01 | Ask live data | Ask "How many active tasks do we have?" | Assistant retrieves Supabase context and gives a database-backed answer |
| AI-02 | List events | Ask "What events are coming up?" | Agent calls `list_upcoming_events` and summarizes results |
| AI-03 | Create task autonomously | Ask an HOD to create a named task for an event | Agent calls `create_task`, inserts the task, and reports the result |
| AI-04 | Unauthorized task | Ask a member to create a task | Agent receives the permission error and explains the denial |
| AI-05 | Update owned task | Ask an assignee to mark their task complete | Agent verifies ownership and updates status |
| AI-06 | Unauthorized task update | Ask a member to update another user's task | Agent denies the mutation |
| AI-07 | Submit proposal autonomously | Ask a member to submit a proposal for an event | Agent calls `submit_proposal`; trigger creates a notification |
| AI-08 | Approve proposal autonomously | Ask faculty/president to approve a proposal ID | Agent calls `approve_proposal`; trigger creates task and updates event |
| AI-09 | Reject proposal autonomously | Ask faculty/president to reject with comments | Agent updates status and creates a rejection notification |
| AI-10 | Assign task | Ask HOD/president to assign a task | Agent assigns it and records an accepted assignment/audit row |
| AI-11 | Suggestion button | Click a quick suggestion in Assistant | Prompt is submitted immediately, no stale input problem |
| AI-12 | Missing Groq key | Remove key and restart | App reports demo/fallback behavior instead of silently pretending a real response succeeded |
| AI-13 | Invalid tool arguments | Ask for an action with a missing event or task ID | Agent asks for clarification or reports invalid arguments |

## Database test cases

Run SQL smoke checks:

```sql
SELECT count(*) FROM roles;
SELECT count(*) FROM departments;
SELECT count(*) FROM profiles;
SELECT count(*) FROM events;
SELECT count(*) FROM proposals;
SELECT count(*) FROM tasks;
SELECT count(*) FROM notifications;
SELECT count(*) FROM audit_log;
```

Check RLS behavior through the browser and separate sessions, not only in the SQL editor. SQL editor operations use elevated database roles and do not prove client-policy behavior.

## Regression acceptance criteria

The demo is ready when all of these pass:

- Registration creates a member profile.
- A member can create an event and proposal.
- Groq generates ideas or a proposal using an available model.
- Faculty can approve or reject a proposal.
- Approval updates the event and creates a task automatically.
- A task can be moved and reassigned.
- The worker or pg_cron is active.
- The agent reads live database data.
- An authorized agent mutation succeeds.
- An unauthorized agent mutation is denied.
- `npm run build` succeeds.
- `npm run lint` has no errors.
- `supabase db lint` reports no schema errors.
