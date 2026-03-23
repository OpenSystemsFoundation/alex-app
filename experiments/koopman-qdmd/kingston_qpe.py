"""
Koopman QPE on IBM Kingston — Phase B
======================================
Builds the QPE circuit for Koopman eigenvalue extraction.
Targets IBM Kingston (156-qubit Heron R2, ECR native gate).
Tests H5 (Quantum Fidelity).

Usage:
  # Simulator (local validation)
  python kingston_qpe.py --sim

  # IBM Kingston (requires IBMQ credentials)
  python kingston_qpe.py --backend ibm_kingston --shots 8192
"""

import numpy as np
from qiskit.circuit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.circuit.library import QFT
from qiskit.quantum_info import Operator, Statevector
import json
import argparse

# ============================================================
# 1. KOOPMAN MATRIX (from classical baseline)
# ============================================================

# Dominant 8x8 submatrix of EDMD Koopman operator (order-1 observables).
# This is the projection of the full 92x92 Koopman matrix onto the
# 8-dimensional subspace of individual fiber indicators.
# Computed by classical_baseline.py — hardcoded here for circuit construction.
# Will be replaced by actual computed values after Phase A runs.

def get_koopman_submatrix():
    """
    Build 8x8 Koopman matrix using capability-score DMD from
    multiple development trajectories (same method as classical_baseline.py).
    """
    from classical_baseline import generate_all_snapshots, compute_dmd

    X, Y = generate_all_snapshots()
    eigenvalues, modes, A_tilde, rank = compute_dmd(X, Y)

    # Reconstruct full 8x8 Koopman matrix from DMD decomposition
    # A ≈ Phi * diag(λ) * Phi^+
    A = (modes * eigenvalues[np.newaxis, :]) @ np.linalg.pinv(modes)
    return A.real


def koopman_to_unitary(A):
    """
    Embed real Koopman matrix A as unitary U = exp(i * A_H * scale).
    A_H = (A + A^T)/2 for Hermitian embedding.
    Scale chosen so eigenphases spread across [0, 2pi).
    """
    A_H = (A + A.T) / 2.0
    eigenvalues = np.linalg.eigvalsh(A_H)
    spread = eigenvalues[-1] - eigenvalues[0]

    # Scale so eigenphases span ~half the unit circle (avoid aliasing)
    if spread > 0:
        scale = np.pi / spread
    else:
        scale = 1.0

    from scipy.linalg import expm
    # A is 8x8 = 2^3, maps to 3 system qubits.
    # Computational basis |i> represents fiber i's capability observable.
    U = expm(1j * A_H * scale)
    return U, scale, eigenvalues


# ============================================================
# 2. QPE CIRCUIT
# ============================================================

N_SYSTEM = 3    # 3 qubits = 8-dim Hilbert space for 8 fibers
N_ANCILLA = 6   # 6-bit QPE precision (2pi/64 ≈ 0.098 rad)


def build_qpe_circuit(U, n_ancilla=N_ANCILLA, n_system=N_SYSTEM):
    """
    Build QPE circuit for Koopman unitary U.

    Args:
        U: 8x8 unitary matrix (Koopman operator)
        n_ancilla: number of QPE precision qubits
        n_system: number of system qubits (3 for 8-dim)

    Returns:
        QuantumCircuit ready for transpilation
    """
    anc = QuantumRegister(n_ancilla, 'anc')
    sys = QuantumRegister(n_system, 'sys')
    c_anc = ClassicalRegister(n_ancilla, 'eigenphase')
    c_sys = ClassicalRegister(n_system, 'eigenmode')

    qc = QuantumCircuit(anc, sys, c_anc, c_sys)

    # Initialize system in equal superposition (probes all eigenmodes)
    qc.h(sys)

    # Hadamard on ancilla
    qc.h(anc)

    # Controlled-U^(2^k) for each ancilla qubit k
    U_op = Operator(U)
    U_gate = U_op.to_instruction()
    U_gate.name = "U_K"

    for k in range(n_ancilla):
        power = 2 ** k
        # Build U^power
        U_pow = np.linalg.matrix_power(U, power)
        U_pow_gate = Operator(U_pow).to_instruction()
        U_pow_gate.name = f"U_K^{power}"
        # Controlled version
        ctrl_gate = U_pow_gate.control(1)
        qc.append(ctrl_gate, [anc[k]] + list(sys))

    # Inverse QFT on ancilla
    qft_inv = QFT(n_ancilla, inverse=True)
    qc.append(qft_inv, anc)

    # Measure
    qc.measure(anc, c_anc)
    qc.measure(sys, c_sys)

    return qc


# ============================================================
# 3. RESULT ANALYSIS
# ============================================================

def extract_eigenphases(counts, n_ancilla, scale):
    """Convert QPE measurement counts to Koopman eigenvalues."""
    # Aggregate over system register — focus on ancilla outcomes
    phase_counts = {}
    total = sum(counts.values())

    for bitstring, count in counts.items():
        # Qiskit bitstring format: 'c_sys c_anc' (right-to-left)
        parts = bitstring.split()
        if len(parts) == 1:
            # Single register format: extract ancilla bits
            anc_bits = bitstring[-n_ancilla:]
        else:
            anc_bits = parts[-1]  # ancilla register

        phase_int = int(anc_bits, 2)
        phase = phase_int / (2 ** n_ancilla)
        phase_counts[phase] = phase_counts.get(phase, 0) + count

    # Sort by frequency
    sorted_phases = sorted(phase_counts.items(), key=lambda x: -x[1])

    print(f"\nQPE Results ({total} shots):")
    print(f"{'Phase':>8} {'Eigenvalue':>12} {'Count':>8} {'Prob':>8}")
    print("-" * 42)

    results = []
    for phase, count in sorted_phases[:10]:
        # Convert phase back to eigenvalue: lambda = phase * 2pi / scale
        eigenval = phase * 2 * np.pi / scale if scale > 0 else phase
        prob = count / total
        print(f"{phase:>8.4f} {eigenval:>12.4f} {count:>8} {prob:>8.4f}")
        results.append({
            "phase": float(phase),
            "eigenvalue": float(eigenval),
            "count": int(count),
            "probability": float(prob)
        })

    return results


