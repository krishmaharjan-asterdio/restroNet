# Local Intent Classifier — Report

## What this replaces

`aiService.parseIntent` (Gemini 2.5 Flash) — the only Gemini call in the
Discover recommendation + search path. Replaced by
`services/localIntentParser.js`, wired into
`controllers/recommendationController.js`. Zero network calls, zero API
key, in this path.

## Design: two techniques for two different slot types

| Slot type | Technique | Why |
|---|---|---|
| cuisineIds / categoryIds / tagIds | Fuzzy string match against real metadata names (`services/nlpParser.js`, unchanged) | Exact entity lookup — a name either matches a real record or it doesn't. Training a model here adds nothing over precise matching. |
| mood, price sentiment, isNearMe, isTopRated | **Trained classifier** (this report) | Expressed in endless paraphrases sharing no keywords ("won't break the bank" vs "cheap"). A fixed keyword list only catches phrasings someone thought to write down. |
| sortBy | Explicit phrase pattern match (new, small) | A user typing "cheapest first" is issuing a direct command, not a fuzzy preference — no ambiguity to resolve. |
| location | Lookup against real city/neighbourhood names already in the Venue collection (new, small) | Fixed, known gazetteer — a lookup problem, same reasoning as entity slots. |

## Data: synthetic, template-generated, disclosed

No labeled query log exists yet. `scripts/trainIntentClassifier.js`
generates compound queries (multiple slots per sentence, e.g. "an
affordable romantic spot near me" — mirroring how people actually type)
by combining hand-written paraphrase banks per slot. The paraphrases were
deliberately written to avoid overlapping with the existing rule-based
keyword lists (`nlpParser.js`'s cheap/expensive/near-me/top-rated word
lists), so the held-out test set is a fair measure of generalization to
new phrasings — not a rehash of the same words the rules already know.

900 unique synthetic queries generated, 720 train / 180 held-out test,
split by example (no leakage).

## Model

One-vs-rest logistic regression per label (8 mood classes, 2 price
classes, 2 standalone binary heads for isNearMe/isTopRated), trained on
top of the MiniLM sentence embeddings already used elsewhere in this app
(`aiService.generateEmbedding`). Plain gradient descent, L2
regularization, no new dependency.

**Important fix during training**: each mood class is only ~7% of the
training rows in one-vs-rest framing. Unweighted gradient descent
collapsed to always predicting "none" (max output probability never
exceeded ~0.19). Fixed with inverse-frequency class weighting (same idea
as scikit-learn's `class_weight='balanced'`) — weighting each example so
positive and negative classes contribute equally to the gradient
regardless of how rare the positive class is.

## Results — same held-out sentences, trained model vs the rule baseline it replaces

| Slot | Trained model | Rule baseline |
|---|---|---|
| mood | **85.6%** | 70.0% |
| price sentiment | **88.3%** | 78.3% |
| isNearMe | **87.8%** | 68.3% |
| isTopRated | **91.7%** | 82.2% |

The trained model outperforms keyword matching on every slot, on
sentences phrased to avoid the rule keywords — the concrete evidence for
why a trained model earns its place here instead of just extending the
keyword list.

## Limitations (stated honestly)

- Synthetic data, not real user queries — validates the approach and the
  pipeline, not real-world phrasing distribution. Retraining on a real
  query log (once one exists) is a drop-in swap: same script, same
  feature extraction, real queries instead of the paraphrase banks.
- Rule baseline is intentionally simple (the exact logic it replaces) —
  not claiming to have exhausted rule-based approaches, only that
  training clears that specific, real bar.
- sortBy and location remain non-ML lookups by design (see table above),
  not because ML wasn't tried.

## How to reproduce

```
node scripts/trainIntentClassifier.js
```

Outputs `ml/intent-classifier-weights.json` (model weights + metrics)
and prints the same table above to the console. Re-running regenerates a
fresh random synthetic sample each time — exact percentages vary by a
few points run to run, the ranking (trained > rules on every slot) holds
consistently.
