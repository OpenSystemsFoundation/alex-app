# Impact Mapping — Link Work to Revenue
**Date:** 2026-03-21
**Status:** Proposed

## Problem
Engineering teams can't quantify business impact. Executives ask "What's the ROI of this sprint?" and nobody can answer. There's no connection between what's being built and the revenue it protects or enables.

## Solution
Connect Cards and Epics to Opportunities and Accounts, then surface business metrics:
- "How much pipeline is blocked by unfinished work?"
- "Which accounts have the most open cards?"
- "What's the revenue-weighted priority of our backlog?"

## Data Model
- CardObjectLink__c (Card lookup, LinkedObjectId — polymorphic via RecordId field, LinkedObjectType, LinkType picklist: blocks/enables/requested-by)
- Revenue rollup fields on Epic or Board via Apex aggregation

## Key Screens
- Impact sidebar on card detail (linked Opportunities with amounts)
- Board-level "Business Impact" dashboard (total pipeline affected, accounts involved)
- Backlog sorted by revenue-weighted priority

## Salesforce Advantage
Revenue, account, and opportunity data already lives in Salesforce. No API integration, no data sync, no stale data. Real-time revenue context alongside engineering work.
