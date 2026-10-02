"""Unit tests for KeycloakCredentials and ApiRequestHandler token handling."""

import base64
import json as _json
from unittest.mock import MagicMock, patch

from codemie_sdk.auth.credentials import (
    KeycloakCredentials,
    LocalAuthCredentials,
    _decode_jwt_exp,
)
from codemie_sdk.utils.http import ApiRequestHandler

BASE_CONFIG = dict(
    server_url="https://auth.example.com",
    realm_name="test-realm",
    client_id="test-client",
    client_secret="test-secret",
)


def _mock_response(access_token="mock-token", expires_in=300):
    resp = MagicMock()
    resp.json.return_value = {"access_token": access_token, "expires_in": expires_in}
    resp.raise_for_status = MagicMock()
    return resp


# ── Priority / correctness ───────────────────────────────────────────────────


def test_external_token_wins_over_password_grant():
    """external_token + external_idp takes priority over username + password."""
    creds = KeycloakCredentials(
        **BASE_CONFIG,
        username="user",
        password="pass",
        external_token="ext-tok",
        external_idp="epam-idp",
    )
    with patch("requests.post", return_value=_mock_response()) as mock_post:
        creds.get_token()
    payload = dict(mock_post.call_args.kwargs["data"])
    assert payload["grant_type"] == "urn:ietf:params:oauth:grant-type:token-exchange"


def test_callable_external_token_is_invoked_each_keycloak_request():
    """Callable external_token must be called on every Keycloak token-exchange request."""
    call_count = [0]

    def token_getter():
        call_count[0] += 1
        return f"ext-token-{call_count[0]}"

    creds = KeycloakCredentials(
        **BASE_CONFIG, external_token=token_getter, external_idp="epam-idp"
    )
    tick = [0.0]
    with patch("time.monotonic", side_effect=lambda: tick[0]):
        with patch(
            "requests.post", return_value=_mock_response(expires_in=60)
        ) as mock_post:
            creds.get_token()  # t=0 — fetches; valid until t=30
            tick[0] = 31.0  # expired
            creds.get_token()  # t=31 — must fetch again

    assert call_count[0] == 2
    calls = mock_post.call_args_list
    assert dict(calls[0].kwargs["data"])["subject_token"] == "ext-token-1"
    assert dict(calls[1].kwargs["data"])["subject_token"] == "ext-token-2"


def test_callable_external_token_returns_fresh_value_on_each_exchange():
    """Each Keycloak request uses the value returned by the callable at that moment."""
    tokens = iter(["first-ext-tok", "second-ext-tok"])

    creds = KeycloakCredentials(
        **BASE_CONFIG, external_token=lambda: next(tokens), external_idp="epam-idp"
    )
    tick = [0.0]
    with patch("time.monotonic", side_effect=lambda: tick[0]):
        with patch(
            "requests.post", return_value=_mock_response(expires_in=60)
        ) as mock_post:
            creds.get_token()
            tick[0] = 31.0
            creds.get_token()

    subjects = [
        dict(c.kwargs["data"])["subject_token"] for c in mock_post.call_args_list
    ]
    assert subjects == ["first-ext-tok", "second-ext-tok"]


def test_token_exchange_payload_includes_subject_token_type():
    """RFC 8693 requires subject_token_type in token exchange requests."""
    creds = KeycloakCredentials(
        **BASE_CONFIG, external_token="ext-tok", external_idp="epam-idp"
    )
    with patch("requests.post", return_value=_mock_response()) as mock_post:
        creds.get_token()
    payload = dict(mock_post.call_args.kwargs["data"])
    assert (
        payload["subject_token_type"] == "urn:ietf:params:oauth:token-type:access_token"
    )


def test_token_exchange_payload_has_correct_fields():
    """Token exchange payload contains all required RFC 8693 fields."""
    creds = KeycloakCredentials(
        **BASE_CONFIG, external_token="my-ext-tok", external_idp="epam"
    )
    with patch("requests.post", return_value=_mock_response()) as mock_post:
        creds.get_token()
    payload = dict(mock_post.call_args.kwargs["data"])
    assert payload["grant_type"] == "urn:ietf:params:oauth:grant-type:token-exchange"
    assert payload["subject_token"] == "my-ext-tok"
    assert payload["subject_issuer"] == "epam"
    assert (
        payload["requested_token_type"]
        == "urn:ietf:params:oauth:token-type:access_token"
    )


def test_exchange_token_for_user_uses_correct_grant_type():
    """_exchange_token_for_user must not use the old 'grant-datasource_type' typo."""
    creds = KeycloakCredentials(**BASE_CONFIG)
    with patch("requests.post", return_value=_mock_response()) as mock_post:
        creds._exchange_token_for_user("user-id-123", "service-account-token")
    payload = dict(mock_post.call_args.kwargs["data"])
    assert "datasource" not in payload["grant_type"]
    assert payload["grant_type"] == "urn:ietf:params:oauth:grant-type:token-exchange"


# ── Token caching ────────────────────────────────────────────────────────────


def test_second_call_returns_cached_token():
    """Second get_token() call within the TTL must not hit Keycloak."""
    creds = KeycloakCredentials(**BASE_CONFIG)
    with patch("requests.post", return_value=_mock_response()) as mock_post:
        t1 = creds.get_token()
        t2 = creds.get_token()
    assert t1 == t2 == "mock-token"
    assert mock_post.call_count == 1


