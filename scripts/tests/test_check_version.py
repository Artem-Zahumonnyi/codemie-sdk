import json
import subprocess
import sys
from pathlib import Path
from urllib.error import URLError

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "release"))
import check_version as cv  # noqa: E402

SCRIPT = ROOT / "scripts" / "release" / "check_version.py"


def pypi(*versions):
    return lambda url: {"releases": {v: [] for v in versions}}


def npm(*versions):
    return lambda url: {"versions": {v: {} for v in versions}}


def test_equal_version_fails():
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.0.0", fetch=pypi("1.0.0"))


def test_higher_passes_and_returns_latest():
    assert cv.check("pypi", "x", "1.0.1", fetch=pypi("0.9", "1.0.0")) == "1.0.0"
    assert cv.check("npm", "x", "1.1.0", fetch=npm("1.0.0")) == "1.0.0"


def test_lower_fails():
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "0.9.0", fetch=npm("1.0.0"))


def test_already_published_older_version_fails():
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "0.5", fetch=pypi("0.5", "1.0.0"))


def test_highest_in_list_is_used_not_insertion_order():
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.5.0", fetch=pypi("2.0.0", "1.0.0"))


def test_pep440_prerelease_ordering():
    assert cv.check("pypi", "x", "1.0.0", fetch=pypi("1.0.0rc1")) == "1.0.0rc1"
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.0.0rc1", fetch=pypi("1.0.0"))
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.0.0.dev1", fetch=pypi("1.0.0a1"))
    assert cv.check("pypi", "x", "1.0.0.post1", fetch=pypi("1.0.0")) == "1.0.0"
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.0", fetch=pypi("1.0.0"))


def test_semver_prerelease_ordering():
    assert cv.check("npm", "x", "1.0.0", fetch=npm("1.0.0-beta.1")) == "1.0.0-beta.1"
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "1.0.0-beta.1", fetch=npm("1.0.0"))
    assert cv.check("npm", "x", "1.0.0-beta.11", fetch=npm("1.0.0-beta.2")) == "1.0.0-beta.2"
    assert cv.check("npm", "x", "1.0.0-rc.1", fetch=npm("1.0.0-beta.2")) == "1.0.0-beta.2"
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "1.0.0-alpha", fetch=npm("1.0.0-alpha.1"))


def test_semver_build_metadata_ignored():
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "1.0.0+b2", fetch=npm("1.0.0+b1"))


def test_not_on_registry_passes():
    assert cv.check("pypi", "x", "0.1.0", fetch=lambda url: None) == ""


def test_malformed_payload_fails_closed():
    with pytest.raises(cv.VersionError):
        cv.check("pypi", "x", "1.0.0", fetch=lambda url: ["nope"])
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "1.0.0", fetch=lambda url: {"versions": []})


def test_unparseable_own_version_fails():
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "not-a-version", fetch=npm("1.0.0"))


def test_unknown_ecosystem_fails():
    with pytest.raises(cv.VersionError):
        cv.check("cargo", "x", "1.0.0", fetch=npm())


def test_urls():
    seen = []
    cv.check("pypi", "a-b", "1.0.0", fetch=lambda u: seen.append(u))
    cv.check("npm", "a-b", "1.0.0", fetch=lambda u: seen.append(u))
    assert seen == ["https://pypi.org/pypi/a-b/json", "https://registry.npmjs.org/a-b"]


def test_tag_matching():
    cv.check_tag("python-v1.2.3", "1.2.3")
    cv.check_tag("node-v1.2.3", "1.2.3")
    cv.check_tag("python-v1.2.3", "1.2.3", "python")
    with pytest.raises(cv.VersionError):
        cv.check_tag("node-v1.2.3", "1.2.4")
    with pytest.raises(cv.VersionError):
        cv.check_tag("v1.2.3", "1.2.3")
    with pytest.raises(cv.VersionError):
        cv.check_tag("node-v1.2.3", "1.2.3", "python")


def run_cli(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)


def test_cli_tag_mismatch_exits_1():
    r = run_cli("--ecosystem", "npm", "--name", "x", "--version", "1.0.0", "--tag", "node-v2.0.0")
    assert r.returncode == 1
    assert "tag" in r.stderr.lower()


def test_cli_network_error_exits_1(monkeypatch, capsys):
    def boom(url):
        raise URLError("down")

    monkeypatch.setattr(cv, "_fetch_json", boom)
    assert cv.main(["--ecosystem", "pypi", "--name", "x", "--version", "1.0.0"]) == 1
    assert "down" in capsys.readouterr().err


def test_cli_bad_json_exits_1(monkeypatch):
    def bad(url):
        return json.loads("{not json")

    monkeypatch.setattr(cv, "_fetch_json", bad)
    assert cv.main(["--ecosystem", "pypi", "--name", "x", "--version", "1.0.0"]) == 1


def test_cli_success_exits_0(monkeypatch):
    monkeypatch.setattr(cv, "_fetch_json", lambda url: None)
    assert cv.main(["--ecosystem", "pypi", "--name", "x", "--version", "1.0.0", "--tag", "python-v1.0.0"]) == 0


def http_error(code):
    return cv.urllib.error.HTTPError("https://x", code, "msg", {}, None)


def test_real_fetch_404_means_not_published(monkeypatch):
    def raise_404(req, timeout):
        raise http_error(404)

    monkeypatch.setattr(cv.urllib.request, "urlopen", raise_404)
    assert cv._fetch_json("https://x") is None
    assert cv.main(["--ecosystem", "npm", "--name", "x", "--version", "1.0.0"]) == 0


def test_real_fetch_server_error_fails_closed(monkeypatch):
    def raise_500(req, timeout):
        raise http_error(500)

    monkeypatch.setattr(cv.urllib.request, "urlopen", raise_500)
    with pytest.raises(cv.urllib.error.HTTPError):
        cv._fetch_json("https://x")
    assert cv.main(["--ecosystem", "pypi", "--name", "x", "--version", "1.0.0"]) == 1


def test_unparseable_registry_versions_are_skipped_with_warning(capsys):
    assert cv.check("pypi", "x", "2.0.0", fetch=pypi("1.0.0", "legacy-build")) == "1.0.0"
    assert "legacy-build" in capsys.readouterr().err
    assert cv.check("npm", "x", "2.0.0", fetch=npm("1.0.0", "1.0")) == "1.0.0"
    assert "1.0" in capsys.readouterr().err
    with pytest.raises(cv.VersionError):
        cv.check("npm", "x", "1.0.0", fetch=npm("1.0.0", "garbage"))
