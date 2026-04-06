# Agent Instructions — Type Universe

> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical architecture.
> See [docs/roadmap/2026-03-23-homotopy-type-theory-agent-design.md](docs/roadmap/2026-03-23-homotopy-type-theory-agent-design.md) for the theory behind this structure.

---

## Global Rules [ALWAYS APPLY]

These are h-level -2 constraints — exactly one valid behavior. They apply in every fiber.

### CRITICAL: Namespace — OpenSF__ Prefix

The scratch org has namespace `OpenSF`. The prefix is added AUTOMATICALLY during deployment.

**Metadata (XML, flows, flexipages, permission sets, custom metadata):**
```
DO:  objects/Sprint__c/fields/Board__c.field-meta.xml
     <fullName>Board__c</fullName>
     <referenceTo>Board__c</referenceTo>
NOT: objects/OpenSF__Sprint__c/fields/OpenSF__Board__c.field-meta.xml
     <fullName>OpenSF__Board__c</fullName>
```
NEVER prefix `OpenSF__` in directory names, file names, `<fullName>`, `<referenceTo>`, `<relationshipName>`.

**Runtime code (Apex, LWC, SOQL):**
```
DO:  OpenSF__Sprint__c sprint = [SELECT OpenSF__Status__c FROM OpenSF__Sprint__c];
DO:  import STATUS from '@salesforce/schema/OpenSF__Sprint__c.OpenSF__Status__c';
NOT: Sprint__c sprint = [SELECT Status__c FROM Sprint__c];  // fails at runtime
```
ALWAYS prefix `OpenSF__` in Apex classes, triggers, LWC JavaScript, SOQL queries.

**Why:** Unprefixed metadata deploys silently as "Unchanged/success" but fields never get created.

### Type Safety [ALWAYS]

**When:** Writing any code that references status values, event types, or column categories
**Do:** Use `KanbanEnums` enum types with helper methods
**Not:** Raw string literals
```
DO:  KanbanEnums.sprintStatusValue(KanbanEnums.SprintStatus.ACTIVE)
NOT: 'Active'
```

**When:** Receiving `Map<String, Object>` from LWC in `@AuraEnabled` methods
**Do:** Convert to typed request internally via `CardUpdateRequest.fromMap(updates)`
**Not:** Pass raw maps through service layer

**When:** Defining `@api` properties or event payloads in LWC
**Do:** Add JSDoc `@type` annotations to `@api` properties, `@typedef` for event payloads

### Code Style [ALWAYS]

- prettier-plugin-apex pinned to v2.1.5 (v2.2.6 breaks SOQL formatting)
- All code must pass `npm run lint` (enforced by lint-staged)
- ESLint strict: no implicit globals, consistent returns, no var, prefer const, strict equality

---

## Agent Behavior — Dependent Types

Behavior varies by context. Match the mode, apply its rules.

### Mode: Executing (writing code, making changes)

- Be concise — brief explanations only
- Execute immediately without lengthy justification
- Keep tool calls focused on the task
- No humor during active problem-solving

### Mode: Explaining (answering questions, teaching)

- Brutal standup comedian humor that teaches through pain

### Mode: Summarizing (after completing work)

Short, scannable bullet points:
```
✅ Completed:
- Added sync state tracking to Redux store (idle/syncing/failed)
- Updated connectionStatusIndicator with sync UI
- Fixed 3 test failures in kanbanStore.test.js
- All 203 tests passing

Want details on any of these?
```

**Not** multi-paragraph prose restating everything that was done.

### Mode: Debugging

- Run tests immediately when investigating failures
- No need to ask permission during active debugging
- Concise output, no humor — focus on root cause

---

## Fiber: Apex Backend

**When:** Working in `force-app/main/default/classes/`

### Architecture Pattern

```
Controller (@AuraEnabled) → Service (business logic) → Selector (SOQL) → DTO (data transfer)
```

Every new backend feature follows this layering. No SOQL in controllers. No business logic in selectors.

### Existing Services

