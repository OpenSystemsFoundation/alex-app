# Design Thinking for Alex — Part 3: Technical Implementation Plan

**Date:** March 21, 2026
**Series:** Design Thinking Implementation Plan (Part 3 of 4)

---

## Implementation Strategy

Build in **four milestones**, each delivering usable functionality. Each milestone extends the existing Alex architecture — no rewrites, no throwaway prototypes.

---

## Milestone 1: Foundation — Session & Phase Pipeline

**Goal:** Cards can move through design thinking phases. Sessions can be created and joined.

### 1.1 New Custom Objects (Metadata)

Create the core data model (see Part 4 for full field specs):

- `DesignSession__c` — a facilitated session for one or more cards
- `DesignPhase__c` — tracks a card's progress through DT phases
- `DesignNote__c` — sticky notes, observations, HMW statements
- `DesignVote__c` — dot votes and decision votes
- `DesignArtifact__c` — personas, journey maps, sketches, exported snapshots

### 1.2 Card__c Extensions

Add new fields to the existing `Card__c` object:

- `DesignPhase__c` (picklist): Current DT phase — `Empathize | Define | Ideate | Prototype | Test | Refined`
- `DesignSession__c` (lookup): Active session this card is in

### 1.3 LWC: Design Thinking View

New top-level view in `kanbanBoard` (alongside Board, Backlog, Sprint views):

```
kanbanBoard
├── kanbanBoardView (existing)
├── kanbanBacklogView (existing)
├── kanbanSprintView (existing)
└── designThinkingView (NEW)
    ├── designSessionList — list/create sessions
    ├── designSessionBoard — the active session workspace
    │   ├── designPhaseNav — phase navigation bar
    │   └── designToolCanvas — renders the active tool
    └── designCardPipeline — visual pipeline of cards through phases
```

### 1.4 Redux Store Extensions

Add to the existing store:

```javascript
{
  // Existing state...

  // Design Thinking additions
  designSession: {
    activeSession: null,        // current DesignSession__c
    sessions: [],               // all sessions for this board
    participants: [],           // users in the active session
    currentPhase: null,         // 'empathize' | 'define' | 'ideate' | 'prototype' | 'test'
    currentTool: null,          // which tool is active
    timer: { running: false, remaining: 0 },
    notes: [],                  // DesignNote__c records for current tool
    votes: [],                  // DesignVote__c records for current tool
    artifacts: []               // DesignArtifact__c records
  }
}
```

New action types:

```javascript
// Session lifecycle
'CREATE_DESIGN_SESSION'
'JOIN_DESIGN_SESSION'
'LEAVE_DESIGN_SESSION'
'END_DESIGN_SESSION'

// Phase navigation
'SET_DESIGN_PHASE'
'ADVANCE_CARD_PHASE'
'RETURN_CARD_TO_PHASE'

// Tool interactions
'SET_ACTIVE_TOOL'
'ADD_DESIGN_NOTE'
'UPDATE_DESIGN_NOTE'
'MOVE_DESIGN_NOTE'
'DELETE_DESIGN_NOTE'
'CAST_VOTE'
'RETRACT_VOTE'
'SAVE_ARTIFACT'

// Timer
'START_TIMER'
'TICK_TIMER'
'STOP_TIMER'

// Presence
'PARTICIPANT_JOINED'
'PARTICIPANT_LEFT'
'PARTICIPANT_ACTIVITY'
```

### 1.5 Platform Events

New platform event: `DesignSessionEvent__e`

**Fields:**
- `EventType__c` — `note_added | note_moved | vote_cast | phase_changed | timer_start | timer_stop | participant_joined | participant_left`
- `Payload__c` — JSON payload
- `SessionId__c` — which session
- `ClientId__c` — echo prevention (reuse existing pattern)
- `BoardId__c` — for routing

### 1.6 Apex Backend

```
DesignSessionController.cls    → @AuraEnabled endpoints
DesignSessionService.cls       → session lifecycle, phase transitions
DesignSessionSelector.cls      → SOQL queries
DesignSessionDTO.cls           → DTOs for session, notes, votes, artifacts
DesignSessionTriggerHandler.cls → publishes DesignSessionEvent__e
```

### Milestone 1 Deliverables

- [ ] Custom objects deployed
- [ ] Card__c fields added
- [ ] Session CRUD working
- [ ] Phase navigation working
- [ ] Platform events flowing
- [ ] Basic session list/create UI
- [ ] Redux store extended

**Estimated complexity:** Medium-high. Mostly plumbing — follows existing patterns exactly.

---

## Milestone 2: Core Collaborative Tools

**Goal:** Build the reusable canvas components and the first set of tools.

### 2.1 Shared Canvas Component: `designStickyCanvas`

The workhorse component — a collaborative sticky note canvas used by Empathy Map, Affinity Diagram, Brainstorm, Feedback Grid, and HMW Builder.

**Features:**
- Configurable quadrants/zones (2x2, single, freeform)
- Sticky note CRUD with participant colors
- Drag-and-drop between zones
- Real-time sync via `DesignSessionEvent__e`
- Export canvas state as artifact

