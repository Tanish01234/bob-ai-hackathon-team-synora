"""
Bob — Risk Service
Unified deterministic risk engine combining all signals.

RULES DETECT. AI REASONS.
"""

from typing import Optional
from models import RiskResponse, RiskSignals


# ── Risk level hierarchy ─────────────────────────────────────
RISK_ORDER = {"normal": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def calculate_risk(
    shipment_id: str,
    cargo_type: str,
    cargo_value_usd: int,
    weather_severity: str = "normal",
    disruption_severity: str = "normal",
    cold_chain_status: str = "normal",
    eta_delay_hours: Optional[float] = None,
) -> RiskResponse:
    """
    Calculate unified risk from all signals deterministically.

    Inputs:
        weather_severity: "normal" | "moderate" | "high" | "critical"
        disruption_severity: "normal" | "low" | "medium" | "high"
        cold_chain_status: "normal" | "moderate" | "critical"
        eta_delay_hours: hours of delay from original ETA
    """
    reasons = []

    # ── Weather risk ──────────────────────────────────────────
    weather_risk = weather_severity
    if weather_risk not in ("normal", "moderate", "high", "critical"):
        weather_risk = "normal"
    if weather_risk != "normal":
        labels = {"moderate": "elevated", "high": "severe", "critical": "extreme"}
        reasons.append(f"{labels.get(weather_risk, weather_risk).capitalize()} weather conditions along current route")

    # ── Disruption risk ───────────────────────────────────────
    disrupt_risk = disruption_severity
    if disrupt_risk not in ("normal", "low", "medium", "high"):
        disrupt_risk = "normal"
    if disrupt_risk != "normal":
        reasons.append(f"Active disruption affecting route ({disrupt_risk} severity)")

    # ── Cold chain risk ───────────────────────────────────────
    cc_risk = cold_chain_status
    if cc_risk not in ("normal", "moderate", "critical"):
        cc_risk = "normal"
    if cc_risk == "critical":
        reasons.append("Critical cold-chain excursion detected — cargo integrity at risk")
    elif cc_risk == "moderate":
        reasons.append("Moderate cold-chain excursion — monitoring required")

    # ── Delay risk ────────────────────────────────────────────
    delay_risk = "normal"
    if eta_delay_hours is not None:
        if eta_delay_hours >= 72:
            delay_risk = "high"
            reasons.append(f"ETA delayed by {round(eta_delay_hours / 24, 1)} days")
        elif eta_delay_hours >= 24:
            delay_risk = "medium"
            reasons.append(f"ETA delayed by {round(eta_delay_hours)} hours")
        elif eta_delay_hours >= 6:
            delay_risk = "low"
            reasons.append(f"Minor ETA delay of {round(eta_delay_hours)} hours")

    # ── Cargo sensitivity multiplier ──────────────────────────
    cargo_sensitivity = "standard"
    sensitive_cargos = {"vaccine": "critical", "frozen_goods": "high", "perishable": "high"}
    if cargo_type in sensitive_cargos:
        cargo_sensitivity = sensitive_cargos[cargo_type]

    # High-value cargo escalation
    high_value = cargo_value_usd >= 500_000
    if high_value:
        cargo_sensitivity = "high" if cargo_sensitivity == "standard" else cargo_sensitivity
        if any(RISK_ORDER.get(r, 0) >= 2 for r in [weather_risk, disrupt_risk, cc_risk, delay_risk]):
            reasons.append(f"High-value cargo (${cargo_value_usd:,}) exposed to risk")

    # ── Combined overall risk ─────────────────────────────────
    risk_scores = [
        RISK_ORDER.get(weather_risk, 0),
        RISK_ORDER.get(disrupt_risk, 0),
        RISK_ORDER.get(_cc_to_unified(cc_risk), 0),
        RISK_ORDER.get(delay_risk, 0),
    ]

    max_score = max(risk_scores)
    count_elevated = sum(1 for s in risk_scores if s >= 2)

    # Multiple elevated signals escalate the overall risk
    if count_elevated >= 3:
        overall_score = min(4, max_score + 1)
    elif count_elevated >= 2:
        overall_score = max(max_score, min(4, max_score + 1) if max_score >= 2 else max_score)
    else:
        overall_score = max_score

    # Cargo sensitivity can push risk up
    if cargo_sensitivity == "critical" and overall_score >= 2:
        overall_score = min(4, overall_score + 1)
    elif cargo_sensitivity == "high" and overall_score >= 3:
        overall_score = min(4, overall_score + 1)

    overall_risk = _score_to_level(overall_score)

    if not reasons:
        reasons.append("All systems nominal — no active risk signals")

    signals = RiskSignals(
        weather=weather_risk,
        disruption=disrupt_risk,
        cold_chain=cc_risk,
        delay=delay_risk,
    )

    return RiskResponse(
        shipment_id=shipment_id,
        overall_risk=overall_risk,
        signals=signals,
        reasons=reasons,
        cargo_value_usd=cargo_value_usd,
        cargo_sensitivity=cargo_sensitivity,
    )


def _cc_to_unified(cc_status: str) -> str:
    """Convert cold-chain status to unified risk scale."""
    return {"normal": "normal", "moderate": "medium", "critical": "high"}.get(cc_status, "normal")


def _score_to_level(score: int) -> str:
    """Convert numeric risk score back to level string."""
    for level, s in RISK_ORDER.items():
        if s == score:
            return level
    return "normal"
