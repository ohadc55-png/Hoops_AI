# HOOPS AI - Basketball Coaching Assistant

AI-powered basketball coaching platform with 5-role permission system (Super-Admin / Admin / Coach / Player / Parent), 13 specialist AI agents, interactive play creator, AI drill generator, practice planner with session summaries, team management, reports & evaluations system, RAG knowledge base, video scouting room with telestrator & clip playlists, billing & payments with platform invoicing, universal messaging with timestamps, carpool coordination, admin schedule management with coach request/approval workflow, support ticket system, and full Hebrew/English i18n.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6F00?logoColor=white)

---

## Features

### 5-Role Permission System
| Role | Portal | Capabilities |
|------|--------|-------------|
| **Super-Admin** | `/super-admin` | Platform-wide management: clubs, billing, analytics, support tickets, feature toggles |
| **Admin** | `/admin` | Creates teams, generates invite codes (coach + player + parent), manages members, schedule, roles, contacts, facilities, billing, knowledge base, AI insights, video scouting, coach engagement, player development, practice plans oversight, support tickets |
| **Coach** | `/` | AI chat (8 agents), drills (assign + track), plays (create + share), practice planning with summaries, reports, evaluations, team data, schedule requests, knowledge base, video scouting, messaging |
| **Player** | `/player` | AI chat (5 agents), view schedule, assigned drills (video proof upload), shared plays, personal reports, team roster, leaderboard, video feed, messaging |
| **Parent** | `/parent` | View child info, team info, schedule, payments, video feed, messaging, carpool coordination |

Super-Admin manages clubs → Admin creates team → sends coach invite code → coach joins → coach gives player/parent invite codes → player/parent joins.

### AI Chat — 13 Specialist Agents

#### 8 Coach Agents
Questions are automatically routed to the most relevant agent by keyword matching (Hebrew + English).

| Agent | Focus |
|-------|-------|
| Assistant Coach | Practice planning, team management |
| Team Manager | Scheduling, logistics, facilities, billing, **all team data** |
| The Tactician | Game strategy, plays, X's & O's |
| Skills Coach | Drills, technique, skill development (13+) |
| Sports Nutritionist | Nutrition, diet, recovery |
| Strength & Conditioning | Workouts, injury prevention |
| The Analyst | Statistics, performance data, billing analysis |
| Youth Coach | Ages 5-12, fun-based development |

#### 5 Player Agents
| Agent | Focus |
|-------|-------|
| Shooting Coach | Shooting form, shot selection, range development |
| Dribbling Coach | Ball handling, crossovers, moves, control |
| Passing Coach | Passing technique, court vision, playmaking |
| Fitness Coach | Strength, conditioning, agility, injury prevention |
| Nutritionist | Diet, hydration, recovery food, meal planning |

### AI Data Integration (3-Tier Context)
Every AI chat message is enriched with real data:
1. **Tier 1 — Team/Player Summary** (always present): roster, record, upcoming events, facilities
2. **Tier 2 — On-Demand Data** (keyword-triggered): detailed roster, events, drills, plays, practices, game reports, attendance stats, player reports, billing
3. **Tier 3 — RAG Knowledge** (semantic search): coaching documents from knowledge base

### Play Creator
SVG-based basketball court with drag-and-drop players, 6 action types (pass, dribble, cut, screen, handoff, shot), animation playback with bezier curves, formation templates (6 offense + 3 defense), team sharing, and shareable URLs.

### AI Drill Generator & Assignment System
Select category + difficulty + optional focus — GPT-4o generates a complete drill. Coaches assign drills to players, players upload video proof, coaches review and approve/reject with feedback.

### AI Practice Planner
Describe session focus and duration — AI builds a structured practice with warmup, drills, scrimmage, and cooldown segments. Dedicated practice detail page with segment management, AI-generated notes (markdown rendering), and session summary workflow (goal achievement, standout/attention players).

### Internationalization (i18n)
Full Hebrew/English language support with client-side translation engine. Language toggle in header, RTL/LTR auto-switching, `data-i18n` attributes for declarative translations, `t(key, params)` for JS strings. 6 translation modules covering all portals.

