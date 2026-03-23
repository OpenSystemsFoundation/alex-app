# Flypitch: Formal Proof of ZFC Independence of CH

## Overview

Flypitch is a landmark formalization project that produced the first machine-checked proof of the independence of the continuum hypothesis (CH) from ZFC set theory. Written in Lean 3, it demonstrates that CH is neither provable nor disprovable from ZFC axioms.

**Authors**: Jesse Han, Floris van Doorn
**Repository**: https://github.com/flypitch/flypitch
**Website**: https://flypitch.github.io

## Key Contributions

### Forcing Formalized

- **Boolean-valued models**: Full implementation of forcing via Boolean-valued semantics
- **Cohen forcing**: Used to construct model where ¬CH holds
- **Collapse forcing (σ-closed)**: Used to construct model where CH holds
- **No standard model required**: The formalization works without assuming an existing model of ZFC

### Deep Embedding of First-Order Logic

- Complete proof system for first-order logic
- Gödel completeness theorem formalized
- Boolean-valued soundness theorem
- ZFC axioms encoded in embedded language

### Technical Innovations

- Universe-polymorphic Boolean-valued models
- Aczel-Werner encoding as special case of forcing name-construction
- Transfinite combinatorics without explicit transfinite induction (using Lean's native induction on inductive types)

## Formal Statement

```lean
-- From src/summary.lean
def independent {L : Language} (T : Theory L) (f : sentence L) : Prop :=
  ¬ T ⊢' f ∧ ¬ T ⊢' ∼f

theorem independence_of_CH : independent ZFC CH
```

## C-K Relevance

### The `[⊥]` Independent Partition Type

Flypitch's formalization of CH independence directly inspired the `[⊥]` partition type in this skill. Key insight: some concept branches are **permanently unresolvable** within a fixed K-base. When you hit `[⊥]`:

- Stop K-probing (it cannot help)
- Recognize the question is underdetermined by current framework
- Propose **axiom choices** or **framework expansions** to resolve by fiat

This mirrors how mathematicians respond to CH: you *choose* V=L (forcing CH true) or forcing axioms (making CH false). The resolution is a concept-level commitment, not a knowledge discovery.

### Connection to C-K-R

Cohen's forcing (1963) is cited in Kroon (2017) as the mathematical warrant for C-K partitioning. Flypitch formalizes this in dependent type theory, demonstrating that:

- Forcing works without assuming a standard model
- The Aczel-Werner encoding is a special case of forcing name-construction
- Independence is provable, not just conjectured

See `references/design-philosophy.md` for how this integrates with the broader theoretical framework.

### As K-Space Anchor

Flypitch provides strong K-validation for concept explorations involving:

- Formal verification of mathematical foundations
- Mechanized metamathematics
- Proof assistant capabilities for set theory
- Independence proofs and forcing techniques

### Partition Inspirations

When exploring formal methods concepts, Flypitch suggests partitions:

- `[O]` What other independence results could be formalized?
- `[o]` Can forcing be simplified using type-theoretic semantics?
- `[☄]` Automated discovery of forcing notions via ML?
- `[⊥]` Which design questions are framework-dependent rather than K-resolvable?

## Key Papers

1. **ITP 2019**: "A formalization of forcing and the unprovability of the continuum hypothesis" - https://arxiv.org/abs/1904.10570
2. **CPP 2020**: "A formal proof of the independence of the continuum hypothesis" - https://flypitch.github.io/assets/flypitch-cpp.pdf

## Historical Context

Cohen's invention of forcing (1963) earned the only Fields Medal for mathematical logic. The independence of CH was previously unformalized despite being one of the most celebrated results in 20th-century mathematics.
