# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for the Windows VFT Studio executable.

Run on Windows with:
    python build.py --target windows
"""

from pathlib import Path

block_cipher = None

ROOT = Path(SPECPATH)
FRONTEND_DIST = ROOT / "frontend" / "dist"
PROMPTS_DIR = ROOT / "backend" / "prompts"
SERIAL_KEYS = ROOT / ".local" / "serial-keys.json"
APP_ICON = ROOT / "packaging" / "icons" / "app-icon.ico"

datas = [
    (str(FRONTEND_DIST), "frontend/dist"),
    (str(PROMPTS_DIR), "backend/prompts"),
    (str(ROOT / "alembic"), "alembic"),
    (str(ROOT / "alembic.ini"), "."),
]

if SERIAL_KEYS.exists():
    datas.append((str(SERIAL_KEYS), "license"))

a = Analysis(
    [str(ROOT / "main.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "aiosqlite",
        "sqlalchemy.dialects.sqlite",
        "webview",
        "webview.platforms.edgechromium",
        "fastapi",
        "starlette",
        "uvicorn",
        "uvicorn.loops.asyncio",
        "anthropic",
        "keyring.backends.Windows",
        "keyring.backends.fail",
        "sse_starlette",
        "win32timezone",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "numpy",
        "pandas",
        "scipy",
        "PIL",
        "cv2",
        "torch",
        "tensorflow",
        "jupyter",
        "IPython",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="VFT Studio",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(APP_ICON) if APP_ICON.exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="VFT Studio",
)
