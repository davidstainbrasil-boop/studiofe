import requests


def test_pptx_upload_should_reject_missing_file():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/pptx/upload"

    # Importante: o handler chama req.formData(), então precisamos enviar multipart/form-data
    # mesmo que NÃO exista o campo "file". Assim validamos o 400 esperado ("Nenhum arquivo encontrado.").
    res = requests.post(
        url,
        headers={"x-user-id": "12b21f2e-8ac1-480c-af1e-542a7d9b185a"},
        files={},  # força multipart/form-data
        data={"projectId": "ts-project"},
        timeout=20,
    )
    assert res.status_code == 400, f"Expected 400, got {res.status_code}. Body: {res.text}"
    body = res.json()
    assert "error" in body, f"Expected error key in response. Body: {body}"


def test_pptx_upload_should_reject_empty_file():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/pptx/upload"

    headers = {"x-user-id": "12b21f2e-8ac1-480c-af1e-542a7d9b185a"}
    files = {
        "file": (
            "empty.pptx",
            b"",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    }

    res = requests.post(url, headers=headers, files=files, data={"projectId": "ts-project"}, timeout=20)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}. Body: {res.text}"
    body = res.json()
    assert "error" in body, f"Expected error key in response. Body: {body}"


def test_pptx_upload_should_accept_valid_pptx_when_storage_configured():
    """
    P1 - depende de ambiente:
    - ou Supabase configurado (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
    - ou STORAGE_TYPE=local (para não depender de Supabase)
    """
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/pptx/upload"

    headers = {"x-user-id": "12b21f2e-8ac1-480c-af1e-542a7d9b185a"}

    # Conteúdo binário mínimo só para passar validações do endpoint e do uploader (tipo MIME + tamanho > 0).
    # O uploader NÃO valida ZIP/PPTX internamente, ele apenas faz upload.
    pptx_like = b"PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00\x00\x00"
    files = {
        "file": (
            "valid.pptx",
            pptx_like,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    }

    res = requests.post(url, headers=headers, files=files, data={"projectId": "ts-project"}, timeout=30)

    # Se falhar por env, queremos erro acionável.
    if res.status_code != 200:
        raise AssertionError(
            "Expected 200 for valid upload. "
            "Se estiver retornando 500 por falta de env, configure STORAGE_TYPE=local "
            "ou defina NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.\n"
            f"Status: {res.status_code}\nBody: {res.text}"
        )

    body = res.json()
    assert "storagePath" in body, f"Expected storagePath in response. Body: {body}"
    assert body.get("fileType") == "application/vnd.openxmlformats-officedocument.presentationml.presentation"


if __name__ == "__main__":
    test_pptx_upload_should_reject_missing_file()
    test_pptx_upload_should_reject_empty_file()
    test_pptx_upload_should_accept_valid_pptx_when_storage_configured()

