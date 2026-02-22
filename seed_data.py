"""
HOOPS AI - Seed Data Script
Creates a realistic basketball club with 6 teams, players, parents, events, reports.
All passwords: 123456
"""
import asyncio
import random
import uuid
import string
import json
from datetime import date, timedelta, datetime

random.seed(42)

import bcrypt

# ── Setup paths ──────────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from src.utils.database import engine, Base, AsyncSessionLocal
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
from src.models.practice_session import PracticeSession, SessionSegment
from src.models.admin_role import AdminRole
from src.models.drill_assignment import DrillAssignment

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
    """Transliterate Hebrew name to ASCII for email addresses."""
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

# ── Data ─────────────────────────────────────────────────────────────
TEAMS = [
    {"name": "נוער לאומית", "age_group": "U18", "level": "לאומית", "age_range": (16, 18), "num_players": 14},
    {"name": "נערים א' לאומית", "age_group": "U16", "level": "לאומית", "age_range": (14, 16), "num_players": 13},
    {"name": "נערים ב' לאומית", "age_group": "U14", "level": "לאומית", "age_range": (12, 14), "num_players": 13},
    {"name": "ילדים א' לאומית", "age_group": "U12", "level": "לאומית", "age_range": (10, 12), "num_players": 14},
    {"name": "ילדים ב'", "age_group": "U10", "level": "ארצית", "age_range": (8, 10), "num_players": 12},
    {"name": "קטסל א'", "age_group": "U8", "level": "מחוזית", "age_range": (6, 8), "num_players": 12},
]

COACH_NAMES = [
    ("יוסי כהן", "yossi.cohen@hoops.club"),
    ("אבי לוי", "avi.levy@hoops.club"),
    ("משה פרץ", "moshe.peretz@hoops.club"),
    ("דני בר", "dani.bar@hoops.club"),
    ("רון שמעון", "ron.shimon@hoops.club"),
    ("גיל אדרי", "gil.adri@hoops.club"),
]

FIRST_NAMES_M = [
    "איתן", "עומר", "נועם", "יובל", "רועי", "אורי", "דניאל", "תומר", "אדם", "ליאם",
    "עידו", "שגיא", "אסף", "גיא", "מתן", "ניר", "אלון", "יונתן", "אריאל", "דור",
    "איתמר", "בן", "נדב", "אופיר", "שי", "טל", "עמית", "יהב", "אלעד", "רז",
    "נתן", "עידן", "ניב", "גל", "אלי", "תם", "אביב", "ליאור", "עמרי", "יוגב",
    "צליל", "שחר", "נריה", "מאור", "סהר", "הראל", "דביר", "יהלי", "רם", "אדיר",
    "מעיין", "רתם", "קובי", "אביתר", "יפתח", "חן", "נעם", "סתיו", "הוד", "ינאי",
    "נהוראי", "נתנאל", "מישאל", "פלג", "זיו", "ברק", "ארז", "ינון", "שילה", "אייל",
    "אופק", "בועז", "דקל", "יהונתן", "לביא", "עוז", "צור", "שמעון", "שלו", "אהרון",
    "יואב", "גדעון", "אוהד", "ישי", "נועה", "ליאב",
]

LAST_NAMES = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "דהן", "אגבאריה", "שלום", "חדד",
    "אוחיון", "גבאי", "סויסה", "אזולאי", "שמעוני", "דוד", "בן דוד", "מלכה", "חיים",
    "עמר", "יוסף", "גולן", "נחום", "זגורי", "אלבז", "מור", "רוזן", "פלד", "שרון",
    "ברכה", "צדוק", "סבג", "בוזגלו", "אסרף", "טל", "אדרי", "עזרא", "סבן", "ממן",
    "טביב", "גרינברג", "שפירא", "ברגר", "שטרן", "וייס", "קפלן", "הרשקוביץ", "גלברד",
]

FATHER_FIRST = ["אבי", "דוד", "יוסי", "משה", "חיים", "שמעון", "יעקב", "אהרון", "אלי", "רון",
                "מיכאל", "צבי", "ניסים", "שלמה", "יצחק", "בני", "רפי", "מנחם", "גדי", "ציון"]
