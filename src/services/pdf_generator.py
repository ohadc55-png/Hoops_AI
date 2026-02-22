"""HOOPS AI - Invoice PDF Generator (fpdf2)"""
import io
from fpdf import FPDF


# Seller details (platform operator)
SELLER_INFO = {
    "name": "HOOPS AI Platform",
    "address": "Israel",
    "tax_id": "",
    "email": "billing@hoopsai.com",
}

INVOICE_TYPE_LABELS = {
    "tax_invoice": "Tax Invoice",
    "receipt": "Receipt",
    "credit_note": "Credit Note",
    "proforma": "Proforma Invoice",
    "quote": "Quote",
}


def _safe_text(text: str) -> str:
    """Strip non-latin-1 characters for Helvetica font compatibility."""
    if not text:
        return ""
    return text.encode("latin-1", errors="replace").decode("latin-1")


class InvoicePDF(FPDF):
    def __init__(self, invoice_data: dict):
        super().__init__()
        self.invoice = invoice_data
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        # Logo area
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(8, 145, 178)  # cyan-600
        self.cell(0, 12, "HOOPS AI", align="L")
        self.ln(8)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 5, "Basketball Coaching Platform", align="L")
        self.ln(12)

    def footer(self):
        self.set_y(-20)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} | HOOPS AI Platform", align="C")

    def build(self) -> bytes:
        inv = self.invoice
        self.alias_nb_pages()
        self.add_page()

        # ─── Document title ─────────────────────────
        type_label = INVOICE_TYPE_LABELS.get(inv.get("invoice_type", ""), inv.get("invoice_type", ""))
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(30, 30, 30)
        self.cell(0, 10, type_label, align="C")
        self.ln(8)

        # Invoice number + dates
        self.set_font("Helvetica", "", 10)
        self.set_text_color(80, 80, 80)
        self.cell(0, 6, f"Document #: {inv.get('invoice_number', '')}", align="C")
        self.ln(5)
        issue = inv.get("issue_date", "")
        self.cell(0, 6, f"Issue Date: {issue}", align="C")
        self.ln(5)
        if inv.get("due_date"):
            self.cell(0, 6, f"Due Date: {inv['due_date']}", align="C")
            self.ln(5)
        self.ln(8)

        # ─── Two-column: Seller | Buyer ─────────────
        self._draw_parties(inv)
        self.ln(10)

        # ─── Period ─────────────────────────────────
        if inv.get("period_start") or inv.get("period_end"):
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(100, 100, 100)
            period = f"Billing Period: {inv.get('period_start', '')} - {inv.get('period_end', '')}"
            self.cell(0, 6, period, align="L")
            self.ln(8)

        # ─── Line items table ───────────────────────
        self._draw_line_items(inv.get("line_items", []))
        self.ln(4)

        # ─── Totals ─────────────────────────────────
        self._draw_totals(inv)

        # ─── Notes ──────────────────────────────────
        if inv.get("notes"):
            self.ln(10)
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(100, 100, 100)
            self.cell(0, 5, "Notes:", align="L")
            self.ln(5)
            self.set_font("Helvetica", "", 9)
            self.multi_cell(0, 5, _safe_text(inv["notes"]))

        # ─── Reference ─────────────────────────────
        if inv.get("reference_invoice_id"):
            self.ln(6)
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(100, 100, 100)
            ref_text = f"Reference: Invoice #{inv.get('reference_invoice_id', '')}"
            self.cell(0, 5, ref_text, align="L")

        # ─── Status badge ──────────────────────────
        status = inv.get("status", "")
        if status == "paid":
            self.ln(12)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(34, 197, 94)
            self.cell(0, 10, "PAID", align="C")

        # Output
        buf = io.BytesIO()
        self.output(buf)
        return buf.getvalue()

    def _draw_parties(self, inv: dict):
        """Draw seller and buyer info side by side."""
        y = self.get_y()
        half_w = (self.w - 20) / 2

        # Seller
        self.set_xy(10, y)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(half_w, 5, "FROM:", align="L")
        self.ln(5)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(50, 50, 50)
        self.set_x(10)
        self.cell(half_w, 5, SELLER_INFO["name"], align="L")
        self.ln(4)
        self.set_x(10)
        self.cell(half_w, 5, SELLER_INFO["address"], align="L")
        self.ln(4)
        self.set_x(10)
        self.cell(half_w, 5, SELLER_INFO["email"], align="L")
        seller_bottom = self.get_y()

        # Buyer
        self.set_xy(10 + half_w, y)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(half_w, 5, "TO:", align="L")
        self.ln(5)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(50, 50, 50)
        self.set_x(10 + half_w)
        self.cell(half_w, 5, _safe_text(inv.get("billing_name", "")), align="L")
        self.ln(4)
        if inv.get("billing_email"):
            self.set_x(10 + half_w)
            self.cell(half_w, 5, _safe_text(inv["billing_email"]), align="L")
            self.ln(4)
        if inv.get("billing_tax_id"):
            self.set_x(10 + half_w)
            self.cell(half_w, 5, f"Tax ID: {_safe_text(inv['billing_tax_id'])}", align="L")
            self.ln(4)
        buyer_bottom = self.get_y()

        self.set_y(max(seller_bottom, buyer_bottom) + 4)

    def _draw_line_items(self, items: list[dict]):
        """Draw the line items table."""
        # Table header
        self.set_fill_color(8, 145, 178)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 9)

        col_widths = [90, 25, 35, 40]  # description, qty, unit price, total
        headers = ["Description", "Qty", "Unit Price", "Total"]
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=0, fill=True, align="C" if i > 0 else "L")
        self.ln()

        # Rows
        self.set_text_color(50, 50, 50)
        self.set_font("Helvetica", "", 9)
        fill = False
        for item in items:
            if fill:
                self.set_fill_color(245, 245, 245)
            else:
                self.set_fill_color(255, 255, 255)

            self.cell(col_widths[0], 7, _safe_text(item.get("description", ""))[:60], fill=True, align="L")
            self.cell(col_widths[1], 7, str(item.get("quantity", 1)), fill=True, align="C")
            self.cell(col_widths[2], 7, f"{abs(item.get('unit_price', 0)):,.2f}", fill=True, align="R")
            self.cell(col_widths[3], 7, f"{abs(item.get('total', 0)):,.2f}", fill=True, align="R")
            self.ln()
            fill = not fill

        # Bottom line
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), self.w - 10, self.get_y())

    def _draw_totals(self, inv: dict):
        """Draw subtotal, VAT, and total."""
        x_label = self.w - 85
        x_value = self.w - 50

        self.set_font("Helvetica", "", 10)
        self.set_text_color(80, 80, 80)

        # Subtotal
        self.set_x(x_label)
        self.cell(35, 7, "Subtotal:", align="R")
        self.cell(40, 7, f"{inv.get('currency', 'ILS')} {abs(inv.get('subtotal', 0)):,.2f}", align="R")
        self.ln()

        # VAT
        vat_rate = inv.get("vat_rate", 17)
        self.set_x(x_label)
        self.cell(35, 7, f"VAT ({vat_rate}%):", align="R")
        self.cell(40, 7, f"{inv.get('currency', 'ILS')} {abs(inv.get('vat_amount', 0)):,.2f}", align="R")
        self.ln()

        # Total
        self.set_draw_color(8, 145, 178)
        self.line(x_label, self.get_y(), self.w - 10, self.get_y())
        self.ln(2)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(8, 145, 178)
        self.set_x(x_label)
        self.cell(35, 9, "Total:", align="R")
        self.cell(40, 9, f"{inv.get('currency', 'ILS')} {abs(inv.get('total', 0)):,.2f}", align="R")


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate a PDF for an invoice. Returns bytes."""
    pdf = InvoicePDF(invoice_data)
    return pdf.build()
