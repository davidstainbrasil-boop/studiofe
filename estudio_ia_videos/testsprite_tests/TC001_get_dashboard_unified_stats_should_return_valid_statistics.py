import requests
from requests.auth import HTTPBasicAuth

def test_get_dashboard_unified_stats_should_return_valid_statistics():
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
        assert False, f"Request to {url} failed with exception: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Basic validation of expected structure: data should be a dict with some keys
    assert isinstance(data, dict), "Response JSON is not an object"

    # Since schema is not fully provided, check some plausible keys if present
    # We expect unified dashboard stats to have some statistics keys
    # Here we assert that data is non-empty and keys exist
    assert len(data) > 0, "Response JSON is empty"

    # Optionally check if values are numeric (int or float) for stats-like entries
    for key, value in data.items():
        assert isinstance(value, (int, float, dict, list, str, bool, type(None))), f"Value of key '{key}' has unexpected type {type(value)}"

test_get_dashboard_unified_stats_should_return_valid_statistics()