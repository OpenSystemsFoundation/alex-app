# Agentforce Extension Package — Research & Architecture Plan

**Date:** 2026-03-20
**Status:** Research Complete — Ready for Implementation

---

## 1. What is Agentforce?

Agentforce is Salesforce's agentic AI platform that enables organizations to build, deploy, and manage autonomous AI agents directly within Salesforce. Following Dreamforce 2025 and the GA launch of **Agentforce 360** (January 2026), the platform includes:

- **Agentforce Builder** — visual agent development
- **Agent Script** — granular control over agent behavior
- **Agentforce Voice** — natural language voice interactions
- **Intelligent Context** — grounding agents in complex unstructured data
- **Custom Actions** — Flow-based and Apex-based actions agents can invoke
- **Topics (GenAiPlugin)** — categories of related actions for a specific job
- **Agent Templates** — packageable, distributable agent definitions

Agents leverage live CRM data, execute Flows and Apex, and can autonomously update records. Powered by the **Atlas Reasoning Engine** (NLP + specialized LLMs).

### Agentforce Evolution Timeline

| Date | Milestone |
|---|---|
| Oct 2024 | Agentforce launch |
| Dec 2024 | Agentforce 2 (improved Atlas Reasoning Engine) |
| Mar 2025 | Agentforce 2dx (proactive trigger-based agents) + **AgentExchange marketplace** launch |
| Jun 2025 | Agentforce 3 (interoperability, governance) |
| Dreamforce 2025 | Agentforce 360 GA — "most significant expansion of the Salesforce Platform for partners since Force.com" |
| Jan 2026 | Agentforce 360 updates — Builder, Agent Script (API v65+), Voice, Intelligent Context |

### ISV / Partner Integration

Salesforce opened Agentforce 360 to ISVs. Partners can build, distribute, and monetize agentic applications. Two distribution channels:

