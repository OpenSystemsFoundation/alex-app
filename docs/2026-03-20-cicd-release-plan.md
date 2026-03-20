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

### 3. Scratch org test drive (`scratch-org.yml`)

**Trigger:** Manual — spin up a scratch org, deploy, run tests, and get login credentials. No IDE needed.

```yaml
# .github/workflows/scratch-org.yml
name: Scratch Org Test Drive

on:
  workflow_dispatch:
    inputs:
      duration:
        description: 'Scratch org duration in days (1-30)'
        type: number
        default: 7
      branch:
        description: 'Branch to deploy (default: current)'
        required: false

jobs:
  create-scratch:
    name: Create & Deploy Scratch Org
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.branch || github.ref }}

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: Create Scratch Org
        run: |
          sf org create scratch \
            --definition-file config/project-scratch-def.json \
            --alias test-drive \
            --duration-days ${{ inputs.duration }} \
            --wait 10

      - name: Deploy Source
        run: sf project deploy start --target-org test-drive --ignore-conflicts

      - name: Assign Permission Sets
        run: sf org assign permset --name Alex_Admin --target-org test-drive

      - name: Run Apex Tests
        run: |
          sf apex run test --target-org test-drive --code-coverage --result-format human --wait 15 || true

      - name: Generate Login URL
        id: login
        run: |
          LOGIN_URL=$(sf org open --target-org test-drive --url-only 2>&1)
          echo "::notice::Scratch Org Login URL (valid for ${{ inputs.duration }} days): $LOGIN_URL"
          echo "login_url=$LOGIN_URL" >> "$GITHUB_OUTPUT"

      - name: Post Summary
        run: |
          echo "## Scratch Org Ready" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "**Branch:** \`${{ inputs.branch || github.ref_name }}\`" >> "$GITHUB_STEP_SUMMARY"
          echo "**Duration:** ${{ inputs.duration }} days" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "**Login URL:** ${{ steps.login.outputs.login_url }}" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "> The login URL is a one-time use link. Bookmark your org after logging in." >> "$GITHUB_STEP_SUMMARY"
```

### 4. Package version dashboard (`package-versions.yml`)

**Trigger:** Manual — lists all package versions with status, install links, and code coverage.

```yaml
# .github/workflows/package-versions.yml
name: Package Versions

on:
  workflow_dispatch:

jobs:
  list-versions:
    name: List Package Versions
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: List Package Versions
        run: |
          RESULT=$(sf package version list \
            --packages "Alex - A Kanban App" \
            --verbose \
            --json)

          node -e "
            const result = JSON.parse(process.argv[1]);
            const versions = result.result || [];
            const fs = require('fs');

            let md = '## Alex Package Versions\n\n';
            md += '| Version | Build | Status | Coverage | Install URL |\n';
            md += '|---------|-------|--------|----------|-------------|\n';

            versions
              .sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate))
              .forEach(v => {
                const ver = v.MajorVersion + '.' + v.MinorVersion + '.' + v.PatchVersion;
                const build = ver + '.' + v.BuildNumber;
                const status = v.IsReleased ? 'GA' : (v.ValidationSkipped ? 'Beta (unvalidated)' : 'Beta');
                const coverage = v.CodeCoverage ? v.CodeCoverage.apexCodeCoveragePercentage + '%' : 'N/A';
                const url = 'https://login.salesforce.com/packaging/installPackage.apexp?p0=' + v.SubscriberPackageVersionId;
                const link = '[Install](' + url + ')';
                md += '| ' + ver + ' | ' + build + ' | ' + status + ' | ' + coverage + ' | ' + link + ' |\n';
              });

            md += '\n> Generated on ' + new Date().toISOString().split('T')[0];
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);

            // Also print to console
            console.log('');
            versions
              .sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate))
              .forEach(v => {
                const ver = v.MajorVersion + '.' + v.MinorVersion + '.' + v.PatchVersion + '.' + v.BuildNumber;
                const status = v.IsReleased ? 'GA' : 'Beta';
                const id = v.SubscriberPackageVersionId;
                console.log(ver.padEnd(12) + status.padEnd(8) + id);
              });
          " "$RESULT"
```

### 5. Deploy to org (`deploy-to-org.yml`)

**Trigger:** Manual — deploy source to any authenticated org (staging, UAT, production sandbox).

Requires additional auth URL secrets for target orgs (e.g. `STAGING_AUTH_URL`, `UAT_AUTH_URL`).

