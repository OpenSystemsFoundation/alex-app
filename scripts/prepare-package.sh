#!/bin/bash
# prepare-package.sh
#
# Validates and prepares the Agentforce expansion package for submission.
# Runs all pre-packaging checks and generates the package version.
#
# Usage: bash scripts/prepare-package.sh [--dry-run]
#
# For Salesforce ISV partners using 2GP packaging.
# The Alex - Agentforce package is a FREE expansion package that depends on
# the Alex - A Kanban App base package.

set -euo pipefail

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=true
fi

AGENT_DIR="force-agentforce/main/default"
ERRORS=0
WARNINGS=0

echo "=============================================="
echo "  Alex Agentforce — Package Preparation"
echo "=============================================="
echo ""

# ── Check 1: Packageable metadata exists ──
echo "[1/6] Checking packageable metadata..."

# GenAiPlannerBundle (required)
if [ -d "$AGENT_DIR/genAiPlannerBundles" ]; then
    COUNT=$(find "$AGENT_DIR/genAiPlannerBundles" -name "*.xml" | wc -l)
    echo "  [OK] GenAiPlannerBundle: $COUNT file(s)"
else
    echo "  [FAIL] GenAiPlannerBundle not found"
    ERRORS=$((ERRORS + 1))
fi

# GenAiPlugin / Topics (required)
if [ -d "$AGENT_DIR/genAiPlugins" ]; then
    COUNT=$(find "$AGENT_DIR/genAiPlugins" -name "*.xml" | wc -l)
    echo "  [OK] GenAiPlugin (Topics): $COUNT file(s)"
else
    echo "  [FAIL] GenAiPlugin not found"
    ERRORS=$((ERRORS + 1))
fi

# GenAiFunction / Actions (required)
if [ -d "$AGENT_DIR/genAiFunctions" ]; then
    COUNT=$(find "$AGENT_DIR/genAiFunctions" -name "*.xml" | wc -l)
    echo "  [OK] GenAiFunction (Actions): $COUNT file(s)"
else
    echo "  [FAIL] GenAiFunction not found"
    ERRORS=$((ERRORS + 1))
fi

# BotTemplate (required for distribution)
if [ -d "$AGENT_DIR/botTemplates" ]; then
    COUNT=$(find "$AGENT_DIR/botTemplates" -name "*.xml" | wc -l)
    echo "  [OK] BotTemplate: $COUNT file(s)"
else
    echo "  [WARN] BotTemplate not found — run: bash scripts/generate-agent-template.sh"
    WARNINGS=$((WARNINGS + 1))
fi

# Apex classes
APEX_COUNT=$(find "$AGENT_DIR/classes" -name "*.cls" ! -path "*/tests/*" 2>/dev/null | wc -l)
TEST_COUNT=$(find "$AGENT_DIR/classes/tests" -name "*.cls" 2>/dev/null | wc -l)
echo "  [OK] Apex: $APEX_COUNT action classes, $TEST_COUNT test classes"

echo ""

# ── Check 2: Non-packageable metadata is excluded ──
echo "[2/6] Checking for non-packageable metadata..."

if [ -d "$AGENT_DIR/bots" ] && [ -d "$AGENT_DIR/botTemplates" ]; then
    echo "  [WARN] bots/ directory exists alongside botTemplates/"
    echo "         Bot and BotVersion are NOT packageable."
    echo "         Run: bash scripts/generate-agent-template.sh (which removes them)"
    WARNINGS=$((WARNINGS + 1))
elif [ -d "$AGENT_DIR/bots" ] && [ ! -d "$AGENT_DIR/botTemplates" ]; then
    echo "  [INFO] bots/ exists but no botTemplates/ — this is fine for development"
    echo "         Generate BotTemplate before packaging: bash scripts/generate-agent-template.sh"
else
    echo "  [OK] No non-packageable Bot/BotVersion in package directory"
fi

echo ""

# ── Check 3: Namespace prefix validation ──
echo "[3/6] Validating namespace prefix usage..."

