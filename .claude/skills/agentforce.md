---
name: agentforce
description: Run Agentforce agent testing workflow — deploys, tests (Apex + eval), analyzes results, and iterates. Use when testing the Alex Kanban Agent.
argument-hint: "[all|apex|eval|card|sprint|board|team|estimation|validate]"
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash(sf *), Bash(npm run deploy:agent*)
---

# Test Agentforce Agent

You are an Agentforce testing specialist for the Alex Kanban Agent. Follow these steps based on the user's request.

### Step 1: Determine Test Scope

Parse the argument to determine what to test:
- No argument or "all" → run full test suite (Apex + eval)
- "apex" → Apex unit tests only
- "eval" → agent evaluation tests only
- "card", "sprint", "board", "team", "estimation" → specific topic eval tests
- "validate" → package metadata validation only

### Step 2: Check Target Org

Run `sf org list --json` to find available orgs. If no scratch org is available, ask the user if they want to create one:

```bash
sf org create scratch --definition-file config/agentforce-project-scratch-def.json --alias agent-test --duration-days 1 --wait 10
```

### Step 3: Deploy Source

Deploy both packages to the target org:

```bash
sf project deploy start --source-dir force-app --target-org <org-alias> --ignore-conflicts
sf project deploy start --source-dir force-agentforce --target-org <org-alias> --ignore-conflicts
sf org assign permset --name Alex_Admin --target-org <org-alias>
sf org assign permset --name Alex_Agentforce_User --target-org <org-alias>
```

### Step 4A: Run Apex Unit Tests (if scope includes apex)

```bash
sf apex run test \
  --target-org <org-alias> \
  --test-level RunSpecifiedTests \
  --tests AgentCardActionsTest AgentSprintActionsTest AgentBoardActionsTest AgentAssignmentActionsTest AgentEstimationActionsTest \
  --code-coverage \
  --result-format json \
  --wait 15
```

Parse the JSON output. For each test, report PASS/FAIL with method name and runtime.
If any Apex tests fail, STOP and analyze the failure:
1. Read the failing test class
2. Read the corresponding action class
3. Identify the root cause
4. Suggest or apply a fix
5. Re-run to verify

### Step 4B: Run Agent Evaluation Tests (if scope includes eval)

First install the plugin if needed:
```bash
sf plugins install @salesforce/plugin-agent 2>/dev/null || true
```

Create test definitions from YAML specs:
```bash
sf agent test create --spec force-agentforce/test/agent-test-specs/<topic>-tests.yaml --target-org <org-alias>
```

Run the tests:
```bash
sf agent test run --name <TestName> --wait 15 --target-org <org-alias> --result-format json
sf agent test results --use-most-recent --target-org <org-alias> --result-format json
```

Topic-to-test mapping:
- card → Card_Management_Tests (card-management-tests.yaml)
- sprint → Sprint_Management_Tests (sprint-management-tests.yaml)
- board → Board_Insights_Tests (board-insights-tests.yaml)
- team → Team_Assignment_Tests (team-assignment-tests.yaml)
- estimation → Estimation_Tests (estimation-tests.yaml)

### Step 4C: Validate Package (if scope includes validate)

Check that the expansion package metadata is correct:
1. Verify GenAiPlannerBundle, GenAiPlugin, GenAiFunction files exist
2. Check for BotTemplate (warn if missing — needs `sf agent generate template`)
3. Verify NO `OpenSF__` prefix in metadata XML source files
4. Verify Apex classes DO use `OpenSF__` prefix for runtime SObject references
5. Check sfdx-project.json has correct dependency on base package

### Step 5: Analyze Results

For Apex tests: Report pass/fail for each test method. If failures exist, read the source code and diagnose.

For agent evaluation tests: Parse the JSON results and calculate:
- **Topic classification accuracy** — did the agent route to the correct topic?
- **Action selection accuracy** — did the agent invoke the expected action(s)?
- **Overall pass rate** — percentage of test cases where both topic AND action matched

Report results in this format:
```
═══════════════════════════════════════════════
  AGENTFORCE TEST RESULTS
═══════════════════════════════════════════════

  Card Management:     14/16 passed (87%)
  Sprint Management:   16/18 passed (89%)
  Board Insights:      15/16 passed (94%)
  Team Assignment:     13/14 passed (93%)
  Estimation:          11/12 passed (92%)
  ─────────────────────────────────────────
  Overall:             69/76 passed (91%)
  Threshold:           80%
  Status:              PASSED
```

### Step 6: Iterate on Failures (if any)

For each failed evaluation test case:
1. Identify whether topic classification or action selection failed
2. Read the relevant GenAiPlugin (topic) XML to understand the scope instructions
3. Suggest specific improvements to the topic's scope instructions to fix misrouting
4. If the user approves, apply the fix and re-run just the failed tests

Common fixes:
- **Topic misclassification**: Add the failing utterance pattern to the topic's scope instructions
- **Action misselection**: Clarify the action descriptions or add sequencing guidance
- **Ambiguous routing**: Add exclusion language to competing topics ("Do NOT use this topic when...")

### Step 7: Report Summary

Provide a final summary with:
- Total test cases run (Apex + evaluation)
- Pass rates by category
- Any remaining failures with recommendations
- Credit consumption estimate (each eval test run consumes Agentforce credits)

## Important Notes

- Agent evaluation tests consume **Agentforce credits** — be mindful of cost
- Agent responses are **non-deterministic** — a single test failure doesn't necessarily indicate a bug
- Pass rate thresholds should be statistical: 80%+ for topic classification, 75%+ for action selection
- Always run Apex unit tests FIRST — if actions are broken, evaluation tests are meaningless
- Test specs are in `force-agentforce/test/agent-test-specs/*.yaml`
- The agent must be deployed and activated in the org before evaluation tests can run
