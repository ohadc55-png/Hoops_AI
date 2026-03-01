# HOOPS AI - Project Summary

## Overview

Basketball coaching assistant web app with 5-role permission system (Super-Admin / Admin / Coach / Player / Parent). FastAPI backend + vanilla JS frontend with full Hebrew/English i18n. 13 AI agents (8 coach + 5 player, GPT-4o) with real-time team data access + RAG knowledge base. Interactive play creator, drill library with assignment/tracking, practice planner with session summaries, reports & evaluations, video scouting room with telestrator & clip playlists, billing & payments with platform invoicing, universal messaging with timestamps, carpool coordination, admin schedule management with coach request/approval workflow, support ticket system.

**URLs:**
- Super-Admin Portal: `http://localhost:8000/super-admin`
- Admin Portal: `http://localhost:8000/admin`
- Coach Portal: `http://localhost:8000` (main app)
- Player Portal: `http://localhost:8000/player`
- Parent Portal: `http://localhost:8000/parent`
- API Docs: `http://localhost:8000/docs`

---

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy 2.0 (async), SQLite (aiosqlite), JWT auth (python-jose + bcrypt)
- **AI:** OpenAI GPT-4o (chat + JSON generation + text-embedding-3-small for RAG)
- **Vector DB:** ChromaDB (PersistentClient, cosine similarity)
- **Video:** Cloudinary (browser upload, HLS streaming, thumbnails, CDN)
- **Frontend:** Jinja2 templates, vanilla JS, vanilla CSS (design tokens), Material Symbols icons
- **i18n:** Client-side translation engine (i18n.js), 6 modules (common/admin/coach/player/parent/auth), HE/EN with RTL/LTR
- **Font:** Space Grotesk

---

## Directory Structure

