# Superposition Backlog: Quantum-Native Agile Methodology

**Date:** 2026-03-21
**Status:** Concept / Design
**Domain:** Agile Methodology × Quantum Formalism (C-K Theory Innovation)

## Problem

Traditional Agile treats cards as **classical objects** with fixed states. A card has one priority, one estimate, one assignment. But reality is different:

- **Priority is uncertain** until the team discusses it — each member has a different mental model
- **Effort is uncertain** until someone starts the work — estimates are probability distributions, not point values
- **Value is uncertain** until the customer sees it — business assumptions are hypotheses
- **Refinement forces premature collapse** — the team picks a single number (3 points? 5 points?) when the honest answer is a distribution

This premature certainty creates systematic planning errors:

| Classical Agile Assumption | Reality |
|---------------------------|---------|
| "This card is 5 points" | "This card is 3 points (40%), 5 points (35%), 8 points (25%)" |
| "This is high priority" | "High for sales team, medium for engineering, low for ops" |
| "This blocks that" | "73% chance of blocking based on historical subsystem coupling" |

No existing tool models this uncertainty formally. Planning Poker approximates it socially but discards the distribution.

## Solution

Model backlog cards as **quantum states** where properties exist in **superposition** until progressively measured through Agile ceremonies. Apply C-K Theory to formalize this as a design innovation.

### C-K Theory Analysis

**Concept (C-space) — undecidable propositions:**
- "A card that has multiple priorities simultaneously"
- "A sprint plan that exists in superposition of configurations"
- "A refinement ceremony that partially collapses uncertainty"

**Knowledge (K-space) — established truths:**
- Quantum superposition: a system exists in multiple states until measured
- Partial measurement: measuring one property leaves others in superposition
- Born rule: measurement outcomes follow probability amplitudes
- MPS tensor networks: efficient representation of multi-body quantum states
- QAOA: quantum optimization over superposed configurations

**C→K expansion (the innovation):**

The C-K disjunction — the concept that breaks from known design space — is:

> Agile ceremonies ARE measurement operators. Refinement is partial measurement.
> Sprint commitment is full wavefunction collapse. The backlog exists in
> superposition, and the team's job is to design the optimal measurement
> sequence that extracts maximum value while minimizing premature collapse.

This is not a metaphor. It is a **computable formalism** implementable with the MPS tensor network and OpenQASM stack.

### Quantum State Representation

Each card exists in a Hilbert space:

```
|card_i⟩ = Σ αₚ|priority_p⟩ ⊗ Σ βₑ|effort_e⟩ ⊗ Σ γᵥ|value_v⟩

Where:
- |priority_p⟩ ∈ {|critical⟩, |high⟩, |medium⟩, |low⟩}
- |effort_e⟩  ∈ {|1⟩, |2⟩, |3⟩, |5⟩, |8⟩, |13⟩}
- |value_v⟩   ∈ {|high⟩, |medium⟩, |low⟩}

Amplitudes (α, β, γ) encode the probability distribution over states.
```

**The full backlog** is a joint state of all cards:

```
|backlog⟩ = MPS(A₁, A₂, ..., Aₙ)

The MPS captures entanglement (correlations) between cards.
If cards i and j are entangled, measuring card i changes the
probability distribution of card j.
```

### Agile Ceremonies as Measurement Operators

| Ceremony | Quantum Operation | Effect |
|----------|------------------|--------|
| **Backlog Grooming** | Weak measurement | Slightly narrows amplitude distributions; does not collapse |
| **Planning Poker** | Projective measurement on effort subspace | Collapses effort to a single value; priority and value remain in superposition |
| **Priority Vote** | Projective measurement on priority subspace | Collapses priority; effort and value remain in superposition |
| **Sprint Commitment** | Full measurement | Collapses all properties to definite values; card enters sprint |
| **Sprint Review** | Value measurement | Collapses value dimension based on stakeholder feedback |
| **Retrospective** | Parameter update | Updates MPS tensors (learning); does not collapse states |

### Progressive Collapse Workflow

```
Card created → Full superposition
    │
    ▼
Backlog grooming → Weak measurement
    Amplitudes narrow but don't collapse
    UI shows: probability bars for each property
    │
    ▼
Planning Poker → Effort measured
    Team votes → Born rule → effort collapses to "5 points"
    Priority still in superposition: 60% high, 30% medium, 10% low
    Value still in superposition: 45% high, 55% medium
    │
    ▼
Priority vote → Priority measured
    Stakeholder input → priority collapses to "high"
    Value still in superposition
    │
    ▼
Sprint commitment → Full collapse
    Card enters sprint with definite state: 5 points, high priority
    │
    ▼
Sprint review → Value measured
    Stakeholder feedback → value collapses to "high"
    MPS tensors updated with outcome data
```

### UI Design

**Card in superposition (pre-refinement):**

```
┌─────────────────────────────┐
│ User Authentication Flow    │
│                             │
│ Priority: ████░░░░ high     │  ← probability bar
│           ███░░░░░ medium   │
│           █░░░░░░░ low      │
│                             │
│ Effort:   ██░░░░░░ 3 pts   │
│           ████░░░░ 5 pts   │
│           ███░░░░░ 8 pts   │
│                             │
│ Entangled with: #38, #41   │  ← MI > threshold
│ Collapse: 33% measured     │  ← how much is known
└─────────────────────────────┘
```

**Card fully collapsed (in sprint):**

```
┌─────────────────────────────┐
│ User Authentication Flow    │
│                             │
│ Priority: HIGH              │  ← definite
│ Effort:   5 points          │  ← definite
│ Value:    ████░░░░ high     │  ← still in superposition
│           ████░░░░ medium   │     (until sprint review)
└─────────────────────────────┘
```

### Where Each Technology Component Fits

```
MPS Tensor Network (LWC library)
├── Represents joint quantum state of all cards
├── Computes conditional probabilities (cascade prediction)
├── Trained on historical sprint data via ALS
└── MI-based ordering ensures efficient representation

OpenQASM Circuit Launcher (IBM Quantum)
├── QAOA circuit for sprint plan optimization
├── Sampler primitive → distribution over valid plans
├── Estimator primitive → expected value evaluation
└── Encodes backlog superposition as actual quantum state

Mutual Information (Feature Ordering)
├── Quantifies card-card entanglement strength
├── Determines MPS chain ordering
├── Identifies hidden dependency clusters
└── Feeds into cascade prediction
```

## What Makes This Novel

1. **No existing Agile tool models uncertainty formally.** Cards are always classical objects with point values. This is the first framework that preserves and leverages uncertainty.

2. **C-K Theory validates the disjunction.** "Cards in superposition" is undecidable in current K-space (no tool does this). The knowledge injection (quantum formalism + tensor networks) makes it decidable and computable.

3. **The math is real, not metaphorical.** MPS contraction computes actual conditional probabilities. QAOA optimizes over actual superposed configurations. The quantum formalism isn't decoration — it's the computation engine.

4. **It changes how teams plan.** Instead of "estimate this card," teams progressively reduce uncertainty through structured ceremonies that map to quantum measurements. This is a new Agile methodology, not just a tool feature.

## Risks

| Risk | Mitigation |
|------|-----------|
| Conceptual complexity for end users | UI shows probability bars and plain language; quantum formalism is invisible |
| Overhead of maintaining distributions | Distributions auto-narrow through ceremonies; converge to classical behavior |
| Adoption resistance | Opt-in feature; classical mode always available as fallback |
| Insufficient data for initial amplitudes | Use card metadata and historical priors; uniform distribution as default |
