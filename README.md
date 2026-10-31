# Cinevo: Movie Recommendation System

Cinevo is a full-stack movie recommender built as an AIML mini project. You rate a few movies you know, and it suggests movies you are likely to enjoy, using collaborative filtering with SVD (matrix factorization) trained on the real MovieLens dataset.

## Features

- Search movies by title or genre and rate them
- Personalized top picks with a predicted rating
- Popular movies for new users who have not rated anything (cold start)
- Movie posters from the TMDB API (optional)

## Tech stack

- **Machine learning:** Python, Pandas, NumPy, scikit-learn (`TruncatedSVD`)
- **Backend:** Flask, Flask-CORS
- **Frontend:** HTML, CSS, JavaScript
- **Data:** MovieLens "small" dataset (about 100,000 ratings from 671 users)
- **Posters:** TMDB API

## How it works

1. Ratings are arranged in a user x movie matrix.
2. The matrix is mean-centered, so unrated movies are treated as average and not as zero. This matters a lot because real rating data is mostly empty. Without it, the error was about 3.0 RMSE.
3. `TruncatedSVD` (40 latent factors) learns hidden taste patterns from the matrix.
4. For a user, the ratings are projected into the model, ratings are predicted for all unrated movies, and the highest ones are returned.
5. A new user with no ratings gets popular movies instead.

The model reaches an RMSE of about 1.0 on held-out ratings (scale 0.5 to 5).

## Project structure

```
backend/
  app.py              Flask API
  posters.py          TMDB poster lookup with caching
  requirements.txt
  data/               put movies.csv, ratings.csv, links.csv here
  model/
    train_model.py    trains and saves the model
frontend/
  index.html
  style.css
  script.js
```

The data files and the trained model (`recommender.pkl`) are not stored in this repository. You create them in the steps below.

## Setup and run

**1. Get the data.** Download `movies.csv`, `ratings.csv` and `links.csv` from the MovieLens small dataset and put all three in `backend/data/`.
Dataset copy: https://github.com/srviest/movie-recommender/tree/master/dataset/movielens/small
Original source: https://grouplens.org/datasets/movielens/

**2. Install the libraries** (Windows commands shown):

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**3. Train the model:**

```
cd model
python train_model.py
cd ..
```

This prints the validation RMSE and saves `recommender.pkl`.

**4. Start the API:**

```
python app.py
```

It runs at http://127.0.0.1:5000. Keep this terminal open.

**5. Open the app.** Open `frontend/index.html` in your browser. If your browser blocks it, run `python -m http.server 8000` inside the `frontend` folder and visit http://127.0.0.1:8000.

## Posters (optional)

Posters need a free TMDB API key. Without a key, the project still works and shows gradient placeholders.

1. Create a free account at https://www.themoviedb.org and request an API key in Settings, API.
2. Before starting the server, set the key in the same terminal:
   `set TMDB_API_KEY=your_key_here`
3. Run `python app.py`.

Never commit your real key to GitHub.

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Using it

1. Search for movies you know and rate at least 3 or 4 of them.
2. Click Get Recommendations.
3. Remove all ratings and click again to see the new-user (popular movies) result.

## Future scope

- User accounts to save ratings
- Short reasons for each recommendation
- Hybrid filtering that also uses genres
- Larger datasets and comparison with other algorithms
- Online deployment

## Credits

- Ratings data: MovieLens, GroupLens Research, University of Minnesota
- Posters: TMDB