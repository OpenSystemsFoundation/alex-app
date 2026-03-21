# Design Thinking for Alex — Part 4: Data Model & Component Architecture

**Date:** March 21, 2026
**Series:** Design Thinking Implementation Plan (Part 4 of 4)

---

## Custom Object Specifications

All objects follow the existing namespace convention: **no `OpenSF__` prefix in metadata files**. The namespace is added automatically during deployment.

---

### DesignSession__c

Represents a facilitated design thinking session.

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Name | `Name` | Auto Number | `DS-{0000}` |
| Board | `Board__c` | Master-Detail(Board__c) | Which board this session belongs to |
| Status | `Status__c` | Picklist | `Planning | Active | Completed | Cancelled` |
| Current Phase | `CurrentPhase__c` | Picklist | `Empathize | Define | Ideate | Prototype | Test` |
| Facilitator | `Facilitator__c` | Lookup(User) | Session creator/facilitator |
| Title | `Title__c` | Text(255) | Session name/description |
| Scheduled Date | `ScheduledDate__c` | DateTime | When the session is planned |
| Started At | `StartedAt__c` | DateTime | When the session actually started |
| Ended At | `EndedAt__c` | DateTime | When the session ended |
| Participant Count | `ParticipantCount__c` | Number | Roll-up or tracked count |
| Notes | `Notes__c` | Long Text Area(32000) | Facilitator notes / session summary |

**Indexes:** Board__c, Status__c, Facilitator__c

---

### DesignSessionCard__c (Junction)

Links cards to sessions (many-to-many).

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Session | `DesignSession__c` | Master-Detail(DesignSession__c) | |
| Card | `Card__c` | Master-Detail(Card__c) | |
| Phase at Entry | `PhaseAtEntry__c` | Picklist | Phase when card entered session |
| Phase at Exit | `PhaseAtExit__c` | Picklist | Phase when card left session |
| Added Date | `AddedDate__c` | DateTime | When card was added to session |
| Graduated | `Graduated__c` | Checkbox | Did this card graduate as refined? |

**Uniqueness:** Compound unique on `DesignSession__c` + `Card__c`

---

### DesignNote__c

A sticky note, observation, HMW statement, or any text contribution.

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Session | `DesignSession__c` | Master-Detail(DesignSession__c) | |
| Card | `Card__c` | Lookup(Card__c) | Which card this note relates to |
| Author | `Author__c` | Lookup(User) | Who created it |
| Text | `Text__c` | Long Text Area(4000) | Note content |
| Zone | `Zone__c` | Text(100) | Canvas zone: `says`, `thinks`, `does`, `feels`, `likes`, `wishes`, `questions`, `ideas`, `unsorted`, `cluster:{name}` |
| Tool | `Tool__c` | Picklist | `EmpathyMap | AffinityDiagram | Brainstorm | FeedbackGrid | HMWBuilder | SCAMPER | MindMap` |
| Phase | `Phase__c` | Picklist | `Empathize | Define | Ideate | Prototype | Test` |
| Position X | `PositionX__c` | Number(6,2) | Canvas X coordinate (0-100 normalized) |
| Position Y | `PositionY__c` | Number(6,2) | Canvas Y coordinate (0-100 normalized) |
| Color | `Color__c` | Text(7) | Hex color code (participant color) |
| Parent Note | `ParentNote__c` | Lookup(DesignNote__c) | For "build on" connections and mind map branches |
| Vote Count | `VoteCount__c` | Number | Denormalized vote tally for display performance |
| Cluster | `Cluster__c` | Text(255) | Affinity diagram cluster name |
| Sort Order | `SortOrder__c` | Number | For ordered lists |

**Indexes:** DesignSession__c, Card__c, Tool__c, Phase__c

---

### DesignVote__c

