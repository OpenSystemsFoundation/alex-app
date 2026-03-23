# 3. Background

## 3.1 Koopman Operator Theory

Bernard Koopman (1931) introduced an operator-theoretic framework for Hamiltonian dynamics that has since been generalized to arbitrary nonlinear dynamical systems (Mezić 2005). Given a discrete dynamical system with state space S and evolution map F: S → S, the **Koopman operator** K acts on observables g: S → ℝ:

```
(K g)(z) = g(F(z))
```

K is **linear** even when F is nonlinear. This linearity means K admits a spectral decomposition:

```
K φ_i = λ_i φ_i
```

where φ_i are eigenfunctions and λ_i are eigenvalues. Any observable g can be expanded:

```
g(z_t) = Σ_i  c_i  λ_i^t  φ_i(z_0)
```

The eigenvalues encode the dynamics: |λ_i| > 1 indicates growth, |λ_i| < 1 indicates decay, |λ_i| = 1 indicates persistence, and arg(λ_i) encodes oscillation frequency.

**Trade-off**: K is infinite-dimensional (it acts on the space of all observables). Practical methods approximate it in finite dimensions.

## 3.2 Dynamic Mode Decomposition (DMD)

DMD (Schmid 2010) approximates the Koopman operator from data. Given snapshot pairs (z_t, z_{t+1}), define matrices:

```
X = [g(z_0) | g(z_1) | ... | g(z_{T-1})]
Y = [g(z_1) | g(z_2) | ... | g(z_T)]
```

DMD finds the best-fit linear operator A such that Y ≈ AX via the pseudoinverse:

```
A = Y X⁺
```

The eigenvalues of A approximate the Koopman eigenvalues. **Extended DMD** (Williams et al. 2015) improves the approximation by lifting observables through a dictionary of nonlinear functions ψ(z) = [ψ_1(z), ψ_2(z), ..., ψ_M(z)], capturing higher-order interactions.

For N binary features, the full dictionary up to order k has O(N^k) terms. The complete dictionary (all orders) has 2^N − 1 terms — one per non-empty feature combination.

## 3.3 Quantum Phase Estimation (QPE)

QPE (Kitaev 1995) extracts eigenvalues of a unitary operator U. Given an eigenstate |φ⟩ with U|φ⟩ = e^{2πiθ}|φ⟩, QPE maps:

```
|0⟩^⊗n |φ⟩  →  |θ̃⟩ |φ⟩
```

where θ̃ is an n-bit approximation of θ. The algorithm uses controlled-U^{2^k} operations and an inverse QFT on the ancilla register.

For our application: embed the Koopman matrix A as a unitary U_K = exp(iA_H · scale) where A_H is the Hermitian part of A. QPE then extracts Koopman eigenvalues encoded as phases.

**Quantum advantage**: Classical eigendecomposition of an M×M matrix costs O(M³). For the full observable dictionary, M = 2^N, giving O(2^{3N}) classical cost. QPE on N qubits costs O(N³ · polylog) — exponentially faster.

## 3.4 C-K-R Design Theory

**C-K Theory** (Hatchuel & Weil 2003) models design as a dual expansion between:
- **C-space** (Concepts): propositions whose truth status is undecidable from current knowledge
- **K-space** (Knowledge): validated propositions with definite truth values

Design proceeds through four operators: C→C (concept refinement), C→K (validation), K→C (inspiration), K→K (knowledge deduction).

**C-K-R extension** (Kroon 2017) adds:
- **R-space** (Reality): observations, measurements, experimental data

The cybernetic loop R→K→C→R drives innovation: observe reality, update knowledge, generate concepts, test in reality.

## 3.5 Cohen Forcing

Paul Cohen (1963) proved the independence of the Continuum Hypothesis using **forcing** — a technique that extends a model M to M[G] by adding a generic element G that is consistent with M but not derivable from M. The Flypitch project (Han & van Doorn 2019) formally verified this in Lean.

Forcing is the mathematical structure underlying C-K theory's expansion operator: extending the knowledge base with a genuinely new concept that is consistent but not derivable. We identify this with the Koopman abductive step: the proposed feature X is "forced" into the current system Z, extending it in a direction consistent with the spectral dynamics but not reachable by deduction from Z alone.
