# AI-Driven Development — AI-Supported Cards

**Date:** March 21, 2026

---

## Overview

Alex cards should become AI-aware — not by replacing humans, but by giving each card contextual intelligence that accelerates the development workflow. The AI understands the codebase, the card's intent, and the team's patterns, then offers support at every stage of the card's lifecycle.

---

## Core Concept

Every card on the board can have AI assistance attached to it. When a developer picks up a card, the AI already understands:

- What the card is asking for (from the description, acceptance criteria, linked items)
- Where in the codebase the work will likely happen
- What patterns the team uses for similar work
- What tests will need to be written or updated

This isn't a chatbot bolted onto a ticket. It's contextual intelligence embedded in the card itself.

---

## Card Lifecycle with AI Support

### 1. Card Creation / Refinement

- AI suggests acceptance criteria based on the description
- Identifies related cards (duplicates, dependencies, conflicts)
- Estimates complexity based on codebase analysis — not story points theatre, but actual "this touches 3 services and needs a migration" insight
- Flags ambiguity: "This card says 'improve performance' but doesn't define a target. Consider adding a measurable goal."

### 2. Card in To Do (Ready for Dev)

- AI pre-analyzes the work: "This will likely involve changes to `KanbanCardService.cls` and the `kanbanStore` LWC module"
- Suggests a starting point and approach
- Identifies risks: "This card's scope overlaps with Card #42 which is currently in progress — coordinate with the assignee"

### 3. Card in Progress

- Developer can ask the card's AI context questions about the specific scope
- AI can generate boilerplate, suggest test cases, review draft implementations — all scoped to what the card is trying to accomplish
- Progress tracking: AI can assess whether the implementation matches the acceptance criteria

### 4. Card in Done

- AI validates that acceptance criteria are met based on the actual code changes
- Generates release notes or changelog entries from the diff
- Suggests documentation updates if public APIs changed

### 5. Card in Released

- AI can correlate production metrics with the card's changes
- If a bug is reported post-release, AI can suggest which recent cards are most likely related

---

## What This Is NOT

- Not auto-generating code and merging it unsupervised
- Not replacing developer judgment with AI decisions
- Not a "just press the button and the card does itself" feature
- Not removing humans from the loop

The developer is always in control. The AI is a force multiplier — it handles the tedious analysis, boilerplate, and cross-referencing so the developer can focus on the actual engineering decisions.

---

## Why This Matters for Alex Specifically

Alex is a Salesforce-native Kanban board. The teams using it are building on Salesforce — Apex, LWC, Flows, metadata. This is a constrained, well-documented platform. AI assistance is especially effective in constrained environments because:

1. The patterns are well-known (service classes, triggers, LWC lifecycle)
2. The metadata is structured and queryable
3. The deployment model is predictable (scratch orgs, sandboxes, production)
4. The testing requirements are explicit (75% coverage, bulk testing)

AI-supported cards on Alex can be meaningfully smarter than generic AI on generic project boards because the context is rich and specific.

---

## Implementation Direction

This is a roadmap-level feature, not a next-sprint item. Key building blocks:

1. **Card context model** — structured data about what a card is trying to accomplish, linked to codebase analysis
2. **AI action surface** — where and how AI suggestions appear (card detail panel, inline on the board, developer's IDE)
3. **Feedback loop** — developers accept/reject/modify AI suggestions, improving future suggestions
4. **Scope boundaries** — AI assistance is always scoped to the card. No ambient "AI is watching everything" — it activates when you engage with a specific card
