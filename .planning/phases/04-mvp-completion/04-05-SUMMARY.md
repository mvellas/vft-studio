---
phase: 04-mvp-completion
plan: "05"
type: summary
completed_at: "2026-04-09"
---

# Plan 04-05 Summary: Tests + macOS Packaging

## What was built

### Tests (tests/)
- `tests/__init__.py`
- `tests/test_engine.py` — 22 unit tests: ProcessManager (all_steps count, ids únicos, get_step, get_next_step, config filtering, condition matching), WITIParser (fundamental/means/strategic/other/case-insensitive/frozen), CoCParser (parse + determine_coc_action)
- `tests/test_api.py` — 20 integration tests via FastAPI TestClient com in-memory SQLite: health, projects CRUD, phases/current-step, alternatives CRUD, settings API (api-key status/save/reject-invalid, onboarding)
- `tests/test_agents.py` — 9 unit tests: BaseAgent init/invoke/retry/stream (mocked Anthropic SDK), Phase3SpecialistAgent prompt rendering, FacilitatorAgent prompt rendering

### Build & Packaging
- `VFTStudio.spec` — PyInstaller spec: entry point `main.py`, datas (frontend/dist, backend/prompts, alembic), hiddenimports (aiosqlite, webview.platforms.cocoa, keyring.backends.macOS, etc.), BUNDLE com info_plist macOS (CFBundleShortVersionString=1.0.0, NSHighResolutionCapable, LSMinimumSystemVersion=13.0)
- `build.py` — build script com argparse: `--skip-frontend`, `--clean`; etapa 1 = npm run build; etapa 2 = pyinstaller VFTStudio.spec
- `pyproject.toml` — adicionado `[tool.pytest.ini_options]` (asyncio_mode=auto), `[tool.coverage.run]`, `[tool.coverage.report]` (fail_under=60)

## Key Decisions
- TestClient com override de `get_session` para DB in-memory isolado por test fixture
- BaseAgent stream testado com mock de async context manager + async generator
- PyInstaller `--windowed` (console=False) para .app sem terminal
- hiddenimport `keyring.backends.macOS` explícito — PyInstaller não detecta automaticamente backends de keyring
- `build.py` usa `sys.executable` para garantir que PyInstaller roda no mesmo venv
