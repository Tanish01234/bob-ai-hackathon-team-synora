"""
Bob — AI Scope Guard
Enforces strict supply-chain and platform boundaries on all AI interactions.
Non-domain queries are rejected before invoking expensive LLM calls.
"""

import re
from typing import Tuple

BOB_SCOPE_REJECTION_MESSAGE = (
    "I'm Bob, the Supply Chain Intelligence Assistant. I can only help with shipment tracking, "
    "routes, disruptions, weather, cold-chain, risk and operational intelligence inside BOB."
)

# Supply chain / logistics keywords and concepts
SUPPLY_CHAIN_KEYWORDS = {
    # Core entities
    "shipment", "shipments", "cargo", "vessel", "vessels", "carrier", "carriers",
    "port", "ports", "route", "routes", "waypoint", "waypoints", "container", "containers",
    # Status & tracking
    "track", "tracking", "position", "coordinates", "speed", "knots", "distance",
    "eta", "delay", "delayed", "in transit", "transit", "delivered", "origin", "destination",
    # Operational & risk
    "disruption", "disruptions", "strike", "weather", "storm", "typhoon", "wind",
    "wave", "gust", "precipitation", "rain", "fog", "risk", "risks", "critical",
    "alert", "alerts", "reroute", "rerouting", "alternative", "hold", "bypass",
    # Cold chain
    "cold chain", "cold-chain", "temperature", "temp", "sensor", "sensor readings",
    "excursion", "vaccine", "vaccines", "frozen", "perishable", "celsius",
    # Cargo & Value
    "value", "electronics", "pharmaceutical", "cost", "summary", "stats",
    "fleet", "network", "overview", "receipt", "admin", "simulation",
    # Common conversational greetings allowed in context of Bob
    "hello", "hi", "hey", "help", "who are you", "what can you do", "bob",
}

# Explicit off-topic triggers
OFF_TOPIC_PATTERNS = [
    r"\bwrite (a )?(poem|song|story|essay|code|script|joke)\b",
    r"\bcapital of\b",
    r"\bwho is\b(?! bob)",
    r"\brecipe for\b",
    r"\bhomework\b",
    r"\bweather in (paris|london|tokyo|new york)\b(?!.*(shipment|route|cargo|vessel|port))",
    r"\btell me a joke\b",
    r"\btranslate\b",
    r"\bmovie|celebrity|actor|football|cricket|nba\b",
]


def check_scope(query: str, has_shipment_context: bool = False) -> Tuple[bool, str | None]:
    """
    Check if a query is within BOB's supply-chain intelligence domain.
    Returns (is_allowed, rejection_reason_or_message).
    """
    if not query or not query.strip():
        return False, BOB_SCOPE_REJECTION_MESSAGE

    text = query.lower().strip()

    # Check explicit off-topic patterns first
    for pattern in OFF_TOPIC_PATTERNS:
        if re.search(pattern, text):
            return False, BOB_SCOPE_REJECTION_MESSAGE

    # If the question refers to a shipment ID pattern like SHP-1010, it's always allowed
    if re.search(r"\bshp-\d+\b", text):
        return True, None

    # If user is already on a specific shipment detail page and asks follow-ups (e.g. "why?", "should I reroute?", "what if I don't reroute?", "explain delay")
    if has_shipment_context:
        shipment_followup_words = {
            "why", "why?", "what if", "should i", "recommendation", "status",
            "explain", "details", "how long", "what now", "next step", "what",
            "is it safe", "can we", "alternatives", "options", "delay",
        }
        for word in shipment_followup_words:
            if word in text:
                return True, None

    # Check if any supply-chain keyword exists in the query
    words = set(re.findall(r"\b[a-z0-9\-]+\b", text))
    if words & SUPPLY_CHAIN_KEYWORDS:
        return True, None

    # Compound phrases check
    for kw in SUPPLY_CHAIN_KEYWORDS:
        if " " in kw and kw in text:
            return True, None

    # Unrecognized / off-topic
    return False, BOB_SCOPE_REJECTION_MESSAGE