```yaml
# .github/workflows/deploy-to-org.yml
name: Deploy to Org

on:
  workflow_dispatch:
    inputs:
      target_org:
        description: 'Target org'
        type: choice
        options:
          - staging
          - uat
        required: true
      run_tests:
        description: 'Run Apex tests after deploy'
        type: boolean
        default: true
      dry_run:
        description: 'Validate only (do not deploy)'
        type: boolean
        default: false

jobs:
  deploy:
    name: Deploy to ${{ inputs.target_org }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Target Org
        run: |
          SECRET_NAME="${{ inputs.target_org }}"
          AUTH_URL="${{ inputs.target_org == 'staging' && secrets.STAGING_AUTH_URL || secrets.UAT_AUTH_URL }}"
          echo "$AUTH_URL" > auth.txt
          sf org login sfdx-url --sfdx-url-file auth.txt --alias target-org
          rm auth.txt

      - name: Deploy Source
        run: |
          DRY_RUN_FLAG=""
          if [ "${{ inputs.dry_run }}" = "true" ]; then
            DRY_RUN_FLAG="--dry-run"
          fi

          TEST_FLAG=""
          if [ "${{ inputs.run_tests }}" = "true" ]; then
            TEST_FLAG="--test-level RunLocalTests"
          fi

          sf project deploy start \
            --target-org target-org \
            --ignore-conflicts \
            $DRY_RUN_FLAG \
            $TEST_FLAG \
            --wait 30

      - name: Post Summary
        if: always()
        run: |
          echo "## Deploy Summary" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "**Target:** ${{ inputs.target_org }}" >> "$GITHUB_STEP_SUMMARY"
          echo "**Dry run:** ${{ inputs.dry_run }}" >> "$GITHUB_STEP_SUMMARY"
          echo "**Tests:** ${{ inputs.run_tests }}" >> "$GITHUB_STEP_SUMMARY"
          echo "**Branch:** \`${{ github.ref_name }}\`" >> "$GITHUB_STEP_SUMMARY"
```

### 6. Run Apex tests on-demand (`run-apex-tests.yml`)

**Trigger:** Manual — run Apex tests against any authenticated org without deploying.

```yaml
# .github/workflows/run-apex-tests.yml
name: Run Apex Tests

on:
  workflow_dispatch:
    inputs:
      target_org:
        description: 'Target org to run tests against'
        type: choice
        options:
          - scratch (new)
          - staging
          - uat
        default: 'scratch (new)'

jobs:
  test:
    name: Apex Tests — ${{ inputs.target_org }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate DevHub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > sfdx_auth.txt
          sf org login sfdx-url --sfdx-url-file sfdx_auth.txt --alias devhub --set-default-dev-hub
          rm sfdx_auth.txt

      - name: Setup target org
        id: setup
        run: |
          if [ "${{ inputs.target_org }}" = "scratch (new)" ]; then
            sf org create scratch \
              --definition-file config/project-scratch-def.json \
              --alias test-org \
              --duration-days 1 \
              --wait 10
            sf project deploy start --target-org test-org --ignore-conflicts
            sf org assign permset --name Alex_Admin --target-org test-org
            echo "is_scratch=true" >> "$GITHUB_OUTPUT"
          elif [ "${{ inputs.target_org }}" = "staging" ]; then
            echo "${{ secrets.STAGING_AUTH_URL }}" > auth.txt
            sf org login sfdx-url --sfdx-url-file auth.txt --alias test-org
            rm auth.txt
            echo "is_scratch=false" >> "$GITHUB_OUTPUT"
          elif [ "${{ inputs.target_org }}" = "uat" ]; then
            echo "${{ secrets.UAT_AUTH_URL }}" > auth.txt
            sf org login sfdx-url --sfdx-url-file auth.txt --alias test-org
            rm auth.txt
            echo "is_scratch=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Run Apex Tests
        run: |
          sf apex run test \
            --target-org test-org \
            --code-coverage \
            --result-format human \
            --wait 15

      - name: Cleanup scratch org
        if: always() && steps.setup.outputs.is_scratch == 'true'
        run: sf org delete scratch --target-org test-org --no-prompt || true
```

### 7. Auto version bump on merge (`version-bump.yml`)

**Trigger:** Automatic on PR merge to main. Parses the PR title using conventional commit prefixes to determine which version component to bump.

**Convention:**
- `feat:` or `feat(scope):` → **minor** bump (e.g. 2.0.0 → 2.1.0)
- `fix:`, `perf:`, `refactor:` → **patch** bump (e.g. 2.0.0 → 2.0.1)
- Title contains `BREAKING CHANGE` or prefix ends with `!` (e.g. `feat!:`) → **major** bump (e.g. 2.0.0 → 3.0.0)
- `docs:`, `chore:`, `ci:`, `style:`, `test:` → **no bump** (non-code changes)

