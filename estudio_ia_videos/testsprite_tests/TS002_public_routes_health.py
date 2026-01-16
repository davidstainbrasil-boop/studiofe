import requests


def test_public_routes_should_not_500():
    """
    P0 - Rotas públicas críticas.
    Se /signup ou /register quebrarem com 500, o onboarding está quebrado para deploy.
    """
    base_url = "http://localhost:3000"
    routes = ["/", "/login", "/signup", "/register"]

    failures = []
    for r in routes:
        res = requests.get(f"{base_url}{r}", timeout=10)
        if res.status_code >= 500:
            failures.append((r, res.status_code))

    assert not failures, "Public routes returning 5xx:\n" + "\n".join([f"- {r}: {s}" for r, s in failures])


if __name__ == "__main__":
    test_public_routes_should_not_500()

