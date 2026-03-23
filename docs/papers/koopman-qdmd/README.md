# Koopman Operator Theory and Quantum Dynamic Mode Decomposition for Abductive Feature Discovery

**Authors**: OpenSF Research
**Date**: 2026-03-23
**Hardware**: IBM Kingston (Heron R2, 156 qubits)
**Job ID**: `d70o5jc69uic73ckjdn0`

## Paper Structure

1. [Abstract & Introduction](01-introduction.md)
2. [Background](02-background.md)
3. [Method](03-method.md)
4. [Experiments & Results](04-experiments.md)
5. [Discussion](05-discussion.md)
6. [Future Research](06-future-research.md)

## Figures

- [fig-01-ckr-koopman-cycle.svg](fig-01-ckr-koopman-cycle.svg) — C-K-R theory mapped to Koopman pipeline
- [fig-02-eigenspectrum.svg](fig-02-eigenspectrum.svg) — Koopman eigenspectrum (classical DMD)
- [fig-03-qpe-circuit.svg](fig-03-qpe-circuit.svg) — QPE circuit architecture
- [fig-04-kingston-phases.svg](fig-04-kingston-phases.svg) — IBM Kingston QPE measurement distribution
- [fig-05-abductive-drive.svg](fig-05-abductive-drive.svg) — Abductive fiber drive rankings

## Key Results

| Hypothesis | Result | Metric |
|------------|--------|--------|
| H4: Koopman Validity | **SUPPORTED** | 3 modes with \|λ\| ≥ 0.5 |
| H5: Quantum Fidelity | **SUPPORTED** | mean ε = 0.091 < 0.10 |
