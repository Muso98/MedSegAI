import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from app.core.config import settings
from loguru import logger


# ─── Translations for PDF content ────────────────────────────────────────────

PDF_STRINGS = {
    "uz": {
        "report_title": "MedSegAI — Tibbiy Tahlil Hisoboti",
        "generated": "Yaratilgan",
        "patient_info": "Bemor Ma'lumotlari",
        "full_name": "Ism, Familiya",
        "patient_id": "Bemor ID",
        "dob": "Tug'ilgan sana",
        "gender": "Jinsi",
        "male": "Erkak",
        "female": "Ayol",
        "other": "Boshqa",
        "study_info": "Tasvir Ma'lumotlari",
        "image_id": "Tasvir ID",
        "format": "Format",
        "original_file": "Yuklangan fayl",
        "analysis_date": "Tahlil sanasi",
        "processing_time": "Qayta ishlash vaqti",
        "ai_model": "AI Model",
        "seconds": "soniya",
        "ai_results": "Segmentatsiya Natijalari",
        "metric": "Ko'rsatkich",
        "value": "Qiymat",
        "tumor_present_yes": "HA — O'sma aniqlandi",
        "tumor_present_no": "YO'Q — O'sma aniqlanmadi",
        "tumor_presence": "O'sma mavjudligi",
        "tumor_area_px": "O'sma maydoni (piksel)",
        "tumor_area_pct": "O'sma maydoni (%)",
        "tumor_volume": "O'sma hajmi (cm³)",
        "confidence": "Ishonchlilik darajasi",
        "validation": "Validatsiya holati",
        "overlay_title": "Segmentatsiya Tasviri (AI Overlay)",
        "disclaimer": (
            "DIQQAT: Ushbu natijalar faqat tibbiy ko'mak sifatida taqdim etiladi. "
            "Yakuniy tashxis faqat malakali shifokor tomonidan qo'yilishi kerak. "
            "AI natijalari 100% aniqlikni kafolatlamaydi."
        ),
        "validation_notes": "Ekspert Xulosasi",
        "confidential": "MAXFIY — TIBBIY HUJJAT",
        "page": "Sahifa",
    },
    "en": {
        "report_title": "MedSegAI — Clinical Analysis Report",
        "generated": "Generated",
        "patient_info": "Patient Information",
        "full_name": "Full Name",
        "patient_id": "Patient ID",
        "dob": "Date of Birth",
        "gender": "Gender",
        "male": "Male",
        "female": "Female",
        "other": "Other",
        "study_info": "Study Information",
        "image_id": "Image ID",
        "format": "Format",
        "original_file": "Original File",
        "analysis_date": "Analysis Date",
        "processing_time": "Processing Time",
        "ai_model": "AI Model",
        "seconds": "seconds",
        "ai_results": "Segmentation Results",
        "metric": "Metric",
        "value": "Value",
        "tumor_present_yes": "YES — Tumor Detected",
        "tumor_present_no": "NO — No Tumor Detected",
        "tumor_presence": "Tumor Presence",
        "tumor_area_px": "Tumor Area (pixels)",
        "tumor_area_pct": "Tumor Area (%)",
        "tumor_volume": "Tumor Volume (cm³)",
        "confidence": "Confidence Score",
        "validation": "Validation Status",
        "overlay_title": "Segmentation Image (AI Overlay)",
        "disclaimer": (
            "WARNING: These results are provided as clinical decision support only. "
            "The final diagnosis must be made by a qualified physician. "
            "AI results do not guarantee 100% accuracy."
        ),
        "validation_notes": "Expert Clinical Notes",
        "confidential": "CONFIDENTIAL — MEDICAL DOCUMENT",
        "page": "Page",
    },
    "ru": {
        "report_title": "MedSegAI — Клинический отчёт об анализе",
        "generated": "Создан",
        "patient_info": "Данные пациента",
        "full_name": "ФИО",
        "patient_id": "ID пациента",
        "dob": "Дата рождения",
        "gender": "Пол",
        "male": "Мужской",
        "female": "Женский",
        "other": "Другой",
        "study_info": "Данные исследования",
        "image_id": "ID снимка",
        "format": "Формат",
        "original_file": "Оригинальный файл",
        "analysis_date": "Дата анализа",
        "processing_time": "Время обработки",
        "ai_model": "AI модель",
        "seconds": "секунды",
        "ai_results": "Результаты сегментации",
        "metric": "Показатель",
        "value": "Значение",
        "tumor_present_yes": "ДА — Опухоль обнаружена",
        "tumor_present_no": "НЕТ — Опухоль не обнаружена",
        "tumor_presence": "Наличие опухоли",
        "tumor_area_px": "Площадь опухоли (пиксели)",
        "tumor_area_pct": "Площадь опухоли (%)",
        "tumor_volume": "Объём опухоли (cm³)",
        "confidence": "Уверенность AI",
        "validation": "Статус валидации",
        "overlay_title": "Снимок сегментации (AI наложение)",
        "disclaimer": (
            "ВНИМАНИЕ: Данные результаты предоставляются исключительно как клиническая поддержка. "
            "Окончательный диагноз должен быть поставлен квалифицированным врачом. "
            "Результаты AI не гарантируют 100% точности."
        ),
        "validation_notes": "Заключение эксперта",
        "confidential": "КОНФИДЕНЦИАЛЬНО — МЕДИЦИНСКИЙ ДОКУМЕНТ",
        "page": "Страница",
    },
}