```
hoops_ai/
├── app.py                          # FastAPI entry point, 46 routers, 60+ page routes, 6 background tasks
├── config.py                       # Pydantic settings (env vars, DB URL, OpenAI, Cloudinary, RAG config)
├── requirements.txt
├── .env                            # OPENAI_API_KEY, SECRET_KEY, CLOUDINARY_* (optional)
├── seed_data.py                    # Full DB seed (1 admin, 6 teams, 6 coaches, 78 players, 156 parents)
├── seed_billing.py                 # Billing seed (payment plans, installments, charges)
├── seed_knowledge.py               # RAG seed (process knowledge/base/* documents)
│
├── src/
│   ├── agents/
│   │   ├── base_agent.py           # BaseAgent class + keyword routing + system_prompt with 3-tier context
│   │   ├── prompts.py              # System prompts for 8 coach agents (EN + HE keywords)
│   │   ├── player_agent.py         # PlayerAgent class + route_to_player_agent (keyword routing)
│   │   └── player_prompts.py       # System prompts for 5 player agents
│   │
│   ├── api/                        # FastAPI routers (46 files, 250+ endpoints)
│   │   ├── auth.py                 # Coach: register, register-with-invite, login, profile, join-team
│   │   ├── admin_auth.py           # Admin: register, login, get_current_admin guard
│   │   ├── admin_dashboard.py      # GET /api/admin/dashboard (rich aggregated stats)
│   │   ├── admin_roles.py          # Admin roles: CRUD + assign + contacts
│   │   ├── admin_contacts.py       # GET /api/admin/contacts (directory with search/filter)
│   │   ├── admin_facilities.py     # Admin facility CRUD
│   │   ├── admin_players.py        # Admin: player list, profiles, reports
│   │   ├── admin_evaluations.py    # Admin: evaluation requests, cross-team eval view
│   │   ├── admin_engagement.py     # Admin: coach engagement stats
│   │   ├── teams.py                # Admin-only: CRUD teams, 3 invite code types, member management
│   │   ├── schedule.py             # Admin: CRUD team events + recurring + GET /my (any role)
│   │   ├── schedule_requests.py    # Coach: POST request | Admin: approve/reject
│   │   ├── player_auth.py          # Player: register (invite), login, profile
│   │   ├── player_dashboard.py     # Player: schedule, drills, plays, reports, leaderboard, streak
│   │   ├── player_chat.py          # Player: AI chat (5 agents)
│   │   ├── parent_auth.py          # Parent: register (invite + email child match), login
│   │   ├── parent_dashboard.py     # Parent: dashboard, schedule, child, team
│   │   ├── chat.py                 # Coach: AI chat (8 agents)
│   │   ├── drills.py               # CRUD + AI generation + assignment + tracking + video review
│   │   ├── plays.py                # CRUD + AI generation + team sharing
│   │   ├── practice.py             # Sessions, segments, AI generation
│   │   ├── logistics.py            # Events (+ recurring), facilities (read-only), players CRUD
│   │   ├── reports.py              # Attendance, game/player reports + AI generation
│   │   ├── evaluations.py          # Coach: 9-category player evaluations
│   │   ├── files.py                # CSV/Excel/image upload
│   │   ├── billing.py              # Payment plans, installments, one-time charges, reminders
│   │   ├── messaging.py            # Universal messaging (all roles)
│   │   ├── carpool.py              # Parent: event rides + standing carpools
│   │   ├── transport.py            # Admin: away game transport view
│   │   ├── knowledge.py            # RAG: upload, list, delete, retry, preview, download
│   │   ├── scouting.py             # Video room: coach + player + admin + parent endpoints
│   │   ├── insights.py             # Financial + professional AI agents
│   │   ├── admin_practice.py       # Admin: practice plans oversight across teams
│   │   ├── support.py              # Admin: support ticket CRUD + replies
│   │   ├── super_admin_auth.py     # Super-admin: register, login
│   │   ├── super_admin_dashboard.py # Super-admin: platform overview
│   │   ├── super_admin_clubs.py    # Super-admin: multi-club management
│   │   ├── super_admin_billing.py  # Super-admin: platform billing & invoicing
│   │   ├── super_admin_analytics.py # Super-admin: platform analytics
│   │   ├── super_admin_tickets.py  # Super-admin: support ticket management
│   │   ├── super_admin_features.py # Super-admin: feature toggles
│   │   └── super_admin_notifications.py # Super-admin: system notifications
│   │
│   ├── models/                     # SQLAlchemy ORM (45+ tables, 52 model files)
│   │   ├── base.py                 # TimestampMixin, JSONText custom type for SQLite
│   │   ├── user.py                 # User (name, email, password_hash, role, phone, date_of_birth)
│   │   ├── coach.py                # Coach profile (user_id FK)
│   │   ├── player.py               # Player roster (coach_id, user_id, jersey, position, attendance streaks)
│   │   ├── team.py                 # Team (created_by_admin_id, 3 invite code pairs)
│   │   ├── team_member.py          # TeamMember (team_id, user_id, role_in_team, player_id)
│   │   ├── admin_role.py           # AdminRole (name, description, is_default, is_active)
│   │   ├── conversation.py         # Chat sessions (coach_id or user_id)
│   │   ├── message.py              # Chat messages (role, content, agent)
│   │   ├── drill.py                # Drills (category, difficulty, instructions, tags, video_url)
│   │   ├── drill_assignment.py     # Drill → Player assignment (status, video_url, coach_feedback)
│   │   ├── play.py                 # Plays (players JSON, actions JSON, shared_with_team, team_id)
│   │   ├── practice_session.py     # Sessions + segments (1:N, drill_id FK on segments)
│   │   ├── event.py                # Coach calendar events + recurrence_group
│   │   ├── team_event.py           # Admin-managed team events (recurring, away game support)
│   │   ├── schedule_request.py     # Coach→Admin request (pending/approved/rejected)
│   │   ├── facility.py             # Venues (admin_id FK)
│   │   ├── attendance.py           # Per-player per-event presence tracking
│   │   ├── game_report.py          # Post-game reports (team_event_id FK, standouts JSON)
│   │   ├── player_report.py        # Semi-annual player assessments (AI-generated)
│   │   ├── player_evaluation.py    # 9-category rated evaluations (1-10 scale)
│   │   ├── report_request.py       # Admin→Coach evaluation requests
│   │   ├── charge.py               # Legacy charges model
│   │   ├── team_subscription.py    # Legacy monthly fee model
│   │   ├── payment_plan.py         # Payment plans (season, total, installments)
│   │   ├── installment.py          # Monthly installments (amount, due_date, status)
│   │   ├── one_time_charge.py      # One-time charges (registration, equipment)
│   │   ├── club_message.py         # Club messaging (sender, body, targets, scheduled)
│   │   ├── message_recipient.py    # Message read tracking
│   │   ├── knowledge_document.py   # RAG documents (scope, category, status, chunks)
│   │   ├── insight_report.py       # AI-generated insight reports
│   │   ├── scouting_video.py       # Cloudinary videos (HLS, thumbnails, sharing, TTL)
│   │   ├── video_clip.py           # Video clips (start/end, action_type, rating)
│   │   ├── clip_player_tag.py      # Clip↔Player M:M tagging
│   │   ├── video_annotation.py     # Telestrator strokes (JSON stroke_data)
│   │   ├── clip_view.py            # Player clip view tracking
│   │   ├── team_storage_quota.py   # Video storage quota (50GB default)
│   │   ├── carpool_ride.py         # Event-based carpool rides
│   │   ├── carpool_passenger.py    # Ride passengers
│   │   ├── standing_carpool.py     # Recurring carpool groups
│   │   ├── standing_carpool_member.py # Carpool group members
│   │   ├── standing_carpool_signup.py # Event signups for standing carpools
│   │   ├── annotation_template.py  # Reusable telestrator drawing presets (coach_id, name, annotations_data)
│   │   └── clip_playlist.py        # ClipPlaylist + PlaylistItem (video clip organization, team/parent sharing)
│   │
│   ├── repositories/              # Data access layer (34 repositories)
│   │   ├── base_repository.py     # Generic BaseRepository<T> (create, get, update, delete)
│   │   ├── user_repository.py     # get_by_email, get_by_email_and_role
│   │   ├── coach_repository.py    # get_by_email
│   │   ├── player_repository.py   # base CRUD only
│   │   ├── team_repository.py     # get_by_admin_id, get_by_*_invite_code/token (6 methods)
│   │   ├── team_member_repository.py # get_by_team, get_by_user, get_membership
│   │   ├── admin_role_repository.py # get_all_active, get_by_name
│   │   ├── conversation_repository.py # get_with_messages (selectinload)
│   │   ├── message_repository.py  # ClubMessageRepository + MessageRecipientRepository
│   │   ├── drill_repository.py    # filter_drills (category, difficulty, search)
│   │   ├── play_repository.py     # get_shared_by_team_ids
│   │   ├── practice_repository.py # get_with_segments, get_all_with_segments
│   │   ├── event_repository.py    # get_by_date_range, get_by_month_for_coaches
│   │   ├── team_event_repository.py # 11 methods (upcoming, by_team, by_admin, away games)
│   │   ├── schedule_request_repository.py # get_by_coach, get_pending_by_admin
│   │   ├── facility_repository.py # get_by_admin_id
│   │   ├── attendance_repository.py # upsert_batch, get_player_stats, recalculate_streaks
│   │   ├── game_report_repository.py # get_by_coach, get_reported_team_event_ids
│   │   ├── player_report_repository.py # get_by_player, get_all_by_player, get_by_period
│   │   ├── player_evaluation_repository.py # get_by_player, get_latest_for_player
│   │   ├── report_request_repository.py # get_pending_for_coach, get_pending_for_admin
│   │   ├── billing_repository.py  # PaymentPlanRepo + InstallmentRepo + OneTimeChargeRepo
│   │   ├── knowledge_repository.py # get_for_admin, get_for_coach (complex OR conditions)
│   │   ├── scouting_repository.py # 5 classes (Video, Clip, Annotation, ClipView, StorageQuota)
│   │   ├── carpool_repository.py  # CarpoolRideRepo + CarpoolPassengerRepo
│   │   └── standing_carpool_repository.py # 3 classes (Carpool, Member, Signup)
│   │
│   ├── services/                  # Business logic + AI integration (40 services)
│   │   ├── auth_service.py        # Coach auth + shared JWT functions (exported to all 4 auth services)
│   │   ├── admin_auth_service.py  # Admin auth
│   │   ├── player_auth_service.py # Player auth (invite code + email child linking)
│   │   ├── parent_auth_service.py # Parent auth (invite code + email child matching)
│   │   ├── team_service.py        # Team CRUD, invite code management (3 types), member operations
│   │   ├── schedule_service.py    # Admin events + recurring | Coach requests + approval + transport notifications
│   │   ├── chat_service.py        # Coach message routing to 8 agents + context enrichment
│   │   ├── player_chat_service.py # Player message routing to 5 agents + context enrichment
│   │   ├── context_service.py     # Coach AI: 3-tier data injection (summary + DB data + RAG)
│   │   ├── player_context_service.py # Player AI: 3-tier data injection
│   │   ├── drill_service.py       # CRUD + AI drill generation (RAG-enriched)
│   │   ├── play_service.py        # CRUD + AI play generation (RAG-enriched) + sharing
│   │   ├── practice_service.py    # Session CRUD + AI generation (RAG-enriched)
│   │   ├── logistics_service.py   # Events + players CRUD
│   │   ├── report_service.py      # Attendance (streaks) + game/player reports + AI generation + parent notifications
│   │   ├── evaluation_service.py  # 9-category evaluations + admin report requests + parent notifications
│   │   ├── file_service.py        # Upload validation, CSV/Excel processing
│   │   ├── billing_service.py     # Payment plans + installments + one-time charges + reminders + overdue check
│   │   ├── messaging_service.py   # Universal messaging (send, inbox, scheduled, target resolution)
│   │   ├── cloudinary_service.py  # Cloudinary wrapper (upload config, delete, thumbnails, HLS)
│   │   ├── scouting_service.py    # Video room (35+ methods: videos, clips, annotations, feeds, quota, cleanup)
│   │   ├── player_profile_service.py # Comprehensive player profile (5 data sources)
│   │   ├── engagement_service.py  # Coach engagement scoring (5 categories, 0-100)
│   │   ├── financial_agent.py     # AI financial analysis for admin
│   │   ├── professional_agent.py  # AI professional analysis for admin
│   │   ├── insight_data_collector.py # Data aggregation for AI insight agents
│   │   ├── carpool_service.py     # Event-based carpool rides
│   │   ├── standing_carpool_service.py # Recurring carpool groups
│   │   ├── drill_video_service.py # Drill proof video upload/review
│   │   └── rag/                   # RAG subpackage
│   │       ├── rag_service.py     # Orchestration (process, search, get_context_for_agent)
│   │       ├── embedding_service.py # OpenAI text-embedding-3-small
│   │       ├── vector_store.py    # ChromaDB wrapper (singleton client)
│   │       └── document_processor.py # PDF/DOCX/TXT extraction + paragraph-aware chunking
│   │
│   ├── constants/
│   │   ├── agents.py              # 8 coach agent definitions (name, color, icon, EN+HE keywords)
│   │   ├── player_agents.py       # 5 player agent definitions
│   │   ├── rag_categories.py      # 16 categories + per-agent category mapping
│   │   └── enums.py               # Difficulty, Category, Position, EventType, SegmentType, AgeGroup, CoachLevel
│   │
│   └── utils/
│       ├── database.py            # Async engine, session factory, get_db, init_db (migrations), close_db
│       └── openai_client.py       # Lazy client: chat_completion, chat_completion_json, create_embedding(s)
│
├── templates/                     # Jinja2 (5 base layouts + 11 auth + 49 page templates = 65 total)
│   ├── base.html                  # Coach layout (orange theme, 11-item sidebar)
│   ├── admin_base.html            # Admin layout (blue theme, management sidebar)
│   ├── player_base.html           # Player layout (green gamer theme)
│   ├── parent_base.html           # Parent layout (warm theme)
│   ├── super_admin_base.html      # Super-admin layout
│   ├── auth/                      # 11 auth pages
│   │   ├── login.html, register.html                    # Coach
│   │   ├── coach_invite_register.html                   # Coach invite registration
│   │   ├── admin_login.html, admin_register.html        # Admin
│   │   ├── player_login.html, player_register.html      # Player
│   │   └── parent_login.html, parent_register.html      # Parent
│   └── pages/                     # 49 page templates
│       ├── chat.html, drills.html, plays.html, practice.html  # Coach tools
│       ├── practice_detail.html                                # Practice session detail + summary
│       ├── schedule.html, logistics.html, reports.html        # Coach management
│       ├── analytics.html, settings.html, messages.html       # Coach misc
│       ├── coach_knowledge.html, scouting.html                # Coach features
│       ├── player_chat.html, player_dashboard.html            # Player
│       ├── player_schedule.html, player_drills.html           # Player
│       ├── player_plays.html, player_reports.html             # Player
│       ├── player_team.html, player_leaderboard.html          # Player
│       ├── player_messages.html, player_scouting.html         # Player
│       ├── parent_dashboard.html, parent_schedule.html        # Parent
│       ├── parent_payments.html, parent_messages.html         # Parent
│       ├── parent_carpool.html, parent_scouting.html          # Parent
│       ├── admin_dashboard.html, admin_schedule.html          # Admin
│       ├── admin_teams.html, admin_contacts.html              # Admin
│       ├── admin_roles.html, admin_facilities.html            # Admin
│       ├── admin_billing.html, admin_knowledge.html           # Admin
│       ├── admin_insights.html, admin_scouting.html           # Admin
│       ├── admin_messages.html, admin_coaches.html            # Admin
│       ├── admin_player_development.html                      # Admin
│       ├── admin_transport.html, admin_transport_detail.html  # Admin
│       ├── admin_practice_plans.html                          # Admin practice oversight
│       ├── admin_player_profile.html, admin_coach_profile.html # Admin profiles
│       ├── admin_support.html                                 # Admin support tickets
│       └── player_profile_page.html                           # Coach→Player profile
│
├── static/
│   ├── css/
│   │   ├── variables.css          # Design tokens (colors, spacing, typography)
│   │   ├── reset.css              # CSS reset
│   │   ├── main.css               # Component styles (btn, input, card, modal, badge)
│   │   ├── layout.css             # Sidebar, header, responsive grid
│   │   ├── admin.css              # Admin portal (blue theme override)
│   │   ├── player.css             # Player portal (green neon gamer theme)
│   │   ├── parent.css             # Parent portal (light/white theme)
│   │   └── pages/
│   │       ├── chat.css           # Coach chat UI
│   │       ├── player-chat.css    # Player chat UI (green theme)
│   │       ├── play-creator.css   # Play creator (canvas, toolbars, sidebar)
│   │       ├── calendar.css       # Calendar widget (356 lines)
│   │       ├── reports.css        # Attendance grid, stats bars
│   │       ├── scouting.css       # Video room (grid, player, telestrator)
│   │       └── admin-scouting.css # Admin video room (blue overrides)
│   │
│   └── js/                        # 59 JS files + 6 i18n translation modules
│       ├── main.js                # Coach API wrapper, Toast, auth, notifications, search, sidebar
│       ├── admin_main.js          # Admin API wrapper (hoops_admin_token)
│       ├── player_main.js         # Player API wrapper (hoops_player_token)
│       ├── parent_main.js         # Parent API wrapper (hoops_parent_token)
│       ├── calendar-widget.js     # Reusable calendar (month nav, event pills, day detail)
│       ├── play-viewer.js         # Standalone read-only play renderer with animation
│       ├── chat.js                # Coach AI chat (8 agent tabs, conversations, file upload)
│       ├── player_chat.js         # Player AI chat (5 agents, Hebrew UI)
│       ├── drills.js              # Drill CRUD, AI generate, assign, track, video review
│       ├── play-creator.js        # SVG play diagrammer (~320 lines, animation, sharing)
│       ├── schedule.js            # Coach schedule + request submission
│       ├── reports.js             # 4-tab: attendance, game reports, player reports, evaluations
│       ├── messages.js            # Coach messaging (inbox, sent, compose)
│       ├── coach_knowledge.js     # Knowledge base upload/manage
│       ├── scouting.js            # Coach video room (upload, clips, telestrator, tags)
│       ├── player_dashboard.js    # Player welcome (streak, drills, leaderboard)
│       ├── player_drills.js       # Player drill assignments (filter, video upload)
│       ├── player_plays.js        # Player shared plays (mini previews, viewer modal)
│       ├── player_schedule.js     # Player calendar (read-only)
│       ├── player_leaderboard.js  # Team rankings
│       ├── player_scouting.js     # Player video feed (mobile-first, watched tracking)
│       ├── player_messages.js     # Player messaging
│       ├── parent_dashboard.js    # Parent welcome (child info, club contacts)
│       ├── parent_schedule.js     # Parent calendar (read-only)
│       ├── parent_payments.js     # Parent billing (view charges, mark paid)
│       ├── parent_carpool.js      # Carpool rides + standing carpools
│       ├── parent_scouting.js     # Parent video feed (shared clips)
│       ├── parent_messages.js     # Parent messaging
│       ├── admin_dashboard.js     # Admin overview (rich metrics, quick actions)
│       ├── admin_schedule.js      # Admin schedule (calendar, CRUD, recurring, away games)
│       ├── admin_teams.js         # Team management (invite codes, members, player profiles)
│       ├── admin_contacts.js      # Contacts directory
│       ├── admin_roles.js         # Role management
│       ├── admin_facilities.js    # Facility CRUD
│       ├── admin_billing.js       # Billing management (plans, charges, reminders)
│       ├── admin_knowledge.js     # Knowledge base (admin view)
│       ├── admin_insights.js      # AI insights dashboard
│       ├── admin_scouting.js      # Admin video room
│       ├── admin_coaches.js       # Coach engagement
│       ├── admin_player_development.js # Player development
│       ├── admin_transport.js     # Transportation management
│       ├── admin_transport_detail.js # Transport detail view
│       ├── admin_practice_plans.js # Admin practice plans oversight
│       ├── admin_player_profile.js # Admin player profile view
│       ├── admin_coach_profile.js  # Admin coach profile + engagement
│       ├── admin_support.js        # Admin support tickets
│       ├── player_profile_page.js  # Coach→Player profile (shared renderer)
│       ├── player-profile.js       # Shared player profile renderer
│       ├── i18n.js                 # i18n engine (t(), data-i18n, RTL/LTR, localStorage)
│       └── translations/           # 6 i18n modules (common, admin, coach, player, parent, auth)
│
├── database/
│   ├── hoops_ai.db                # Auto-created on startup (42 tables)
│   └── chroma/                    # ChromaDB vector store (persistent)
│
├── uploads/
│   ├── knowledge/                 # RAG document uploads (PDF/DOCX/TXT)
│   └── videos/                    # Drill proof video uploads
│
└── knowledge/
    └── base/                      # System-tier coaching documents for RAG seed
```

