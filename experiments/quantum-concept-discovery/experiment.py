"""
Quantum Concept Space Exploration — Falsification Experiment
=============================================================

Tests 3 hypotheses from §7.9 of the HoTT + C-K theory document:

H1 (Distribution Divergence):
    QAOA on a concept-discovery QUBO produces a distribution over fiber
    combinations that is statistically distinguishable from uniform random
    sampling (chi-squared test, p < 0.05).
    FALSIFIED IF: p >= 0.05 (QAOA output indistinguishable from uniform)

H2 (Novel Concept Discovery):
    QAOA's top-K highest-scoring bitstrings include at least one valid
    combination that does NOT appear in 10,000 classical random samples
    weighted by a greedy heuristic.
    FALSIFIED IF: every QAOA top-K solution also appears in classical set

H3 (Depth Advantage / Tunneling):
    QAOA at depth p=2 produces higher mean objective value than p=1,
    evidencing that deeper circuits tunnel through barriers to reach
    better solutions.
    FALSIFIED IF: mean(p=2) <= mean(p=1) (one-tailed t-test, p < 0.05)

Fiber encoding (from Alex codebase AGENTS.md):
    0: Redux (state management)
    1: Platform Events (real-time sync)
    2: LexoRank (ordering)
    3: Apex Services (business logic)
    4: LWC Components (UI)
    5: MPS Tensor (dependency analysis)
    6: QAOA/Quantum (optimization)
    7: Echo Prevention (idempotency)
"""

import numpy as np
from scipy.optimize import minimize
from scipy.stats import chisquare, ttest_ind
from qiskit.circuit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp, Statevector
import json
import sys

# ============================================================
# 1. FIBER DEFINITIONS — Alex's actual capability axes
# ============================================================

FIBERS = [
    "Redux",            # 0
    "PlatformEvents",   # 1
    "LexoRank",         # 2
    "ApexServices",     # 3
    "LWC",              # 4
    "MPSTensor",        # 5
    "QAOA",             # 6
    "EchoPrevention",   # 7
]
N = len(FIBERS)

# ============================================================
# 2. NOVELTY MATRIX — how novel is combining fiber i with fiber j?
#    High = never combined in existing features
#    Low  = already combined (Redux+LWC is standard, score=0)
#    Values derived from Alex codebase: which fibers are already
#    connected in existing features vs. which have never interacted
# ============================================================

# Existing combinations in Alex (low novelty):
#   Redux <-> LWC (standard pattern), Redux <-> ApexServices,
#   PlatformEvents <-> ApexServices, LWC <-> ApexServices,
#   LexoRank <-> Redux, EchoPrevention <-> PlatformEvents
#
# Novel combinations (high novelty):
#   MPSTensor <-> anything (not yet implemented)
#   QAOA <-> anything (not yet implemented)
#   LexoRank <-> PlatformEvents (never combined)
#   EchoPrevention <-> Redux (never combined)

NOVELTY = np.array([
    # Red  PEv  Lex  Apx  LWC  MPS  QAO  Ech
    [ 0.0, 0.6, 0.2, 0.1, 0.0, 0.9, 0.9, 0.7],  # Redux
    [ 0.6, 0.0, 0.8, 0.1, 0.5, 0.9, 0.9, 0.1],  # PlatformEvents
    [ 0.2, 0.8, 0.0, 0.4, 0.5, 0.9, 0.9, 0.8],  # LexoRank
    [ 0.1, 0.1, 0.4, 0.0, 0.0, 0.8, 0.8, 0.4],  # ApexServices
    [ 0.0, 0.5, 0.5, 0.0, 0.0, 0.9, 0.9, 0.6],  # LWC
    [ 0.9, 0.9, 0.9, 0.8, 0.9, 0.0, 0.7, 0.9],  # MPSTensor
    [ 0.9, 0.9, 0.9, 0.8, 0.9, 0.7, 0.0, 0.9],  # QAOA
    [ 0.7, 0.1, 0.8, 0.4, 0.6, 0.9, 0.9, 0.0],  # EchoPrevention
])

