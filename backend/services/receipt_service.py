"""
Bob — Transit Receipt PDF Generation Service
Generates an audit-grade, professional PDF transit receipt for any shipment.
Uses ReportLab with high-fidelity corporate styling, tables, telemetry, and provenance disclosures.
"""

import io
import json
from datetime import datetime, timezone
from typing import Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)

from db.queries import get_shipment_raw, get_sensor_log_for_shipment, get_all_disruptions
from services.simulation_service import calculate_position, calculate_eta, get_simulation_time
from services.weather_service import get_weather_at_position, get_speed_modifier
from services.risk_service import calculate_risk
from services.coldchain_service import detect_excursion
from services.disruption_service import match_shipments
from models import Shipment as ShipmentModel


async def generate_transit_receipt_pdf(user_id: str, shipment_id: str, operator_email: str = "operator@bob.intel") -> Optional[bytes]:
    """
    Generate a complete binary PDF Transit & Cargo Receipt for a shipment.
    Returns bytes or None if shipment does not exist.
    """
    ship = get_shipment_raw(user_id, shipment_id)
    if not ship:
        return None

    # 1. Gather Telemetry & Computed State
    sim_time = get_simulation_time()
    tracking_calc = calculate_position(
        departure_time=ship.get("departure_time") or sim_time.isoformat(),
        route_segments=ship.get("route_segments") or [],
        total_distance_km=ship.get("total_distance_km", 0),
        cruising_speed_knots=ship.get("cruising_speed_knots", 18.0),
        sim_time=sim_time,
    )

    lat = tracking_calc.get("current_lat", 0.0)
    lng = tracking_calc.get("current_lng", 0.0)
    weather = await get_weather_at_position(lat, lng)
    weather_modifier = get_speed_modifier(weather.severity)

    effective_speed = tracking_calc.get("effective_speed_kmh", 35.0) * weather_modifier
    eta_calc = calculate_eta(
        distance_remaining_km=tracking_calc.get("distance_remaining_km", 0),
        effective_speed_kmh=effective_speed,
        sim_time=sim_time,
    )

    # Disruptions
    disruptions = get_all_disruptions(user_id)
    disrupt_list = []
    max_disrupt_sev = "normal"
    wp = ship.get("route_waypoints", [])
    if isinstance(wp, str):
        try:
            wp = json.loads(wp)
        except Exception:
            wp = []
    ship_model = ShipmentModel(
        shipment_id=ship.get("shipment_id", ""),
        origin=ship.get("origin", ""),
        destination=ship.get("destination", ""),
        current_leg=ship.get("current_leg", ""),
        route_waypoints=wp,
        carrier=ship.get("carrier", ""),
        cargo_type=ship.get("cargo_type", "standard"),
        eta=str(ship.get("eta", "")),
        status=ship.get("status", "in_transit"),
        value_usd=ship.get("value_usd", 0),
    )
    for d in disruptions:
        if match_shipments(d, [ship_model]):
            disrupt_list.append({"type": d.type, "location": d.location, "severity": d.severity})
            if d.severity in ("high", "critical"):
                max_disrupt_sev = "high"
            elif d.severity == "medium" and max_disrupt_sev != "high":
                max_disrupt_sev = "medium"

    # Cold chain
    cargo_type = ship.get("cargo_type", "standard")
    cold_chain_status = "normal"
    cold_chain_details = None
    if cargo_type in ("vaccine", "frozen_goods", "perishable"):
        slog = get_sensor_log_for_shipment(user_id, shipment_id)
        if slog:
            exc = detect_excursion(slog)
            cold_chain_status = exc.get("status", "normal")
            cold_chain_details = exc.get("details")

    # Risk
    risk = calculate_risk(
        shipment_id=shipment_id,
        cargo_type=cargo_type,
        cargo_value_usd=ship.get("value_usd", 0),
        weather_severity=weather.severity,
        disruption_severity=max_disrupt_sev,
        cold_chain_status=cold_chain_status,
        eta_delay_hours=eta_calc.get("delay_hours", 0),
    )

    # 2. Setup ReportLab Document
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_title_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )
    header_subtitle_style = ParagraphStyle(
        "HeaderSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
    )
    section_title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    cell_badge_crit = ParagraphStyle(
        "CellBadgeCrit",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#dc2626"),
    )
    cell_badge_warn = ParagraphStyle(
        "CellBadgeWarn",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#d97706"),
    )
    cell_badge_ok = ParagraphStyle(
        "CellBadgeOk",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#16a34a"),
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#64748b"),
    )

    story = []
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    doc_id = f"TR-{shipment_id}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}"

    # ── Header Banner ───────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>BOB SUPPLY CHAIN INTELLIGENCE</b><br/><font size=9 color='#64748b'>TRANSIT & CARGO AUDIT RECEIPT</font>", header_title_style),
            Paragraph(f"<b>DOCUMENT ID:</b> {doc_id}<br/><b>GENERATED:</b> {now_utc}<br/><b>OPERATOR:</b> {operator_email}", header_subtitle_style),
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 220])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, colors.HexColor("#0284c7")),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # ── Section 1: Shipment Overview ─────────────────────────────
    story.append(Paragraph("1. SHIPMENT & CARGO OVERVIEW", section_title_style))
    status_style = cell_badge_crit if ship.get("status") == "delayed" else (cell_badge_ok if ship.get("status") == "delivered" else cell_normal)
    overview_data = [
        [
            Paragraph("Shipment ID:", cell_bold), Paragraph(f"<b>{shipment_id}</b>", cell_normal),
            Paragraph("Status:", cell_bold), Paragraph(str(ship.get("status", "")).upper().replace("_", " "), status_style),
        ],
        [
            Paragraph("Carrier / Vessel:", cell_bold), Paragraph(str(ship.get("carrier", "N/A")), cell_normal),
            Paragraph("Cargo Type:", cell_bold), Paragraph(str(cargo_type).title().replace("_", " "), cell_normal),
        ],
        [
            Paragraph("Origin Port:", cell_bold), Paragraph(str(ship.get("origin", "N/A")), cell_normal),
            Paragraph("Destination Port:", cell_bold), Paragraph(str(ship.get("destination", "N/A")), cell_normal),
        ],
        [
            Paragraph("Declared Value:", cell_bold), Paragraph(f"${ship.get('value_usd', 0):,}", cell_normal),
            Paragraph("Total Route Distance:", cell_bold), Paragraph(f"{ship.get('total_distance_km', 0):,} km", cell_normal),
        ],
    ]
    overview_table = Table(overview_data, colWidths=[110, 160, 110, 160])
    overview_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 10))

    # ── Section 2: Active Transit State ──────────────────────────
    story.append(Paragraph("2. ACTIVE TRANSIT TELEMETRY", section_title_style))
    current_speed = round(tracking_calc.get("current_speed_knots", 18.0) * weather_modifier, 1)
    transit_data = [
        [
            Paragraph("Current Leg / Region:", cell_bold), Paragraph(str(tracking_calc.get("current_region") or tracking_calc.get("current_leg") or "Active Route"), cell_normal),
            Paragraph("Coordinates:", cell_bold), Paragraph(f"{lat:.4f}°, {lng:.4f}°", cell_normal),
        ],
        [
            Paragraph("Route Progress:", cell_bold), Paragraph(f"{tracking_calc.get('progress_percent', 0)}% completed", cell_normal),
            Paragraph("Distance Remaining:", cell_bold), Paragraph(f"{tracking_calc.get('distance_remaining_km', 0):,} km", cell_normal),
        ],
        [
            Paragraph("Effective Speed:", cell_bold), Paragraph(f"{current_speed} kts (Normal: {tracking_calc.get('current_speed_knots', 18.0)} kts)", cell_normal),
            Paragraph("Current Dynamic ETA:", cell_bold), Paragraph(f"<b>{eta_calc.get('eta', 'N/A')}</b>", cell_normal),
        ],
        [
            Paragraph("Original ETA:", cell_bold), Paragraph(str(ship.get("eta", "N/A")), cell_normal),
            Paragraph("ETA Variance:", cell_bold), Paragraph(f"{eta_calc.get('delay_hours', 0)} hours delay", cell_badge_warn if eta_calc.get("delay_hours", 0) > 0 else cell_badge_ok),
        ],
    ]
    transit_table = Table(transit_data, colWidths=[110, 160, 110, 160])
    transit_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(transit_table)
    story.append(Spacer(1, 10))

    # ── Section 3: Environmental & Cold-Chain ────────────────────
    story.append(Paragraph("3. ENVIRONMENTAL & COLD-CHAIN TELEMETRY", section_title_style))
    w_sev = weather.severity
    w_style = cell_badge_crit if w_sev == "severe" else (cell_badge_warn if w_sev == "moderate" else cell_badge_ok)
    cc_style = cell_badge_crit if cold_chain_status == "critical" else (cell_badge_warn if cold_chain_status == "moderate" else cell_badge_ok)

    env_data = [
        [
            Paragraph("Weather Condition:", cell_bold), Paragraph(f"{weather.condition} (Severity: {weather.severity.upper()})", w_style),
            Paragraph("Ambient Temperature:", cell_bold), Paragraph(f"{weather.temperature_c}°C", cell_normal),
        ],
        [
            Paragraph("Wind Speed & Gusts:", cell_bold), Paragraph(f"{weather.wind_speed_kmh} km/h", cell_normal),
            Paragraph("Cold-Chain Status:", cell_bold), Paragraph(cold_chain_status.upper(), cc_style),
        ],
    ]
    if cold_chain_details:
        env_data.append([
            Paragraph("Excursion Duration:", cell_bold), Paragraph(f"{cold_chain_details.breach_duration_hours} hrs breach", cell_badge_crit),
            Paragraph("Max Breach Temp:", cell_bold), Paragraph(f"{cold_chain_details.max_breach_temp}°C", cell_badge_crit),
        ])

    env_table = Table(env_data, colWidths=[110, 160, 110, 160])
    env_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(env_table)
    story.append(Spacer(1, 10))

    # ── Section 4: Risk & Active Disruptions ─────────────────────
    story.append(Paragraph("4. RISK ASSESSMENT & ACTIVE DISRUPTIONS", section_title_style))
    r_sev = risk.overall_risk
    r_style = cell_badge_crit if r_sev == "critical" else (cell_badge_warn if r_sev in ("high", "medium") else cell_badge_ok)

    disruptions_text = "; ".join([f"{d['type'].replace('_', ' ').title()} at {d['location']} ({d['severity']})" for d in disrupt_list]) if disrupt_list else "No active disruption intersecting route"
    reasons_text = "; ".join(risk.reasons) if risk.reasons else "All parameters within standard baseline tolerance"

    risk_data = [
        [
            Paragraph("Deterministic Risk:", cell_bold), Paragraph(f"<b>{risk.overall_risk.upper()}</b>", r_style),
            Paragraph("Active Disruptions:", cell_bold), Paragraph(f"{len(disrupt_list)} event(s)", cell_normal),
        ],
        [
            Paragraph("Disruption Events:", cell_bold), Paragraph(disruptions_text, cell_normal),
            Paragraph("Primary Risk Factors:", cell_bold), Paragraph(reasons_text, cell_normal),
        ],
    ]
    risk_table = Table(risk_data, colWidths=[110, 160, 110, 160])
    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 10))

    # ── Section 5: AI Operational Provenance ─────────────────────
    story.append(Paragraph("5. AI OPERATIONAL REASONING & PROVENANCE", section_title_style))
    ai_action = "Reroute" if risk.overall_risk in ("high", "critical") else "Monitor"
    ai_prov_data = [
        [
            Paragraph("AI System:", cell_bold), Paragraph("Bob Intelligence Engine (Gemini / Groq + Rules Engine)", cell_normal),
            Paragraph("Recommended Action:", cell_bold), Paragraph(f"<b>{ai_action}</b>", cell_badge_warn if ai_action != "Monitor" else cell_badge_ok),
        ],
        [
            Paragraph("System Principle:", cell_bold), Paragraph("<b>RULES DETECT. AI REASONS.</b> Thresholds, coordinates, and alerts are computed deterministically.", cell_normal),
            Paragraph("Audit State Hash:", cell_bold), Paragraph(f"{shipment_id[:8]}-{doc_id[-12:]}", cell_normal),
        ],
    ]
    ai_table = Table(ai_prov_data, colWidths=[110, 160, 110, 160])
    ai_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ai_table)
    story.append(Spacer(1, 14))

    # ── Section 6: Data Source & Provenance Disclosure ───────────
    story.append(Paragraph(
        "<b>DATA SOURCE & TELEMETRY DISCLOSURES:</b><br/>"
        "• <b>Vessel Telemetry & Positions:</b> Generated via real-time mathematical interpolation and great-circle maritime routing simulation.<br/>"
        "• <b>Cold-Chain Sensors:</b> Continuous IoT datalogger readings simulated adhering to WHO/FDA temperature thresholds.<br/>"
        "• <b>Weather Telemetry:</b> Live OpenWeather API observations matched to coordinates; falls back to deterministic meteorological model.<br/>"
        "• <b>AI Analysis:</b> Dual-tier LLM reasoning (Google Gemini 3.6 Flash primary, Groq LLaMA fallback) grounded in database state.",
        disclaimer_style,
    ))

    doc.build(story)
    return buffer.getvalue()
