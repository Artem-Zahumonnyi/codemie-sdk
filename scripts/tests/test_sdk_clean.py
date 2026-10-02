from pathlib import Path

import pytest

import scan_internal_refs as scan

ROOT = Path(__file__).resolve().parents[2]
SDKS = ["sdk/codemie-python", "sdk/codemie-nodejs"]
EXCLUDED_NAMES = {"CLAUDE.md"}
EXCLUDED_PREFIXES = ("docs/superpowers/",)


def _findings(sdk: str):
    base = ROOT / sdk
    out = []
    for f in scan.scan_tree(base):
        if Path(f.path).name in EXCLUDED_NAMES or f.path.startswith(EXCLUDED_PREFIXES):
            continue
        out.append(f"{sdk}/{f.path}:{f.line}: {f.rule}")
    return out


@pytest.mark.parametrize("sdk", SDKS)
def test_sdk_folders_have_no_internal_references(sdk):
    assert _findings(sdk) == []


@pytest.mark.parametrize("sdk", SDKS)
def test_readme_points_to_issues_and_security(sdk):
    text = (ROOT / sdk / "README.md").read_text(encoding="utf-8")
    assert "GitHub Issues" in text
    assert "SECURITY.md" in text


def test_manifests_have_no_epam_email():
    for rel in ("sdk/codemie-python/pyproject.toml", "sdk/codemie-nodejs/package.json"):
        assert "@" + "epam.com" not in (ROOT / rel).read_text(encoding="utf-8").lower()
