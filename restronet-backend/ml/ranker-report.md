# Learned Recommendation Ranker — Report

## What this is

A logistic regression model that learns how to rank venues for a user,
trained on data — replacing the hand-tuned scoring weights currently in
`services/recommendationService.js`. Produced by
`scripts/trainRecommenderRanker.js`.

## Data: simulated, disclosed upfront

The live app has only a handful of real `Interaction` records — not
enough to learn from. This model is trained on a **simulated dataset**
built for demonstration/validation of the approach, not on real user
behavior. This is disclosed here explicitly rather than presented as a
production result.

- **Venues**: real — the 30 venues in the RestroNet database, with real
  cuisines, tags, price range, and rating.
- **Users**: synthetic. 5 hand-defined "persona" preference profiles
  (Budget Foodie, Fine Dining Fan, Cafe Hopper, Nightlife Seeker, Rating
  Chaser), each with its own preferred cuisines/tags/price range and its
  own hidden importance weights over 4 features. 40 noisy synthetic users
  sampled per persona → 200 total.
- **Labels**: each user's true preference weights (not the weights the
  app currently uses — kept independent so training isn't just
  recovering existing hand-tuned code) score all 30 venues; the top 35%
  by that score become "liked" (label 1), rest "skipped" (0), with small
  noise added so it isn't a perfectly clean signal.

**Why this is a fair validation despite being synthetic**: it tests
whether the pipeline (features → training → evaluation) actually works
and whether a learned model can outperform naive baselines when a real
preference signal exists. It does **not** claim to know real RestroNet
users' actual preferences. Retraining on real `Interaction` data once
enough accumulates is a drop-in swap — same script, same feature
extraction, real data instead of `PERSONAS`.

## Features (4, interpretable)

| Feature | Meaning |
|---|---|
| `cuisineOverlap` | fraction of the user's preferred cuisines the venue has |
| `tagOverlap` | fraction of the user's preferred tags the venue has |
| `priceFit` | how close the venue's price range is to what the user prefers |
| `ratingNorm` | venue's average rating, normalized 0–1 |

## Model

Logistic regression, trained with plain gradient descent (no ML
library — ~30 lines of math in the script). Split by user, not by row,
80% train / 20% test, so no user's other venues leak into the test set.

## Results (held-out test users, never seen during training)

**Classification**

| Metric | Value |
|---|---|
| Accuracy | 83.7% |
| Precision | 82.1% |
| Recall | 70.9% |
| F1 | 76.1% |

**Ranking — Precision@5** (of the top 5 venues the model ranks for a
user, how many they'd actually like)

| Method | Precision@5 |
|---|---|
| Learned model | **96.5%** |
| Rating-only baseline | 44.0% |
| Random baseline | 39.0% |

## Learned weights

```
cuisineOverlap: 3.503
tagOverlap:     3.826
priceFit:       3.471
ratingNorm:     0.142
bias:          -4.733
```

Interpretation: cuisine/tag/price fit end up roughly equally important
in the aggregate population, while rating matters much less — because
only 1 of the 5 personas (Rating Chaser) weighs rating heavily, and its
signal is diluted across the population average. This is expected
behavior for a single global model trained on mixed populations, and is
a natural argument for **per-segment or per-user personalization** as
future work, rather than one global weight set.

## Limitations (stated honestly)

- Synthetic data is cleaner than real behavior — real-world accuracy
  with live interaction logs would likely be lower. This validates the
  pipeline, not real user preferences.
- Only 4 features, 30 venues, 5 personas — small by design, kept simple
  on purpose rather than over-engineered.
- A single global model averages across personas; a personalized or
  per-cluster model would likely do better once real segmented data
  exists.

## How to reproduce

```
node scripts/trainRecommenderRanker.js
```

Outputs `ml/ranker-weights.json` (learned weights + metrics) and prints
the same tables above to the console.
