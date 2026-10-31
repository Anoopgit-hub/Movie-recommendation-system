/* =========================================================
   CINEVO FRONTEND
   Flask API + SVD Recommendation System
========================================================= */


/* =========================================================
   API
========================================================= */

const API_BASE = "http://127.0.0.1:5000/api";


/* =========================================================
   APPLICATION STATE
========================================================= */

let allMovies = [];

/*
  Map structure:

  movieId -> rating

  Example:

  1 -> 4.5
  7 -> 5
  13 -> 3.5
*/

const userRatings = new Map();



/* =========================================================
   DOM ELEMENTS
========================================================= */

const movieListEl =
  document.getElementById("movieList");

const ratedListEl =
  document.getElementById("ratedList");

const ratingCountEl =
  document.getElementById("ratingCount");

const recommendationGridEl =
  document.getElementById("recommendationGrid");

const strategyBadgeEl =
  document.getElementById("strategyBadge");

const searchBoxEl =
  document.getElementById("searchBox");

const recommendBtn =
  document.getElementById("recommendBtn");

const profileStrengthEl =
  document.getElementById("profileStrength");

const profileMeterEl =
  document.getElementById("profileMeter");

const movieResultLabelEl =
  document.getElementById("movieResultLabel");

const recommendationHeadlineEl =
  document.getElementById("recommendationHeadline");

const recommendationSubtextEl =
  document.getElementById("recommendationSubtext");

const toastEl =
  document.getElementById("toast");

const navbarEl =
  document.getElementById("navbar");



/* =========================================================
   DECORATIVE POSTER BACKGROUNDS
========================================================= */

const posterPalettes = [

  "linear-gradient(145deg,#16232b,#3c6472 45%,#080909)",

  "linear-gradient(145deg,#251e2d,#69446e 45%,#0b090c)",

  "linear-gradient(145deg,#32231b,#9a542d 48%,#080808)",

  "linear-gradient(145deg,#1d2d22,#426c50 45%,#080b09)",

  "linear-gradient(145deg,#28201b,#856c39 45%,#0b0a08)",

  "linear-gradient(145deg,#1d2638,#4b638e 45%,#090a0f)",

  "linear-gradient(145deg,#2e1d25,#7e3f52 45%,#090809)",

  "linear-gradient(145deg,#202820,#5d7350 45%,#090a08)"

];



/* =========================================================
   HELPER FUNCTIONS
========================================================= */


/*
  Prevent HTML injection when movie titles/genres
  come from the backend.
*/

function escapeHtml(str) {

  const div = document.createElement("div");

  div.textContent = String(str ?? "");

  return div.innerHTML;
}



/*
  Creates initials for the decorative poster.

  Example:

  "Toy Story"

  becomes:

  "TS"
*/

function getInitials(title) {

  const words =
    String(title || "Movie")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/);

  if (!words.length) {
    return "MV";
  }

  return words
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}



/*
  Select a decorative poster style.
*/

function posterStyle(index = 0) {

  return posterPalettes[
    Math.abs(index) % posterPalettes.length
  ];

}



/*
  Get movie ID safely.
*/

function movieIndex(movie) {

  return Math.abs(
    Number(movie.movieId) || 0
  );

}



/* =========================================================
   TOAST MESSAGE
========================================================= */

function showToast(message) {

  toastEl.textContent = message;

  toastEl.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer =
    setTimeout(() => {

      toastEl.classList.remove("show");

    }, 2200);

}



/* =========================================================
   LOAD MOVIES
========================================================= */

