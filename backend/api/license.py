from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import AppSetting
from backend.services.licensing import (
    load_serial_hashes,
    normalize_serial_key,
    serial_hash,
    serial_preview,
    validate_serial_key,
)

router = APIRouter(prefix="/license", tags=["license"])


class LicenseStatus(BaseModel):
    model_config = ConfigDict(frozen=True)
    activated: bool
    key_preview: str
    serial_catalog_loaded: bool


class LicenseActivationRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    serial_key: str


async def _setting(session: AsyncSession, key: str) -> AppSetting | None:
    return await session.get(AppSetting, key)


@router.get("/status", response_model=LicenseStatus)
async def get_license_status(session: AsyncSession = Depends(get_session)) -> LicenseStatus:
    key_hash = await _setting(session, "license_key_hash")
    preview = await _setting(session, "license_key_preview")
    return LicenseStatus(
        activated=bool(key_hash and key_hash.value),
        key_preview=preview.value if preview else "",
        serial_catalog_loaded=bool(load_serial_hashes()),
    )


@router.post("/activate", response_model=LicenseStatus)
async def activate_license(
    body: LicenseActivationRequest,
    session: AsyncSession = Depends(get_session),
) -> LicenseStatus:
    serial_key = normalize_serial_key(body.serial_key)
    if not load_serial_hashes():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Lista de seriais não encontrada neste build.",
        )
    if not validate_serial_key(serial_key):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Serial key inválida.",
        )

    now = datetime.now(timezone.utc).isoformat()
    values = {
        "license_key_hash": serial_hash(serial_key),
        "license_key_preview": serial_preview(serial_key),
        "license_activated_at": now,
    }
    for key, value in values.items():
        existing = await _setting(session, key)
        if existing:
            existing.value = value
            existing.updated_at = now
        else:
            session.add(AppSetting(key=key, value=value, updated_at=now))
    await session.commit()
    return LicenseStatus(
        activated=True,
        key_preview=serial_preview(serial_key),
        serial_catalog_loaded=True,
    )
