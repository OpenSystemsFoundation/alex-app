# Homotopy Type Theory + C-K Design Theory for AI Agent Instructions

**Date:** March 23, 2026

---

## Abstract

This document proposes a formal framework for structuring AI agent instructions (AGENTS.md, CLAUDE.md) using two complementary theories:

- **Homotopy Type Theory (HoTT)** — to make instruction spaces precise, reduce ambiguity, and lower the degrees of freedom available to the LLM during code generation
- **C-K Design Theory** — to formalize the relationship between the codebase (Knowledge space) and feature requests (Concept space), making the design process navigable by AI agents

The goal is **more deterministic, higher-quality AI-assisted development** by aligning instruction structure with the geometry of transformer attention mechanisms.

---

## Part 1: The Problem with Flat Instructions

Traditional agent instruction files are prose documents — flat lists of rules with implicit relationships. This creates several failure modes:

1. **Ambiguity** — Rules can conflict ("be concise" vs "deliver humor that teaches through pain"). The LLM must resolve conflicts at inference time, introducing non-determinism.
2. **Redundancy** — The same rule stated differently in multiple places wastes context window and creates inconsistency (e.g., namespace warnings in both CLAUDE.md and AGENTS.md).
3. **Missing dependencies** — Rules that only apply in certain contexts aren't structurally linked to those contexts. The LLM must infer when rules apply.
4. **No composition model** — There's no formal way to combine rules, extend them for new domains, or reason about whether two rule sets produce equivalent behavior.

---

## Part 2: HoTT Concepts Applied to Agent Instructions

### 2.1 Types as Spaces of Valid Behavior

In HoTT, a type is a space. Each point in the space is a valid inhabitant. Applied to agent instructions:

- A **rule** defines a type — the space of all behaviors that satisfy it
- An **instruction set** defines a product type — the intersection of all rule-spaces
- The LLM's output must be a **term** (inhabitant) of this product type

The fewer inhabitants a type has, the more constrained (deterministic) the output.

### 2.2 Homotopy Levels and Determinism

Every type in HoTT has a homotopy level (h-level) that measures its degrees of freedom:

| h-level | Name | Inhabitants | Agent instruction analog |
|---------|------|-------------|--------------------------|
| -2 | Contractible | Exactly one | "Use LexoRank for ordering" — only one valid approach |
| -1 | Mere proposition | At most one | "Tests must pass" — either satisfied or not |
| 0 | Set | Discrete, decidable | "Follow Controller → Service → Selector" — distinct valid patterns, clearly comparable |
| 1+ | Groupoid | Multiple + multiple comparisons | "Improve performance" — many valid approaches, many ways to compare them |

**Key insight: Well-structured instructions truncate the h-level of the LLM's output space.** Lower h-level = more deterministic behavior.

### 2.3 Dependent Types — Context-Sensitive Rules

A dependent type `B(a)` varies based on the value of `a`. This models context-sensitive rules:

```
-- The agent's behavior type depends on what it's doing
AgentMode := Debugging | Explaining | Executing | Summarizing

Behavior : AgentMode → Type
Behavior Debugging   = Concise × DirectAction × NoHumor
Behavior Explaining  = Teaching × AncientGodHumor × Examples
Behavior Executing   = MinimalOutput × ToolFocused × NoHumor
Behavior Summarizing = BulletPoints × Scannable × LightHumor
```

Making dependencies explicit eliminates the LLM's need to infer context — the structure tells it which rules apply.

### 2.4 Fibrations — Layered Instruction Bundles

A fibration in HoTT is a type family that varies smoothly over a base space. The codebase has a natural fibration structure:

```
Base space: { Metadata, Apex, LWC, Tests, E2E, CI/CD }

Fiber(Metadata) = { no OpenSF__ prefix, XML format, declarative }
Fiber(Apex)     = { OpenSF__ prefix, enum types, typed params, governor limits }
Fiber(LWC)      = { OpenSF__ prefix, JSDoc types, Redux pattern, ESLint strict }
Fiber(Tests)    = { TypeScript, Jest/Playwright, test organization rules }
Fiber(CI/CD)    = { GitHub Actions, conventional commits, manual releases }
```

