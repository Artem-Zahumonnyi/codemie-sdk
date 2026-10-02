"""Tests for AssistantService.chat_with_version() output_schema handling."""

from unittest.mock import MagicMock

from pydantic import BaseModel

from codemie_sdk.models.assistant import AssistantChatRequest, BaseModelResponse
from codemie_sdk.services.assistant import AssistantService


class _FakeApi:
    """Minimal ApiRequestHandler stand-in that records calls."""

    def post(self, endpoint, response_model, json_data=None, stream=False):
        resp = MagicMock(spec=BaseModelResponse)
        resp.stream = False
        resp.generated = {"answer": "42"}
        return resp


def _service() -> AssistantService:
    svc = AssistantService.__new__(AssistantService)
    svc._api = _FakeApi()
    return svc


def test_chat_with_version_accepts_dict_output_schema():
    """chat_with_version() must not raise TypeError when output_schema is a dict."""
    svc = _service()
    request = AssistantChatRequest(
        text="hello",
        output_schema={"type": "object", "properties": {"answer": {"type": "string"}}},
    )
    # Should not raise issubclass() TypeError
    result = svc.chat_with_version("asst-1", 2, request)
    assert result is not None


def test_chat_with_version_accepts_pydantic_output_schema():
    """chat_with_version() must still handle a Pydantic model for output_schema."""

    class MySchema(BaseModel):
        answer: str

    svc = _service()
    request = AssistantChatRequest(text="hello", output_schema=MySchema)
    result = svc.chat_with_version("asst-1", 2, request)
    assert result is not None


def test_chat_with_version_accepts_no_output_schema():
    """chat_with_version() must work without output_schema."""
    svc = _service()
    request = AssistantChatRequest(text="hello")
    result = svc.chat_with_version("asst-1", 2, request)
    assert result is not None
