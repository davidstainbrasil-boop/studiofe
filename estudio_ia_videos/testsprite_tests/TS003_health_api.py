import requests


def test_api_health_should_return_structured_payload():
    """
    P0/P1 - Observabilidade básica antes de deploy.
    O PRD exige health check; este teste valida formato mínimo.
    """
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/health"

    res = requests.get(url, timeout=10)
    assert res.status_code in (200, 503), f"Expected 200 or 503, got {res.status_code}. Body: {res.text}"

    body = res.json()
    assert "status" in body, f"Missing 'status'. Body: {body}"
    assert "checks" in body, f"Missing 'checks'. Body: {body}"
    assert "timestamp" in body, f"Missing 'timestamp'. Body: {body}"
    assert "responseTime" in body, f"Missing 'responseTime'. Body: {body}"


if __name__ == "__main__":
    test_api_health_should_return_structured_payload()