async function loadMovies() {

  try {

    const response =
      await fetch(
        `${API_BASE}/movies`
      );


    if (!response.ok) {

      throw new Error(
        "Movie request failed"
      );

    }


    allMovies =
      await response.json();


    renderMovieList(allMovies);

    renderRatedList();

  }

  catch (error) {

    console.error(
      "Movie loading error:",
      error
    );


    movieListEl.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          !
        </div>

        <strong>
          Backend not connected
        </strong>

        <p>
          Start app.py on port 5000,
          then refresh this page.
        </p>

      </div>

    `;


    movieResultLabelEl.textContent =
      "Connection required";

  }

}



/* =========================================================
   RENDER MOVIE LIST
========================================================= */

function renderMovieList(movies) {

  /*
    No search results
  */

  if (!movies.length) {

    movieListEl.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ⌕
        </div>

        <strong>
          No matches
        </strong>

        <p>
          Try another title or genre.
        </p>

      </div>

    `;


    movieResultLabelEl.textContent =
      "No movies found";

    return;

  }



  /*
    Update result count
  */

  movieResultLabelEl.textContent =
    `${movies.length} movie${
      movies.length === 1 ? "" : "s"
    } available`;



  /*
    Build movie rows
  */

  movieListEl.innerHTML =

    movies.slice(0, 100).map((movie) => {

      const currentRating =
        userRatings.get(
          movie.movieId
        ) ?? "";


      const index =
        movieIndex(movie);


      return `

        <div class="movie-row">


          <!-- Decorative poster -->

          <div
            class="mini-poster"
            data-movie-id="${movie.movieId}"
            style="background:${posterStyle(index)}"
          >

            <span>
              ${escapeHtml(
                getInitials(movie.title)
              )}
            </span>

          </div>



          <!-- Movie information -->

          <div class="info">

            <span class="title">

              ${escapeHtml(
                movie.title
              )}

            </span>


            <span class="genres">

              ${escapeHtml(
                movie.genres || "Movie"
              )}

            </span>

          </div>



          <!-- Rating -->

          <select
            data-movie-id="${movie.movieId}"
            class="rate-select"
            aria-label="Rate ${escapeHtml(movie.title)}"
          >

            <option value="">
              Rate
            </option>


            ${
              [
                1,
                1.5,
                2,
                2.5,
                3,
                3.5,
                4,
                4.5,
                5
              ]

              .map(
                value => `

                  <option
                    value="${value}"
                    ${
                      String(value) ===
                      String(currentRating)
                        ? "selected"
                        : ""
                    }
                  >

                    ${value} ★

                  </option>

                `
              )

              .join("")
            }

          </select>

        </div>

      `;

    })

    .join("");



  /*
    Add rating listeners
  */

  document
    .querySelectorAll(".rate-select")
    .forEach(select => {

      select.addEventListener(
        "change",
        handleRatingChange
      );

    });

  loadMiniPosters(movies);

}



/* =========================================================
   LOAD REAL POSTERS (TMDB, via the Flask backend)
========================================================= */

let posterTimer = null;

