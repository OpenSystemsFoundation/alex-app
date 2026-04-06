#!/bin/bash

# Authenticate SF CLI using SFDX_AUTH_URL environment variable
# Runs as a SessionStart hook in Claude Code (local and web)

if [ -z "$SFDX_AUTH_URL" ]; then
  echo "SFDX_AUTH_URL not set, skipping SF CLI auth"
  exit 0
fi

# Check if already authenticated
if sf org list --json 2>/dev/null | grep -q "jeff@opensf.foundation"; then
  echo "SF CLI already authenticated"
  exit 0
fi

# Authenticate via SFDX auth URL
echo "$SFDX_AUTH_URL" | sf org login sfdx-url --sfdx-url-stdin --set-default 2>/dev/null

# Export DNS check override for cloud environments
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "SFDX_DISABLE_DNS_CHECK=true" >> "$CLAUDE_ENV_FILE"
fi

exit 0