---

## Architecture Pattern

```
HTTP Request → FastAPI Router (api/) → Service (services/) → Repository (repositories/) → SQLAlchemy Model
                                     ↘ OpenAI Agent (agents/) ← ContextService (team data + RAG injection)
                                     ↘ Cloudinary (video hosting)
                                     ↘ ChromaDB (knowledge retrieval)
```

- **Routers:** Request validation (Pydantic), role-based auth guards
- **Services:** Business logic, AI prompt construction, orchestration, notifications
- **Repositories:** Generic CRUD via `BaseRepository<T>`, async sessions, selectinload patterns
- **Models:** SQLAlchemy 2.0 with `TimestampMixin`, relationships, `JSONText` custom type

---

## 13 AI Agents

### 8 Coach Agents

| # | Agent | Color | Focus | Data Access |
|---|-------|-------|-------|-------------|
| 1 | Assistant Coach | #f48c25 | Practice planning, team management | players, practices, events, game_reports |
| 2 | Team Manager | #60A5FA | Scheduling, logistics, facilities, billing, **all team data** | ALL domains |
| 3 | The Tactician | #F87171 | Game strategy, plays, X's & O's | plays, game_reports, players |
| 4 | Skills Coach | #34D399 | Drills, technique, skill development (13+) | drills, players, player_reports |
| 5 | Sports Nutritionist | #FBBF24 | Nutrition, diet, recovery | (none) |
| 6 | Strength & Conditioning | #A78BFA | Workouts, injury prevention | (none) |
| 7 | The Analyst | #2DD4BF | Statistics, performance data, billing analysis | game_reports, attendance, player_reports, players, events, billing |
| 8 | Youth Coach | #FB923C | Ages 5-12, fun-based development | players, drills |

