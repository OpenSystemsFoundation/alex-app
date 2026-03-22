# Alex + Agentforce Data Cloud — Installation & Usage Guide

## Overview

The **Agentforce + Data Cloud** package is the full-featured variant that deploys Alex with the Agentforce extension into a scratch org that additionally has **Customer Data Platform (CDP)** enabled. This allows agents to leverage unified customer data alongside Kanban board management.

### What's Different from Standard

| Feature | Standard | Data Cloud |
|---------|----------|------------|
| Einstein1 AI Platform | Yes | Yes |
| Einstein GPT Platform | Yes | Yes |
| Agent Platform | Yes | Yes |
| Customer Data Platform | **No** | **Yes** |
| Customer Data Platform Lite | **No** | **Yes** |
| Chatter | Yes | Yes |

### When to Use This Package

| Use Case | Package |
|----------|---------|
| Basic Agentforce agent development and testing | Standard |
| Agent with board queries, card management, sprint ops | Standard |
| Agent that references unified customer profiles | **Data Cloud** |
| Agent correlating work items with customer records | **Data Cloud** |
| Testing CDP-aware flows alongside kanban | **Data Cloud** |
| Minimal org footprint for fast iteration | Standard |

---

## Prerequisites

- **Salesforce CLI** (`sf`) — [Install Guide](https://developer.salesforce.com/tools/salesforcecli)
- **DevHub org** with Agentforce **and** Data Cloud entitlements
- **SFDX auth URL** for your DevHub (GitHub secret: `SFDX_AUTH_URL`)

> **Important:** Data Cloud scratch orgs require additional DevHub entitlements (`CustomerDataPlatform`). If org creation fails with "feature not available", verify your DevHub has CDP enabled.

---

## Option 1: Create via GitHub Actions (Recommended)

### Workflow UI

1. Go to **Actions** > **Agentforce Scratch Org Test Drive**
2. Click **Run workflow**
3. Select **Package**: `data-cloud`
4. Set **Duration**: `7` days
5. Click **Run workflow**
6. Find the login link in the **Job Summary**

### PR Comment Trigger

On any open PR, comment:

```
/agentforce-dc-org
```

---

## Option 2: Create via CLI

```bash
# 1. Authenticate DevHub
sf org login web --alias devhub --set-default-dev-hub

# 2. Create scratch org with Agentforce + Data Cloud features
sf org create scratch \
  --definition-file config/dc-agentforce-project-scratch-def.json \
  --alias alex-agentforce-dc \
  --duration-days 7 \
  --wait 15

# 3. Deploy base package
sf project deploy start --source-dir force-app --target-org alex-agentforce-dc --ignore-conflicts

# 4. Deploy Agentforce extension
sf project deploy start --source-dir force-agentforce --target-org alex-agentforce-dc --ignore-conflicts

# 5. Assign permission sets
sf org assign permset --name Alex_Admin --target-org alex-agentforce-dc
sf org assign permset --name Alex_Agentforce_User --target-org alex-agentforce-dc

# 6. Load sample data
sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org alex-agentforce-dc

# 7. Open the org
sf org open --target-org alex-agentforce-dc
```

---

## Post-Install Setup

### 1. Verify Einstein + Agent Platform

1. Go to **Setup** > search **Einstein Setup** > toggle **On**
2. Search **Agents** > verify Agent Builder is accessible

### 2. Verify Data Cloud Activation

1. In Setup, search **Data Cloud**
2. Complete the Data Cloud provisioning wizard if prompted
3. Wait for provisioning (5-15 minutes on first activation)

### 3. Configure the Alex Agent

The Alex Agent (5 topics, 22 actions) deploys automatically from `force-agentforce`. Open Agent Builder to test it.

See the [Agentforce Standard Guide](agentforce-standard-guide.md#3-agent-topics-pre-configured) for the full topic/action reference and test prompts.

### 4. Data Cloud Integration Points

With CDP enabled, you can extend the agent with customer-aware capabilities:

| Integration | Description |
|-------------|-------------|
| **Linked Records** | `OpenSF__LinkedRecord__c` connects cards to Cases, Contacts, or any SObject. Agent can query linked records for customer context. |
| **Customer Profiles** | Use Data Cloud Query actions to look up unified customer profiles and correlate with work items. |
| **Auto-Created Cards** | The `Auto_Create_Card_from_Case` flow creates cards from Cases — agent can search these by customer context. |

**Example agent prompts (Data Cloud-enhanced):**
- *"Show me all cards linked to Case records"*
- *"What work items are related to customer escalations?"*
- *"Find cards created from Cases this week"*

---

## Running Tests

### Apex Tests

```bash
sf apex run test \
  --target-org alex-agentforce-dc \
  --code-coverage \
  --result-format human \
  --wait 15
```

### Agent Evaluation Tests

Same as the standard package — see [Agentforce Standard Guide](agentforce-standard-guide.md#agent-evaluation-tests).

### Via GitHub Actions

**Dual-Org Test Matrix** — runs Apex tests against both Standard and Data Cloud orgs in parallel:

```bash
# Test both variants
gh workflow run agentforce-dual-org-tests.yml --field package=both

# Test Data Cloud only
gh workflow run agentforce-dual-org-tests.yml --field package=data-cloud

# Check results
gh run list --workflow=agentforce-dual-org-tests.yml --limit=3
```

---

## Scratch Org Definition

**File:** `config/dc-agentforce-project-scratch-def.json`

| Feature/Setting | Standard | Data Cloud |
|----------------|----------|------------|
| `Einstein1AIPlatform` | Yes | Yes |
| `enableEinsteinGptPlatform` | Yes | Yes |
| `enableAgentPlatform` | Yes | Yes |
| `CustomerDataPlatform` | No | **Yes** |
| `CustomerDataPlatformLite` | No | **Yes** |
| `enableCustomerDataPlatform` | No | **Yes** |
| `enableChatter` | Yes | Yes |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CustomerDataPlatform feature not available" | Your DevHub needs Data Cloud entitlements. Contact Salesforce or use a Partner Developer Edition with CDP. |
| Data Cloud provisioning hangs | CDP provisioning can take up to 15 minutes. Refresh and wait. |
| "Insufficient privileges" on Data Cloud pages | Assign the **Data Cloud Admin** or **Data Cloud User** permission set. |
| Org creation is slow | Data Cloud orgs take 5-10 min to provision. The workflows use `--wait 15` to accommodate this. |
| Apex tests pass in Standard but fail in DC org | Check debug logs for CDP-related triggers or flows interfering. Run with `--verbose`. |

---

## Cleanup

```bash
sf org delete scratch --target-org alex-agentforce-dc --no-prompt
```

---

## CI/CD Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `agentforce-scratch-org.yml` | Test drive org (standard or DC) | Manual / PR comment (`/agentforce-dc-org`) |
| `agent-tests.yml` | Apex + agent evaluation tests | Push to main / PR / Manual |
| `agentforce-dual-org-tests.yml` | Parallel test matrix: Standard vs DC | Push to main / PR / Manual |
| `agentforce-release-beta.yml` | Create beta managed package | Manual (main only) |
