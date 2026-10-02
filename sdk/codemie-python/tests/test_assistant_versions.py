import datetime
from types import SimpleNamespace

from codemie_sdk.services.assistant import AssistantService
from codemie_sdk.models.assistant import AssistantVersion


class DummyApi:
    def __init__(self):
        self.last_call = SimpleNamespace(endpoint=None, params=None)

    def get(self, endpoint, response_model, params=None, wrap_response=True):
        self.last_call.endpoint = endpoint
        self.last_call.params = params or {}
        if endpoint.endswith("/versions"):
            return {
                "versions": [
                    {
                        "version_number": 1,
                        "created_date": datetime.datetime.now(datetime.UTC).isoformat(),
                        "system_prompt": "v1",
                        "context": [],
                        "toolkits": [],
                        "mcp_servers": [],
                        "assistant_ids": [],
                    }
                ]
            }
        elif "compare" in endpoint:
            return {
                "diff": {"system_prompt": ["changed"]},
                "summary": "system_prompt updated",
            }
        elif "/versions/" in endpoint:
            return {
                "version_number": 2,
                "created_date": datetime.datetime.now(datetime.UTC).isoformat(),
                "system_prompt": "v2",
                "context": [],
                "toolkits": [],
                "mcp_servers": [],
                "assistant_ids": [],
            }
        else:
            return {}


def test_list_versions_calls_correct_endpoint():
    service = AssistantService("https://api.example.com", "token")
    dummy_api = DummyApi()
    service._api = dummy_api

    res = service.list_versions("assistant-123", page=1, per_page=5)

    assert dummy_api.last_call.endpoint == "/v1/assistants/assistant-123/versions"
    assert dummy_api.last_call.params == {"page": 1, "per_page": 5}
    assert isinstance(res, list)
    assert len(res) == 1
    assert isinstance(res[0], AssistantVersion)
    assert res[0].version_number == 1


def test_get_version_calls_correct_endpoint():
    service = AssistantService("https://api.example.com", "token")
    dummy_api = DummyApi()
    service._api = dummy_api

    res = service.get_version("assistant-123", 7)

    assert dummy_api.last_call.endpoint == "/v1/assistants/assistant-123/versions/7"
    assert isinstance(res, AssistantVersion)
    assert res.version_number == 2


def test_compare_versions_calls_correct_endpoint():
    service = AssistantService("https://api.example.com", "token")
    dummy_api = DummyApi()
    service._api = dummy_api

    res = service.compare_versions("assistant-123", 1, 2)

    assert (
        dummy_api.last_call.endpoint
        == "/v1/assistants/assistant-123/versions/1/compare/2"
    )
    assert isinstance(res, dict)
    assert res.get("summary") == "system_prompt updated"


def test_rollback_to_version_calls_correct_endpoint():
    service = AssistantService("https://api.example.com", "token")

    class DummyApiWithPost(DummyApi):
        def post(
            self,
            endpoint,
            response_model,
            json_data=None,
            stream=False,
            wrap_response=True,
        ):
            self.last_call.endpoint = endpoint
            self.last_call.params = json_data or {}
            return {"status": "ok"}

    dummy_api = DummyApiWithPost()
    service._api = dummy_api

    res = service.rollback_to_version("assistant-123", 5)

    assert (
        dummy_api.last_call.endpoint
        == "/v1/assistants/assistant-123/versions/5/rollback"
    )
    assert isinstance(res, dict)
    assert res.get("status") == "ok"


def test_chat_with_version_calls_correct_endpoint_and_maps_response():
    service = AssistantService("https://api.example.com", "token")
    from codemie_sdk.models.assistant import AssistantChatRequest, BaseModelResponse

    class DummyApiWithPost(DummyApi):
        def post(
            self,
            endpoint,
            response_model,
            json_data=None,
            stream=False,
            wrap_response=True,
        ):
            self.last_call.endpoint = endpoint
            self.last_call.params = json_data or {}
            return BaseModelResponse.model_validate(
                {"generated": "Hello", "tokensUsed": 10}
            )

    dummy_api = DummyApiWithPost()
    service._api = dummy_api

    req = AssistantChatRequest(text="Hi", history=[], stream=False)
    res = service.chat_with_version("assistant-123", 2, req)

    assert dummy_api.last_call.endpoint == "/v1/assistants/assistant-123/model"
    assert dummy_api.last_call.params.get("version") == 2
    assert isinstance(res, BaseModelResponse)
    assert res.generated == "Hello"
