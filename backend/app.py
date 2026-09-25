"""
Flask API for the movie recommender.

Endpoints:
    GET  /api/movies              -> list all movies (id, title, genres)
    POST /api/recommend           -> body: {"ratings": [{"movieId": 1, "rating": 4.5}, ...]}
                                      returns top-N recommended movies

Run with:
    python app.py
Then open frontend/index.html in your browser (or serve it, see README).
"""

import pickle
import os
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allows the frontend (opened as a local file / different port) to call this API

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "recommender.pkl")

with open(MODEL_PATH, "rb") as f:
    ARTIFACT = pickle.load(f)

SVD = ARTIFACT["svd"]
MATRIX_COLUMNS = ARTIFACT["matrix_columns"]  # movieId order
MOVIES = ARTIFACT["movies"]
POPULAR_MOVIE_IDS = ARTIFACT["popular_movie_ids"]

MOVIE_LOOKUP = MOVIES.set_index("movieId").to_dict(orient="index")
COL_INDEX = {movie_id: idx for idx, movie_id in enumerate(MATRIX_COLUMNS)}


def movie_payload(movie_id, score=None):
    info = MOVIE_LOOKUP.get(movie_id)
    if info is None:
        return None
    payload = {"movieId": int(movie_id), "title": info["title"], "genres": info["genres"]}
    if score is not None:
        payload["predictedRating"] = round(float(score), 2)
    return payload


@app.route("/api/movies", methods=["GET"])
def get_movies():
    movies_list = [
        {"movieId": int(mid), "title": row["title"], "genres": row["genres"]}
        for mid, row in MOVIE_LOOKUP.items()
    ]
    movies_list.sort(key=lambda m: m["title"])
    return jsonify(movies_list)


@app.route("/api/recommend", methods=["POST"])
def recommend():
    body = request.get_json(force=True) or {}
    user_ratings = body.get("ratings", [])
    top_n = int(body.get("topN", 10))

    # Build a rating vector for this (possibly brand-new) user, aligned to
    # the same movie columns the model was trained on.
    user_vector = np.zeros(len(MATRIX_COLUMNS))
    rated_ids = set()
    for entry in user_ratings:
        movie_id = entry.get("movieId")
        rating = entry.get("rating")
        if movie_id in COL_INDEX and rating is not None:
            user_vector[COL_INDEX[movie_id]] = float(rating)
            rated_ids.add(movie_id)

    if not rated_ids:
        # Cold-start: no ratings given yet, fall back to popularity
        recs = [movie_payload(mid) for mid in POPULAR_MOVIE_IDS[:top_n]]
        return jsonify({"strategy": "popularity", "recommendations": recs})

    # Project this user's ratings into the SVD latent space, then
    # reconstruct their predicted ratings across ALL movies.
    user_factors = SVD.transform(user_vector.reshape(1, -1))
    predicted = np.dot(user_factors, SVD.components_).flatten()

    scored = [
        (MATRIX_COLUMNS[idx], predicted[idx])
        for idx in range(len(MATRIX_COLUMNS))
        if MATRIX_COLUMNS[idx] not in rated_ids
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)

    recs = [movie_payload(mid, score) for mid, score in scored[:top_n]]
    return jsonify({"strategy": "svd", "recommendations": recs})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "movies": len(MOVIE_LOOKUP)})


if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)
