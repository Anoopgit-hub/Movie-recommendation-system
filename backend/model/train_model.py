"""
Trains a collaborative-filtering recommender using SVD (matrix factorization)
on the user-item ratings matrix, and saves everything the API needs to serve
recommendations.

Run this after generating (or replacing) the dataset:
    python train_model.py
"""

import pickle
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.model_selection import train_test_split
from sklearn.metrics import root_mean_squared_error

DATA_DIR = "../data"
N_COMPONENTS = 40
MIN_RATINGS_PER_MOVIE = 5

def load_data():
    movies = pd.read_csv(f"{DATA_DIR}/movies.csv")
    ratings = pd.read_csv(f"{DATA_DIR}/ratings.csv")
    return movies, ratings

def build_user_item_matrix(ratings, global_mean):
    matrix = ratings.pivot_table(index="userId", columns="movieId", values="rating")
    centered = matrix - global_mean
    filled = centered.fillna(0)
    return matrix, filled

def evaluate(reconstructed, user_ids, item_ids, test_ratings):
    preds, actuals = [], []
    for _, row in test_ratings.iterrows():
        if row["userId"] in user_ids.index and row["movieId"] in item_ids.index:
            u_idx = user_ids.loc[row["userId"]]
            i_idx = item_ids.loc[row["movieId"]]
            preds.append(np.clip(reconstructed[u_idx, i_idx], 0.5, 5.0))
            actuals.append(row["rating"])
    if not preds:
        return None
    return root_mean_squared_error(actuals, preds)

def main():
    movies, ratings = load_data()

    counts = ratings["movieId"].value_counts()
    keep_movies = counts[counts >= MIN_RATINGS_PER_MOVIE].index
    ratings = ratings[ratings["movieId"].isin(keep_movies)]

    train_ratings, test_ratings = train_test_split(ratings, test_size=0.2, random_state=42)
    global_mean = train_ratings["rating"].mean()

    _, filled = build_user_item_matrix(train_ratings, global_mean)
    user_ids = pd.Series(range(len(filled.index)), index=filled.index)
    item_ids = pd.Series(range(len(filled.columns)), index=filled.columns)

    n_components = min(N_COMPONENTS, min(filled.shape) - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    svd.fit(filled.values)

    user_factors = svd.transform(filled.values)
    reconstructed = np.dot(user_factors, svd.components_) + global_mean

    rmse = evaluate(reconstructed, user_ids, item_ids, test_ratings)
    print(f"Validation RMSE: {rmse:.4f}" if rmse is not None else "Not enough overlap to evaluate RMSE")
    print(f"Global mean rating: {global_mean:.3f}")
    print(f"Matrix shape (users x movies): {filled.shape}")

    popularity = ratings.groupby("movieId")["rating"].agg(["mean", "count"])
    popularity = popularity[popularity["count"] >= 10].sort_values(
        ["mean", "count"], ascending=False
    )

    artifact = {
        "svd": svd,
        "matrix_columns": filled.columns.tolist(),
        "matrix_index": filled.index.tolist(),
        "reconstructed": reconstructed,
        "global_mean": global_mean,
        "movies": movies,
        "popular_movie_ids": popularity.index.tolist(),
    }

    with open("recommender.pkl", "wb") as f:
        pickle.dump(artifact, f)
    print("Model saved to recommender.pkl")

if __name__ == "__main__":
    main()