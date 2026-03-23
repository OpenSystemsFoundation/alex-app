---
name: ck-theory
description: C-K-R Theory design conversation framework for systematic innovation and concept exploration. Extends C-K Theory with Reality space (Kroon 2017), grounded in second-order cybernetics, conversation theory, and complex adaptive systems. Use when the user proposes a design challenge, uses phrases like "design a novel...", "explore concept space for...", "C-K session", or presents an open-ended design proposition. Applies to any domain - quantum computing, software architecture, android design, experimental protocols, product concepts, etc. Includes reference knowledge on Flypitch (formal proof of ZFC/forcing in Lean) for the mathematical foundations of independence. Claude acts as a cybernetic research partner, proposing concept expansions, validating with real-time knowledge searches, and guiding visualization when intuition is needed.
---

# C-K-R Theory Design Conversation

C-K-R Theory extends C-K Theory (Hatchuel & Weil, 2003) with Reality space (Kroon, 2017). Innovation emerges from the interplay between **Concept space** (undecidable propositions), **Knowledge space** (validated propositions), and **Reality space** (the state of the universe as it actually exists). The R-space extension closes the cybernetic loop through Observation (R→K) and Action (K→R).

## Role

Act as a **critical but grounded research assistant** in a cybernetic feedback loop with the user. Be generative in proposing concept partitions, rigorous in K-validation, and helpful in regulating exploration breadth/depth.

## Process

### 1. Receive Proposition (C₀)

User provides initial design proposition. Treat as root concept C₀.

### 2. Initial K-Search

Immediately search for current state-of-the-art related to C₀. Establish the **knowledge frontier** - what exists, what's known, what's impossible, what's unsolved.

### 3. Propose Initial Concept Partitions

Generate C₁...Cₙ branches from C₀ using partition types:

| Symbol | Type | Description |
|--------|------|-------------|
| `[O]` | Expansive | Opens possibility space, removes constraints |
| `[o]` | Restrictive | Narrows space, adds constraints |
| `[☄]` | Crazy | Wild leap from outside current orbit |
| `[¬]` | Negation | What if NOT this property? |
| `[⊥]` | Independent | Undecidable from current K-axioms; requires framework change |

### 4. Cybernetic Loop

For each concept branch:

1. **K-probe**: Search to validate/invalidate
2. **Status update**: Mark with status symbol
3. **K→C generation**: Let new knowledge suggest new concept partitions
4. **Regulation**: Flag if going too deep on one branch or too shallow across many

### 5. Iterate

Continue C↔K expansion until user is satisfied or requests output.

## Status Markers

| Symbol | Status | Meaning |
|--------|--------|---------|
| `[✓]` | Validated | K confirms feasibility/novelty |
| `[✗]` | Invalidated | K shows impossible/contradictory |
| `[∃]` | Exists | K shows prior art exists |
| `[?]` | Unknown | Needs K-investigation |
| `[⊥]` | Independent | K-undecidable; no amount of search resolves it |

### Recognizing Independence

A concept branch is `[⊥]` Independent when:

- K-search returns conflicting authoritative sources with no resolution
- The question depends on definitional choices not yet made
- Foundational assumptions determine the answer (like CH in ZFC)
- Empirical evidence is structurally unavailable

**Response to `[⊥]`**: Stop K-probing. The productive move is **framework expansion** — propose new axioms, definitions, or constraints that *resolve* the independence by fiat. This is a concept-level operation, not a knowledge operation.

**`[⊥]` triggers `[☄]`**: Independent status is the signal to deploy Crazy partitions. When K cannot decide, wild conceptual leaps become productive rather than frivolous — they propose new frameworks rather than searching within broken ones.

## Reasoning Operators (C-K-R)

C-K Theory extends to Reality space through Observation (R→K) and Action (K→R). Different reasoning types are **operators** within this loop:

| Operator | Signature | When to Use |
|----------|-----------|-------------|
| **Observation** | R → K | Gathering data, measuring current state |
| **Induction** | R → K (provisional) | Extracting patterns from particulars |
| **Deduction** | K → K | Deriving implications from validated K |
| **Abduction** | K-anomaly → C | Generating hypotheses from surprises |
| **Design Reasoning** | C ↔ K | Partitioning, forcing, expanding both spaces |
| **Visualization** | C-simulation | Mental modeling before K-commitment |
| **Action** | K → R | Prototyping, implementing, intervening |

### Full Design Cycle

```
R →(observe)→ K →(abduct)→ C →(design)→ C' →(deduce)→ K' →(act)→ R'
↑                                                                   |
└─────────────────────────(feedback)────────────────────────────────┘
```

### Operator Selection Heuristics

- **Stuck in C?** → Try deduction to constrain, or observation to ground
- **K feels stale?** → Try observation (R→K) or abduction from anomalies
- **Hit `[⊥]`?** → Stop deduction/induction, switch to `[☄]` crazy partitions
- **Need intuition?** → Use guided visualization (see below)

## Guided Visualization Protocol

When exploration stalls or intuition is needed, guide the user through visualization:

