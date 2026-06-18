"""
build.py — VFT Studio packaging script.

Steps:
  1. npm run build (frontend → frontend/dist/)
  2. pyinstaller platform spec (backend + frontend → dist/)
  3. optionally package macOS .dmg or Windows installer/zip

Usage:
    python build.py [--target current|macos|windows] [--skip-frontend] [--clean] [--package]

Options:
    --target         Build target for the current OS family
    --skip-frontend  Skip npm build (use existing frontend/dist/)
    --clean          Remove dist/ and build/ before building
    --package        Create a .dmg on macOS or installer/zip on Windows
"""
from __future__ import annotations

import argparse
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIR = ROOT / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build"
LOCAL_SERIAL_KEYS = ROOT / ".local" / "serial-keys.json"


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


def current_target() -> str:
    if sys.platform == "darwin":
        return "macos"
    if sys.platform.startswith("win"):
        return "windows"
    return "unsupported"


def require_local_serial_keys(allow_missing: bool) -> None:
    if LOCAL_SERIAL_KEYS.exists():
        return
    message = (
        "ERROR: .local/serial-keys.json not found. "
        "Create the local serial catalog before building distributable packages."
    )
    if allow_missing:
        print(f"WARNING: {message}")
        return
    print(message, file=sys.stderr)
    sys.exit(1)


def build_frontend() -> None:
    """Run npm run build in the frontend directory."""
    print("\n[1/3] Building frontend...")
    if not (FRONTEND_DIR / "node_modules").exists():
        print("  Installing npm dependencies...")
        run(["npm", "install"], cwd=FRONTEND_DIR)
    run(["npm", "run", "build"], cwd=FRONTEND_DIR)
    if not (FRONTEND_DIST / "index.html").exists():
        print("ERROR: frontend build did not produce dist/index.html", file=sys.stderr)
        sys.exit(1)
    print("  Frontend built successfully.")


def build_app(target: str) -> Path:
    """Run PyInstaller to produce the platform app bundle."""
    spec = "VFTStudio.spec" if target == "macos" else "VFTStudio.Windows.spec"
    print(f"\n[2/3] Building {target} app with PyInstaller...")
    run([sys.executable, "-m", "PyInstaller", spec, "--noconfirm"])
    app_path = DIST_DIR / ("VFT Studio.app" if target == "macos" else "VFT Studio")
    if app_path.exists():
        print(f"  App build complete: {app_path}")
    else:
        print(f"WARNING: expected app output not found: {app_path}")
    return app_path


def package_macos(app_path: Path) -> None:
    dmg_path = DIST_DIR / "VFT-Studio-macOS.dmg"
    print("\n[3/3] Creating macOS .dmg installer...")
    run([
        "hdiutil",
        "create",
        "-volname",
        "VFT Studio",
        "-srcfolder",
        str(app_path),
        "-ov",
        "-format",
        "UDZO",
        str(dmg_path),
    ])
    print(f"\n✓ Installer complete: {dmg_path}")


def package_windows(app_path: Path) -> None:
    print("\n[3/3] Creating Windows installer/package...")
    iscc = shutil.which("ISCC")
    if iscc:
        run([iscc, str(ROOT / "installer" / "windows" / "vft-studio.iss")])
        print(f"\n✓ Installer complete: {DIST_DIR / 'VFT-Studio-Setup.exe'}")
        return
    zip_base = DIST_DIR / "VFT-Studio-Windows"
    shutil.make_archive(str(zip_base), "zip", root_dir=app_path)
    print(f"\n✓ Windows zip package complete: {zip_base.with_suffix('.zip')}")
    print("  Install Inno Setup and rerun with --package to produce VFT-Studio-Setup.exe.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build VFT Studio app packages")
    parser.add_argument("--target", choices=["current", "macos", "windows"], default="current", help="Build target")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip npm build")
    parser.add_argument("--clean", action="store_true", help="Clean dist/ and build/ first")
    parser.add_argument("--package", action="store_true", help="Create installable package after PyInstaller")
    parser.add_argument("--allow-missing-license", action="store_true", help="Allow builds without local serial catalog")
    args = parser.parse_args()

    target = current_target() if args.target == "current" else args.target
    host = current_target()
    print(f"VFT Studio — {target} build on {platform.system()}\n")

    if target == "unsupported":
        print("ERROR: supported build hosts are macOS and Windows.", file=sys.stderr)
        sys.exit(1)
    if target != host:
        print(
            f"ERROR: PyInstaller builds must run on the target OS. "
            f"Current host is {host}; requested {target}.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.clean:
        clean()

    require_local_serial_keys(args.allow_missing_license)

    if not args.skip_frontend:
        build_frontend()
    else:
        print("[1/3] Skipping frontend build (--skip-frontend).")
        if not FRONTEND_DIST.exists():
            print("ERROR: frontend/dist/ not found. Run without --skip-frontend first.", file=sys.stderr)
            sys.exit(1)

    app_path = build_app(target)
    if args.package:
        if target == "macos":
            package_macos(app_path)
        elif target == "windows":
            package_windows(app_path)
    else:
        print("\n[3/3] Packaging skipped. Use --package to create installer artifacts.")


if __name__ == "__main__":
    main()
