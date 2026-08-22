"""Shared PDF rendering helpers — report cards, ID cards, transfer certificates,
and fee receipts. Built on reportlab (pure-Python, no system binary dependency,
unlike wkhtmltopdf/weasyprint) so it runs the same on the dev box and in prod.

Every ``render_*`` function returns raw PDF bytes; callers wrap them in a
FastAPI ``Response(content=..., media_type="application/pdf")``.
"""
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

_STYLES = getSampleStyleSheet()
_TITLE = ParagraphStyle(
    "SutramTitle", parent=_STYLES["Title"], fontSize=18, spaceAfter=2, textColor=colors.HexColor("#1e293b")
)
_SUBTITLE = ParagraphStyle(
    "SutramSubtitle", parent=_STYLES["Normal"], fontSize=10, textColor=colors.HexColor("#64748b")
)
_DOC_TITLE = ParagraphStyle(
    "SutramDocTitle",
    parent=_STYLES["Heading2"],
    fontSize=13,
    spaceBefore=14,
    spaceAfter=10,
    textColor=colors.HexColor("#1e293b"),
)
_BODY = ParagraphStyle("SutramBody", parent=_STYLES["Normal"], fontSize=10, leading=14)
_FOOTER = ParagraphStyle(
    "SutramFooter", parent=_STYLES["Normal"], fontSize=8, textColor=colors.HexColor("#94a3b8")
)

_ACCENT = colors.HexColor("#4f46e5")
_ROW_ALT = colors.HexColor("#f8fafc")
_BORDER = colors.HexColor("#e2e8f0")


def _header(institution_name: str, document_title: str) -> list:
    return [
        Paragraph(institution_name, _TITLE),
        Paragraph("Powered by Sutram — Pragyaan Labs", _SUBTITLE),
        HRFlowable(width="100%", thickness=1.4, color=_ACCENT, spaceBefore=8, spaceAfter=4),
        Paragraph(document_title, _DOC_TITLE),
    ]


def _kv_table(rows: list[tuple[str, str]], col_widths: tuple[float, float] = (150, 320)) -> Table:
    data = [[Paragraph(f"<b>{label}</b>", _BODY), Paragraph(str(value), _BODY)] for label, value in rows]
    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, 0), (-1, -1), 0.4, _BORDER),
            ]
        )
    )
    return table


def _footer_note(text: str) -> Paragraph:
    return Paragraph(f"{text} · Generated {datetime.now():%d %b %Y, %I:%M %p}", _FOOTER)


def _build(story: list) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )
    doc.build(story)
    return buffer.getvalue()


def render_report_card(
    *,
    institution_name: str,
    student_name: str,
    admission_number: str,
    results: list[dict],
    cgpa: float | None,
) -> bytes:
    story = _header(institution_name, "Academic Report Card")
    story.append(_kv_table([("Student Name", student_name), ("Admission Number", admission_number)]))
    story.append(Spacer(1, 16))

    header_row = ["Exam", "Type", "Max Marks", "Marks Obtained", "Grade", "Grade Point"]
    rows = [header_row]
    for r in results:
        rows.append(
            [
                r["exam_name"],
                r["exam_type"],
                str(r["max_marks"]),
                "-" if r["marks_obtained"] is None else str(r["marks_obtained"]),
                r["grade"] or "-",
                "-" if r["grade_point"] is None else f'{r["grade_point"]:.2f}',
            ]
        )
    table = Table(rows, colWidths=[130, 80, 65, 90, 55, 70], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), _ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, _BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), _ROW_ALT))
    table.setStyle(TableStyle(style))
    story.append(table)
    story.append(Spacer(1, 20))

    cgpa_text = "Not yet graded" if cgpa is None else f"{cgpa:.2f} / 10.0"
    story.append(Paragraph(f"<b>Overall CGPA:</b> {cgpa_text}", _BODY))
    story.append(Spacer(1, 30))
    story.append(_footer_note("This is a system-generated report card"))
    return _build(story)


