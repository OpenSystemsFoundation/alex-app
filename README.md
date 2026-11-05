# Alex — Kanban & Sprint Boards for Salesforce

<div align="center">
  <img src="assets/images/alex-app-logo-large.png" alt="Alex logo" width="200"/>

**Real-time, collaborative Kanban and sprint boards — native to Salesforce.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE-MIT)
[![Salesforce API](https://img.shields.io/badge/Salesforce%20API-v67.0-blue.svg)](https://developer.salesforce.com)

</div>

## Overview

Alex is a free, open-source Kanban board for Salesforce. Teams plan and track
work with drag-and-drop boards, sprints and a backlog, and see each other's
changes live — no external tools or integrations required. It runs entirely
on the Salesforce platform and respects your org's sharing and field-level
security.

## Features

- **Drag-and-drop boards** with LexoRank ordering for smooth, conflict-free reordering
- **Real-time collaboration** via Platform Events, with connection status and conflict detection
- **Sprints** — plan, start and complete sprints with goals, story points, progress and a completion wizard
- **Backlog** — search, filters, bulk actions, inline creation, drag-to-sprint and refinement flags
- **Card panel** — resizable side panel with comments, files and admin-defined custom fields
- **Epics and card types** with child-card rollups
- **Board filters** by priority, status, assignee and card type
- **WIP limits** and column categories (To Do / In Progress / Done)
- **Analytics** — burndown, velocity, cumulative flow, cycle time, lead time and sprint reports
- **Right-click context menus** on cards for quick moves and actions
- **Admin page** — manage boards, columns, card custom fields and onboarding
- **Reports & dashboards** — custom report types and a Kanban report folder
- **Two apps** — `Alex` (standard navigation) and `Alex Console` (console navigation)
- **Permission sets** — `Alex_Admin` and `Alex_User`

## Installation

Alex is distributed as a managed package (namespace `OpenSF`).

1. Open the [latest release](https://github.com/OpenSystemsFoundation/alex-app/releases/latest)
   and use its install link (use a sandbox or Developer Edition org for beta versions).
2. Choose **Install for Admins Only**.
3. Assign the permission sets:
    - `Alex_Admin` — admins who manage boards, columns and custom fields
    - `Alex_User` — everyone who works on boards
4. Open **Alex** or **Alex Console** from the App Launcher and create your first board.

See the [Quick Start Guide](docs/QUICKSTART.md) and the [User Guide](docs/USER-GUIDE.md).

**Upgrading from an earlier version?** Some steps need an admin after the upgrade. Follow the [upgrade guide](docs/UPGRADING.md); the Admin page also lists anything left to do.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22 LTS
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`)
- Git

### Setup

```bash
git clone https://github.com/OpenSystemsFoundation/alex-app.git
cd alex-app
npm ci
```

### Static checks (no org needed)

These are the same checks CI runs on every pull request:

```bash
npm run prettier:verify   # formatting
npm run lint              # ESLint
npm run type-check:e2e    # E2E TypeScript
npm run test:unit         # LWC Jest tests (test:unit:watch, test:unit:coverage)
```

### Working with an org

The Apex and LWC source reference the `OpenSF` namespace (`OpenSF__Board__c`, …),
so the source deploys only to **scratch orgs created from a Dev Hub linked to the
`OpenSF` namespace**. Contributors without that access can still run every static
check above, and CI validates each pull request.

```bash
# Create and set up a scratch org
sf org create scratch -f config/project-scratch-def.json -a alex-scratch -y 7 --set-default
sf project deploy start
sf org assign permset -n Alex_Admin
npm run create:sample      # sample board
sf org open

# Apex tests with coverage
npm run test:apex
```

### End-to-end tests (Playwright)

E2E tests run locally against a scratch org (they are not part of CI).
Specs skip when `SCRATCH_ORG_URL` is not set.

```bash
npx playwright install chromium
export SF_TARGET_ORG=alex-scratch
export SCRATCH_ORG_URL="$(sf org open -o alex-scratch --url-only)"

npx playwright test --project=chromium                              # all suites
npx playwright test e2e/specs/kanban-board.spec.ts --project=chromium
npm run test:e2e:headed                                             # watch the browser
npm run test:e2e:report                                             # last HTML report
```

### Project structure

```
alex-app/
├── force-app/main/default/
│   ├── classes/            # Apex: controllers, services, selectors, DTOs, tests
│   ├── lwc/                # Lightning Web Components (+ __tests__/ Jest specs)
│   ├── objects/            # Board, Column, Card, Sprint, Platform Events, ...
│   ├── triggers/           # Card, Column and SprintCard triggers
│   ├── permissionsets/     # Alex_Admin / Alex_User
│   ├── applications/       # Alex and Alex Console apps
│   └── reports/, reportTypes/, dashboards/, flexipages/, tabs/, ...
├── e2e/                    # Playwright E2E tests (TypeScript)
├── scripts/apex/           # Sample and test data scripts
├── config/                 # Scratch org definitions
└── docs/                   # Architecture, quick start, user guide
```

### Architecture

- **Lightning Web Components** with a Redux-style store (actions, pure reducers, selectors, thunks)
- **Apex** in layers: Controller → Service → Selector → DTO, all `with sharing` and `USER_MODE`
- **Platform Events** published by triggers keep every open board in sync, with echo prevention
- **LexoRank** positions for O(1) reordering

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Guidance for AI coding
agents: [AGENTS.md](AGENTS.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the code
of conduct, development workflow, coding standards and pull request process.
Use [Conventional Commits](https://www.conventionalcommits.org/) for PR titles.

## Support

- **Bugs and feature requests:** [GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- **Questions and ideas:** [GitHub Discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)
- **Security issues:** report privately — see [SECURITY.md](SECURITY.md)

## License

Dual-licensed — use it under either license, at your choice:

- [Apache License 2.0](LICENSE)
- [MIT License](LICENSE-MIT)

## Acknowledgments

- Built by [Open Systems Foundation](https://github.com/OpenSystemsFoundation)
- Development assisted by [Claude](https://claude.ai)
- Powered by the Salesforce Platform

<div align="center">
  Made with care
</div>
