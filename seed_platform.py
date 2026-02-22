"""
HOOPS AI - Platform Seed Script
Creates Super Admin + 3 registered clubs for platform-level testing.

Club 1: מכבי הוד השרון (existing from seed_data.py)
Club 2: מכבי נוער נתניה (new - 3 teams)
Club 3: הפועל כוכבי הנגב (new - 2 teams)

Run AFTER seed_data.py:
  python seed_data.py
  python seed_platform.py

All passwords: 123456
Super Admin: super@hoops.ai / 123456
"""
import asyncio
import random
import uuid
import string
import json
from datetime import date, timedelta, datetime

random.seed(99)  # Different seed from seed_data.py to avoid name collisions

import bcrypt
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import logging
logging.disable(logging.CRITICAL)

import src.models  # noqa: register all models

from src.utils.database import AsyncSessionLocal, init_db
from src.models.user import User
from src.models.coach import Coach
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.player import Player
from src.models.team_event import TeamEvent
from src.models.event import Event
from src.models.facility import Facility
from src.models.drill import Drill
from src.models.attendance import Attendance
from src.models.game_report import GameReport
from src.models.player_report import PlayerReport
from src.models.drill_assignment import DrillAssignment
from src.models.admin_role import AdminRole
from src.models.super_admin import SuperAdmin
from src.models.platform_club import PlatformClub, ClubRegistrationLink
from src.models.club_billing_config import ClubBillingConfig
from src.models.club_feature_flag import ClubFeatureFlag
from src.models.region import Region
from src.models.platform_invoice import PlatformInvoice, PlatformInvoiceLineItem
from src.models.payment_transaction import PlatformPaymentTransaction
from src.models.support_ticket import SupportTicket, TicketMessage
from src.models.platform_notification import PlatformNotification
from src.services.feature_flag_service import FeatureFlagService
from sqlalchemy import select, func

# ── Helpers ──────────────────────────────────────────────────────────
PASSWORD_HASH = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode("utf-8")

def gen_code(n=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def gen_uuid():
    return str(uuid.uuid4())

def gen_phone():
    prefix = random.choice(["050", "052", "053", "054", "058"])
    return f"{prefix}-{random.randint(1000000,9999999)}"

_TRANSLIT = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
    'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ל': 'l', 'מ': 'm', 'נ': 'n',
    'ס': 's', 'ע': 'a', 'פ': 'p', 'צ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh',
    'ת': 't', 'ם': 'm', 'ן': 'n', 'ף': 'f', 'ץ': 'tz', 'ך': 'kh',
    '״': '', "'": '', '"': '',
}

def _translit(name: str) -> str:
    result = []
    for ch in name:
        if ch in _TRANSLIT:
            result.append(_TRANSLIT[ch])
        elif ch.isascii() and ch.isalnum():
            result.append(ch.lower())
    return ''.join(result)

def gen_birth(min_age, max_age):
    today = date.today()
    age = random.randint(min_age, max_age)
    return today.replace(year=today.year - age) - timedelta(days=random.randint(0, 364))

POSITIONS = ["PG", "SG", "SF", "PF", "C"]

# ── Names for Clubs 2 & 3 (different pool from seed_data.py) ────────
FIRST_NAMES_POOL2 = [
    "אייל", "רותם", "שחף", "אלמוג", "עדן", "ליעד", "ליאב", "נהוראי",
    "אביתר", "ינון", "צליל", "הראל", "דביר", "יהלי", "אדיר", "סהר",
    "מאור", "ברק", "ארז", "בועז", "דקל", "לביא", "עוז", "צור",
    "שלו", "יואב", "גדעון", "ישי", "פלג", "זיו", "שילה", "נריה",
    "אופק", "יפתח", "חן", "סתיו", "הוד", "ינאי", "מישאל", "נתנאל",
    "קובי", "רם", "נעם", "שמעון", "אהרון", "יהונתן", "שגב", "אלעד",
]

FIRST_NAMES_POOL3 = [
    "תמיר", "שקד", "אביב", "ניצן", "אורן", "עילי", "אמיר", "שגיב",
    "רני", "אשר", "אלדד", "יואל", "מנשה", "שמשון", "אוריה", "ליאור",
    "אופיר", "גפן", "דולב", "יערי", "רועה", "אור", "חגי", "יגאל",
    "אלחנן", "שהם", "מגן", "סער", "גליל", "ים", "הלל", "אמוץ",
]

LAST_NAMES_2 = [
    "אביטל", "דיין", "נאמן", "ויצמן", "מגידו", "שושן", "אלמוג", "הר-ציון",
    "נווה", "ברנשטיין", "זהבי", "לבנון", "ירדן", "כרמל", "שגב", "ארבל",
    "דגן", "ערד", "בן-חיים", "ניסן", "עופר", "רימון", "גלעד", "אשכנזי",
]