A single vote by a participant on a note or idea.

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Session | `DesignSession__c` | Master-Detail(DesignSession__c) | |
| Note | `DesignNote__c` | Lookup(DesignNote__c) | What was voted on |
| Voter | `Voter__c` | Lookup(User) | Who voted |
| Vote Type | `VoteType__c` | Picklist | `Dot | Decision | Score` |
| Score | `Score__c` | Number(2,0) | For decision matrix (1-5) |
| Round | `Round__c` | Number | Voting round (for re-votes) |

**Uniqueness:** Compound unique on `DesignSession__c` + `DesignNote__c` + `Voter__c` + `Round__c` (one vote per person per note per round)

---

### DesignArtifact__c

Exported outputs: personas, journey maps, sketches, snapshots.

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Session | `DesignSession__c` | Lookup(DesignSession__c) | |
| Card | `Card__c` | Lookup(Card__c) | |
| Type | `Type__c` | Picklist | `Persona | JourneyMap | Storyboard | Sketch | Snapshot | ExternalLink | AcceptanceCriteria | InterviewNotes` |
| Title | `Title__c` | Text(255) | Artifact name |
| Content | `Content__c` | Long Text Area(131072) | JSON payload for structured data |
| External URL | `ExternalURL__c` | URL | Link to Figma, etc. |
| Phase | `Phase__c` | Picklist | Which DT phase produced this |
| Tool | `Tool__c` | Picklist | Which tool produced this |

**Attachments:** Use Salesforce `ContentVersion` (Files) for images/sketches linked via `ContentDocumentLink` to the artifact record.

---

### Card__c Extensions

New fields on the existing `Card__c` object:

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Design Phase | `DesignPhase__c` | Picklist | `Empathize | Define | Ideate | Prototype | Test | Refined` (default: blank = no DT process) |
| Active Session | `ActiveDesignSession__c` | Lookup(DesignSession__c) | Current session, if any |
| HMW Statement | `HowMightWe__c` | Long Text Area(1000) | The winning HMW from Define phase |
| Design Score | `DesignScore__c` | Number(4,1) | Aggregate score from decision matrix |

---

### DesignSessionEvent__e (Platform Event)

| Field | API Name | Type | Details |
|-------|----------|------|---------|
| Event Type | `EventType__c` | Text(50) | See event types below |
| Payload | `Payload__c` | Long Text Area(131072) | JSON |
| Session ID | `SessionId__c` | Text(18) | DesignSession__c record ID |
| Board ID | `BoardId__c` | Text(18) | For routing |
| Client ID | `ClientId__c` | Text(36) | UUID for echo prevention |
| Client Request ID | `ClientRequestId__c` | Text(36) | UUID for request tracking |

**Event Types:**

```
note_added        — new sticky note created
note_updated      — note text changed
note_moved        — note position/zone changed
note_deleted      — note removed
vote_cast         — participant voted
vote_retracted    — participant removed vote
phase_changed     — session moved to new phase
tool_changed      — active tool switched
timer_started     — countdown started
timer_stopped     — countdown stopped/paused
timer_expired     — countdown hit zero
participant_joined  — user joined session
participant_left    — user left session
session_started   — session activated
session_ended     — session completed
card_phase_advanced — card moved to next DT phase
card_phase_returned — card sent back to earlier phase
artifact_saved    — artifact exported
```

---

## LWC Component Architecture

### Component Tree

