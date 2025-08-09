import pytest, asyncio

@pytest.mark.asyncio
async def test_api_server_import_and_create_app():
    try:
        from api_server import create_app
    except Exception:
        pytest.skip("api_server import failed (optional deps)")
    app = create_app()
    assert app is not None

@pytest.mark.asyncio
async def test_api_server_health_route():
    try:
        from api_server import create_app
    except Exception:
        pytest.skip("api_server import failed (optional deps)")
    app = create_app()
    client = app.test_client()
    resp = await asyncio.get_event_loop().run_in_executor(None, lambda: client.get('/health'))
    assert resp.status_code in (200,503)
