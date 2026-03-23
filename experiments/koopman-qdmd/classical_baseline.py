"""
Koopman EDMD Classical Baseline — Phase A
==========================================
Computes Extended DMD on Alex's fiber evolution history.
Uses capability scores (continuous observables from NOVELTY matrix)
and multiple development trajectories to capture rich dynamics.
Tests H4 (Koopman Validity).
"""

import numpy as np
from itertools import combinations, permutations
import json

# ============================================================
# 1. FIBER DEFINITIONS & INTERACTION MATRICES
# ============================================================

FIBERS = [
    "Redux", "PlatformEvents", "LexoRank", "ApexServices",
    "LWC", "MPSTensor", "QAOA", "EchoPrevention",
]
N = len(FIBERS)

# From QAOA experiment — how novel is combining fiber i with j
NOVELTY = np.array([
    [0.0, 0.6, 0.2, 0.1, 0.0, 0.9, 0.9, 0.7],
    [0.6, 0.0, 0.8, 0.1, 0.5, 0.9, 0.9, 0.1],
    [0.2, 0.8, 0.0, 0.4, 0.5, 0.9, 0.9, 0.8],
    [0.1, 0.1, 0.4, 0.0, 0.0, 0.8, 0.8, 0.4],
    [0.0, 0.5, 0.5, 0.0, 0.0, 0.9, 0.9, 0.6],
    [0.9, 0.9, 0.9, 0.8, 0.9, 0.0, 0.7, 0.9],
    [0.9, 0.9, 0.9, 0.8, 0.9, 0.7, 0.0, 0.9],
    [0.7, 0.1, 0.8, 0.4, 0.6, 0.9, 0.9, 0.0],
])

TYPE_CONFLICT = np.array([
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.3, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0],
    [0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
])


def capability_scores(z):
    """
    Compute continuous capability observables from binary fiber state.
    Returns 8 scores: one per fiber, measuring its "effective strength"
    accounting for interactions with other active fibers.

    g_i(Z) = z_i * (1 + Σ_j z_j * NOVELTY[i,j] - 5 * Σ_j z_j * CONFLICT[i,j])
    """
    scores = np.zeros(N)
    for i in range(N):
        if z[i] == 0:
            scores[i] = 0.0
            continue
        interaction = 1.0
        for j in range(N):
            if i != j and z[j]:
                interaction += NOVELTY[i, j] - 5.0 * TYPE_CONFLICT[i, j]
        scores[i] = interaction
    return scores


# ============================================================
# 2. DEVELOPMENT TRAJECTORIES
# ============================================================

# Actual Alex history
ACTUAL_ORDER = [3, 4, 0, 2, 1, 7, 5, 6]  # Apex,LWC,Redux,Lex,PE,Echo,MPS,QAOA

# Counterfactual orderings (plausible alternative build orders)
COUNTERFACTUALS = [
    [4, 0, 3, 1, 7, 2, 5, 6],  # UI-first: LWC,Redux,Apex,PE,Echo,Lex,MPS,QAOA
    [3, 0, 4, 2, 5, 1, 7, 6],  # Data-first: Apex,Redux,LWC,Lex,MPS,PE,Echo,QAOA
    [0, 4, 3, 2, 1, 7, 6, 5],  # State-first: Redux,LWC,Apex,Lex,PE,Echo,QAOA,MPS
    [3, 4, 1, 7, 0, 2, 5, 6],  # Realtime-first: Apex,LWC,PE,Echo,Redux,Lex,MPS,QAOA
    [4, 3, 5, 0, 6, 2, 1, 7],  # Quantum-early: LWC,Apex,MPS,Redux,QAOA,Lex,PE,Echo
]


def generate_trajectory(order):
    """Generate snapshot sequence from a fiber addition order."""
    snapshots = []
    z = np.zeros(N)
    snapshots.append(z.copy())
    for fiber_idx in order:
        z[fiber_idx] = 1.0
        snapshots.append(z.copy())
    return snapshots


