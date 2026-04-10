# -*- mode: python ; coding: utf-8 -*-
"""
VFTStudio.spec — PyInstaller spec for VFT Studio macOS .app bundle.

Build with:
    python build.py

Or directly:
    pyinstaller VFTStudio.spec
"""

import sys
from pathlib import Path

block_cipher = None

ROOT = Path(SPECPATH)
FRONTEND_DIST = ROOT / "frontend" / "dist"
PROMPTS_DIR = ROOT / "backend" / "prompts"

a = Analysis(
    [str(ROOT / "main.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=[
        # Bundle pre-built frontend
        (str(FRONTEND_DIST), "frontend/dist"),
        # Bundle AI agent prompts
        (str(PROMPTS_DIR), "backend/prompts"),
        # Alembic migrations (for first-run DB init)
        (str(ROOT / "alembic"), "alembic"),
        (str(ROOT / "alembic.ini"), "."),
    ],
    hiddenimports=[
        # SQLAlchemy async drivers
        "aiosqlite",
        "sqlalchemy.dialects.sqlite",
        # PyWebView macOS backend
        "webview",
        "webview.platforms.cocoa",
        # FastAPI / Starlette
        "fastapi",
        "starlette",
        "uvicorn",
        "uvicorn.loops.asyncio",
        # Anthropic SDK
        "anthropic",
        # keyring macOS backend
        "keyring.backends.macOS",
        "keyring.backends.fail",
        # SSE
        "sse_starlette",
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
    console=False,          # --windowed: no terminal window
    disable_windowed_traceback=False,
    target_arch=None,       # universal2 for Apple Silicon + Intel
    codesign_identity=None,
    entitlements_file=None,
    icon=None,              # Add .icns file path here when available
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

app = BUNDLE(
    coll,
    name="VFT Studio.app",
    icon=None,              # Add .icns file path here when available
    bundle_identifier="com.vftstudio.app",
    info_plist={
        "CFBundleShortVersionString": "1.0.0",
        "CFBundleVersion": "1",
        "NSHighResolutionCapable": True,
        "NSRequiresAquaSystemAppearance": False,
        "LSMinimumSystemVersion": "13.0",
        "CFBundleDisplayName": "VFT Studio",
    },
)
