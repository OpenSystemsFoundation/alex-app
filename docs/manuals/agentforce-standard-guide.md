# Alex + Agentforce Standard — Installation & Usage Guide

## Overview

The **Agentforce Standard** package deploys Alex (Kanban App) with the **Agentforce extension** into a scratch org with **Einstein1 AI Platform** and **Agent Platform** enabled. The extension adds 5 AI agent topics, 22 invocable actions, and pre-configured agent scripts.

### Package Structure

| Package | Directory | Description |
|---------|-----------|-------------|
| Alex - A Kanban App | `force-alex/` | Base Kanban board, sprints, backlog, retrospectives |
| Alex - Agentforce | `force-agentforce/` | AI agent extension (topics, actions, planner, scripts) |

### What's Enabled

| Feature | Description |
|---------|-------------|
| Einstein1 AI Platform | Core AI runtime for Agentforce agents |
| Einstein GPT Platform | Generative AI for agent responses |
| Agent Platform | Enables the Agent Builder and agent deployment |
| Chatter | Required for agent conversations |

---

## Prerequisites

- **Salesforce CLI** (`sf`) — [Install Guide](https://developer.salesforce.com/tools/salesforcecli)
- **DevHub org** with Agentforce entitlements (Einstein1 AI Platform + Agent Platform)
- **SFDX auth URL** for your DevHub (GitHub secret: `SFDX_AUTH_URL`)

---

## Option 1: Create via GitHub Actions (Recommended)

### Workflow UI

1. Go to **Actions** > **Agentforce Scratch Org Test Drive**
2. Click **Run workflow**
3. Select **Package**: `standard`
4. Set **Duration**: `7` days
5. Click **Run workflow**
6. Find the login link in the **Job Summary**

### PR Comment Trigger

On any open PR, comment:

```
/agentforce-org
```

### CLI Check

```bash
gh run list --workflow=agentforce-scratch-org.yml --limit=3
gh run view <run-id>
```

---

## Option 2: Create via CLI

```bash
# 1. Authenticate DevHub
sf org login web --alias devhub --set-default-dev-hub

# 2. Create scratch org with Agentforce features
sf org create scratch \
  --definition-file config/agentforce-project-scratch-def.json \
  --alias alex-agentforce \
  --duration-days 7 \
  --wait 15

# 3. Deploy base package
sf project deploy start --source-dir force-alex --target-org alex-agentforce --ignore-conflicts

# 4. Deploy Agentforce extension
sf project deploy start --source-dir force-agentforce --target-org alex-agentforce --ignore-conflicts

# 5. Assign permission sets
sf org assign permset --name Alex_Admin --target-org alex-agentforce
sf org assign permset --name Alex_Agentforce_User --target-org alex-agentforce

# 6. Load sample data
sf apex run --file scripts/apex/CreateFilledKanbanBoard.apex --target-org alex-agentforce

# 7. Open the org
sf org open --target-org alex-agentforce
```

---

## Post-Install: Configuring the Alex Agent

### 1. Verify Einstein is Active

1. Go to **Setup** > search **Einstein Setup**
2. Ensure **Einstein** is toggled **On**

### 2. Open Agent Builder

1. In Setup, search **Agents** or **Agentforce**
2. Click **Einstein Agents**
3. The **Alex Agent** should already appear (deployed from `force-agentforce`)
4. Click to open in **Agent Builder**

### 3. Agent Topics (Pre-Configured)

The agent comes with 5 topics and 22 actions ready to use:

| Topic | Actions | What It Does |
|-------|---------|-------------|
| **Board Insights** | Get Board Summary, Get Board Layout, Get Backlog, Get Burndown, Get Velocity, Analyze Sprint Capacity | Board metrics, analytics, and summaries |
| **Card Management** | Create Card, Update Card, Delete Card, Move Card, Search Cards, Get Card Details | Full card CRUD and search |
| **Sprint Management** | Create Sprint, Start Sprint, Complete Sprint, Get Sprint Status, Add Cards To Sprint, Remove Card From Sprint | Sprint lifecycle operations |
| **Team Assignment** | Assign Card, Search Users, Get User Workload | Card assignment and workload visibility |
| **Estimation** | Estimate Story Points, Analyze Sprint Capacity, Get Velocity, Get Burndown | AI-assisted estimation and capacity planning |

### 4. Test the Agent

In the Agent Builder preview panel, try these prompts:

**Board insights:**
- *"Show me the board summary"*
- *"What's our velocity?"*
- *"Show me the burndown for the current sprint"*

**Card management:**
- *"Create a bug card called 'Login page crashes on mobile'"*
- *"Search for cards related to API timeout"*
- *"Move the login bug card to In Progress"*

**Sprint management:**
- *"What's the current sprint status?"*
- *"How many story points are in the sprint?"*
- *"Start the sprint"*

**Team assignment:**
- *"Who has the lightest workload?"*
- *"Assign the login bug to the developer with fewest cards"*

**Estimation:**
- *"Estimate story points for a dark mode feature"*
- *"Do we have capacity for 20 more story points this sprint?"*

### 5. AI Authoring Scripts

Two pre-built scripts are included:

| Script | Purpose |
|--------|---------|
| **Sprint Planning Script** | Guides the agent through sprint planning: capacity analysis, backlog grooming, and card selection |
| **Story Point Estimation Script** | Helps the agent estimate story points based on complexity, dependencies, and historical velocity |

---

## Running Tests

### Apex Unit Tests

```bash
sf apex run test \
  --target-org alex-agentforce \
  --test-level RunSpecifiedTests \
  --tests AgentCardActionsTest AgentSprintActionsTest AgentBoardActionsTest AgentAssignmentActionsTest AgentEstimationActionsTest \
  --code-coverage \
  --result-format human \
  --wait 15
```

### Agent Evaluation Tests

```bash
# Install the agent test plugin
sf plugins install @salesforce/plugin-agent || true

# Create test definitions
for spec in force-agentforce/test/agent-test-specs/*.yaml; do
  sf agent test create --spec "$spec" --target-org alex-agentforce
done

# Run all agent tests
for test in Card_Management_Tests Sprint_Management_Tests Board_Insights_Tests Team_Assignment_Tests Estimation_Tests; do
  sf agent test run --name "$test" --wait 15 --target-org alex-agentforce
  sf agent test results --use-most-recent --target-org alex-agentforce
done
```

### Via GitHub Actions

**Agent Tests** (Apex + evaluation): `agent-tests.yml`
```bash
gh workflow run agent-tests.yml
```

**Dual-Org Matrix** (Standard + Data Cloud):
```bash
gh workflow run agentforce-dual-org-tests.yml --field package=standard
```

---

## Scratch Org Definition

**File:** `config/agentforce-project-scratch-def.json`

| Feature/Setting | Purpose |
|----------------|---------|
| `Einstein1AIPlatform` | Enables Einstein AI runtime — required for Agentforce |
| `enableEinsteinGptPlatform` | Enables generative AI responses in agents |
| `enableAgentPlatform` | Enables Agent Builder and agent deployment |
| `enableChatter` | Required for agent conversations |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scratch org creation fails | Your DevHub needs Agentforce entitlements. Contact Salesforce to enable Einstein1 AI Platform + Agent Platform. |
| Agent not visible in Agent Builder | Ensure `Alex_Agentforce_User` permset is assigned. Check that `force-agentforce` deployed successfully. |
| Actions fail with "insufficient access" | Assign both `Alex_Admin` and `Alex_Agentforce_User` permission sets. |
| Agent test spec creation fails | Install the plugin: `sf plugins install @salesforce/plugin-agent`. Ensure the agent is deployed first. |
| "Custom permission not found" error | Deploy `force-agentforce` before assigning permsets — it contains `Use_Alex_Agent` custom permission. |

---

## Cleanup

```bash
sf org delete scratch --target-org alex-agentforce --no-prompt
```

---

## CI/CD Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `agentforce-scratch-org.yml` | Create test drive org | Manual / PR comment (`/agentforce-org`) |
| `agent-tests.yml` | Apex + agent evaluation tests | Push to main / PR / Manual |
| `agentforce-dual-org-tests.yml` | Parallel test matrix: Standard + DC | Push to main / PR / Manual |
| `agentforce-release-beta.yml` | Create beta managed package | Manual (main only) |
