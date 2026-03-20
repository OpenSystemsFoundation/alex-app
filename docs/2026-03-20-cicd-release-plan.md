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
2. Read version number from `sfdx-project.json` (`versionNumber: "2.0.0.NEXT"` → Salesforce auto-increments the build number)
3. Create a managed beta package version (runs Apex tests unless skipped)
4. Commit the new package alias back to `sfdx-project.json` so version history stays in source control
5. Create a GitHub prerelease with the install URL

```yaml
# .github/workflows/release-beta.yml
name: Release Beta Package

on:
  workflow_dispatch:
    inputs:
      skip_validation:
        description: 'Skip Apex test validation (faster, not promotable)'
        type: boolean
        default: false

jobs:
  create-beta:
    name: Create Beta Managed Package
    runs-on: ubuntu-latest
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

      - name: Read version from sfdx-project.json
        id: read_version
        run: |
          VERSION_NAME=$(node -e "
            const p = require('./sfdx-project.json');
            console.log(p.packageDirectories[0].versionName);
          ")
          echo "version_name=$VERSION_NAME" >> "$GITHUB_OUTPUT"

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
            $SKIP_FLAG \
            --json)

          echo "$RESULT" | tee version-result.json

          # Extract subscriber package version ID (04t...) and version number
          node -e "
            const r = JSON.parse(require('fs').readFileSync('version-result.json','utf8'));
            const id = r.result.SubscriberPackageVersionId;
            console.log('version_id=' + id);
            console.log('install_url=https://login.salesforce.com/packaging/installPackage.apexp?p0=' + id);
          " >> "$GITHUB_OUTPUT"

      - name: Get version number from Salesforce
        id: version_info
        run: |
          node -e "
            const child = require('child_process');
            const result = JSON.parse(child.execSync(
              'sf package version report --package ${{ steps.create_version.outputs.version_id }} --json',
              {encoding:'utf8'}
            ));
            const r = result.result;
            const ver = r.MajorVersion + '.' + r.MinorVersion + '.' + r.PatchVersion;
            const full = ver + '.' + r.BuildNumber;
            console.log('version=' + ver);
            console.log('version_full=' + full);
          " >> "$GITHUB_OUTPUT"

      - name: Update sfdx-project.json with new alias
        run: |
          node -e "
            const fs = require('fs');
            const p = JSON.parse(fs.readFileSync('sfdx-project.json','utf8'));
            const alias = 'Alex - A Kanban App@${{ steps.version_info.outputs.version_full }}';
            p.packageAliases[alias] = '${{ steps.create_version.outputs.version_id }}';
            fs.writeFileSync('sfdx-project.json', JSON.stringify(p, null, 4) + '\n');
          "
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add sfdx-project.json
          git commit -m "chore: add package alias for v${{ steps.version_info.outputs.version_full }} [skip ci]"
          git push

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version_info.outputs.version }}-beta
          name: "Alex v${{ steps.version_info.outputs.version }} Beta"
          body: |
            **Beta managed package** — ${{ steps.read_version.outputs.version_name }}

            **Install URL:** ${{ steps.create_version.outputs.install_url }}
            **Package Version ID:** `${{ steps.create_version.outputs.version_id }}`
            **Salesforce Version:** ${{ steps.version_info.outputs.version_full }}

            ### Install in a sandbox or Developer Edition org:
            1. Log in to your org
            2. Navigate to: ${{ steps.create_version.outputs.install_url }}
            3. Select "Install for Admins Only" (recommended)
            4. Assign the `Alex_Admin` or `Alex_User` permission set

            > This is a beta version and has NOT been promoted for production use.
          prerelease: true
```

### 2. Promote to GA workflow (`promote-release.yml`)

**Trigger:** Manual — requires approval via GitHub `production` Environment

**What it does:**
1. Lists all beta versions and lets you pick by version number (no need to look up 04t IDs)
2. Requires approval in the GitHub UI before promoting
3. Promotes the beta to GA with `sf package version promote`
4. Creates a production GitHub Release with install link

