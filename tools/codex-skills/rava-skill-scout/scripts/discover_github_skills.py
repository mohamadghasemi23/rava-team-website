#!/usr/bin/env python3
"""Find a small metadata-only shortlist of GitHub repositories containing SKILL.md."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
from typing import Any


CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
MAX_RESULTS = 10
MAX_REPOSITORIES = 5


def run_gh(arguments: list[str]) -> Any:
    process = subprocess.run(
        ["gh", *arguments],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if process.returncode != 0:
        message = process.stderr.strip() or "GitHub CLI request failed"
        raise RuntimeError(message)
    return json.loads(process.stdout)


def cache_path(query: str, limit: int) -> Path:
    cache_root = Path(
        os.environ.get(
            "RAVA_SKILL_SCOUT_CACHE",
            str(Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "rava-skill-scout"),
        )
    )
    digest = hashlib.sha256(f"{query}:{limit}:v1".encode()).hexdigest()[:20]
    return cache_root / f"{digest}.json"


def load_cache(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None
    if time.time() - float(payload.get("cached_at", 0)) > CACHE_TTL_SECONDS:
        return None
    return payload


def save_cache(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_name(hit: dict[str, Any]) -> str | None:
    repository = hit.get("repository") or {}
    return repository.get("nameWithOwner") or repository.get("fullName")


def score_repository(repo: dict[str, Any], terms: list[str]) -> float:
    text = " ".join(
        str(repo.get(key) or "")
        for key in ("nameWithOwner", "description", "skillPath")
    ).lower()
    term_score = sum(3 for term in terms if term.lower() in text)
    stars = max(int(repo.get("stargazerCount") or 0), 0)
    star_score = min(math.log10(stars + 1) * 2, 8)
    license_score = 2 if (repo.get("licenseInfo") or {}).get("spdxId") else 0
    disk_kib = max(int(repo.get("diskUsage") or 0), 0)
    size_penalty = min(disk_kib / 100_000, 5)
    archived_penalty = 10 if repo.get("isArchived") else 0
    return round(term_score + star_score + license_score - size_penalty - archived_penalty, 2)


def discover(query: str, limit: int) -> dict[str, Any]:
    hits = run_gh([
        "search", "code", query, "--filename", "SKILL.md", "--limit", str(limit),
        "--json", "path,repository,url",
    ])
    repositories: list[dict[str, Any]] = []
    seen: set[str] = set()
    terms = query.split()

    for hit in hits:
        name = repo_name(hit)
        if not name or name in seen:
            continue
        seen.add(name)
        metadata = run_gh([
            "repo", "view", name, "--json",
            "nameWithOwner,description,stargazerCount,updatedAt,licenseInfo,diskUsage,url,isArchived",
        ])
        metadata["skillPath"] = hit.get("path")
        metadata["skillUrl"] = hit.get("url")
        metadata["score"] = score_repository(metadata, terms)
        repositories.append(metadata)
        if len(repositories) >= MAX_REPOSITORIES:
            break

    repositories.sort(key=lambda item: item["score"], reverse=True)
    return {
        "query": query,
        "generated_at": int(time.time()),
        "limits": {"code_matches": limit, "repositories": MAX_REPOSITORIES},
        "repositories": repositories,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discover GitHub repositories containing potentially relevant Codex skills."
    )
    parser.add_argument("terms", nargs="+", help="Two to five precise English search keywords")
    parser.add_argument("--limit", type=int, default=MAX_RESULTS, choices=range(1, MAX_RESULTS + 1))
    parser.add_argument("--refresh", action="store_true", help="Ignore a valid cached result")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 2 <= len(args.terms) <= 5:
        print("Provide between two and five search keywords.", file=sys.stderr)
        return 2
    query = " ".join(args.terms)
    target = cache_path(query, args.limit)
    payload = None if args.refresh else load_cache(target)
    if payload is None:
        try:
            payload = discover(query, args.limit)
        except (RuntimeError, json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
            print(f"Discovery failed: {exc}", file=sys.stderr)
            return 1
        payload["cached_at"] = int(time.time())
        save_cache(target, payload)
        payload["cache"] = "miss"
    else:
        payload["cache"] = "hit"
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
