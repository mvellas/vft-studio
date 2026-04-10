"""
backend/api/settings.py
========================
Settings API — manages API key via macOS Keychain (keyring) and app settings.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import AppSetting

router = APIRouter(prefix="/settings", tags=["settings"])

_KEYRING_SERVICE = "vft-studio"
_KEYRING_USERNAME = "anthropic-api-key"


def _try_keyring_set(key: str) -> None:
    """Store API key in macOS Keychain via keyring. Silent fail if keyring unavailable."""
    try:
        import keyring
        keyring.set_password(_KEYRING_SERVICE, _KEYRING_USERNAME, key)
    except Exception:
        pass


def _try_keyring_get() -> str | None:
    """Retrieve API key from macOS Keychain via keyring. Returns None if unavailable."""
    try:
        import keyring
        return keyring.get_password(_KEYRING_SERVICE, _KEYRING_USERNAME)
    except Exception:
        return None


class ApiKeyRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    api_key: str


class ApiKeyStatus(BaseModel):
    model_config = ConfigDict(frozen=True)
    has_key: bool
    key_preview: str  # last 4 chars only, e.g. "****...abcd"
    source: str  # "keychain", "env", "none"


class ConnectionTestResult(BaseModel):
    model_config = ConfigDict(frozen=True)
    success: bool
    message: str


@router.get("/api-key", response_model=ApiKeyStatus)
async def get_api_key_status() -> ApiKeyStatus:
    """Return whether an API key is configured and its source."""
    # Priority: Keychain → env var
    key = _try_keyring_get() or os.environ.get("ANTHROPIC_API_KEY", "")
    if key:
        source = "keychain" if _try_keyring_get() else "env"
        preview = f"****...{key[-4:]}" if len(key) >= 4 else "****"
        return ApiKeyStatus(has_key=True, key_preview=preview, source=source)
    return ApiKeyStatus(has_key=False, key_preview="", source="none")


@router.put("/api-key", response_model=ApiKeyStatus)
async def save_api_key(body: ApiKeyRequest) -> ApiKeyStatus:
    """Save API key to macOS Keychain and set it in the current process env."""
    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="API key cannot be empty.")
    if not key.startswith("sk-ant-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid API key format. Anthropic keys start with 'sk-ant-'.",
        )
    _try_keyring_set(key)
    os.environ["ANTHROPIC_API_KEY"] = key
    preview = f"****...{key[-4:]}"
    return ApiKeyStatus(has_key=True, key_preview=preview, source="keychain")


@router.delete("/api-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key() -> None:
    """Remove API key from Keychain and env."""
    try:
        import keyring
        keyring.delete_password(_KEYRING_SERVICE, _KEYRING_USERNAME)
    except Exception:
        pass
    os.environ.pop("ANTHROPIC_API_KEY", None)


@router.post("/test-connection", response_model=ConnectionTestResult)
async def test_connection() -> ConnectionTestResult:
    """Test if the current API key can reach the Anthropic API."""
    key = _try_keyring_get() or os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        return ConnectionTestResult(success=False, message="Nenhuma API key configurada.")
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=key)
        # Minimal test call — list models endpoint
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}],
        )
        if response.content:
            return ConnectionTestResult(success=True, message="Conexão com a Anthropic API estabelecida.")
        return ConnectionTestResult(success=False, message="Resposta vazia da API.")
    except Exception as exc:
        return ConnectionTestResult(success=False, message=f"Erro: {str(exc)[:120]}")


@router.get("/onboarding-completed")
async def get_onboarding_status(session: AsyncSession = Depends(get_session)) -> dict:
    """Return whether onboarding has been completed."""
    setting = await session.get(AppSetting, "onboarding_completed")
    return {"completed": setting is not None and setting.value == "1"}


@router.post("/onboarding-completed", status_code=status.HTTP_204_NO_CONTENT)
async def mark_onboarding_completed(session: AsyncSession = Depends(get_session)) -> None:
    """Mark onboarding as completed."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    existing = await session.get(AppSetting, "onboarding_completed")
    if existing:
        existing.value = "1"
        existing.updated_at = now
    else:
        session.add(AppSetting(key="onboarding_completed", value="1", updated_at=now))
    await session.commit()
