# Koopman Operator Theory + QDMD for Abductive Feature Discovery

**Date**: 2026-03-23
**Status**: Theoretical foundation + first experiment design
**Depends on**: [QAOA experiment results](2026-03-23-ck-theory-experiment-results.md), [HoTT agent design §7.9](2026-03-23-homotopy-type-theory-agent-design.md)

## The Problem

The QAOA experiment solved **forward exploration**: given fibers Z, find novel combinations. But the real design question is **abductive**:

```
Given:   Z = current feature set (what we have)
Given:   Y = desired outcome (what we want)
Find:    X = the feature(s) that transition Z → Y
```

The [open question from the QAOA results](2026-03-23-ck-theory-experiment-results.md#open-question-abductive-reasoning) proposed three approaches: causal DAGs, graph metrics, LLM scoring. All three share a flaw — they encode feature interactions as **pairwise** relationships, but feature emergence is fundamentally **nonlinear**. Redux + PlatformEvents doesn't just sum their capabilities; it creates collaborative real-time undo, a capability neither has alone.

We need a framework that:
1. Handles nonlinear feature interactions
2. Lifts them into a space where abduction becomes tractable
3. Scales to exponentially large combination spaces

Koopman Operator Theory provides exactly this.

## Part 1: Koopman Operators — Linearizing the Nonlinear

### The Dynamical System

Treat Alex's codebase as a discrete dynamical system. The **state** at development step t is:

```
Z_t ∈ {0,1}^N    (which fibers are active)
```

Each development step applies an evolution map F:

```
Z_{t+1} = F(Z_t)    (adding/modifying features)
```

F is nonlinear. Adding fiber j to state Z_t doesn't just flip bit j — it changes the interaction structure of all other fibers. The system has emergent properties.

### The Koopman Lift

Instead of tracking the state Z directly, track **observables** — functions g: {0,1}^N → ℝ that measure properties of the feature state:

```
g₁(Z) = "test coverage"
g₂(Z) = "performance score"
g₃(Z) = "feature interaction count"
g₄(Z) = "novelty score relative to K-space"
...
```

The **Koopman operator** K acts on observables:

```
(K g)(Z) = g(F(Z))
```

K tells you: "if I measure observable g after one evolution step, what do I get?"

**The key theorem**: K is a **linear operator** even when F is nonlinear. The nonlinearity of feature interactions is absorbed into the infinite-dimensional observable space. In Koopman space, dynamics are governed by:

```
g_{t+1} = K g_t     (linear!)
```

This is not an approximation. It is exact. The trade-off: K is infinite-dimensional (it acts on the space of all possible observables). But we can approximate it.

### Spectral Decomposition

Since K is linear, it has eigenvalues λᵢ and eigenfunctions φᵢ:

```
K φᵢ = λᵢ φᵢ
```

Any observable g can be decomposed:

```
g(Z_t) = Σᵢ cᵢ λᵢᵗ φᵢ(Z₀)
```

Each eigenmode φᵢ captures a **fundamental pattern of feature interaction**:
- |λᵢ| > 1: growing mode (feature combination that amplifies over time)
- |λᵢ| < 1: decaying mode (transient interaction pattern)
- |λᵢ| = 1: persistent mode (stable architectural pattern)
- arg(λᵢ): oscillation frequency (cyclic interaction pattern)

The eigenmodes ARE the intrinsic structure of how features compose.

## Part 2: DMD — Approximating Koopman from Data

### Classical Dynamic Mode Decomposition

Given snapshot pairs (Z_t, Z_{t+1}) from development history:

```
X = [g(Z₀) | g(Z₁) | ... | g(Z_{T-1})]     (observables at each step)
Y = [g(Z₁) | g(Z₂) | ... | g(Z_T)]          (observables one step later)
```

DMD finds the best-fit linear operator A such that Y ≈ AX:

```
A = Y X⁺    (pseudoinverse)
```

The eigenvalues of A approximate the Koopman eigenvalues. The eigenvectors approximate the Koopman modes projected onto our finite observable set.

### Extended DMD (EDMD)

To capture nonlinear interactions, we lift the observables using a **dictionary of functions** ψ:

```
ψ(Z) = [ψ₁(Z), ψ₂(Z), ..., ψ_M(Z)]

where:
  ψᵢ(Z) = zᵢ                    (individual fiber indicators)
  ψᵢⱼ(Z) = zᵢ · zⱼ              (pairwise interactions)
  ψᵢⱼₖ(Z) = zᵢ · zⱼ · zₖ        (three-way interactions)
  ...
```

For N=8 fibers, the full dictionary up to order 3 has:
- 8 linear terms
- 28 quadratic terms
- 56 cubic terms
- = 92 observables

The full dictionary (all orders) has 2^8 - 1 = 255 terms — one for every non-empty fiber combination. This is the **tensor product structure** from §7.9 of the HoTT document.

### The Scaling Problem

For realistic N (dozens to hundreds of fibers), the full observable dictionary has 2^N terms. Classical EDMD requires:
- Constructing 2^N × 2^N matrices
- Computing SVD of these matrices
- Time complexity: O(2^{3N})

This is where quantum computing enters.

## Part 3: QDMD — Quantum Dynamic Mode Decomposition

### Why Quantum

The observable dictionary ψ(Z) for N fibers lives in a 2^N-dimensional space. But a quantum state on N qubits IS a vector in 2^N-dimensional Hilbert space. The exponential space that kills classical DMD is the **native representation** of quantum states.

### The QDMD Algorithm

**Step 1: Encode snapshots as quantum states**

Each feature state Z_t = (z₁, ..., z_N) ∈ {0,1}^N maps directly to a computational basis state:

```
|Z_t⟩ = |z₁ z₂ ... z_N⟩
```

The lifted observable vector ψ(Z_t) corresponds to applying Hadamard-type transforms that create superpositions encoding all interaction terms simultaneously.

**Step 2: Construct the Koopman operator as a unitary**

The Koopman matrix A from DMD can be embedded as a unitary U_K via:

```
U_K = exp(i A_H)    where A_H is a Hermitian embedding of A
```

For the experiment, we use a variational ansatz: parameterize U_K(θ) as a hardware-efficient circuit and train θ to reproduce the snapshot dynamics.

**Step 3: Quantum Phase Estimation (QPE)**

Apply QPE to U_K to extract eigenvalues:

```
QPE(U_K) |φᵢ⟩ |0...0⟩ → |φᵢ⟩ |λ̃ᵢ⟩
```

The ancilla register encodes the eigenvalue (Koopman spectral data). The system register holds the eigenmode (feature interaction pattern).

**Step 4: Abductive query**

Given target outcome Y, prepare |Y⟩ and project onto the eigenmode basis:

```
⟨φᵢ|Y⟩ = cᵢ    (overlap with each mode)
```

The modes with largest |cᵢ| identify which feature interaction patterns drive toward Y. The abductive answer X is the feature(s) that activate those dominant modes but are absent from Z.

### Quantum Advantage

| Operation | Classical | Quantum |
|-----------|-----------|---------|
| Observable dictionary | O(2^N) explicit terms | N qubits (implicit) |
| Koopman matrix | O(2^N × 2^N) storage | O(N²) gate parameters |
| Eigendecomposition | O(2^{3N}) SVD | O(N³) QPE |
| Abductive projection | O(2^N) inner products | O(N) measurements |

The quantum speedup is **exponential in N** for the eigendecomposition step. For N=8 (current experiment), the classical approach is tractable — this is intentional. The first experiment validates the algorithm on a scale where we can verify against classical results. The advantage appears at N ≥ 20, where classical EDMD with full dictionary is infeasible but QDMD on ~20 qubits + ancilla is routine.

## Part 4: The C-K-R Connection

### R → K: Observation

The development history (git log) is the **Reality space**. Each commit is an observation of the system in a particular feature state. DMD snapshots are the R→K operator — converting real observations into knowledge about the dynamical structure.

### K: The Koopman Operator

The Koopman operator IS the K-space. It encodes everything we know about how features interact and evolve. Its eigenmodes are the **fundamental laws** of the feature space — not pairwise rules, but the intrinsic linear structure underlying nonlinear feature composition.

### K → C: Abductive Projection

The abductive step (project Y onto eigenmodes, identify missing features) is the K→C conjunction. It proposes concepts (feature additions) that are:
- **Consistent** with the Koopman dynamics (they activate real eigenmodes)
- **Not derivable** from current Z (they require new features)
- **Directed** toward Y (they maximize overlap with the target)

This is precisely Cohen forcing: extending the model (current feature set) with a generic element (new feature) that is consistent but not derivable.

### C → R: Measurement

Building the feature and observing whether it achieves Y collapses the concept into reality. This updates the snapshot data, refines the Koopman operator, and the cycle continues.

```
R ──observe──→ K ──Koopman──→ K (eigenmodes) ──abduce──→ C (proposed features)
↑                                                            │
└────────────────── build & measure ─────────────────────────┘
```

## Part 5: What Makes This Novel

1. **Koopman operators for feature/concept discovery**: Koopman theory has been applied to fluid dynamics, power grids, robotics, epidemiology — never to software feature space exploration or design theory.

2. **QDMD for abductive reasoning**: QDMD (Giannakis 2019, Lloyd et al. 2020) computes Koopman eigenmodes on quantum hardware. Using it for abduction (backward inference from desired outcome to causal features) is new.

3. **C-K theory grounded in spectral dynamics**: C-K theory's "expansion operator" has been an abstract concept. Identifying it with the Koopman spectral projection gives it a concrete, computable form with mathematical guarantees (linearity, spectral convergence).

4. **Nonlinear feature interactions as linear Koopman dynamics**: The QUBO formulation in the QAOA experiment encoded interactions as quadratic penalties — a lossy compression. Koopman lifts ALL interaction orders into a linear space without approximation.

5. **Development history as training data**: The git log provides natural snapshot pairs for DMD. No synthetic data generation needed — the algorithm learns from how the codebase actually evolved.

## Part 6: First Experiment — IBM Kingston

### Hardware Target

**IBM Kingston**: 156-qubit Heron R2 processor.

Heron R2 delivers significantly improved gate fidelities over prior generations:
- **2-qubit ECR gate fidelity**: ~99.5% (median)
- **1-qubit gate fidelity**: ~99.95%
- **Readout fidelity**: ~99%
- **Native gate set**: {ECR, ID, RZ, SX, X}
- **Coupling map**: heavy-hex lattice, 156 qubits

**Qubit budget** (156 available):
- 8 system qubits (one per fiber)
- 6 ancilla qubits (QPE precision: 2π/64 ≈ 0.098 rad — 4× better than Falcon)
- 2 ancilla qubits (Hadamard test for eigenmode overlaps)
- = 16 qubits active
- 140 surplus — enables **dynamical decoupling** on idle qubits, qubit selection for best-fidelity subgraph, and future scaling to N=16+ fibers without hardware change

### Experiment Structure

**Phase A: Classical Koopman baseline (validate on classical DMD)**

1. Extract feature evolution snapshots from Alex's git history
2. Define observable dictionary (up to 3rd order interactions, M=92)
3. Compute EDMD Koopman matrix A (92×92)
4. Extract eigenvalues and modes classically (numpy SVD)
5. Perform abductive query: given target Y = "real-time collaborative reordering", identify missing features

**Phase B: Quantum eigenvalue extraction (IBM Kingston)**

1. Embed the dominant 8×8 Koopman submatrix as a unitary U_K
2. Run QPE on IBM Kingston to extract eigenvalues
3. Compare quantum eigenvalues to classical ground truth
4. Quantify: fidelity, circuit depth, shot noise, error rates

**Phase C: Variational Quantum Koopman (VQK)**

1. Parameterize U_K(θ) as a hardware-efficient ansatz on 8 qubits
2. Train θ to minimize snapshot prediction error (hybrid quantum-classical loop)
3. Extract eigenmodes from trained circuit via QPE
4. Run abductive query entirely on quantum hardware
5. Compare abductive results (proposed features) to classical baseline

### Hypotheses

**H4 (Koopman Validity)**: The Koopman eigenspectrum extracted from Alex's development history contains at least 3 modes with |λᵢ| ≥ 0.5, indicating structured (non-random) feature evolution dynamics.

*Falsified if*: All eigenvalues are near-zero or uniformly distributed (the evolution has no learnable structure).

**H5 (Quantum Fidelity)**: QPE on IBM Kingston (Heron R2) extracts eigenvalues within ε < 0.10 of the classical DMD eigenvalues for the top-4 dominant modes. The tighter bound reflects Heron R2's ~99.5% ECR fidelity and 6-bit QPE resolution (π/32 ≈ 0.098 rad).

*Falsified if*: Quantum eigenvalue errors exceed ε ≥ 0.10 for majority of dominant modes (hardware noise destroys the signal).

**H6 (Abductive Discovery)**: The Koopman abductive query identifies at least one feature combination X that:
- (a) Is absent from the current codebase (X ∉ Z)
- (b) Has high eigenmode overlap with target Y (|⟨φ_dominant|Y⟩| > 0.3)
- (c) Was also found by the QAOA forward search (cross-validation)

*Falsified if*: The abductive results are empty, random, or contradict the QAOA forward search.

### Circuit Architecture

```
         ┌───┐                                           ┌──────┐
a₅: ─────┤ H ├────●─────────────────────────────────────┤ QFT† ├── measure → λ₅
         ├───┤     │                                     ├──────┤
a₄: ─────┤ H ├────┼────●────────────────────────────────┤      ├── measure → λ₄
         ├───┤     │    │                                ├──────┤
a₃: ─────┤ H ├────┼────┼────●───────────────────────────┤      ├── measure → λ₃
         ├───┤     │    │    │                           ├──────┤
a₂: ─────┤ H ├────┼────┼────┼────●──────────────────────┤      ├── measure → λ₂
         ├───┤     │    │    │    │                      ├──────┤
a₁: ─────┤ H ├────┼────┼────┼────┼────●─────────────────┤      ├── measure → λ₁
         ├───┤     │    │    │    │    │                 ├──────┤
a₀: ─────┤ H ├────┼────┼────┼────┼────┼───●─────────────┤      ├── measure → λ₀
         └───┘     │    │    │    │    │   │             └──────┘
              ┌────┴──┐ │    │    │    │   │
q₀..q₇: ─────┤U_K^32 ├─┤    │    │    │   │   ← 8 system qubits
              └───────┘ │    │    │    │   │
                   ┌────┴──┐ │    │    │   │
                   │U_K^16 │ │    │    │   │
                   └───────┘ │    │    │   │
                        ┌────┴─┐  │    │   │
                        │U_K^8 │  │    │   │
                        └──────┘  │    │   │
                            ┌─────┴─┐  │   │
                            │ U_K^4 │  │   │
                            └───────┘  │   │
                               ┌───────┴─┐ │
                               │  U_K^2  │ │
                               └─────────┘ │
                                  ┌────────┴┐
                                  │  U_K^1  │
                                  └─────────┘

    6 ancilla qubits (QPE)    8 system qubits (fibers)    = 14 active qubits
    eigenvalue precision:     fiber interaction modes      + 2 Hadamard test = 16 total
    2π/64 ≈ 0.098 rad
```

QPE extracts eigenphases of U_K = exp(2πi A_norm) where A_norm is the normalized Koopman matrix. Each eigenphase encodes a Koopman eigenvalue. Measurement of the system register after post-selection on an ancilla outcome gives the corresponding eigenmode. The 6-bit precision on Heron R2 resolves eigenvalues to ±0.05 — sufficient to distinguish the 4-6 dominant Koopman modes expected from 7 development snapshots.

### Transpilation Strategy for Heron R2

Kingston's native gate set: **{ECR, ID, RZ, SX, X}**. The ECR (echoed cross-resonance) gate replaces CX as the native 2-qubit entangler — Qiskit's transpiler handles this automatically at `optimization_level=3`.

The U_K controlled-unitary decomposes into:

1. **Cosine-Sine decomposition** of U_K into 2-qubit blocks
2. Each 2-qubit block → at most 3 ECR gates (Vatan & Williams 2004, adapted for ECR)
3. Controlled versions via ancilla ECR + single-qubit rotations
4. Estimated total: ~200-400 ECR gates for 6-bit QPE with 8-qubit U_K

At Heron R2's median ECR error rate (~0.5%), this gives **~1-2 expected errors** per circuit — a 2× improvement over Falcon. With 6-bit QPE (vs. 4-bit on Falcon), we get 4× better eigenvalue resolution while maintaining comparable total error budget.

**Mitigations**:
- **Twirled readout error mitigation** (M3, built into Qiskit Runtime)
- **Zero-noise extrapolation** (ZNE) via gate folding
- **Dynamical decoupling** (DD) on idle qubits — critical for QPE's long idle periods
- **Qubit selection**: choose the 16-qubit subgraph of Kingston's 156-qubit heavy-hex with best calibration data (automated via `qiskit_ibm_runtime` backend properties)
- **Post-selection** on ancilla parity checks

### Snapshot Data: Git History Encoding

Each snapshot Z_t corresponds to a commit where a fiber was added or significantly modified:

```python
SNAPSHOTS = [
    # Z_0: Initial state — bare LWC + Apex
    [0, 0, 0, 1, 1, 0, 0, 0],  # ApexServices + LWC

    # Z_1: Added Redux state management
    [1, 0, 0, 1, 1, 0, 0, 0],  # + Redux

    # Z_2: Added LexoRank ordering
    [1, 0, 1, 1, 1, 0, 0, 0],  # + LexoRank

    # Z_3: Added Platform Events for real-time sync
    [1, 1, 1, 1, 1, 0, 0, 0],  # + PlatformEvents

    # Z_4: Added Echo Prevention (idempotency for PE)
    [1, 1, 1, 1, 1, 0, 0, 1],  # + EchoPrevention

    # Z_5: Added MPS Tensor (dependency analysis)
    [1, 1, 1, 1, 1, 1, 0, 1],  # + MPSTensor

    # Z_6: Added QAOA (quantum optimization)
    [1, 1, 1, 1, 1, 1, 1, 1],  # + QAOA
]
```

With M=92 observables (up to 3rd order) and T=6 transition pairs, the snapshot matrices are:
- X: 92 × 6 (observables before each transition)
- Y: 92 × 6 (observables after each transition)

This is an underdetermined system (more observables than snapshots), which is standard for EDMD — regularization via truncated SVD selects the dominant Koopman modes.

### Expected Outcomes

If the theory holds:

1. **Dominant Koopman modes** will correspond to recognizable architectural patterns:
   - A "core platform" mode (Redux + Apex + LWC co-evolve)
   - A "real-time" mode (PlatformEvents + EchoPrevention activate together)
   - A "quantum-tensor" mode (MPSTensor + QAOA couple)
   - A "ordering" mode (LexoRank interacts with state management)

2. **Abductive query** for Y = "real-time collaborative reordering" should identify X = {LexoRank + PlatformEvents + EchoPrevention} as the required fiber combination, since the Koopman modes linking "real-time" and "ordering" patterns intersect at these fibers.

3. **Cross-validation with QAOA**: The abductive result should overlap with QAOA's forward-discovered novel concepts. If QAOA found `Redux + LexoRank + QAOA + EchoPrevention` as novel, and the Koopman abduction identifies a similar region, this confirms both methods are seeing the same structure from different angles.

## References

- Koopman, B.O. — "Hamiltonian Systems and Transformation in Hilbert Space" (1931)
- Mezić, I. — "Spectral Properties of Dynamical Systems, Model Reduction and Decompositions" (2005)
- Williams, M.O., Kevrekidis, I.G., Rowley, C.W. — "A Data-Driven Approximation of the Koopman Operator: Extending Dynamic Mode Decomposition" (EDMD, 2015)
- Giannakis, D. — "Data-driven spectral decomposition and forecasting of ergodic dynamical systems" (2019) — quantum-inspired Koopman methods
- Lloyd, S., Mohseni, M., Rebentrost, P. — "Quantum principal component analysis" (2014) — quantum speedup for spectral methods
- Lusch, B., Kutz, J.N., Brunton, S.L. — "Deep Learning for Universal Linear Embeddings of Nonlinear Dynamics" (2018) — neural network Koopman approximation
- Zhou, L. et al. — "Quantum Approximate Optimization Algorithm: Performance, Mechanism, and Implementation on Near-Term Devices" (2020) — FOURIER initialization
- Vatan, F. & Williams, C. — "Optimal Quantum Circuits for General Two-Qubit Gates" (2004) — CX decomposition bound
- Hatchuel, A. & Weil, B. — "A New Approach of Innovative Design: An Introduction to C-K Theory" (2003)
- Cohen, P. — "The Independence of the Continuum Hypothesis" (1963)
