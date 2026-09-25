# Cinevo — Movie Recommendation System

A full-stack movie recommender built for an AIML mini-project.

- **ML core**: Collaborative filtering via SVD (matrix factorization) — `scikit-learn`'s `TruncatedSVD`
- **Backend**: Flask REST API
- **Frontend**: Plain HTML/CSS/JS
- **Dataset**: A small synthetic MovieLens-style dataset is generated automatically so the
  project runs immediately with no downloads. Swap in the real MovieLens dataset any time
  (instructions below) with zero code changes.

## How it works (for your report / viva)

1. Ratings are arranged into a **user × movie matrix** (rows = users, columns = movies, cells = ratings).
2. `TruncatedSVD` factorizes this matrix into **latent factors** — hidden "taste dimensions"
   that explain rating patterns (this is the same matrix decomposition idea from your linear
   algebra coursework, applied to a sparse, real-world matrix).
3. To recommend for a user, their ratings are projected into that latent space, then
   reconstructed to predict scores for every movie they haven't rated. The highest-scoring
   unrated movies become the recommendations.
4. **Cold-start handling**: a brand-new user with zero ratings has no latent vector, so the API
   falls back to a popularity ranking (average rating, with a minimum vote count so obscure
   movies don't game the ranking).

## Project structure

```
movie-recommender/
├── backend/
│   ├── app.py                  # Flask API
│   ├── requirements.txt
│   ├── model/
│   │   ├── train_model.py      # trains & saves the SVD model
│   │   └── recommender.pkl     # generated after training
│   └── data/
│       ├── generate_data.py    # creates the sample dataset
│       ├── movies.csv          # generated
│       └── ratings.csv         # generated
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Setup & run

### 1. Install dependencies
```bash
cd movie-recommender/backend
pip install -r requirements.txt
```

### 2. Generate the dataset
```bash
cd data
python generate_data.py
cd ..
```
This creates `movies.csv` and `ratings.csv` (50 movies, ~120 synthetic users).

### 3. Train the model
```bash
cd model
python train_model.py
cd ..
```
This prints a validation RMSE and saves `recommender.pkl`.

### 4. Start the API
```bash
python app.py
```
Runs on `http://127.0.0.1:5000`. Keep this terminal open.

### 5. Open the frontend
Just open `frontend/index.html` directly in your browser (double-click it, or
right-click → Open With → your browser). It talks to the API at `127.0.0.1:5000`.

If your browser blocks local file requests, serve it instead:
```bash
cd frontend
python -m http.server 8000
```
then visit `http://127.0.0.1:8000`.

## Using it

1. Search and rate a handful of movies (try to rate at least 3–4 for better results).
2. Click **Get Recommendations**.
3. The app calls the SVD model and shows your top picks, with a predicted-fit score.
4. Remove all ratings and click the button again to see the cold-start (popularity) fallback.

## Using the real MovieLens dataset instead

1. Download "ml-latest-small" from https://grouplens.org/datasets/movielens/
2. Copy its `movies.csv` and `ratings.csv` into `backend/data/`, overwriting the generated ones
3. Re-run `python train_model.py`

No other code changes are needed — column names already match.

## Ideas for extending it (good talking points in your viva)

- Add a content-based fallback using genres (TF-IDF over genre tags) blended with SVD
- Show "why recommended" by highlighting shared genres with the user's top-rated movies
- Persist ratings per session/user instead of resetting on page reload
- Swap `TruncatedSVD` for the `surprise` library's `SVD` (adds bias terms, often better RMSE)
- Add posters via the free TMDB API by matching movie titles
