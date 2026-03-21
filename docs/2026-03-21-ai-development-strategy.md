# AI-Assisted Development Strategy for Alex

**Date:** March 21, 2026
**Context:** Solo ISV dev building a Salesforce managed package (namespace: `OpenSF`)

---

## Core Insight

Strongly typed languages like Apex give AI-assisted development a structural advantage. The compiler catches hallucinations before they run. This document outlines concrete actions to maximize that advantage across our stack.

---

## 1. Lean Into the Compiler as AI Reviewer

The Salesforce compiler already rejects invalid SObject references, type mismatches, and missing schema fields. We can make it catch even more.

**Actions:**

- [ ] Replace loose `Map<String, Object>` patterns with strongly typed wrapper classes / DTOs (already started — extend to all Apex service boundaries)
- [ ] Use enums instead of string constants for status values, action types, and configuration keys
- [ ] Use custom metadata types with validation for configuration rather than custom settings with loose string fields
- [ ] Prefer explicit method signatures with typed parameters over generic `Object` params — every type constraint is another thing AI can't hallucinate past

**Principle:** Every type constraint added is free, automated AI review that runs in milliseconds.

---

## 2. Create a Type Safety Layer for LWC

JavaScript has no compiler to catch AI mistakes. Until Salesforce brings TypeScript to LWC, we compensate.

**Actions:**

- [ ] Add JSDoc `@type` / `@typedef` annotations to all component JavaScript — especially public `@api` properties and event payloads
- [ ] Enforce a strict ESLint config (no implicit globals, no `any`-equivalent patterns, explicit returns)
- [ ] Build a lightweight schema file documenting each component's public API (props, events, slots) that can be fed to AI as context
- [ ] Increase Jest test coverage on LWC — tests compensate for JavaScript's looseness and catch what a type system would
- [ ] When TypeScript support lands for LWC, migrate early

**Principle:** Jest tests + JSDoc + ESLint approximate what the Apex compiler gives us for free.

---

## 3. Use AI for Adversarial Test Generation

As a solo dev, the biggest testing gap is not having someone else trying to break your code. AI fills that role.

**Workflow:**

1. Write or update an Apex class
2. Prompt AI with the class and ask:
   - "What inputs would break this?"
   - "What governor limit scenarios haven't I tested?"
   - "What happens with 10,000 records? 50,000?"
   - "What race conditions exist in multi-user scenarios?"
3. Generate test methods targeting those scenarios
4. Run tests, fix failures, repeat

**Actions:**

- [ ] Adopt this as standard practice for any new or modified Apex class
- [ ] Build a prompt template that includes governor limits, namespace, and our object schema for consistent adversarial testing
- [ ] Target bulk scenarios specifically — managed packages run in customer orgs with real data volumes

---

## 4. Spec-Driven Prompting for Salesforce

Generic AI prompts produce generic code. Salesforce-specific context produces code that actually compiles and respects our architecture.

**Before asking AI to write any Apex, provide:**

- The relevant object schema (fields, types, relationships)
- Governor limits the code must respect
- The namespace (`OpenSF`)
- Existing method signatures it needs to integrate with
- The Redux store shape (for LWC work)
- Platform event structure (for real-time sync work)

**Actions:**

- [ ] Maintain a living "AI context" snippet (object schema summary, key method signatures, namespace rules) that can be dropped into prompts — CLAUDE.md and AGENTS.md already serve this purpose, keep them current
- [ ] For complex features, write a short spec (inputs, outputs, constraints, governor limits) before prompting AI to implement

**Principle:** Strongly typed context in, strongly typed code out. The more constraints you give the AI, the less room it has to be "almost right."

---

## 5. Guard Against Building the Wrong Thing

The biggest risk isn't hallucinated Apex — it's spending a week building something users don't need, three times faster than before.

**Actions:**

- [ ] Before any feature sprint, validate the feature against actual user feedback or support requests
- [ ] Keep a lightweight feature request log (even a simple list in docs/) to reference before starting work
- [ ] Time-box AI-assisted spikes to 2-4 hours — if a feature takes longer, pause and re-evaluate whether it's the right thing to build
- [ ] Use AI for rapid prototyping to validate ideas before committing to full implementation

**Principle:** Speed amplifies direction. Make sure you're pointed the right way before accelerating.

---

## Summary of the Virtuous Cycle

```
Strong types → AI produces compilable code → Fewer hallucinations →
Higher confidence → Higher velocity → More time for design & validation
```

Apex puts us on the right side of this cycle. LWC needs deliberate effort (JSDoc, ESLint, Jest) to get there. The human judgment layer — deciding *what* to build — remains the bottleneck and the highest-leverage place to invest attention.