# Metadata XML should NOT have OpenSF__ prefix
NAMESPACE_VIOLATIONS=0
for dir in "$AGENT_DIR/genAiPlugins" "$AGENT_DIR/genAiFunctions" "$AGENT_DIR/genAiPlannerBundles"; do
    if [ -d "$dir" ]; then
        VIOLATIONS=$(grep -rl "OpenSF__" "$dir" 2>/dev/null | wc -l)
        NAMESPACE_VIOLATIONS=$((NAMESPACE_VIOLATIONS + VIOLATIONS))
    fi
done

if [ "$NAMESPACE_VIOLATIONS" -gt 0 ]; then
    echo "  [FAIL] Found OpenSF__ prefix in metadata XML (auto-added during deployment)"
    grep -rl "OpenSF__" "$AGENT_DIR/genAiPlugins" "$AGENT_DIR/genAiFunctions" "$AGENT_DIR/genAiPlannerBundles" 2>/dev/null | sed 's/^/         /'
    ERRORS=$((ERRORS + 1))
else
    echo "  [OK] No namespace prefix in metadata source files"
fi

# Apex SHOULD have OpenSF__ prefix for runtime references
APEX_HAS_NS=false
for f in $(find "$AGENT_DIR/classes" -name "*.cls" ! -path "*/tests/*" | head -5); do
    if grep -q "OpenSF__" "$f"; then
        APEX_HAS_NS=true
        break
    fi
done
if [ "$APEX_HAS_NS" = true ]; then
    echo "  [OK] Apex classes use OpenSF__ prefix for runtime SObject references"
else
    echo "  [WARN] Apex classes may be missing OpenSF__ namespace prefix"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ── Check 4: sfdx-project.json dependency ──
echo "[4/6] Validating package dependencies..."

if grep -q '"Alex - A Kanban App"' sfdx-project.json; then
    echo "  [OK] Extension depends on base package 'Alex - A Kanban App'"
else
    echo "  [FAIL] Missing dependency on base package"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ── Check 5: Permission sets ──
echo "[5/6] Checking permission sets..."

if [ -f "$AGENT_DIR/permissionsets/Alex_Agentforce_User.permissionset-meta.xml" ]; then
    echo "  [OK] Alex_Agentforce_User permission set exists"
else
    echo "  [WARN] Alex_Agentforce_User permission set not found"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "$AGENT_DIR/customPermissions/Use_Alex_Agent.customPermission-meta.xml" ]; then
    echo "  [OK] Use_Alex_Agent custom permission exists"
else
    echo "  [WARN] Use_Alex_Agent custom permission not found"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ── Check 6: Test specs exist ──
echo "[6/6] Checking agent test specs..."

SPEC_DIR="force-agentforce/test/agent-test-specs"
if [ -d "$SPEC_DIR" ]; then
    SPEC_COUNT=$(find "$SPEC_DIR" -name "*.yaml" | wc -l)
    echo "  [OK] $SPEC_COUNT agent test spec(s) found"
else
    echo "  [WARN] No agent test specs found in $SPEC_DIR"
    WARNINGS=$((WARNINGS + 1))
fi

# ── Summary ──
echo ""
echo "=============================================="
echo "  VALIDATION SUMMARY"
echo "=============================================="
echo "  Errors:   $ERRORS"
echo "  Warnings: $WARNINGS"
echo "=============================================="

if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "  [FAIL] Fix $ERRORS error(s) before packaging"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "  [DRY RUN] Skipping package version creation"
    echo ""
    echo "  To create the package version, run without --dry-run:"
    echo "    bash scripts/prepare-package.sh"
    exit 0
fi

echo ""
echo "Ready to create package version."
echo ""
read -p "Create package version now? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Creating package version..."
    sf package version create \
        --package "Alex - Agentforce" \
        --definition-file config/agentforce-project-scratch-def.json \
        --code-coverage \
        --wait 20

    echo ""
    echo "Package version created successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Install in a test org and verify the agent template"
    echo "  2. Run agent evaluation tests"
    echo "  3. Promote the version: sf package version promote --package <version-id>"
    echo "  4. Submit for AppExchange security review"
else
    echo "Skipped. Run again when ready."
fi