```yaml
# .github/workflows/version-bump.yml
name: Auto Version Bump

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  bump:
    name: Bump Package Version
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Determine bump type from PR title
        id: bump
        run: |
          TITLE="${{ github.event.pull_request.title }}"
          echo "PR title: $TITLE"

          # Check for BREAKING CHANGE or ! suffix on prefix
          if echo "$TITLE" | grep -qiE 'BREAKING CHANGE' || echo "$TITLE" | grep -qE '^[a-z]+(\(.+\))?!:'; then
            echo "type=major" >> "$GITHUB_OUTPUT"
            echo "Bump type: major"
          elif echo "$TITLE" | grep -qE '^feat(\(.+\))?:'; then
            echo "type=minor" >> "$GITHUB_OUTPUT"
            echo "Bump type: minor"
          elif echo "$TITLE" | grep -qE '^(fix|perf|refactor)(\(.+\))?:'; then
            echo "type=patch" >> "$GITHUB_OUTPUT"
            echo "Bump type: patch"
          else
            echo "type=none" >> "$GITHUB_OUTPUT"
            echo "Bump type: none (skipping)"
          fi

      - name: Bump version in sfdx-project.json
        if: steps.bump.outputs.type != 'none'
        run: |
          BUMP="${{ steps.bump.outputs.type }}"

          node -e "
            const fs = require('fs');
            const project = JSON.parse(fs.readFileSync('sfdx-project.json', 'utf8'));
            const pkg = project.packageDirectories[0];
            const parts = pkg.versionNumber.replace('.NEXT', '').split('.').map(Number);

            let [major, minor, patch] = parts;

            if ('$BUMP' === 'major') {
              major++;
              minor = 0;
              patch = 0;
            } else if ('$BUMP' === 'minor') {
              minor++;
              patch = 0;
            } else if ('$BUMP' === 'patch') {
              patch++;
            }

            const newVersion = major + '.' + minor + '.' + patch + '.NEXT';
            const oldVersion = pkg.versionNumber;
            pkg.versionNumber = newVersion;
            pkg.versionName = 'ver ' + major + '.' + minor;

            fs.writeFileSync('sfdx-project.json', JSON.stringify(project, null, 4) + '\n');
            console.log('Bumped ' + oldVersion + ' → ' + newVersion + ' (' + '$BUMP' + ')');
          "

      - name: Commit and push
        if: steps.bump.outputs.type != 'none'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add sfdx-project.json
          git diff --cached --quiet && echo "No changes to commit" && exit 0
          git commit -m "chore: bump version $(node -e "
            const p = require('./sfdx-project.json');
            console.log(p.packageDirectories[0].versionNumber);
          ") [skip ci]"
          git push

      - name: Post summary
        if: steps.bump.outputs.type != 'none'
        run: |
          VERSION=$(node -e "const p = require('./sfdx-project.json'); console.log(p.packageDirectories[0].versionNumber);")
          echo "## Version Bumped" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "**PR:** ${{ github.event.pull_request.title }}" >> "$GITHUB_STEP_SUMMARY"
          echo "**Bump type:** ${{ steps.bump.outputs.type }}" >> "$GITHUB_STEP_SUMMARY"
          echo "**New version:** \`$VERSION\`" >> "$GITHUB_STEP_SUMMARY"

      - name: Skip summary
        if: steps.bump.outputs.type == 'none'
        run: |
          echo "## Version Bump Skipped" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"
          echo "PR title prefix (\`docs:\`, \`chore:\`, \`ci:\`, etc.) does not trigger a version bump." >> "$GITHUB_STEP_SUMMARY"
```

### PR title convention reference

For contributors/team reference — enforce via GitHub branch protection rule "Require linear history" + squash merge with PR title as commit message:

| Prefix | Bump | Example PR title |
|--------|------|------------------|
| `feat:` | Minor | `feat: add burndown chart to sprint view` |
| `feat!:` | Major | `feat!: redesign data model for multi-board support` |
| `fix:` | Patch | `fix: card drag not saving position on mobile` |
| `perf:` | Patch | `perf: reduce SOQL queries in board controller` |
| `refactor:` | Patch | `refactor: extract card service from controller` |
| `docs:` | None | `docs: update installation guide` |
| `chore:` | None | `chore: update dependencies` |
| `ci:` | None | `ci: add scratch org workflow` |
| `test:` | None | `test: add coverage for sprint rollup trigger` |
| `style:` | None | `style: fix Apex formatting` |

## Workflow summary

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **Test** (existing) | Push / PR | Lint, formatting, LWC Jest tests |
| **Apex Tests** (existing) | Push to main / PR | Scratch org Apex tests with coverage |
| **Security Scan** (existing) | PR to main | Code analyzer + npm audit |
| **Auto Version Bump** | PR merge to main | Parse PR title, bump version in sfdx-project.json |
| **Release Beta** | Manual (main only) | Create managed beta, post GitHub Release |
| **Promote to GA** | Manual + approval | Promote beta to GA, create GitHub Release |
| **Scratch Org Test Drive** | Manual (any branch) | Spin up a scratch org, get login URL |
| **Package Versions** | Manual | List all versions with status and install links |
| **Deploy to Org** | Manual | Deploy source to staging/UAT with optional tests |
| **Run Apex Tests** | Manual | Run Apex tests against any org |

## Setup required

### GitHub repository settings

1. **Create a `production` Environment** in Settings → Environments
   - Add yourself as a required reviewer
   - This gates the promote-to-GA workflow

2. **Secrets**:
   - `SFDX_AUTH_URL` — DevHub auth (already configured)
   - `STAGING_AUTH_URL` — staging org auth (optional, needed for Deploy to Org / Run Apex Tests)
   - `UAT_AUTH_URL` — UAT org auth (optional, same)
   - Generate auth URLs with: `sf org display --target-org <alias> --verbose` → copy the `Sfdx Auth Url` value

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
