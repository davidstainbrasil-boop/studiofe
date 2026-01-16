import uuid
import requests


def test_render_start_should_reject_missing_project_id():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/render/start"

    headers = {"Content-Type": "application/json", "x-user-id": "demo-user"}
    payload = {
        # projectId ausente
        "slides": [{"id": "s1", "duration": 5}],
        "config": {"quality": "low"},
    }

    res = requests.post(url, json=payload, headers=headers, timeout=20)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}. Body: {res.text}"


def test_render_start_should_reject_empty_slides():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/render/start"

    headers = {"Content-Type": "application/json", "x-user-id": "demo-user"}
    payload = {"projectId": str(uuid.uuid4()), "slides": [], "config": {"quality": "low"}}

    res = requests.post(url, json=payload, headers=headers, timeout=20)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}. Body: {res.text}"


def test_render_start_should_return_404_when_project_not_found():
    """
    P0 - comportamento esperado pelo PRD (project inexistente -> 404).
    Este teste não depende de Supabase/job enqueue, pois falha antes do createJob.
    """
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/render/start"

    headers = {"Content-Type": "application/json", "x-user-id": "demo-user"}
    payload = {
        "projectId": str(uuid.uuid4()),
        "slides": [{"id": "s1", "duration": 5}],
        "config": {"quality": "low"},
    }

    res = requests.post(url, json=payload, headers=headers, timeout=20)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}. Body: {res.text}"


if __name__ == "__main__":
    test_render_start_should_reject_missing_project_id()
    test_render_start_should_reject_empty_slides()
    test_render_start_should_return_404_when_project_not_found()