LAST_NAMES_3 = [
    "נגבי", "הדרי", "ספיר", "ערבה", "תמר", "מצפה", "שדה", "גולן",
    "כנרת", "חרמון", "עצמון", "מעלה", "ברקת", "בשור", "ניצנה", "עומר",
]

FATHER_FIRST = ["אבי", "דוד", "יוסי", "משה", "חיים", "שמעון", "יעקב", "אהרון", "אלי", "רון",
                "מיכאל", "צבי", "ניסים", "שלמה", "יצחק", "בני", "רפי", "מנחם", "גדי", "ציון"]
MOTHER_FIRST = ["רחל", "שרה", "מיכל", "לימור", "ענת", "אורלי", "סיגל", "הילה", "דנה", "אפרת",
                "יעל", "נועה", "שירי", "טלי", "קרן", "אורית", "גלית", "ליאת", "אושרת", "מורן"]

OPPONENTS = [
    "הפועל תל אביב", "מכבי ראשון לציון", "הפועל חולון", "אליצור נתניה",
    "מכבי חיפה", "הפועל ירושלים", "עירוני נהריה", "מכבי אשדוד",
    "הפועל גליל עליון", "אליצור אשקלון", "מכבי רמת גן",
    "הפועל באר שבע", "מכבי קרית גת", "עירוני כפר סבא", "הפועל עפולה",
]

STRENGTHS = [
    "זריקת חוץ מדויקת", "מהירות רוחבית גבוהה", "IQ כדורסלי מעולה",
    "מנהיגות על המגרש", "יכולת כדרור יד שמאל", "סיום מקרוב מגוון",
    "ראיית מגרש", "מסירה מדויקה", "עמידות פיזית", "הגנה אישית חזקה",
]

WEAKNESSES = [
    "צריך לשפר זריקה מרחוק", "חוסר ביטחון בכדרור יד חלשה",
    "נטייה לטעויות תחת לחץ", "צריך לשפר תנועה ללא כדור",
    "הגנה על פיק אנד רול", "סיום בכפילות",
]

FOCUS_AREAS = [
    "שיפור זריקת 3 נקודות", "חיזוק שרירי ליבה", "תרגול כדרור תחת לחץ",
    "עבודה על מהירות תגובה", "שיפור סגירות הגנתיות", "פיתוח משחק פוסט",
]

DRILL_DATA = [
    ("3 on 2 Fast Break", "offense", "intermediate", 15, "שלושה נגד שניים בפאסט ברייק."),
    ("Shell Defense Drill", "defense", "intermediate", 15, "הגנת מעטפת - 4 נגד 4."),
    ("Mikan Drill", "shooting", "beginner", 10, "תרגיל ליי-אפ מהצד מתחלף."),
    ("3-Point Shooting Series", "shooting", "advanced", 15, "סדרת זריקות מ-5 עמדות."),
    ("Full Court Press Break", "offense", "advanced", 20, "שבירת לחץ מלא."),
    ("Ball Handling Circuit", "dribbling", "beginner", 10, "מעגל כדרורים."),
    ("Pick and Roll Drill", "offense", "intermediate", 15, "פיק אנד רול - 2 נגד 2."),
    ("Close-Out Drill", "defense", "beginner", 10, "סגירות על שחקן עם כדור."),
]


