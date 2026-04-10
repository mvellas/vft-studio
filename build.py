"""
build.py — VFT Studio macOS build script.

Steps:
  1. npm run build (frontend → frontend/dist/)
  2. pyinstaller VFTStudio.spec (backend + frontend → dist/VFT Studio.app)

Usage:
    python build.py [--skip-frontend] [--clean]

Options:
    --skip-frontend  Skip npm build (use existing frontend/dist/)
    --clean          Remove dist/ and build/ before building
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIR = ROOT / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build"


def run(cmd: list[str], cwd: Path | None = None) -> None:
    """Run a command, raising on non-zero exit."""
    print(f"  → {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or ROOT, capture_output=False)
    if result.returncode != 0:
        print(f"ERROR: command failed with exit code {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def clean() -> None:
    """Remove dist/ and build/ directories."""
    for d in (DIST_DIR, BUILD_DIR):
        if d.exists():
            print(f"Removing {d} ...")
            shutil.rmtree(d)


def build_frontend() -> None:
    """Run npm run build in the frontend directory."""
    print("\n[1/2] Building frontend...")
    if not (FRONTEND_DIR / "node_modules").exists():
        print("  Installing npm dependencies...")
        run(["npm", "install"], cwd=FRONTEND_DIR)
    run(["npm", "run", "build"], cwd=FRONTEND_DIR)
    if not (FRONTEND_DIST / "index.html").exists():
        print("ERROR: frontend build did not produce dist/index.html", file=sys.stderr)
        sys.exit(1)
    print("  Frontend built successfully.")


def build_app() -> None:
    """Run PyInstaller to produce VFT Studio.app."""
    print("\n[2/2] Building macOS .app with PyInstaller...")
    run([sys.executable, "-m", "PyInstaller", "VFTStudio.spec", "--noconfirm"])
    app_path = DIST_DIR / "VFT Studio.app"
    if app_path.exists():
        print(f"\n✓ Build complete: {app_path}")
    else:
        print("\nWARNING: .app bundle not found in dist/. Check PyInstaller output above.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build VFT Studio macOS app")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip npm build")
    parser.add_argument("--clean", action="store_true", help="Clean dist/ and build/ first")
    args = parser.parse_args()

    print("VFT Studio — macOS build\n")

    if args.clean:
        clean()

    if not args.skip_frontend:
        build_frontend()
    else:
        print("[1/2] Skipping frontend build (--skip-frontend).")
        if not FRONTEND_DIST.exists():
            print("ERROR: frontend/dist/ not found. Run without --skip-frontend first.", file=sys.stderr)
            sys.exit(1)

    build_app()


if __name__ == "__main__":
    main()