function loadMiniPosters(movies) {

  clearTimeout(posterTimer);

  /* wait 300ms so we don't fire on every keystroke while typing */
  posterTimer = setTimeout(async () => {

    const ids = movies.slice(0, 100).map(movie => movie.movieId);

    if (!ids.length) return;

    try {

      const response = await fetch(`${API_BASE}/posters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });

      if (!response.ok) return;

      const posterMap = await response.json();

      document.querySelectorAll(".mini-poster").forEach(el => {

        const url = posterMap[el.dataset.movieId];

        if (!url) return;

        el.style.backgroundImage = `url('${url}')`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";

        const initials = el.querySelector("span");
        if (initials) initials.style.display = "none";

      });

    } catch (error) {

      console.warn("Poster loading skipped:", error);

    }

  }, 300);

}



/* =========================================================
   HANDLE RATING CHANGE
========================================================= */

function handleRatingChange(event) {

  const movieId =
    Number(
      event.target.dataset.movieId
    );


  const value =
    event.target.value;



  /*
    User removed rating
  */

  if (!value) {

    userRatings.delete(
      movieId
    );

    showToast(
      "Rating removed"
    );

  }

  /*
    User added/changed rating
  */

  else {

    userRatings.set(
      movieId,
      Number(value)
    );

    showToast(
      "Rating saved"
    );

  }



  renderRatedList();

  updateProfileStrength();

}



/* =========================================================
   RENDER USER RATINGS
========================================================= */

function renderRatedList() {

  ratingCountEl.textContent =
    `${userRatings.size} rated`;



  /*
    No ratings
  */

  if (userRatings.size === 0) {

    ratedListEl.innerHTML = `

      <div class="empty-state compact">

        <div class="empty-icon">
          ＋
        </div>

        <strong>
          Your taste profile is empty
        </strong>

        <p>
          Rate 3–4 movies to give
          Cinevo a strong signal.
        </p>

      </div>

    `;


    updateProfileStrength();

    return;

  }



  /*
    Create rating chips
  */

  ratedListEl.innerHTML =

    Array
      .from(userRatings.entries())
      .map(
        ([movieId, rating]) => {

          const movie =
            allMovies.find(
              m =>
                Number(m.movieId) ===
                Number(movieId)
            );


          if (!movie) {
            return "";
          }


          return `

            <span class="rated-chip">

              <span>
                ${escapeHtml(
                  movie.title
                )}
              </span>


              <span class="stars">
                ${rating}★
              </span>


              <button
                data-movie-id="${movieId}"
                title="Remove rating"
                aria-label="Remove ${escapeHtml(movie.title)}"
              >
                ×
              </button>

            </span>

          `;

        }
      )
      .join("");



  /*
    Remove rating buttons
  */

  document
    .querySelectorAll(
      ".rated-chip button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        handleRemoveRating
      );

    });


  updateProfileStrength();

}



/* =========================================================
   REMOVE RATING
========================================================= */

function handleRemoveRating(event) {

  const movieId =
    Number(
      event.currentTarget.dataset.movieId
    );


  userRatings.delete(
    movieId
  );


  renderRatedList();


  renderMovieList(
    filterMovies(
      searchBoxEl.value
    )
  );


  updateProfileStrength();


  showToast(
    "Rating removed"
  );

}



/* =========================================================
   PROFILE STRENGTH
========================================================= */

function updateProfileStrength() {

  const count =
    userRatings.size;


  /*
    5 ratings = 100%

    Example:

    1 = 20%
    2 = 40%
    3 = 60%
    4 = 80%
    5 = 100%
  */

  const percentage =
    Math.min(
      100,
      Math.round(
        (count / 5) * 100
      )
    );


  profileStrengthEl.textContent =
    `${percentage}%`;


  profileMeterEl.style.width =
    `${percentage}%`;

}



/* =========================================================
   SEARCH / FILTER MOVIES
========================================================= */

function filterMovies(query) {

  const q =
    query
      .trim()
      .toLowerCase();


  /*
    Empty search:
    show everything
  */

  if (!q) {

    return allMovies;

  }


  /*
    Search title OR genre
  */

  return allMovies.filter(
    movie =>

      String(movie.title)
        .toLowerCase()
        .includes(q)

      ||

      String(movie.genres || "")
        .toLowerCase()
        .includes(q)
  );

}



/* =========================================================
   GET RECOMMENDATIONS
========================================================= */

async function getRecommendations() {

  /*
    Need at least one rating
  */

  if (userRatings.size === 0) {

    showToast(
      "Rate at least one movie first"
    );


    document
      .getElementById("rate")
      .scrollIntoView({
        behavior: "smooth"
      });


    return;

  }



  /*
    Change button while AI works
  */

  recommendBtn.disabled = true;

  recommendBtn.innerHTML = `
    <span>◌</span>
    Learning your taste...
  `;



  /*
    Convert Map to API format

    Example:

    [
      {
        movieId: 1,
        rating: 4.5
      },
      {
        movieId: 7,
        rating: 5
      }
    ]
  */

  const ratings =
    Array
      .from(userRatings.entries())
      .map(
        ([movieId, rating]) => ({

          movieId,

          rating

        })
      );



  try {

    const response =
      await fetch(
        `${API_BASE}/recommend`,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              ratings,

              topN: 10

            })

        }
      );



    if (!response.ok) {

      throw new Error(
        "Recommendation request failed"
      );

    }



    const data =
      await response.json();



    /*
      Display recommendations
    */

    renderRecommendations(
      data
    );



    /*
      Scroll to recommendation section
    */

    document
      .getElementById(
        "recommendations"
      )
      .scrollIntoView({

        behavior: "smooth",

        block: "start"

      });

  }

  catch (error) {

    console.error(
      "Recommendation error:",
      error
    );


    recommendationGridEl.innerHTML = `

      <div class="empty-state recommendation-empty">

        <div class="empty-icon">
          !
        </div>

        <strong>
          Could not reach Cinevo AI
        </strong>

        <p>
          Make sure app.py is running
          on port 5000.
        </p>

      </div>

    `;


    showToast(
      "Backend connection failed"
    );

  }

  finally {

    /*
      Restore button
    */

    recommendBtn.disabled = false;

    recommendBtn.innerHTML = `
      <span>✦</span>
      Build My Recommendations
    `;

  }

}



/* =========================================================
   RENDER RECOMMENDATIONS
========================================================= */

function renderRecommendations(data) {

  const strategy =
    data.strategy;


  const recommendations =
    data.recommendations;



  /*
    Determine strategy
  */

  const isPopularity =
    strategy === "popularity";



  /*
    Update strategy badge
  */

  strategyBadgeEl.textContent =

    isPopularity

      ? "Cold start · Popular picks"

      : "Personalized · SVD";



  /*
    Update headline
  */

  recommendationHeadlineEl.textContent =

    isPopularity

      ? "Popular picks while Cinevo learns your taste."

      : "Your taste profile has shaped these picks.";



  /*
    Update description
  */

  recommendationSubtextEl.textContent =

    isPopularity

      ? "Rate more movies to move from popularity-based discovery to personalized recommendations."

      : `${userRatings.size} rated movie${
          userRatings.size === 1
            ? ""
            : "s"
        } used to build this shelf.`;



  /*
    No recommendations
  */

  if (
    !recommendations ||
    recommendations.length === 0
  ) {

    recommendationGridEl.innerHTML = `

      <div class="empty-state recommendation-empty">

        <div class="empty-icon large">
          ∅
        </div>

        <strong>
          No recommendations found.
        </strong>

        <p>
          Try rating a few different movies.
        </p>

      </div>

    `;

    return;

  }



  /*
    Build recommendation cards
  */

  recommendationGridEl.innerHTML =

    recommendations
      .map(
        (movie, index) => {


          /*
            Predicted rating

            The backend's README/project
            uses predicted fit/rating.
          */

          const predicted =
            movie.predictedRating !== undefined &&
            movie.predictedRating !== null

              ? Number(
                  movie.predictedRating
                )

              : null;



          /*
            Convert predicted rating
            from 5-point scale to percentage.

            Example:

            4.5 / 5 = 90%
          */

          const match =

            predicted !== null

              ? Math.max(
                  0,
                  Math.min(
                    99,
                    Math.round(
                      (predicted / 5) * 100
                    )
                  )
                )

              : null;



          const title =
            escapeHtml(
              movie.title
            );


          const genres =
            escapeHtml(
              movie.genres ||
              "Movie"
            );


          const initials =
            escapeHtml(
              getInitials(
                movie.title
              )
            );



          /*
            If title is long,
            show initials on poster.
          */

          const posterTitle =
            title.length > 26
              ? initials
              : title;


          /*
            Use the real TMDB poster when the backend found one,
            otherwise keep the decorative gradient.
          */

          const posterBackground =
            movie.posterUrl
              ? `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.35)), url('${movie.posterUrl}') center/cover no-repeat`
              : posterStyle(index + movieIndex(movie));



          return `

            <article class="rec-card">


              <!-- Poster -->

              <div
                class="rec-poster"
                style="background:${posterBackground}"
              >


                ${
                  match !== null

                    ? `

                      <span class="match-badge">

                        ${match}% MATCH

                      </span>

                    `

                    : ""
                }


                <span class="poster-label">

                  CINEVO PICK #

                  ${String(index + 1)
                    .padStart(2, "0")}

                </span>


                <strong class="poster-title" style="${movie.posterUrl ? 'display:none' : ''}">

                  ${posterTitle}

                </strong>


                <span class="poster-meta" style="${movie.posterUrl ? 'display:none' : ''}">

                  ${genres}

                </span>


              </div>



              <!-- Movie information -->

              <div class="rec-info">

                <div
                  class="rec-title"
                  title="${title}"
                >

                  ${title}

                </div>


                <div class="rec-genres">

                  ${genres}

                </div>


                ${
                  predicted !== null

                    ? `

                      <div class="rec-score">

                        Predicted fit ·
                        ${predicted.toFixed(2)}
                        / 5

                      </div>

                    `

                    : ""
                }

              </div>


            </article>

          `;

        }
      )
      .join("");

}



/* =========================================================
   SEARCH INPUT
========================================================= */

searchBoxEl.addEventListener(
  "input",
  event => {

    const filteredMovies =
      filterMovies(
        event.target.value
      );


    renderMovieList(
      filteredMovies
    );

  }
);



/* =========================================================
   RECOMMEND BUTTON
========================================================= */

recommendBtn.addEventListener(
  "click",
  getRecommendations
);



/* =========================================================
   NAV SEARCH BUTTON
========================================================= */

document
  .getElementById("navSearchBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("rate")
        .scrollIntoView({

          behavior: "smooth"

        });


      setTimeout(
        () => {

          searchBoxEl.focus();

        },
        500
      );

    }
  );



/* =========================================================
   NAVBAR SCROLL EFFECT
========================================================= */

window.addEventListener(
  "scroll",
  () => {

    navbarEl.classList.toggle(
      "scrolled",
      window.scrollY > 30
    );

  }
);



/* =========================================================
   CTRL + K / CMD + K SEARCH
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {

      event.preventDefault();

      searchBoxEl.focus();

    }

  }
);



/* =========================================================
   START APPLICATION
========================================================= */

loadMovies();