```
designThinkingView (top-level container)
│
├── designSessionList
│   ├── List of sessions with status badges
│   ├── Create session button + modal
│   └── Join session action
│
├── designSessionBoard (active session workspace)
│   │
│   ├── designSessionHeader
│   │   ├── Session title + status
│   │   ├── Participant avatars (designParticipantBar)
│   │   └── Timer (designTimer)
│   │
│   ├── designPhaseNav
│   │   ├── Phase tabs: Empathize | Define | Ideate | Prototype | Test
│   │   ├── Active phase highlighted
│   │   ├── Card count per phase
│   │   └── Advance/return controls (facilitator only)
│   │
│   ├── designToolPicker
│   │   ├── Available tools for current phase
│   │   └── Tool selection dispatches SET_ACTIVE_TOOL
│   │
│   └── designToolCanvas (renders active tool)
│       │
│       ├── Phase 1 - Empathize:
│       │   ├── designEmpathyMap → uses designStickyCanvas (4 zones)
│       │   ├── designInterviewNotes → structured form
│       │   └── designJourneyMap → custom horizontal timeline
│       │
│       ├── Phase 2 - Define:
│       │   ├── designAffinityDiagram → extends designStickyCanvas
│       │   ├── designHmwBuilder → designStickyCanvas + designDotVoting
│       │   ├── designPersonaBuilder → structured form
│       │   └── designStakeholderMap → 2x2 grid canvas
│       │
│       ├── Phase 3 - Ideate:
│       │   ├── designBrainstormCanvas → uses designStickyCanvas (1 zone)
│       │   ├── designCrazy8s → 8-slot private/reveal canvas
│       │   ├── designScamperPrompts → card deck + designStickyCanvas
│       │   ├── designMindMap → force-directed graph
│       │   └── designDotVoting → standalone voting
│       │
│       ├── Phase 4 - Prototype:
│       │   ├── designStoryboard → sequential frame editor
│       │   ├── designSketchCanvas → HTML5 Canvas drawing
│       │   ├── designExternalLinks → link manager
│       │   └── designAcceptanceCriteria → Given/When/Then form
│       │
│       └── Phase 5 - Test:
│           ├── designFeedbackGrid → uses designStickyCanvas (4 zones)
│           ├── designDecisionMatrix → scoring table
│           └── designIterationDecision → vote on card disposition
│
└── designCardPipeline (visual pipeline view)
    ├── Phase columns with card counts
    ├── Drag cards between phases
    └── Click to see card artifact timeline
```

### Shared / Reusable Components

```
designStickyCanvas
├── Props: zones (array of {id, label}), notes, readOnly
├── Events: noteadd, notemove, noteupdate, notedelete
├── Behavior: renders zones, handles drag between zones, real-time sync
└── Used by: EmpathyMap, Brainstorm, FeedbackGrid, HMWBuilder, SCAMPER

designDotVoting
├── Props: items (notes/ideas to vote on), maxVotes, currentRound
├── Events: votecast, voteretract, votingreset
├── Behavior: vote placement, count display, results ranking
└── Used by: HMWBuilder, Crazy8s (after reveal), standalone

designTimer
├── Props: duration, presets
├── Events: timerstart, timerstop, timerexpire
├── Behavior: countdown, sync via platform events, alerts
└── Used by: all tools (optional, facilitator-triggered)

designParticipantBar
├── Props: participants, currentUser
├── Behavior: avatar display, activity indicators, join/leave
└── Used by: designSessionHeader

designStickyNote (individual note)
├── Props: text, color, authorName, voteCount, editable
├── Events: edit, delete, vote
├── Behavior: inline edit, drag handle, vote dots display
└── Used by: designStickyCanvas
```

---

## Apex Backend Architecture

### Controller (thin facade)

