"""
Bob — Alert Service
Generates alerts from meaningful risk transitions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from db import get_supabase
from models import Alert


def generate_alert(
    user_id: str,
    shipment_id: str,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    recommended_action: Optional[str] = None,
) -> Alert:
    """Create and store an alert."""
    sb = get_supabase()
    alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    alert_data = {
        "user_id": user_id,
        "shipment_id": shipment_id,
        "type": alert_type,
        "severity": severity,
        "title": title,
        "message": message,
        "recommended_action": recommended_action,
        "created_at": now,
    }

    try:
        sb.table("alerts").insert(alert_data).execute()
    except Exception as e:
        print(f"⚠️  Failed to store alert: {e}")

    return Alert(
        alert_id=alert_id,
        shipment_id=shipment_id,
        type=alert_type,
        severity=severity,
        title=title,
        message=message,
        recommended_action=recommended_action,
        created_at=now,
    )


def check_and_generate_alerts(
    user_id: str,
    shipment_id: str,
    weather_severity: str = "normal",
    disruption_severity: str = "normal",
    cold_chain_status: str = "normal",
    overall_risk: str = "normal",
    eta_delay_hours: Optional[float] = None,
) -> list[Alert]:
    """
    Check conditions and generate alerts for meaningful risk transitions.
    Prevents duplicate alerts for the same event within a time window.
    """
    alerts = []

    # Check for recent alerts to avoid duplicates (last 30 min)
    recent = _get_recent_alerts(user_id, shipment_id, minutes=30)
    recent_types = {a.get("type", "") for a in recent}

    # Weather alert
    if weather_severity in ("high", "critical") and "weather" not in recent_types:
        label = "Critical" if weather_severity == "critical" else "Severe"
        alerts.append(generate_alert(
            user_id=user_id,
            shipment_id=shipment_id,
            alert_type="weather",
            severity=weather_severity,
            title=f"{label} weather detected",
            message=f"Weather conditions along {shipment_id}'s current route have reached {weather_severity} severity. Vessel speed may be reduced.",
            recommended_action="review_route",
        ))

    # Cold chain alert
    if cold_chain_status == "critical" and "cold_chain" not in recent_types:
        alerts.append(generate_alert(
            user_id=user_id,
            shipment_id=shipment_id,
            alert_type="cold_chain",
            severity="critical",
            title="Critical cold-chain excursion",
            message=f"Temperature excursion for {shipment_id} has exceeded safe duration threshold. Cargo integrity may be compromised.",
            recommended_action="quarantine_and_review",
        ))
    elif cold_chain_status == "moderate" and "cold_chain" not in recent_types:
        alerts.append(generate_alert(
            user_id=user_id,
            shipment_id=shipment_id,
            alert_type="cold_chain",
            severity="medium",
            title="Temperature excursion detected",
            message=f"Brief temperature excursion detected for {shipment_id}. Monitoring in progress.",
            recommended_action="monitor",
        ))

    # Disruption alert
    if disruption_severity in ("medium", "high") and "disruption" not in recent_types:
        alerts.append(generate_alert(
            user_id=user_id,
            shipment_id=shipment_id,
            alert_type="disruption",
            severity=disruption_severity,
            title="Disruption affects shipment route",
            message=f"An active disruption ({disruption_severity} severity) is affecting {shipment_id}'s route. Review recommended.",
            recommended_action="review_route",
        ))

    # Significant ETA delay alert
    if eta_delay_hours and eta_delay_hours >= 24 and "delay" not in recent_types:
        delay_days = round(eta_delay_hours / 24, 1)
        alerts.append(generate_alert(
            user_id=user_id,
            shipment_id=shipment_id,
            alert_type="delay",
            severity="high" if eta_delay_hours >= 72 else "medium",
            title=f"Significant ETA delay (+{delay_days} days)",
            message=f"Estimated arrival for {shipment_id} has increased by {delay_days} days due to current conditions.",
            recommended_action="reroute" if eta_delay_hours >= 72 else "monitor",
        ))

    return alerts


def get_alerts_for_shipment(user_id: str, shipment_id: str, limit: int = 20) -> list[dict]:
    """Get recent alerts for a specific shipment."""
    sb = get_supabase()
    try:
        result = (
            sb.table("alerts")
            .select("*")
            .eq("user_id", user_id)
            .eq("shipment_id", shipment_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def bootstrap_alerts_for_user(user_id: str):
    """Seed canonical alerts for a new or demo user if none exist."""
    now = datetime.now(timezone.utc).isoformat()
    alerts_to_seed = [
        {
            "user_id": user_id,
            "shipment_id": "SHP-1042",
            "type": "disruption",
            "severity": "medium",
            "title": "Disruption affects shipment route",
            "message": "Active disruption affecting shipment route. Review recommended.",
            "recommended_action": "review_route",
            "acknowledged": False,
            "created_at": now,
        },
        {
            "user_id": user_id,
            "shipment_id": "SHP-1015",
            "type": "cold_chain",
            "severity": "critical",
            "title": "Critical cold-chain excursion",
            "message": "Temperature excursion detected (+4.8°C). Threshold exceeded for 45 minutes.",
            "recommended_action": "quarantine_and_review",
            "acknowledged": False,
            "created_at": now,
        },
        {
            "user_id": user_id,
            "shipment_id": "SHP-1028",
            "type": "weather",
            "severity": "high",
            "title": "Severe weather detected",
            "message": "Heavy swell and gale force winds along route. Transit speed reduced.",
            "recommended_action": "review_route",
            "acknowledged": False,
            "created_at": now,
        },
    ]
    sb = get_supabase()
    try:
        sb.table("alerts").insert(alerts_to_seed).execute()
    except Exception as e:
        print(f"⚠️ Failed to bootstrap alerts: {e}")


def resolve_alert(user_id: str, alert_id: str, acknowledged: bool = True) -> bool:
    """Mark an alert as acknowledged / resolved in database."""
    sb = get_supabase()
    try:
        sb.table("alerts").update({"acknowledged": acknowledged}).eq("user_id", user_id).eq("id", alert_id).execute()
        return True
    except Exception as e:
        print(f"⚠️ Failed to resolve alert {alert_id}: {e}")
        return False


def get_all_alerts(user_id: str, limit: int = 50) -> list[dict]:
    """Get all recent alerts for a user. Bootstraps canonical alerts if none exist."""
    sb = get_supabase()
    try:
        result = (
            sb.table("alerts")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        existing = result.data or []
        if len(existing) == 0:
            bootstrap_alerts_for_user(user_id)
            result = (
                sb.table("alerts")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            existing = result.data or []
        return existing
    except Exception as e:
        print(f"⚠️ Error fetching alerts: {e}")
        return []


def _get_recent_alerts(user_id: str, shipment_id: str, minutes: int = 30) -> list[dict]:
    """Get alerts from the last N minutes to prevent duplicates."""
    sb = get_supabase()
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    try:
        result = (
            sb.table("alerts")
            .select("type, severity, created_at")
            .eq("user_id", user_id)
            .eq("shipment_id", shipment_id)
            .gte("created_at", cutoff)
            .execute()
        )
        return result.data or []
    except Exception:
        return []