```yaml
# .github/workflows/promote-release.yml
name: Promote to GA Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to promote (e.g. 2.0.0) — must have a beta already created'
        required: true

jobs:
  promote:
    name: Promote Managed Package to GA
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: Find package version ID
        id: find_version
        run: |
          # Find the latest build for this major.minor.patch version
          node -e "
            const child = require('child_process');
            const result = JSON.parse(child.execSync(
              'sf package version list --packages \"Alex - A Kanban App\" --json --verbose',
              {encoding:'utf8'}
            ));
            const [major, minor, patch] = '${{ inputs.version }}'.split('.').map(Number);
            const match = result.result
              .filter(v => v.MajorVersion === major && v.MinorVersion === minor && v.PatchVersion === patch)
              .filter(v => !v.IsReleased)
              .sort((a, b) => b.BuildNumber - a.BuildNumber)[0];
            if (!match) {
              console.error('No unreleased beta found for v${{ inputs.version }}');
              process.exit(1);
            }
            console.log('version_id=' + match.SubscriberPackageVersionId);
            console.log('version_full=' + major + '.' + minor + '.' + patch + '.' + match.BuildNumber);
          " >> "$GITHUB_OUTPUT"

      - name: Promote Package Version
        run: |
          sf package version promote \
            --package ${{ steps.find_version.outputs.version_id }} \
            --no-prompt

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ inputs.version }}
          name: "Alex v${{ inputs.version }}"
          body: |
            **GA Release** — Alex v${{ inputs.version }}

            **Install URL:** https://login.salesforce.com/packaging/installPackage.apexp?p0=${{ steps.find_version.outputs.version_id }}
            **Package Version ID:** `${{ steps.find_version.outputs.version_id }}`

            ### Install in any Salesforce org:
            1. Log in to your org
            2. Navigate to: https://login.salesforce.com/packaging/installPackage.apexp?p0=${{ steps.find_version.outputs.version_id }}
            3. Select "Install for Admins Only" (recommended)
            4. Assign the `Alex_Admin` or `Alex_User` permission set

            This is a promoted, production-ready managed package version.
          prerelease: false

      - name: Delete beta prerelease tag
        run: |
          gh release delete "v${{ inputs.version }}-beta" --yes || true
          git push --delete origin "v${{ inputs.version }}-beta" || true
        env:
          GH_TOKEN: ${{ github.token }}
```

## Setup required

### GitHub repository settings

1. **Create a `production` Environment** in Settings → Environments
   - Add yourself as a required reviewer
   - This gates the promote-to-GA workflow

2. **Secrets** (already have `SFDX_AUTH_URL`, nothing new needed)

3. **Permissions** — the beta workflow pushes a commit back to main (to update `sfdx-project.json` with the new alias). Ensure the workflow has write permissions: Settings → Actions → General → Workflow permissions → "Read and write permissions"

### sfdx-project.json

No changes needed. The `ancestorVersion: "HIGHEST"` setting already ensures new versions build on top of the latest released ancestor. The `versionNumber: "2.0.0.NEXT"` auto-increments the build number. To bump major/minor/patch, update this field manually before creating a beta.

### Versioning

Versions are driven by `sfdx-project.json`:

- **Major/minor/patch** — you control these by editing `versionNumber` (e.g. `"2.0.0.NEXT"` → `"2.1.0.NEXT"`)
- **Build number** — Salesforce auto-increments via `.NEXT`
- **GitHub tags** — beta creates `v2.0.0-beta`, GA promotion creates `v2.0.0` (and cleans up the beta tag)
- **Package aliases** — the beta workflow auto-commits new aliases to `sfdx-project.json` so version history stays in source control

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

3. **Version numbers come from Salesforce** — `sfdx-project.json` is the single source of truth. The workflows read from it and write back to it. GitHub Release tags match the Salesforce version.

4. **GitHub Environments for approval gating** — native GitHub feature, no third-party tools needed. You get an email, click approve in the UI, and the promotion runs.

5. **GA promotion cleans up beta tags** — when you promote `v2.0.0-beta` to GA, the workflow deletes the beta prerelease and creates a clean `v2.0.0` release. Your GitHub Releases page stays tidy.

6. **`--installation-key-bypass`** — since the app is free and open-source, no install key required. Change this if you ever need install keys.