```apex
public with sharing class DesignSessionController {

    // Session CRUD
    @AuraEnabled public static DesignSessionDTO.SessionDTO createSession(Id boardId, String title) {}
    @AuraEnabled public static DesignSessionDTO.SessionDTO getSession(Id sessionId) {}
    @AuraEnabled public static List<DesignSessionDTO.SessionDTO> getSessionsByBoard(Id boardId) {}
    @AuraEnabled public static void startSession(Id sessionId) {}
    @AuraEnabled public static void endSession(Id sessionId) {}

    // Cards in session
    @AuraEnabled public static void addCardToSession(Id sessionId, Id cardId) {}
    @AuraEnabled public static void removeCardFromSession(Id sessionId, Id cardId) {}
    @AuraEnabled public static void advanceCardPhase(Id cardId, String newPhase) {}
    @AuraEnabled public static void returnCardToPhase(Id cardId, String targetPhase) {}

    // Notes
    @AuraEnabled public static DesignSessionDTO.NoteDTO createNote(Id sessionId, Id cardId, String text, String zone, String tool, String phase, Decimal posX, Decimal posY) {}
    @AuraEnabled public static void updateNote(Id noteId, String text, String zone, Decimal posX, Decimal posY) {}
    @AuraEnabled public static void deleteNote(Id noteId) {}
    @AuraEnabled public static List<DesignSessionDTO.NoteDTO> getNotesBySession(Id sessionId, String tool, String phase) {}

    // Votes
    @AuraEnabled public static void castVote(Id sessionId, Id noteId, String voteType, Integer score, Integer round) {}
    @AuraEnabled public static void retractVote(Id sessionId, Id noteId, Integer round) {}
    @AuraEnabled public static List<DesignSessionDTO.VoteDTO> getVotesBySession(Id sessionId, Integer round) {}

    // Artifacts
    @AuraEnabled public static DesignSessionDTO.ArtifactDTO saveArtifact(Id sessionId, Id cardId, String type, String title, String content, String phase, String tool) {}
    @AuraEnabled public static List<DesignSessionDTO.ArtifactDTO> getArtifactsByCard(Id cardId) {}
}
```

### Service Layer

```apex
public with sharing class DesignSessionService {

    // Session lifecycle
    public static OpenSF__DesignSession__c createSession(Id boardId, String title) {}
    public static void startSession(Id sessionId) {}
    public static void endSession(Id sessionId) {}

    // Phase management
    public static void advanceCardPhase(Id cardId, String newPhase) {}
    public static void returnCardToPhase(Id cardId, String targetPhase) {}
    public static void graduateCard(Id cardId) {} // sets NeedsRefinement = false, DesignPhase = Refined

    // Notes with vote count denormalization
    public static OpenSF__DesignNote__c createNote(...) {}
    public static void recalculateVoteCounts(Set<Id> noteIds) {}

    // Validation
    public static void validatePhaseTransition(String currentPhase, String targetPhase) {}
    public static void validateSessionStatus(Id sessionId, String requiredStatus) {}
}
```

### Selector Layer

```apex
public with sharing class DesignSessionSelector {

    public static List<OpenSF__DesignSession__c> getSessionsByBoardId(Id boardId) {}
    public static OpenSF__DesignSession__c getSessionById(Id sessionId) {}
    public static List<OpenSF__DesignNote__c> getNotesBySessionAndTool(Id sessionId, String tool, String phase) {}
    public static List<OpenSF__DesignVote__c> getVotesBySessionAndRound(Id sessionId, Integer round) {}
    public static List<OpenSF__DesignArtifact__c> getArtifactsByCardId(Id cardId) {}
    public static List<OpenSF__DesignSessionCard__c> getCardsBySessionId(Id sessionId) {}
    public static Map<String, Integer> getPhaseCountsByBoardId(Id boardId) {} // for pipeline view
}
```

### DTO Layer

