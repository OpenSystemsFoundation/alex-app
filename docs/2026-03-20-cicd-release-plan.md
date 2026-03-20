# CI/CD Release Automation Plan

**Date:** 2026-03-20
**Status:** Planning
**Author:** Jeff Kroon / Claude (pair)

## Context

Alex is a Salesforce managed package listed on AppExchange (v1.1.1 released, v1.2 created but unreleased). Until now, package creation and promotion have been manual. The project uses trunk-based development with short-lived feature branches merging into `main`.

### Current state

- **3 CI workflows** already run: `test.yml` (lint + LWC Jest on all pushes), `apex-tests.yml` (scratch org Apex tests on main), `security-scan.yml` (code analyzer + npm audit on PRs)
- **Package versions** are tracked in `sfdx-project.json` under `packageAliases`
- **DevHub** auth is already set up via `SFDX_AUTH_URL` secret
- **Main branch sometimes has bugs** — managed package releases must NOT be automatic

### Goals

1. Automate **beta managed package** creation from main (for testers / early adopters)
2. Keep managed package **promotion** (GA release) as a manual, approval-gated step
3. Keep it simple — no custom tooling, just GitHub Actions + Salesforce CLI

## Package types explained

| Type | Namespace | Upgradeable | Use case |
|------|-----------|-------------|----------|
| **Managed Beta** | Yes (`OpenSF__`) | Yes (can upgrade to GA) | Pre-release testing, QA, staging orgs |
| **Managed GA** | Yes (`OpenSF__`) | Yes (production upgrades) | AppExchange, production installs |

## Plan

### 1. Beta managed package workflow (`release-beta.yml`)

**Trigger:** Manual (`workflow_dispatch`) from main only

**What it does:**
1. Authenticate to DevHub
2. Create a new managed package version with `--skip-validation` set to false (runs Apex tests in package org)
3. Tag the version as beta (`sf package version create` produces beta by default)
4. Post the install URL to a GitHub Release tagged `beta-vX.Y.Z`

```yaml
# .github/workflows/release-beta.yml
name: Release Beta Package

on:
  workflow_dispatch:
    inputs:
      version_name:
        description: 'Version name (e.g. ver 2.0 Beta 1)'
        required: true
      skip_validation:
        description: 'Skip Apex test validation (faster, not promotable)'
        type: boolean
        default: false

jobs:
  create-beta:
    name: Create Beta Managed Package
    runs-on: ubuntu-latest
    # Only allow from main branch
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: Create Package Version
        id: create_version
        run: |
          SKIP_FLAG=""
          if [ "${{ inputs.skip_validation }}" = "true" ]; then
            SKIP_FLAG="--skip-validation"
          fi

          RESULT=$(sf package version create \
            --package "Alex - A Kanban App" \
            --installation-key-bypass \
            --wait 30 \
            --code-coverage \
            --version-name "${{ inputs.version_name }}" \
            $SKIP_FLAG \
            --json)

          echo "$RESULT" | tee version-result.json

          VERSION_ID=$(echo "$RESULT" | node -e "
            let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
              const j=JSON.parse(d);
              console.log(j.result.SubscriberPackageVersionId);
            });
          ")

          echo "version_id=$VERSION_ID" >> "$GITHUB_OUTPUT"
          echo "install_url=https://login.salesforce.com/packaging/installPackage.apexp?p0=$VERSION_ID" >> "$GITHUB_OUTPUT"

      - name: Get Version Number
        id: version_info
        run: |
          INFO=$(sf package version list --packages "Alex - A Kanban App" --json --order-by CreatedDate --verbose | tail -1)
          VERSION=$(sf package version report --package ${{ steps.create_version.outputs.version_id }} --json | node -e "
            let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
              const j=JSON.parse(d);
              const r=j.result;
              console.log(r.MajorVersion+'.'+r.MinorVersion+'.'+r.PatchVersion+'.'+r.BuildNumber);
            });
          ")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: beta-v${{ steps.version_info.outputs.version }}
          name: "Alex Beta v${{ steps.version_info.outputs.version }}"
          body: |
            **Beta managed package** — ${{ inputs.version_name }}

            **Install URL:** ${{ steps.create_version.outputs.install_url }}

            > Beta packages can be installed in sandbox and Developer Edition orgs for testing.
            > This version has NOT been promoted to GA and is not suitable for production.
          prerelease: true
```

### 2. Promote to GA workflow (`promote-release.yml`)

**Trigger:** Manual with required approval via GitHub Environment

**What it does:**
1. Takes a package version ID (from a previous beta)
2. Requires approval from the `production` GitHub Environment (you approve in the GitHub UI)
3. Promotes the version with `sf package version promote`
4. Creates a GA GitHub Release

```yaml
# .github/workflows/promote-release.yml
name: Promote to GA Release

on:
  workflow_dispatch:
    inputs:
      package_version_id:
        description: 'Package Version ID to promote (04t...)'
        required: true
      version_label:
        description: 'Version label (e.g. 2.0.0)'
        required: true

jobs:
  promote:
    name: Promote Managed Package to GA
    runs-on: ubuntu-latest
    environment: production  # <-- Requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: Promote Package Version
        run: |
          sf package version promote \
            --package ${{ inputs.package_version_id }} \
            --no-prompt

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ inputs.version_label }}
          name: "Alex v${{ inputs.version_label }}"
          body: |
            **GA Release** — Alex v${{ inputs.version_label }}

            **Install URL:** https://login.salesforce.com/packaging/installPackage.apexp?p0=${{ inputs.package_version_id }}

            This is a promoted, production-ready managed package version.
          prerelease: false
```

## Setup required

### GitHub repository settings

1. **Create a `production` Environment** in Settings → Environments
   - Add yourself as a required reviewer
   - This gates the promote-to-GA workflow

2. **Secrets** (already have `SFDX_AUTH_URL`, nothing new needed)

### sfdx-project.json

No changes needed. The `ancestorVersion: "HIGHEST"` setting already ensures new versions build on top of the latest released ancestor.

## Release flow (how it all fits together)

```
Feature branch
    │
    ├── Push → test.yml runs (lint, LWC Jest)
    │
    ▼
Pull Request to main
    │
    ├── test.yml + apex-tests.yml + security-scan.yml all run
    │
    ▼
Merge to main
    │
    ├── Ready for beta?  → Run "Release Beta Package" (manual trigger)
    │                       → Creates a managed beta version
    │                       → Posts install URL to GitHub Release
    │
    └── Ready for GA?    → Run "Promote to GA Release" (manual trigger)
                            → Requires approval in GitHub UI
                            → Promotes beta to GA
                            → Creates production GitHub Release
```

## Key design decisions

1. **All releases are manual triggers** — no auto-release on merge. This is intentional because main can have bugs, and managed package creation is irreversible (you can't delete a version, only deprecate it).

2. **Beta before GA** — you always create a beta first, test it, then promote. You can never go straight from code to GA. This matches your current manual flow, just automated.

3. **GitHub Environments for approval gating** — native GitHub feature, no third-party tools needed. You get an email, click approve in the UI, and the promotion runs.

4. **`--installation-key-bypass`** — since the app is free and open-source, no install key required. Change this if you ever need install keys.
