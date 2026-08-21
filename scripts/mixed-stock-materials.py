#!/usr/bin/env python3
"""Download an alternating Pexels/Pixabay material set for Free Mix jobs."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
import tempfile
import time
from pathlib import Path
from typing import Any


MONEYPRINTER_ROOT = Path.cwd()
if str(MONEYPRINTER_ROOT) not in sys.path:
    sys.path.insert(0, str(MONEYPRINTER_ROOT))

from app.models.schema import MaterialInfo, VideoAspect  # noqa: E402
from app.config import config  # noqa: E402
from app.services import material  # noqa: E402
from app.utils import utils  # noqa: E402


PROVIDERS = ("pexels", "pixabay")
RECENT_DAYS = 60
MAX_HISTORY_ITEMS = 5_000


def apply_environment_keys() -> None:
    pexels_key = os.environ.get("PEXELS_API_KEY", "").strip()
    pixabay_key = os.environ.get("PIXABAY_API_KEY", "").strip()
    if pexels_key:
        config.app["pexels_api_keys"] = [pexels_key]
    if pixabay_key:
        config.app["pixabay_api_keys"] = [pixabay_key]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--terms-json", required=True)
    parser.add_argument("--target-seconds", type=int, default=50)
    parser.add_argument("--clip-duration", type=int, default=5)
    return parser.parse_args()


def item_key(item: MaterialInfo) -> str:
    source = item.source_info if isinstance(item.source_info, dict) else {}
    provider = str(source.get("provider") or item.provider or "unknown")
    asset_id = source.get("asset_id")
    if asset_id not in (None, ""):
        return f"{provider}:{asset_id}"
    digest = hashlib.sha256(str(item.url).encode("utf-8")).hexdigest()
    return f"{provider}:url:{digest}"


def content_key(file_path: str) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as source_file:
        for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"content:{digest.hexdigest()}"


def history_path() -> Path:
    return Path(utils.storage_dir("mixed_stock", create=True)) / "recent-materials.json"


def load_history() -> dict[str, float]:
    try:
        payload = json.loads(history_path().read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, ValueError, TypeError):
        return {}
    if not isinstance(payload, dict):
        return {}
    cutoff = time.time() - RECENT_DAYS * 24 * 60 * 60
    return {
        str(key): float(value)
        for key, value in payload.items()
        if isinstance(value, (int, float)) and float(value) >= cutoff
    }


def save_history(history: dict[str, float]) -> None:
    target = history_path()
    newest = dict(sorted(history.items(), key=lambda entry: entry[1], reverse=True)[:MAX_HISTORY_ITEMS])
    fd, temporary_name = tempfile.mkstemp(prefix="recent-materials-", suffix=".json", dir=target.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as temporary:
            json.dump(newest, temporary, ensure_ascii=False, separators=(",", ":"))
        os.replace(temporary_name, target)
    finally:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass


def search(provider: str, term: str, clip_duration: int) -> list[MaterialInfo]:
    search_function = material.search_videos_pexels if provider == "pexels" else material.search_videos_pixabay
    return material._search_videos_with_cache(
        provider=provider,
        search_videos=search_function,
        search_term=term,
        minimum_duration=clip_duration,
        video_aspect=VideoAspect.portrait,
    )


def public_source(item: MaterialInfo, term: str, local_path: str) -> dict[str, Any]:
    source = item.source_info if isinstance(item.source_info, dict) else {}
    return {
        "provider": str(source.get("provider") or item.provider or ""),
        "assetId": str(source.get("asset_id") or ""),
        "sourcePage": str(source.get("source_page") or ""),
        "searchTerm": term,
        "localFile": Path(local_path).name,
    }


def choose_candidate(
    candidates: list[MaterialInfo],
    history: dict[str, float],
    selected_keys: set[str],
) -> MaterialInfo | None:
    available = [item for item in candidates if item_key(item) not in selected_keys]
    if not available:
        return None
    fresh = [item for item in available if item_key(item) not in history]
    if fresh:
        return random.choice(fresh[:12])
    return min(available, key=lambda item: history.get(item_key(item), 0))


def main() -> int:
    args = parse_args()
    apply_environment_keys()
    try:
        terms = [str(term).strip() for term in json.loads(args.terms_json) if str(term).strip()]
    except (TypeError, ValueError):
        terms = []
    if not terms:
        raise SystemExit("Free Mix requires at least one stock search term")

    target_seconds = max(args.clip_duration * 2, args.target_seconds)
    task_directory = Path(utils.task_dir(args.task_id))
    task_directory.mkdir(parents=True, exist_ok=True)
    history = load_history()
    selected_keys: set[str] = set()
    selected_content_keys: set[str] = set()
    paths: list[str] = []
    sources: list[dict[str, Any]] = []
    duration = 0
    search_cache: dict[tuple[str, str], list[MaterialInfo]] = {}

    max_attempts = max(len(terms) * 4, 16)
    for index in range(max_attempts):
        if duration >= target_seconds:
            break
        term = terms[index % len(terms)]
        preferred = PROVIDERS[index % len(PROVIDERS)]
        candidate = None
        for provider in (preferred, PROVIDERS[1 - PROVIDERS.index(preferred)]):
            cache_key = (provider, term)
            if cache_key not in search_cache:
                search_cache[cache_key] = search(provider, term, args.clip_duration)
            candidate = choose_candidate(search_cache[cache_key], history, selected_keys)
            if candidate is not None:
                break
        if candidate is None:
            continue

        selected_keys.add(item_key(candidate))
        saved_path = material.save_video(str(candidate.url), save_dir=str(task_directory))
        if not saved_path:
            continue
        downloaded_content_key = content_key(str(saved_path))
        if downloaded_content_key in history or downloaded_content_key in selected_content_keys:
            Path(saved_path).unlink(missing_ok=True)
            continue
        selected_content_keys.add(downloaded_content_key)
        paths.append(str(saved_path))
        sources.append(public_source(candidate, term, str(saved_path)))
        duration += min(args.clip_duration, int(candidate.duration))
        history[item_key(candidate)] = time.time()
        history[downloaded_content_key] = time.time()

    providers_used = {source["provider"] for source in sources}
    if len(paths) < 2 or providers_used != set(PROVIDERS):
        raise SystemExit("Free Mix could not download usable clips from both Pexels and Pixabay")

    save_history(history)
    print(json.dumps({"result": {"materials": paths, "sources": sources}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
