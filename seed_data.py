"""
HOOPS AI - Club Seed Data
Full basketball club: 5 admins, 20 coaches, 25 teams, ~370 players, ~740 parents.

Age groups (pyramid — more teams at younger ages):
  קטסל ב' (U8)  — 5 teams
  קטסל א' (U10) — 4 teams
  ילדים ב' (U12) — 4 teams
  ילדים א' (U14) — 4 teams
  נערים ב' (U16) — 3 teams
  נערים א' (U17) — 3 teams
  נוער (U18)     — 2 teams

Passwords: coaches/players/parents = 123456 | admins = 6279986
"""
import asyncio
import random
import uuid
import string
import json
from datetime import date, timedelta, datetime

random.seed(42)

import bcrypt
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

# ══════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════
PASSWORD_HASH = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode("utf-8")
ADMIN_PASSWORD_HASH = bcrypt.hashpw(b"6279986", bcrypt.gensalt()).decode("utf-8")


def gen_code(n=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def gen_uuid():
    return str(uuid.uuid4())

def gen_phone():
    prefix = random.choice(["050", "052", "053", "054", "058"])
    return f"{prefix}-{random.randint(1000000, 9999999)}"

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


# ══════════════════════════════════════════════════════════════════════
# Club Structure
# ══════════════════════════════════════════════════════════════════════
CLUB_NAME = "מכבי הוד השרון"

# ── Admin Roles ──
ADMIN_ROLES = [
    ("מנהל", "מנהל המועדון הראשי"),
    ("יו״ר", "יושב ראש המועדון"),
    ("גזבר", "אחראי כספים"),
    ("מנהל מקצועי", "אחראי ענף כדורסל"),
    ("מנהל תפעולי", "אחראי לוגיסטיקה ואולמות"),
]

# ── 5 Admins (name, email, password_hash, role_index) ──
ADMINS = [
    ("אוהד", "ohadc55@gmail.com", ADMIN_PASSWORD_HASH, 0),
    ("דוד כהן", "david.cohen@hoops.club", PASSWORD_HASH, 1),
    ("שמעון לוי", "shimon.levi@hoops.club", PASSWORD_HASH, 2),
    ("רמי פרץ", "rami.peretz@hoops.club", PASSWORD_HASH, 3),
    ("אורלי דהן", "orly.dahan@hoops.club", PASSWORD_HASH, 4),
]

# ── Age Groups → Teams ──
# (prefix, age_group_code, age_range, suffixes, default_level)
#   - Numbered suffixes ("1","2"…) = younger/recreational teams
#   - Named suffixes ("לאומית","ארצית"…) = competitive league teams
AGE_GROUP_DEFS = [
    ("קטסל ב'", "U8",  (6, 7),   ["1", "2", "3", "4", "5"],                        "מחוזית"),
    ("קטסל א'", "U10", (8, 9),   ["1", "2", "3", "4"],                              "מחוזית"),
    ("ילדים ב'", "U12", (10, 11), ["לאומית", "ארצית", "מחוזית א'", "מחוזית ב'"],     None),
    ("ילדים א'", "U14", (12, 13), ["לאומית", "ארצית", "מחוזית א'", "מחוזית ב'"],     None),
    ("נערים ב'", "U16", (14, 15), ["לאומית", "ארצית", "מחוזית"],                      None),
    ("נערים א'", "U17", (15, 16), ["לאומית", "ארצית", "מחוזית"],                      None),
    ("נוער",     "U18", (16, 18), ["לאומית", "ארצית"],                                None),
]

# ── 20 Coaches (name, email, team_indices) ──
# Team indices correspond to the generated teams list (0-24)
# Indices: 0-4 קטסל ב' | 5-8 קטסל א' | 9-12 ילדים ב' | 13-16 ילדים א'
#          17-19 נערים ב' | 20-22 נערים א' | 23-24 נוער
COACHES_DATA = [
    # Oldest first (single team per coach)
    ("יוסי כהן",     "yossi.cohen@hoops.club",   [24]),         # נוער לאומית
    ("אבי לוי",      "avi.levy@hoops.club",       [23]),         # נוער ארצית
    ("משה פרץ",      "moshe.peretz@hoops.club",   [20]),         # נערים א' לאומית
    ("דני בר",       "dani.bar@hoops.club",       [21]),         # נערים א' ארצית
    ("רון שמעון",    "ron.shimon@hoops.club",     [22]),         # נערים א' מחוזית
    ("גיל אדרי",    "gil.adri@hoops.club",       [17]),         # נערים ב' לאומית
    ("תומר גולן",   "tomer.golan@hoops.club",    [18]),         # נערים ב' ארצית
    ("אלון דוד",    "alon.david@hoops.club",     [19]),         # נערים ב' מחוזית
    ("נועם שרון",   "noam.sharon@hoops.club",    [13]),         # ילדים א' לאומית
    ("עידו מזרחי",  "ido.mizrachi@hoops.club",   [14]),         # ילדים א' ארצית
    # Two-team coaches (same age group)
    ("שגיא ביטון",  "sagi.biton@hoops.club",     [15, 16]),     # ילדים א' מחוזית א'+ב'
    ("אסף אברהם",  "asaf.avraham@hoops.club",   [9]),          # ילדים ב' לאומית
    ("דקל חדד",     "dekel.hadad@hoops.club",    [10]),         # ילדים ב' ארצית
    ("ערן סויסה",   "eran.suissa@hoops.club",    [11, 12]),     # ילדים ב' מחוזית א'+ב'
    ("ניר אזולאי",  "nir.azulai@hoops.club",     [5, 6]),       # קטסל א' 1+2
    ("אמיר עמר",    "amir.amar@hoops.club",      [7, 8]),       # קטסל א' 3+4
    ("ליאור גבאי",  "lior.gabai@hoops.club",     [0]),          # קטסל ב'1
    ("יהב זגורי",   "yahav.zaguri@hoops.club",   [1, 2]),       # קטסל ב' 2+3
    ("עומרי מור",   "omri.mor@hoops.club",       [3]),          # קטסל ב'4
    ("בועז רוזן",   "boaz.rozen@hoops.club",     [4]),          # קטסל ב'5
]

# ── Facilities ──
FACILITIES_DATA = [
    ("אולם הספורט העירוני", "gym", "רחוב הספורט 1", 500),
    ("אולם חדש", "gym", "רחוב האלון 12", 300),
    ("אולם בית הספר", "gym", "רחוב החינוך 5", 200),
    ("מגרש חיצוני א'", "court", "פארק הירקון", 100),
    ("מגרש חיצוני ב'", "court", "גן סאקר", 80),
]

# ══════════════════════════════════════════════════════════════════════
# Player & Content Data
# ══════════════════════════════════════════════════════════════════════
FIRST_NAMES_M = [
    "איתן", "עומר", "נועם", "יובל", "רועי", "אורי", "דניאל", "תומר", "אדם", "ליאם",
    "עידו", "שגיא", "אסף", "גיא", "מתן", "ניר", "אלון", "יונתן", "אריאל", "דור",
    "איתמר", "בן", "נדב", "אופיר", "שי", "טל", "עמית", "יהב", "אלעד", "רז",
    "נתן", "עידן", "ניב", "גל", "אלי", "תם", "אביב", "ליאור", "עמרי", "יוגב",
    "צליל", "שחר", "נריה", "מאור", "סהר", "הראל", "דביר", "יהלי", "רם", "אדיר",
    "מעיין", "רתם", "קובי", "אביתר", "יפתח", "חן", "נעם", "סתיו", "הוד", "ינאי",
    "נהוראי", "נתנאל", "מישאל", "פלג", "זיו", "ברק", "ארז", "ינון", "שילה", "אייל",
    "אופק", "בועז", "דקל", "יהונתן", "לביא", "עוז", "צור", "שמעון", "שלו", "אהרון",
    "יואב", "גדעון", "אוהד", "ישי", "ליאב", "עדי", "רואי", "סהל", "אמיר", "אלמוג",
]

LAST_NAMES = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "דהן", "אגבאריה", "שלום", "חדד",
    "אוחיון", "גבאי", "סויסה", "אזולאי", "שמעוני", "דוד", "בן דוד", "מלכה", "חיים",
    "עמר", "יוסף", "גולן", "נחום", "זגורי", "אלבז", "מור", "רוזן", "פלד", "שרון",
    "ברכה", "צדוק", "סבג", "בוזגלו", "אסרף", "טל", "אדרי", "עזרא", "סבן", "ממן",
    "טביב", "גרינברג", "שפירא", "ברגר", "שטרן", "וייס", "קפלן", "הרשקוביץ", "גלברד",
    "אלוני", "ישראלי", "מנשה", "חזן", "עטיה", "דיין", "מלול", "בכר", "שושן", "אמסלם",
]

