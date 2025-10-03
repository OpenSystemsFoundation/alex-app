# Kanban Board Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Lightning Web Components                  │
│                                                                   │
│  ┌──────────────────────────┐    ┌───────────────────────────┐ │
│  │   kanbanBoard (Main)     │    │  kanbanCardDetail (Modal) │ │
│  │                          │    │                           │ │
│  │  • Drag & Drop UI        │───▶│  • Edit Card Details      │ │
│  │  • Optimistic Updates    │    │  • User Assignment        │ │
│  │  • Platform Event Sub    │    │  • Delete Cards           │ │
│  └──────────────────────────┘    └───────────────────────────┘ │
│              │                                                    │
└──────────────┼────────────────────────────────────────────────────┘
               │
               │ Wire Service / Apex Calls
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Apex Controllers                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          KanbanBoardController (Main Logic)                │ │
│  │                                                            │ │
│  │  • getBoardData() [cacheable]                             │ │
│  │  • moveCard()                                             │ │
│  │  • createCard()                                           │ │
│  │  • updateCard()                                           │ │
│  │  • deleteCard()                                           │ │
│  │  • moveColumn()                                           │ │
│  │  • searchUsers()                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│              │                              │                     │
│              │                              │                     │
│  ┌───────────▼─────────────┐    ┌─────────▼────────────────┐   │
│  │    LexoRank Utility     │    │  Platform Event          │   │
│  │                         │    │  Publisher               │   │
│  │  • initial()            │    │                          │   │
│  │  • between()            │    │  • publishCardUpdate()   │   │
│  │  • midpoint()           │    └──────────────────────────┘   │
│  └─────────────────────────┘                │                   │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Salesforce Platform                          │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Board__c     │  │   Column__c    │  │    Card__c       │  │
│  │                │  │                │  │                  │  │
│  │  • Name        │  │  • Board__c ──▶│  │  • Column__c ──▶ │  │
│  │  • Status__c   │  │  • Position__c │  │  • Position__c   │  │
│  │  • Active__c   │  │    (LexoRank)  │  │    (LexoRank)    │  │
│  └────────────────┘  │  • Color__c    │  │  • Priority__c   │  │
│                      └────────────────┘  │  • CardType__c   │  │
│                                          │  • Assignee__c   │  │
│                                          └──────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CardUpdateEvent__e (Platform Event)         │   │
│  │                                                          │   │
│  │  • EventType__c (create/update/move/delete)             │   │
│  │  • CardId__c                                            │   │
│  │  • ColumnId__c                                          │   │
│  │  • CardPosition__c                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               │ Event Bus
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Real-time Event Distribution                   │
│                                                                   │
│    Browser 1          Browser 2          Browser 3               │
│    ┌─────────┐       ┌─────────┐       ┌─────────┐             │
│    │  User A │       │  User B │       │  User C │             │
│    │         │       │         │       │         │             │
│    │ Kanban  │       │ Kanban  │       │ Kanban  │             │
│    │ Board   │       │ Board   │       │ Board   │             │
│    └─────────┘       └─────────┘       └─────────┘             │
│         ▲                 ▲                 ▲                     │
│         └─────────────────┴─────────────────┘                    │
│              Real-time updates < 2 seconds                        │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Card Drag & Drop Flow

```
User drags card
      │
      ▼
┌─────────────────┐
│ handleDragStart │ ─── Store draggedCard state
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ handleDrop      │
└─────────────────┘
      │
      ├──▶ Calculate LexoRank position (prev/next)
      │
      ▼
┌──────────────────────┐
│ applyOptimisticMove  │ ─── Immediate UI update
└──────────────────────┘
      │
      ▼
┌──────────────────────┐
│ moveCard() Apex call │
└──────────────────────┘
      │
      ├──▶ Calculate newPosition using LexoRank.between()
      │
      ├──▶ Update Card__c record
      │
      ├──▶ publishCardUpdateEvent()
      │
      ▼
Success? ┬─Yes─▶ updateCardInState()
         │
         └─No──▶ rollbackOptimisticMove()
```

### 2. Real-time Update Flow

```
User A moves card
      │
      ▼
┌────────────────────┐
│ moveCard() executes│
└────────────────────┘
      │
      ├──▶ Update database
      │
      ▼
┌─────────────────────────────┐
│ publishCardUpdateEvent()    │
└─────────────────────────────┘
      │
      ▼
┌─────────────────────────────┐
│ CardUpdateEvent__e published│
└─────────────────────────────┘
      │
      ├──────────────────────────────┐
      ▼                              ▼
User B subscribes          User C subscribes
      │                              │
      ▼                              ▼
┌───────────────────┐      ┌───────────────────┐
│ handlePlatformEvent│      │ handlePlatformEvent│
└───────────────────┘      └───────────────────┘
      │                              │
      ├──▶ Check if recent optimistic update
      │
      ▼
┌─────────────────┐
│ refreshApex()   │ ─── Reload board data
└─────────────────┘
      │
      ▼
UI updates automatically
```

### 3. LexoRank Position Calculation

```
Card positions in Column A:
┌──────────────────────┐
│ Card 1: "0|h00000:"  │
│ Card 2: "0|h80000:"  │
│ Card 3: "0|hzzzzz:"  │
└──────────────────────┘

User drops Card X between Card 1 and Card 2:
                                   
┌──────────────────────────────────────────┐
│ LexoRank.between("0|h00000:", "0|h80000:")│
└──────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Calculate midpoint:   │
        │ "0|h40000:"          │
        └───────────────────────┘
                    │
                    ▼
New positions in Column A:
┌──────────────────────┐
│ Card 1: "0|h00000:"  │
│ Card X: "0|h40000:"  │ ◀── New card
│ Card 2: "0|h80000:"  │
│ Card 3: "0|hzzzzz:"  │
└──────────────────────┘

Benefits:
✅ Only 1 record updated (Card X)
✅ No renumbering needed
✅ Works for infinite insertions
```