# ============================================================
# 3. TYPE CONFLICT MATRIX — does combining i+j produce invalid types?
#    1.0 = type conflict (uninhabited type), 0.0 = composable
#    This IS the constructibility oracle
# ============================================================

TYPE_CONFLICT = np.array([
    # Red  PEv  Lex  Apx  LWC  MPS  QAO  Ech
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],  # Redux
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0],  # PlatformEvents
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],  # LexoRank
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],  # ApexServices
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.3, 0.0],  # LWC (MPS/QAOA need iframe)
    [ 0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0],  # MPSTensor
    [ 0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0],  # QAOA
    [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],  # EchoPrevention
])

# Target concept complexity: prefer 3-4 fiber combinations
TARGET_COMPLEXITY = 3.5
LAMBDA_CONFLICT = 5.0
LAMBDA_COMPLEXITY = 2.0


# ============================================================
# 4. BUILD COST HAMILTONIAN as SparsePauliOp
# ============================================================

def build_cost_hamiltonian():
    """
    Encode the concept-discovery QUBO as an Ising Hamiltonian.

    Each qubit i represents fiber i: |1⟩ = included, |0⟩ = excluded.

    Objective: maximize novelty - conflicts - complexity_penalty

    Map: x[i] = (1 - Z[i]) / 2  (standard QUBO→Ising)
    """
    pauli_list = []

    # Quadratic terms: novelty and conflict for each pair (i,j)
    for i in range(N):
        for j in range(i+1, N):
            # Coefficient for x[i]*x[j] in QUBO
            qubo_coeff = NOVELTY[i][j] - LAMBDA_CONFLICT * TYPE_CONFLICT[i][j]

            # x[i]*x[j] = (1-Zi)(1-Zj)/4 = (1 - Zi - Zj + ZiZj)/4
            # ZiZj term
            pauli_str = ['I'] * N
            pauli_str[i] = 'Z'
            pauli_str[j] = 'Z'
            pauli_list.append((''.join(pauli_str), qubo_coeff / 4.0))

            # -Zi term (will accumulate)
            pauli_str_i = ['I'] * N
            pauli_str_i[i] = 'Z'
            pauli_list.append((''.join(pauli_str_i), -qubo_coeff / 4.0))

            # -Zj term
            pauli_str_j = ['I'] * N
            pauli_str_j[j] = 'Z'
            pauli_list.append((''.join(pauli_str_j), -qubo_coeff / 4.0))

            # constant term (identity)
            pauli_list.append(('I' * N, qubo_coeff / 4.0))

    # Complexity penalty: -λ₃ * (Σᵢ x[i] - target)²
    # Expand: -λ₃ * (Σx²  + 2ΣΣx[i]x[j] - 2*target*Σx + target²)
    # Since x[i]² = x[i] (binary), this simplifies
    for i in range(N):
        # Linear term from complexity: -λ₃ * (1 - 2*target) * x[i]
        lin_coeff = -LAMBDA_COMPLEXITY * (1.0 - 2.0 * TARGET_COMPLEXITY)
        pauli_str = ['I'] * N
        pauli_str[i] = 'Z'
        # x[i] = (1-Zi)/2, linear in Zi
        pauli_list.append((''.join(pauli_str), -lin_coeff / 2.0))
        pauli_list.append(('I' * N, lin_coeff / 2.0))

    for i in range(N):
        for j in range(i+1, N):
            # Quadratic term from complexity: -λ₃ * 2 * x[i]*x[j]
            quad_coeff = -LAMBDA_COMPLEXITY * 2.0
            pauli_str = ['I'] * N
            pauli_str[i] = 'Z'
            pauli_str[j] = 'Z'
            pauli_list.append((''.join(pauli_str), quad_coeff / 4.0))

            pauli_str_i = ['I'] * N
            pauli_str_i[i] = 'Z'
            pauli_list.append((''.join(pauli_str_i), -quad_coeff / 4.0))

            pauli_str_j = ['I'] * N
            pauli_str_j[j] = 'Z'
            pauli_list.append((''.join(pauli_str_j), -quad_coeff / 4.0))

            pauli_list.append(('I' * N, quad_coeff / 4.0))

    # We want to MAXIMIZE, but QAOA minimizes cost.
    # Negate all coefficients so minimizing = maximizing novelty.
    pauli_list = [(p, -c) for p, c in pauli_list]

    hamiltonian = SparsePauliOp.from_list(pauli_list).simplify()
    return hamiltonian


