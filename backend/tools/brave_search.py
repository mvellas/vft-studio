"""
backend/tools/brave_search.py
==============================
Brave Search API client. Returns (formatted_text, result_count).
Graceful degradation: returns informative message with count=0 when api_key is empty or on error.
"""
from __future__ import annotations

import httpx


async def brave_search(query: str, api_key: str, count: int = 5) -> tuple[str, int]:
    """Search Brave and return (formatted_results_text, count).

    Returns ("Busca na web não está disponível...", 0) when api_key is empty.
    Returns ("Erro na busca: ...", 0) on HTTP failure.
    """
    if not api_key:
        return "Busca na web não está disponível. Configure uma Brave Search API key nas configurações.", 0

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {"q": query, "count": count}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return f"Erro na busca: {str(exc)[:200]}", 0

    results = data.get("web", {}).get("results", [])
    if not results:
        return "Nenhum resultado encontrado.", 0

    lines = [f"RESULTADOS DA BUSCA ({len(results)}):\n"]
    for i, r in enumerate(results, 1):
        title = r.get("title", "(sem título)")
        url_r = r.get("url", "")
        snippet = r.get("description", "")
        lines.append(f"{i}. {title}\n   URL: {url_r}\n   {snippet}\n")

    return "\n".join(lines), len(results)
