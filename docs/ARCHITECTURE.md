# Alex Kanban Board - Architecture Documentation

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Data Model](#data-model)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Real-time Collaboration](#real-time-collaboration)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)
- [Testing Strategy](#testing-strategy)

## Overview

Alex is a real-time collaborative Kanban board application built on the Salesforce platform using Lightning Web Components (LWC). The architecture emphasizes:

- **Modularity**: Separation of concerns with distinct layers
- **Real-time collaboration**: Platform events for instant updates
- **Performance**: Optimized rendering and state management
- **Scalability**: Efficient data handling for large boards
- **Maintainability**: Clean code patterns and comprehensive testing

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Salesforce Platform                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Lightning Web Components (UI)           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │  │
│  │  │  Kanban    │  │  Column    │  │   Card     │ │  │
│  │  │  Board     │  │ Component  │  │ Component  │ │  │
│  │  └────────────┘  └────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │              State Management Layer               │  │
│  │         (Redux-style Store & Reducers)           │  │
│  └──────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │                                │
│     ┌───────────────────┼───────────────────┐           │
│     │                   │                   │           │
│     ▼                   ▼                   ▼           │
│  ┌──────┐      ┌──────────────┐      ┌──────────┐     │
│  │ Data │      │   Platform   │      │  Event   │     │
│  │ Mgr  │      │    Events    │      │ Handler  │     │
│  └──────┘      └──────────────┘      └──────────┘     │
│     ▲                   ▲                   ▲           │
│     │                   │                   │           │
│     └───────────────────┼───────────────────┘           │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Apex Backend Layer                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Board    │  │ Column   │  │   Card       │  │  │
│  │  │Controller│  │Controller│  │  Controller  │  │  │
│  │  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Data Layer                        │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │   │  Board   │  │  Column  │  │   Card   │     │  │
│  │   │ (Object) │  │ (Object) │  │ (Object) │     │  │
│  │   └──────────┘  └──────────┘  └──────────┘     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. **UI Layer (LWC Components)**

- Render user interface
- Handle user interactions
- Dispatch actions to state management
- Subscribe to state changes

#### 2. **State Management Layer**

- Maintain application state (Store)
- Process state updates (Reducers)
- Notify components of changes
- Ensure predictable state transitions

#### 3. **Data Management Layer**

- Coordinate data operations
- Handle API calls to Apex
- Enrich data with UI-specific properties
- Manage loading and error states

#### 4. **Event Layer**

- Listen to platform events
- Process real-time updates
- Track recent changes to avoid echoes
- Coordinate state updates from events

#### 5. **Backend Layer (Apex)**

- Execute business logic
- Enforce security (CRUD, FLS)
- Perform database operations
- Publish platform events

#### 6. **Data Layer (Salesforce Objects)**

- Persist data
- Enforce data integrity
- Provide query interfaces
- Maintain relationships

## Data Model

### Entity Relationship Diagram

```
┌─────────────────────┐
│   OpenSF__Board__c  │
│─────────────────────│
│ Id                  │
│ Name                │
│ Description__c      │
│ Owner__c            │
│ IsActive__c         │
└─────────────────────┘
          │
          │ 1:N
          │
          ▼
┌─────────────────────┐
│  OpenSF__Column__c  │
│─────────────────────│
│ Id                  │
│ Name                │
│ Board__c (FK)       │
│ Order__c            │
│ WIPLimit__c         │
└─────────────────────┘
          │
          │ 1:N
          │
          ▼
┌─────────────────────┐
│   OpenSF__Card__c   │
│─────────────────────│
│ Id                  │
│ Name                │
│ Description__c      │
│ Column__c (FK)      │
│ Order__c            │
│ Priority__c         │
│ DueDate__c          │
│ AssignedTo__c       │
│ Color__c            │
└─────────────────────┘
```

### Custom Objects

#### OpenSF**Board**c

Represents a Kanban board workspace.

**Fields:**

- `Name` (Text) - Board title
- `OpenSF__Description__c` (Text Area) - Board description
- `OpenSF__IsActive__c` (Checkbox) - Active status
- `OwnerId` (Lookup) - Board owner

**Relationships:**

- One-to-Many with Columns

#### OpenSF**Column**c

Represents a column within a board.

**Fields:**

- `Name` (Text) - Column title
- `OpenSF__Board__c` (Master-Detail) - Parent board
- `OpenSF__Order__c` (Number) - Display order
- `OpenSF__WIPLimit__c` (Number) - Work-in-progress limit

**Relationships:**

- Master-Detail to Board
- One-to-Many with Cards

#### OpenSF**Card**c

Represents a work item card.

**Fields:**

- `Name` (Text) - Card title
- `OpenSF__Description__c` (Rich Text) - Card description
- `OpenSF__Column__c` (Master-Detail) - Parent column
- `OpenSF__Order__c` (Number) - Position in column
- `OpenSF__Priority__c` (Picklist) - Priority level
- `OpenSF__DueDate__c` (Date) - Due date
- `OpenSF__AssignedTo__c` (Lookup User) - Assignee
- `OpenSF__Color__c` (Text) - Card color for visual coding

**Relationships:**

- Master-Detail to Column
- Lookup to User (AssignedTo)

## Component Architecture

### Main Component: kanbanBoard

The root component that orchestrates the entire Kanban board experience.

```javascript
kanbanBoard/
├── kanbanBoard.js           // Main component logic
├── kanbanBoard.html         // Template
├── kanbanBoard.css          // Styles
├── store.js                 // Redux-style state store
├── reducers.js              // State update logic
├── dataManager.js           // Data fetching & API calls
├── eventHandler.js          // Platform event processing
└── __tests__/              // Unit tests
```

#### Key Responsibilities:

1. **Initialize** - Load board data, setup store, subscribe to events
2. **Render** - Display columns and cards
3. **Handle Interactions** - Drag/drop, create, update, delete
4. **Manage State** - Dispatch actions, update UI
5. **Real-time Sync** - Process platform events

### Component Hierarchy

```
kanbanBoard (Container)
├── boardHeader
│   ├── boardTitle
│   └── boardActions
├── columnList
│   └── kanbanColumn (n)
│       ├── columnHeader
│       ├── cardList
│       │   └── kanbanCard (n)
│       │       ├── cardHeader
│       │       ├── cardContent
│       │       └── cardFooter
│       └── addCard
└── boardFooter
```

## State Management

Alex implements a Redux-style state management pattern for predictable state updates.

### Store Structure

```javascript
{
  // Board metadata
  boardId: '001xx000003DGbYAAW',
  boardName: 'Sprint Planning',

  // Column data with nested cards
  columns: [
    {
      Id: 'a00xx000001YzAB',
      Name: 'To Do',
      Order__c: 1,
      cards: [
        {
          Id: 'a01xx000002XyCD',
          Name: 'Implement feature',
          Description__c: 'Details...',
          Order__c: 1,
          // ... other card fields
        }
      ]
    }
  ],

  // UI state
  isLoading: false,
  error: null,
  selectedCardId: null
}
```

### Reducer Pattern

Reducers are pure functions that take current state and an action, returning new state.

```javascript
function reducer(state, action) {
    switch (action.type) {
        case 'MOVE_CARD':
            return moveCard(state, action.payload);

        case 'ADD_CARD':
            return addCard(state, action.payload);

        case 'UPDATE_CARD':
            return updateCard(state, action.payload);

        case 'REMOVE_CARD':
            return removeCard(state, action.payload);

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        default:
            return state;
    }
}
```

### Action Dispatch Flow

```
User Action → Event Handler → Dispatch Action → Reducer → New State → Re-render
```

## Real-time Collaboration

### Platform Events

Alex uses Salesforce Platform Events for real-time collaboration.

#### Event Object: `OpenSF__KanbanEvent__e`

**Fields:**

- `OpenSF__EventType__c` (Text) - Event type: 'create', 'update', 'move', 'delete'
- `OpenSF__Payload__c` (Long Text Area) - JSON payload with event data
- `OpenSF__BoardId__c` (Text) - Board identifier for filtering

### Event Flow

```
User A moves card
       ↓
Frontend dispatches action
       ↓
Apex updates database
       ↓
Apex publishes platform event
       ↓
Salesforce Event Bus
       ↓
All subscribed clients receive event
       ↓
User B's browser processes event
       ↓
State updated, UI re-rendered
```

### Echo Prevention

To prevent infinite loops when processing own changes:

1. **Track Recent Changes**: When a user makes a change, track the card ID and timestamp
2. **Ignore Own Events**: When receiving events, check if the card was recently modified locally
3. **Time Window**: Use 2-second window to ignore echoes
4. **Clear Tracking**: Remove tracking after time window expires

```javascript
// In eventHandler.js
trackChange(cardId) {
  this.recentChanges.set(cardId, Date.now());
  setTimeout(() => this.recentChanges.delete(cardId), 2000);
}

_isRecentChange(cardId) {
  const timestamp = this.recentChanges.get(cardId);
  return timestamp && (Date.now() - timestamp < 2000);
}
```

## Security Model

### Object-Level Security

- **Profiles**: Control access to custom objects
- **Permission Sets**:
    - `Alex_Admin` - Full access to all features
    - `Alex_User` - Standard user access

### Field-Level Security

- Enforced via permission sets
- Hidden fields not accessible to unauthorized users

### Record-Level Security

- **Sharing Rules**: Board ownership and sharing
- **Organization-Wide Defaults**: Private by default
- **Role Hierarchy**: Standard Salesforce hierarchy respected

### CRUD/FLS Enforcement

All Apex controllers enforce CRUD and FLS:

```apex
if (!Schema.sObjectType.OpenSF__Card__c.isAccessible()) {
    throw new SecurityException('Insufficient privileges');
}

if (!Schema.sObjectType.OpenSF__Card__c.fields.Name.isAccessible()) {
    throw new SecurityException('Insufficient field access');
}
```

## Performance Considerations

### Frontend Optimization

1. **Virtual Scrolling**: For boards with many cards
2. **Lazy Loading**: Load cards on-demand
3. **Debouncing**: Throttle API calls during drag operations
4. **Memoization**: Cache computed values in state
5. **Event Batching**: Batch multiple state updates

### Backend Optimization

1. **Selective Queries**: Only query needed fields
2. **Query Optimization**: Use proper indexes
3. **Bulk Operations**: Process records in bulk
4. **Caching**: Cache board metadata
5. **Async Processing**: Use queueable for heavy operations

### Data Loading Strategy

```javascript
// Initial Load
1. Load board metadata
2. Load columns (with count of cards)
3. Load cards for visible columns only
4. Lazy load cards for other columns on scroll/expand

// Incremental Updates
1. Process platform events
2. Update only affected parts of state
3. Re-render only changed components
```

## Testing Strategy

### Unit Tests (Jest)

- **Component Logic**: Test all component methods
- **State Management**: Test reducers with various actions
- **Data Manager**: Test API interactions (mocked)
- **Event Handler**: Test event processing logic
- **Coverage Target**: > 90%

**Example Test Structure:**

```javascript
describe('kanbanBoard reducer', () => {
    it('should move card between columns', () => {
        const initialState = {
            /* ... */
        };
        const action = {
            type: 'MOVE_CARD',
            payload: {
                /* ... */
            }
        };
        const newState = reducer(initialState, action);
        expect(newState.columns[1].cards).toContainEqual(/* ... */);
    });
});
```

### End-to-End Tests (Playwright)

- **User Workflows**: Complete user journeys
- **Cross-browser**: Test on Chromium, Firefox, WebKit
- **Real Org**: Test against actual Salesforce org
- **Visual Testing**: Screenshot comparisons

**Test Scenarios:**

1. Create a new board
2. Add columns and cards
3. Drag cards between columns
4. Update card details
5. Delete cards and columns
6. Multi-user collaboration

### Apex Tests

- **Controller Logic**: Test all Apex methods
- **Security**: Verify CRUD/FLS enforcement
- **Bulk Operations**: Test with 200+ records
- **Platform Events**: Verify event publishing
- **Coverage Target**: > 90%

### Integration Tests

- **Platform Events**: Verify end-to-end event flow
- **API Contracts**: Ensure LWC-Apex contract stability
- **Data Integrity**: Verify cascading operations

## Design Patterns

### Patterns Used

1. **Observer Pattern**: Platform events and state subscriptions
2. **Command Pattern**: Actions dispatched to store
3. **Repository Pattern**: DataManager abstracts data access
4. **Factory Pattern**: Card and column creation
5. **Singleton Pattern**: Store instance
6. **Strategy Pattern**: Different reducers for different actions

### Best Practices

- **Separation of Concerns**: Clear boundaries between layers
- **Single Responsibility**: Each module has one purpose
- **DRY Principle**: Reusable utility functions
- **Immutability**: State updates create new objects
- **Error Handling**: Graceful degradation with user feedback
- **Logging**: Comprehensive error logging for debugging

## Future Architecture Considerations

### Scalability Enhancements

1. **Pagination**: Virtual scrolling for large boards
2. **Caching Layer**: Redis or Platform Cache
3. **CDN**: Static assets via CDN
4. **Database Optimization**: Custom indexes

### Feature Additions

1. **Offline Support**: Service workers and local storage
2. **Advanced Filtering**: Complex query builder
3. **Automation**: Rules engine for card automation
4. **Analytics**: Dashboard and reporting
5. **Integrations**: REST API for external systems

### Technical Debt

- Refactor large components into smaller pieces
- Add more comprehensive error boundaries
- Implement retry logic for failed API calls
- Add telemetry and monitoring

---

**Document Version**: 2.0  
**Last Updated**: October 5, 2025  
**Maintainer**: Open Systems Foundation