```apex
public class DesignSessionDTO {

    public class SessionDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String boardId;
        @AuraEnabled public String title;
        @AuraEnabled public String status;
        @AuraEnabled public String currentPhase;
        @AuraEnabled public String facilitatorId;
        @AuraEnabled public String facilitatorName;
        @AuraEnabled public Datetime scheduledDate;
        @AuraEnabled public Datetime startedAt;
        @AuraEnabled public Datetime endedAt;
        @AuraEnabled public Integer participantCount;
        @AuraEnabled public List<CardDTO> cards;
    }

    public class NoteDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String cardId;
        @AuraEnabled public String authorId;
        @AuraEnabled public String authorName;
        @AuraEnabled public String text;
        @AuraEnabled public String zone;
        @AuraEnabled public String tool;
        @AuraEnabled public String phase;
        @AuraEnabled public Decimal positionX;
        @AuraEnabled public Decimal positionY;
        @AuraEnabled public String color;
        @AuraEnabled public String parentNoteId;
        @AuraEnabled public Integer voteCount;
        @AuraEnabled public String cluster;
    }

    public class VoteDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String noteId;
        @AuraEnabled public String voterId;
        @AuraEnabled public String voterName;
        @AuraEnabled public String voteType;
        @AuraEnabled public Integer score;
        @AuraEnabled public Integer round;
    }

    public class ArtifactDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String sessionId;
        @AuraEnabled public String cardId;
        @AuraEnabled public String type;
        @AuraEnabled public String title;
        @AuraEnabled public String content; // JSON
        @AuraEnabled public String externalUrl;
        @AuraEnabled public String phase;
        @AuraEnabled public String tool;
        @AuraEnabled public Datetime createdDate;
    }

    // Conversion methods
    public static SessionDTO fromSession(OpenSF__DesignSession__c session) {}
    public static NoteDTO fromNote(OpenSF__DesignNote__c note) {}
    public static VoteDTO fromVote(OpenSF__DesignVote__c vote) {}
    public static ArtifactDTO fromArtifact(OpenSF__DesignArtifact__c artifact) {}
}
```

---

## Redux Store — Full Design Thinking Slice

```javascript
// New action types (designActionTypes.js)
export const DESIGN_ACTION_TYPES = {
    // Session
    SET_SESSIONS: 'design/SET_SESSIONS',
    SET_ACTIVE_SESSION: 'design/SET_ACTIVE_SESSION',
    UPDATE_SESSION: 'design/UPDATE_SESSION',
    CLEAR_SESSION: 'design/CLEAR_SESSION',

    // Phase
    SET_CURRENT_PHASE: 'design/SET_CURRENT_PHASE',
    UPDATE_CARD_PHASE: 'design/UPDATE_CARD_PHASE',

    // Tool
    SET_ACTIVE_TOOL: 'design/SET_ACTIVE_TOOL',

    // Notes
    SET_NOTES: 'design/SET_NOTES',
    ADD_NOTE: 'design/ADD_NOTE',
    UPDATE_NOTE: 'design/UPDATE_NOTE',
    MOVE_NOTE: 'design/MOVE_NOTE',
    DELETE_NOTE: 'design/DELETE_NOTE',

    // Votes
    SET_VOTES: 'design/SET_VOTES',
    ADD_VOTE: 'design/ADD_VOTE',
    REMOVE_VOTE: 'design/REMOVE_VOTE',
    RESET_VOTES: 'design/RESET_VOTES',

    // Artifacts
    SET_ARTIFACTS: 'design/SET_ARTIFACTS',
    ADD_ARTIFACT: 'design/ADD_ARTIFACT',

    // Timer
    START_TIMER: 'design/START_TIMER',
    TICK_TIMER: 'design/TICK_TIMER',
    STOP_TIMER: 'design/STOP_TIMER',

    // Participants
    SET_PARTICIPANTS: 'design/SET_PARTICIPANTS',
    ADD_PARTICIPANT: 'design/ADD_PARTICIPANT',
    REMOVE_PARTICIPANT: 'design/REMOVE_PARTICIPANT',
    UPDATE_PARTICIPANT_ACTIVITY: 'design/UPDATE_PARTICIPANT_ACTIVITY'
};
```