When the LLM receives a task, it first identifies which fiber(s) are relevant, then applies only the rules from those fibers. This is more efficient than scanning all rules.

### 2.5 Path Equivalence — Deduplication

Two rules that produce the same behavioral outcome are **path-equivalent** (homotopic). They should be collapsed to a single canonical rule with a reference. This reduces context window waste and eliminates inconsistency risk.

Example: "Use KanbanEnums for status values" and "Prefer enums over string literals" are homotopic — they trace different paths to the same behavioral endpoint. Collapse to one rule.

---

## Part 3: C-K Design Theory Applied to Feature Development

### 3.1 The Two Spaces

C-K Theory (Hatchuel & Weil, 2003) models design as navigation between two spaces:

- **K-space (Knowledge)**: Validated, established propositions. In our context: the codebase, test suite, CI pipeline, architecture docs, and AGENTS.md itself.
- **C-space (Concepts)**: Propositions with undecided truth status. In our context: user stories, feature requests, bug reports — things that *could* become part of the codebase but haven't been validated yet.

### 3.2 The Four Operators

```
C → C  (Concept Expansion)
  Backlog refinement. Breaking a user story into sub-tasks.
  "Add planning poker" → "voting UI" + "vote aggregation" + "reveal mechanism"

K → K  (Knowledge Expansion)
  Reading the codebase. Understanding existing patterns. Running tests.
  Learning that SprintService exists and Platform Events work.

K → C  (Disjunction — Knowledge generates Concepts)
  The structure of the codebase suggests new features.
  "We have clientRequestId echo prevention → what if we reuse it for vote dedup?"
  The ARCHITECTURE of K determines which concepts are nearby in C-space.

C → K  (Conjunction — Testing Concepts against Knowledge)
  Implementation + testing. Writing code, running tests, deploying.
  If tests pass: concept becomes knowledge. C collapses into K.
  If tests fail: concept is rejected. Return to C-space and expand differently.
```

### 3.3 K Is the Repo. C Is the User Story.

The mapping is precise:

| C-K Concept | Project Analog |
|-------------|---------------|
| K-space | Git repo + test suite + AGENTS.md + CI pipeline + deployed scratch org |
| C-space | GitHub issues, user stories, feature branches before merge |
| C → C | Backlog refinement, sprint planning, story decomposition |
| K → K | Codebase exploration, reading architecture docs, understanding patterns |
| K → C | Architecture suggests features: "we have Redux store → add undo/redo" |
| C → K | The E2E debug loop: push → test → fix → push (chromium-e2e-debug.yml) |

### 3.4 The E2E Debug Loop IS the C→K Operator

The existing `chromium-e2e-debug.yml` workflow is a formalized conjunction operator:

```
Push to claude/* branch          ← Concept (untested code)
  → GitHub Action runs           ← Conjunction operator
  → E2E tests execute            ← K validates C
  → Results posted as comments   ← Feedback
  → Fix and push again           ← Refined concept
  → Tests pass                   ← C collapses into K
  → Merge to main                ← Knowledge is permanent
```

---

## Part 4: The Synthesis — HoTT × C-K for Agent Instructions

### 4.1 K-Space Has a Topology (HoTT Describes It)

The repo isn't a flat bag of files. It has topological structure — related modules are "close," unrelated modules are "far." HoTT fibrations describe this structure precisely.

When a new concept arrives (user story), the K→C operator asks: **which fiber does this concept attach to?** The fibration structure in AGENTS.md tells the LLM exactly which modules to read and extend.

### 4.2 Well-Typed K Truncates the H-Level of C

The more structured and precise the K-space (AGENTS.md + architecture + tests), the lower the h-level of any concept the LLM must implement. This is the core mechanism:

```
Vague K ("write good code")        → high h-level C → non-deterministic output
Precise K ("Controller → Service → Selector, use KanbanEnums, LexoRank for ordering")
                                    → low h-level C → deterministic output
```

AGENTS.md is a **truncation operator** on the concept space.

### 4.3 Tests Are Type Signatures

In constructive type theory (which HoTT extends), a proposition is proved by constructing a witness. Tests are type signatures — they define *what* must be true without specifying *how*.