MOTHER_FIRST = ["רחל", "שרה", "מיכל", "לימור", "ענת", "אורלי", "סיגל", "הילה", "דנה", "אפרת",
                "יעל", "נועה", "שירי", "טלי", "קרן", "אורית", "גלית", "ליאת", "אושרת", "מורן"]

POSITIONS = ["PG", "SG", "SF", "PF", "C"]

OPPONENTS = [
    "הפועל תל אביב", "מכבי ראשון לציון", "הפועל חולון", "אליצור נתניה",
    "מכבי חיפה", "הפועל ירושלים", "עירוני נהריה", "מכבי אשדוד",
    "הפועל גליל עליון", "אליצור אשקלון", "בנות הרצליה", "מכבי רמת גן",
    "הפועל באר שבע", "מכבי קרית גת", "עירוני כפר סבא", "הפועל עפולה",
]

FACILITIES_DATA = [
    ("אולם הספורט העירוני", "gym", "רחוב הספורט 1", 500),
    ("אולם חדש", "gym", "רחוב האלון 12", 300),
    ("מגרש חיצוני א'", "court", "פארק הירקון", 100),
]

DRILL_DATA = [
    # (title, category, difficulty, duration, description)
    ("3 on 2 Fast Break", "offense", "intermediate", 15, "שלושה נגד שניים בפאסט ברייק. הדגש על קבלת החלטות מהירה."),
    ("Shell Defense Drill", "defense", "intermediate", 15, "הגנת מעטפת - 4 נגד 4 עם דגש על סגירות ועזרה."),
    ("Mikan Drill", "shooting", "beginner", 10, "תרגיל ליי-אפ מהצד מתחלף. שיפור סיום מקרוב."),
    ("3-Point Shooting Series", "shooting", "advanced", 15, "סדרת זריקות מ-5 עמדות. 3 סטים של 5 זריקות."),
    ("Full Court Press Break", "offense", "advanced", 20, "שבירת לחץ מלא. 5 נגד 5 עם דגש על ספייסינג."),
    ("Ball Handling Circuit", "dribbling", "beginner", 10, "מעגל כדרורים - קרוס אובר, behind the back, between the legs."),
    ("Pick and Roll Drill", "offense", "intermediate", 15, "פיק אנד רול - 2 נגד 2. דגש על קריאת ההגנה."),
    ("Close-Out Drill", "defense", "beginner", 10, "סגירות על שחקן עם כדור. דגש על balance ומיקום."),
    ("Spot-Up Shooting", "shooting", "beginner", 10, "זריקות מעמידה מ-3 נקודות שונות. 10 מכל עמדה."),
    ("Transition Defense", "defense", "intermediate", 15, "חזרה להגנה. 4 נגד 3 עם emphasis על matchups."),
    ("Lane Slides", "conditioning", "beginner", 8, "תרגיל שינויי כיוון על הלנה. שיפור תנועה לרוחב."),
    ("Post Moves Series", "offense", "advanced", 15, "סדרת מהלכים בפוסט - דרופ סטפ, הוק, פייסאפ."),
    ("Passing Under Pressure", "passing", "intermediate", 12, "מסירות תחת לחץ. 3 נגד 2 עם הגבלת זמן."),
    ("Defensive Rebounding", "defense", "intermediate", 15, "ריבאונד הגנתי - box out + outlet pass."),
    ("Free Throw Routine", "shooting", "beginner", 10, "שגרת עצירות. 2 סטים של 10 זריקות חופשיות."),
    ("Conditioning Sprints", "conditioning", "advanced", 12, "ספרינטים - סוסידות, קוורטרים, full court."),
    ("Weave Passing Drill", "passing", "beginner", 10, "ויב מסירות 3/4/5 שחקנים. דגש על timing."),
    ("Motion Offense Basics", "offense", "intermediate", 20, "התקפה בתנועה - חתכים, מסכים, spacing."),
]

