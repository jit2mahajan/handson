"""Shared pytest fixtures/setup for backend/tests/.

Ensures the repo root is on sys.path so `import backend.src...` works
regardless of how pytest was invoked (plain `pytest`, `python -m pytest`,
from repo root or elsewhere), without relying on an installed package or
PYTHONPATH being set externally.
"""
from __future__ import annotations

import sys
from pathlib import Path

# backend/tests/conftest.py -> repo root is two parents up.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