**Why build this first:** 5 of the tools are sticky-note canvases with different zone configurations. One component, many uses.

```
designStickyCanvas
├── Props: zones[], notes[], readOnly, showParticipantColors
├── Events: noteadd, notemove, notedelete
├── Slots: zone headers, footer actions
└── Real-time: subscribes to DesignSessionEvent__e for note sync
```

### 2.2 Shared Component: `designDotVoting`

Reusable voting component used after brainstorming, HMW, and Crazy 8s.

**Features:**
- Display items (notes, ideas, sketches) as votable cards
- Configurable vote count per participant
- Real-time vote counting with animation
- Results ranking view
- Reset for re-voting rounds

### 2.3 Shared Component: `designTimer`

Countdown timer synced across all participants.

**Features:**
- Presets: 1, 2, 5, 8, 15, 30, 60 minutes
- Custom time input
- Start/pause/reset (facilitator only)
- Visual progress bar + time remaining
- Audio alert at completion (browser notification)
- Synced via platform events

### 2.4 First Tool Set (using shared components)

| Tool | Shared Component | Zone Config |
|------|-----------------|-------------|
| Empathy Map | `designStickyCanvas` | 4 zones: Says, Thinks, Does, Feels |
| Brainstorm Canvas | `designStickyCanvas` | 1 zone: freeform |
| Feedback Grid | `designStickyCanvas` | 4 zones: Likes, Wishes, Questions, Ideas |
| HMW Builder | `designStickyCanvas` + `designDotVoting` | 1 zone + voting |
| Dot Voting | `designDotVoting` | standalone |

### Milestone 2 Deliverables

- [ ] `designStickyCanvas` component working with real-time sync
- [ ] `designDotVoting` component working
- [ ] `designTimer` component working
- [ ] Empathy Map tool functional
- [ ] Brainstorm Canvas tool functional
- [ ] Feedback Grid tool functional
- [ ] HMW Builder tool functional
- [ ] Dot Voting tool functional

**Estimated complexity:** High. The sticky canvas with real-time drag sync is the hardest piece. But once built, it unlocks 5 tools.

---

## Milestone 3: Advanced Tools

**Goal:** Build the remaining specialized tools.

### 3.1 Crazy 8s

**New component:** `designCrazy8s`

- 8-slot grid per participant (private during creation)
- Each slot: HTML5 Canvas for sketching or text input
- Integrated timer (8 min countdown from `designTimer`)
- Reveal mode: gallery view of all participants' sketches
- Followed by `designDotVoting` on the revealed sketches

### 3.2 Affinity Diagram

**New component:** `designAffinityDiagram`

- Extends `designStickyCanvas` with dynamic cluster creation
- Import notes from previous phase tools
- Cluster = named group with auto-expanding boundary
- Drag notes between clusters or back to unsorted area
- Lock clusters (facilitator action)

### 3.3 Journey Map

**New component:** `designJourneyMap`

- Horizontal timeline with configurable stages
- Rows: Actions, Thoughts, Pain Points, Opportunities
- Emotion curve: draggable SVG path across stages
- Collaborative editing per cell
- Export as artifact

### 3.4 Persona Builder

**New component:** `designPersonaBuilder`

- Structured form (avatar, name, role, goals, frustrations, quote, bio)
- Collaborative editing
- Avatar picker (preset illustrations or upload)
- Save as reusable `DesignArtifact__c` linkable to multiple cards

### 3.5 Storyboard Builder

**New component:** `designStoryboard`

- Sequential frames (add/remove/reorder)
- Each frame: sketch canvas + caption
- Playback mode (slideshow)
- Collaborative — assign frames to different participants

### 3.6 Stakeholder Map

**New component:** `designStakeholderMap`

- 2x2 grid (Power × Interest)
- Stakeholder cards with name, role, notes
- Drag to position on the grid
- Collaborative placement

### 3.7 SCAMPER Prompts

**New component:** `designScamperPrompts`

- Card deck UI — facilitator cycles through 7 SCAMPER categories
- Each card: category, question, example
- Participants respond with sticky notes (reuse `designStickyCanvas`)
- Group responses by category

### 3.8 Mind Map

**New component:** `designMindMap`

- Central node (HMW statement)
- Add branches/sub-branches
- Force-directed auto-layout (d3-force or custom)
- Participant color coding
- Collaborative real-time editing

### 3.9 Decision Matrix

**New component:** `designDecisionMatrix`

- Table: rows = solutions, columns = criteria
- Configurable criteria with optional weights
- Independent scoring per participant (1-5)
- Average scores displayed after all vote
- Auto-ranked by weighted total

### 3.10 Acceptance Criteria Builder

**New component:** `designAcceptanceCriteria`

- Given/When/Then template fields
- Add multiple AC items
- Approve/reject per item (facilitator)
- Approved ACs persist on Card__c for sprint execution

### Milestone 3 Deliverables

- [ ] Crazy 8s with private/reveal modes
- [ ] Affinity Diagram with dynamic clusters
- [ ] Journey Map with emotion curve
- [ ] Persona Builder
- [ ] Storyboard Builder with playback
- [ ] Stakeholder Map
- [ ] SCAMPER Prompts
- [ ] Mind Map with auto-layout
- [ ] Decision Matrix with weighted scoring
- [ ] Acceptance Criteria Builder

