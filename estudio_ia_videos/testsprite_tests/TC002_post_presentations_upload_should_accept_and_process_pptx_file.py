import requests
from requests.auth import HTTPBasicAuth

def test_post_presentations_upload_should_accept_and_process_pptx_file():
    base_url = "http://localhost:3000"
    endpoint = "/api/presentations/upload"
    url = base_url + endpoint

    auth = HTTPBasicAuth('admin@cursostecno.com.br', 'Admin123456')
    cookies = {'dev_bypass': 'true'}
    headers = {
        # 'Content-Type' will be set by requests when files parameter is used
    }

    pptx_content = (
        b'PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\x8e\x95'
        b'_\x02\x00\x00\x13\x02\x00\x00\x13\x00\x00\x00[Content_Types].xml'
    )  # Minimal binary content that resembles start of a .pptx file (zip archive)
    files = {
        'file': ('test_presentation.pptx', pptx_content, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    }

    try:
        response = requests.post(
            url,
            auth=auth,
            cookies=cookies,
            headers=headers,
            files=files,
            timeout=30
        )
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Basic validation of response content - expecting JSON with extracted data keys
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    expected_keys = {"texts", "images", "layouts", "notes", "animations"}
    # Validate if all expected keys are in the response json (at least presence)
    missing_keys = expected_keys - json_data.keys()
    assert not missing_keys, f"Response JSON missing keys: {missing_keys}"

test_post_presentations_upload_should_accept_and_process_pptx_file()
