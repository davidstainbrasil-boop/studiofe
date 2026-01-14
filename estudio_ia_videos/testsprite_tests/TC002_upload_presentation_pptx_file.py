import requests
from requests.auth import HTTPBasicAuth

def test_upload_presentation_pptx_file():
    base_url = "http://localhost:3000"
    endpoint = "/api/presentations/upload"
    url = f"{base_url}{endpoint}"

    auth = HTTPBasicAuth('admin@cursostecno.com.br', 'Admin123456')
    cookies = {'dev_bypass': 'true'}
    headers = {}
    timeout = 30

    # Prepare a simple PPTX file content for upload
    # Creating a minimal valid PPTX file with binary content
    pptx_content = (
        b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00\xb1\x83\x94"
        b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        b"[Content_Types].xml"  # Just a placeholder content to simulate pptx
    )
    files = {
        'file': ('test.pptx', pptx_content, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    }

    try:
        response = requests.post(
            url,
            auth=auth,
            cookies=cookies,
            headers=headers,
            files=files,
            timeout=timeout
        )
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}."
    # Additional checks can go here depending on response content if specified

test_upload_presentation_pptx_file()