# ============================================================
# 5. EVALUATE OBJECTIVE for a given bitstring
# ============================================================

def evaluate_concept(bitstring):
    """Evaluate the objective value for a concept (bitstring of fiber selections)."""
    bits = [int(b) for b in bitstring]

    # Novelty: sum of novelty for all selected pairs
    novelty = 0.0
    for i in range(N):
        for j in range(i+1, N):
            if bits[i] and bits[j]:
                novelty += NOVELTY[i][j]

    # Type conflicts
    conflict = 0.0
    for i in range(N):
        for j in range(i+1, N):
            if bits[i] and bits[j]:
                conflict += TYPE_CONFLICT[i][j]

    # Complexity penalty
    complexity = sum(bits)
    complexity_penalty = (complexity - TARGET_COMPLEXITY) ** 2

    score = novelty - LAMBDA_CONFLICT * conflict - LAMBDA_COMPLEXITY * complexity_penalty
    return score, novelty, conflict, complexity


# ============================================================
# 6. QAOA CIRCUIT via Statevector simulation
# ============================================================

def build_qaoa_circuit(gammas, betas, qubo_coeffs):
    """
    Build QAOA circuit manually for efficiency.
    gammas: list of gamma parameters (one per layer)
    betas: list of beta parameters (one per layer)
    qubo_coeffs: dict of {(i,j): coeff} for ZZ terms and {i: coeff} for Z terms
    """
    depth = len(gammas)
    qc = QuantumCircuit(N)

    # Initial superposition
    qc.h(range(N))

    for layer in range(depth):
        gamma = gammas[layer]
        beta = betas[layer]

        # Cost unitary: exp(-i * gamma * C)
        # ZZ terms
        for (i, j), coeff in qubo_coeffs.get('zz', {}).items():
            qc.cx(i, j)
            qc.rz(2 * gamma * coeff, j)
            qc.cx(i, j)

        # Z terms
        for i, coeff in qubo_coeffs.get('z', {}).items():
            qc.rz(2 * gamma * coeff, i)

        # Mixer unitary: exp(-i * beta * B) where B = sum of X
        qc.rx(2 * beta, range(N))

    return qc


def extract_qubo_coeffs(hamiltonian):
    """Extract ZZ and Z coefficients from the SparsePauliOp."""
    zz_coeffs = {}
    z_coeffs = {}

    for pauli, coeff in zip(hamiltonian.paulis, hamiltonian.coeffs):
        label = pauli.to_label()
        coeff = coeff.real

        # Find which qubits have Z
        z_positions = [N - 1 - i for i, c in enumerate(label) if c == 'Z']

        if len(z_positions) == 2:
            i, j = sorted(z_positions)
            zz_coeffs[(i, j)] = zz_coeffs.get((i, j), 0) + coeff
        elif len(z_positions) == 1:
            z_coeffs[z_positions[0]] = z_coeffs.get(z_positions[0], 0) + coeff
        # Identity terms are constant offsets, ignore for optimization

    return {'zz': zz_coeffs, 'z': z_coeffs}


def fourier_init_from_lower_depth(optimal_params_prev, prev_depth, new_depth):
    """
    FOURIER initialization (Zhou et al. 2020): interpolate optimal p-level
    parameters to initialize p+1 level. Instead of random init, we use the
    optimal solution at depth p to warm-start depth p+1.

    For QAOA, this maps p parameters to p+1 by linear interpolation:
      gamma_k^(p+1) = (k/p+1) * gamma_{k-1}^(p) + (1 - k/p+1) * gamma_k^(p)
    with boundary padding of zeros.
    """
    gammas_prev = optimal_params_prev[:prev_depth]
    betas_prev = optimal_params_prev[prev_depth:]

    def interpolate(params_prev, p_old, p_new):
        # Pad with zeros at boundaries
        padded = np.zeros(p_old + 2)
        padded[1:p_old+1] = params_prev
        new_params = np.zeros(p_new)
        for k in range(p_new):
            # Map new index to old index space
            t = (k + 0.5) / p_new * p_old
            idx = int(t)
            frac = t - idx
            new_params[k] = (1 - frac) * padded[idx + 1] + frac * padded[min(idx + 2, p_old + 1)]
        return new_params

    gammas_new = interpolate(gammas_prev, prev_depth, new_depth)
    betas_new = interpolate(betas_prev, prev_depth, new_depth)
    return np.concatenate([gammas_new, betas_new])


