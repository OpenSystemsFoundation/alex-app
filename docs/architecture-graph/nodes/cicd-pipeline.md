# cicd-pipeline

> CI/CD infrastructure — GitHub Actions workflows for testing, packaging, deployment, and quality gates.

## Node Metadata
- **id**: cicd-pipeline
- **status**: stable
- **package**: (cross-cutting — not in any single package)

## Edges
| Target | Type | Description |
|--------|------|-------------|
| apex-services | reads-from | Apex test execution (apex-tests.yml, run-apex-tests.yml) |
| kanban-store | reads-from | Jest unit tests (test.yml) |
| kanban-board | reads-from | E2E Playwright tests (e2e-tests.yml, e2e-suite.yml) |

## Schema

### Workflows
| Workflow | Purpose |
|----------|---------|
| scratch-org.yml | Creates scratch org and runs all tests |
| apex-tests.yml | Apex-only test suite |
| run-apex-tests.yml | Reusable Apex test runner |
| test.yml | Jest LWC unit tests |
| e2e-tests.yml | Playwright E2E test suite |
| e2e-suite.yml | Full E2E suite orchestration |
| e2e-multi-user.yml | Multi-user real-time sync E2E tests |
| chromium-e2e-debug.yml | AI-assisted E2E debug loop (claude/* branches) |
| e2e-cleanup.yml | E2E test environment cleanup |
| deploy-to-org.yml | Manual deployment to target org |
| release-beta.yml | Beta package version creation |
| agentforce-release-beta.yml | Agentforce package beta |
| promote-release.yml | Promote beta to released |
| package-versions.yml | Package version management |
| version-bump.yml | Version number bumping |
| agentforce-scratch-org.yml | Agentforce scratch org setup |
| agentforce-dual-org-tests.yml | Dual-org agentforce testing |
| agent-tests.yml | Agentforce agent tests |
| security-scan.yml | Security vulnerability scanning |
| benchmark-apex.yml | Apex performance benchmarks |
| benchmark-lwc.yml | LWC performance benchmarks |
| benchmark-e2e-performance.yml | E2E performance benchmarks |
| benchmark-code-quality.yml | Code quality metrics |

### E2E Test Specs
| Spec | Coverage |
|------|----------|
| kanban-board.spec.ts | Core board rendering and interaction |
| card-panel.spec.ts | Card detail panel CRUD |
| card-comments.spec.ts | Card comment operations |
| card-files.spec.ts | File attachment operations |
| card-linking.spec.ts | Card-to-card linking |
| card-sync.spec.ts | Real-time card sync |
| drag-drop-sync.spec.ts | Drag-drop with sync verification |
| sprint-management.spec.ts | Sprint lifecycle E2E |
| backlog-view.spec.ts | Backlog operations |
| board-filters.spec.ts | Board filtering |
| board-toolbar.spec.ts | Toolbar interactions |
| analytics.spec.ts | Analytics tab |
| admin-management.spec.ts | Admin panel |
| team-management.spec.ts | Team operations |
| epic-management.spec.ts | Epic CRUD |
| planning-poker.spec.ts | Poker session E2E |
| retrospective.spec.ts | Retro board E2E |
| undo-redo.spec.ts | Undo/redo operations |
| unhappy-paths.spec.ts | Error handling and edge cases |
| performance.spec.ts | Performance benchmarks |

### E2E Infrastructure
- **Config**: e2e/tsconfig.json (TypeScript strict mode)
- **Helpers**: e2e/helpers/ (test utilities)
- **Pages**: e2e/pages/ (Page Object Model)
- **Fixtures**: e2e/fixtures/ (test data)
- **Global Setup**: e2e/global-setup.ts

## Roadmap
### Now
- AI-assisted E2E debug loop via chromium-e2e-debug.yml
- Multi-user real-time sync tests

### Next
- Visual regression testing with screenshot comparison
- Test parallelization across scratch orgs

### Future
- Canary deployment pipeline
- Automated rollback on test failure in production

## Known Issues
- E2E tests require USER_A_LOGIN_URL and USER_B_LOGIN_URL secrets for multi-user specs
- chromium-e2e-debug.yml posts results as commit comments — can flood PR if pushed frequently
- Security scan workflow may produce false positives on Apex dynamic SOQL in selectors