def generate_all_snapshots():
    """Generate (state, next_state) pairs from all trajectories."""
    all_trajectories = [ACTUAL_ORDER] + COUNTERFACTUALS
    X_list, Y_list = [], []

    for order in all_trajectories:
        traj = generate_trajectory(order)
        for t in range(len(traj) - 1):
            g_t = capability_scores(traj[t])
            g_next = capability_scores(traj[t + 1])
            X_list.append(g_t)
            Y_list.append(g_next)

    return np.array(X_list).T, np.array(Y_list).T  # 8 x T each


# ============================================================
# 3. DMD (direct on capability observables)
# ============================================================

def compute_dmd(X, Y):
    """
    Standard DMD: find A such that Y ≈ AX.
    Returns A and its eigendecomposition.
    """
    U, S, Vt = np.linalg.svd(X, full_matrices=False)
    threshold = S[0] * 1e-10
    r = np.sum(S > threshold)
    U_r, S_r, Vt_r = U[:, :r], S[:r], Vt[:r, :]

    # Projected Koopman: Ã = U^T Y V S^-1
    A_tilde = U_r.T @ Y @ Vt_r.T @ np.diag(1.0 / S_r)

    # Eigendecomposition in reduced space
    eigenvalues, W = np.linalg.eig(A_tilde)

    # Recover full modes: Phi = Y V S^-1 W
    Phi = Y @ Vt_r.T @ np.diag(1.0 / S_r) @ W

    # Sort by |λ|
    idx = np.argsort(-np.abs(eigenvalues))
    return eigenvalues[idx], Phi[:, idx], A_tilde, r


# ============================================================
# 4. ANALYSIS & ABDUCTION
# ============================================================

def analyze_koopman(eigenvalues, modes):
    """Print Koopman eigenspectrum with fiber interpretations."""
    print(f"\nKoopman Eigenspectrum ({len(eigenvalues)} modes):")
    print(f"{'Mode':<6} {'|λ|':>8} {'Re(λ)':>8} {'Im(λ)':>8}  Dominant fibers")
    print("-" * 75)

    modes_info = []
    for i in range(len(eigenvalues)):
        lam = eigenvalues[i]
        vec = np.abs(modes[:, i])
        top3 = np.argsort(-vec)[:3]
        fiber_str = ", ".join(f"{FIBERS[j]}({vec[j]:.3f})" for j in top3)

        print(f"  {i:<4} {np.abs(lam):>8.4f} {lam.real:>8.4f} {lam.imag:>8.4f}  {fiber_str}")

        modes_info.append({
            "index": i,
            "eigenvalue_abs": float(np.abs(lam)),
            "eigenvalue_real": float(lam.real),
            "eigenvalue_imag": float(lam.imag),
            "top_fibers": [
                {"fiber": FIBERS[j], "weight": float(vec[j])} for j in top3
            ]
        })
    return modes_info