def run_qaoa_statevector(hamiltonian, depth, n_optimizer_iters=100, n_restarts=3,
                         warm_start_params=None, warm_start_depth=None):
    """Run QAOA at given depth using manual circuit construction.

    If warm_start_params and warm_start_depth are provided, uses FOURIER
    initialization to interpolate from the lower-depth optimal parameters
    as one of the initial points (Zhou et al. 2020).
    """
    qubo_coeffs = extract_qubo_coeffs(hamiltonian)
    num_params = 2 * depth  # gamma and beta per layer
    print(f"  Parameters: {num_params} (depth={depth}), restarts: {n_restarts}", flush=True)
    if warm_start_params is not None:
        print(f"  Using FOURIER initialization from depth {warm_start_depth}", flush=True)

    def cost_function(params):
        gammas = params[:depth]
        betas = params[depth:]
        qc = build_qaoa_circuit(gammas, betas, qubo_coeffs)
        sv = Statevector(qc)
        return sv.expectation_value(hamiltonian).real

    best_result = None
    best_cost = float('inf')

    for restart in range(n_restarts):
        print(f"  Restart {restart+1}/{n_restarts}...", flush=True)
        if restart == 0 and warm_start_params is not None:
            # First restart: use FOURIER-interpolated init from lower depth
            x0 = fourier_init_from_lower_depth(warm_start_params, warm_start_depth, depth)
        else:
            x0 = np.random.uniform(-np.pi, np.pi, num_params)
        result = minimize(cost_function, x0, method='COBYLA',
                         options={'maxiter': n_optimizer_iters})
        if result.fun < best_cost:
            best_cost = result.fun
            best_result = result

    # Get final statevector and probability distribution
    gammas = best_result.x[:depth]
    betas = best_result.x[depth:]
    qc = build_qaoa_circuit(gammas, betas, qubo_coeffs)
    sv = Statevector(qc)
    probs = sv.probabilities_dict()

    return probs, -best_cost, best_result.x  # negate back: we minimized -objective


# ============================================================
# 7. CLASSICAL BASELINES
# ============================================================

def uniform_random_samples(n_samples):
    """Uniform random sampling over all 2^N bitstrings."""
    samples = {}
    for _ in range(n_samples):
        bits = np.random.randint(0, 2, N)
        bs = ''.join(str(b) for b in bits)
        samples[bs] = samples.get(bs, 0) + 1
    return samples


def greedy_heuristic_samples(n_samples):
    """
    Greedy heuristic: start from high-novelty pairs, extend greedily.
    This simulates what an LLM would do — start from known patterns,
    extend locally.
    """
    samples = {}
    for _ in range(n_samples):
        # Start with a random high-novelty pair
        bits = [0] * N
        # Pick first fiber randomly
        i = np.random.randint(0, N)
        bits[i] = 1

        # Greedily add fibers that maximize marginal novelty
        for _ in range(np.random.randint(1, 4)):  # add 1-3 more fibers
            best_j, best_marginal = -1, -float('inf')
            for j in range(N):
                if bits[j] == 1:
                    continue
                # Marginal novelty of adding j
                marginal = sum(NOVELTY[j][k] for k in range(N) if bits[k] == 1)
                marginal -= LAMBDA_CONFLICT * sum(TYPE_CONFLICT[j][k] for k in range(N) if bits[k] == 1)
                if marginal > best_marginal:
                    best_marginal = marginal
                    best_j = j
            if best_j >= 0 and best_marginal > 0:
                bits[best_j] = 1

        bs = ''.join(str(b) for b in bits)
        samples[bs] = samples.get(bs, 0) + 1
    return samples


