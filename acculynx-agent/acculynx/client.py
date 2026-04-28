"""AccuLynx API v2 client with rate limiting and pagination."""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api.acculynx.com/api/v2"
API_KEY = os.getenv("ACCULYNX_API_KEY", "")

# Rate limiter: 10 requests/sec
_semaphore = asyncio.Semaphore(10)


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
    }


async def get(path: str, params: Optional[Dict[str, Any]] = None) -> httpx.Response:
    """Make an authenticated GET request with rate limiting."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{BASE_URL}{path}",
                headers=_headers(),
                params=params or {},
            )
            resp.raise_for_status()
            return resp


async def get_json(path: str, params: Optional[Dict[str, Any]] = None) -> dict:
    """GET request returning parsed JSON."""
    resp = await get(path, params)
    return resp.json()


async def post(path: str, json_body: Optional[Dict[str, Any]] = None) -> httpx.Response:
    """Make an authenticated POST request with rate limiting."""
    async with _semaphore:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{BASE_URL}{path}",
                headers={**_headers(), "Content-Type": "application/json"},
                json=json_body or {},
            )
            resp.raise_for_status()
            return resp


async def post_json(path: str, json_body: Optional[Dict[str, Any]] = None) -> dict:
    """POST returning parsed JSON, or {} on empty 204 responses."""
    resp = await post(path, json_body)
    if resp.status_code == 204 or not resp.content:
        return {}
    return resp.json()


async def get_all_pages(
    path: str,
    params: Optional[Dict[str, Any]] = None,
    page_size: int = 200,
    max_pages: int = 100,
) -> List[dict]:
    """Paginate through all results for an endpoint."""
    params = dict(params or {})
    params["pageSize"] = page_size
    all_items = []

    for page in range(max_pages):
        params["pageStartIndex"] = page * page_size
        data = await get_json(path, params)

        items = data.get("items", [])
        all_items.extend(items)

        # Stop if we got fewer items than page size (last page)
        if len(items) < page_size:
            break

    return all_items