1. **AppExchange** — traditional managed package listing (free or paid)
2. **AgentExchange** ([agentexchange.salesforce.com](https://agentexchange.salesforce.com)) — Agentforce-specific marketplace supporting four component types:
   - **Actions** — new integrations (Apex, flows, APIs, prompts)
   - **Prompt Templates** — reusable prompts
   - **Topics** — grouped actions with instructions
   - **Agent Templates** — full solutions combining topics, actions, metadata, and instructions

## 2. Agentforce Metadata Types (Packageable in 2GP)

As of Spring '26 (API v66.0), the following Agentforce metadata types are officially packageable in second-generation managed packages:

| Metadata Type | Purpose | API Version |
|---|---|---|
| **Bot** | Base chatbot/agent definition | 45.0+ |
| **BotVersion** | Versioned bot configuration | 45.0+ |
| **GenAiPlannerBundle** | Agent planner (replaces GenAiPlanner) — container for all topics and actions | 64.0+ |
| **GenAiPlugin** | Agent Topic — a category of related actions | 60.0+ |
| **GenAiFunction** | Agent Action — individual action the agent can perform | 60.0+ |
| **GenAiPromptTemplate** | Prompt template for LLM interactions | 60.0+ |
| **LightningTypeBundle** | Custom Lightning types for action I/O | 62.0+ |
| **AiAuthoringBundle** | Agent Script blueprint | 65.0+ |

### Metadata Hierarchy

```
Bot (agent shell)
└── BotVersion (versioned config)
    └── GenAiPlannerBundle (the "brain" — makes it an agent, not just a chatbot)
        ├── GenAiPlugin (Topic: "Sprint Planning")
        │   ├── GenAiFunction (Action: "Create Sprint")
        │   ├── GenAiFunction (Action: "Assign Cards to Sprint")
        │   └── GenAiFunction (Action: "Get Sprint Status")
        ├── GenAiPlugin (Topic: "Retrospectives")
        │   ├── GenAiFunction (Action: "Summarize Sprint")
        │   └── GenAiFunction (Action: "Generate Retro Report")
        └── GenAiPlugin (Topic: "Board Queries")
            ├── GenAiFunction (Action: "Search Cards")
            └── GenAiFunction (Action: "Get Board Summary")
```

### DX Source Structure

```
force-agentforce/main/default/
├── bots/
│   └── Alex_Agent/
│       └── Alex_Agent.bot-meta.xml
├── botVersions/
│   └── Alex_Agent/
│       └── v1.botVersion-meta.xml
├── genAiPlannerBundles/
│   └── Alex_Agent_Planner/
│       ├── Alex_Agent_Planner.genAiPlannerBundle-meta.xml
│       ├── topics/
│       │   └── Sprint_Planning/
│       │       └── schema.json
│       └── localActions/
│           └── schema.json
├── genAiPlugins/
│   ├── Sprint_Planning.genAiPlugin-meta.xml
│   ├── Retrospectives.genAiPlugin-meta.xml
│   └── Board_Queries.genAiPlugin-meta.xml
├── genAiFunctions/
│   ├── Create_Sprint.genAiFunction-meta.xml
│   ├── Summarize_Sprint.genAiFunction-meta.xml
│   └── Search_Cards.genAiFunction-meta.xml
└── classes/
    ├── AgentSprintAction.cls
    ├── AgentRetroAction.cls
    ├── AgentBoardQueryAction.cls
    └── tests/
        ├── AgentSprintActionTest.cls
        ├── AgentRetroActionTest.cls
        └── AgentBoardQueryActionTest.cls
```

## 3. Extension Package Strategy — Same Namespace vs. Different Namespace

### Option A: Same Namespace (`OpenSF`) — RECOMMENDED

Since the base package (Alex) is already a **2GP managed package** with namespace `OpenSF`, the extension can share the same namespace.

**Advantages:**
- No namespace prefix headaches — extension metadata references base objects like `Sprint__c` directly (no `OpenSF__` prefix needed in metadata XML)
- `@namespaceAccessible` annotation on base Apex classes allows the extension to call them directly
- Simpler local development — both packages deploy to the same scratch org seamlessly
- Single Dev Hub manages everything
- Same IDE, same repo, no namespace collision worries

**Disadvantages:**
- Must avoid API name collisions between packages (Salesforce scopes names to namespace, not package)
- Tighter coupling between base and extension release cycles

### Option B: Different Namespace (e.g., `AlexAI`)

**Advantages:**
- Complete isolation — independent release cadence
- Cleaner separation of concerns

**Disadvantages:**
- Base package Apex classes must be `global` (not just `public`) to be callable from the extension
- Extension metadata must use `OpenSF__Sprint__c` prefix everywhere (referencing base objects cross-namespace)
- More complex development workflow
- Requires a separate namespace org or linked namespace

### Decision: **Option A — Same Namespace (`OpenSF`)**

Since we control both packages and they're in the same repo/Dev Hub, sharing the namespace is the Salesforce-recommended approach for 2GP. We use `@namespaceAccessible` on any base Apex classes the extension needs to call.

## 4. Monetization & Distribution

### AppExchange Listing Options

| Model | Description | Fits Our Case? |
|---|---|---|
| **Free** | 100% free, no strings attached | Yes — aligns with giving it away |
| **Freemium** | Free base, pay for premium features | Possible future option |
| **Paid** | Requires payment | No — app is free |
| **Paid Add-On** | Requires external purchase | No |

### Key Facts

- **Listing a free app on AppExchange is free** — no security review fee for free apps
- **Paid apps cost $999** for initial security review submission
- **Revenue share:** 15% (ISVforce) or 25% (OEM) for paid apps — not applicable for free
- **You CAN list a free extension** that depends on a free base package
- **License gating:** The extension can check for Agentforce licenses at runtime and gracefully degrade if not present (since Agentforce requires specific Salesforce licenses/permission sets)

### Free Listing Policy — Important Detail

Salesforce's policy states: a free app must be genuinely free and fully functional with no hidden paywalls. A "free" listing **cannot require the customer to purchase another application from the same partner**. Since both the base Alex app and this extension are free, this is not a problem — both are genuinely free.

If you later wanted to charge for the extension, it would become "freemium" and require a Salesforce commercial agreement (15% PNR revenue share).

### Recommended Approach

1. **List the Agentforce extension as a FREE package on both AppExchange and AgentExchange**
2. **AgentExchange** is the better discovery channel — it's specifically for Agentforce customers
3. The extension declares a dependency on the base "Alex" package
4. Natural gating: the agent metadata (GenAiFunction, etc.) only works if the org has Agentforce — no custom license checks needed
5. This is a value-add for Alex users who happen to have Agentforce — zero friction
6. If you ever want to monetize later, you can switch the listing to Freemium or Paid

## 5. Project Structure — Restructuring Plan

### Current Structure (flat)

```
alex-app/
├── force-alex/main/default/     ← everything in one flat directory
│   ├── classes/                 ← all Apex classes (services, selectors, tests mixed)
│   ├── lwc/                    ← all LWC components
│   ├── objects/                ← all custom objects
│   ├── triggers/
│   ├── flows/
│   ├── permissionsets/
│   └── ...
└── sfdx-project.json           ← single packageDirectory
```

### Proposed Structure (modular, multi-package)

```
alex-app/
├── force-alex/                          ← BASE PACKAGE: Alex - A Kanban App (OpenSF)
│   └── main/default/
│       ├── applications/
│       ├── classes/                     ← base Apex (controllers, services, selectors, DTOs)
│       │   └── tests/                  ← base Apex tests
│       ├── customMetadata/
│       ├── customPermissions/
│       ├── dashboards/
│       ├── flexipages/
│       ├── flows/
│       ├── globalValueSets/
│       ├── layouts/
│       ├── lwc/                        ← base LWC components
│       ├── notificationtypes/
│       ├── objects/                    ← base custom objects
│       ├── permissionsets/
│       ├── quickActions/
│       ├── reportTypes/
│       ├── reports/
│       ├── tabs/
│       └── triggers/
│
├── force-agentforce/                    ← EXTENSION PACKAGE: Alex - Agentforce (OpenSF)
│   └── main/default/
│       ├── bots/                       ← Agent definitions
│       ├── botVersions/               ← Agent versions
│       ├── genAiPlannerBundles/       ← Agent planner (the "brain")
│       ├── genAiPlugins/              ← Topics (Sprint Planning, Retro, Queries)
│       ├── genAiFunctions/            ← Actions (invocable Apex wrappers)
│       ├── genAiPromptTemplates/      ← Prompt templates
│       ├── classes/                    ← Extension Apex (agent actions, handlers)
│       │   └── tests/                 ← Extension Apex tests
│       ├── customPermissions/         ← Agentforce-specific permissions
│       ├── flows/                     ← Agent-invocable flows
│       └── permissionsets/            ← Alex_Agentforce_User permission set
│
├── config/                             ← scratch org definitions
├── docs/                               ← documentation
├── scripts/                            ← automation scripts
├── e2e/                                ← Playwright e2e tests
└── sfdx-project.json                   ← multi-package configuration
```

### Updated sfdx-project.json

```json
{
    "packageDirectories": [
        {
            "path": "force-alex",
            "default": true,
            "package": "Alex - A Kanban App",
            "versionName": "ver 2.0",
            "versionNumber": "2.0.0.NEXT",
            "ancestorVersion": "HIGHEST",
            "versionDescription": "Manage your workflows with Alex, a Kanban App.",
            "definitionFile": "config/default-project-scratch-def.json"
        },
        {
            "path": "force-agentforce",
            "package": "Alex - Agentforce",
            "versionName": "ver 1.0",
            "versionNumber": "1.0.0.NEXT",
            "versionDescription": "Agentforce AI agent extension for Alex Kanban — sprint planning assistant, retrospective summarizer, smart auto-assignment, natural language board queries.",
            "definitionFile": "config/default-project-scratch-def.json",
            "dependencies": [
                {
                    "package": "Alex - A Kanban App",
                    "versionNumber": "2.0.0.LATEST"
                }
            ]
        }
    ],
    "name": "OpenSF",
    "namespace": "OpenSF",
    "sfdcLoginUrl": "https://login.salesforce.com",
    "sourceApiVersion": "66.0",
    "packageAliases": {
        "Alex - A Kanban App": "0HoWV00000003nV0AQ",
        "Alex - Agentforce": "<TO_BE_CREATED>"
    }
}
```

## 6. Base Package — Test Organization Cleanup

The AGENTS.md says test classes should be in `force-alex/main/default/classes/tests/`, but currently all test classes sit flat alongside production classes. As part of the restructure, we should move test classes into the `tests/` subdirectory as originally intended.

## 7. Agentforce Agent Design — Alex Sprint Assistant

### Topics & Actions

| Topic | Actions | Implementation |
|---|---|---|
| **Sprint Planning** | Create Sprint, Add Cards to Sprint, Get Sprint Capacity, Suggest Card Assignment | Apex invocable actions wrapping `SprintService` |
| **Retrospectives** | Summarize Completed Sprint, Generate Retro Highlights, Compare Sprint Velocity | Apex actions wrapping `SprintSelector` + LLM summarization |
| **Smart Auto-Assignment** | Suggest Assignee, Balance Workload, Get Team Capacity | Apex actions analyzing card distribution and story points |
| **Board Queries** | Search Cards, Get Board Summary, Filter by Status/Priority/Epic, Get Blocked Cards | Apex actions wrapping `KanbanBoardSelector` with natural language parsing |

### Key Architecture Decisions

1. **Extension Apex calls base Apex via `@namespaceAccessible`** — no need for `global` classes
2. **GenAiFunction actions wrap existing services** — thin adapter layer, business logic stays in base package
3. **Prompt templates guide the LLM** — each topic has tailored system prompts for Alex's domain
4. **Permission set `Alex_Agentforce_User`** — gates access to agent features
5. **Custom permission `Use_Alex_Agent`** — runtime check for feature activation

## 8. Prerequisites for Agentforce Development

- **Salesforce org with Agentforce licenses** (Einstein AI + Agentforce add-on)
- **API version 64.0+** (for GenAiPlannerBundle support) — we're on 66.0, good
- **Permission sets:** Agentforce, Einstein Prompt Templates, Prompt Template Manager
- **Scratch org feature:** `EinsteinGPTForDevelopers` or equivalent in scratch org definition

## 9. Sources

- [Package Agentforce Metadata Components — 2GP Dev Guide](https://developer.salesforce.com/docs/atlas.en-us.pkg2_dev.meta/pkg2_dev/dev2gp_packageable_agentforce_md.htm)
- [Agentforce DX Metadata Types](https://developer.salesforce.com/docs/einstein/genai/references/agents-metadata-tooling/agents-metadata.html)
- [Agent DX Metadata Guide](https://developer.salesforce.com/docs/einstein/genai/guide/agent-dx-metadata.html)
- [2GP Developer Guide (Spring '26 PDF)](https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/pkg2_dev.pdf)
- [Multiple Package Directories — SFDX Dev Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_mpd.htm)
- [Create Dependencies Between 2GP Packages](https://developer.salesforce.com/docs/atlas.en-us.pkg2_dev.meta/pkg2_dev/sfdx_dev_dev2gp_create_dependencies.htm)
- [Namespaces for 2GP](https://developer.salesforce.com/docs/atlas.en-us.pkg2_dev.meta/pkg2_dev/sfdx_dev_dev2gp_plan_namespaces.htm)
- [AppExchange Pricing Strategy (Trailhead)](https://trailhead.salesforce.com/content/learn/modules/appexchange-pricing-strategy-for-partners/know-your-contractual-model)
- [Agentforce 2026 Updates](https://salesforcemonday.com/2026/01/29/agentforce-january-2026-updates-features/)
- [Agentforce Metadata Deployment Guide — Accelirate](https://www.accelirate.com/agentforce-metadata-deployment/)
- [ISVforce Guide (Spring '26)](https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/salesforce_packaging_guide.pdf)
- [AppExchange Pricing & Monetization — MagicFuse](https://magicfuse.co/blog/appexchange-pricing-and-monetisation)
- [2GP Two Packages One Namespace — Foglight Solutions](https://www.foglightsolutions.com/blog/2gp_multiple_packages/)
- [Share Namespace with Multiple 2GP Packages](https://medium.com/@bobmatt3/salesforce-2gp-share-a-single-namespace-with-multiple-packages-cd5c6317384)
- [AgentExchange Marketplace](https://agentexchange.salesforce.com/)
- [AgentExchange Announcement — Salesforce](https://www.salesforce.com/news/press-releases/2025/03/04/agentexchange-announcement/)
- [Salesforce Opens Agentforce 360 to ISVs — Salesforce Ben](https://www.salesforceben.com/salesforce-opens-agentforce-360-to-isvs-so-partners-can-build-and-distribute-ai-agents/)
- [Agentforce 360 Features — Salesforce Developers Blog](https://developer.salesforce.com/blogs/2025/10/build-and-optimize-agents-with-new-agentforce-360-features)
- [Free AppExchange Listing Policy — Aquiva Labs](https://aquivalabs.com/the-truth-about-free-appexchange-listings-a-guide-for-prospective-salesforce-isv-partners/)
- [Agentforce Implementation for ISVs — CEPTES](https://ceptes.com/blogs/agentforce-implementation-for-isvs-harnessing-ai-to-transform-salesforce-alexs/)
- [Namespace Behavior in 2GP — Greytrix](https://www.greytrix.com/blogs/salesforce/2026/01/13/understanding-namespace-behavior-in-salesforce-second-generation-packaging-2gp/)