def render_id_card(
    *,
    institution_name: str,
    student_name: str,
    admission_number: str,
    status: str,
    date_of_birth: date | None,
    blood_group: str | None = None,
) -> bytes:
    # Sized generously above CR80 (credit-card) dimensions so five text rows
    # at small-but-legible sizes fit on a single page without reportlab
    # silently spilling onto a second page — explicit `leading` on every style
    # is what actually prevents that (inherited stylesheet leading runs tall).
    card_width, card_height = 3.6 * inch, 2.4 * inch
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(card_width, card_height),
        topMargin=8,
        bottomMargin=8,
        leftMargin=10,
        rightMargin=10,
    )
    name_style = ParagraphStyle(
        "IDName", fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=colors.white
    )
    inst_style = ParagraphStyle(
        "IDInst", fontName="Helvetica", fontSize=7, leading=9, textColor=colors.HexColor("#e0e7ff")
    )
    field_style = ParagraphStyle("IDField", fontName="Helvetica", fontSize=8, leading=11)

    header = Table(
        [[Paragraph(institution_name.upper(), inst_style)], [Paragraph("STUDENT IDENTITY CARD", name_style)]],
        colWidths=[card_width - 20],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), _ACCENT),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    dob_text = date_of_birth.strftime("%d %b %Y") if date_of_birth else "-"
    body_rows = [
        [Paragraph(f"<b>{student_name}</b>", field_style)],
        [Paragraph(f"Admission No: {admission_number}", field_style)],
        [Paragraph(f"Date of Birth: {dob_text}", field_style)],
        [Paragraph(f"Blood Group: {blood_group or '-'}", field_style)],
        [Paragraph(f"Status: {status.title()}", field_style)],
    ]
    body = Table(body_rows, colWidths=[card_width - 20])
    body.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))

    doc.build([header, Spacer(1, 4), body])
    return buffer.getvalue()


def render_transfer_certificate(
    *,
    institution_name: str,
    student_name: str,
    admission_number: str,
    date_of_birth: date | None,
    admission_date_display: str,
    issue_date: date,
    reason: str,
    conduct: str,
) -> bytes:
    story = _header(institution_name, "Transfer Certificate")
    dob_text = date_of_birth.strftime("%d %B %Y") if date_of_birth else "Not on record"
    story.append(
        _kv_table(
            [
                ("Student Name", student_name),
                ("Admission Number", admission_number),
                ("Date of Birth", dob_text),
                ("Date of Admission", admission_date_display),
                ("Date of Issue", issue_date.strftime("%d %B %Y")),
                ("Conduct", conduct),
                ("Reason for Leaving", reason),
            ]
        )
    )
    story.append(Spacer(1, 40))
    story.append(
        Paragraph(
            "This is to certify that the above particulars are true as per the "
            "records of the institution.",
            _BODY,
        )
    )
    story.append(Spacer(1, 50))
    story.append(Paragraph("_______________________<br/>Principal / Registrar", _BODY))
    story.append(Spacer(1, 20))
    story.append(_footer_note("This is a system-generated certificate"))
    return _build(story)


def render_fee_receipt(
    *,
    institution_name: str,
    student_name: str,
    admission_number: str,
    invoice_number: str,
    payment_amount: Decimal,
    payment_date: date,
    payment_method: str,
    reference_number: str | None,
    invoice_amount: Decimal,
    total_paid: Decimal,
) -> bytes:
    story = _header(institution_name, "Fee Payment Receipt")
    outstanding = invoice_amount - total_paid
    story.append(
        _kv_table(
            [
                ("Student Name", student_name),
                ("Admission Number", admission_number),
                ("Invoice Number", invoice_number),
                ("Amount Paid", f"Rs. {payment_amount:,.2f}"),
                ("Payment Date", payment_date.strftime("%d %B %Y")),
                ("Payment Method", payment_method.replace("_", " ").title()),
                ("Reference Number", reference_number or "-"),
                ("Invoice Total", f"Rs. {invoice_amount:,.2f}"),
                ("Total Paid to Date", f"Rs. {total_paid:,.2f}"),
                ("Outstanding Balance", f"Rs. {max(outstanding, Decimal('0')):,.2f}"),
            ]
        )
    )
    story.append(Spacer(1, 40))
    story.append(_footer_note("This is a system-generated receipt and does not require a signature"))
    return _build(story)
