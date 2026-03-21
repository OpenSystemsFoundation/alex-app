# Flow-Driven Automation Engine
**Date:** 2026-03-21
**Status:** Proposed

## Problem
Every team has unique workflows. Hardcoding automations doesn't scale. Admins want to build custom automations like "when a card moves to Done, update the linked Opportunity" or "when a card is blocked for >48h, escalate" — without writing Apex.

## Solution
Expose board events as Flow-compatible building blocks:
- Invocable Actions: CreateCard, MoveCard, UpdateCard, AssignCard, AddToSprint
- Platform Event subscriptions usable in Record-Triggered Flows
- Flow Templates for common patterns (card→opportunity sync, blocked card escalation, sprint completion notifications)

## Technical Approach
- Invocable Apex methods with @InvocableMethod annotation
- Input/output inner classes for Flow compatibility
- Leverage existing Platform Events (CardUpdateEvent__e, SprintUpdateEvent__e)
- Publish a "CardTransition__e" event specifically for column changes (from/to)

## Key Use Cases
- Card moves to Done → update linked Opportunity stage
- All cards in epic complete → send Slack/email notification
- Card blocked >48h → create Task for scrum master
- Sprint completed → post Chatter summary
- Card created from Case → auto-link and set priority

## Salesforce Advantage
Flow Builder is point-and-click. Admins can extend Alex without code. No other agile tool offers this level of declarative customization.
