# Architecture Graph Index

A graph-structured documentation system for the Alex Kanban app. Each module is a **node** with its own roadmap, schema, known issues, and **edges** to connected modules.

## How to Use (LLM-Optimized)

When scanning this codebase, read `GRAPH.md` first — it contains the full adjacency list with every node and its edges. Then drill into individual node files for details.

## Structure

```
architecture-graph/
├── GRAPH.md           ← Start here: full adjacency list + edge types
├── nodes/
│   ├── kanban-board.md
│   ├── kanban-store.md
│   ├── sprint-management.md
│   ├── backlog.md
│   ├── analytics.md
│   ├── card-system.md
│   ├── real-time-sync.md
│   ├── admin.md
│   ├── retro.md
│   ├── planning-poker.md
│   ├── roadmap-board.md
│   ├── agentforce.md
│   ├── design-thinking.md
│   ├── apex-services.md
│   ├── data-model.md
│   └── cicd-pipeline.md
```

## Node Schema

Each node file follows this exact schema for machine-readable parsing:

```yaml
id: unique-kebab-case-id
name: Human Readable Name
status: stable | active-development | planned | deprecated
package: force-app | force-agentforce | force-design-thinking

edges:
  - target: other-node-id
    type: depends-on | extends | publishes-to | subscribes-to | reads-from | writes-to
    description: Brief description of the relationship

schema:
  objects: [List of SObjects this module owns]
  lwc: [List of LWC components]
  apex: [List of Apex classes]
  events: [Platform events published/consumed]

roadmap:
  now: [Currently in progress]
  next: [Planned for next cycle]
  future: [Long-term vision items]

known-issues: [Tracked bugs and technical debt]
```
