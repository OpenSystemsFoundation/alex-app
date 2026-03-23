# 1. Abstract

We present a novel algorithm for **abductive feature discovery** — the problem of identifying which features must be added to an existing system to achieve a desired outcome. We frame software feature evolution as a discrete dynamical system and apply **Koopman operator theory** to lift nonlinear feature interactions into a linear spectral space. In this lifted space, abduction reduces to eigenmode projection: decompose the target outcome into Koopman eigenmodes and identify which missing features activate the dominant modes.

We approximate the Koopman operator using **Dynamic Mode Decomposition (DMD)** on development history snapshots and propose **Quantum DMD (QDMD)** via Quantum Phase Estimation for exponential speedup in the eigendecomposition step. We validate on a real software system (Alex, a Salesforce kanban application) with 8 capability fibers and 6 development trajectories.

**Results**: (H4) The Koopman eigenspectrum contains 3 modes with |λ| ≥ 0.5, confirming structured feature evolution dynamics. (H5) QPE on **IBM Kingston** (Heron R2, 156 qubits) extracts eigenvalues with mean phase error 0.091, within the 0.10 threshold — the first demonstration of Koopman eigenvalue extraction on quantum hardware applied to software design theory.

We ground the algorithm in **C-K-R design theory** (Hatchuel & Weil 2003, Kroon 2017), establishing a formal correspondence between Koopman spectral projection and the concept–knowledge expansion operator, with Cohen forcing as the mathematical warrant for framework extension.

# 2. Introduction

## 2.1 The Abductive Problem

Software design regularly confronts a question that is neither deductive nor inductive:

> Given the current system state Z and a desired outcome Y, what feature X must be added such that Z + X → Y?

This is **abduction** — inference to the best explanation, or more precisely, inference to the best *intervention*. Current approaches to this problem are either:

- **Expert intuition**: architects draw on experience, subject to cognitive fixation and local optima in the solution space
- **LLM generation**: language models propose features by pattern-matching against training data, inheriting the distribution's local optima (see §2.3)
- **Combinatorial search**: enumerate feature combinations and evaluate, exponential in the number of candidate features

None of these approaches exploit the **dynamical structure** of how features interact and evolve. A system that added Redux, then PlatformEvents, then EchoPrevention followed a trajectory through feature space. That trajectory encodes information about which features compose well, which create emergent capabilities, and which interact destructively — information that can be extracted and used for abduction.

## 2.2 The Key Insight

Feature interactions are **nonlinear**. Combining Redux (state management) with PlatformEvents (real-time sync) doesn't merely sum their capabilities — it creates collaborative real-time undo, a capability neither possesses alone. This nonlinearity makes the abductive problem hard: you cannot reason about the effect of adding feature X by considering X in isolation.

**Koopman operator theory** (Koopman 1931) provides the resolution. Instead of tracking feature states directly, we track **observables** — functions that measure properties of the feature state. The Koopman operator K acts on these observables and is **linear**, regardless of how nonlinear the underlying feature dynamics are. The nonlinearity is absorbed into the (infinite-dimensional) observable space.

In this linear space:
1. K has eigenvalues and eigenmodes that capture fundamental patterns of feature interaction
2. Any target outcome Y can be decomposed into these eigenmodes
3. The dominant modes identify which feature interaction patterns drive toward Y
4. The features absent from Z that activate these modes constitute the abductive answer X

## 2.3 Why Not Just LLMs?

An LLM prompted with "what feature should we build next to achieve Y?" performs implicit abduction. But it samples from a learned distribution with inherent local optima. Concepts in low-probability regions — separated from all training modes by probability valleys — are unreachable regardless of prompting strategy. The LLM's null space contains genuinely novel feature combinations that map to zero probability because no training example instantiated them.

Our prior work (§4.1, QAOA experiment) demonstrated this concretely: a greedy heuristic simulating LLM-style sequential concept generation covered only 17 of 256 possible feature combinations (6.6%), while QAOA discovered 6 novel high-scoring combinations absent from 10,000 greedy samples. The quantum approach operates on **type structure**, not learned weights, reaching concepts the LLM cannot.

The Koopman-QDMD algorithm extends this from forward exploration (find novel combinations) to **directed abduction** (find the combination that reaches a specific target).

## 2.4 Contributions

1. **Koopman operators for feature discovery** — first application of Koopman spectral theory to software feature space exploration and design theory
2. **QDMD for abductive reasoning** — Quantum Phase Estimation to extract Koopman eigenmodes on quantum hardware, applied to backward inference from desired outcomes to causal features
3. **C-K-R theory grounded in spectral dynamics** — formal identification of C-K theory's expansion operator with Koopman spectral projection
4. **Hardware validation** — first Koopman QPE run on IBM Kingston (Heron R2), demonstrating eigenvalue extraction survives NISQ noise (H5: mean ε = 0.091)
5. **Cross-validation with QAOA** — the Koopman abductive results are consistent with prior QAOA forward-discovery results, confirming both methods see the same structure from different angles
