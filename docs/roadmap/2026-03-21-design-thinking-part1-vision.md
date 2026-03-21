# Design Thinking for Alex — Part 1: Vision & Process Overview

**Date:** March 21, 2026
**Series:** Design Thinking Implementation Plan (Part 1 of 4)

---

## The Big Idea

Transform Alex from a Kanban task tracker into a **collaborative design thinking platform**. Every card starts as a raw idea. The design thinking process — Empathize, Define, Ideate, Prototype, Test — becomes the pipeline that refines ideas into actionable, validated work items ready for sprint planning.

The existing `NeedsRefinement__c` flag is the seed. We grow it into a full design thinking workflow where each phase has dedicated collaborative tools built as single-page LWC experiences.

---

## How It Maps to Alex Today

```
Current Flow:
  Card created → Backlog → NeedsRefinement toggle → Sprint → Kanban columns → Done

Design Thinking Flow:
  Idea (Card) → Empathize → Define → Ideate → Prototype → Test → Refined → Sprint Ready
                 ↑                                              |
                 └──────────── iterate ─────────────────────────┘
```

### What Changes

| Today | With Design Thinking |
|-------|---------------------|
| Card = task | Card = idea that evolves into a task |
| Binary refinement flag | Multi-phase refinement pipeline |
| No structured collaboration tools | Phase-specific tools (empathy maps, HMW, dot voting, etc.) |
| Refinement = developer meeting | Refinement = facilitated design thinking session |
| Story points added manually | Story points emerge from validated understanding |

### What Stays

- Redux store architecture (extended, not replaced)
- Platform events for real-time collaboration
- LexoRank for ordering
- Sprint management (receives output of design thinking)
- Kanban board (execution layer after design thinking)

---

## The Five Phases in Alex

### Phase 1: Empathize — "Who are we solving for?"

**Goal:** Build shared understanding of users and their problems.

**Card enters this phase when:** Created as a new idea or flagged for refinement.

**Activities:**
- Collaborative empathy map canvas (Says / Thinks / Does / Feels quadrants)
- User interview notes attached to the card
- Photo/artifact uploads
- Journey map sketching

**Card exits this phase when:** Team has documented user insights and the facilitator advances it.

---

### Phase 2: Define — "What's the real problem?"

**Goal:** Synthesize empathy data into a clear problem statement.

**Activities:**
- Affinity diagram — cluster sticky notes into themes
- "How Might We" (HMW) statement builder
- Persona cards linked to the idea
- Problem statement (POV) generator: *[User] needs [need] because [insight]*
- Stakeholder mapping

**Card exits this phase when:** A clear HMW statement is agreed upon.

---

### Phase 3: Ideate — "What could we build?"

**Goal:** Generate and select solution ideas.

**Activities:**
- Brainstorming canvas (IDEO's 7 rules enforced by UI)
- Crazy 8s — timed sketch exercise (8 ideas in 8 minutes)
- SCAMPER prompts (Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Rearrange)
- Dot voting — each participant gets N votes to prioritize ideas
- Mind mapping
- Worst Possible Idea (reverse brainstorm)

**Card exits this phase when:** Top ideas are selected via dot voting.

---

### Phase 4: Prototype — "Make it tangible"

**Goal:** Create quick representations of the top ideas.

**Activities:**
- Sketch upload / drawing canvas
- Wireframe annotations
- Storyboard builder (sequential frames)
- Link to external prototypes (Figma, InVision, etc.)
- Acceptance criteria drafting

**Card exits this phase when:** A testable prototype (even a sketch) exists.

---

### Phase 5: Test — "Does it work?"

**Goal:** Validate the prototype with users and capture feedback.

**Activities:**
- Feedback capture grid (Likes / Wishes / Questions / Ideas)
- Test session notes
- Success/failure criteria checklist
- Iteration decision: refine further or graduate to sprint

**Card exits this phase when:** Team votes to mark the card as "Refined" and sprint-ready.

---

## Session Model

Design thinking in Alex is **session-based**. A facilitator creates a session, invites participants, and guides the team through one or more phases for a set of cards.

```
Session
├── Facilitator (board member who created the session)
├── Participants (board members who joined)
├── Cards (ideas being refined in this session)
├── Current Phase (which DT phase the session is in)
├── Timer (optional, for timeboxed activities like Crazy 8s)
└── Activities (the tools used within the phase)
```

Sessions use **platform events** for real-time collaboration — the same infrastructure Alex already has for Kanban board sync. Participants see each other's sticky notes, votes, and sketches appear in real time.

---

## Frameworks Referenced

This design draws from:

| Framework | What We Took |
|-----------|-------------|
| **IDEO (3I Model)** | Inspiration → Ideation → Implementation mapping; 7 brainstorming rules; Method Cards concept |
| **Stanford d.school** | 5-phase structure (Empathize/Define/Ideate/Prototype/Test); bias toward action |
| **Google Design Sprint** | Timeboxing; Crazy 8s; structured voting; 5-day compressed format as optional "sprint mode" |
| **IBM Enterprise Design Thinking** | Hills (goal statements); Playbacks (progress sharing); Sponsor Users concept |
| **IDEO Design Kit** | HCD methods library; field guide structure for facilitator guidance |

---

## Navigation

- **Part 1** (this document): Vision & Process Overview
- **[Part 2](2026-03-21-design-thinking-part2-tools.md)**: Tools & Methods by Phase
- **[Part 3](2026-03-21-design-thinking-part3-implementation.md)**: Technical Implementation Plan
- **[Part 4](2026-03-21-design-thinking-part4-architecture.md)**: Data Model & Component Architecture

---

**Document Version:** 1.0
**Maintainer:** Open Systems Foundation