### Reports & Evaluations
- **Attendance tracking** — per-event per-player with streaks and stats
- **Game reports** — score, standouts, areas to improve, auto-linked to team events
- **AI player assessments** — GPT-4o generates strengths/weaknesses/recommendations
- **Player evaluations** — 9-category rating system (1-10 scale), admin-requested

### Video Room & Scouting
Cloudinary-powered video hosting with:
- Direct browser-to-cloud upload, adaptive HLS streaming, CDN delivery
- Video clip creation with 13 basketball action tags
- Interactive telestrator (freehand, arrow, circle, text) with JSON stroke persistence
- Player tagging with notifications
- Player video feed (mobile-first, "Watched" confirmation)
- Parent video feed (shared clips only)
- Storage quota management (50GB/team default) with TTL auto-cleanup
- Annotation templates for reusable telestrator presets
- Clip playlists for organizing videos by theme with team/parent sharing

### Knowledge Base (RAG)
3-tier knowledge system: System (global) → Club (admin) → Coach (personal)
- Upload PDF/DOCX/TXT → paragraph-aware chunking → OpenAI embeddings → ChromaDB vector store
- Semantic search integrated into all AI agents and content generation
- 16 categories mapped per agent type

### Billing & Payments
- Payment plans with monthly installments per player
- One-time charges (registration, equipment, etc.)
- Admin: create plans, generate charges, confirm payments, send reminders
- Parent: view charges, mark as paid (player-centric: both parents see same charges)
- Auto-overdue detection via background task

### Universal Messaging
- Admin/Coach → any role communication
- Team-based broadcast, individual targeting, scheduled messages
- Unread counts in navigation badge
- Role-aware targeting (all_club, all_coaches, team, individual, etc.)
- Date+time timestamps on every message (relative time + absolute datetime)

### Support Ticket System
Admin-facing support ticket management with create, view, reply workflow. Category-based tickets (general, billing, technical, feature request, account, bug report, onboarding) with priority levels and status tracking. Full Hebrew localization.

### Carpool Coordination
- **Event-based rides** — parents offer/join rides to specific events
- **Standing carpools** — recurring carpool groups with event sign-ups
- Direction support (to event, from event, or both)

### AI Insights (Admin)
- **Financial Agent** — billing analysis, payment reminders, weekly reports
- **Professional Agent** — player performance, team metrics, coach engagement scoring
- Auto-generated weekly reports via background tasks

### Admin Schedule Management
Admin creates team events (single or recurring series). Coaches submit schedule requests that admins can approve or reject. Home/away game support with departure time and venue address. Calendar widget with monthly navigation.

### Team Management
Full CRUD for players (roster, positions, contacts, attendance streaks), events (calendar with recurring), and facilities (venues).

### Admin Roles & Contacts
Admin role management (5 default Hebrew roles + custom), contacts directory across all teams with search and filtering.

### Coach Engagement Analytics
5-category scoring (reports, communication, training, attendance, AI usage) with 90-day activity timeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Python 3.11+ |
| Database | SQLite via aiosqlite (45+ tables) |
| Vector DB | ChromaDB (persistent, cosine similarity) |
| AI | OpenAI GPT-4o (chat + JSON generation + embeddings) |
| Video | Cloudinary (upload, HLS streaming, thumbnails, CDN) |
| Auth | JWT (python-jose + bcrypt), 4-role system |
| Frontend | Vanilla JS (59 files + 6 i18n modules), Jinja2 templates (65 files), vanilla CSS |
| Icons | Material Symbols |
| Font | Space Grotesk |

---

## Quick Start

**Prerequisites:** Python 3.11+, OpenAI API key

