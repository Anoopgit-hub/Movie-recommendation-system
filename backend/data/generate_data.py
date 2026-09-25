"""
Generates a small synthetic MovieLens-style dataset (movies.csv + ratings.csv)
so the project can run completely offline.

To use the REAL MovieLens dataset instead:
1. Download the "ml-latest-small" zip from https://grouplens.org/datasets/movielens/
2. Extract movies.csv and ratings.csv into this same data/ folder (overwrite these files)
3. Re-run train_model.py
No other code changes are needed — the column names already match MovieLens.
"""

import csv
import random

random.seed(42)

GENRES = ["Action", "Comedy", "Drama", "Sci-Fi", "Romance", "Horror", "Thriller", "Animation"]

TITLES = [
    "The Last Horizon", "Silent Waters", "Midnight Protocol", "Golden Hour",
    "The Wrong Turn", "Echoes of Tomorrow", "Paper Moon", "City of Glass",
    "The Long Drive", "Whispering Pines", "Neon Nights", "The Forgotten Room",
    "Beyond the Stars", "A Quiet Storm", "The Final Signal", "Broken Compass",
    "Shadows in Bloom", "The Great Escape II", "Coastal Drift", "Winter's Edge",
    "The Glass House", "Runaway Train", "Firelight", "The Hollow Man",
    "Season of Change", "The Wandering City", "Static", "The Blue Hour",
    "Reckless", "The Paper Crown", "Grit", "The Silent Partner",
    "Afterglow", "The Long Goodbye", "Crossfire", "The Quiet Ones",
    "Skyline", "The Deep End", "Homebound", "The Last Letter",
    "Dust and Bone", "The Bright Side", "Undercurrent", "The Night Shift",
    "Fault Lines", "The Wild Card", "Nocturne", "The Open Road",
    "Fractured", "The Missing Piece",
]

def generate_movies(n=50):
    movies = []
    for i, title in enumerate(TITLES[:n], start=1):
        genre_count = random.choice([1, 1, 2])
        genres = "|".join(random.sample(GENRES, genre_count))
        year = random.randint(1995, 2025)
        movies.append({"movieId": i, "title": f"{title} ({year})", "genres": genres})
    return movies

def generate_ratings(movies, n_users=120, min_ratings=8, max_ratings=25):
    ratings = []
    movie_ids = [m["movieId"] for m in movies]
    # give each genre a set of "fan" movies so preferences feel realistic
    for user_id in range(1, n_users + 1):
        n_rate = random.randint(min_ratings, max_ratings)
        rated = random.sample(movie_ids, min(n_rate, len(movie_ids)))
        preferred_genre = random.choice(GENRES)
        for movie_id in rated:
            movie = next(m for m in movies if m["movieId"] == movie_id)
            base = 3.0
            if preferred_genre in movie["genres"]:
                base += 1.2
            rating = max(0.5, min(5.0, round(base + random.gauss(0, 0.8) * 2) / 2))
            ratings.append({"userId": user_id, "movieId": movie_id, "rating": rating})
    return ratings

def main():
    movies = generate_movies()
    ratings = generate_ratings(movies)

    with open("movies.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["movieId", "title", "genres"])
        writer.writeheader()
        writer.writerows(movies)

    with open("ratings.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["userId", "movieId", "rating"])
        writer.writeheader()
        writer.writerows(ratings)

    print(f"Generated {len(movies)} movies and {len(ratings)} ratings.")
    print("Files written: movies.csv, ratings.csv")

if __name__ == "__main__":
    main()
