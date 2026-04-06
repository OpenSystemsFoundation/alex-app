# Alex OSS — Architecture & Repo Structure Plan

**Date:** 2026-04-06
**Status:** Draft — pending discussion

## Repo Layout

```
elgeffe/alexandra          (private)  — Full paid app, single source of truth
OpenSystemsFoundation/alex-app  (public)   — OSS subset, auto-published from alexandra
```

The private repo (`alexandra`) **embeds** the public repo. The OSS code lives inside the private repo and is extracted/synced to the public repo.

---

## Step 1: Set Up the Private Repo

Create `elgeffe/alexandra` (private) on your local machine:

```bash
# On your local PC
gh repo create elgeffe/alexandra --private --clone
cd alexandra
```

Then pull the full codebase (current alex-app) into it as the starting point.

---

## Step 2: Clean the Public Repo History

The current `OpenSystemsFoundation/alex-app` has the full paid codebase in its git history. Plan:

1. Create an `orphan` branch on `alex-app` — fresh history, no prior commits
2. Populate it with only the OSS-eligible files
3. Force-push to `main` (the old history is expendable — "we created a much better board anyway")

```bash
# In the alex-app public repo
git checkout --orphan clean-main
git rm -rf .
# Copy OSS files from alexandra build output
git add .
git commit -m "Initial open-source release of Alex Kanban"
git branch -M clean-main main
git push --force origin main
```

---

## Step 3: Embedding Strategy — Options

### Option A: Git Subtree (recommended)

The public repo (`alex-app`) is a **subtree** inside the private repo (`alexandra`).

```
alexandra/                          # elgeffe/alexandra (private)
├── force-app/
│   └── main/
│       └── default/
│           ├── [all source files]  # Full paid codebase
│           └── ...
├── oss/                            # ← subtree mount point
│   └── force-app/                  # Maps to alex-app public repo
│       └── main/
│           └── default/
│               ├── [OSS-only files]
│               └── ...
├── scripts/
│   └── sync-oss.sh                 # Build script: extract OSS from main → oss/
├── sfdx-project.json
└── CLAUDE.md
```

**Workflow:**
```bash
# Add public repo as subtree (one-time)
git subtree add --prefix=oss https://github.com/OpenSystemsFoundation/alex-app main --squash

# After making changes in alexandra, sync OSS subset:
./scripts/sync-oss.sh               # Copies OSS-eligible files → oss/

# Push changes to public repo
git subtree push --prefix=oss https://github.com/OpenSystemsFoundation/alex-app main
```

**Pros:** Single repo, simple mental model, bidirectional sync possible
**Cons:** Subtree push history can get messy over time

---

### Option B: Build-Time Extraction (CI-driven)

Keep a single source tree. A CI script or local build script filters out paid-only files and pushes the result to the public repo.

```
alexandra/                          # elgeffe/alexandra (private)
├── force-app/
│   └── main/
│       └── default/
│           ├── [all source files]
│           └── ...
├── .oss-manifest.json              # Declares which files are OSS-eligible
├── scripts/
│   └── publish-oss.sh              # Filter + push to public repo
├── .github/
│   └── workflows/
│       └── sync-oss.yml            # Auto-publish on merge to main
└── sfdx-project.json
```

**`.oss-manifest.json`** example:
```json
{
  "include": [
    "force-app/main/default/objects/Board__c/**",
    "force-app/main/default/objects/Card__c/**",
    "force-app/main/default/objects/Column__c/**",
    "force-app/main/default/objects/Sprint__c/**",
    "force-app/main/default/objects/SprintCard__c/**",
    "force-app/main/default/objects/CardComment__c/**",
    "force-app/main/default/objects/CardUpdateEvent__e/**",
    "force-app/main/default/objects/ColumnUpdateEvent__e/**",
    "force-app/main/default/objects/SprintUpdateEvent__e/**",
    "force-app/main/default/lwc/kanbanBoard/**",
    "force-app/main/default/lwc/kanbanCardPanel/**",
    "force-app/main/default/lwc/kanbanBacklogView/**",
    "force-app/main/default/lwc/kanbanSprintHeader/**",
    "force-app/main/default/lwc/kanbanSprintModal/**",
    "force-app/main/default/lwc/kanbanSprintComplete/**",
    "force-app/main/default/lwc/kanbanContextMenu/**",
    "force-app/main/default/lwc/kanbanStore/**",
    "force-app/main/default/lwc/connectionStatusIndicator/**",
    "force-app/main/default/lwc/storeSubscriptionMixin/**",
    "force-app/main/default/lwc/subscriptionManager/**",
    "force-app/main/default/lwc/toastManager/**",
    "force-app/main/default/lwc/toastUtils/**",
    "force-app/main/default/lwc/navigationUtil/**",
    "force-app/main/default/classes/KanbanBoardController.*",
    "force-app/main/default/classes/KanbanBoardService.*",
    "force-app/main/default/classes/KanbanCardService.*",
    "force-app/main/default/classes/KanbanBoardDTO.*",
    "force-app/main/default/classes/KanbanBoardSelector.*",
    "force-app/main/default/classes/KanbanEnums.*",
    "force-app/main/default/classes/SprintService.*",
    "force-app/main/default/classes/SprintSelector.*",
    "force-app/main/default/classes/EpicService.*",
    "force-app/main/default/classes/CardCommentService.*",
    "force-app/main/default/classes/CardUpdateRequest.*",
    "force-app/main/default/classes/BoardSelector.*",
    "force-app/main/default/classes/LexoRank.*",
    "force-app/main/default/classes/CardTriggerHandler.*",
    "force-app/main/default/classes/ColumnTriggerHandler.*",
    "force-app/main/default/classes/SprintCardTriggerHandler.*",
    "force-app/main/default/classes/TriggerHandler.*",
    "force-app/main/default/classes/TriggerContext.*",
    "force-app/main/default/classes/TestFactory.*",
    "force-app/main/default/classes/TestSettings.*",
    "force-app/main/default/flows/Column_Setup.*",
    "force-app/main/default/permissionsets/Alex_User.*",
    "force-app/main/default/permissionsets/Alex_Admin.*"
  ],
  "exclude": [
    "**/*Test.cls",
    "**/*Test.cls-meta.xml"
  ]
}
```

