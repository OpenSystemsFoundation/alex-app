# Design Thinking for Alex — Part 2: Tools & Methods by Phase

**Date:** March 21, 2026
**Series:** Design Thinking Implementation Plan (Part 2 of 4)

---

## Tool Philosophy

Each tool is a **single-page collaborative LWC experience** — a focused canvas that multiple users interact with simultaneously via platform events. Tools are composable: a facilitator picks which tools to use in each phase, not a rigid sequence.

Every tool follows the same UX pattern:

```
┌─────────────────────────────────────────────────┐
│  Tool Header: Name + Card Title + Timer (opt)   │
├─────────────────────────────────────────────────┤
│                                                 │
│            Interactive Canvas Area              │
│     (sticky notes, grids, sketches, votes)      │
│                                                 │
├─────────────────────────────────────────────────┤
│  Participant Avatars    │  Actions (Save/Next)   │
└─────────────────────────────────────────────────┘
```

---

## Phase 1: Empathize Tools

### 1.1 Empathy Map Canvas

A four-quadrant board where participants add sticky notes simultaneously.

```
┌──────────────────┬──────────────────┐
│                  │                  │
│      SAYS        │     THINKS       │
│   "Direct        │   "Internal      │
│    quotes"       │    thoughts"     │
│                  │                  │
├──────────────────┼──────────────────┤
│                  │                  │
│      DOES        │     FEELS        │
│   "Observable    │   "Emotions,     │
│    actions"      │    frustrations" │
│                  │                  │
└──────────────────┴──────────────────┘
```

**Implementation:**
- Real-time sticky note placement via platform events
- Each participant gets a distinct color
- Notes are draggable between quadrants
- Export as summary text attached to the card

**Data:** Each sticky = a `DesignNote__c` record with quadrant, text, author, position.

---

### 1.2 Interview Notes

Structured form for capturing user interview insights.

**Fields:**
- Interviewee (name/role)
- Context (where, when)
- Key quotes (text blocks)
- Observations (what you noticed)
- Surprises (what was unexpected)
- Tags (for later affinity clustering)

**Implementation:** Simple rich-text form that saves to `DesignArtifact__c` linked to the card. Multiple team members can add separate interview records.

---

### 1.3 Journey Map

A horizontal timeline canvas showing user experience across touchpoints.

```
Stages:   [ Discover ] → [ Research ] → [ Purchase ] → [ Use ] → [ Support ]
              😊              😐              😠           😊          😐
Actions:  "Google it"    "Compare"     "Checkout"    "Unbox"    "Call help"
Thoughts: "Need this"   "Too many"    "Why so slow"  "Nice!"   "Where's FAQ"
Pain pts:     -          "Overwhelm"   "3 clicks"      -        "Hold music"
```

**Implementation:**
- Configurable stage columns (user defines the journey stages)
- Rows: Actions, Thoughts, Pain Points, Opportunities
- Emotion curve plotted as a draggable line across stages
- Collaborative — multiple users add notes to the same journey

---

## Phase 2: Define Tools

### 2.1 Affinity Diagram

Drag-and-drop clustering of observations into themes.

**Flow:**
1. Import sticky notes from Empathy phase (or create new ones)
2. Participants silently drag notes into clusters (no talking — IDEO rule)
3. Name each cluster with a theme header
4. Facilitator locks clusters when done

```
┌─────────────────────────────────────────────────────────┐
│  Unsorted Notes (top area)                              │
│  [note] [note] [note] [note] [note] [note]              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─Theme: Access──┐  ┌─Theme: Speed──┐  ┌─Theme: ──┐  │
│  │ [note]         │  │ [note]        │  │           │  │
│  │ [note]         │  │ [note]        │  │  (empty)  │  │
│  │ [note]         │  │               │  │           │  │
│  └────────────────┘  └───────────────┘  └───────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- Free-form canvas with drop zones
- Cluster auto-expands as notes are added
- Real-time sync — see others dragging in real time
- Theme naming with inline edit

---

### 2.2 "How Might We" Builder

Transforms problem observations into opportunity statements.

**Formula:** *How might we [action] for [user] so that [outcome]?*

**Flow:**
1. Display top themes from Affinity Diagram
2. Each participant writes HMW statements (private first, then reveal — brainwriting style)
3. All HMW statements displayed on a board
4. Dot voting to select the strongest HMW

**Implementation:**
- Text input with HMW template/prompt
- Private → Reveal toggle (facilitator controls reveal timing)
- Inline dot voting on each HMW statement
- Winning HMW becomes the card's problem statement

---

### 2.3 Persona Builder

Create a composite user persona from empathy data.

**Template:**
```
┌──────────────────────────────────────────┐
│  [Avatar]   Name: ___________            │
│             Role: ___________            │
│             Age:  ___________            │
├──────────────────────────────────────────┤
│  Goals              │  Frustrations      │
│  • ___________      │  • ___________     │
│  • ___________      │  • ___________     │
├──────────────────────────────────────────┤
│  Quote: "________________________________│
│  ________________________________________│
├──────────────────────────────────────────┤
│  Bio: ___________________________________│
│  ________________________________________│
└──────────────────────────────────────────┘
```

**Implementation:** Structured form with collaborative editing. Personas are stored as `DesignArtifact__c` records and can be linked to multiple cards.

---

### 2.4 Stakeholder Map

Power/interest grid for identifying key stakeholders.

```
         High Power
              │
    Manage    │    Engage
    Closely   │    Actively
              │
 ─────────────┼───────────── High Interest
              │
    Monitor   │    Keep
    (minimal) │    Informed
              │
         Low Power
