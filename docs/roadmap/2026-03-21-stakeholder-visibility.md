# Stakeholder Visibility (Without Agentforce)
**Date:** 2026-03-21
**Status:** Proposed

## Problem
Stakeholders want sprint status without opening the board or attending standups. Agentforce could solve this but requires additional licensing that many customers don't have.

## Solution
Lightweight, license-free alternatives for stakeholder communication:
- **Email Digests** — scheduled summaries (daily/weekly) with sprint progress, blockers, velocity trends. Leverages existing EmailNotifications field on Board__c.
- **Chatter Integration** — auto-post sprint completions, blocked cards, and milestone achievements to Chatter groups
- **Salesforce Notifications** — custom notifications for assignees on due dates, blockers, and mentions
- **Reports & Dashboards** — expose board/sprint data as reportable so managers can build their own dashboards

## Technical Approach
- Scheduled Apex: DigestEmailScheduler (configurable frequency per board)
- Email templates using Messaging.SingleEmailMessage with board snapshot data
- ConnectApi for Chatter posts on sprint events
- Custom Notification Type + Messaging.CustomNotification for in-app alerts
- Custom Report Type spanning Board → Sprint → SprintCard → Card

## Salesforce Advantage
All communication channels (email, Chatter, notifications, reports) are built into the platform. No Slack integration or external tools needed.