```javascript
// New reducer (designReducer.js)
const initialDesignState = {
    sessions: [],
    activeSession: null,
    currentPhase: null,
    activeTool: null,
    notes: [],
    votes: [],
    artifacts: [],
    participants: [],
    timer: {
        running: false,
        duration: 0,
        remaining: 0
    },
    isLoading: false,
    error: null
};

export function designReducer(state = initialDesignState, action) {
    switch (action.type) {
        case DESIGN_ACTION_TYPES.SET_ACTIVE_SESSION:
            return { ...state, activeSession: action.payload, error: null };

        case DESIGN_ACTION_TYPES.ADD_NOTE:
            return { ...state, notes: [...state.notes, action.payload] };

        case DESIGN_ACTION_TYPES.MOVE_NOTE:
            return {
                ...state,
                notes: state.notes.map(n =>
                    n.id === action.payload.noteId
                        ? { ...n, zone: action.payload.zone, positionX: action.payload.x, positionY: action.payload.y }
                        : n
                )
            };

        case DESIGN_ACTION_TYPES.ADD_VOTE:
            return {
                ...state,
                votes: [...state.votes, action.payload],
                notes: state.notes.map(n =>
                    n.id === action.payload.noteId
                        ? { ...n, voteCount: (n.voteCount || 0) + 1 }
                        : n
                )
            };

        case DESIGN_ACTION_TYPES.TICK_TIMER:
            return {
                ...state,
                timer: {
                    ...state.timer,
                    remaining: Math.max(0, state.timer.remaining - 1),
                    running: state.timer.remaining > 1
                }
            };

        // ... other cases follow same immutable update pattern
        default:
            return state;
    }
}
```

```javascript
// New selectors (designSelectors.js)
export const getDesignSessions = (state) => state.design.sessions;
export const getActiveDesignSession = (state) => state.design.activeSession;
export const getCurrentPhase = (state) => state.design.currentPhase;
export const getActiveTool = (state) => state.design.activeTool;

export const getNotesByZone = (state, zone) =>
    state.design.notes.filter(n => n.zone === zone);

export const getNotesByTool = (state, tool) =>
    state.design.notes.filter(n => n.tool === tool);

export const getVotesByNote = (state, noteId) =>
    state.design.votes.filter(v => v.noteId === noteId);

export const getRemainingVotes = (state, voterId, maxVotes) => {
    const castVotes = state.design.votes.filter(v => v.voterId === voterId).length;
    return maxVotes - castVotes;
};

export const getNotesRankedByVotes = (state) =>
    [...state.design.notes].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

export const getTimer = (state) => state.design.timer;
export const getParticipants = (state) => state.design.participants;

export const getArtifactsByCard = (state, cardId) =>
    state.design.artifacts.filter(a => a.cardId === cardId);

export const getArtifactsByPhase = (state, phase) =>
    state.design.artifacts.filter(a => a.phase === phase);

export const getPhaseCounts = (state) => {
    const cards = state.design.activeSession?.cards || [];
    return cards.reduce((acc, card) => {
        const phase = card.designPhase || 'unassigned';
        acc[phase] = (acc[phase] || 0) + 1;
        return acc;
    }, {});
};
```

---

## Event Handler Integration

Extend existing `eventHandler.js` pattern:

```javascript
// In subscriptionEventHandler.js — add DesignSessionEvent__e subscription

_handleDesignSessionEvent(event) {
    const { EventType__c, Payload__c, ClientId__c, SessionId__c } = event;

    // Echo prevention — same pattern as existing card events
    if (ClientId__c === this.clientId) return;

    // Only process events for our active session
    if (SessionId__c !== this.store.getState().design.activeSession?.id) return;

    const payload = JSON.parse(Payload__c);

    switch (EventType__c) {
        case 'note_added':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.ADD_NOTE, payload });
            break;
        case 'note_moved':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.MOVE_NOTE, payload });
            break;
        case 'note_updated':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.UPDATE_NOTE, payload });
            break;
        case 'note_deleted':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.DELETE_NOTE, payload });
            break;
        case 'vote_cast':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.ADD_VOTE, payload });
            break;
        case 'phase_changed':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.SET_CURRENT_PHASE, payload: payload.phase });
            break;
        case 'timer_started':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.START_TIMER, payload });
            break;
        case 'timer_stopped':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.STOP_TIMER });
            break;
        case 'participant_joined':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.ADD_PARTICIPANT, payload });
            break;
        case 'participant_left':
            this.store.dispatch({ type: DESIGN_ACTION_TYPES.REMOVE_PARTICIPANT, payload });
            break;
    }
}
```

---

## File Structure (New Files)