| Service | Responsibility |
|---------|---------------|
| `KanbanBoardController.cls` | @AuraEnabled API endpoints (8 methods) |
| `KanbanBoardService.cls` | Board operations |
| `KanbanCardService.cls` | Card CRUD and positioning |
| `SprintService.cls` | Sprint lifecycle, velocity, snapshots |
| `KanbanBoardSelector.cls` | Board/column/card SOQL |
| `SprintSelector.cls` | Sprint/backlog SOQL |
| `KanbanBoardDTO.cls` | BoardDTO, ColumnDTO, CardDTO, UserDTO, EpicDTO, SprintDTO, SprintCardDTO, SprintSnapshotDTO |

### Triggers and Events

| Trigger Handler | Publishes |
|----------------|-----------|
| `CardTriggerHandler.cls` | `CardUpdateEvent__e` |
| `ColumnTriggerHandler.cls` | `ColumnUpdateEvent__e` |
| `SprintCardTriggerHandler.cls` | `SprintUpdateEvent__e` |

All trigger handlers extend `TriggerHandler.cls` (recursion control).

### Test Organization

Place test classes in `force-app/main/default/classes/` alongside the class they test:
```
DO:  classes/SprintServiceTest.cls
NOT: test/classes/SprintServiceTest.cls
```

### Adversarial Testing Checklist

When writing or modifying Apex, consider:
- What inputs would break this?
- What governor limit scenarios haven't been tested?
- What happens with 10,000+ records?
- What race conditions exist in multi-user scenarios?

---

## Fiber: LWC Frontend

**When:** Working in `force-app/main/default/lwc/`

### State Management Pattern — Redux

```
User action → dispatch thunk → Apex controller → DB update → Trigger fires
→ Platform Event published → all clients receive → eventHandler processes
→ echo prevention check (clientRequestId) → store dispatch → UI re-renders
```

All state mutations go through: **Actions → Reducers → Selectors**
- Reducers are pure — no side effects
- Side effects belong in thunks
- State is frozen with `Object.freeze()` — immutable

### Component Architecture

```
kanbanBoard (container)
├── handlers/    → eventHandler, dragDropHandler, cardOperations, subscriptionEventHandler
├── helpers/     → clientIdGenerator, reducerQueue, requestTracker
├── managers/    → lifecycleManager, boardDataLoader
kanbanStore (state)
├── core/        → store, actionTypes
├── state/       → actions, reducers, selectors
├── middleware/   → thunkMiddleware, loggingMiddleware
├── thunks/      → boardThunks, cardThunks
├── utils/       → dataProcessors, stateHelpers, positionCalculator
subscriptionManager   → EMP API, retryManager, eventHealthMonitor
connectionStatusIndicator → connection status UI
kanbanCardDetail      → card detail modal
```

### Key Design Decisions

| Decision | Why |
|----------|-----|
| LexoRank ordering | O(1) insert without renumbering (same as Jira) |
| Separate dragState | Visual preview during drag without polluting main state |
| clientRequestId UUIDs | Prevents echo loops in multi-user realtime |
| Polling fallback | Graceful degradation when platform events blocked by firewalls |
| Trigger-based events | Captures all DML sources (API, UI, batch) |

---

## Fiber: Tests

**When:** Working in `force-app/**/` (Jest) or `e2e/` (Playwright)

### Stack
- Jest for LWC unit tests
- Playwright for E2E tests
- TypeScript strict mode for E2E (`e2e/tsconfig.json`)
- Run `npm run type-check:e2e` to validate E2E types

### Test Categories
- **Happy paths** — core feature flows (board, backlog, filters, drag-drop, card panel)
- **Unhappy paths** — rapid actions, stale data, special characters, concurrent edits
- **Feature tests** — admin management, sprint lifecycle, analytics, retro, planning poker
- **Multi-user tests** — real-time sync between two browser contexts

### H-Level Guidance for Assertions

More specific assertions = lower h-level = more deterministic implementations:
```
h-level 1+ (too vague):  expect(result).toBeTruthy()
h-level 0  (good):       expect(result.status).toBe('Active')
h-level -2 (best):       expect(result).toEqual({ status: 'Active', velocity: 21, cardCount: 7 })
```

---

## Fiber: CI/CD Pipeline

**When:** Working in `.github/workflows/` or modifying release process

