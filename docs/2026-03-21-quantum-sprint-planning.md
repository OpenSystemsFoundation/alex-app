# Quantum Sprint Planning via QAOA/QUBO Optimization

**Date:** 2026-03-21
**Status:** Concept / Design
**Domain:** Sprint Planning × Quantum Computing

## Problem

Sprint planning is a **combinatorial optimization problem**. Teams must assign N cards across M sprints, subject to constraints: capacity (story points), card dependencies, WIP limits, team member availability, and priority ordering. Traditional approaches rely on human intuition or simple heuristics (sort by priority, fill to capacity). These methods:

- Ignore complex inter-card dependencies
- Cannot evaluate the full space of valid plans
- Produce a single deterministic plan with no visibility into alternatives
- Scale poorly as backlog size grows

Existing tools (Jira, Azure DevOps, Linear) offer no computational planning support beyond basic sorting and filtering.

## Solution

Encode sprint planning as a **QUBO (Quadratic Unconstrained Binary Optimization)** problem and solve it using a **QAOA (Quantum Approximate Optimization Algorithm)** circuit executed on IBM Quantum hardware via the OpenQASM circuit launcher already built for Alex.

### QUBO Formulation

**Decision variables:**

```
x[i][s] ∈ {0, 1}    — 1 if card i is assigned to sprint s, 0 otherwise
```

**Objective function (maximize):**

```
max Σᵢ Σₛ  value(i) × priority_weight(i) × x[i][s]
    - λ₁ Σₛ (Σᵢ points(i) × x[i][s] - capacity(s))²     // capacity penalty
    - λ₂ Σ(i,j)∈deps  x[j][s] × (1 - x[i][s'])            // dependency ordering
    - λ₃ Σᵢ (Σₛ x[i][s] - 1)²                              // each card in at most one sprint
```

**Constraints encoded as penalty terms:**

| Constraint | Encoding |
|-----------|----------|
| Sprint capacity | Quadratic penalty when total points exceed capacity |
| Card dependencies | Penalty when dependent card is in earlier sprint |
| Single assignment | Penalty when card appears in multiple sprints |
| WIP limits | Penalty when column card count exceeds WIP limit |
| Team skills | Penalty when card requires skill not in sprint team |

### QAOA Circuit

The QAOA circuit alternates between:

1. **Problem unitary** `e^{-iγC}` — encodes the QUBO cost function
2. **Mixer unitary** `e^{-iβB}` — explores the solution space

```
     ┌───┐┌──────────┐┌──────────┐     ┌──────────┐┌──────────┐┌───┐
|0⟩──┤ H ├┤ e^{-iγC} ├┤ e^{-iβB} ├─···─┤ e^{-iγC} ├┤ e^{-iβB} ├┤ M ├
     └───┘└──────────┘└──────────┘     └──────────┘└──────────┘└───┘
           ◄─────── p layers (depth) ──────────►
```

- **p = 1-3 layers** is sufficient for sprint-scale problems (10-50 cards)
- Variational parameters (γ, β) optimized classically between circuit executions
- Circuit depth scales linearly with number of QUBO terms

### IBM Quantum Integration

Using the existing OpenQASM launcher with Sampler and Estimator primitives:

| Primitive | Role in Sprint Planning |
|-----------|------------------------|
| **Sampler** | Returns probability distribution over valid sprint plans. Each bitstring = one candidate assignment. Top-K bitstrings = top-K plans. |
| **Estimator** | Evaluates expected cost function value for a given parameter set (γ, β). Used in the classical optimization loop. |

### Workflow

```
1. User opens Sprint Planning view
2. Alex extracts card data (points, priority, dependencies) from Redux store
3. QUBO matrix constructed in browser (pure JS)
4. OpenQASM circuit generated for QAOA
5. Circuit submitted to IBM Quantum via Apex Named Credential callout
6. Sampler returns measurement distribution
7. Top 5 plans decoded from highest-probability bitstrings
8. Plans displayed as selectable options in the Sprint Planning UI
9. Team discusses and selects (or modifies) a plan
10. Selected plan auto-populates the sprint backlog
```

### What Makes This Novel

Existing quantum optimization demos solve abstract problems (Max-Cut, TSP). This applies QAOA to a **real enterprise workflow** embedded in a production Salesforce application. The team doesn't see qubits — they see ranked sprint plan options with confidence scores.

The **Sampler primitive output** is the key insight: instead of one "optimal" plan, the team gets a **probability landscape** of good plans. This aligns with how Agile actually works — planning is collaborative and exploratory, not deterministic.

## Data Requirements

- `SprintSnapshot__c` history (velocity calibration)
- `Card__c` records (points, priority, type, dependencies)
- `Sprint__c` capacity settings
- `Column__c` WIP limits

## Dependencies

- OpenQASM circuit launcher (existing)
- IBM Quantum Platform API access (Sampler + Estimator primitives)
- Apex Named Credential for IBM Quantum authentication
- QUBO encoder (to be built — pure JS, browser-side)

## Risks

| Risk | Mitigation |
|------|-----------|
| IBM Quantum queue times (minutes to hours) | Use Qiskit Runtime sessions for priority; fall back to classical simulator for instant results |
| Circuit size limits on current hardware | Sprint problems are small (10-50 qubits); well within current device limits |
| Noise on NISQ devices | QAOA is noise-tolerant by design; error mitigation via Estimator primitive options |
| User adoption | Plans presented as suggestions, not mandates; team always has final say |