STRENGTHS = [
    "זריקת חוץ מדויקת", "מהירות רוחבית גבוהה", "IQ כדורסלי מעולה", "מנהיגות על המגרש",
    "יכולת כדרור יד שמאל", "סיום מקרוב מגוון", "ראיית מגרש", "מסירה מדויקה",
    "עמידות פיזית", "הגנה אישית חזקה", "ריבאונד התקפי", "שליטה בקצב המשחק",
    "משמעת טקטית", "יכולת לשחק מספר עמדות", "גישה חיובית ועבודת צוות",
]

WEAKNESSES = [
    "צריך לשפר זריקה מרחוק", "חוסר ביטחון בכדרור יד חלשה", "נטייה לטעויות תחת לחץ",
    "צריך לשפר תנועה ללא כדור", "הגנה על פיק אנד רול", "סיום בכפילות",
    "קריאת הגנה באזור", "חזרה להגנה איטית", "זריקה חופשית לא יציבה",
    "שליטה בגוף במגע", "רגישות ללחץ במשחקים צמודים", "קפיצה נמוכה",
]

FOCUS_AREAS = [
    "שיפור זריקת 3 נקודות", "חיזוק שרירי ליבה", "תרגול כדרור תחת לחץ",
    "עבודה על מהירות תגובה", "שיפור סגירות הגנתיות", "פיתוח משחק פוסט",
    "עבודה על IQ הגנתי", "תרגול מסירות במהירות", "שיפור סיום ביד חלשה",
]


