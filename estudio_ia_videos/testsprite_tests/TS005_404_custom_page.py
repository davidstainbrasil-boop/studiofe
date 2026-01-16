import uuid
import requests


def test_unknown_route_should_render_custom_404():
    base_url = "http://localhost:3000"
    path = f"/__testsprite_missing__/{uuid.uuid4()}"
    url = f"{base_url}{path}"

    res = requests.get(url, timeout=10)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}. Body: {res.text[:200]}"

    # A página custom definida em src/app/not-found.tsx contém este H1.
    assert "404 - Página não encontrada" in res.text, "Expected custom 404 content to be present."


if __name__ == "__main__":
    test_unknown_route_should_render_custom_404()

