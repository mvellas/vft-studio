from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SERIAL_PATTERN = re.compile(r"^VFT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")


def normalize_serial_key(value: str) -> str:
    serial = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    if serial.startswith("VFT"):
        serial = serial[3:]
    chunks = [serial[i:i + 4] for i in range(0, min(len(serial), 16), 4)]
    return "VFT-" + "-".join(chunks)


def serial_hash(serial_key: str) -> str:
    return hashlib.sha256(normalize_serial_key(serial_key).encode("utf-8")).hexdigest()


def serial_preview(serial_key: str) -> str:
    normalized = normalize_serial_key(serial_key)
    return f"{normalized[:8]}...{normalized[-4:]}"


def _resource_root() -> Path:
    frozen_root = getattr(sys, "_MEIPASS", None)
    if frozen_root:
        return Path(frozen_root)
    return Path(__file__).resolve().parents[2]


def serial_catalog_path() -> Path | None:
    env_path = os.environ.get("VFT_STUDIO_LICENSE_FILE")
    candidates = [
        Path(env_path).expanduser() if env_path else None,
        _resource_root() / "license" / "serial-keys.json",
        _resource_root() / ".local" / "serial-keys.json",
        Path.home() / "VFTStudio" / "serial-keys.json",
    ]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    return None


def load_serial_hashes() -> set[str]:
    path = serial_catalog_path()
    if path is None:
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    entries: list[Any] = data.get("keys", []) if isinstance(data, dict) else []
    hashes: set[str] = set()
    for entry in entries:
        if isinstance(entry, str):
            hashes.add(serial_hash(entry))
            continue
        if not isinstance(entry, dict):
            continue
        raw_hash = str(entry.get("sha256") or "").strip().lower()
        raw_key = str(entry.get("key") or "").strip()
        if raw_hash:
            hashes.add(raw_hash)
        if raw_key:
            hashes.add(serial_hash(raw_key))
    return hashes


def validate_serial_key(serial_key: str) -> bool:
    normalized = normalize_serial_key(serial_key)
    if not SERIAL_PATTERN.match(normalized):
        return False
    return serial_hash(normalized) in load_serial_hashes()
