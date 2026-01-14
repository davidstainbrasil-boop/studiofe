import requests
from requests.auth import HTTPBasicAuth

def test_get_dashboard_unified_stats():
    base_url = "http://localhost:3000"
    endpoint = "/api/dashboard/unified-stats"
    url = base_url + endpoint

    headers = {
        "Cookie": "dev_bypass=true"
    }

    auth = HTTPBasicAuth("admin@cursostecno.com.br", "Admin123456")
    timeout = 30

    try:
        response = requests.get(url, headers=headers, auth=auth, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    # Optionally validate the response content type or keys if known
    assert response.content, "Response body is empty"

test_get_dashboard_unified_stats()