**Routing:** Keyword matching in `base_agent.py` with **Hebrew + English** keywords. Fallback: Assistant Coach.

**Team Manager** is the primary data-aware agent — has access to ALL team data domains and is instructed to ONLY use real data, never hallucinate.

### 5 Player Agents

| # | Agent | Color | Focus | Data Access |
|---|-------|-------|-------|-------------|
| 1 | Shooting Coach | #F87171 | Shooting form, shot selection, range | reports, drills, schedule |
| 2 | Dribbling Coach | #60A5FA | Ball handling, crossovers, moves | reports, drills, schedule |
| 3 | Passing Coach | #A78BFA | Passing technique, court vision, playmaking | reports, drills, schedule |
| 4 | Fitness Coach | #34D399 | Strength, conditioning, agility, injury prevention | reports, attendance, drills, schedule |
| 5 | Nutritionist | #FBBF24 | Diet, hydration, recovery food, meal planning | schedule |

**Routing:** Keyword matching in `player_agent.py` with **Hebrew + English** keywords. Fallback: Shooting Coach.

---

## AI Chat ↔ Data Integration

### 3-Tier Context Injection (context_service.py / player_context_service.py)

**Tier 1: Team/Player Summary** (always present, ~200 tokens)
Compact snapshot injected into every system prompt via `asyncio.gather()`:
- Roster count + position breakdown
- Recent W-L record (last 10 games)
- Upcoming events (next 14 days, 8 shown)
- Facility names, drills/plays counts

