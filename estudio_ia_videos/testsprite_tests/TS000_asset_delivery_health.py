import re
import requests


def test_next_static_chunks_should_be_served():
    """
    P0 - Gate de deploy
    Se os chunks do Next em /_next/static retornarem 4xx/5xx, a UI não hidrata e qualquer E2E/UI fica inválido.
    """
    base_url = "http://localhost:3000"

    # 1) Obter HTML de uma página pública
    res = requests.get(f"{base_url}/login", timeout=10)
    assert res.status_code == 200, f"Expected 200 for /login, got {res.status_code}"

    html = res.text

    # 2) Extrair src de scripts (chunks)
    srcs = re.findall(r'<script[^>]+src="([^"]+)"', html)
    chunk_srcs = [s for s in srcs if s.startswith("/_next/static/chunks/")][:8]
    assert chunk_srcs, "No Next.js chunk scripts found in /login HTML. SSR may be broken."

    # 3) Validar que os chunks retornam 200 e JS
    failing = []
    for src in chunk_srcs:
        r = requests.get(f"{base_url}{src}", timeout=10)
        if r.status_code >= 400:
            failing.append((src, r.status_code))
            continue
        content_type = (r.headers.get("content-type") or "").lower()
        if "javascript" not in content_type and "text/plain" not in content_type:
            failing.append((src, f"unexpected content-type: {content_type}"))

    assert not failing, "Next.js chunks failing:\n" + "\n".join([f"- {s}: {st}" for s, st in failing])


if __name__ == "__main__":
    test_next_static_chunks_should_be_served()