```bash
# Clone and install
git clone https://github.com/your-username/hoops-ai.git
cd hoops-ai
python -m venv venv
source venv/bin/activate    # Mac/Linux
# venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env — set OPENAI_API_KEY

# Run
python app.py
# Open http://localhost:8000
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4` | OpenAI model for AI generation |
| `SECRET_KEY` | `change-me` | JWT signing secret |
| `DATABASE_URL` | `sqlite+aiosqlite:///./database/hoops_ai.db` | Database connection |
| `CLOUDINARY_CLOUD_NAME` | (optional) | Cloudinary cloud name for video |
| `CLOUDINARY_API_KEY` | (optional) | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | (optional) | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_PRESET` | (optional) | Cloudinary upload preset |

---

## Architecture

```
HTTP Request → Router (src/api/) → Service (src/services/) → Repository (src/repositories/) → Model
                                 ↘ OpenAI Agent (src/agents/) ← ContextService (team data + RAG injection)
                                 ↘ Cloudinary (video upload/stream)
                                 ↘ ChromaDB (knowledge retrieval)
```

### Background Tasks (6 concurrent)
| Task | Interval | Purpose |
|------|----------|---------|
| Scheduled Messages | 60s | Send pending scheduled club messages |
| Billing Overdue Check | 1h | Mark past-due charges as overdue |
| AI Insights Reports | Daily/Weekly | Financial + professional weekly reports, payment reminders, attendance alerts |
| Game Report Reminders | 6h | Remind coaches about unreported games |
| Video Cleanup | 6h | Delete TTL-expired scouting videos from Cloudinary |
| Expiry Notifications | 2h | Send 48h/6h video expiry warnings to coaches |

## Project Structure

```
hoops_ai/
├── app.py                    # FastAPI entry point, 46 routers, 60+ page routes, 6 background tasks
├── config.py                 # Pydantic settings (@lru_cache)
├── .env                      # API keys (not committed)
├── seed_data.py              # Full DB seed (1 admin, 6 teams, 6 coaches, 78 players, 156 parents)
├── seed_billing.py           # Billing seed (payment plans, installments, charges)
├── seed_knowledge.py         # RAG seed (process knowledge/base/* documents)
│
├── src/
│   ├── agents/               # AI agent routing + system prompts
│   │   ├── base_agent.py     # BaseAgent class + keyword routing (8 coach agents)
│   │   ├── prompts.py        # System prompts for 8 coach agents (EN + HE keywords)
│   │   ├── player_agent.py   # PlayerAgent class + routing (5 player agents)
│   │   └── player_prompts.py # System prompts for 5 player agents
│   │
│   ├── api/                  # FastAPI routers (46 files)
│   │   ├── auth.py           # Coach: register, login, profile, join-team, register-with-invite
│   │   ├── admin_auth.py     # Admin: register, login, auth guard
│   │   ├── admin_dashboard.py # Admin stats + dashboard data
│   │   ├── admin_roles.py    # Admin role CRUD + assign
│   │   ├── admin_contacts.py # Contacts directory
│   │   ├── admin_facilities.py # Facility CRUD
│   │   ├── admin_players.py  # Player profiles + reports (admin view)
│   │   ├── admin_evaluations.py # Evaluation requests + cross-team view
│   │   ├── admin_engagement.py # Coach engagement stats
│   │   ├── teams.py          # Team CRUD, invite codes, member management
│   │   ├── schedule.py       # Admin: CRUD team events + recurring + GET /my (any role)
│   │   ├── schedule_requests.py # Coach request + admin approve/reject
│   │   ├── player_auth.py    # Player register (invite), login
│   │   ├── player_dashboard.py # Player: schedule, drills, reports, plays, leaderboard, streak
│   │   ├── player_chat.py    # Player: AI chat (5 agents)
│   │   ├── parent_auth.py    # Parent register (invite + email child match), login
│   │   ├── parent_dashboard.py # Parent: dashboard, schedule, child, team
│   │   ├── chat.py           # Coach: AI chat (8 agents)
│   │   ├── drills.py         # CRUD + AI generation + assignment + tracking + video review
│   │   ├── plays.py          # CRUD + AI generation + team sharing
│   │   ├── practice.py       # Sessions, segments, AI generation
│   │   ├── logistics.py      # Events, facilities, players CRUD
│   │   ├── reports.py        # Attendance, game/player reports + AI generation
│   │   ├── evaluations.py    # Coach: player evaluations (9 categories)
│   │   ├── files.py          # CSV/Excel/image upload
│   │   ├── billing.py        # Payment plans, installments, one-time charges
│   │   ├── messaging.py      # Universal messaging (all roles)
│   │   ├── carpool.py        # Parent carpool (event + standing)
│   │   ├── transport.py      # Admin away game transport
│   │   ├── knowledge.py      # Knowledge base (RAG documents)
│   │   ├── scouting.py       # Video room (coach + player + admin + parent)
│   │   ├── insights.py       # Financial + professional AI agents
│   │   ├── admin_practice.py # Admin: practice plans oversight across teams
│   │   ├── support.py        # Admin support tickets
│   │   ├── super_admin_auth.py      # Super-admin: register, login
│   │   ├── super_admin_dashboard.py # Super-admin: platform overview
│   │   ├── super_admin_clubs.py     # Super-admin: multi-club management
│   │   ├── super_admin_billing.py   # Super-admin: platform billing & invoicing
│   │   ├── super_admin_analytics.py # Super-admin: platform analytics
│   │   ├── super_admin_tickets.py   # Super-admin: support ticket management
│   │   ├── super_admin_features.py  # Super-admin: feature toggles
│   │   └── super_admin_notifications.py # Super-admin: system notifications
│   │
│   ├── models/               # SQLAlchemy ORM (45+ tables, 52 model files)
│   ├── repositories/         # Data access layer (34 repositories)
│   ├── services/             # Business logic (40 services)
│   │   ├── rag/              # RAG subpackage (4 files)
│   │   │   ├── rag_service.py        # Orchestration (process, search, context)
│   │   │   ├── embedding_service.py  # OpenAI text-embedding-3-small
│   │   │   ├── vector_store.py       # ChromaDB wrapper
│   │   │   └── document_processor.py # PDF/DOCX/TXT extraction + chunking
│   │   ├── financial_agent.py        # Admin financial AI analysis
│   │   ├── professional_agent.py     # Admin professional AI analysis
│   │   ├── insight_data_collector.py # Data aggregation for AI agents
│   │   └── ...               # 26 other service files
│   │
│   ├── constants/
│   │   ├── agents.py         # 8 coach agent definitions (name, color, icon, EN+HE keywords)
│   │   ├── player_agents.py  # 5 player agent definitions
│   │   ├── rag_categories.py # 16 categories + agent access mapping
│   │   └── enums.py          # Enum classes
│   │
│   └── utils/
│       ├── database.py       # Async engine, session factory, auto-migrations
│       └── openai_client.py  # chat_completion + chat_completion_json + embeddings
│
├── templates/                # Jinja2 (5 base layouts + 11 auth pages + 49 page templates)
│   ├── base.html             # Coach layout (orange theme)
│   ├── admin_base.html       # Admin layout (blue theme)
│   ├── player_base.html      # Player layout (green gamer theme)
│   ├── parent_base.html      # Parent layout (warm theme)
│   ├── super_admin_base.html # Super-admin layout
│   ├── auth/                 # 11 auth pages (login + register per role + invite)
│   └── pages/                # 49 page templates
│
├── static/
│   ├── css/                  # Design tokens + 5 portal themes + 6 page styles
│   └── js/                   # 59 JS files + 6 i18n translation modules
│       └── translations/     # 6 i18n modules (common, admin, coach, player, parent, auth)
│
├── database/                 # SQLite DB (auto-created) + ChromaDB vector store
│   ├── hoops_ai.db
│   └── chroma/
│
├── uploads/
│   ├── knowledge/            # RAG document uploads
│   └── videos/               # Drill proof video uploads
│
└── knowledge/
    └── base/                 # System-tier coaching documents (PDF/DOCX/TXT)