# ── Club creation helper ─────────────────────────────────────────────
async def create_club_with_data(
    db, club_name, domain, admin_name, admin_email, admin_phone, admin_dob,
    teams_config, coach_names, first_names, last_names, facilities_data,
    used_names,
):
    """Create a full club: admin + teams + coaches + players + parents + events + drills."""

    # Get existing admin role (created by seed_data.py)
    r = await db.execute(select(AdminRole).limit(1))
    existing_role = r.scalars().first()
    role_id = existing_role.id if existing_role else None

    # Admin user
    admin_user = User(
        name=admin_name,
        email=admin_email,
        password_hash=PASSWORD_HASH,
        role="admin",
        phone=admin_phone,
        date_of_birth=admin_dob,
        admin_role_id=role_id,
    )
    db.add(admin_user)
    await db.flush()

    # Facilities
    facilities = []
    for fname, ftype, addr, cap in facilities_data:
        f = Facility(admin_id=admin_user.id, name=fname, facility_type=ftype, address=addr, capacity=cap)
        db.add(f)
        facilities.append(f)
    await db.flush()

    all_coach_events = []
    total_players = 0
    total_parents = 0

    for ti, team_info in enumerate(teams_config):
        team = Team(
            name=team_info["name"],
            club_name=club_name,
            age_group=team_info["age_group"],
            level=team_info["level"],
            created_by_admin_id=admin_user.id,
            coach_invite_code=gen_code(),
            coach_invite_token=gen_uuid(),
            player_invite_code=gen_code(),
            player_invite_token=gen_uuid(),
            parent_invite_code=gen_code(),
            parent_invite_token=gen_uuid(),
        )
        db.add(team)
        await db.flush()

        # Coach
        coach_name, coach_email = coach_names[ti]
        coach_user = User(
            name=coach_name, email=coach_email, password_hash=PASSWORD_HASH,
            role="coach", phone=gen_phone(), date_of_birth=gen_birth(30, 55),
        )
        db.add(coach_user)
        await db.flush()

        coach = Coach(
            name=coach_name, email=coach_email, password_hash=PASSWORD_HASH,
            team_name=team_info["name"], age_group=team_info["age_group"],
            level=team_info["level"], user_id=coach_user.id,
        )
        db.add(coach)
        await db.flush()

        db.add(TeamMember(team_id=team.id, user_id=coach_user.id, role_in_team="coach"))
        await db.flush()

        # Players
        min_age, max_age = team_info["age_range"]
        team_players = []
        for pi in range(team_info["num_players"]):
            while True:
                fn = random.choice(first_names)
                ln = random.choice(last_names)
                full = f"{fn} {ln}"
                if full not in used_names:
                    used_names.add(full)
                    break

            jersey = pi + 1
            pos = POSITIONS[pi % 5]
            bdate = gen_birth(min_age, max_age)
            player_email = f"{_translit(fn)}.{_translit(ln)}.{domain}{ti}@player.hoops"
            parent_email = f"{_translit(ln)}.fam.{domain}{ti}{pi}@parents.hoops"

            height_base = {(16,18): 175, (14,16): 168, (12,14): 158, (10,12): 145, (8,10): 132, (6,8): 118}
            h = height_base.get(team_info["age_range"], 160) + random.randint(-8, 12)

            player = Player(
                coach_id=coach.id, name=full, jersey_number=jersey, position=pos,
                birth_date=bdate, height=h, weight=round(h * 0.38 + random.uniform(-5, 8), 1),
                gender="male", phone=gen_phone() if min_age >= 12 else None,
                email=player_email if min_age >= 12 else None,
                parent_phone=gen_phone(), parent_email=parent_email,
            )
            db.add(player)
            await db.flush()

            player_user = User(
                name=full, email=player_email, password_hash=PASSWORD_HASH,
                role="player", phone=player.phone, date_of_birth=bdate,
            )
            db.add(player_user)
            await db.flush()
            player.user_id = player_user.id
            await db.flush()

            db.add(TeamMember(team_id=team.id, user_id=player_user.id, role_in_team="player", player_id=player.id))

            # Parents (father + mother)
            father_name = f"{random.choice(FATHER_FIRST)} {ln}"
            mother_name = f"{random.choice(MOTHER_FIRST)} {ln}"
            for pname, suffix in [(father_name, "dad"), (mother_name, "mom")]:
                p_email = f"{_translit(ln)}.{suffix}.{domain}{ti}{pi}@parents.hoops"
                parent_user = User(
                    name=pname, email=p_email, password_hash=PASSWORD_HASH,
                    role="parent", phone=gen_phone(), date_of_birth=gen_birth(35, 55),
                )
                db.add(parent_user)
                await db.flush()
                db.add(TeamMember(team_id=team.id, user_id=parent_user.id, role_in_team="parent", player_id=player.id))
                total_parents += 1

            team_players.append(player)
            total_players += 1

        await db.flush()

        # Team Events - past practices (6 weeks)
        today = date.today()
        for w in range(6, 0, -1):
            for day_offset in [1, 3]:
                ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                if ev_date >= today:
                    continue
                ev = TeamEvent(
                    team_id=team.id, created_by_admin_id=admin_user.id,
                    title=f"אימון {team_info['name']}", event_type="practice",
                    date=ev_date,
                    time_start="18:00" if min_age <= 12 else "19:30",
                    time_end="19:30" if min_age <= 12 else "21:00",
                    location=facilities[0].name, facility_id=facilities[0].id,
                )
                db.add(ev)

        # Future practices (3 weeks)
        for w in range(3):
            for day_offset in [1, 3]:
                ev_date = today + timedelta(weeks=w) + timedelta(days=day_offset)
                db.add(TeamEvent(
                    team_id=team.id, created_by_admin_id=admin_user.id,
                    title=f"אימון {team_info['name']}", event_type="practice",
                    date=ev_date,
                    time_start="18:00" if min_age <= 12 else "19:30",
                    time_end="19:30" if min_age <= 12 else "21:00",
                    location=facilities[0].name, facility_id=facilities[0].id,
                ))

        # Past games (3)
        for g in range(3):
            g_date = today - timedelta(weeks=random.randint(1, 6), days=random.choice([5, 6]))
            opponent = random.choice(OPPONENTS)
            db.add(TeamEvent(
                team_id=team.id, created_by_admin_id=admin_user.id,
                title=f"משחק vs {opponent}", event_type="game", date=g_date,
                time_start="20:00", time_end="21:30",
                location=facilities[0].name, opponent=opponent,
            ))

        await db.flush()

        # Coach events (for attendance)
        for w in range(6, 0, -1):
            for day_offset in [1, 3]:
                ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                if ev_date >= today:
                    continue
                cev = Event(
                    coach_id=coach.id, date=ev_date,
                    time="18:00" if min_age <= 12 else "19:30",
                    event_type="practice", title=f"אימון {team_info['name']}",
                    facility_id=facilities[0].id,
                )
                db.add(cev)
                all_coach_events.append((cev, coach, team_players))

        await db.flush()

        # Drills
        drill_subset = random.sample(DRILL_DATA, min(6, len(DRILL_DATA)))
        for title, cat, diff, dur, desc in drill_subset:
            drill = Drill(
                coach_id=coach.id, title=title, description=desc,
                category=cat, difficulty=diff, duration_minutes=dur,
                instructions=desc, tags=json.dumps([cat, diff]),
            )
            db.add(drill)
        await db.flush()

        # Game Reports (3)
        for _ in range(3):
            g_date = today - timedelta(weeks=random.randint(1, 6), days=random.choice([5, 6]))
            opponent = random.choice(OPPONENTS)
            result = random.choices(["win", "loss", "draw"], weights=[45, 40, 15])[0]
            score_us = random.randint(55, 95)
            score_them = score_us - random.randint(3, 20) if result == "win" else score_us + random.randint(3, 20) if result == "loss" else score_us
            standouts = [p.name for p in random.sample(team_players, min(2, len(team_players)))]
            db.add(GameReport(
                coach_id=coach.id, date=g_date, opponent=opponent,
                location=facilities[0].name, result=result,
                score_us=score_us, score_them=score_them,
                standout_players=json.dumps(standouts),
                areas_to_improve=json.dumps(["הגנה", "ריבאונד"]),
                notes="משחק טוב.",
            ))

        # Player Reports (~50%)
        for player in team_players:
            if random.random() > 0.5:
                continue
            db.add(PlayerReport(
                coach_id=coach.id, player_id=player.id, period="2025-H2",
                strengths=json.dumps(random.sample(STRENGTHS, 3)),
                weaknesses=json.dumps(random.sample(WEAKNESSES, 2)),
                focus_areas=json.dumps(random.sample(FOCUS_AREAS, 2)),
                progress_notes=f"{player.name} מראה שיפור.",
                is_ai_generated=random.choice([True, False]),
            ))

        await db.flush()
        print(f"   Team '{team_info['name']}': coach={coach_name}, {len(team_players)} players")

    # Attendance
    att_count = 0
    for ev, coach_obj, players_list in all_coach_events:
        for player in players_list:
            present = random.random() < 0.78
            db.add(Attendance(
                coach_id=coach_obj.id, event_id=ev.id, player_id=player.id,
                present=present, notes="חולה" if not present and random.random() < 0.3 else None,
            ))
            att_count += 1
    await db.flush()

    return admin_user, total_players, total_parents, att_count