**`scripts/publish-oss.sh`** (sketch):
```bash
#!/bin/bash
set -euo pipefail

OSS_DIR=$(mktemp -d)
MANIFEST=".oss-manifest.json"

# Copy files matching the manifest
jq -r '.include[]' "$MANIFEST" | while read pattern; do
  for f in $pattern; do
    [ -f "$f" ] && mkdir -p "$OSS_DIR/$(dirname "$f")" && cp "$f" "$OSS_DIR/$f"
  done
done

# Clone public repo, replace contents, commit & push
cd "$OSS_DIR"
git clone git@github.com:OpenSystemsFoundation/alex-app.git _repo
cp -r force-app _repo/
cd _repo
git add -A
git commit -m "Sync from alexandra $(date +%Y-%m-%d)"
git push origin main
```

**Pros:** Clean separation, CI-automatable, manifest is explicit and auditable
**Cons:** One-directional (private → public), need to handle PRs against public repo separately

---

### Option C: Git Submodule (not recommended)

The public repo as a submodule inside `alexandra`. Rejected because:
- Submodules are painful for day-to-day development
- Two-repo editing workflow is confusing
- Doesn't solve the "shared source" problem

---

## Recommended Approach: Option B (Build-Time Extraction)

**Why:**

1. **Single source of truth** — all development happens in `alexandra`
2. **Explicit OSS boundary** — the manifest clearly declares what's public
3. **No accidental leaks** — paid code never touches the public repo unless listed
4. **CI-automatable** — merge to `main` in alexandra → auto-publish to alex-app
5. **Easy to audit** — review the manifest to see exactly what's public
6. **Supports feature flags in code** — components can conditionally render paid features, with the paid code stripped at publish time

---

## Development Workflow

```
┌─────────────────────────────────────────────────┐
│  elgeffe/alexandra (private)                    │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  force-app/ (full paid codebase)    │        │
│  │  ├── kanbanBoard (OSS ✅)           │        │
│  │  ├── planningPoker (paid only ❌)   │        │
│  │  ├── retroBoard (paid only ❌)      │        │
│  │  └── ...                            │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  .oss-manifest.json ─── defines what's public   │
│  scripts/publish-oss.sh                         │
│  .github/workflows/sync-oss.yml                 │
│                                                 │
│       │  (CI or manual: publish-oss.sh)         │
│       ▼                                         │
│  ┌─────────────────────────────────────┐        │
│  │  Filtered OSS subset                │        │
│  └──────────────┬──────────────────────┘        │
└─────────────────┼───────────────────────────────┘
                  │ git push
                  ▼
┌─────────────────────────────────────────────────┐
│  OpenSystemsFoundation/alex-app (public)        │
│  Clean main branch, OSS files only              │
│  MIT License                                    │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

1. [ ] Create `elgeffe/alexandra` (private) — manual via GitHub UI
2. [ ] Clone alexandra locally, copy full codebase from alex-app
3. [ ] Create `.oss-manifest.json` in alexandra
4. [ ] Create `scripts/publish-oss.sh`
5. [ ] Clean `alex-app` main branch (orphan branch, OSS files only)
6. [ ] Set up CI workflow (`sync-oss.yml`) for automatic publishing
7. [ ] Verify both repos deploy independently to scratch orgs
8. [ ] Strip paid-only references from OSS Apex/LWC (compile-clean)
9. [ ] Update `sfdx-project.json` for both packages
10. [ ] Test AppExchange packaging for both listings
