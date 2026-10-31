"""
Looks up movie poster images from the TMDB API (https://www.themoviedb.org).

How it works:
1. MovieLens ships a links.csv file that maps each movieId to its TMDB id,
   so we can ask TMDB for the exact movie (no guessing from titles).
2. If a movie has no TMDB id (or TMDB says "not found"), we fall back to
   searching TMDB by title + year.
3. Every result is cached in posters_cache.json, so each movie is only
   looked up ONCE ever. After the first run, posters load instantly.
"""

import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import requests

# ----------------------------------------------------------------------
# PASTE YOUR TMDB API KEY HERE (the "API Key (v3 auth)" value).
# Do not upload this file to a public GitHub repo with your real key in it.
# ----------------------------------------------------------------------
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "PASTE_YOUR_TMDB_API_KEY_HERE")

API_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w342"   # w342 = good quality, small size

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(BASE_DIR, "posters_cache.json")
LINKS_PATH = os.path.join(BASE_DIR, "data", "links.csv")

_lock = threading.Lock()

# movieId -> tmdbId (from MovieLens links.csv)
TMDB_IDS = {}
if os.path.exists(LINKS_PATH):
    _links = pd.read_csv(LINKS_PATH).dropna(subset=["tmdbId"])
    TMDB_IDS = {int(m): int(t) for m, t in zip(_links["movieId"], _links["tmdbId"])}
else:
    print("posters.py: data/links.csv not found - will search TMDB by title instead.")

# cache: movieId (as text) -> poster url, or "" when the movie has no poster
try:
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        _cache = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    _cache = {}


def key_is_set():
    return TMDB_API_KEY and not TMDB_API_KEY.startswith("PASTE_")


def _clean_title(title):
    """'Incredibles, The (2004)' -> ('The Incredibles', '2004')"""
    year = None
    match = re.search(r"\((\d{4})\)\s*$", title)
    if match:
        year = match.group(1)
        title = title[: match.start()].strip()
    title = re.sub(r"\s*\(.*?\)\s*", " ", title).strip()      # drop "(a.k.a. ...)" parts
    article = re.match(r"^(.*), (The|A|An)$", title)
    if article:
        title = f"{article.group(2)} {article.group(1)}"
    return title, year


def _fetch_one(movie_id, title):
    """Returns a poster url, "" (movie has no poster), or None (lookup failed, try again later)."""
    try:
        tmdb_id = TMDB_IDS.get(movie_id)
        if tmdb_id:
            r = requests.get(f"{API_BASE}/movie/{tmdb_id}", params={"api_key": TMDB_API_KEY}, timeout=8)
            if r.status_code == 200:
                path = r.json().get("poster_path")
                return f"{IMAGE_BASE}{path}" if path else ""
            if r.status_code != 404:
                return None            # bad key, rate limit, server error -> don't cache

        # fallback: search by title + year
        name, year = _clean_title(title)
        params = {"api_key": TMDB_API_KEY, "query": name}
        if year:
            params["year"] = year
        r = requests.get(f"{API_BASE}/search/movie", params=params, timeout=8)
        if r.status_code != 200:
            return None
        for result in r.json().get("results", []):
            if result.get("poster_path"):
                return f"{IMAGE_BASE}{result['poster_path']}"
        return ""
    except requests.RequestException:
        return None


def get_posters(movie_ids, movie_lookup):
    """movie_ids: list of movieIds. movie_lookup: movieId -> {"title": ...}.
    Returns {movieId: posterUrl} for every movie that has a poster."""
    if not key_is_set():
        return {}

    missing = [m for m in movie_ids if str(m) not in _cache]

    def work(movie_id):
        info = movie_lookup.get(movie_id, {})
        return movie_id, _fetch_one(movie_id, info.get("title", ""))

    if missing:
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(work, missing))
        with _lock:
            changed = False
            for movie_id, url in results:
                if url is not None:
                    _cache[str(movie_id)] = url
                    changed = True
            if changed:
                with open(CACHE_PATH, "w", encoding="utf-8") as f:
                    json.dump(_cache, f)

    return {m: _cache[str(m)] for m in movie_ids if _cache.get(str(m))}