```
// This test IS a type signature:
expect(sprint.status).toBe('Active')     // h-level -1 (proposition)
expect(cards).toHaveLength(7)            // h-level -2 (contractible — exactly one valid value)
expect(result).toBeTruthy()              // h-level 1+ (groupoid — many valid values)
```

More specific test assertions = lower h-level = more deterministic implementations.

### 4.4 Feature Stories as Type Signatures

Instead of prose user stories, structure feature requests as dependent type signatures:

```
-- Prose (high h-level):
"Add planning poker to sprint planning"

-- Type signature (low h-level):
PlanningPoker : (board : Board) → (sprint : Sprint board) → (cards : List (Card board)) →
  VotingSession where
    participants : board.members
    votes : ∀ (user : participants) → ∀ (card : cards) → StoryPoints
    reveal : (∀ user ∈ participants, hasVoted(user)) → VoteResults
    consensus : VoteResults → StoryPoints
    persistence : VotingSession → SprintCard.StoryPoints__c update
    realtime : VotingSession changes → SprintUpdateEvent__e published
```

The LLM doesn't parse this as formal math — it uses the structural pattern to constrain its implementation space. Each dependent type (sprint depends on board, votes depend on participants and cards) tells the LLM how modules connect.

---

## Part 5: Token Space Optimization

### 5.1 Structural Priming via Consistent Templates

Transformers learn hierarchical structure from consistent formatting. Every rule in AGENTS.md should follow the same template to let the model attend to content rather than parsing varying formats:

```markdown
## [DOMAIN]: Rule Name
**When:** context trigger
**Do:** specific action
**Not:** anti-pattern
**Example:**
  ✓ correct code
  ✗ incorrect code
```

### 5.2 Contrastive Pairs Over Prose

LLMs are trained on next-token prediction and excel at contrastive patterns. `DO/NOT` pairs create stronger signals than paragraphs of explanation:

```
DO:  KanbanEnums.SprintStatus.ACTIVE
NOT: "Active"

DO:  objects/Sprint__c/fields/Status__c.field-meta.xml
NOT: objects/OpenSF__Sprint__c/fields/OpenSF__Status__c.field-meta.xml
```

### 5.3 Attention Anchors

Transformers allocate disproportionate attention to tokens with high surprise value. Use strategically:

- `CRITICAL`, `NEVER`, `ALWAYS` — high-weight keywords at section boundaries
- Structural markers (`##`, `**`, code fences) — consistent attention anchors
- First and last tokens of sections get primacy/recency attention bias

### 5.4 Information Density

Eliminate prose that restates what examples already demonstrate. The model learns more from a single `✓/✗` example pair than from three sentences of explanation. Reduce token count without reducing signal.

---

## Part 6: Implementation Plan

### Phase 1: Restructure AGENTS.md

Reorganize around the fibration structure:

1. **Type Universe** — Top-level declarations of rule categories and their dependencies
2. **Global Rules** — Rules that apply in ALL fibers (h-level truncation operators)
3. **Fiber: Metadata** — XML, declarative config, namespace rules
4. **Fiber: Apex** — Service layer patterns, type safety, governor limits
5. **Fiber: LWC** — Redux patterns, JSDoc types, ESLint rules
6. **Fiber: Tests** — TypeScript, test organization, assertion specificity
7. **Fiber: CI/CD** — Workflows, conventional commits, release flow
8. **C-K Navigation Guide** — How to traverse from concept to implementation using codebase structure

### Phase 2: Collapse Redundancy

Eliminate path-equivalent rules between CLAUDE.md and AGENTS.md. CLAUDE.md becomes the minimal entry point; AGENTS.md becomes the full type universe.

### Phase 3: Token Optimization

Convert all rules to the consistent template format. Replace prose with contrastive pairs. Add attention anchors at section boundaries.

---

## References

- Homotopy Type Theory: Univalent Foundations of Mathematics (The HoTT Book, 2013)
- Hatchuel, A. & Weil, B. — "A New Approach of Innovative Design: An Introduction to C-K Theory" (2003)
- Vaswani et al. — "Attention Is All You Need" (2017) — transformer attention mechanisms
- Press et al. — "Train Short, Test Long: Attention with Linear Biases" (2022) — positional attention patterns