### Active Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | Push / PR | Lint, Prettier, LWC Jest tests |
| `apex-tests.yml` | Push to main / PR | Scratch org Apex tests with coverage |
| `security-scan.yml` | PR to main | Salesforce Code Analyzer + npm audit |
| `e2e-tests.yml` | PR to main / manual | Full E2E (chromium + firefox + webkit) |
| `chromium-e2e-debug.yml` | Push to `claude/*` | Fast Chromium-only E2E debug loop |
| `scratch-org.yml` | Manual / PR comment | Create scratch org with sample data |

### C→K Conjunction Loop (E2E Debug)

The `chromium-e2e-debug.yml` workflow is the formalized concept-to-knowledge operator:

```
Push to claude/* branch       ← Concept (untested code)
→ GitHub Action runs          ← Conjunction operator
→ E2E tests execute           ← K validates C
→ Results as commit comments  ← Feedback
→ Fix and push again          ← Refined concept
→ Tests pass                  ← C collapses into K (merge-ready)
```

```bash
# Read test results after push
gh api repos/OpenSystemsFoundation/alex-app/commits/$(git rev-parse HEAD)/comments --jq '.[].body'
# Check workflow status
gh run list --workflow=chromium-e2e-debug.yml --limit=3
```

### Conventional Commits (PR Titles)

| Prefix | Bump | Example |
|--------|------|---------|
| `feat:` | Minor | `feat: add burndown chart` |
| `feat!:` / `BREAKING CHANGE` | Major | `feat!: redesign data model` |
| `fix:` / `perf:` / `refactor:` | Patch | `fix: card drag on mobile` |
| `docs:` / `chore:` / `ci:` / `test:` | None | `docs: update README` |

### Release Flow

```
Feature branch → PR (tests run) → Merge to main (version auto-bumps)
→ Ready for beta?  → Manual: "Release Beta Package"
→ Ready for GA?    → Manual: "Promote to GA Release" (requires approval)
```

All releases are manual — main can have bugs, and managed package creation is irreversible. Beta before GA always.

### Secrets

| Secret | Purpose | Status |
|--------|---------|--------|
| `SFDX_AUTH_URL` | DevHub authentication | Configured |
| `STAGING_AUTH_URL` | Staging org auth | Optional |
| `UAT_AUTH_URL` | UAT org auth | Optional |

---

## Fiber: Design Thinking

**When:** Working in `force-app/**/design*` or `e2e/specs/design-thinking*`

### Architecture

```
DesignSessionController (@AuraEnabled) → DesignSessionService → DesignSessionSelector → DesignSessionDTO
```

Follows the same Controller → Service → Selector → DTO layering as Core Kanban.

### Phase Pipeline

```
Empathize → Define → Ideate → Prototype → Test → Refined
```

Use `DesignEnums.DesignPhase` — never string literals. Cards graduate from Design Thinking into sprint-ready backlog via `DesignSessionCard__c` junction.

### Data Model

| Object | Purpose |
|--------|---------|
| `DesignSession__c` | Session lifecycle (Planning → Active → Completed) |
| `DesignSessionCard__c` | Junction: cards ↔ sessions, tracks phase at entry/exit |
| `DesignNote__c` | Sticky notes, clusters, positioned on canvas |
| `DesignVote__c` | Dot voting, decision scoring |
| `DesignArtifact__c` | Personas, journey maps, storyboards |
| `DesignSessionEvent__e` | Platform event for real-time collaboration |

### Store Integration

Design Thinking has its own Redux slice: `designReducer.js`, `designActionTypes.js`, `designSelectors.js`, `designThunks.js` — all under `kanbanStore/state/reducers/` and `kanbanStore/thunks/`.

### Tools (DesignEnums.Tool)

Empathy Map, Affinity Diagram, Brainstorm, Feedback Grid, HMW Builder, SCAMPER, Mind Map, Crazy 8s, Storyboard Builder, Sketch Canvas, Decision Matrix, Acceptance Criteria, Dot Voting.

---

## Fiber: Feature Development — C-K Navigation

**When:** Implementing a new feature or user story

### Step 1: Identify Fibers (K→K)

Which fibers does this feature touch? Read the relevant modules:

