"""Integration tests for CodeMieClient localhost authentication branches."""

from unittest.mock import patch

from codemie_sdk.client.client import CodeMieClient
from codemie_sdk.auth.credentials import LocalAuthCredentials


def test_localhost_with_credentials_sends_bearer_token():
    with patch.object(LocalAuthCredentials, "get_token", return_value="local-jwt-abc"):
        client = CodeMieClient(
            auth_server_url="",
            auth_realm_name="",
            codemie_api_domain="http://localhost:8080",
            username="admin@example.com",
            password="adminpass",
        )
    headers = client.assistants._api._get_headers()
    assert headers["Authorization"] == "Bearer local-jwt-abc"


def test_localhost_without_credentials_sends_dev_header():
    client = CodeMieClient(
        auth_server_url="",
        auth_realm_name="",
        codemie_api_domain="http://localhost:8080",
    )
    headers = client.assistants._api._get_headers()
    assert headers["Authorization"] == "dev-codemie-user"


def test_token_property_localhost_with_credentials():
    with patch.object(LocalAuthCredentials, "get_token", return_value="local-jwt-v1"):
        client = CodeMieClient(
            auth_server_url="",
            auth_realm_name="",
            codemie_api_domain="http://localhost:8080",
            username="admin@example.com",
            password="adminpass",
        )
    with patch.object(LocalAuthCredentials, "get_token", return_value="local-jwt-v2"):
        assert client.token == "local-jwt-v2"


def test_token_property_localhost_without_credentials():
    client = CodeMieClient(
        auth_server_url="",
        auth_realm_name="",
        codemie_api_domain="http://localhost:8080",
    )
    assert client.token == ""


def test_refresh_token_localhost_with_credentials():
    with patch.object(LocalAuthCredentials, "get_token", return_value="local-jwt-v1"):
        client = CodeMieClient(
            auth_server_url="",
            auth_realm_name="",
            codemie_api_domain="http://localhost:8080",
            username="admin@example.com",
            password="adminpass",
        )
    with patch.object(LocalAuthCredentials, "get_token", return_value="local-jwt-v2"):
        refreshed = client.refresh_token()
    assert refreshed == "local-jwt-v2"


def test_refresh_token_localhost_without_credentials():
    client = CodeMieClient(
        auth_server_url="",
        auth_realm_name="",
        codemie_api_domain="http://localhost:8080",
    )
    assert client.refresh_token() == ""
