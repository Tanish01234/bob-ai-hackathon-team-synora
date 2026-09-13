"""
Bob — AI Service
Gemini (primary) → Groq (fallback) with JSON output validation.
"""

import asyncio
import json

import httpx

from config import get_settings

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


# ── Core dispatcher ───────────────────────────────────────────

async def call_ai(system: str, user: str) -> tuple[dict, str]:
    """
    Try Gemini first with 6s timeout.
    On any failure, fall back to Groq.
    Returns (parsed_json_dict, provider_name).
    """
    settings = get_settings()

    try:
        result = await asyncio.wait_for(
            _call_gemini(system, user, settings.gemini_api_key),
            timeout=10.0,
        )
        return result, "gemini"
    except Exception as e:
        print(f"⚠️  Gemini failed ({type(e).__name__}: {e}) — falling back to Groq")
        try:
            result = await _call_groq(system, user, settings.groq_api_key)
            return result, "groq"
        except Exception as e2:
            print(f"⚠️  Groq also failed ({type(e2).__name__}: {e2})")
            raise


# ── Gemini ────────────────────────────────────────────────────

async def _call_gemini(system: str, user: str, api_key: str) -> dict:
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
            "response_mime_type": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{GEMINI_URL}?key={api_key}",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return _parse_json(text)


# ── Groq ──────────────────────────────────────────────────────

async def _call_groq(system: str, user: str, api_key: str) -> dict:
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    payload = {
        "model": "openai/gpt-oss-20b",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": 1024,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return _parse_json(text)


# ── JSON parser ───────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    """Strip markdown fences if present, then parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence
        lines = text.split("\n")
        # Skip first line (```json or ```)
        lines = lines[1:]
        # Remove closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text.strip())


# ── Domain prompt builders ────────────────────────────────────

async def get_disruption_recommendation(disruption: dict, shipment: dict) -> dict:
    """Get AI recommendation for a disruption-affected shipment."""
    system = """You are a supply chain risk analyst.
Given a disruption event and an affected shipment, return ONLY valid JSON.
No markdown, no explanation, no preamble. Just the JSON object."""

    user = f"""Disruption:
{json.dumps(disruption, indent=2)}

Shipment:
{json.dumps(shipment, indent=2)}

Return exactly this JSON structure:
{{
  "estimated_delay_days": <integer between 1 and 14>,
  "risk_level": "<low|medium|high>",
  "recommended_action": "<reroute|hold|alternate_carrier>",
  "justification": "<one sentence, plain English, max 25 words>"
}}"""

    result, provider = await call_ai(system, user)
    result["ai_provider"] = provider
    return result


async def get_cold_chain_explanation(
    cargo_type: str,
    safe_range: dict,
    excursion_details: dict,
) -> dict:
    """Get AI explanation for a cold chain excursion."""
    min_temp = safe_range.get("min", "N/A")
    max_temp = safe_range.get("max", "N/A")

    system = """You are a cold chain compliance expert.
Given sensor excursion data, return ONLY valid JSON.
No markdown, no explanation, no preamble. Just the JSON object.
Do not fabricate specific regulation numbers."""

    user = f"""Cargo type: {cargo_type}
Safe temperature range: {min_temp}°C to {max_temp}°C
Maximum breach temperature: {excursion_details['max_breach_temp']}°C
Excursion duration: {excursion_details['breach_duration_hours']} hours
Transit leg: {excursion_details['leg']}
Started at: {excursion_details['started_at']}

Return exactly this JSON structure:
{{
  "summary": "<plain English explanation of what happened and the risk, max 40 words>",
  "severity_classification": "<critical|moderate>",
  "regulatory_note": "<generic WHO/FDA-style reasoning without fabricated regulation numbers, max 30 words>"
}}"""

    result, provider = await call_ai(system, user)
    result["ai_provider"] = provider
    return result