FATHER_FIRST = [
    "אבי", "דוד", "יוסי", "משה", "חיים", "שמעון", "יעקב", "אהרון", "אלי", "רון",
    "מיכאל", "צבי", "ניסים", "שלמה", "יצחק", "בני", "רפי", "מנחם", "גדי", "ציון",
    "עמוס", "אייל", "אריה", "נחום", "זאב",
]
MOTHER_FIRST = [
    "רחל", "שרה", "מיכל", "לימור", "ענת", "אורלי", "סיגל", "הילה", "דנה", "אפרת",
    "יעל", "נועה", "שירי", "טלי", "קרן", "אורית", "גלית", "ליאת", "אושרת", "מורן",
    "רינת", "עינב", "שלומית", "מירב", "אילנה",
]

POSITIONS = ["PG", "SG", "SF", "PF", "C"]

HEIGHT_BASE = {
    (6, 7): 118, (8, 9): 130, (10, 11): 142,
    (12, 13): 155, (14, 15): 168, (15, 16): 172, (16, 18): 178,
}

OPPONENTS = [
    "הפועל תל אביב", "מכבי ראשון לציון", "הפועל חולון", "אליצור נתניה",
    "מכבי חיפה", "הפועל ירושלים", "עירוני נהריה", "מכבי אשדוד",
    "הפועל גליל עליון", "אליצור אשקלון", "מכבי רמת גן", "הפועל באר שבע",
    "מכבי קרית גת", "עירוני כפר סבא", "הפועל עפולה", "אליצור קרית אתא",
    "הפועל רמת השרון", "עירוני הרצליה", "מכבי רעננה", "הפועל כפר סבא",
]

