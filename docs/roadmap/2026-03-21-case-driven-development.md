# Case-Driven Development Pipeline

**Date:** 2026-03-21
**Status:** Proposed

## Problem

Engineering teams build features in a vacuum. Support teams drown in cases. There's no systematic way to connect customer pain (Cases) to engineering output (Cards on the board). Teams can't answer: "What are our top customer pain points?" or "Which customers benefit when this ships?"

## Solution

Build a feedback-to-feature pipeline that connects Salesforce Cases to Kanban Cards:

- Cluster related Cases into themes by keyword/category
- Surface "top pain points" ranked by case volume, account ARR, or sentiment
- Link Cases to Cards (many-to-many junction: `CaseCard__c`)
- When a card ships (moves to Done column), auto-notify affected case contacts
- Track traceability: "Feature X was built because of Cases Y, Z"

## Data Model

- **CaseCard__c** -- junction object (Case lookup, Card lookup, LinkedDate, LinkedBy)
- **CaseTheme__c** -- (Name, Description, CaseCount rollup, Board lookup)
- **CaseThemeCase__c** -- junction (CaseTheme lookup, Case lookup)

## Key Screens

- "Customer Pain Points" dashboard on board showing top themes
- Case linkage panel on card detail
- "Ship notification" configuration per board

## Salesforce Advantage

Only possible on Salesforce because Cases, Accounts, Entitlements, and Contacts already exist. No integration needed -- it's all native.