def compare_to_classical(quantum_phases, classical_eigenvalues, scale):
    """H5: Compare quantum eigenvalues to classical ground truth."""
    print(f"\n--- H5: Quantum Fidelity ---")

    classical_phases = []
    for ev in classical_eigenvalues:
        phase = (ev * scale) / (2 * np.pi)
        phase = phase % 1.0  # wrap to [0, 1)
        classical_phases.append(phase)
    classical_phases.sort()

    quantum_vals = sorted([r["phase"] for r in quantum_phases[:6]])

    print(f"Classical phases: {[f'{p:.4f}' for p in classical_phases[:6]]}")
    print(f"Quantum phases:   {[f'{p:.4f}' for p in quantum_vals[:6]]}")

    # Match each classical phase to nearest quantum phase
    errors = []
    for cp in classical_phases[:4]:  # top 4 dominant
        dists = [min(abs(cp - qp), 1 - abs(cp - qp)) for qp in quantum_vals]
        if dists:
            errors.append(min(dists))

    if errors:
        mean_error = np.mean(errors)
        max_error = np.max(errors)
        print(f"Mean phase error (top 4): {mean_error:.4f}")
        print(f"Max phase error (top 4):  {max_error:.4f}")

        h5_result = "SUPPORTED" if mean_error < 0.10 else "FALSIFIED"
        print(f"H5: {h5_result} (threshold: ε < 0.10)")
        return {"mean_error": float(mean_error), "max_error": float(max_error),
                "result": h5_result}

    return {"result": "INSUFFICIENT_DATA"}


# ============================================================
# 4. MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='Koopman QPE on IBM Kingston')
    parser.add_argument('--sim', action='store_true', help='Run on statevector simulator')
    parser.add_argument('--backend', type=str, default=None, help='IBM backend name')
    parser.add_argument('--shots', type=int, default=8192)
    parser.add_argument('--ancilla', type=int, default=N_ANCILLA)
    args = parser.parse_args()

    print("=" * 70)
    print("KOOPMAN QPE — IBM KINGSTON (Phase B)")
    print("=" * 70)

    # Build Koopman unitary
    A = get_koopman_submatrix()
    print(f"\nKoopman submatrix (8x8):")
    print(np.array2string(A, precision=3, suppress_small=True))

    U, scale, classical_eigs = koopman_to_unitary(A)
    print(f"\nClassical eigenvalues: {np.array2string(classical_eigs, precision=4)}")
    print(f"Scale factor: {scale:.4f}")

    # Build QPE circuit
    print(f"\nBuilding QPE circuit ({args.ancilla} ancilla + {N_SYSTEM} system qubits)...")
    qc = build_qpe_circuit(U, n_ancilla=args.ancilla)
    print(f"Circuit depth: {qc.depth()}")
    print(f"Gate count: {dict(qc.count_ops())}")

    if args.sim:
        # Statevector simulation (no shots, exact)
        print("\n--- Running statevector simulation ---")
        from qiskit_aer import AerSimulator
        from qiskit import transpile

        sim = AerSimulator(method='statevector')
        qc_t = transpile(qc, sim, optimization_level=2)
        print(f"Transpiled depth: {qc_t.depth()}")

        result = sim.run(qc_t, shots=args.shots).result()
        counts = result.get_counts()
        quantum_results = extract_eigenphases(counts, args.ancilla, scale)
        h5 = compare_to_classical(quantum_results, classical_eigs, scale)

    elif args.backend:
        # IBM hardware
        print(f"\n--- Targeting {args.backend} ---")
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
        from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

        service = QiskitRuntimeService()
        backend = service.backend(args.backend)
        print(f"Backend: {backend.name}, qubits: {backend.num_qubits}")

        # Transpile for hardware
        pm = generate_preset_pass_manager(
            optimization_level=3,
            backend=backend,
        )
        qc_t = pm.run(qc)
        print(f"Transpiled depth: {qc_t.depth()}")
        print(f"Transpiled gate count: {dict(qc_t.count_ops())}")

        # Run
        sampler = SamplerV2(mode=backend)
        job = sampler.run([qc_t], shots=args.shots)
        print(f"Job ID: {job.job_id()}")
        print("Waiting for results...")
        result = job.result()

        counts = result[0].data.eigenphase.get_counts()
        quantum_results = extract_eigenphases(counts, args.ancilla, scale)
        h5 = compare_to_classical(quantum_results, classical_eigs, scale)

    else:
        print("\nNo backend specified. Use --sim or --backend ibm_kingston")
        print("Circuit saved for inspection.")
        quantum_results = []
        h5 = {"result": "NOT_RUN"}

    # Save
    results = {
        "classical_eigenvalues": classical_eigs.tolist(),
        "scale": float(scale),
        "quantum_phases": quantum_results,
        "H5_quantum_fidelity": h5,
        "circuit": {
            "n_ancilla": args.ancilla,
            "n_system": N_SYSTEM,
            "depth": qc.depth(),
            "gate_counts": dict(qc.count_ops())
        },
        "hardware": {
            "target": args.backend or "simulator",
            "processor": "Heron R2 (156 qubits)" if args.backend == "ibm_kingston" else "simulator",
            "shots": args.shots
        }
    }

    with open('kingston_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nResults saved to kingston_results.json")


if __name__ == '__main__':
    main()
