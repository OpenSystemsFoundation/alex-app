# Capacity Planning
**Date:** 2026-03-21
**Status:** Proposed

## Problem
Sprint planning is guesswork. Teams overcommit because they don't account for PTO, meetings, or uneven workload distribution. "How many points can we actually take on?" is answered by gut feel.

## Solution
Use Salesforce user data and historical velocity to build a capacity calculator:
- Team roster per board (already have Assignee on Card__c)
- Historical velocity per team member and per team
- Sprint capacity = available team members x avg velocity per person
- Workload heatmap: story points per assignee in current sprint
- Auto-flag when sprint commitment exceeds calculated capacity

## Data Model
- BoardMember__c (Board lookup, User lookup, Role picklist, DefaultCapacity number)
- Velocity data derived from existing SprintCard__c and Sprint__c records

## Key Screens
- Capacity bar during sprint planning (committed vs. available)
- Workload heatmap (assignee x story points)
- Velocity-per-member trend in sprint analytics

## Salesforce Advantage
User records, roles, and profiles are already in the platform. No separate team management needed.
