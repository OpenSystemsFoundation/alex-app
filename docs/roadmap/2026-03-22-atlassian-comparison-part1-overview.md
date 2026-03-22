# Atlassian Competitive Analysis — Part 1: Executive Summary & Methodology

**Date:** March 22, 2026
**Series:** Atlassian Competitive Analysis (Part 1 of 5)
**Author:** Architecture review by Claude (Opus 4.6)

---

## Executive Summary

This five-part analysis compares Alex's current and planned feature set against the full Atlassian suite: **Jira Software**, **Jira Service Management (JSM)**, and **Confluence**. The goal is not to replicate Atlassian — it's to identify which Atlassian features are worth building natively on Salesforce, which ones Alex already does well, and where Alex's Salesforce-native position creates advantages Atlassian cannot match.

### Key Findings

1. **Alex already covers ~30% of Jira Software's core agile features** — boards, backlog, sprints, drag-and-drop, real-time sync, planning poker, retrospectives, and analytics. The gap is primarily in workflow customization, advanced reporting, and portfolio-level planning.

2. **JSM features are largely irrelevant** — Salesforce already has Service Cloud, which is a more mature ITSM solution than JSM. Alex should not build ticketing, SLA management, or incident response. The one exception is lightweight approval workflows for column transitions.

3. **Confluence overlaps with Salesforce Knowledge and Experience Cloud** — Alex doesn't need a wiki. But lightweight documentation features (card descriptions with rich text, sprint reports, retro summaries) fill the gap without building a CMS.

4. **Alex's unfair advantages are real** — native Salesforce record linking, Experience Cloud customer-facing boards, Agentforce AI integration, and zero-additional-cost positioning are differentiators Atlassian cannot replicate.

5. **The biggest gaps worth closing** are: WIP limits, swimlanes, cumulative flow diagrams, custom fields on cards, dependency mapping, and workflow customization. These are table-stakes features that agile practitioners expect.

---

## Methodology

### Scope

- **Jira Software** (Cloud) — all plan tiers (Free, Standard, Premium, Enterprise)
- **Jira Service Management** (Cloud) — all plan tiers
- **Confluence** (Cloud) — all plan tiers
- **Alex** — current codebase (main branch) plus planned features from PRODUCT_VISION.md and roadmap documents

### Comparison Framework

Each feature is categorized using this matrix:

| Category | Description |
|----------|-------------|
| **Alex Has** | Feature exists in Alex today |
| **Alex Planned** | Feature is on the roadmap with a design doc |
| **Worth Building** | High-value feature Alex should prioritize |
| **Salesforce Covers** | Salesforce platform already provides this (Service Cloud, Knowledge, Reports, etc.) |
| **Not Relevant** | Feature doesn't fit Alex's positioning or target audience |
| **Atlassian-Only** | Feature tied to Atlassian's ecosystem with no Salesforce equivalent |

### Target Audience Reminder

Alex serves Salesforce teams — admins, consultants, business analysts, and implementation partners. These users:
- Live in Salesforce all day
- Manage configuration projects, not just code
- Need lightweight agile tooling, not enterprise PPM
- Value zero-friction adoption over feature completeness

---

## Document Index

| Part | Title | Focus |
|------|-------|-------|
| 1 | Executive Summary & Methodology | This document |
| 2 | [Jira Software Feature Comparison](2026-03-22-atlassian-comparison-part2-jira-software.md) | Board, backlog, sprint, reporting, workflow features |
| 3 | [JSM Feature Comparison](2026-03-22-atlassian-comparison-part3-jsm.md) | Service desk, incident, change, asset management |
| 4 | [Confluence Feature Comparison](2026-03-22-atlassian-comparison-part4-confluence.md) | Documentation, collaboration, knowledge management |
| 5 | [Strategic Recommendations](2026-03-22-atlassian-comparison-part5-recommendations.md) | Priority matrix, build vs. skip decisions, roadmap impact |