## Component Architecture

### kanbanBoard Component Structure

```
kanbanBoard
├── Properties
│   ├── @api recordId (Board ID)
│   ├── @api height (Container height)
│   ├── @track columns (Array of columns)
│   ├── @track showCardDetail (Modal state)
│   └── optimisticUpdates (Map for tracking)
│
├── Lifecycle
│   ├── connectedCallback()
│   │   ├── subscribeToPlatformEvents()
│   │   └── registerErrorListener()
│   └── disconnectedCallback()
│       └── unsubscribeFromPlatformEvents()
│
├── Data Management
│   ├── @wire getBoardData
│   │   ├── processColumns()
│   │   └── processCards()
│   └── enrichCard() (Add computed properties)
│
├── Drag & Drop
│   ├── handleDragStart()
│   ├── handleDragEnd()
│   ├── handleDragOver()
│   ├── handleDragEnter()
│   ├── handleDragLeave()
│   └── handleDrop()
│
├── Optimistic Updates
│   ├── applyOptimisticMove()
│   ├── rollbackOptimisticMove()
│   └── updateCardInState()
│
├── Real-time
│   ├── subscribeToPlatformEvents()
│   ├── handlePlatformEvent()
│   └── isRecentOptimisticUpdate()
│
└── UI Actions
    ├── handleCardClick()
    ├── handleAddCard()
    ├── handleRefresh()
    └── Error/Success toasts
```

## Performance Optimization Strategy

### 1. Optimistic UI Updates
```
Traditional Flow:
User action → Server call → Wait → UI update
Time: 500-1000ms

Optimistic Flow:
User action → UI update → Server call (background)
Time: < 50ms perceived
```

### 2. Cacheable Apex
```
@AuraEnabled(cacheable=true)
public static BoardData getBoardData(Id boardId)

Benefits:
✅ Cached in Lightning Data Service
✅ Instant navigation between pages
✅ Reduced server load
```

### 3. Platform Events vs Polling
```
Polling:
- Check server every 5 seconds
- 12 API calls per minute
- 720 calls per hour per user

Platform Events:
- Push updates when changes occur
- 0 polling calls
- Instant updates (< 1 second)
```

### 4. LexoRank vs Traditional Ordering
```
Traditional Ordering (update all records):
Before:  1, 2, 3, 4, 5
Move 5 between 2 and 3:
After:   1, 2, 5, 3, 4
Updates: 3 records (renumber 3 → 4, 4 → 5, 5 → 3)

LexoRank (update one record):
Before:  0|h00000:, 0|h40000:, 0|h80000:, 0|hc0000:, 0|hzzzzz:
Move 0|hzzzzz: between 0|h40000: and 0|h80000::
After:   0|h00000:, 0|h40000:, 0|h60000:, 0|h80000:, 0|hc0000:
Updates: 1 record (calculate 0|h60000:)
```

## Security Model

```
┌────────────────────────────────────────────┐
│           Security Layers                  │
├────────────────────────────────────────────┤
│                                            │
│  1. Apex Sharing (with sharing)           │
│     └─▶ Respects org sharing rules        │
│                                            │
│  2. Object Permissions (CRUD)             │
│     ├─▶ Board__c: Read, Create, Edit      │
│     ├─▶ Column__c: Read, Create, Edit     │
│     └─▶ Card__c: Read, Create, Edit, Del  │
│                                            │
│  3. Field-Level Security (FLS)            │
│     └─▶ Respects field permissions        │
│                                            │
│  4. Record Access                         │
│     ├─▶ Owner access                      │
│     ├─▶ Sharing rules                     │
│     └─▶ Manual shares                     │
│                                            │
│  5. Platform Event Access                 │
│     └─▶ Read access to CardUpdateEvent__e │
│                                            │
└────────────────────────────────────────────┘
```

## Deployment Architecture

```
Development                     Production
┌──────────────┐              ┌──────────────┐
│              │              │              │
│  Scratch Org │─────────────▶│  Production  │
│              │   Deploy     │     Org      │
│  • Code      │              │              │
│  • Metadata  │              │  • Boards    │
│  • Tests     │              │  • Cards     │
│              │              │  • Users     │
└──────────────┘              └──────────────┘
       │                             ▲
       │                             │
       ▼                             │
┌──────────────┐              ┌──────────────┐
│  CI/CD       │              │  Validation  │
│  Pipeline    │─────────────▶│  Sandbox     │
│              │   Test       │              │
│  • Unit Tests│              │  • UAT       │
│  • Integration│             │  • Load Test │
└──────────────┘              └──────────────┘
```

## Technology Stack

```
Frontend:
├── Lightning Web Components (LWC)
├── Lightning Design System (SLDS)
├── JavaScript ES6+
├── HTML5 Drag & Drop API
└── CSS3 (Flexbox, Grid, Animations)

Backend:
├── Apex (Salesforce)
├── SOQL (Queries)
├── Platform Events
└── LexoRank Algorithm

Testing:
├── Apex Unit Tests (@isTest)
├── Jest (LWC Unit Tests)
├── Playwright (E2E Tests)
└── Manual Testing

DevOps:
├── Salesforce CLI (sf)
├── Git / GitHub
├── VS Code
└── GitHub Actions (CI/CD)
```

---

**Last Updated:** October 2025  
**Version:** 1.0.0
