# Releasing

Each package is released on its own by a GitHub Actions workflow. There is no manual publish step.

| Package | Registry | Workflow | Tag pattern |
|---------|----------|----------|-------------|
| `codemie-sdk-python` | PyPI | `publish-python.yml` | `python-v<version>` |
| `codemie-sdk` | npm | `publish-node.yml` | `node-v<version>` |

## How to release

1. Raise the version in the manifest (`sdk/codemie-python/pyproject.toml` or `sdk/codemie-nodejs/package.json`) and merge it to `main`. Python also keeps `__version__` in `src/codemie_sdk/__init__.py`; keep the two equal.
2. Push a tag that matches the new version, for example `python-v0.2.16` or `node-v0.3.1`. The tag version must equal the manifest version.
3. The workflow runs the `verify` job, then the `publish` job. The `publish` job uses the `release` environment.

A manual run is also possible: start the workflow with `workflow_dispatch`. It builds and checks only (`dry_run` is on by default). To publish from a manual run, set `dry_run` off, type `publish` in the `publish` input, and start the run from the package tag (`python-v*` or `node-v*`). The tag version must equal the manifest version. A run from a branch, or without all three, does not publish.

An npm pre-release version (one with a `-` suffix, such as `1.0.0-beta.1`) is published under the `next` dist-tag, not `latest`.

## Version gate

`scripts/release/check_version.py` compares the manifest version with the live registry. The release stops if the version is equal to or lower than the highest published version. Pre-release versions follow PEP 440 for PyPI and semantic versioning for npm, so `1.0.0rc1` and `1.0.0-beta.1` sort before `1.0.0`.

- A package that is not on the registry yet (HTTP 404) has no latest version. The check passes.
- A timeout, network error or malformed registry response stops the release. The gate fails closed.
- On a tag push, the tag version must also equal the manifest version.

Run it locally:

```bash
python3 scripts/release/check_version.py --ecosystem pypi --name codemie-sdk-python --version 0.2.16
python3 scripts/release/check_version.py --ecosystem npm --name codemie-sdk --version 0.3.1
```

## Registry setup

Do this once, by a repository administrator.

- **GitHub environment `release`.** Create it in Settings > Environments. Restrict deployments to tags (add rules for `python-v*` and `node-v*`). Add required reviewers if a second approval is wanted.
- **PyPI trusted publisher.** In the `codemie-sdk-python` project on PyPI, add a trusted publisher: owner `codemie-ai`, repository `codemie-sdk`, workflow `publish-python.yml`, environment `release`. No token is stored. Only the PyPI `publish` job has `id-token: write`.
- **npm token.** Create an automation token for `codemie-sdk` and store it as the secret `NPM_TOKEN`, preferably on the `release` environment. Only the npm `publish` job reads it.
