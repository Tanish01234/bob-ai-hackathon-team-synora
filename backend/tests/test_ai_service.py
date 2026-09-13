import pytest
from services.ai_service import _parse_json


def test_parse_json_raw():
    raw = '{"key": "value", "count": 42}'
    parsed = _parse_json(raw)
    assert parsed == {"key": "value", "count": 42}


def test_parse_json_with_fences():
    fenced = """```json
{
  "estimated_delay_days": 3,
  "risk_level": "medium"
}
```"""
    parsed = _parse_json(fenced)
    assert parsed["estimated_delay_days"] == 3
    assert parsed["risk_level"] == "medium"


def test_parse_json_with_plain_fences():
    fenced = """```
{
  "summary": "Temperature breach",
  "severity_classification": "moderate"
}
```"""
    parsed = _parse_json(fenced)
    assert parsed["summary"] == "Temperature breach"
    assert parsed["severity_classification"] == "moderate"
