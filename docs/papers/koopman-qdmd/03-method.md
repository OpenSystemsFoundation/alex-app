# 4. Method

## 4.1 Feature Space as a Dynamical System

We model a software codebase as a discrete dynamical system. The **state** at development step t is:

```
z_t ∈ {0,1}^N
```

where N is the number of capability fibers (architectural subsystems). Each development step applies an evolution map F: z_{t+1} = F(z_t). F is nonlinear — adding fiber j changes the interaction structure of all other fibers.

### Observable Lifting

Rather than tracking binary presence, we define **capability score** observables that capture interaction effects:

```
g_i(z) = z_i · (1 + Σ_{j≠i}  z_j · NOVELTY[i,j] − 5 · Σ_{j≠i}  z_j · CONFLICT[i,j])
```

where NOVELTY[i,j] measures how unprecedented combining fibers i and j is (derived from codebase analysis), and CONFLICT[i,j] encodes type-theoretic incompatibilities. This gives continuous-valued observables that capture nonlinear interaction effects while remaining computable from binary feature states.

### Multiple Trajectories

A single development history (one sequence of fiber additions) provides limited data for DMD. We augment with **counterfactual trajectories** — plausible alternative build orders:

| Trajectory | Order | Rationale |
|------------|-------|-----------|
| Actual | Apex→LWC→Redux→Lex→PE→Echo→MPS→QAOA | Historical build order |
| UI-first | LWC→Redux→Apex→PE→Echo→Lex→MPS→QAOA | Frontend-driven development |
| Data-first | Apex→Redux→LWC→Lex→MPS→PE→Echo→QAOA | Backend/data-driven development |
| State-first | Redux→LWC→Apex→Lex→PE→Echo→QAOA→MPS | State management priority |
| Realtime-first | Apex→LWC→PE→Echo→Redux→Lex→MPS→QAOA | Collaboration-driven development |
| Quantum-early | LWC→Apex→MPS→Redux→QAOA→Lex→PE→Echo | Experimental/research-driven |

This yields 6 trajectories × 8 steps = 48 transition pairs, sufficient for rank-8 DMD.

The Koopman operator should be **trajectory-invariant** — it captures the dynamics of observables, not the particular path through state space. Using multiple trajectories tests this invariance and provides better-conditioned snapshot matrices.

## 4.2 DMD Computation

Given snapshot matrices X (observables before transitions) and Y (observables after), we compute the projected DMD:

1. SVD of X: X = UΣV*
2. Truncate to rank r (threshold: σ_i / σ_1 > 10⁻¹⁰)
3. Projected Koopman: Ã = U*YVΣ⁻¹
4. Eigendecomposition: ÃW = WΛ
5. Full modes: Φ = YVΣ⁻¹W

This gives eigenvalues Λ = diag(λ_1, ..., λ_r) and mode matrix Φ.

## 4.3 Unitary Embedding for QPE

The Koopman matrix A is real but not necessarily unitary. We embed it as:

```
A_H = (A + A^T) / 2           (Hermitian part)
U_K = exp(i · A_H · scale)     (unitary)
```

where `scale = π / (λ_max − λ_min)` ensures eigenphases span approximately half the unit circle, avoiding aliasing while maintaining separation.

QPE on U_K extracts phases θ_i such that e^{2πiθ_i} are eigenvalues of U_K. The Koopman eigenvalues are recovered via:

```
λ_i = 2π · θ_i / scale
```

## 4.4 QPE Circuit Architecture

```
6 ancilla qubits ──[H]──[ctrl-U_K^{2^k}]──[QFT†]──[measure]
3 system qubits  ──[H]──[U_K targets]──────────────[measure]
```

- **Ancilla register** (6 qubits): QPE precision bits. 6-bit resolution gives 2π/64 ≈ 0.098 rad, resolving eigenvalues to ±0.05.
- **System register** (3 qubits): 2³ = 8-dimensional Hilbert space, one basis state per fiber. Initialized in equal superposition to probe all eigenmodes simultaneously.
- **Controlled-U_K^{2^k}**: 6 controlled unitaries with powers 1, 2, 4, 8, 16, 32.
- **Inverse QFT**: standard on ancilla register.
- **Total**: 9 qubits, depth 9 (pre-transpilation).

## 4.5 Abductive Query

Given target outcome Y and current state Z:

1. Compute capability scores: g_target = g(Y), g_current = g(Z)
2. Delta vector: δ = g_target − g_current
3. Project onto Koopman eigenmodes: δ = Σ_i c_i φ_i (least-squares)
4. Compute **drive strength** per mode: d_i = |c_i| · |λ_i|
5. Aggregate fiber importance: score_f = Σ_i |φ_i[f]| · d_i
6. Zero out fibers already in Z
7. Rank remaining fibers by aggregated drive score

The result is a ranked list of missing features, ordered by how strongly they participate in the Koopman modes that drive the system toward Y.

## 4.6 Hardware Target: IBM Kingston

| Property | Value |
|----------|-------|
| Processor | Heron R2 |
| Qubits | 156 |
| 2-qubit gate | ECR (echoed cross-resonance) |
| ECR fidelity | ~99.5% median |
| 1-qubit fidelity | ~99.95% |
| Readout fidelity | ~99% |
| Native gate set | {ECR, ID, RZ, SX, X} |
| Topology | Heavy-hex lattice |

Transpilation at `optimization_level=3` decomposes the abstract QPE circuit into native gates. The 9-qubit circuit uses 16 of 156 available qubits, with the remaining 140 available for dynamical decoupling and future scaling.