```

**Implementation:**
- 2x2 draggable grid canvas
- Stakeholder cards placed on the grid
- Each card: name, role, notes
- Collaborative — multiple users place and discuss

---

## Phase 3: Ideate Tools

### 3.1 Brainstorm Canvas

Open brainstorming board with IDEO's 7 rules displayed as reminders.

**IDEO's 7 Rules (shown as banner):**
1. Defer judgment
2. Encourage wild ideas
3. Build on the ideas of others
4. Stay focused on the topic
5. One conversation at a time
6. Be visual
7. Go for quantity

**Implementation:**
- Infinite canvas with sticky notes
- Each participant's notes in their color
- "Build on" action — link your note to someone else's (shows a connector line)
- Running count of total ideas (gamification: "42 ideas and counting!")
- Optional timer for timeboxed rounds

---

### 3.2 Crazy 8s

Timed rapid sketching exercise — 8 ideas in 8 minutes.

**Flow:**
1. Facilitator starts the timer (8 minutes, with 1-minute per-slot alerts)
2. Each participant sees 8 sketch slots on their screen (private)
3. Quick sketch or text in each slot (60 seconds each)
4. Timer ends → all sketches revealed simultaneously
5. Brief presentation round → dot voting

```
┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│  5  │  6  │  7  │  8  │
│     │     │     │     │
└─────┴─────┴─────┴─────┘
  Timer: ██████░░ 4:32 remaining