def abductive_query(eigenvalues, modes, target_name, target_z, current_z):
    """
    Project (target - current) capability delta onto Koopman eigenmodes.
    Identifies which modes (and their associated fibers) drive toward target.
    """
    print(f"\n{'='*65}")
    print(f"ABDUCTIVE QUERY: '{target_name}'")
    current_fibers = [FIBERS[i] for i in range(N) if current_z[i]]
    target_fibers = [FIBERS[i] for i in range(N) if target_z[i]]
    missing_fibers = [FIBERS[i] for i in range(N) if target_z[i] and not current_z[i]]
    print(f"  Current: {current_fibers}")
    print(f"  Target:  {target_fibers}")
    print(f"  Missing: {missing_fibers}")
    print(f"{'='*65}")

    g_target = capability_scores(target_z)
    g_current = capability_scores(current_z)
    delta = g_target - g_current

    # Project delta onto modes: delta ≈ Σ c_i * phi_i
    coeffs = np.linalg.lstsq(modes, delta, rcond=None)[0]

    print(f"\nEigenmode decomposition:")
    print(f"{'Mode':<6} {'|λ|':>8} {'|c_i|':>10} {'Drive':>10}  Mode fibers")
    print("-" * 65)

    for i in range(len(coeffs)):
        lam = eigenvalues[i]
        c = coeffs[i]
        drive = np.abs(c) * np.abs(lam)
        vec = np.abs(modes[:, i])
        top2 = np.argsort(-vec)[:2]
        fiber_str = ", ".join(FIBERS[j] for j in top2)
        print(f"  {i:<4} {np.abs(lam):>8.4f} {np.abs(c):>10.4f} {drive:>10.4f}  {fiber_str}")

    # Aggregate fiber importance via Koopman drive
    fiber_drive = np.zeros(N)
    for i in range(len(coeffs)):
        drive = np.abs(coeffs[i]) * np.abs(eigenvalues[i])
        fiber_drive += np.abs(modes[:, i]) * drive

    # Zero out already-present fibers
    for i in range(N):
        if current_z[i]:
            fiber_drive[i] = 0

    ranked = np.argsort(-fiber_drive)
    print(f"\nAbductive ranking (missing fibers by drive):")
    results = []
    for f in ranked:
        if fiber_drive[f] > 0.01:
            print(f"  {FIBERS[f]:<20} drive={fiber_drive[f]:.4f}")
            results.append({"fiber": FIBERS[f], "drive": float(fiber_drive[f])})

    return results


# ============================================================
# 5. MAIN
# ============================================================

def main():
    print("=" * 65)
    print("KOOPMAN DMD — CLASSICAL BASELINE (Phase A)")
    print("=" * 65)

    # Generate snapshot data from multiple trajectories
    X, Y = generate_all_snapshots()
    print(f"\nTrajectories: {1 + len(COUNTERFACTUALS)} ({X.shape[1]} transition pairs)")
    print(f"Observable dimension: {X.shape[0]} (capability scores)")

    # DMD
    eigenvalues, modes, A_tilde, rank = compute_dmd(X, Y)
    print(f"DMD rank: {rank}")

    modes_info = analyze_koopman(eigenvalues, modes)

    # H4: Koopman Validity
    n_sig = sum(1 for lam in eigenvalues if np.abs(lam) >= 0.5)
    h4 = "SUPPORTED" if n_sig >= 3 else "FALSIFIED"
    print(f"\n--- H4: Koopman Validity ---")
    print(f"Modes with |λ| >= 0.5: {n_sig}")
    print(f"H4: {h4}")

    # Abductive queries
    # Q1: From early state, find path to real-time reordering
    current_1 = np.array([1, 0, 0, 1, 1, 0, 0, 0], dtype=float)
    target_1 = np.array([1, 1, 1, 1, 1, 0, 0, 1], dtype=float)
    abd1 = abductive_query(eigenvalues, modes,
                           "real-time collaborative reordering", target_1, current_1)

    # Q2: From pre-quantum state, find quantum-tensor features
    current_2 = np.array([1, 1, 1, 1, 1, 0, 0, 1], dtype=float)
    target_2 = np.array([1, 1, 1, 1, 1, 1, 1, 1], dtype=float)
    abd2 = abductive_query(eigenvalues, modes,
                           "quantum-tensor optimization", target_2, current_2)

    # Save results
    results = {
        "H4": {"n_significant": int(n_sig), "threshold": 0.5, "result": h4},
        "eigenspectrum": modes_info,
        "abductive_q1": abd1,
        "abductive_q2": abd2,
        "metadata": {
            "n_fibers": N,
            "n_trajectories": 1 + len(COUNTERFACTUALS),
            "n_transitions": int(X.shape[1]),
            "dmd_rank": int(rank),
        }
    }
    with open('classical_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to classical_results.json")
    return results


if __name__ == '__main__':
    main()
