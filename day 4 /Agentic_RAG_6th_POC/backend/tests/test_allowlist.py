"""Unit tests for backend/src/utils/allowlist.py.

No outbound HTTP here at all -- these tests only exercise local JSON file
reads (a temp allowlist file, never the real network-facing allowlist
lookups the retrieval clients perform against upstream APIs).
"""
from __future__ import annotations

import json
import os
import time

import pytest

from backend.src.utils import allowlist as allowlist_mod
from backend.src.utils.allowlist import AllowlistError


@pytest.fixture()
def temp_allowlist(tmp_path, monkeypatch):
    """Point the module at a temp allowlist file and reset its in-process cache.

    Yields a helper namespace with `.path` and `.write(data)` so each test can
    control exactly what's on disk and force cache reload scenarios.
    """
    path = tmp_path / "sources.json"
    path.write_text(json.dumps({"target_identification_validation": ["allowed.example.org"]}))

    monkeypatch.setattr(allowlist_mod, "ALLOWLIST_PATH", path)
    # Reset the module-level cache so tests don't see state left over from a
    # previous test or from the real allowlist file having been read already.
    monkeypatch.setattr(allowlist_mod, "_cache", None)
    monkeypatch.setattr(allowlist_mod, "_cache_mtime", None)

    class _Helper:
        def __init__(self, p):
            self.path = p

        def write(self, data: dict) -> None:
            self.path.write_text(json.dumps(data))

    return _Helper(path)


def test_is_allowed_true_for_listed_host(temp_allowlist):
    assert allowlist_mod.is_allowed("https://allowed.example.org/foo") is True


def test_is_allowed_false_for_unlisted_host(temp_allowlist):
    assert allowlist_mod.is_allowed("https://not-allowed.example.org/foo") is False


def test_is_allowed_respects_expected_domain(temp_allowlist):
    # Listed, but under a different domain than requested.
    assert (
        allowlist_mod.is_allowed(
            "https://allowed.example.org/foo",
            expected_domain="chemical_compound_intelligence",
        )
        is False
    )
    assert (
        allowlist_mod.is_allowed(
            "https://allowed.example.org/foo",
            expected_domain="target_identification_validation",
        )
        is True
    )


def test_require_allowed_returns_host_for_allowed_url(temp_allowlist):
    host = allowlist_mod.require_allowed("https://allowed.example.org/path")
    assert host == "allowed.example.org"


def test_require_allowed_raises_for_disallowed_host(temp_allowlist):
    with pytest.raises(AllowlistError):
        allowlist_mod.require_allowed("https://evil.example.org/path")


def test_require_allowed_raises_for_wrong_domain(temp_allowlist):
    with pytest.raises(AllowlistError):
        allowlist_mod.require_allowed(
            "https://allowed.example.org/path",
            expected_domain="chemical_compound_intelligence",
        )


def test_require_allowed_raises_for_unparsable_url(temp_allowlist):
    with pytest.raises(AllowlistError):
        allowlist_mod.require_allowed("::::not a url::::")


def test_allowlist_error_message_never_leaks_filesystem_path(temp_allowlist):
    try:
        allowlist_mod.require_allowed("https://evil.example.org/path")
        assert False, "expected AllowlistError"
    except AllowlistError as exc:
        assert str(temp_allowlist.path) not in str(exc)


def test_mtime_cache_reload_picks_up_edits(temp_allowlist):
    # Prime the cache with the original (single-host) file.
    assert allowlist_mod.is_allowed("https://new-host.example.org/x") is False

    # Rewrite the file to add a new host. Bump mtime explicitly (past-the-
    # future) in case the filesystem's mtime resolution is coarser than the
    # time elapsed between writes in this test.
    temp_allowlist.write(
        {
            "target_identification_validation": [
                "allowed.example.org",
                "new-host.example.org",
            ]
        }
    )
    future = time.time() + 5
    os.utime(temp_allowlist.path, (future, future))

    # Cache must reload automatically -- no reload_allowlist() call needed.
    assert allowlist_mod.is_allowed("https://new-host.example.org/x") is True


def test_reload_allowlist_forces_unconditional_reread(temp_allowlist):
    assert allowlist_mod.is_allowed("https://second-host.example.org/x") is False

    temp_allowlist.write(
        {
            "target_identification_validation": [
                "allowed.example.org",
                "second-host.example.org",
            ]
        }
    )
    # Deliberately do NOT touch mtime -- reload_allowlist() must not depend
    # on the mtime check at all.
    allowlist_mod.reload_allowlist()

    assert allowlist_mod.is_allowed("https://second-host.example.org/x") is True
