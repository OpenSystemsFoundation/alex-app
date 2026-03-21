# Dependency Mapping & Cross-Team Coordination
**Date:** 2026-03-21
**Status:** Proposed

## Problem
At scale, teams block each other. Card A can't start until Team B finishes Card B. These dependencies are tracked in spreadsheets or Slack threads and inevitably get lost. Missed dependencies are the #1 cause of sprint failures in scaled agile.

## Solution
First-class card-to-card dependencies with visualization and alerting:
- Dependency types: blocks, is-blocked-by, relates-to
- Cross-board dependencies (Team A ↔ Team B)
- Visual dependency indicators on cards
- Dependency risk report: cards on critical path with unresolved blockers
- Auto-escalation via Flows when blocked cards approach due dates

## Data Model
- CardDependency__c (FromCard lookup, ToCard lookup, DependencyType picklist, Status, Notes)

## Key Screens
- Dependency badge/icon on card tiles
- Dependency panel in card detail (upstream/downstream links)
- Board-level dependency view (graph or list of cross-card/cross-board deps)

## Salesforce Advantage
Combined with Flows, dependencies can trigger real escalation workflows — Tasks, Chatter posts, email alerts. No standalone tool can do this natively.