DRILL_DATA = [
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
    "יכולת כדרור יד שמאל", "סיום מקרוב מגוון", "ראיית מגרש", "מסירה מדויקת",
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


# ══════════════════════════════════════════════════════════════════════
# Team generator
# ══════════════════════════════════════════════════════════════════════
def build_teams() -> list[dict]:
    """Generate 25 team configs from age-group definitions."""
    teams = []
    for prefix, code, age_range, suffixes, default_level in AGE_GROUP_DEFS:
        for i, suffix in enumerate(suffixes):
            if suffix.isdigit():
                name = f"{prefix}{suffix}"
                level = default_level
            else:
                name = f"{prefix} {suffix}"
                level = suffix.split()[0]  # "לאומית", "ארצית", "מחוזית"
            teams.append({
                "name": name,
                "age_group": code,
                "level": level,
                "age_range": age_range,
                "num_players": 14 + (i % 2),  # alternating 14/15
            })
    return teams


# ══════════════════════════════════════════════════════════════════════
# Main seed
# ══════════════════════════════════════════════════════════════════════
async def seed():
    TEAMS = build_teams()
    print(f"[INFO] Seeding {len(TEAMS)} teams, {len(COACHES_DATA)} coaches, {len(ADMINS)} admins")

    # ── Drop & recreate all tables ──
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created")

    async with AsyncSessionLocal() as db:
        # ════════════════════════════════════════════════════════════
        # 1. Admin Roles
        # ════════════════════════════════════════════════════════════
        admin_roles = []
        for name, desc in ADMIN_ROLES:
            r = AdminRole(name=name, description=desc, is_default=True, is_active=True)
            db.add(r)
            admin_roles.append(r)
        await db.flush()
        print(f"[OK] {len(admin_roles)} admin roles")

        # ════════════════════════════════════════════════════════════
        # 2. Admin Users (5)
        # ════════════════════════════════════════════════════════════
        admin_users = []
        for name, email, pw_hash, role_idx in ADMINS:
            u = User(
                name=name, email=email, password_hash=pw_hash, role="admin",
                phone=gen_phone(), date_of_birth=gen_birth(35, 60),
                admin_role_id=admin_roles[role_idx].id,
            )
            db.add(u)
            admin_users.append(u)
        await db.flush()
        admin_id = admin_users[0].id  # Primary admin for team creation
        for i, u in enumerate(admin_users):
            print(f"[OK] Admin: {u.email} (id={u.id}, role={ADMIN_ROLES[ADMINS[i][3]][0]})")

        # ════════════════════════════════════════════════════════════
        # 3. Facilities
        # ════════════════════════════════════════════════════════════
        facilities = []
        for fname, ftype, addr, cap in FACILITIES_DATA:
            f = Facility(admin_id=admin_id, name=fname, facility_type=ftype, address=addr, capacity=cap)
            db.add(f)
            facilities.append(f)
        await db.flush()
        print(f"[OK] {len(facilities)} facilities")

        # ════════════════════════════════════════════════════════════
        # 4. Create Teams (25)
        # ════════════════════════════════════════════════════════════
        team_objs = []
        for t_info in TEAMS:
            team = Team(
                name=t_info["name"], club_name=CLUB_NAME,
                age_group=t_info["age_group"], level=t_info["level"],
                created_by_admin_id=admin_id,
                coach_invite_code=gen_code(), coach_invite_token=gen_uuid(),
                player_invite_code=gen_code(), player_invite_token=gen_uuid(),
                parent_invite_code=gen_code(), parent_invite_token=gen_uuid(),
            )
            db.add(team)
            team_objs.append(team)
        await db.flush()
        print(f"[OK] {len(team_objs)} teams created")

        # ════════════════════════════════════════════════════════════
        # 5. Create Coaches (20) + link to teams
        # ════════════════════════════════════════════════════════════
        coach_objs = []   # Coach ORM objects (parallel to COACHES_DATA)
        coach_teams = {}  # coach_index → [team_index, ...]

        for ci, (c_name, c_email, c_team_indices) in enumerate(COACHES_DATA):
            # Primary team info for Coach model
            primary_team = TEAMS[c_team_indices[0]]

            coach_user = User(
                name=c_name, email=c_email, password_hash=PASSWORD_HASH, role="coach",
                phone=gen_phone(), date_of_birth=gen_birth(28, 55),
            )
            db.add(coach_user)
            await db.flush()

            coach = Coach(
                name=c_name, email=c_email, password_hash=PASSWORD_HASH,
                team_name=primary_team["name"],
                age_group=primary_team["age_group"],
                level=primary_team["level"],
                user_id=coach_user.id,
            )
            db.add(coach)
            await db.flush()

            # Link coach to all their teams
            for ti in c_team_indices:
                db.add(TeamMember(team_id=team_objs[ti].id, user_id=coach_user.id, role_in_team="coach"))

            coach_objs.append(coach)
            coach_teams[ci] = c_team_indices

        await db.flush()
        print(f"[OK] {len(coach_objs)} coaches")

        # Build reverse map: team_index → coach_obj
        team_coach_map = {}
        for ci, t_indices in coach_teams.items():
            for ti in t_indices:
                team_coach_map[ti] = coach_objs[ci]

        # ════════════════════════════════════════════════════════════
        # 6. Players + Parents (per team)
        # ════════════════════════════════════════════════════════════
        used_names = set()
        all_team_players = {}   # team_index → [Player, ...]
        all_coach_events = []   # (Event, Coach, [Player, ...])
        total_players = 0
        total_parents = 0

        for ti, t_info in enumerate(TEAMS):
            team = team_objs[ti]
            coach = team_coach_map[ti]
            min_age, max_age = t_info["age_range"]
            team_players = []

            for pi in range(t_info["num_players"]):
                # Unique name
                while True:
                    fn = random.choice(FIRST_NAMES_M)
                    ln = random.choice(LAST_NAMES)
                    full = f"{fn} {ln}"
                    if full not in used_names:
                        used_names.add(full)
                        break

                jersey = pi + 1
                pos = POSITIONS[pi % 5]
                bdate = gen_birth(min_age, max_age)
                player_email = f"{_translit(fn)}.{_translit(ln)}.t{ti}@player.hoops"
                parent_email = f"{_translit(ln)}.family{ti}{pi}@parents.hoops"

                h = HEIGHT_BASE.get(t_info["age_range"], 160) + random.randint(-8, 12)

                player = Player(
                    coach_id=coach.id, name=full, jersey_number=jersey, position=pos,
                    birth_date=bdate, height=h,
                    weight=round(h * 0.38 + random.uniform(-5, 8), 1),
                    gender="male",
                    phone=gen_phone() if min_age >= 12 else None,
                    email=player_email if min_age >= 12 else None,
                    parent_phone=gen_phone(), parent_email=parent_email,
                )
                db.add(player)
                await db.flush()

                # Player user account
                player_user = User(
                    name=full, email=player_email, password_hash=PASSWORD_HASH, role="player",
                    phone=player.phone, date_of_birth=bdate,
                )
                db.add(player_user)
                await db.flush()
                player.user_id = player_user.id
                await db.flush()

                # Player → team member
                db.add(TeamMember(team_id=team.id, user_id=player_user.id, role_in_team="player", player_id=player.id))

                # ── Parents (father + mother) ──
                father_name = f"{random.choice(FATHER_FIRST)} {ln}"
                mother_name = f"{random.choice(MOTHER_FIRST)} {ln}"
                for pname, suffix in [(father_name, "dad"), (mother_name, "mom")]:
                    p_email = f"{_translit(ln)}.{suffix}{ti}{pi}@parents.hoops"
                    parent_user = User(
                        name=pname, email=p_email, password_hash=PASSWORD_HASH, role="parent",
                        phone=gen_phone(), date_of_birth=gen_birth(30, 55),
                    )
                    db.add(parent_user)
                    await db.flush()
                    db.add(TeamMember(
                        team_id=team.id, user_id=parent_user.id,
                        role_in_team="parent", player_id=player.id,
                    ))
                    total_parents += 1

                team_players.append(player)
                total_players += 1

            all_team_players[ti] = team_players
            await db.flush()

            # ── Team Events (practices + games) ──
            today = date.today()
            practice_time = "17:00" if min_age <= 11 else "18:30" if min_age <= 14 else "19:30"
            practice_end = "18:30" if min_age <= 11 else "20:00" if min_age <= 14 else "21:00"

            # Past practices (8 weeks, 2x/week)
            for w in range(8, 0, -1):
                for day_offset in [1, 3]:
                    ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                    if ev_date >= today:
                        continue
                    fac = random.choice(facilities[:3])
                    db.add(TeamEvent(
                        team_id=team.id, created_by_admin_id=admin_id,
                        title=f"אימון {t_info['name']}", event_type="practice",
                        date=ev_date, time_start=practice_time, time_end=practice_end,
                        location=fac.name, facility_id=fac.id,
                    ))

            # Future practices (4 weeks)
            for w in range(4):
                for day_offset in [1, 3]:
                    ev_date = today + timedelta(weeks=w) + timedelta(days=day_offset)
                    fac = random.choice(facilities[:3])
                    db.add(TeamEvent(
                        team_id=team.id, created_by_admin_id=admin_id,
                        title=f"אימון {t_info['name']}", event_type="practice",
                        date=ev_date, time_start=practice_time, time_end=practice_end,
                        location=fac.name, facility_id=fac.id,
                    ))

            # Past games
            num_games = random.randint(3, 6)
            for g in range(num_games):
                g_date = today - timedelta(weeks=random.randint(1, 8), days=random.choice([5, 6]))
                opponent = random.choice(OPPONENTS)
                db.add(TeamEvent(
                    team_id=team.id, created_by_admin_id=admin_id,
                    title=f"משחק vs {opponent}", event_type="game",
                    date=g_date,
                    time_start="18:00" if min_age <= 11 else "20:00",
                    time_end="19:30" if min_age <= 11 else "21:30",
                    location=random.choice([facilities[0].name, "מגרש חוץ"]),
                    opponent=opponent,
                ))

            # Future games (2)
            for g in range(2):
                g_date = today + timedelta(weeks=g + 1, days=5)
                opponent = random.choice(OPPONENTS)
                db.add(TeamEvent(
                    team_id=team.id, created_by_admin_id=admin_id,
                    title=f"משחק vs {opponent}", event_type="game",
                    date=g_date,
                    time_start="18:00" if min_age <= 11 else "20:00",
                    time_end="19:30" if min_age <= 11 else "21:30",
                    location=facilities[0].name, opponent=opponent,
                ))

            await db.flush()

            # ── Coach Events (for attendance tracking) ──
            for w in range(8, 0, -1):
                for day_offset in [1, 3]:
                    ev_date = today - timedelta(weeks=w) + timedelta(days=day_offset)
                    if ev_date >= today:
                        continue
                    cev = Event(
                        coach_id=coach.id, date=ev_date, time=practice_time,
                        event_type="practice", title=f"אימון {t_info['name']}",
                        facility_id=random.choice(facilities[:3]).id,
                    )
                    db.add(cev)
                    all_coach_events.append((cev, coach, team_players))

            await db.flush()

            # ── Game Reports ──
            for _ in range(num_games):
                g_date = today - timedelta(weeks=random.randint(1, 8), days=random.choice([5, 6]))
                opponent = random.choice(OPPONENTS)
                result = random.choices(["win", "loss", "draw"], weights=[45, 40, 15])[0]
                if result == "win":
                    score_us = random.randint(45, 95)
                    score_them = score_us - random.randint(3, 20)
                elif result == "loss":
                    score_them = random.randint(45, 95)
                    score_us = score_them - random.randint(3, 20)
                else:
                    score_us = score_them = random.randint(45, 80)
                standouts = [p.name for p in random.sample(team_players, min(3, len(team_players)))]
                areas = random.sample(["הגנה באזור", "ריבאונד התקפי", "זריקות חופשיות",
                                       "טרנזישן", "מסירות תחת לחץ", "סגירות על שלוש", "משחק פוסט"], 2)
                db.add(GameReport(
                    coach_id=coach.id, date=g_date, opponent=opponent,
                    location=random.choice([facilities[0].name, "חוץ"]),
                    result=result, score_us=score_us, score_them=score_them,
                    standout_players=json.dumps(standouts), areas_to_improve=json.dumps(areas),
                    notes=f"{'ניצחון חשוב' if result == 'win' else 'הפסד מלמד' if result == 'loss' else 'תיקו צמוד'}. הקבוצה הראתה שיפור.",
                ))

            # ── Player Reports (~60%) ──
            for player in team_players:
                if random.random() > 0.6:
                    continue
                strengths = random.sample(STRENGTHS, 3)
                weaknesses = random.sample(WEAKNESSES, 2)
                focus = random.sample(FOCUS_AREAS, 2)
                db.add(PlayerReport(
                    coach_id=coach.id, player_id=player.id, period="2025-H2",
                    strengths=json.dumps(strengths), weaknesses=json.dumps(weaknesses),
                    focus_areas=json.dumps(focus),
                    progress_notes=f"{player.name} מראה שיפור עקבי. דגש על {focus[0]}.",
                    recommendations=f"עבודה אישית על {weaknesses[0]}. שילוב {focus[0]} באימונים.",
                    is_ai_generated=random.choice([True, False]),
                ))

            await db.flush()
            print(f"[OK] Team '{t_info['name']}': {len(team_players)} players, {len(team_players)*2} parents, {num_games} games")

        # ════════════════════════════════════════════════════════════
        # 7. Drills per coach + assignments
        # ════════════════════════════════════════════════════════════
        total_drills = 0
        total_assignments = 0
        for ci, coach in enumerate(coach_objs):
            drill_subset = random.sample(DRILL_DATA, min(8, len(DRILL_DATA)))
            coach_drills = []
            for title, cat, diff, dur, desc in drill_subset:
                video_url = random.choice([
                    "https://www.youtube.com/watch?v=sFd_K08RMeo",
                    "https://www.youtube.com/watch?v=RYnFIRc0k6E",
                    None, None, None,
                ])
                drill = Drill(
                    coach_id=coach.id, title=title, description=desc,
                    category=cat, difficulty=diff, duration_minutes=dur,
                    instructions=desc, tags=json.dumps([cat, diff]),
                    video_url=video_url,
                )
                db.add(drill)
                coach_drills.append(drill)

            await db.flush()
            total_drills += len(coach_drills)

            # Assign drills to players across all coach's teams
            for ti in coach_teams[ci]:
                players = all_team_players[ti]
                for drill in coach_drills:
                    roll = random.random()
                    if roll < 0.4:
                        assigned = players
                    elif roll < 0.7:
                        assigned = random.sample(players, min(random.randint(2, 5), len(players)))
                    else:
                        continue
                    for player in assigned:
                        is_done = random.random() < 0.35
                        db.add(DrillAssignment(
                            drill_id=drill.id, player_id=player.id,
                            team_id=team_objs[ti].id, coach_id=coach.id,
                            note=random.choice([None, None, "תתרגלו 3 פעמים", "חשוב לדייק"]),
                            is_completed=is_done,
                            completed_at=datetime.now() - timedelta(days=random.randint(1, 14)) if is_done else None,
                        ))
                        total_assignments += 1

            await db.flush()

        print(f"[OK] {total_drills} drills, {total_assignments} assignments")

        # ════════════════════════════════════════════════════════════
        # 8. Attendance records
        # ════════════════════════════════════════════════════════════
        att_count = 0
        for ev, coach_obj, players_list in all_coach_events:
            for player in players_list:
                present = random.random() < (0.75 + random.uniform(-0.15, 0.15))
                db.add(Attendance(
                    coach_id=coach_obj.id, event_id=ev.id, player_id=player.id,
                    present=present,
                    notes="חולה" if not present and random.random() < 0.3 else None,
                ))
                att_count += 1
        await db.flush()
        print(f"[OK] {att_count} attendance records")

        # ════════════════════════════════════════════════════════════
        # Commit
        # ════════════════════════════════════════════════════════════
        await db.commit()
        print(f"\n{'='*60}")
        print(f"[DONE] Seed complete!")
        print(f"  Club: {CLUB_NAME}")
        print(f"  Admins: {len(ADMINS)} (ohadc55@gmail.com / 6279986)")
        print(f"  Coaches: {len(COACHES_DATA)} (all / 123456)")
        print(f"  Teams: {len(TEAMS)}")
        print(f"  Players: {total_players}")
        print(f"  Parents: {total_parents}")
        print(f"  Attendance records: {att_count}")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(seed())