```

---

## API Documentation

Run the app and visit [`http://localhost:8000/docs`](http://localhost:8000/docs) for interactive Swagger documentation.

### Key Endpoints (250+ total across 46 routers)

**Admin** (requires admin JWT):
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin-auth/register` | Create admin account |
| POST | `/api/admin-auth/login` | Admin login |
| GET | `/api/admin/dashboard` | Rich aggregated stats |
| GET | `/api/admin/contacts` | Contacts directory (search, filter) |
| POST | `/api/teams` | Create team (generates 3 invite code pairs) |
| POST | `/api/schedule/events` | Create team event (single or recurring) |
| PUT | `/api/schedule-requests/{id}/approve` | Approve coach request |
| POST | `/api/billing/plans` | Create payment plan for team |
| POST | `/api/billing/one-time` | Create one-time charge |
| GET | `/api/billing/overview` | Billing overview |
| POST | `/api/admin/evaluations/requests` | Request coach evaluations |
| GET | `/api/admin/coaches/engagement` | Coach engagement stats |
| POST | `/api/insights/financial/report` | AI financial analysis |
| POST | `/api/insights/professional/report` | AI professional analysis |

**Coach** (requires coach JWT):
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/send` | Send message to AI agent |
| POST | `/api/drills/generate` | AI-generate a drill |
| POST | `/api/drills/{id}/assign` | Assign drill to players |
| POST | `/api/plays/generate` | AI-generate a play |
| POST | `/api/plays/{id}/share` | Share play with team |
| POST | `/api/practice/generate` | AI-generate practice session |
| POST | `/api/evaluations` | Create player evaluation |
| POST | `/api/knowledge/upload` | Upload coaching document |
| POST | `/api/scouting/videos` | Register scouting video |
| POST | `/api/scouting/videos/{id}/clips` | Create video clip |
| POST | `/api/messages/send` | Send message |