```
force-app/main/default/
├── objects/
│   ├── DesignSession__c/
│   │   ├── DesignSession__c.object-meta.xml
│   │   └── fields/
│   │       ├── Board__c.field-meta.xml
│   │       ├── Status__c.field-meta.xml
│   │       ├── CurrentPhase__c.field-meta.xml
│   │       ├── Facilitator__c.field-meta.xml
│   │       ├── Title__c.field-meta.xml
│   │       ├── ScheduledDate__c.field-meta.xml
│   │       ├── StartedAt__c.field-meta.xml
│   │       ├── EndedAt__c.field-meta.xml
│   │       ├── ParticipantCount__c.field-meta.xml
│   │       └── Notes__c.field-meta.xml
│   ├── DesignSessionCard__c/
│   │   ├── DesignSessionCard__c.object-meta.xml
│   │   └── fields/ ...
│   ├── DesignNote__c/
│   │   ├── DesignNote__c.object-meta.xml
│   │   └── fields/ ...
│   ├── DesignVote__c/
│   │   ├── DesignVote__c.object-meta.xml
│   │   └── fields/ ...
│   ├── DesignArtifact__c/
│   │   ├── DesignArtifact__c.object-meta.xml
│   │   └── fields/ ...
│   └── Card__c/fields/
│       ├── DesignPhase__c.field-meta.xml (NEW)
│       ├── ActiveDesignSession__c.field-meta.xml (NEW)
│       ├── HowMightWe__c.field-meta.xml (NEW)
│       └── DesignScore__c.field-meta.xml (NEW)
│
├── platformevents/
│   └── DesignSessionEvent__e/
│       ├── DesignSessionEvent__e.object-meta.xml
│       └── fields/ ...
│
├── classes/
│   ├── DesignSessionController.cls
│   ├── DesignSessionController.cls-meta.xml
│   ├── DesignSessionService.cls
│   ├── DesignSessionService.cls-meta.xml
│   ├── DesignSessionSelector.cls
│   ├── DesignSessionSelector.cls-meta.xml
│   ├── DesignSessionDTO.cls
│   ├── DesignSessionDTO.cls-meta.xml
│   ├── DesignSessionTriggerHandler.cls
│   ├── DesignSessionTriggerHandler.cls-meta.xml
│   └── tests/
│       ├── DesignSessionServiceTest.cls
│       ├── DesignSessionControllerTest.cls
│       └── DesignSessionSelectorTest.cls
│
└── lwc/
    ├── designThinkingView/
    ├── designSessionList/
    ├── designSessionBoard/
    ├── designSessionHeader/
    ├── designPhaseNav/
    ├── designToolPicker/
    ├── designToolCanvas/
    ├── designCardPipeline/
    ├── designStickyCanvas/        (shared)
    ├── designStickyNote/          (shared)
    ├── designDotVoting/           (shared)
    ├── designTimer/               (shared)
    ├── designParticipantBar/      (shared)
    ├── designEmpathyMap/
    ├── designInterviewNotes/
    ├── designJourneyMap/
    ├── designAffinityDiagram/
    ├── designHmwBuilder/
    ├── designPersonaBuilder/
    ├── designStakeholderMap/
    ├── designBrainstormCanvas/
    ├── designCrazy8s/
    ├── designScamperPrompts/
    ├── designMindMap/
    ├── designStoryboard/
    ├── designSketchCanvas/
    ├── designExternalLinks/
    ├── designAcceptanceCriteria/
    ├── designFeedbackGrid/
    ├── designDecisionMatrix/
    └── designIterationDecision/
```

---

## Navigation

- **[Part 1](2026-03-21-design-thinking-part1-vision.md)**: Vision & Process Overview
- **[Part 2](2026-03-21-design-thinking-part2-tools.md)**: Tools & Methods by Phase
- **[Part 3](2026-03-21-design-thinking-part3-implementation.md)**: Technical Implementation Plan
- **Part 4** (this document): Data Model & Component Architecture

---

**Document Version:** 1.0
**Maintainer:** Open Systems Foundation
