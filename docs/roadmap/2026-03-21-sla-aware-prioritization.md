# SLA-Aware Prioritization
**Date:** 2026-03-21
**Status:** Proposed

## Problem
Teams doing both product work and support/ops can't balance priorities. SLA-critical work gets buried in the backlog. Engineers don't see that a card is tied to a Case with a 4-hour SLA about to breach.

## Solution
Cards linked to Cases inherit SLA context from Entitlements and Milestones:
- Display SLA deadline and time-remaining on linked cards
- Auto-surface cards approaching SLA breach (visual warning on board)
- Priority override: SLA-critical cards float to top of column automatically
- SLA breach notifications to card assignee and board owner

## Technical Approach
- Query Entitlement and CaseMilestone via linked Case records
- Scheduled Apex job to check SLA proximity and update card priority flags
- LWC component: SLA badge on card tile (green/yellow/red)

## Key Screens
- SLA countdown badge on card tiles
- "At Risk" filter/swimlane on board
- SLA compliance report in analytics

## Salesforce Advantage
Only a Salesforce-native tool has access to Entitlements, Milestones, and SLA data. Jira/Linear have zero concept of service-level agreements.
