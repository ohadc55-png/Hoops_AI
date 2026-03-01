"""HOOPS AI - Financial AI Agent
Analyzes billing data, sends reminders, generates financial reports."""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.insight_data_collector import InsightDataCollector
from src.utils.openai_client import chat_completion


FINANCIAL_SYSTEM_PROMPT = """אתה האנליסט הכלכלי של מועדון כדורסל.
תפקידך: לנתח נתוני תשלומים, לזהות בעיות, לתת המלצות ולהציג מידע בצורה ברורה.

כללים:
- דבר בעברית
- היה ישיר ותכליתי
- השתמש במספרים ואחוזים
- ציין בעיות דחופות בתחילת התשובה
- הצע פעולות קונקרטיות (לא כלליות)
- כשמדובר בהורה ספציפי — ציין שם, סכום, כמה ימים באיחור
- כשמשווה חודשים — ציין שיפור/הרעה באחוזים

פורמט תשובה:
- כותרות עם emoji מתאים
- מספרים בולטים
- המלצות ממוספרות
- סיכום קצר בסוף
"""


class FinancialAgent:
    def __init__(self, session: AsyncSession):
        self.collector = InsightDataCollector(session)
        self.session = session

    async def get_dashboard_insights(self, admin_id: int) -> dict:
        """Auto-generated insights for dashboard display."""
        data = await self.collector.get_financial_snapshot(admin_id)
        summary = data["summary"]

        prompt = f"""נתוני המועדון:
סה"כ חיובים: ₪{summary.get('total_charged', 0):,.0f}
שולם: ₪{summary.get('total_paid', 0):,.0f}
ממתין: ₪{summary.get('total_pending', 0):,.0f}
באיחור: ₪{summary.get('total_overdue', 0):,.0f}
אחוז גבייה: {summary.get('collection_rate', 0)}%

פירוט לפי קבוצות:
{json.dumps(data['teams'], ensure_ascii=False, indent=2)}

הורים באיחור:
{json.dumps(data['overdue_details'][:10], ensure_ascii=False, indent=2)}

צור סיכום כלכלי קצר (5-8 שורות) עם:
1. מצב כללי (טוב/בינוני/דורש טיפול)
2. הקבוצה עם הגבייה הנמוכה ביותר
3. כמה הורים באיחור משמעותי (7+ ימים)
4. המלצה אחת דחופה
"""
        response = await chat_completion(
            messages=[
                {"role": "system", "content": FINANCIAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
        )
        return {
            "insights": response,
            "data": summary,
            "overdue_count": len(data["overdue_details"]),
        }

    async def generate_weekly_report(self, admin_id: int) -> str:
        """Full weekly financial report."""
        data = await self.collector.get_financial_snapshot(admin_id)
        reminders = await self.collector.get_payment_reminders_needed(admin_id)

        prompt = f"""צור דוח כלכלי שבועי מפורט עבור מנהל מועדון כדורסל.

נתונים נוכחיים:
{json.dumps(data, ensure_ascii=False, indent=2, default=str)}

הורים הדורשים תזכורת ({len(reminders)}):
{json.dumps(reminders[:20], ensure_ascii=False, indent=2)}

הדוח צריך לכלול:
1. 💰 סיכום כלכלי — מצב כללי, אחוז גבייה
2. 🏀 פירוט לפי קבוצות — איזו קבוצה מובילה, איזו מפגרת
3. ⚠️ התראות — הורים באיחור משמעותי (7+ ימים), הורים שחייבים 2+ חודשים
4. 📈 מגמות — האם הגבייה משתפרת או מידרדרת
5. ✅ המלצות — פעולות קונקרטיות למנהל (מקסימום 3)
"""
        return await chat_completion(
            messages=[
                {"role": "system", "content": FINANCIAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
        )

    async def chat(self, admin_id: int, user_message: str, history: list | None = None) -> str:
        """Free chat with financial agent — uses full per-player billing data."""
        data = await self.collector.get_rich_financial_context(admin_id)

        summary_data = json.dumps(data["summary"], ensure_ascii=False, default=str)
        teams_data = json.dumps(data["teams"], ensure_ascii=False, default=str)
        overdue_data = json.dumps(data["overdue_details"][:20], ensure_ascii=False, default=str)
        player_billing_data = json.dumps(data["player_billing"][:40], ensure_ascii=False, default=str)

        context = f"""=== נתוני חיוב מלאים של המועדון ===

סיכום כללי:
{summary_data}

פירוט לפי קבוצות:
{teams_data}

פירוט חיוב לפי שחקן ({len(data['player_billing'])} שחקנים):
{player_billing_data}

פירוט חובות פגי תוקף (overdue):
{overdue_data}
"""
        if len(context) > 10000:
            context = context[:10000] + "\n[נתונים נחתכו]"

        messages = [
            {"role": "system", "content": FINANCIAL_SYSTEM_PROMPT + "\n\n" + context},
        ]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        return await chat_completion(messages=messages, max_tokens=2000)

    async def send_payment_reminders(self, admin_id: int) -> int:
        """Send reminders to parents with overdue/upcoming charges via messaging system."""
        reminders = await self.collector.get_payment_reminders_needed(admin_id)
        if not reminders:
            return 0

        from src.services.messaging_service import MessagingService
        msg_service = MessagingService(self.session)

        sent = 0
        # Group by parent (skip entries with no linked parent)
        by_parent: dict[int, dict] = {}
        for r in reminders:
            pid = r.get("parent_user_id")
            if not pid:
                continue
            if pid not in by_parent:
                by_parent[pid] = {"name": r["parent_name"], "charges": []}
            by_parent[pid]["charges"].append(r)

        for pid, info in by_parent.items():
            total = sum(c["amount"] for c in info["charges"])
            titles = ", ".join(c["title"] for c in info["charges"][:3])
            is_overdue = any(c["status"] == "overdue" for c in info["charges"])

            if is_overdue:
                body = f"שלום {info['name']},\n\nיש לך חיובים באיחור בסך ₪{total:.0f} ({titles}).\nנא להסדיר את התשלום בהקדם.\n\nבברכה,\nהנהלת המועדון"
                msg_type = "urgent"
            else:
                body = f"שלום {info['name']},\n\nתזכורת: מועד התשלום עבור {titles} (₪{total:.0f}) מתקרב.\n\nבברכה,\nהנהלת המועדון"
                msg_type = "update"

            try:
                await msg_service.send_message(
                    sender_id=admin_id,
                    sender_role="admin",
                    subject="תזכורת תשלום" if not is_overdue else "תשלום באיחור",
                    body=body,
                    message_type=msg_type,
                    target_type="individual",
                    target_user_id=pid,
                )
                sent += 1
            except Exception:
                pass

        return sent