def test_cache_expires_and_refetches():
    """Token is re-fetched after expires_in - buffer seconds have elapsed."""
    creds = KeycloakCredentials(**BASE_CONFIG)
    tick = [0.0]
    with patch("time.monotonic", side_effect=lambda: tick[0]):
        with patch(
            "requests.post", return_value=_mock_response(expires_in=60)
        ) as mock_post:
            creds.get_token()  # t=0, fetches; valid until t=30 (60-30 buffer)
            tick[0] = 29.0  # still valid
            creds.get_token()
            tick[0] = 31.0  # past buffer — expired
            creds.get_token()  # should re-fetch
    assert mock_post.call_count == 2


def test_cache_uses_default_expiry_when_not_in_response():
    """Default 300 s expiry is used when Keycloak omits expires_in."""
    resp = MagicMock()
    resp.json.return_value = {"access_token": "tok"}
    resp.raise_for_status = MagicMock()

    creds = KeycloakCredentials(**BASE_CONFIG)
    tick = [0.0]
    with patch("time.monotonic", side_effect=lambda: tick[0]):
        with patch("requests.post", return_value=resp) as mock_post:
            creds.get_token()
            tick[0] = 269.0  # within 300 - 30 = 270 s window
            creds.get_token()
            tick[0] = 271.0  # past buffer
            creds.get_token()
    assert mock_post.call_count == 2


# ── Callable token in ApiRequestHandler ─────────────────────────────────────


def test_api_request_handler_calls_callable_token():
    """_get_headers() must invoke the callable on each call."""
    call_count = [0]

    def token_getter():
        call_count[0] += 1
        return f"dynamic-token-{call_count[0]}"

    handler = ApiRequestHandler("https://api.example.com", token_getter)
    h1 = handler._get_headers()
    h2 = handler._get_headers()
    assert h1["Authorization"] == "Bearer dynamic-token-1"
    assert h2["Authorization"] == "Bearer dynamic-token-2"
    assert call_count[0] == 2


def test_api_request_handler_accepts_string_token_unchanged():
    """Plain string token still works (backward compatibility)."""
    handler = ApiRequestHandler("https://api.example.com", "static-token")
    headers = handler._get_headers()
    assert headers["Authorization"] == "Bearer static-token"


def _make_test_jwt(exp: int) -> str:
    """Minimal 3-part JWT with a real base64url-encoded payload."""
    header = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b"=").decode()
    payload = (
        base64.urlsafe_b64encode(_json.dumps({"sub": "test", "exp": exp}).encode())
        .rstrip(b"=")
        .decode()
    )
    return f"{header}.{payload}.fakesig"


def _mock_login_response(access_token: str) -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {"access_token": access_token, "user": {}}
    resp.raise_for_status = MagicMock()
    return resp


# ── _decode_jwt_exp ──────────────────────────────────────────────────────────


def test_decode_jwt_exp_extracts_exp_from_valid_token():
    exp = 9999999999
    assert _decode_jwt_exp(_make_test_jwt(exp)) == float(exp)


def test_decode_jwt_exp_returns_none_when_no_exp_claim():
    header = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b"=").decode()
    payload = base64.urlsafe_b64encode(b'{"sub":"test"}').rstrip(b"=").decode()
    assert _decode_jwt_exp(f"{header}.{payload}.sig") is None


def test_decode_jwt_exp_returns_none_for_malformed_token():
    assert _decode_jwt_exp("notajwt") is None
    assert _decode_jwt_exp("only.two") is None


# ── LocalAuthCredentials ─────────────────────────────────────────────────────


def test_local_auth_calls_login_endpoint_with_email_and_password():
    creds = LocalAuthCredentials("http://localhost:8080", "admin@example.com", "pass")
    with patch(
        "requests.post", return_value=_mock_login_response("jwt-abc")
    ) as mock_post:
        token = creds.get_token()
    assert token == "jwt-abc"
    mock_post.assert_called_once_with(
        "http://localhost:8080/v1/local-auth/login",
        json={"email": "admin@example.com", "password": "pass"},
        verify=True,
    )


def test_local_auth_caches_token_within_ttl():
    creds = LocalAuthCredentials("http://localhost:8080", "a@b.com", "pass")
    with patch(
        "requests.post", return_value=_mock_login_response("jwt-1")
    ) as mock_post:
        t1 = creds.get_token()
        t2 = creds.get_token()
    assert t1 == t2 == "jwt-1"
    assert mock_post.call_count == 1


def test_local_auth_refetches_when_cache_expired():
    creds = LocalAuthCredentials("http://localhost:8080", "a@b.com", "pass")
    with patch(
        "requests.post", return_value=_mock_login_response("jwt-2")
    ) as mock_post:
        creds.get_token()
        creds._cached_token = "jwt-2"
        creds._token_expires_at = 0.0  # force expiry
        creds.get_token()
    assert mock_post.call_count == 2


# ── ApiRequestHandler localhost header behaviour ─────────────────────────────


def test_localhost_empty_token_sends_dev_header():
    handler = ApiRequestHandler("http://localhost:8080", "")
    headers = handler._get_headers()
    assert headers["Authorization"] == "dev-codemie-user"


def test_localhost_callable_token_sends_bearer():
    handler = ApiRequestHandler("http://localhost:8080", lambda: "local-jwt")
    headers = handler._get_headers()
    assert headers["Authorization"] == "Bearer local-jwt"
