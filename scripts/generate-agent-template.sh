#!/bin/bash
# generate-agent-template.sh
#
# Generates a BotTemplate from the Alex_Agent Bot metadata for packaging.
# Bot and BotVersion are NOT directly packageable — only BotTemplate is.
#
# This script:
# 1. Generates the BotTemplate from the Bot metadata using SF CLI
# 2. Moves the template to the correct package directory
# 3. Removes the original Bot/BotVersion (not needed in the package)
# 4. Removes the original GenAiPlannerBundle (a new template-specific one is generated)
#
# Usage: bash scripts/generate-agent-template.sh [--target-org <alias>]
#
# Prerequisites:
# - Agent must be deployed and working in a scratch org
# - SF CLI must be authenticated to the target org

set -euo pipefail

AGENT_DIR="force-agentforce/main/default"
BOT_FILE="$AGENT_DIR/bots/Alex_Agent/Alex_Agent.bot-meta.xml"
TARGET_ORG="${1:---target-org ci-agent-test}"

echo "=============================================="
echo "  Alex Agent — BotTemplate Generation"
echo "=============================================="
echo ""

# Step 1: Verify bot file exists
if [ ! -f "$BOT_FILE" ]; then
    echo "[ERROR] Bot file not found: $BOT_FILE"
    echo "        Make sure you've retrieved the agent metadata first."
    exit 1
fi

echo "[1/4] Generating BotTemplate from Alex_Agent..."
sf agent generate template \
    --agent-file "$BOT_FILE" \
    --agent-version 1

echo ""
echo "[2/4] Verifying BotTemplate was created..."
if [ -d "$AGENT_DIR/botTemplates" ]; then
    TEMPLATE_COUNT=$(find "$AGENT_DIR/botTemplates" -name "*.xml" | wc -l)
    echo "       Found $TEMPLATE_COUNT BotTemplate file(s)"
    find "$AGENT_DIR/botTemplates" -name "*.xml" -exec echo "       - {}" \;
else
    echo "[ERROR] BotTemplate directory not found. Generation may have failed."
    exit 1
fi

echo ""
echo "[3/4] Cleaning up non-packageable metadata..."

# Remove Bot and BotVersion — NOT packageable
if [ -d "$AGENT_DIR/bots" ]; then
    echo "       Removing bots/ (not packageable — use BotTemplate instead)"
    rm -rf "$AGENT_DIR/bots"
fi

if [ -d "$AGENT_DIR/botVersions" ]; then
    echo "       Removing botVersions/ (not packageable — use BotTemplate instead)"
    rm -rf "$AGENT_DIR/botVersions"
fi

# Remove the ORIGINAL planner bundle (the template generates its own)
# Keep only the one with "Template" in the name
ORIGINAL_BUNDLE="$AGENT_DIR/genAiPlannerBundles/Alex_Agent_Planner"
if [ -d "$ORIGINAL_BUNDLE" ]; then
    # Check if a template bundle was generated
    TEMPLATE_BUNDLES=$(find "$AGENT_DIR/genAiPlannerBundles" -maxdepth 1 -name "*Template*" -type d 2>/dev/null | wc -l)
    if [ "$TEMPLATE_BUNDLES" -gt 0 ]; then
        echo "       Removing original GenAiPlannerBundle (template version generated)"
        rm -rf "$ORIGINAL_BUNDLE"
    else
        echo "       [WARN] No template planner bundle found — keeping original"
    fi
fi

echo ""
echo "[4/4] Final package structure:"
echo ""
echo "  Packageable metadata:"
if [ -d "$AGENT_DIR/botTemplates" ]; then
    echo "    BotTemplate:        $(find "$AGENT_DIR/botTemplates" -name "*.xml" | wc -l) file(s)"
fi
echo "    GenAiPlannerBundle: $(find "$AGENT_DIR/genAiPlannerBundles" -name "*.xml" 2>/dev/null | wc -l) file(s)"
echo "    GenAiPlugin:        $(find "$AGENT_DIR/genAiPlugins" -name "*.xml" | wc -l) file(s)"
echo "    GenAiFunction:      $(find "$AGENT_DIR/genAiFunctions" -name "*.xml" | wc -l) file(s)"
echo "    Apex Classes:       $(find "$AGENT_DIR/classes" -name "*.cls" ! -path "*/tests/*" | wc -l) file(s)"
echo "    Test Classes:       $(find "$AGENT_DIR/classes/tests" -name "*.cls" | wc -l) file(s)"
echo ""
echo "  Non-packageable (removed):"
echo "    Bot:                removed"
echo "    BotVersion:         removed"
echo ""
echo "=============================================="
echo "  BotTemplate generation complete!"
echo ""
echo "  Next steps:"
echo "    1. Deploy to scratch org:"
echo "       sf project deploy start --source-dir force-agentforce --target-org <alias>"
echo "    2. Test the agent template"
echo "    3. Create package version:"
echo "       sf package version create --package 'Alex - Agentforce' \\"
echo "         --definition-file config/agentforce-project-scratch-def.json \\"
echo "         --code-coverage --wait 15"
echo "=============================================="