```

**Implementation:**
- Canvas drawing tool (HTML5 Canvas) or text input per slot
- Countdown timer synced via platform events
- Private mode during sketching, reveal mode after
- Gallery view showing all participants' 8s side by side

---

### 3.3 Dot Voting

Democratic prioritization of ideas.

**Flow:**
1. Ideas displayed as cards on a board
2. Each participant gets N votes (configurable, default 3)
3. Tap/click to place a dot on an idea (real-time, see others voting)
4. Results ranked by vote count

**Implementation:**
- Vote records: `DesignVote__c` (participant, idea, session)
- Real-time vote count animation
- Remaining votes indicator per participant
- Results view with bar chart ranking
- Facilitator can reset votes for re-voting rounds

---

### 3.4 SCAMPER Prompts

Structured ideation using the SCAMPER framework.

**Implementation:**
- Card-based prompt system — facilitator cycles through SCAMPER categories
- Each prompt shows: category name, guiding question, example
- Participants respond with sticky notes per prompt
- Prompts:
  - **Substitute:** What can you replace?
  - **Combine:** What can you merge?
  - **Adapt:** What can you borrow from elsewhere?
  - **Modify:** What can you change (size, shape, color)?
  - **Put to other use:** How else could this be used?
  - **Eliminate:** What can you remove?
  - **Rearrange:** What if you reversed the order?

---

### 3.5 Mind Map

Radial idea exploration starting from the HMW statement.

**Implementation:**
- Central node = HMW statement
- Participants add branches and sub-branches
- Real-time collaborative editing
- Auto-layout with force-directed positioning
- Color-coded by participant

---

## Phase 4: Prototype Tools

### 4.1 Storyboard Builder

Sequential frame-by-frame narrative of the solution.

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Frame 1  │  │ Frame 2  │  │ Frame 3  │  │ Frame 4  │
│ [sketch] │→ │ [sketch] │→ │ [sketch] │→ │ [sketch] │
│          │  │          │  │          │  │          │
│ Caption: │  │ Caption: │  │ Caption: │  │ Caption: │
│ "User    │  │ "Opens   │  │ "Sees    │  │ "Clicks  │
│  arrives" │  │  app"    │  │  option" │  │  done"   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

**Implementation:**
- Add/remove/reorder frames
- Each frame: sketch canvas (HTML5 Canvas) + caption text
- Collaborative — different participants can work on different frames
- Playback mode — auto-advance through frames like a slideshow

---

### 4.2 Sketch Canvas

Free-form drawing tool for quick visual prototyping.

**Implementation:**
- HTML5 Canvas with drawing tools (pen, shapes, text, eraser, color)
- Layers for multiple contributors
- Export as image attached to card
- Simple — not trying to replace Figma, just quick sketches

---

### 4.3 External Link Hub

Central place to link external prototypes and assets.

**Fields:**
- Link URL (Figma, InVision, CodePen, etc.)
- Link type (Figma / Sketch / CodePen / Other)
- Description
- Preview thumbnail (auto-fetched or manual upload)
- Added by / date

---

### 4.4 Acceptance Criteria Builder

Collaborative AC drafting using Given/When/Then format.

**Template:**
```
Given [context]
When [action]
Then [expected result]
```

**Implementation:**
- Add multiple AC items per card
- Each AC: Given/When/Then fields or free-text
- Collaborative — team members suggest, facilitator approves
- Approved ACs persist on the card through to sprint execution

---

## Phase 5: Test Tools

### 5.1 Feedback Capture Grid

Structured feedback collection from test sessions.

```
┌──────────────────┬──────────────────┐
│                  │                  │
│     LIKES        │    WISHES        │
│   "What worked"  │  "What to change"│
│                  │                  │
├──────────────────┼──────────────────┤
│                  │                  │
│    QUESTIONS     │     IDEAS        │
│  "What's unclear"│  "New thoughts"  │
│                  │                  │
└──────────────────┴──────────────────┘
```

**Implementation:**
- Same sticky-note canvas as Empathy Map (shared component)
- Four quadrants: Likes, Wishes, Questions, Ideas
- Collaborative real-time note placement
- Export summary as test results on the card

---

### 5.2 Decision Matrix

Score solutions against criteria to decide next steps.

```
                  │ Feasibility │ Impact │ User Value │ Total
──────────────────┼─────────────┼────────┼────────────┼──────
Solution A        │     4       │   5    │     3      │  12
Solution B        │     3       │   3    │     5      │  11
Solution C        │     5       │   2    │     4      │  11
```

**Implementation:**
- Configurable criteria columns
- Participants score independently (1-5)
- Scores averaged across participants
- Auto-ranked by total score
- Facilitator can weight criteria

---

### 5.3 Iteration Decision

Final gate: what happens to the card after testing?

**Options:**
- **Iterate** → Send back to a specific phase (Empathize/Define/Ideate/Prototype)
- **Refine** → Minor tweaks needed, stays in Test phase
- **Graduate** → Mark as refined, ready for sprint planning
- **Park** → Good idea but not now, move to icebox

**Implementation:**
- Voting mechanism — team votes on disposition
- If "Iterate," facilitator picks which phase to return to
- If "Graduate," card gets `NeedsRefinement__c = false` and is sprint-ready

---

## Cross-Phase Tools

These tools are available in any phase:

### Timer

- Configurable countdown (1-60 minutes)
- Synced across all participants via platform events
- Audio/visual alert when time's up
- Presets: 1 min, 2 min, 5 min, 8 min, 15 min

### Participant Presence

- Show who's currently in the session
- Avatar + name + "typing/drawing" indicator
- Join/leave notifications

### Comment Thread

- Threaded discussion attached to the current activity
- @mentions for other participants
- Persisted on the card as activity history

### Export / Snapshot

- Capture current canvas state as an image
- Save structured data as a `DesignArtifact__c` record
- Generate summary text from all phase outputs

---

## Navigation

- **[Part 1](2026-03-21-design-thinking-part1-vision.md)**: Vision & Process Overview
- **Part 2** (this document): Tools & Methods by Phase
- **[Part 3](2026-03-21-design-thinking-part3-implementation.md)**: Technical Implementation Plan
- **[Part 4](2026-03-21-design-thinking-part4-architecture.md)**: Data Model & Component Architecture

---

**Document Version:** 1.0
**Maintainer:** Open Systems Foundation
