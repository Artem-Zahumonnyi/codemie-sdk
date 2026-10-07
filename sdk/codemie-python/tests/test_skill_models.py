from codemie_sdk.models.assistant import MCPServerDetails
from codemie_sdk.models.skill import (
    SkillCreateRequest,
    SkillDetailResponse,
    SkillUpdateRequest,
    SkillVisibility,
)


def _hand_written_server():
    return MCPServerDetails(name="custom-server", description=None, enabled=True)


def test_skill_create_request_accepts_mcp_servers():
    request = SkillCreateRequest(
        name="s",
        description="d",
        content="c",
        project="p",
        mcp_servers=[_hand_written_server()],
    )
    dumped = request.model_dump(exclude_none=True)
    assert dumped["mcp_servers"][0]["name"] == "custom-server"


def test_skill_update_request_omits_mcp_servers_when_unset():
    request = SkillUpdateRequest(name="s")
    assert "mcp_servers" not in request.model_dump(exclude_none=True)


def test_skill_update_request_accepts_mcp_servers_when_set():
    request = SkillUpdateRequest(mcp_servers=[_hand_written_server()])
    dumped = request.model_dump(exclude_none=True)
    assert dumped["mcp_servers"][0]["name"] == "custom-server"


def test_skill_detail_response_exposes_mcp_servers():
    response = SkillDetailResponse(
        id="skill-1",
        name="s",
        description="d",
        project="p",
        visibility=SkillVisibility.PROJECT,
        createdDate="2026-09-24T00:00:00Z",
        content="c",
        mcp_servers=[_hand_written_server()],
    )
    assert response.mcp_servers[0].name == "custom-server"
