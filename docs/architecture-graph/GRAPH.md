# Architecture Graph — Adjacency List

> **LLM Scanning Guide**: This file is the master index. Each node lists its edges (connections to other nodes) with relationship types. Use this to understand module boundaries and data flow.

## Graph Summary

- **16 nodes** (modules)
- **3 packages**: force-app (core), force-agentforce (AI), force-design-thinking (DT)
- **Edge types**: depends-on, extends, publishes-to, subscribes-to, reads-from, writes-to

## Adjacency List

```
kanban-board
├── depends-on → kanban-store (state management)
├── depends-on → card-system (card CRUD)
├── subscribes-to → real-time-sync (platform events)
├── extends → sprint-management (sprint views)
├── extends → backlog (backlog view)
├── extends → analytics (analytics tab)
├── extends → admin (admin tab)
├── extends → design-thinking (DT view)

kanban-store
├── reads-from → apex-services (Apex controllers)
├── writes-to → apex-services (thunk dispatches)
├── depends-on → data-model (state shape mirrors schema)

card-system
├── depends-on → data-model (Card__c, Column__c)
├── publishes-to → real-time-sync (CardUpdateEvent__e)
├── reads-from → kanban-store (card state)
├── writes-to → kanban-store (card actions)

sprint-management
├── depends-on → card-system (SprintCard__c junction)
├── depends-on → data-model (Sprint__c, SprintCard__c, SprintSnapshot__c)
├── publishes-to → real-time-sync (SprintUpdateEvent__e)
├── reads-from → kanban-store (sprint state)

backlog
├── depends-on → card-system (card queries)
├── depends-on → kanban-store (backlog state slice)
├── reads-from → sprint-management (sprint card mapping)

analytics
├── reads-from → sprint-management (velocity, burndown data)
├── reads-from → data-model (SprintSnapshot__c)
├── depends-on → kanban-store (analytics state)

real-time-sync
├── publishes-to → kanban-store (dispatches actions on events)
├── depends-on → data-model (platform events)
├── subscribes-to → card-system (CardUpdateEvent__e)
├── subscribes-to → sprint-management (SprintUpdateEvent__e)
├── subscribes-to → design-thinking (DesignSessionEvent__e)

admin
├── reads-from → data-model (Board__c, TeamMember__c)
├── depends-on → apex-services (AdminController)

retro
├── depends-on → data-model (Retrospective__c, RetroCard__c, RetroVote__c)
├── publishes-to → real-time-sync (RetroUpdateEvent__e)
├── depends-on → sprint-management (sprint context)

planning-poker
├── depends-on → data-model (PokerSession__c, PokerParticipant__c)
├── publishes-to → real-time-sync (PokerEvent__e)
├── depends-on → card-system (card story points)

roadmap-board
├── depends-on → data-model (RoadmapItem__c)
├── reads-from → sprint-management (sprint timeline)

agentforce [package: force-agentforce]
├── depends-on → apex-services (delegates to existing services)
├── depends-on → card-system (card CRUD via agents)
├── depends-on → sprint-management (sprint operations via agents)
├── reads-from → data-model (all core objects)

design-thinking [package: force-design-thinking]
├── depends-on → data-model (Board__c, Card__c references)
├── depends-on → kanban-store (design state slice)
├── publishes-to → real-time-sync (DesignSessionEvent__e)
├── extends → card-system (DesignPhase__c, HowMightWe__c fields)
├── writes-to → card-system (graduates cards to sprint-ready)

apex-services
├── reads-from → data-model (SOQL via selectors)
├── writes-to → data-model (DML via services)
├── publishes-to → real-time-sync (trigger handlers → events)

data-model
├── (foundation node — no outgoing dependencies)

cicd-pipeline
├── reads-from → apex-services (Apex test runs)
├── reads-from → kanban-store (Jest tests)
├── reads-from → kanban-board (E2E tests)
```

## Data Flow Diagram

```
User Action → LWC Component → dispatch(action)
  → kanban-store (reducer) → Apex Controller (thunk)
    → Service → Selector → Database
      → Trigger → Platform Event
        → real-time-sync → all clients
          → kanban-store (reducer) → UI re-render
```

## Package Dependency Graph

```
force-design-thinking ──depends-on──→ force-app (Alex - A Kanban App)
force-agentforce ──────depends-on──→ force-app (Alex - A Kanban App)
```
