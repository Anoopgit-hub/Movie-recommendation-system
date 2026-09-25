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
N_COMPONENTS = 20  # number of latent factors

def load_data():
    movies = pd.read_csv(f"{DATA_DIR}/movies.csv")
    ratings = pd.read_csv(f"{DATA_DIR}/ratings.csv")
    return movies, ratings

def build_user_item_matrix(ratings):
    matrix = ratings.pivot_table(index="userId", columns="movieId", values="rating").fillna(0)
    return matrix

def evaluate(matrix, svd, user_ids, item_ids, test_ratings):
    """Reconstruct the matrix and compute RMSE on held-out ratings."""
    user_factors = svd.transform(matrix.values)
    reconstructed = np.dot(user_factors, svd.components_)
    preds, actuals = [], []
    for _, row in test_ratings.iterrows():
        if row["userId"] in user_ids.index and row["movieId"] in item_ids.index:
            u_idx = user_ids.loc[row["userId"]]
            i_idx = item_ids.loc[row["movieId"]]
            preds.append(reconstructed[u_idx, i_idx])
            actuals.append(row["rating"])
    if not preds:
        return None
    return root_mean_squared_error(actuals, preds)

def main():
    movies, ratings = load_data()

    train_ratings, test_ratings = train_test_split(ratings, test_size=0.2, random_state=42)

    matrix = build_user_item_matrix(train_ratings)
    user_ids = pd.Series(range(len(matrix.index)), index=matrix.index)   # userId -> row idx
    item_ids = pd.Series(range(len(matrix.columns)), index=matrix.columns)  # movieId -> col idx

    n_components = min(N_COMPONENTS, min(matrix.shape) - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    svd.fit(matrix.values)

    rmse = evaluate(matrix, svd, user_ids, item_ids, test_ratings)
    print(f"Validation RMSE: {rmse:.4f}" if rmse is not None else "Not enough overlap to evaluate RMSE")

    # Precompute the full reconstructed rating matrix for fast serving
    user_factors = svd.transform(matrix.values)
    reconstructed = np.dot(user_factors, svd.components_)

    # Popularity fallback for cold-start users (no ratings yet)
    popularity = ratings.groupby("movieId")["rating"].agg(["mean", "count"])
    popularity = popularity[popularity["count"] >= 3].sort_values(
        ["mean", "count"], ascending=False
    )
    popular_movie_ids = popularity.index.tolist()

    artifact = {
        "svd": svd,
        "matrix_columns": matrix.columns.tolist(),   # movieId order used in reconstructed matrix
        "matrix_index": matrix.index.tolist(),        # userId order
        "reconstructed": reconstructed,
        "movies": movies,
        "popular_movie_ids": popular_movie_ids,
    }

    with open("recommender.pkl", "wb") as f:
        pickle.dump(artifact, f)

    print("Model saved to recommender.pkl")

if __name__ == "__main__":
    main()