**Tier 2: On-Demand Data** (keyword-triggered, 0-1500 tokens, budget cap: 6000 chars)

| Domain | Trigger Keywords (EN + HE) | Limit |
|--------|---------------------------|-------|
| players | player, roster, שחקן, הרכב | 25 players |
| events | schedule, game, next, מתי, משחק | 20 events (30 days) |
| facilities | gym, court, אולם, מגרש | all |
| drills | drill, תרגיל | 15 drills |
| plays | play, formation, משחקון | 10 plays |
| practices | practice plan, תוכנית אימון | 5 sessions |
| game_reports | result, score, תוצאה | 5 reports |
| attendance | attendance, נוכחות | all stats |
| player_reports | assessment, הערכה | latest period |
| billing | payment, billing, תשלום, חוב | overview |

**Tier 3: RAG Knowledge** (semantic search from ChromaDB, budget cap: 3000 chars)
- Queries ChromaDB with user message
- Filtered by agent-specific categories (from `rag_categories.py`)
- Relevance threshold: cosine distance < 0.8
- Formatted with source references + page numbers

### Flow
1. `chat_service.py` routes message to agent via keyword matching
2. `ContextService.build_context()` runs all 3 tiers in parallel via `asyncio.gather()`
3. Team summary + relevant data + RAG context formatted as text
4. `BaseAgent.system_prompt` appends all tiers after agent prompt
5. GPT-4o receives real data and is instructed to use it accurately

### Token Budget
- Agent prompt: ~300-500
- Team summary: ~150-300
- On-demand data: 0-1500 (budget cap: 6000 chars)
- RAG knowledge: 0-750 (budget cap: 3000 chars)
- Conversation history: ~2000-4000 (last 20 messages)
- Total max: ~9000 (well within 128K context)

---

## RAG Knowledge Base

### Architecture
- **3-tier scope:** System (global base) → Club (admin-uploaded) → Coach (personal)
- **Vector DB:** ChromaDB PersistentClient at `database/chroma/`, collection "basketball_knowledge"
- **Embeddings:** OpenAI `text-embedding-3-small` (1536-dim)
- **Processing:** PDF/DOCX/TXT → paragraph-aware chunking (~500 tokens, 50 overlap) → embed → store

### 16 Categories
general, drills, tactics, offense, defense, shooting, ball_handling, passing, conditioning, nutrition, youth, player_development, game_management, analytics, psychology, team_building

### Agent Category Mapping (`rag_categories.py`)
Each agent can only search categories relevant to its domain (e.g., tactician → tactics, offense, defense).

### Files
- `src/services/rag/` — rag_service, embedding_service, vector_store, document_processor
- `src/api/knowledge.py` — dual-auth (admin+coach), upload/list/delete/retry/preview/download
- `src/models/knowledge_document.py` — scope, category, status, chunk_count
- `seed_knowledge.py` — processes `knowledge/base/*.pdf|txt|docx` as system-tier

