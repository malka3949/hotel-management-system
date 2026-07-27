#!/usr/bin/env bash
# Sabra uninstaller — מסיר הכל נקי. לא נוגע בשאר ה-settings.
set -euo pipefail
CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"

rm -rf "$CLAUDE_DIR/skills/sabra" "$CLAUDE_DIR/sabra" "$CLAUDE_DIR/sabra.state" "$CLAUDE_DIR/sabra.conf"

if [ -f "$SETTINGS" ] && command -v jq >/dev/null; then
  TMP="$(mktemp)"
  jq '
    (if (.statusLine.command? | tostring | contains("sabra/statusline.sh")) then del(.statusLine) else . end)
    | .hooks.SessionStart = ((.hooks.SessionStart // [])
        | map(select(((.hooks // []) | map(.command) | join(" ")) | contains("sabra/session-start.sh") | not)))
    | .hooks.UserPromptSubmit = ((.hooks.UserPromptSubmit // [])
        | map(select(((.hooks // []) | map(.command) | join(" ")) | contains("sabra/sabra-prompt.sh") | not)))
    | if (.hooks.SessionStart | length) == 0 then del(.hooks.SessionStart) else . end
    | if (.hooks.UserPromptSubmit | length) == 0 then del(.hooks.UserPromptSubmit) else . end
    | if (.hooks // {}) == {} then del(.hooks) else . end
  ' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
fi
echo "✓ צבר הוסר. ביי ביי 🌵"
