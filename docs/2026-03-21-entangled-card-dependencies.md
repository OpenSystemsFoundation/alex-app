# Entangled Card Dependencies via MPS Tensor Networks

**Date:** 2026-03-21
**Status:** Concept / Design
**Domain:** Card Dependency Analysis × Tensor Networks

## Problem

Card dependencies in Agile boards are modeled as **explicit directed edges** — card A blocks card B. This captures only the dependencies teams manually declare. In practice, cards have **implicit correlations** that no one formally tracks:

- Cards touching the same subsystem tend to slip together
- A blocked card in one column cascades unpredictably to unrelated cards
- Effort estimates on correlated cards compound errors
- Sprint risk concentrates in clusters of implicitly-coupled cards

No existing Agile tool detects or models these hidden dependencies. Teams discover them reactively — during standups, when things break, or in retrospectives after the damage is done.

## Solution

Model the **joint probability distribution over all card states** using a **Matrix Product State (MPS) tensor network**, trained on historical card data. Use **Mutual Information (MI)** to quantify pairwise card correlations and order cards optimally within the MPS chain.

### Why MPS

An MPS is a 1D tensor network that efficiently represents probability distributions with bounded correlations:

```
    A₁ ─── A₂ ─── A₃ ─── A₄ ─── A₅
    │      │      │      │      │
    s₁     s₂     s₃     s₄     s₅

Each Aᵢ is a tensor of shape (D, dᵢ, D)
- D = bond dimension (controls correlation capacity)
- dᵢ = number of states for card i (e.g., blocked/active/done)
- Chain length = number of cards
```

**Key properties:**

| Property | Benefit for Alex |
|----------|-----------------|
| Linear scaling O(N × D²) | Handles 100+ card boards |
| Captures correlations up to distance ~D | Sufficient for sprint-scale dependencies |
| Exact contraction (no sampling needed) | Deterministic predictions |
| Trainable from data via DMRG-like sweeps | Learns from historical sprint data |

### Mutual Information Feature Ordering

The MPS is a 1D chain — cards placed far apart in the chain have weaker representable correlations. **Optimal ordering places highly-correlated cards adjacent in the chain.**

**Algorithm:**

```
1. Compute pairwise Mutual Information I(Xᵢ; Xⱼ) for all card pairs
   from historical state data (SprintSnapshot__c + Card__c records)

2. Build MI graph: nodes = cards, edge weights = I(Xᵢ; Xⱼ)

3. Find optimal ordering via:
   - Greedy: start with highest-MI pair, insert remaining cards
     adjacent to their highest-MI neighbor
   - Or: spectral ordering on the MI Laplacian (Fiedler vector)

4. Arrange cards in MPS chain according to this ordering

5. Train MPS parameters via alternating least squares (ALS)
   on historical card state data
```

**Mutual Information calculation:**

```
I(Xᵢ; Xⱼ) = Σ p(xᵢ, xⱼ) × log[ p(xᵢ, xⱼ) / (p(xᵢ) × p(xⱼ)) ]

Where:
- xᵢ ∈ {backlog, active, blocked, done, carried_over}
- p(xᵢ, xⱼ) = joint frequency from SprintSnapshot history
- High MI = cards whose states are strongly correlated
```

### Dependency Cascade Prediction

Once trained, the MPS enables **conditional probability queries**:

```
Given: Card #42 just moved to "Blocked"
Query: P(card_j = blocked | card_42 = blocked) for all j

Implementation:
1. Fix site 42 to "blocked" state
2. Contract MPS to compute marginal probabilities for all other sites
3. Compare to unconditional probabilities
4. Cards where P(blocked | card_42 blocked) >> P(blocked) are "entangled"
```

This is a **quantum-inspired dependency cascade predictor**. When a card's state changes, the MPS instantly propagates the impact to all correlated cards — surfacing hidden risks the team wouldn't otherwise see.

### UI Integration

```
Card #42 moves to "Blocked"
        │
        ▼
MPS contraction (browser, <100ms for D=8, N=50)
        │
        ▼
Redux action: DEPENDENCY_CASCADE_DETECTED
        │
        ▼
Affected cards highlighted with risk indicator
        │
        ▼
Tooltip: "This card has 73% probability of slipping
          based on historical correlation with Card #42"
```

### Training Pipeline

```
Historical data (SprintSnapshot__c + Card__c + SprintCard__c)
        │
        ▼
Extract state sequences: for each sprint, record card states at each snapshot
        │
        ▼
Compute pairwise MI → optimal ordering
        │
        ▼
Train MPS via ALS (alternating least squares):
  - Sweep left-to-right, right-to-left
  - Optimize one tensor at a time (SVD-based)
  - Converges in 5-20 sweeps for D ≤ 16
        │
        ▼
Store trained MPS tensors in browser (IndexedDB or Static Resource)
        │
        ▼
Re-train weekly or on sprint completion
```

## Data Requirements

- `Card__c` state history (status transitions over time)
- `SprintSnapshot__c` daily snapshots (card counts, completion states)
- `SprintCard__c` records (which cards were in which sprints, carried over, removed)
- Minimum: 3-5 completed sprints for meaningful MI estimates

## Implementation Notes

- **Bond dimension D = 4-8** is sufficient for most boards (20-80 cards)
- **Pure JavaScript** implementation — no external ML framework needed
- Core operations: matrix multiplication, SVD (use LAPACK.js or hand-rolled Jacobi)
- MPS contraction for conditional queries: O(N × D² × d) ≈ milliseconds
- Training: O(sweeps × N × D³ × d²) ≈ seconds for typical board sizes

## Risks

| Risk | Mitigation |
|------|-----------|
| Insufficient history for MI estimates | Bootstrap from card metadata similarity (type, component, assignee) as prior |
| False correlations (spurious MI) | Threshold MI values; require statistical significance |
| Ordering sensitivity | Spectral ordering is robust; greedy is a fallback |
| User trust in predictions | Show confidence intervals; label as "AI suggestion" |