# ── Main ─────────────────────────────────────────────────────────────
async def main():
    await init_db()
    async with AsyncSessionLocal() as db:

        # ════════════════════════════════════════════════════════════
        # 1. SUPER ADMIN
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(SuperAdmin).where(SuperAdmin.email == "super@hoops.ai"))
        super_admin = r.scalars().first()
        if not super_admin:
            super_admin = SuperAdmin(
                name="שרון לוי",
                email="super@hoops.ai",
                password_hash=PASSWORD_HASH,
                phone="050-9999999",
                is_active=True,
            )
            db.add(super_admin)
            await db.flush()
            print(f"[OK] Super Admin: super@hoops.ai (id={super_admin.id})")
        else:
            print(f"[OK] Super Admin already exists (id={super_admin.id})")

        # ════════════════════════════════════════════════════════════
        # 2. REGIONS
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(func.count(Region.id)))
        if (r.scalar() or 0) == 0:
            israel = Region(name="ישראל", country="Israel", level="country")
            db.add(israel)
            await db.flush()

            # Districts
            central = Region(name="מחוז מרכז", country="Israel", level="state", parent_region_id=israel.id)
            north = Region(name="מחוז צפון", country="Israel", level="state", parent_region_id=israel.id)
            south = Region(name="מחוז דרום", country="Israel", level="state", parent_region_id=israel.id)
            dan = Region(name="מחוז דן", country="Israel", level="state", parent_region_id=israel.id)
            jerusalem = Region(name="מחוז ירושלים", country="Israel", level="state", parent_region_id=israel.id)
            for reg in [central, north, south, dan, jerusalem]:
                db.add(reg)
            await db.flush()

            # Areas
            areas = [
                ("הוד השרון - כפר סבא", central.id),
                ("נתניה - השרון", central.id),
                ("פתח תקווה - ראש העין", central.id),
                ("חיפה - קריות", north.id),
                ("עפולה - עמק יזרעאל", north.id),
                ("באר שבע - הנגב", south.id),
                ("אשדוד - אשקלון", south.id),
                ("תל אביב", dan.id),
                ("רמת גן - גבעתיים", dan.id),
                ("ירושלים", jerusalem.id),
            ]
            region_map = {}
            for area_name, parent_id in areas:
                area = Region(name=area_name, country="Israel", level="area", parent_region_id=parent_id)
                db.add(area)
                region_map[area_name] = area
            await db.flush()
            # Store IDs for later use
            for name, area in region_map.items():
                region_map[name] = area
            print(f"[OK] Regions: 1 country, 5 districts, {len(areas)} areas")
        else:
            print("[OK] Regions already exist")
            # Load region map for later use
            r = await db.execute(select(Region).where(Region.level == "area"))
            region_map = {reg.name: reg for reg in r.scalars().all()}

        # ════════════════════════════════════════════════════════════
        # 3. CLUB 1: מכבי הוד השרון (existing from seed_data.py)
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(PlatformClub).where(PlatformClub.name == "מכבי הוד השרון"))
        club1 = r.scalars().first()

        if not club1:
            # Find existing admin (try both possible emails)
            r = await db.execute(select(User).where(User.email == "ohadc55@gmail.com", User.role == "admin"))
            admin1 = r.scalars().first()
            if not admin1:
                r = await db.execute(select(User).where(User.email == "admin@hoops.club", User.role == "admin"))
                admin1 = r.scalars().first()
            if not admin1:
                print("[ERROR] Run seed_data.py first! No admin found.")
                return

            hod_hasharon = region_map.get("הוד השרון - כפר סבא")
            club1 = PlatformClub(
                name="מכבי הוד השרון",
                status="active",
                region_id=hod_hasharon.id if hod_hasharon else None,
                pricing_tier=2,
                max_players=250,
                storage_quota_video_gb=30,
                storage_quota_media_gb=2,
                admin_id=admin1.id,
                billing_email=admin1.email,
                notes="מועדון ותיק עם 6 קבוצות גיל. פעיל מאוד ב-AI וב-scouting.",
            )
            db.add(club1)
            await db.flush()

            # Billing config
            db.add(ClubBillingConfig(
                club_id=club1.id, billing_email=admin1.email,
                billing_day=1, next_billing_date=date(2026, 3, 1),
                is_recurring_active=True,
            ))

            # Feature flags (all enabled)
            ff = FeatureFlagService(db)
            await ff.initialize_default_flags(club1.id)

            # Registration link
            db.add(ClubRegistrationLink(
                club_id=club1.id, token=gen_uuid(),
                expires_at=datetime.now() + timedelta(days=30), is_active=True,
            ))
            await db.flush()

            r = await db.execute(
                select(func.count(TeamMember.id))
                .join(Team, TeamMember.team_id == Team.id)
                .where(Team.created_by_admin_id == admin1.id, TeamMember.role_in_team == "player")
            )
            player_count = r.scalar() or 0
            print(f"[OK] Club 1: Maccabi Hod Hasharon (id={club1.id}, {player_count} players, tier=2)")
        else:
            print(f"[OK] Club 1 already exists: Maccabi Hod Hasharon (id={club1.id})")

        # ════════════════════════════════════════════════════════════
        # 4. CLUB 2: מכבי נוער נתניה (new - 3 teams)
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(PlatformClub).where(PlatformClub.name == "מכבי נוער נתניה"))
        club2 = r.scalars().first()

        if not club2:
            print("\n-- Creating Club 2: maccabi netanya --")
            used_names = set()
            admin2, players2, parents2, att2 = await create_club_with_data(
                db,
                club_name="מכבי נוער נתניה",
                domain="maccabi",
                admin_name="רן אברהמי",
                admin_email="admin@maccabi-netanya.club",
                admin_phone="052-8887777",
                admin_dob=date(1978, 7, 22),
                teams_config=[
                    {"name": "נוער מכבי נתניה", "age_group": "U18", "level": "לאומית", "age_range": (16, 18), "num_players": 14},
                    {"name": "נערים א' מכבי נתניה", "age_group": "U16", "level": "ארצית", "age_range": (14, 16), "num_players": 13},
                    {"name": "ילדים א' מכבי נתניה", "age_group": "U12", "level": "מחוזית", "age_range": (10, 12), "num_players": 12},
                ],
                coach_names=[
                    ("אמיר שגב", "amir.segev@maccabi-netanya.club"),
                    ("עידן גולד", "idan.gold@maccabi-netanya.club"),
                    ("בנימין אשכנזי", "benny.ashkenazi@maccabi-netanya.club"),
                ],
                first_names=FIRST_NAMES_POOL2,
                last_names=LAST_NAMES_2,
                facilities_data=[
                    ("היכל הספורט נתניה", "gym", "רחוב הרצל 50, נתניה", 800),
                    ("אולם צמוד", "gym", "רחוב הרצל 52, נתניה", 200),
                ],
                used_names=used_names,
            )

            netanya = region_map.get("נתניה - השרון")
            club2 = PlatformClub(
                name="מכבי נוער נתניה",
                status="active",
                region_id=netanya.id if netanya else None,
                pricing_tier=3,
                max_players=350,
                storage_quota_video_gb=40,
                storage_quota_media_gb=3,
                admin_id=admin2.id,
                billing_email=admin2.email,
                notes="מועדון צומח עם תוכנית פיתוח שחקנים מתקדמת.",
            )
            db.add(club2)
            await db.flush()

            db.add(ClubBillingConfig(
                club_id=club2.id, billing_email=admin2.email,
                billing_day=15, next_billing_date=date(2026, 3, 15),
                is_recurring_active=True,
            ))
            ff = FeatureFlagService(db)
            await ff.initialize_default_flags(club2.id)

            db.add(ClubRegistrationLink(
                club_id=club2.id, token=gen_uuid(),
                expires_at=datetime.now() + timedelta(days=30), is_active=True,
            ))
            await db.flush()
            print(f"[OK] Club 2: Maccabi Netanya Youth (id={club2.id}, {players2} players, {parents2} parents, {att2} attendance, tier=3)")
        else:
            print(f"[OK] Club 2 already exists: Maccabi Netanya Youth (id={club2.id})")

        # ════════════════════════════════════════════════════════════
        # 5. CLUB 3: הפועל כוכבי הנגב (new - 2 teams, smaller)
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(PlatformClub).where(PlatformClub.name == "הפועל כוכבי הנגב"))
        club3 = r.scalars().first()

        if not club3:
            print("\n-- Creating Club 3: hapoel negev --")
            used_names3 = set()
            admin3, players3, parents3, att3 = await create_club_with_data(
                db,
                club_name="הפועל כוכבי הנגב",
                domain="hapoel",
                admin_name="מוטי בן-דוד",
                admin_email="admin@hapoel-negev.club",
                admin_phone="054-3332222",
                admin_dob=date(1982, 11, 5),
                teams_config=[
                    {"name": "נוער הפועל נגב", "age_group": "U18", "level": "ארצית", "age_range": (16, 18), "num_players": 12},
                    {"name": "נערים א' הפועל נגב", "age_group": "U14", "level": "מחוזית", "age_range": (12, 14), "num_players": 11},
                ],
                coach_names=[
                    ("יגאל צור", "yigal.tzur@hapoel-negev.club"),
                    ("אסף ברק", "asaf.barak@hapoel-negev.club"),
                ],
                first_names=FIRST_NAMES_POOL3,
                last_names=LAST_NAMES_3,
                facilities_data=[
                    ("אולם הספורט באר שבע", "gym", "שד' רגר 10, באר שבע", 600),
                ],
                used_names=used_names3,
            )

            beer_sheva = region_map.get("באר שבע - הנגב")
            club3 = PlatformClub(
                name="הפועל כוכבי הנגב",
                status="active",
                region_id=beer_sheva.id if beer_sheva else None,
                pricing_tier=1,
                max_players=150,
                storage_quota_video_gb=20,
                storage_quota_media_gb=1,
                admin_id=admin3.id,
                billing_email=admin3.email,
                notes="מועדון קהילתי בנגב. חדש בפלטפורמה.",
            )
            db.add(club3)
            await db.flush()

            db.add(ClubBillingConfig(
                club_id=club3.id, billing_email=admin3.email,
                billing_day=10, next_billing_date=date(2026, 3, 10),
                is_recurring_active=False,  # New club, not yet on recurring
            ))
            ff = FeatureFlagService(db)
            await ff.initialize_default_flags(club3.id)

            # Disable some features for basic tier
            await ff.set_flag(club3.id, "ai_insights", False)
            await ff.set_flag(club3.id, "video_room", False)
            await ff.set_flag(club3.id, "knowledge_base", False)

            db.add(ClubRegistrationLink(
                club_id=club3.id, token=gen_uuid(),
                expires_at=datetime.now() + timedelta(days=30), is_active=True,
            ))
            await db.flush()
            print(f"[OK] Club 3: Hapoel Negev Stars (id={club3.id}, {players3} players, {parents3} parents, {att3} attendance, tier=1)")
        else:
            print(f"[OK] Club 3 already exists: Hapoel Negev Stars (id={club3.id})")

        # ════════════════════════════════════════════════════════════
        # 6. INVOICES (past 3 months for each club)
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(func.count(PlatformInvoice.id)))
        if (r.scalar() or 0) == 0:
            TIER_PRICES = {1: 350, 2: 550, 3: 750, 4: 950}
            invoice_num = 100001
            today = date.today()

            for club, tier in [(club1, 2), (club2, 3), (club3, 1)]:
                price = TIER_PRICES[tier]
                for months_ago in [3, 2, 1]:
                    period_start = today.replace(day=1) - timedelta(days=30 * months_ago)
                    period_end = (period_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
                    is_paid = months_ago > 1 or (months_ago == 1 and club.id != club3.id)

                    subtotal = float(price)
                    vat_amount = round(subtotal * 0.18, 2)
                    total = round(subtotal + vat_amount, 2)

                    inv = PlatformInvoice(
                        club_id=club.id,
                        invoice_number=str(invoice_num),
                        invoice_type="tax_invoice",
                        status="paid" if is_paid else "sent",
                        billing_name=club.name,
                        billing_email=club.billing_email,
                        subtotal=subtotal,
                        vat_rate=18.0,
                        vat_amount=vat_amount,
                        total=total,
                        currency="ILS",
                        issue_date=period_start,
                        due_date=period_start + timedelta(days=30),
                        paid_date=period_start + timedelta(days=random.randint(5, 25)) if is_paid else None,
                        period_start=period_start,
                        period_end=period_end,
                    )
                    db.add(inv)
                    await db.flush()

                    # Line items
                    db.add(PlatformInvoiceLineItem(
                        invoice_id=inv.id,
                        description=f"מנוי חודשי - Tier {tier}",
                        quantity=1, unit_price=price, total=float(price),
                    ))

                    # Payment transaction for paid invoices
                    if is_paid:
                        db.add(PlatformPaymentTransaction(
                            club_id=club.id, invoice_id=inv.id,
                            amount=total, currency="ILS",
                            payment_method="credit_card", status="completed",
                            paid_at=datetime.combine(inv.paid_date, datetime.min.time()),
                        ))

                    invoice_num += 1

            await db.flush()
            print(f"\n[OK] 9 invoices created (3 per club, 3 months)")
        else:
            print("[OK] Invoices already exist")

        # ════════════════════════════════════════════════════════════
        # 7. SUPPORT TICKETS
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(func.count(SupportTicket.id)))
        if (r.scalar() or 0) == 0:
            # Club 1: resolved ticket (try both possible emails)
            r = await db.execute(select(User).where(User.email == "ohadc55@gmail.com", User.role == "admin"))
            admin1_user = r.scalars().first()
            if not admin1_user:
                r = await db.execute(select(User).where(User.email == "admin@hoops.club", User.role == "admin"))
                admin1_user = r.scalars().first()
            if admin1_user:
                t1 = SupportTicket(
                    club_id=club1.id, created_by_user_id=admin1_user.id,
                    assigned_to_super_admin_id=super_admin.id,
                    subject="בעיה בהעלאת וידאו לחדר הסקאוטינג",
                    category="technical", priority="medium", status="resolved",
                )
                db.add(t1)
                await db.flush()
                db.add(TicketMessage(
                    ticket_id=t1.id, sender_type="club_admin", sender_id=admin1_user.id,
                    sender_name=admin1_user.name, body="שלום, אנחנו מנסים להעלות סרטונים ומקבלים שגיאה. מה הבעיה?",
                ))
                db.add(TicketMessage(
                    ticket_id=t1.id, sender_type="super_admin", sender_id=super_admin.id,
                    sender_name=super_admin.name, body="בדקנו - הבעיה תוקנה. נסו שוב ועדכנו.",
                ))
                db.add(TicketMessage(
                    ticket_id=t1.id, sender_type="club_admin", sender_id=admin1_user.id,
                    sender_name=admin1_user.name, body="עובד מעולה, תודה רבה!",
                ))

            # Club 3: open ticket (billing question)
            r = await db.execute(select(User).where(User.email == "admin@hapoel-negev.club"))
            admin3_user = r.scalars().first()
            if admin3_user:
                t2 = SupportTicket(
                    club_id=club3.id, created_by_user_id=admin3_user.id,
                    subject="שאלה לגבי שדרוג חבילה",
                    category="billing", priority="low", status="open",
                )
                db.add(t2)
                await db.flush()
                db.add(TicketMessage(
                    ticket_id=t2.id, sender_type="club_admin", sender_id=admin3_user.id,
                    sender_name=admin3_user.name,
                    body="היי, אנחנו שוקלים לשדרג מ-Basic ל-Growth. מה ההבדלים בפיצ'רים ובמחיר?",
                ))

            await db.flush()
            print("[OK] 2 support tickets created")
        else:
            print("[OK] Support tickets already exist")

        # ════════════════════════════════════════════════════════════
        # 8. PLATFORM NOTIFICATIONS
        # ════════════════════════════════════════════════════════════
        r = await db.execute(select(func.count(PlatformNotification.id)))
        if (r.scalar() or 0) == 0:
            notifications = [
                PlatformNotification(
                    type="club_registered", priority="medium",
                    title="מועדון חדש נרשם: הפועל כוכבי הנגב",
                    body="מועדון חדש בנגב הצטרף לפלטפורמה. חבילת Basic.",
                    club_id=club3.id, is_read=False,
                ),
                PlatformNotification(
                    type="payment_received", priority="low",
                    title="תשלום התקבל: מכבי נוער נתניה",
                    body="תשלום חודשי ₪877.50 (כולל מע\"מ) התקבל בהצלחה.",
                    club_id=club2.id, is_read=True,
                ),
                PlatformNotification(
                    type="payment_overdue", priority="high",
                    title="תשלום באיחור: הפועל כוכבי הנגב",
                    body="חשבונית ינואר 2026 טרם שולמה. יש ליצור קשר עם המועדון.",
                    club_id=club3.id, is_read=False,
                ),
                PlatformNotification(
                    type="new_ticket", priority="medium",
                    title="פנייה חדשה: הפועל כוכבי הנגב",
                    body="שאלה לגבי שדרוג חבילה.",
                    club_id=club3.id, is_read=False,
                ),
                PlatformNotification(
                    type="tier_threshold", priority="medium",
                    title="מכבי הוד השרון מתקרב למגבלת שחקנים",
                    body="78 מתוך 250 שחקנים (31%). מגמת גדילה.",
                    club_id=club1.id, is_read=True,
                ),
            ]
            for n in notifications:
                db.add(n)
            await db.flush()
            print(f"[OK] {len(notifications)} platform notifications created")
        else:
            print("[OK] Platform notifications already exist")

        # ════════════════════════════════════════════════════════════
        # COMMIT
        # ════════════════════════════════════════════════════════════
        await db.commit()

        # ════════════════════════════════════════════════════════════
        # SUMMARY
        # ════════════════════════════════════════════════════════════
        print("\n" + "=" * 60)
        print("PLATFORM SEED COMPLETE!")
        print("=" * 60)

        # Count stats
        for club_name, label in [
            ("מכבי הוד השרון", "Maccabi Hod Hasharon"),
            ("מכבי נוער נתניה", "Maccabi Netanya Youth"),
            ("הפועל כוכבי הנגב", "Hapoel Negev Stars"),
        ]:
            r = await db.execute(select(PlatformClub).where(PlatformClub.name == club_name))
            club = r.scalars().first()
            if club and club.admin_id:
                r = await db.execute(
                    select(func.count(TeamMember.id))
                    .join(Team, TeamMember.team_id == Team.id)
                    .where(Team.created_by_admin_id == club.admin_id, TeamMember.role_in_team == "player")
                )
                pc = r.scalar() or 0
                r = await db.execute(
                    select(func.count(Team.id)).where(Team.created_by_admin_id == club.admin_id)
                )
                tc = r.scalar() or 0
                print(f"\n  {label}:")
                print(f"    Status: {club.status} | Tier: {club.pricing_tier} | Region: {club.region_id}")
                print(f"    Teams: {tc} | Players: {pc}")
                print(f"    Admin: {club.billing_email}")

        print(f"\n  LOGINS:")
        print(f"    Super Admin: super@hoops.ai / 123456")
        print(f"    Club 1 Admin: ohadc55@gmail.com / 6279986")
        print(f"    Club 2 Admin: admin@maccabi-netanya.club / 123456")
        print(f"    Club 3 Admin: admin@hapoel-negev.club / 123456")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