# ── Main seed function ──────────────────────────────────────────────
async def seed():
    # Recreate all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created")

    async with AsyncSessionLocal() as db:
        # ── 1. Admin roles ───────────────────────────────────────────
        roles_data = [
            ("מנהל", "מנהל המועדון הראשי", True),
            ("יו״ר", "יושב ראש המועדון", True),
            ("גזבר", "אחראי כספים", True),
            ("מנהל מקצועי", "אחראי ענף כדורסל", True),
            ("מנהל תפעולי", "אחראי לוגיסטיקה ואולמות", True),
        ]
        admin_roles = []
        for name, desc, is_default in roles_data:
            r = AdminRole(name=name, description=desc, is_default=is_default, is_active=True)
            db.add(r)
            admin_roles.append(r)
        await db.flush()
        print(f"[OK] {len(admin_roles)} admin roles")

        # ── 2. Admin user ────────────────────────────────────────────
        admin_user = User(
            name="אוהד דדוש",
            email="admin@hoops.club",
            password_hash=PASSWORD_HASH,
            role="admin",
            phone="050-1234567",
            date_of_birth=date(1985, 3, 15),
            admin_role_id=admin_roles[0].id,
        )
        db.add(admin_user)
        await db.flush()
        admin_id = admin_user.id
        print(f"[OK] Admin: admin@hoops.club (id={admin_id})")

        # ── 3. Facilities ────────────────────────────────────────────
        facilities = []
        for fname, ftype, addr, cap in FACILITIES_DATA:
            f = Facility(admin_id=admin_id, name=fname, facility_type=ftype, address=addr, capacity=cap)
            db.add(f)
            facilities.append(f)
        await db.flush()
        print(f"[OK] {len(facilities)} facilities")

        # ── 4. Teams + Coaches + Players + Parents ───────────────────
        used_names = set()
        all_team_events = []
        all_coach_events = []
        all_players_data = []  # (player_obj, coach_obj, team_obj)

        for ti, team_info in enumerate(TEAMS):
            # Create team
            team = Team(
                name=team_info["name"],
                club_name="מכבי הוד השרון",
                age_group=team_info["age_group"],
                level=team_info["level"],
                created_by_admin_id=admin_id,
                coach_invite_code=gen_code(),
                coach_invite_token=gen_uuid(),
                player_invite_code=gen_code(),
                player_invite_token=gen_uuid(),
                parent_invite_code=gen_code(),
                parent_invite_token=gen_uuid(),
            )
            db.add(team)
            await db.flush()

            # Create coach user
            coach_name, coach_email = COACH_NAMES[ti]
            coach_user = User(
                name=coach_name,
                email=coach_email,
                password_hash=PASSWORD_HASH,
                role="coach",
                phone=gen_phone(),
                date_of_birth=gen_birth(30, 55),
            )
            db.add(coach_user)
            await db.flush()

            # Create coach record
            coach = Coach(
                name=coach_name,
                email=coach_email,
                password_hash=PASSWORD_HASH,
                team_name=team_info["name"],
                age_group=team_info["age_group"],
                level=team_info["level"],
                user_id=coach_user.id,
            )
            db.add(coach)
            await db.flush()

            # Coach → team member
            db.add(TeamMember(team_id=team.id, user_id=coach_user.id, role_in_team="coach"))
            await db.flush()

            # ── Players ──────────────────────────────────────────────
            min_age, max_age = team_info["age_range"]
            team_players = []
            for pi in range(team_info["num_players"]):
                # Pick unique name
                while True:
                    fn = random.choice(FIRST_NAMES_M)
                    ln = random.choice(LAST_NAMES)
                    full = f"{fn} {ln}"
                    if full not in used_names:
                        used_names.add(full)
                        break

                jersey = pi + 1 if pi < 15 else random.randint(20, 99)
                pos = POSITIONS[pi % 5]
                bdate = gen_birth(min_age, max_age)
                player_email = f"{_translit(fn)}.{_translit(ln)}.t{ti}@player.hoops"
                parent_email = f"{_translit(ln)}.family{ti}{pi}@parents.hoops"

                height_base = {(16,18): 175, (14,16): 168, (12,14): 158, (10,12): 145, (8,10): 132, (6,8): 118}
                h = height_base.get(team_info["age_range"], 160) + random.randint(-8, 12)

                # Player roster record (owned by coach)
                player = Player(
                    coach_id=coach.id,
                    name=full,
                    jersey_number=jersey,
                    position=pos,
                    birth_date=bdate,
                    height=h,
                    weight=round(h * 0.38 + random.uniform(-5, 8), 1),
                    gender="male",
                    phone=gen_phone() if min_age >= 12 else None,
                    email=player_email if min_age >= 12 else None,
                    parent_phone=gen_phone(),
                    parent_email=parent_email,
                )
                db.add(player)
                await db.flush()

                # Player user account
                player_user = User(
                    name=full,
                    email=player_email,
                    password_hash=PASSWORD_HASH,
                    role="player",
                    phone=player.phone,
                    date_of_birth=bdate,
                )
                db.add(player_user)
                await db.flush()
                player.user_id = player_user.id
                await db.flush()

                # Player → team member
                db.add(TeamMember(team_id=team.id, user_id=player_user.id, role_in_team="player", player_id=player.id))

                # ── Parents (father + mother) ────────────────────────
                father_name = f"{random.choice(FATHER_FIRST)} {ln}"
                mother_name = f"{random.choice(MOTHER_FIRST)} {ln}"

                for pname, suffix in [(father_name, "dad"), (mother_name, "mom")]:
                    p_email = f"{_translit(ln)}.{suffix}{ti}{pi}@parents.hoops"
                    parent_user = User(
                        name=pname,
                        email=p_email,
                        password_hash=PASSWORD_HASH,
                        role="parent",
                        phone=gen_phone(),
                        date_of_birth=gen_birth(35, 55),
                    )
                    db.add(parent_user)
                    await db.flush()
                    db.add(TeamMember(
                        team_id=team.id,
                        user_id=parent_user.id,
                        role_in_team="parent",
                        player_id=player.id,
                    ))

                team_players.append(player)
                all_players_data.append((player, coach, team))

            await db.flush()

            # ── Team Events (admin-created schedule) ─────────────────
            today = date.today()
            # Past practices (last 8 weeks, 2x/week)
            for w in range(8, 0, -1):
                for day_offset in [1, 3]:  # Monday, Wednesday
                    ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                    if ev_date >= today:
                        continue
                    ev = TeamEvent(
                        team_id=team.id,
                        created_by_admin_id=admin_id,
                        title=f"אימון {team_info['name']}",
                        event_type="practice",
                        date=ev_date,
                        time_start="18:00" if min_age <= 12 else "19:30",
                        time_end="19:30" if min_age <= 12 else "21:00",
                        location=facilities[0].name,
                        facility_id=facilities[0].id,
                    )
                    db.add(ev)
                    all_team_events.append(ev)

            # Future practices (next 4 weeks)
            for w in range(4):
                for day_offset in [1, 3]:
                    ev_date = today + timedelta(weeks=w) + timedelta(days=day_offset)
                    ev = TeamEvent(
                        team_id=team.id,
                        created_by_admin_id=admin_id,
                        title=f"אימון {team_info['name']}",
                        event_type="practice",
                        date=ev_date,
                        time_start="18:00" if min_age <= 12 else "19:30",
                        time_end="19:30" if min_age <= 12 else "21:00",
                        location=facilities[0].name,
                        facility_id=facilities[0].id,
                    )
                    db.add(ev)
                    all_team_events.append(ev)

            # Past games (4-6 games)
            num_games = random.randint(4, 6)
            for g in range(num_games):
                g_date = today - timedelta(weeks=random.randint(1, 8), days=random.choice([5, 6]))  # weekend
                opponent = random.choice(OPPONENTS)
                ev = TeamEvent(
                    team_id=team.id,
                    created_by_admin_id=admin_id,
                    title=f"משחק vs {opponent}",
                    event_type="game",
                    date=g_date,
                    time_start="18:00" if min_age <= 12 else "20:00",
                    time_end="19:30" if min_age <= 12 else "21:30",
                    location=random.choice([facilities[0].name, "מגרש חוץ"]),
                    opponent=opponent,
                )
                db.add(ev)
                all_team_events.append(ev)

            # Future games (2)
            for g in range(2):
                g_date = today + timedelta(weeks=g+1, days=5)
                opponent = random.choice(OPPONENTS)
                ev = TeamEvent(
                    team_id=team.id,
                    created_by_admin_id=admin_id,
                    title=f"משחק vs {opponent}",
                    event_type="game",
                    date=g_date,
                    time_start="18:00" if min_age <= 12 else "20:00",
                    time_end="19:30" if min_age <= 12 else "21:30",
                    location=facilities[0].name,
                    opponent=opponent,
                )
                db.add(ev)

            await db.flush()

            # ── Coach Events (for attendance) ────────────────────────
            for w in range(8, 0, -1):
                for day_offset in [1, 3]:
                    ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                    if ev_date >= today:
                        continue
                    cev = Event(
                        coach_id=coach.id,
                        date=ev_date,
                        time="18:00" if min_age <= 12 else "19:30",
                        event_type="practice",
                        title=f"אימון {team_info['name']}",
                        facility_id=facilities[0].id,
                    )
                    db.add(cev)
                    all_coach_events.append((cev, coach, team_players))

            await db.flush()

            # ── Drills (assign ~8 drills per coach) ──────────────────
            drill_subset = random.sample(DRILL_DATA, min(8, len(DRILL_DATA)))
            team_drills = []
            for title, cat, diff, dur, desc in drill_subset:
                # ~40% of drills get a YouTube video URL
                video_url = random.choice([
                    "https://www.youtube.com/watch?v=sFd_K08RMeo",
                    "https://www.youtube.com/watch?v=RYnFIRc0k6E",
                    "https://www.youtube.com/watch?v=V-QC0mXbGhc",
                    None, None, None,
                ])
                drill = Drill(
                    coach_id=coach.id,
                    title=title,
                    description=desc,
                    category=cat,
                    difficulty=diff,
                    duration_minutes=dur,
                    instructions=desc,
                    tags=json.dumps([cat, diff]),
                    video_url=video_url,
                )
                db.add(drill)
                team_drills.append(drill)

            await db.flush()

            # ── Drill Assignments ──────────────────────────────────────
            assign_count = 0
            for drill in team_drills:
                # ~50% of drills assigned to all players, ~30% to 2-3 random players
                roll = random.random()
                if roll < 0.5:
                    assigned_players = team_players
                elif roll < 0.8:
                    assigned_players = random.sample(team_players, min(random.randint(2, 4), len(team_players)))
                else:
                    continue  # ~20% not assigned
                for player in assigned_players:
                    is_done = random.random() < 0.4
                    da = DrillAssignment(
                        drill_id=drill.id,
                        player_id=player.id,
                        team_id=team.id,
                        coach_id=coach.id,
                        note=random.choice([None, None, "תתרגלו 3 פעמים לפני האימון הבא", "חשוב לדייק בתנועות"]),
                        is_completed=is_done,
                        completed_at=datetime.now() - timedelta(days=random.randint(1, 14)) if is_done else None,
                    )
                    db.add(da)
                    assign_count += 1

            await db.flush()
            print(f"      + {len(team_drills)} drills, {assign_count} assignments")

            # ── Game Reports ─────────────────────────────────────────
            for g in range(num_games):
                g_date = today - timedelta(weeks=random.randint(1, 8), days=random.choice([5, 6]))
                opponent = random.choice(OPPONENTS)
                result = random.choices(["win", "loss", "draw"], weights=[45, 40, 15])[0]
                if result == "win":
                    score_us = random.randint(55, 95)
                    score_them = score_us - random.randint(3, 20)
                elif result == "loss":
                    score_them = random.randint(55, 95)
                    score_us = score_them - random.randint(3, 20)
                else:
                    score_us = random.randint(55, 80)
                    score_them = score_us

                standouts = [p.name for p in random.sample(team_players, min(3, len(team_players)))]
                areas = random.sample([
                    "הגנה באזור", "ריבאונד התקפי", "זריקות חופשיות", "טרנזישן",
                    "מסירות תחת לחץ", "סגירות על שלוש", "משחק פוסט"
                ], 2)

                gr = GameReport(
                    coach_id=coach.id,
                    date=g_date,
                    opponent=opponent,
                    location=random.choice([facilities[0].name, "חוץ"]),
                    result=result,
                    score_us=score_us,
                    score_them=score_them,
                    standout_players=json.dumps(standouts),
                    areas_to_improve=json.dumps(areas),
                    notes=f"{'ניצחון חשוב' if result == 'win' else 'הפסד מלמד' if result == 'loss' else 'תיקו צמוד'}. הקבוצה הראתה שיפור.",
                )
                db.add(gr)

            await db.flush()

            # ── Player Reports (for ~60% of players) ─────────────────
            for player in team_players:
                if random.random() > 0.6:
                    continue
                strengths = random.sample(STRENGTHS, 3)
                weaknesses = random.sample(WEAKNESSES, 2)
                focus = random.sample(FOCUS_AREAS, 2)
                pr = PlayerReport(
                    coach_id=coach.id,
                    player_id=player.id,
                    period="2025-H2",
                    strengths=json.dumps(strengths),
                    weaknesses=json.dumps(weaknesses),
                    focus_areas=json.dumps(focus),
                    progress_notes=f"{player.name} מראה שיפור עקבי בחודשים האחרונים. יש לשים דגש על {focus[0]}.",
                    recommendations=f"להמשיך עבודה אישית על {weaknesses[0]}. לשלב ב{focus[0]} באימונים.",
                    is_ai_generated=random.choice([True, False]),
                )
                db.add(pr)

            await db.flush()

            print(f"[OK] Team '{team_info['name']}': coach={coach_name}, {len(team_players)} players, {len(team_players)*2} parents")

        # ── 5. Attendance records ────────────────────────────────────
        att_count = 0
        for ev, coach_obj, players_list in all_coach_events:
            for player in players_list:
                # ~80% attendance rate with variation per player
                present = random.random() < (0.75 + random.uniform(-0.15, 0.15))
                att = Attendance(
                    coach_id=coach_obj.id,
                    event_id=ev.id,
                    player_id=player.id,
                    present=present,
                    notes="חולה" if not present and random.random() < 0.3 else None,
                )
                db.add(att)
                att_count += 1
        await db.flush()
        print(f"[OK] {att_count} attendance records")

        # ── Commit everything ────────────────────────────────────────
        await db.commit()
        print("\n[DONE] Seed complete!")
        print(f"   Admin: admin@hoops.club / 123456")
        print(f"   Coaches: yossi.cohen@hoops.club ... gil.adri@hoops.club / 123456")
        print(f"   All passwords: 123456")


if __name__ == "__main__":
    asyncio.run(seed())