**Estimated complexity:** High but parallelizable. Each tool is independent. Multiple developers can work on different tools simultaneously.

---

## Milestone 4: Polish, Analytics & Facilitator UX

**Goal:** Make it production-ready with facilitator controls and design thinking analytics.

### 4.1 Facilitator Dashboard

- Session overview: which cards, which phase, participant count
- Phase controls: advance/return cards between phases
- Tool launcher: pick which tool to open for the group
- Activity feed: recent actions across the session

### 4.2 Design Thinking Pipeline View

Visual pipeline showing all cards and their DT phase:

```
Empathize    Define     Ideate    Prototype    Test      Refined
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────┐ ┌────────┐
│ Card A │ │ Card D │ │ Card F │ │ Card H   │ │Card J│ │ Card L │
│ Card B │ │ Card E │ │ Card G │ │          │ │      │ │ Card M │
│ Card C │ │        │ │        │ │          │ │      │ │        │
└────────┘ └────────┘ └────────┘ └──────────┘ └──────┘ └────────┘
```

- Drag cards between phases (with confirmation)
- Click card to see all artifacts from each phase
- Filter by session, assignee, date range

### 4.3 Card Artifact Timeline

On each card's detail panel, show a timeline of all design thinking artifacts:

```
Card: "Mobile checkout redesign"

📋 Empathize (Mar 15)
  └─ Empathy Map: 24 notes across 4 quadrants
  └─ 3 Interview summaries

📋 Define (Mar 16)
  └─ Affinity Diagram: 5 themes identified
  └─ HMW: "How might we reduce checkout steps for mobile users?"
  └─ Persona: "Busy Parent Pat"

📋 Ideate (Mar 17)
  └─ Brainstorm: 38 ideas generated
  └─ Crazy 8s: 5 participants, 40 sketches
  └─ Dot Vote Winner: "One-tap reorder from history"

📋 Prototype (Mar 18)
  └─ Storyboard: 6 frames
  └─ Figma link: figma.com/...

📋 Test (Mar 19)
  └─ Feedback Grid: 12 likes, 5 wishes, 3 questions
  └─ Decision: Graduate to sprint ✅
```

### 4.4 Design Thinking Analytics

New report components:

- **Funnel:** How many cards at each DT phase (conversion rate through pipeline)
- **Cycle time:** Average time per phase
- **Participation:** Notes/votes per participant per session
- **Iteration rate:** How often cards loop back to earlier phases
- **Tool usage:** Which tools get used most

### 4.5 Keyboard Shortcuts & Accessibility

- `N` — new sticky note
- `V` — vote mode
- `T` — toggle timer
- `←/→` — navigate phases
- Full ARIA labels on all interactive elements
- Screen reader support for canvas tools (text alternatives)

### Milestone 4 Deliverables

- [ ] Facilitator dashboard
- [ ] Pipeline view with drag between phases
- [ ] Card artifact timeline in detail panel
- [ ] Analytics charts (funnel, cycle time, participation)
- [ ] Keyboard shortcuts
- [ ] Accessibility audit and fixes
- [ ] Performance optimization for large sessions (50+ notes)

**Estimated complexity:** Medium. Mostly composition of existing components with new views.

---

## Build Order Summary

```
Milestone 1 (Foundation)     → 2-3 sprints
  Objects, events, session CRUD, phase pipeline, Redux extensions

Milestone 2 (Core Tools)     → 2-3 sprints
  Sticky canvas, dot voting, timer, 5 tools built on shared components

Milestone 3 (Advanced Tools) → 3-4 sprints (parallelizable)
  10 specialized tools, each independent

Milestone 4 (Polish)         → 2 sprints
  Facilitator UX, pipeline view, analytics, accessibility
```

**Total: ~9-12 sprints** for the full design thinking platform.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Real-time canvas performance | Throttle platform events to 10/sec. Batch note position updates. Use requestAnimationFrame for drag rendering. |
| Platform event limits (Salesforce daily limit) | Aggregate rapid interactions. Send position updates only on drop, not during drag. Use client-side interpolation. |
| HTML5 Canvas complexity | Keep sketch tools simple (pen, shapes, text). Don't try to build Figma. Link to external tools for high-fidelity work. |
| Large session data | Paginate notes/votes. Archive completed sessions. Lazy-load artifacts. |
| Facilitator bottleneck | Allow co-facilitators. Auto-advance timers. Sensible defaults so sessions work with minimal facilitation. |

---

## Navigation

- **[Part 1](2026-03-21-design-thinking-part1-vision.md)**: Vision & Process Overview
- **[Part 2](2026-03-21-design-thinking-part2-tools.md)**: Tools & Methods by Phase
- **Part 3** (this document): Technical Implementation Plan
- **[Part 4](2026-03-21-design-thinking-part4-architecture.md)**: Data Model & Component Architecture

---

**Document Version:** 1.0
**Maintainer:** Open Systems Foundation
