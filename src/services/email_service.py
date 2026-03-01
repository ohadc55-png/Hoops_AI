"""HOOPS AI - Email Service (SMTP)"""
import logging
from email.message import EmailMessage
from email.utils import formataddr
import aiosmtplib
from config import get_settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    s = get_settings()
    return bool(s.SMTP_HOST and s.SMTP_USER and s.SMTP_PASSWORD)


async def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    attachments: list[tuple[str, bytes, str]] | None = None,
) -> bool:
    """Send an email via SMTP.

    attachments: list of (filename, content_bytes, mime_type)
    Returns True on success, False on failure.
    """
    if not _is_configured():
        return False

    s = get_settings()

    msg = EmailMessage()
    msg["From"] = formataddr((s.SMTP_FROM_NAME, s.SMTP_FROM_EMAIL))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_html, subtype="html")

    if attachments:
        for filename, content, mime in attachments:
            maintype, subtype = mime.split("/", 1)
            msg.add_attachment(
                content,
                maintype=maintype,
                subtype=subtype,
                filename=filename,
            )

    try:
        await aiosmtplib.send(
            msg,
            hostname=s.SMTP_HOST,
            port=s.SMTP_PORT,
            username=s.SMTP_USER,
            password=s.SMTP_PASSWORD,
            start_tls=s.SMTP_USE_TLS,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_invoice_email(
    to_email: str,
    club_name: str,
    invoice_number: str,
    invoice_type: str,
    total: float,
    due_date_str: str,
    pdf_bytes: bytes,
) -> bool:
    """Send an invoice notification email with PDF attachment."""
    type_labels = {
        "tax_invoice": "חשבונית מס",
        "receipt": "קבלה",
        "credit_note": "זיכוי",
        "quote": "הצעת מחיר",
    }
    type_label = type_labels.get(invoice_type, invoice_type)

    subject = f"HOOPS AI — {type_label} #{invoice_number}"

    body_html = f"""
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0891B2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">HOOPS AI</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">שלום,</p>
            <p>{type_label} חדשה הופקה עבור <strong>{club_name}</strong>.</p>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">מספר מסמך:</td>
                        <td style="padding: 8px 0; font-weight: 600;">{invoice_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">סוג:</td>
                        <td style="padding: 8px 0;">{type_label}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">סכום כולל:</td>
                        <td style="padding: 8px 0; font-weight: 700; font-size: 18px; color: #0891B2;">₪{total:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280;">תאריך פירעון:</td>
                        <td style="padding: 8px 0;">{due_date_str}</td>
                    </tr>
                </table>
            </div>

            <p>ה-PDF מצורף למייל זה.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                בברכה,<br>צוות HOOPS AI
            </p>
        </div>
    </div>
    """

    pdf_filename = f"{invoice_type}_{invoice_number}.pdf"
    return await send_email(
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        attachments=[(pdf_filename, pdf_bytes, "application/pdf")],
    )
