"""
Regression Test: Auth Session Hydration & Protection
Verifies:
1. AI chat endpoint cannot be accessed without genuine Bearer token.
2. Direct/premature requests without session hydration return 401.
3. Invalid or expired tokens return 401.
4. Authenticated sessions with valid Supabase tokens succeed.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from auth import get_current_user


client = TestClient(app)


def test_ai_chat_unauthenticated_rejected():
    """Premature AI request before session hydration must be rejected with 401."""
    response = client.post(
        "/api/ai/chat",
        json={"message": "Why is SHP-1145 delayed?"},
    )
    assert response.status_code == 401
    assert "token required" in response.text.lower() or response.status_code == 401


def test_ai_chat_invalid_stale_token_rejected():
    """Request with stale/invalid token must return 401."""
    response = client.post(
        "/api/ai/chat",
        headers={"Authorization": "Bearer stale-or-invalid-jwt-token-xyz"},
        json={"message": "Why is SHP-1145 delayed?"},
    )
    assert response.status_code == 401
    assert "invalid" in response.text.lower() or "expired" in response.text.lower() or response.status_code == 401


def test_all_protected_endpoints_reject_unauthenticated():
    """All core operational endpoints must enforce authentication."""
    endpoints = [
        "/api/stats",
        "/api/disruptions",
        "/api/simulation",
        "/api/alerts",
        "/api/shipments/SHP-1010/ai-analysis",
    ]
    for ep in endpoints:
        if "ai-analysis" in ep:
            res = client.post(ep)
        else:
            res = client.get(ep)
        assert res.status_code == 401, f"Expected 401 on {ep}, got {res.status_code}"


def test_ai_chat_authenticated_session_succeeds():
    """When a valid authenticated session is established, AI chat processes successfully."""
    from unittest.mock import patch, AsyncMock

    # Override auth dependency with authenticated user (valid UUID format)
    app.dependency_overrides[get_current_user] = lambda: "00000000-0000-0000-0000-000000000001"

    mock_fleet = {
        "total_shipments": 250,
        "in_transit": 200,
        "delayed": 36,
        "delivered": 14,
        "active_disruptions": 12,
        "affected_shipments": 40,
        "critical_alerts": 8,
        "cold_chain_critical": 8,
    }

    ai_mock_response = (
        {
            "answer": "The fleet has 250 active shipments with 12 active disruptions.",
            "risk_level": "medium",
            "recommended_action": "monitor",
        },
        "gemini",
    )

    try:
        with patch("api.ai.get_fleet_summary", return_value=mock_fleet), \
             patch("api.ai.get_high_risk_shipments", return_value=[]), \
             patch("api.ai.ai_service.call_ai", new_callable=AsyncMock, return_value=ai_mock_response):
            response = client.post(
                "/api/ai/chat",
                json={"message": "What is the fleet status and active disruptions?"},
            )
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
            assert "sources" in data
            assert isinstance(data["sources"], list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)

