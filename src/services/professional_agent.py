"""HOOPS AI - Professional AI Agent
Analyzes player reports, attendance, development, team performance."""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.insight_data_collector import InsightDataCollector
from src.utils.openai_client import chat_completion


PROFESSIONAL_SYSTEM_PROMPT = """אתה האנליסט המקצועי של מועדון כדורסל נוער.
תפקידך: לנתח דוחות מאמנים, נוכחות שחקנים, התפתחות מקצועית, ולתת תובנות.

כללים:
- דבר בעברית
- היה מקצועי וספציפי — ציין שמות שחקנים, מספרים, מגמות
- זהה דפוסים: שחקנים מתפתחים, שחקנים בסיכון, מאמנים פעילים/לא פעילים
- נוכחות נמוכה = דגל אדום (חולה? בעיה? סכנת עזיבה?)
- הצע פעולות קונקרטיות למנהל המקצועי

סיווג שחקנים:
- ⭐ כוכב עולה — ביצועים מעולים, מגמת שיפור
- ✅ יציב — ביצועים טובים, עקבי
- ⚠️ דורש תשומת לב — ירידה בביצועים או נוכחות
- 🔴 סיכון — נוכחות נמוכה מאוד, אין שיפור, סכנת עזיבה

פורמט:
- כותרות עם emoji
- שמות וצוותי שחקנים ספציפיים
- מספרים ואחוזים
- המלצות ממוספרות
"""


class ProfessionalAgent:
    def __init__(self, session: AsyncSession):
        self.collector = InsightDataCollector(session)
        self.session = session

    async def get_dashboard_insights(self, admin_id: int) -> dict:
        """Auto-generated insights for dashboard."""
        data = await self.collector.get_professional_snapshot(admin_id)
        alerts = await self.collector.get_attendance_alerts(admin_id)

        prompt = f"""נתוני המועדון:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

התראות נוכחות:
{json.dumps(alerts[:10], ensure_ascii=False, indent=2)}

צור סיכום מקצועי קצר (5-8 שורות):
1. מצב כללי של המועדון (פעילות מאמנים, מספר דוחות)
2. שחקנים שדורשים תשומת לב (נוכחות/ביצועים)
3. קבוצה בולטת לטוב / לרע
4. המלצה דחופה אחת
"""
        response = await chat_completion(
            messages=[
                {"role": "system", "content": PROFESSIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
        )
        return {
            "insights": response,
            "alert_count": len(alerts),
            "data": data,
        }

    async def generate_weekly_report(self, admin_id: int) -> str:
        """Full weekly professional report."""
        data = await self.collector.get_professional_snapshot(admin_id)
        alerts = await self.collector.get_attendance_alerts(admin_id)

        prompt = f"""צור דוח מקצועי שבועי מפורט.

נתונים:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

התראות נוכחות:
{json.dumps(alerts, ensure_ascii=False, indent=2)}

הדוח צריך לכלול:
1. 📊 סיכום מקצועי — מצב כללי, פעילות מאמנים, מספר דוחות שהוגשו
2. 🏀 סקירת קבוצות — מצב כל קבוצה, מגמות
3. ⭐ שחקנים בולטים — כוכבים עולים, שחקנים מתפתחים
4. ⚠️ שחקנים בסיכון — נוכחות נמוכה, ירידה בביצועים, סכנת עזיבה
   לכל שחקן בסיכון: המלצה ספציפית (ליצור קשר? שיחה עם ההורים? בדיקה רפואית?)
5. 👨‍🏫 פעילות מאמנים — מי מגיש דוחות, מי לא (מאמן שלא הגיש דוח 2+ שבועות = דגל)
6. ✅ המלצות — פעולות קונקרטיות (מקסימום 3)
"""
        return await chat_completion(
            messages=[
                {"role": "system", "content": PROFESSIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2500,
        )

    async def get_player_card(self, player_id: int) -> dict:
        """AI-generated player card — comprehensive summary."""
        data = await self.collector.get_player_card_data(player_id)

        if not data.get("player") or not data["player"].get("name"):
            return {"player_id": player_id, "player_data": {}, "ai_analysis": "שחקן לא נמצא."}

        prompt = f"""צור "כרטיס שחקן" — סיכום AI מקצועי על השחקן הבא:

{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

הכרטיס צריך לכלול:
1. פרופיל — שם, גיל, עמדה, קבוצה
2. סיווג — ⭐/✅/⚠️/🔴 עם הסבר
3. חוזקות (2-3)
4. נקודות לשיפור (2-3)
5. מגמת נוכחות — טוב/בעייתי + אחוז
6. סיכום דוחות אחרונים — מה המאמן כותב
7. המלצה למנהל המקצועי — מה כדאי לעשות עם השחקן הזה
"""
        response = await chat_completion(
            messages=[
                {"role": "system", "content": PROFESSIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=1500,
        )
        return {
            "player_id": player_id,
            "player_data": data.get("player", {}),
            "ai_analysis": response,
        }

    async def chat(self, admin_id: int, user_message: str, history: list | None = None) -> str:
        """Free chat with professional agent."""
        data = await self.collector.get_professional_snapshot(admin_id)

        context = f"""נתוני המועדון:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}
"""
        messages = [
            {"role": "system", "content": PROFESSIONAL_SYSTEM_PROMPT + "\n\nהקשר:\n" + context},
        ]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        return await chat_completion(messages=messages, max_tokens=1500)

    async def send_attendance_alerts(self, admin_id: int) -> int:
        """Send alerts about players with concerning attendance."""
        alerts = await self.collector.get_attendance_alerts(admin_id)
        if not alerts:
            return 0

        prompt = f"""הנה שחקנים עם בעיות נוכחות:
{json.dumps(alerts, ensure_ascii=False, indent=2)}

כתוב הודעת התראה קצרה (5-8 שורות) למנהל המקצועי שמסכמת:
- כמה שחקנים בבעיה
- מי הדחופים ביותר
- המלצה לפעולה מיידית
"""
        response = await chat_completion(
            messages=[
                {"role": "system", "content": PROFESSIONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
        )

        from src.services.messaging_service import MessagingService
        msg_service = MessagingService(self.session)

        try:
            await msg_service.send_message(
                sender_id=admin_id,
                sender_role="admin",
                subject="התראת נוכחות — סוכן AI מקצועי",
                body=response,
                message_type="urgent",
                target_type="individual",
                target_user_id=admin_id,
            )
        except Exception:
            pass

        return len(alerts)