### Integration Points
- AI chat context (Tier 3 in context_service.py / player_context_service.py)
- AI content generation (drills, plays, practice plans enriched with RAG before GPT prompt)

---

## Reports & Evaluations System

### Reports (3 types)
- **Attendance** (`attendances` table): coach_id, event_id, player_id, present, notes. UniqueConstraint(event_id, player_id). Streak tracking (current + highest).
- **GameReport** (`game_reports` table): date, opponent, result, score, standout_players (JSON), areas_to_improve (JSON), team_event_id FK
- **PlayerReport** (`player_reports` table): player_id, period ("2026-H1"), strengths/weaknesses/focus_areas (JSON), AI-generated flag

### Evaluations (structured assessment)
- **PlayerEvaluation** (`player_evaluations` table): 9 rating categories (1-10 scale):
  - offensive, defensive, basketball_iq, social, leadership, work_ethic, fitness, improvement, leaving_risk
  - Each with rating + notes
  - Period types: weekly, monthly, semi_annual, annual
- **ReportRequest** (`report_requests` table): admin → coach evaluation request with due date

### Frontend
**4-tab reports page (reports.html + reports.js):**
- Attendance Tab: event select → player grid → save. Stats with color-coded % bars
- Game Reports Tab: cards with create/edit modal. Pending games banner
- Player Reports Tab: player select → reports. AI generate button
- Evaluations Tab: 9-slider modal, admin request tracking

---

## Video Room & Scouting

### Architecture
- **Cloudinary integration:** Direct browser→cloud upload, adaptive HLS streaming, CDN delivery, auto-thumbnails
- **8 DB tables:** scouting_videos, video_clips, clip_player_tags, video_annotations, clip_views, team_storage_quotas, annotation_templates, clip_playlists + playlist_items

### Features
- **Coach Video Room** (`/scouting`): Video grid, analysis view with Video.js, 13 basketball action tag buttons, timeline with markers, clips sidebar
- **Interactive Telestrator:** Canvas overlay on Video.js, freehand/arrow/circle/text/spotlight tools, auto-pause on draw, JSON stroke persistence (% coords), fade in/out rendering
- **Player Video Feed** (`/player/scouting`): Mobile-first clip cards, lazy loading, read-only telestrator, "Watched" confirmation
- **Parent Video Feed** (`/parent/scouting`): Shared clips only, read-only view
- **Admin Video View** (`/admin/scouting`): Cross-team video overview
- **Storage Quota:** 50GB default per team, configurable TTL, background cleanup task
- **Annotation Templates:** Reusable telestrator drawing presets per coach (name, category, annotations_data JSON)
- **Clip Playlists:** Organize clips into named collections with sort order, notes, team/parent sharing flags
- **Notifications:** Players notified when tagged in clips via messaging

### Files
- `src/services/cloudinary_service.py`, `scouting_service.py`
- `src/repositories/scouting_repository.py` (5 repository classes)
- `src/api/scouting.py` (30+ endpoints across 4 roles)
- `static/js/scouting.js`, `player_scouting.js`, `parent_scouting.js`, `admin_scouting.js`

---

## Billing & Payments

### Architecture
- **Player-centric:** charges linked to player_id, NOT parent
- Both parents see same charges via TeamMember → player_id
- When one parent pays → other parent sees "paid" automatically

### Models
- **PaymentPlan** (`payment_plans`): season, total_amount, num_installments (8-12), billing_day, start_month
- **Installment** (`installments`): plan_id, player_id, installment_number, amount, due_date, status
- **OneTimeCharge** (`one_time_charges`): player_id, title, amount, due_date, status

### Features
- Admin: create plans (auto-generates installments for all team players), one-time charges, confirm payments, send reminders
- Parent: view charges via `/api/billing/my`, mark as paid
- Background task: auto-mark overdue (runs hourly)
- Reminder messages via MessagingService

### Files
- `src/models/payment_plan.py`, `installment.py`, `one_time_charge.py`
- `src/repositories/billing_repository.py` (3 repository classes)
- `src/services/billing_service.py`
- `src/api/billing.py`
- `static/js/admin_billing.js`, `parent_payments.js`

---

## Universal Messaging

### Architecture
- `ClubMessage` model: sender, subject, body, message_type, target_type, scheduled support
- `MessageRecipient` model: per-user read tracking

### Target Types
all_club, all_coaches, all_players, all_parents, team, team_players, team_parents, team_coaches, my_team, my_coach, individual, admin, admin_individual

### Features
- Role-aware permission validation
- Scheduled message support (background task processes every 60s)
- Unread count in navigation badge
- Used internally by: report_service (parent notifications), scouting_service (player tags), billing_service (reminders), schedule_service (transport changes), evaluation_service (parent progress), game report reminders

---

## Carpool Coordination

### Event-Based Rides (`carpool_rides` + `carpool_passengers`)
- Parent offers ride: team, event, neighborhood, seats (1-8), departure time, direction (to/from/both)
- Other parents join rides
- Seat availability tracking

### Standing Carpools (`standing_carpools` + members + signups)
- Recurring carpool groups: name, neighborhood, max_members, meeting_point
- Members join/leave
- Per-event signups within standing carpool

### Files
- `src/services/carpool_service.py`, `standing_carpool_service.py`
- `src/api/carpool.py`
- `static/js/parent_carpool.js`

---

## Internationalization (i18n)