| Feature touches... | Read first |
|-------------------|------------|
| Sprint lifecycle | `SprintService`, `SprintSelector`, sprint reducers/thunks |
| Card operations | `KanbanCardService`, `CardTriggerHandler`, card thunks |
| Board structure | `KanbanBoardService`, `KanbanBoardSelector`, board reducers |
| Real-time sync | `subscriptionManager`, Platform Event triggers, echo prevention |
| UI components | `kanbanStore` shape, existing LWC components, Redux patterns |
| Ordering/position | `LexoRank.cls`, `positionCalculator` |
| Design Thinking | `DesignSessionService`, `DesignEnums`, design reducers/thunks |

### Step 2: Expand Concept (C→C)

Break the user story into sub-tasks that map to specific fibers. Each sub-task should have a clear type signature — what inputs, what outputs, what constraints.

### Step 3: Spec-Driven Implementation

Before implementing, gather:
- Relevant object schema (fields, types, relationships)
- Governor limits the code must respect
- Namespace (`OpenSF`)
- Existing method signatures it must integrate with
- Redux store shape (for LWC work)

### Step 4: Conjunction (C→K)

Implement, test, deploy. Use the E2E debug loop for validation.

### Cross-Fiber Concept Discovery

Novel features live in the **tensor product** of fibers — combinations that neither fiber alone suggests. When exploring what to build next, consider cross-fiber intersections:

| Fiber A | ⊗ Fiber B | → Novel Concept |
|---------|-----------|-----------------|
| Redux store | Platform Events | Collaborative undo, conflict resolution |
| LexoRank | MPS Tensor | MI-based card ordering, entanglement-aware swimlanes |
| Echo prevention | Planning Poker | Vote deduplication via clientRequestId |
| Sprint snapshots | QAOA | Quantum-optimized sprint planning |
| Design Thinking | MPSTensor | Affinity clustering via tensor decomposition |
| Design Thinking | QAOA | Quantum-explored concept partitions for ideation |

See [experiments/quantum-concept-discovery/](experiments/quantum-concept-discovery/RESULTS.md) for validated results and [claude/skills/ck-theory/](claude/skills/ck-theory/Skill.md) for structured C-K sessions.

---

## Policies

### Documentation
NEVER create documentation files unless explicitly requested. After code changes, ask: "Would you like me to create documentation for these changes?"

### Testing
- During development/debugging: run tests automatically, no need to ask
- After completing work: ask "Would you like to run the tests now?"

### Deployment
Run `npm run deploy` after completing development work.

### CLI
Use `sf` directly (`/opt/node22/bin/sf`). Set `SFDX_DISABLE_DNS_CHECK=true` if DNS resolution fails.

---

## Project Context

**Alex** — a real-time collaborative Kanban board built on Salesforce.

**Stack:** Salesforce DX, LWC, Apex (Controller → Service → Selector → DTO), Platform Events, Redux-style state management, LexoRank, TypeScript tests, Jest + Playwright, Node.js v22.x LTS.

### What's Built (March 2026)

- **Core Kanban:** Redux store, platform events, echo prevention, connection status, LexoRank, DTOs, health monitoring, multi-window tracking, sequence numbers
- **Sprint Management:** Lifecycle (Planning → Active → Completed), auto-numbering, completion wizard, SprintCard junction with soft-delete, story points, sprint header with progress bar
- **Backlog:** Search + filtering, bulk actions, inline creation, drag-and-drop, context menu, refinement flags
- **Analytics:** Burndown chart (Canvas), velocity chart, sprint summary table, daily snapshots via scheduler
- **Design Thinking:** Session lifecycle, 6-phase pipeline (Empathize→Refined), collaborative tools (Empathy Map, Brainstorm, Feedback Grid, HMW Builder, Dot Voting), sticky note canvas, platform events for real-time sync, Redux store slice, card graduation to backlog
- **Service Layer:** SprintService, SprintSelector, SprintCardTriggerHandler, KanbanCardService, KanbanBoardService, DesignSessionService, DesignSessionSelector
- **Experiments:** Quantum concept discovery (QAOA cross-fiber exploration). See [experiments/](experiments/)

### What's Next

See [README Roadmap](README.md) and [docs/2026-03-18-roadmap-and-analysis.md](docs/roadmap/2026-03-18-roadmap-and-analysis.md).