async def generate_pdf_report(result, study, db, lang: str = "uz") -> str:
    """Generate a multilingual clinical PDF report and return the saved file path."""
    from app.models.patient import Patient
    from sqlalchemy import select

    pat_res = await db.execute(select(Patient).where(Patient.id == study.patient_id))
    patient = pat_res.scalar_one_or_none()

    report_dir = os.path.join(settings.MEDIA_ROOT, "reports")
    os.makedirs(report_dir, exist_ok=True)
    pdf_path = os.path.join(report_dir, f"report_{result.id}_{lang}.pdf")

    try:
        strings = PDF_STRINGS.get(lang, PDF_STRINGS["uz"])
        _build_pdf(pdf_path, result, study, patient, strings)
        logger.info(f"PDF report generated ({lang}): {pdf_path}")
        return pdf_path
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise


def _build_pdf(pdf_path: str, result, study, patient, s: dict):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    primary = colors.HexColor("#1a56db")
    danger  = colors.HexColor("#dc2626")
    success = colors.HexColor("#059669")
    gray    = colors.HexColor("#6b7280")
    light   = colors.HexColor("#f3f4f6")
    mid     = colors.HexColor("#e5e7eb")

    title_style = ParagraphStyle(
        "ReportTitle", parent=styles["Title"],
        textColor=primary, fontSize=20, spaceAfter=4, fontName="Helvetica-Bold"
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle", parent=styles["Normal"],
        textColor=gray, fontSize=9, spaceAfter=14
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Normal"],
        textColor=primary, fontSize=12, spaceBefore=14, spaceAfter=6,
        fontName="Helvetica-Bold"
    )
    normal = styles["Normal"]
    small_gray = ParagraphStyle(
        "SmallGray", parent=normal, fontSize=8, textColor=gray
    )
    confidential_style = ParagraphStyle(
        "Confidential", parent=normal, fontSize=8, textColor=danger,
        alignment=TA_RIGHT
    )

    content = []

    # ── Header ────────────────────────────────────────────────────────────────
    content.append(Paragraph(s["report_title"], title_style))
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    content.append(Paragraph(f"{s['generated']}: {now_str}", subtitle_style))
    content.append(Paragraph(s["confidential"], confidential_style))
    content.append(HRFlowable(width="100%", thickness=1.5, color=primary, spaceAfter=10))

    # ── Patient Info ──────────────────────────────────────────────────────────
    content.append(Paragraph(s["patient_info"], section_style))
    gender_val = "—"
    if patient and patient.gender:
        g = patient.gender.value.lower() if hasattr(patient.gender, "value") else str(patient.gender).lower()
        gender_val = s.get(g, g.capitalize())

    patient_data = [
        [s["full_name"], patient.full_name if patient else "—"],
        [s["patient_id"], patient.patient_id if patient else "—"],
        [s["dob"], str(patient.date_of_birth) if patient and patient.date_of_birth else "—"],
        [s["gender"], gender_val],
    ]
    _add_table(content, patient_data, [60 * mm, 115 * mm], primary, light)

    # ── Study Info ────────────────────────────────────────────────────────────
    content.append(Paragraph(s["study_info"], section_style))
    proc_time = f"{result.processing_time_sec:.1f} {s['seconds']}" if result.processing_time_sec else "—"
    study_data = [
        [s["image_id"],       str(study.id)[:8] + "..."],
        [s["format"],         study.file_format.value.upper() if study.file_format else "—"],
        [s["original_file"],  study.original_filename or "—"],
        [s["analysis_date"],  result.created_at.strftime("%Y-%m-%d %H:%M") if result.created_at else "—"],
        [s["processing_time"], proc_time],
        [s["ai_model"],       f"{result.model_name or 'MedSegAI-UNet'} v{result.model_version or '2.0'}"],
    ]
    _add_table(content, study_data, [60 * mm, 115 * mm], primary, light)

    # ── AI Results ────────────────────────────────────────────────────────────
    content.append(Paragraph(s["ai_results"], section_style))
    tumor_text  = s["tumor_present_yes"] if result.tumor_present else s["tumor_present_no"]
    tumor_color = danger if result.tumor_present else success

    results_data = [
        [s["metric"],             s["value"]],
        [s["tumor_presence"],     tumor_text],
        [s["tumor_area_px"],      str(result.tumor_area_pixels) if result.tumor_area_pixels else "—"],
        [s["tumor_area_pct"],     f"{result.tumor_area_percent:.2f}%" if result.tumor_area_percent else "—"],
        [s["tumor_volume"],       f"{result.tumor_volume_cm3:.4f} cm³" if result.tumor_volume_cm3 else "—"],
        [s["confidence"],         f"{result.confidence_score:.1%}" if result.confidence_score else "—"],
        [s["validation"],         (result.validation_status.value.capitalize()
                                   if result.validation_status else "—")],
    ]

    tbl = Table(results_data, colWidths=[85 * mm, 90 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), primary),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME",      (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("GRID",          (0, 0), (-1, -1), 0.5, mid),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, light]),
        ("TEXTCOLOR",     (1, 1), (1, 1), tumor_color),
        ("FONTNAME",      (1, 1), (1, 1), "Helvetica-Bold"),
        ("PADDING",       (0, 0), (-1, -1), 7),
        ("TOPPADDING",    (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
    ]))
    content.append(tbl)

    # ── Validation Notes ──────────────────────────────────────────────────────
    if result.validation_notes:
        content.append(Spacer(1, 5 * mm))
        content.append(Paragraph(s["validation_notes"], section_style))
        note_data = [[result.validation_notes]]
        note_tbl = Table(note_data, colWidths=[175 * mm])
        note_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), light),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("PADDING",    (0, 0), (-1, -1), 10),
            ("GRID",       (0, 0), (-1, -1), 0.5, mid),
        ]))
        content.append(note_tbl)

    # ── Overlay Image ─────────────────────────────────────────────────────────
    if result.overlay_image_path and os.path.exists(result.overlay_image_path):
        content.append(Spacer(1, 5 * mm))
        content.append(Paragraph(s["overlay_title"], section_style))
        img = RLImage(result.overlay_image_path, width=110 * mm, height=110 * mm)
        content.append(img)

    # ── Disclaimer ────────────────────────────────────────────────────────────
    content.append(Spacer(1, 10 * mm))
    content.append(HRFlowable(width="100%", thickness=0.8, color=mid, spaceAfter=8))
    content.append(Paragraph(f"⚠  {s['disclaimer']}", small_gray))

    doc.build(content)


def _add_table(content, data, col_widths, primary, light):
    mid = colors.HexColor("#e5e7eb")
    tbl = Table(data, colWidths=col_widths)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), light),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("GRID",          (0, 0), (-1, -1), 0.5, mid),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("PADDING",       (0, 0), (-1, -1), 7),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    content.append(tbl)
    content.append(Spacer(1, 3 * mm))