### Architecture
- **Engine:** `static/js/i18n.js` — client-side, no server dependency
- **Language toggle:** Header button, stored in `localStorage('hoops_language')`, default Hebrew
- **RTL/LTR:** Auto-switches `dir` attribute on `<html>` based on language
- **Translation function:** `t(key, params)` with `{param}` interpolation
- **DOM attributes:** `data-i18n`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-html`
- **Registration:** `I18N.register({ he: {...}, en: {...} })` per module

### 6 Translation Modules (`static/js/translations/`)
| Module | Scope |
|--------|-------|
| `common.js` | Sidebar nav, buttons, roles, positions, time strings, payment statuses |
| `admin.js` | All admin pages (dashboard, billing, contacts, knowledge, scouting, support, etc.) |
| `coach.js` | Coach portal strings |
| `player.js` | Player portal strings |
| `parent.js` | Parent portal strings |
| `auth.js` | Login/register pages |

### Loading Order
Translation files MUST load BEFORE page-specific JS in templates (loaded in base layouts).

---

## Support Ticket System

- Admin creates/views tickets at `/admin/support`
- Categories: general, billing, technical, feature_request, account, bug_report, onboarding
- Priority levels: low, medium, high, urgent
- Status flow: open → in_progress → waiting_on_club → resolved → closed
- Super-admin manages tickets via `/super-admin/tickets` (3-level support)
- Full Hebrew localization with `data-i18n` attributes

### Files
- `src/api/support.py` — Admin ticket CRUD + reply
- `src/api/super_admin_tickets.py` — Super-admin ticket management
- `static/js/admin_support.js` — Admin frontend
- `templates/pages/admin_support.html` — Admin template

---

## AI Insights (Admin)

### Financial Agent
- Hebrew-speaking financial analyst
- Dashboard insights from billing data
- Weekly report generation (via background task)
- Free-form Q&A chat
- Send payment reminders to overdue parents

### Professional Agent
- Hebrew-speaking sports analyst
- Dashboard insights from team/player metrics
- Weekly report generation (via background task)
- Player analysis cards (comprehensive AI summary)
- Attendance alerts for low-attendance players

### Data Collector
- `InsightDataCollector` aggregates data from multiple sources
- Financial snapshot: per-team charged/paid/pending/overdue/collection_rate
- Professional snapshot: per-team player_count/attendance_rate/report_count/game_record

---

## Coach Engagement Analytics

### 5-Category Scoring (0-100 overall)
| Category | Metrics |
|----------|---------|
| Reports | evaluations, game_reports, player_reports |
| Communication | messages sent, drill assignments, conversations |
| Training | drills created, plays created, practice sessions |
| Attendance | ratio of events with attendance recorded |
| AI Usage | conversations + AI-generated content |

- 90-day activity window
- `pow(0.7)` curve for reward distribution
- Per-coach activity timeline

---

## Drill Assignment & Tracking

### Flow
1. Coach creates/generates drill
2. Coach assigns drill to selected players (with optional note)
3. Players see assigned drills in their portal
4. Player uploads video proof (max 15MB)
5. Coach reviews: approve (completed) or reject (try again) with feedback
6. Player notified of review result

### Models
- `DrillAssignment` (`drill_assignments`): drill_id, player_id, status (pending/video_uploaded/approved/rejected), video_url, coach_feedback

---

## Schedule System

### Admin-Managed Team Events (`team_events` table)
- Single or recurring (repeat_weeks up to 52)
- Away game support: is_away, departure_time, venue_address
- Facility FK (optional)
- Soft-delete via is_active flag

### Coach Schedule Requests (`schedule_requests` table)
- Coach submits → Admin reviews → Approve (creates TeamEvent) or Reject (with response)
- Approval workflow: `POST /api/schedule-requests` → `GET /pending` → `PUT /{id}/approve|reject`

### Transport Notifications
- When admin updates transport info (away game details), MessagingService notifies team members

---

## Play Creator (play-creator.js)

The most complex frontend component (~320 lines, dense).

### State
- `players[]` - current positions, `initPlayers[]` - starting positions
- `actions[]` - timeline of moves (t, pid, sx/sy/ex/ey, optional cx/cy bezier)
- `actTime` - next action timestamp, `parallelMode` + `parallelStart`
- `mode` - 'edit' or 'play', `progress` - animation timestamp

### Templates
- **Offense:** empty, 5-out, 4-out-1-in, horns, box, 1-4-high
- **Defense:** none, man, 2-3 zone, 3-2 zone

### Actions
- pass (dashed, ball transfer), dribble (dotted, ball+move), cut (solid, move only)
- screen (perpendicular line at endpoint), handoff (ball transfer), shot (dashed + arc)

### Animation System
- Actions have timestamp `t`, duration 1.2s each
- `_ppos(player)` - player position at current `progress`
- `_bpos()` - ball position (follows holder, interpolates on pass/dribble)
- Easing: `t<0.5 ? 2t² : 1-(-2t+2)²/2` (ease-in-out)
- Bezier interpolation via `_bez()` for curved paths

### Sharing
- Coach can share plays with team players (shared_with_team + team_id on Play model)
- PlayViewer (`play-viewer.js`) — standalone read-only renderer with animation
- Player Plays page (`/player/plays`) — grid of shared plays with mini previews

---

## Permission System (5 Roles)

```
Super-Admin (platform-wide)
  ├── Multi-club management, platform billing & invoicing, analytics
  ├── Support ticket system (3-level), feature toggles, system notifications
  │
  └── Admin (role="admin" in users table)
        ├── Creates teams (POST /api/teams)
        ├── Generates invite codes: coach, player, parent (3 pairs: code + token)
        ├── Manages: schedule, roles, contacts, facilities, billing, knowledge, scouting, insights
        ├── Practice plans oversight, coach/player profiles, support tickets
        │
        └── Coach (role="coach") — joins via coach_invite_code
              ├── AI chat (8 agents), drills (assign+track), plays (create+share), practice + summaries, reports, evaluations
              ├── Video scouting (clips, telestrator, annotation templates, clip playlists, player tagging)
              ├── Knowledge base (upload personal docs), messaging
              │
              ├── Player (role="player") — joins via player_invite_code
              │     └── AI chat (5 agents), drills (video proof), plays (view), schedule, reports, leaderboard, video feed, messaging
              │
              └── Parent (role="parent") — joins via parent_invite_code
                    └── Dashboard, schedule, payments, video feed, messaging, carpool
