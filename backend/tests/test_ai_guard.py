"""
Unit tests for Bob AI Scope Guard.
Ensures off-topic queries are caught deterministically, while supply-chain queries pass.
"""

from services.ai_guard import check_scope, BOB_SCOPE_REJECTION_MESSAGE


def test_ai_guard_off_topic():
    off_topic_queries = [
        "write a poem about butterflies",
        "who was Julius Caesar?",
        "recipe for chocolate cake",
        "tell me a joke",
        "what is the capital of France?",
    ]
    for q in off_topic_queries:
        allowed, msg = check_scope(q, has_shipment_context=False)
        assert allowed is False, f"Expected '{q}' to be blocked"
        assert msg == BOB_SCOPE_REJECTION_MESSAGE


def test_ai_guard_supply_chain_allowed():
    supply_chain_queries = [
        "What is the status of shipment SHP-1010?",
        "Should I reroute around Typhoon Malakas?",
        "Is cold-chain temperature within safe threshold?",
        "What are the port strike disruptions in Singapore?",
        "Show high risk cargo in transit",
        "What is the current ETA and distance remaining?",
    ]
    for q in supply_chain_queries:
        allowed, msg = check_scope(q, has_shipment_context=False)
        assert allowed is True, f"Expected '{q}' to be allowed"
        assert msg is None


def test_ai_guard_shipment_context_followups():
    followups = [
        "why?",
        "should I reroute?",
        "what if I wait?",
        "what is the alternative?",
    ]
    for q in followups:
        # If in shipment context, conversational follow-ups are permitted
        allowed, _ = check_scope(q, has_shipment_context=True)
        assert allowed is True, f"Expected '{q}' to be allowed with shipment context"
