"""tests/test_brave_search.py"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.tools.brave_search import brave_search


class TestBraveSearch:
    @pytest.mark.asyncio
    async def test_returns_formatted_results(self):
        mock_data = {
            "web": {
                "results": [
                    {"title": "Lei 12.608", "url": "https://lei.gov.br/12608", "description": "Proteção civil"},
                    {"title": "Defesa Civil", "url": "https://defesa.gov.br", "description": "Portal"},
                ]
            }
        }
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_data
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.tools.brave_search.httpx.AsyncClient", return_value=mock_client):
            text, count = await brave_search("Lei 12.608", api_key="test-key", count=2)

        assert count == 2
        assert "Lei 12.608" in text
        assert "https://lei.gov.br/12608" in text

    @pytest.mark.asyncio
    async def test_no_api_key_returns_unavailable(self):
        text, count = await brave_search("query", api_key="", count=5)
        assert count == 0
        assert "não está disponível" in text

    @pytest.mark.asyncio
    async def test_http_error_returns_error_message(self):
        import httpx
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))

        with patch("backend.tools.brave_search.httpx.AsyncClient", return_value=mock_client):
            text, count = await brave_search("query", api_key="test-key")

        assert count == 0
        assert "Erro" in text