```

### Auth Flow (5 Separate Flows)

| Role | Register | Login | Token Key | Auth Guard |
|------|----------|-------|-----------|------------|
| Super-Admin | `POST /api/super-admin/auth/register` | `POST /api/super-admin/auth/login` | `hoops_super_admin_token` | `get_current_super_admin` |
| Admin | `POST /api/admin-auth/register` | `POST /api/admin-auth/login` | `hoops_admin_token` | `get_current_admin` |
| Coach | `POST /api/auth/register` | `POST /api/auth/login` | `hoops_token` | `get_current_coach` |
| Player | `POST /api/player-auth/register` | `POST /api/player-auth/login` | `hoops_player_token` | `get_current_player` |
| Parent | `POST /api/parent-auth/register` | `POST /api/parent-auth/login` | `hoops_parent_token` | `get_current_parent` |

Additional guards:
- `get_current_user_any_role` — decodes JWT regardless of role (schedule `/my`, messaging)
- `get_current_uploader` — accepts admin or coach tokens (knowledge base)
- `get_messaging_user` — universal messaging auth

### Invite Code Flow
1. Admin creates team → auto-generates 3 invite code pairs (coach/player/parent)
2. Admin sends coach invite link (`/join/coach/{token}`) → dedicated registration form
3. Coach registers (register-with-invite: one-step register + join team)
4. Coach gives player invite link (`/join/player/{token}`) to players
5. Coach gives parent invite link (`/join/parent/{token}`) to parents
6. Players/parents register using invite code (6-char uppercase) or invite link

---

## Background Tasks (6 concurrent, started at lifespan)

| Task | Interval | Purpose |
|------|----------|---------|
| `_process_scheduled_messages` | 60s | Send pending scheduled club messages |
| `_billing_background` | 1h | Mark past-due installments/charges as overdue |
| `_insights_background` | Daily 9AM / Weekly Sun 8AM | Payment reminders, weekly financial+professional reports, attendance alerts |
| `_game_report_reminders` | 6h | Remind coaches about unreported games (Hebrew message) |
| `_scouting_video_cleanup` | 6h | Delete TTL-expired videos from Cloudinary + DB |
| `_scouting_expiry_notifications` | 2h | Send 48h/6h video expiry warnings to coaches |

---

## Design System (variables.css)

| Token | Coach | Admin | Player | Parent |
|-------|-------|-------|--------|--------|
| Primary | #f48c25 (orange) | #3b82f6 (blue) | #22c55e (green) | #3b82f6 (blue) |
| Background | #181411 | #0b0f1a | #050808 | #f1f5f9 |
| Surface | #1e1914 / #221d17 | #111827 / #1e293b | #0a120e / #0f1a14 | #ffffff / #f8fafc |
| Text | #ffffff / #baab9c | #f1f5f9 / #94a3b8 | #f0fdf4 / #bbf7d0 | #1e293b / #475569 |
| Font | Space Grotesk | | | |
| Spacing | 8-step scale (--sp-1 to --sp-12) | | | |

---

## Running

```bash
pip install -r requirements.txt
# Set OPENAI_API_KEY in .env
python app.py
# → http://localhost:8000
```

---

## Gotchas

- `config.py` uses `@lru_cache` on `get_settings()` — cached forever per process
- `openai_client.py` uses lazy `_get_client()` — fixed from module-level init
- `.env` changes do NOT trigger uvicorn reload — must kill all Python processes manually
- Server `reload=True` — kill ALL python processes when restarting
- SQLite timestamps lack 'Z' — `timeAgo()` appends it for UTC parsing
- SQLite + aiosqlite: use `JSONText` (custom TypeDecorator), NOT `JSON` column type
- Async SQLAlchemy: ALWAYS use `selectinload()` for relationships — lazy loading crashes with `MissingGreenlet`
- `__pycache__` can serve stale bytecode — CRITICAL: kill ALL python processes + clean pycache when debugging "impossible" errors
- **SQLAlchemy `func.case()` vs `case()`** — Always use `from sqlalchemy import case` directly
- Agent routing keywords must include **Hebrew** terms — English-only causes fallback to default agent
- **DB schema changes** require deleting `database/hoops_ai.db` — `init_db()` recreates all tables
- **5 separate localStorage token keys** — `hoops_token`, `hoops_player_token`, `hoops_admin_token`, `hoops_parent_token`, `hoops_super_admin_token`
- **`auth_service.py`** exports standalone functions used by all 4 auth services
- **Coach legacy table** — coaches table exists alongside users table; Coach.user_id links to User
- **Player registration** links to existing roster Player by name match or creates new
- **Parent email matching** — `parent_auth_service._find_child_by_email()` checks Player.parent_email, Player.email, User email
- **main.js `requireAuth()`** whitelists `/login`, `/register`, and `/join/*` — add new public pages here
- **RAG failure = silent None** — never breaks chat flow
- **Cloudinary lazy init** — only configured if CLOUDINARY_CLOUD_NAME exists in .env
- **ChromaDB singleton** — `_get_chroma()` creates PersistentClient once, reused globally
- **i18n translation files** must load BEFORE page JS — order matters in base layouts
- **`t()` function** is global shorthand for `I18N.translate()` — available in all JS files after i18n.js loads
- **RTL numbers/percentages** — wrap in `<span dir="ltr">` or prepend `\u200E` (LTR mark)
- **timeAgo functions** — duplicated across 13+ JS files, each file has its own version; admin versions use `t()` keys, others still hardcoded English
- **Billing `total_expected`** — calculated from actual installment amounts (not `plan.total_amount`) to avoid rounding mismatches