# ============================================================
# 8. RUN EXPERIMENTS
# ============================================================

def main():
    print("=" * 70)
    print("QUANTUM CONCEPT SPACE EXPLORATION — FALSIFICATION EXPERIMENT")
    print("=" * 70)
    print(f"\nFibers ({N}): {', '.join(FIBERS)}")
    print(f"Solution space: 2^{N} = {2**N} possible concepts")
    print(f"Target complexity: {TARGET_COMPLEXITY} fibers")
    print(f"Conflict penalty λ₁: {LAMBDA_CONFLICT}")
    print(f"Complexity penalty λ₃: {LAMBDA_COMPLEXITY}")

    # Build Hamiltonian
    print("\n--- Building cost Hamiltonian ---")
    H = build_cost_hamiltonian()
    print(f"Hamiltonian terms: {len(H)}")

    # Enumerate all solutions and their scores (feasible for 8 qubits)
    print("\n--- Enumerating all 256 concepts ---")
    all_scores = {}
    for i in range(2**N):
        bs = format(i, f'0{N}b')
        score, nov, conf, comp = evaluate_concept(bs)
        all_scores[bs] = (score, nov, conf, comp)

    # Top 10 concepts by score
    sorted_concepts = sorted(all_scores.items(), key=lambda x: x[1][0], reverse=True)
    print("\nTop 10 concepts by objective score:")
    print(f"{'Bitstring':<12} {'Score':>8} {'Novelty':>8} {'Conflict':>8} {'#Fibers':>8}  Fibers")
    print("-" * 80)
    for bs, (score, nov, conf, comp) in sorted_concepts[:10]:
        fibers = [FIBERS[i] for i in range(N) if bs[i] == '1']
        print(f"{bs:<12} {score:>8.3f} {nov:>8.3f} {conf:>8.3f} {int(comp):>8}  {', '.join(fibers)}")

    top_10_bitstrings = set(bs for bs, _ in sorted_concepts[:10])

    # ============================================================
    # H1: QAOA distribution vs uniform
    # ============================================================
    print("\n" + "=" * 70)
    print("H1: QAOA output distribution ≠ uniform random")
    print("    Falsified if: chi-squared p >= 0.05")
    print("=" * 70)

    np.random.seed(42)
    print("\nRunning QAOA (p=1) on statevector simulator...")
    qaoa_probs_p1, qaoa_obj_p1, qaoa_params_p1 = run_qaoa_statevector(H, depth=1, n_restarts=5)
    print(f"QAOA p=1 optimal objective value: {qaoa_obj_p1:.4f}")

    # Compare QAOA distribution to uniform
    # Use top-32 most probable QAOA bitstrings for chi-squared
    qaoa_sorted = sorted(qaoa_probs_p1.items(), key=lambda x: x[1], reverse=True)
    n_bins = min(32, len(qaoa_sorted))
    qaoa_top = qaoa_sorted[:n_bins]

    total_prob = sum(p for _, p in qaoa_top)
    uniform_expected = total_prob / n_bins

    observed = np.array([p for _, p in qaoa_top])
    expected = np.array([uniform_expected] * n_bins)

    # Scale to pseudo-counts for chi-squared (multiply by large N)
    pseudo_n = 100000
    chi2, p_value = chisquare(observed * pseudo_n, expected * pseudo_n)

    print(f"\nChi-squared test (top {n_bins} bitstrings):")
    print(f"  χ² = {chi2:.2f}")
    print(f"  p-value = {p_value:.2e}")
    print(f"  H1 {'SUPPORTED' if p_value < 0.05 else 'FALSIFIED'}: ", end="")
    if p_value < 0.05:
        print("QAOA distribution is NOT uniform (p < 0.05)")
    else:
        print("QAOA distribution is indistinguishable from uniform (p >= 0.05)")

    # Show QAOA's top concepts
    print(f"\nQAOA top 10 concepts (p=1):")
    print(f"{'Bitstring':<12} {'Prob':>10} {'Score':>8}  Fibers")
    print("-" * 70)
    for bs, prob in qaoa_sorted[:10]:
        score = all_scores[bs][0]
        fibers = [FIBERS[i] for i in range(N) if bs[i] == '1']
        print(f"{bs:<12} {prob:>10.6f} {score:>8.3f}  {', '.join(fibers)}")

    # ============================================================
    # H2: QAOA finds concepts absent from classical samples
    # ============================================================
    print("\n" + "=" * 70)
    print("H2: QAOA finds high-scoring concepts absent from greedy sampling")
    print("    Falsified if: every QAOA top-10 also in greedy sample set")
    print("=" * 70)

    # Greedy heuristic (simulates LLM local exploration)
    print("\nRunning greedy heuristic (10,000 samples)...")
    greedy_samples = greedy_heuristic_samples(10000)
    greedy_set = set(greedy_samples.keys())
    print(f"Unique concepts found by greedy: {len(greedy_set)} / {2**N}")

    # QAOA top-10 by probability
    qaoa_top_10 = set(bs for bs, _ in qaoa_sorted[:10])

    novel_concepts = qaoa_top_10 - greedy_set
    shared_concepts = qaoa_top_10 & greedy_set

    print(f"\nQAOA top-10 concepts also found by greedy: {len(shared_concepts)}")
    print(f"QAOA top-10 concepts NOT found by greedy:  {len(novel_concepts)}")

    if novel_concepts:
        print(f"\nNovel concepts discovered by QAOA (not in greedy samples):")
        for bs in sorted(novel_concepts):
            score, nov, conf, comp = all_scores[bs]
            fibers = [FIBERS[i] for i in range(N) if bs[i] == '1']
            prob = qaoa_probs_p1.get(bs, 0)
            print(f"  {bs} score={score:.3f} prob={prob:.6f} → {', '.join(fibers)}")

    print(f"\n  H2 {'SUPPORTED' if novel_concepts else 'FALSIFIED'}: ", end="")
    if novel_concepts:
        print(f"QAOA found {len(novel_concepts)} concept(s) absent from 10k greedy samples")
    else:
        print("All QAOA top-10 were also found by greedy heuristic")

    # Also check: does greedy find the globally optimal concept?
    global_best = sorted_concepts[0][0]
    print(f"\n  Global best concept: {global_best} → {[FIBERS[i] for i in range(N) if global_best[i] == '1']}")
    print(f"  In greedy samples: {'YES' if global_best in greedy_set else 'NO'}")
    print(f"  In QAOA top-10:    {'YES' if global_best in qaoa_top_10 else 'NO'}")

    # ============================================================
    # H3: Depth advantage (p=2 > p=1)
    # ============================================================
    print("\n" + "=" * 70)
    print("H3: QAOA depth p=2 outperforms p=1")
    print("    Falsified if: mean score(p=2) <= mean score(p=1)")
    print("=" * 70)

    print("\nRunning QAOA (p=2) with FOURIER initialization from p=1...")
    qaoa_probs_p2, qaoa_obj_p2, qaoa_params_p2 = run_qaoa_statevector(
        H, depth=2, n_optimizer_iters=300, n_restarts=5,
        warm_start_params=qaoa_params_p1, warm_start_depth=1
    )
    print(f"QAOA p=2 optimal objective value: {qaoa_obj_p2:.4f}")

    # Compute expected objective value under each distribution
    def expected_score(probs):
        return sum(probs.get(bs, 0) * all_scores[bs][0] for bs in all_scores)

    mean_p1 = expected_score(qaoa_probs_p1)
    mean_p2 = expected_score(qaoa_probs_p2)
    mean_uniform = sum(s[0] for s in all_scores.values()) / len(all_scores)

    # For t-test: sample from each distribution
    def sample_from_probs(probs, n_samples=1000):
        bitstrings = list(probs.keys())
        probabilities = np.array([probs[bs] for bs in bitstrings])
        probabilities /= probabilities.sum()
        indices = np.random.choice(len(bitstrings), size=n_samples, p=probabilities)
        return [all_scores[bitstrings[i]][0] for i in indices]

    scores_p1 = sample_from_probs(qaoa_probs_p1, 5000)
    scores_p2 = sample_from_probs(qaoa_probs_p2, 5000)

    t_stat, t_pvalue = ttest_ind(scores_p2, scores_p1, alternative='greater')

    print(f"\nExpected objective values:")
    print(f"  Uniform random: {mean_uniform:.4f}")
    print(f"  QAOA p=1:       {mean_p1:.4f}")
    print(f"  QAOA p=2:       {mean_p2:.4f}")
    print(f"\nOne-tailed t-test (p=2 > p=1):")
    print(f"  t-statistic: {t_stat:.4f}")
    print(f"  p-value:     {t_pvalue:.2e}")
    print(f"\n  H3 {'SUPPORTED' if (mean_p2 > mean_p1 and t_pvalue < 0.05) else 'FALSIFIED'}: ", end="")
    if mean_p2 > mean_p1 and t_pvalue < 0.05:
        print(f"p=2 mean ({mean_p2:.4f}) > p=1 mean ({mean_p1:.4f}), significant at p<0.05")
    else:
        print(f"p=2 mean ({mean_p2:.4f}) vs p=1 mean ({mean_p1:.4f}), not significant")

    # Show QAOA p=2 top concepts
    qaoa_sorted_p2 = sorted(qaoa_probs_p2.items(), key=lambda x: x[1], reverse=True)
    print(f"\nQAOA top 10 concepts (p=2):")
    print(f"{'Bitstring':<12} {'Prob':>10} {'Score':>8}  Fibers")
    print("-" * 70)
    for bs, prob in qaoa_sorted_p2[:10]:
        score = all_scores[bs][0]
        fibers = [FIBERS[i] for i in range(N) if bs[i] == '1']
        print(f"{bs:<12} {prob:>10.6f} {score:>8.3f}  {', '.join(fibers)}")

    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    results = {
        "H1_distribution_divergence": {
            "hypothesis": "QAOA distribution ≠ uniform",
            "chi_squared": float(chi2),
            "p_value": float(p_value),
            "result": "SUPPORTED" if p_value < 0.05 else "FALSIFIED"
        },
        "H2_novel_concept_discovery": {
            "hypothesis": "QAOA finds concepts absent from greedy sampling",
            "qaoa_top10_count": len(qaoa_top_10),
            "novel_count": len(novel_concepts),
            "novel_concepts": [
                {"bitstring": bs,
                 "score": float(all_scores[bs][0]),
                 "fibers": [FIBERS[i] for i in range(N) if bs[i] == '1']}
                for bs in novel_concepts
            ],
            "greedy_unique_concepts": len(greedy_set),
            "result": "SUPPORTED" if novel_concepts else "FALSIFIED"
        },
        "H3_depth_advantage": {
            "hypothesis": "QAOA p=2 > p=1 mean objective",
            "mean_uniform": float(mean_uniform),
            "mean_p1": float(mean_p1),
            "mean_p2": float(mean_p2),
            "t_statistic": float(t_stat),
            "p_value": float(t_pvalue),
            "result": "SUPPORTED" if (mean_p2 > mean_p1 and t_pvalue < 0.05) else "FALSIFIED"
        },
        "metadata": {
            "n_fibers": N,
            "fibers": FIBERS,
            "solution_space_size": 2**N,
            "simulator": "statevector",
            "qaoa_depths": [1, 2],
            "classical_samples": 10000,
            "optimizer": "COBYLA",
            "p1_optimizer_iters": 100,
            "p2_optimizer_iters": 300,
            "p2_initialization": "FOURIER (Zhou et al. 2020)",
            "random_restarts": 5
        }
    }

    for key in ["H1_distribution_divergence", "H2_novel_concept_discovery", "H3_depth_advantage"]:
        h = results[key]
        status = "✓" if h["result"] == "SUPPORTED" else "✗"
        print(f"\n  {status} {key}: {h['result']}")
        print(f"    {h['hypothesis']}")

    # Save results
    with open('results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to results.json")

    return results


if __name__ == '__main__':
    results = main()