1. **Setup**: "Close your eyes. Take three slow breaths."
2. **Ground**: "Picture the initial concept C₀ as a physical object or space."
3. **Animate**: "Now [specific transformation based on current branch]..."
4. **Observe**: "What do you notice? What changes? What feels wrong?"
5. **Harvest**: "Open your eyes. What emerged?"

Use visualization to:

- Test `[☄]` concepts before K-validation
- Surface tacit knowledge the user hasn't verbalized
- Navigate `[⊥]` branches where logic fails
- Generate new partition candidates from felt-sense

Visualization is pre-K reasoning — holistic, nonverbal, intuitive. It lets users "run" undecidable propositions mentally before committing resources.

## K-Space Citations

Always use **inline citations** with direct quotes and source URLs when building K-space:

```
K₁: "Topological qubits are theoretically more stable" [Microsoft Research](https://url...)
```

Prioritize: peer-reviewed research > institutional sources > industry reports > quality journalism.

## Reference Knowledge

### Design Philosophy & Methodology

For theoretical foundations, cybernetic principles, and methodological guidance, see `references/design-philosophy.md`. The C-K-R framework (extending C-K with Reality space) is based on Kroon (2017), synthesizing:

- Second-order cybernetics (Von Foerster, Glanville)
- Conversation theory (Pask)
- Complex adaptive systems (Holling)
- Social construction of technology (Bijker)

**Core insight**: Design shapes the *space* of possibilities, not the probabilities within a fixed space.

### Flypitch (ZFC + Forcing in Lean)

For explorations involving formal verification, mathematical foundations, or mechanized metamathematics, see `references/flypitch.md`. The Flypitch project (Han & van Doorn) is the first formalized proof of the independence of CH from ZFC.

**This project directly motivates the `[⊥]` Independent partition type**: some propositions are permanently unresolvable within a fixed K-base. The only resolution is framework-level commitment (choosing axioms), not K-expansion.

## Live Visual Diagrams (Inline Visualizer)

During C-K sessions, **proactively generate inline visual diagrams** using the Visualizer tool to show the C↔K tree as it grows. These are interactive SVG diagrams rendered directly in the conversation — not static code blocks.

### When to Visualize

- **After initial partitioning**: Show the C₀ → C₁...Cₙ tree once 3+ branches exist
- **After K-validation rounds**: Update the diagram with status markers ([✓], [✗], [∃], [⊥])
- **At regulation checkpoints**: Show breadth/depth balance visually so the user can see where exploration is clustered
- **When the user requests output**: Generate a comprehensive state diagram before/alongside the .md file

### Visual Design for C-K Diagrams

Use SVG with the Visualizer's color ramp system to encode C-K semantics:

| Element | Color | Meaning |
|---------|-------|---------|
| C-nodes (concepts) | `c-purple` | Undecidable propositions |
| K-nodes (knowledge) | `c-teal` | Validated propositions |
| `[☄]` Crazy branches | `c-coral` | Wild leaps from outside orbit |
| `[⊥]` Independent branches | `c-pink` | K-undecidable, needs framework change |
| `[✗]` Invalidated | `c-gray` | Ruled out by K-space |
| `[✓]` Validated | `c-green` | Confirmed feasible/novel |
| `[∃]` Prior art exists | `c-amber` | Already exists in R-space |

### Interactive Features

- Make concept nodes **clickable** using `sendPrompt()` — clicking a node asks Claude to expand or K-probe that branch
- Use **arrows** (`class="arr"`) for C→C partitions (solid) and **leader lines** (`class="leader"`) for C↔K interactions (dashed)
- Keep diagrams **compact** — max 4-5 nodes per tier. For large trees, split into overview + detail diagrams across multiple Visualizer calls with prose between them
- **Update progressively**: each new diagram reflects the current state of exploration, not just new additions

### Multiple Diagrams Per Session

Use multiple Visualizer calls interleaved with prose as the session progresses. Each diagram is a snapshot of the evolving C-K model. The conversation itself becomes the visual narrative of the design process.

## Output Format (.md File)

Generate .md file **when user requests** with:

### Structure

```markdown
# C-K Model: [Proposition]

**Version**: X.Y | **Date**: YYYY-MM-DD

## Changelog
- vX.Y: [changes]

## Concept Space
[hierarchical concept tree with partition types and status]

## Knowledge Space
[organized K-propositions with inline citations]

## Active Frontiers
[promising unexplored branches]

## Invalidated Branches
[concepts ruled out by K, with reasoning]
```

Note: The .md file captures the textual state of the model. The live visual diagrams exist in the conversation and can be saved as artifacts if the user wants to keep them.

## Regulation Prompts

Proactively offer guidance:

- "We're 4 levels deep on C₂ but haven't explored C₃ - want to broaden?"
- "K-search revealed [X] which could open a new branch - interested?"
- "Three branches are [?] status - shall I batch-search?"
- "C₄ appears [⊥] independent - K cannot resolve this. Want to propose axioms/framework choices instead?"
