from codemie_sdk.services.customer_config_service import CustomerConfigService


class DummyApi:
    def __init__(self, components):
        self._components = components

    def get(self, endpoint, response_model, wrap_response=True):
        return self._components


def test_is_mcp_custom_servers_disabled_true_when_component_present():
    service = CustomerConfigService("https://api.example.com", "token")
    service._api = DummyApi(
        [{"id": "mcpCustomServersDisabled", "settings": {"enabled": True}}]
    )
    assert service.is_mcp_custom_servers_disabled() is True


def test_is_mcp_custom_servers_disabled_false_when_component_absent():
    service = CustomerConfigService("https://api.example.com", "token")
    service._api = DummyApi([{"id": "chatDisclaimer", "settings": {}}])
    assert service.is_mcp_custom_servers_disabled() is False