**Player** (requires player JWT):
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/player-chat/send` | Send message to player AI agent |
| GET | `/api/player/drills` | Assigned drills |
| PUT | `/api/player/drills/{id}/complete` | Mark drill complete |
| POST | `/api/player/drills/{id}/upload-proof` | Upload drill video |
| GET | `/api/player/plays` | Shared plays |
| GET | `/api/player/leaderboard` | Team leaderboards |
| GET | `/api/scouting/player/feed` | Video clip feed |

**Parent** (requires parent JWT):
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parent/dashboard` | Child info, team, schedule |
| GET | `/api/billing/my` | Parent billing |
| POST | `/api/carpool/rides` | Offer ride |
| POST | `/api/carpool/standing` | Create standing carpool |
| GET | `/api/scouting/parent/feed` | Shared video clips |

**Super-Admin** (requires super-admin JWT):
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/super-admin/auth/login` | Super-admin login |
| GET | `/api/super-admin/dashboard` | Platform-wide stats |
| GET | `/api/super-admin/clubs` | List all clubs |
| GET | `/api/super-admin/billing/invoices` | Platform invoices |
| GET | `/api/super-admin/analytics` | Platform analytics |
| GET | `/api/super-admin/tickets` | Support tickets |

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Design System

Warm dark theme with orange accent, 5 portal color schemes.

| Token | Coach | Admin | Player | Parent |
|-------|-------|-------|--------|--------|
| Primary | `#f48c25` (orange) | `#3b82f6` (blue) | `#22c55e` (green) | `#3b82f6` (blue) |
| Background | `#181411` | `#0b0f1a` | `#050808` | `#f1f5f9` |
| Surface | `#1e1914` | `#111827` | `#0a120e` | `#ffffff` |
| Text | `#ffffff` | `#f1f5f9` | `#f0fdf4` | `#1e293b` |
| Font | Space Grotesk | Space Grotesk | Space Grotesk | Space Grotesk |
| Spacing | 8-step scale (0.25rem — 3rem) | | | |

---

## Seed Data

```bash
# Full database reset (admin, teams, coaches, players, parents, events, drills, reports)
python seed_data.py

# Add billing data (payment plans, installments, charges) — runs after seed_data.py
python seed_billing.py

# Process knowledge base documents — requires OpenAI API key
python seed_knowledge.py
```

**Default credentials:** All passwords are `123456`
- Admin: `admin@hoops.club`
- Coaches: `yossi.cohen@hoops.club` through `gil.adri@hoops.club`

---

## License

MIT
