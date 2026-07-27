#!/usr/bin/env bash
# Sabra SessionStart hook — runs on a FRESH session (startup|clear). Two modes, chosen in
# ~/.claude/sabra.conf:
#
#   SABRA_AUTOSTART=0  (default, "on-demand")  — clear the badge state so there's no ghost badge
#       left from a previous session. Sabra stays OFF until you invoke it (the UserPromptSubmit
#       hook turns it on the moment you say "sabra"/"צבר"/"/sabra ...").
#
#   SABRA_AUTOSTART=1  ("always-on")           — sabra is live from the first message: write the
#       badge state AND inject the skill instructions into the session context, so the behavior
#       is on without anyone having to invoke it. Intensity = SABRA_AUTOSTART_MODE (default full).
#
# On "resume" this hook does not run, so a session's active mode is restored with its context.

CLAUDE_DIR="$HOME/.claude"
STATE="$CLAUDE_DIR/sabra.state"
CONF="$CLAUDE_DIR/sabra.conf"
SKILL="$CLAUDE_DIR/skills/sabra/SKILL.md"

SABRA_AUTOSTART=0
SABRA_AUTOSTART_MODE=full
[ -f "$CONF" ] && . "$CONF"

# On-demand: just clear so there's no ghost badge.
if [ "${SABRA_AUTOSTART:-0}" != "1" ]; then
  rm -f "$STATE"
  exit 0
fi

# Always-on: badge on…
MODE="${SABRA_AUTOSTART_MODE:-full}"
printf '%s\n' "$MODE" > "$STATE"

# …and inject the skill body (frontmatter stripped) so the behavior is live from message one.
BODY=""
[ -f "$SKILL" ] && BODY="$(awk 'BEGIN{f=0} /^---[[:space:]]*$/{f++; next} f>=2{print}' "$SKILL")"

CTX="🌵 מצב צבר פעיל לכל השיחה הזו (always-on), עוצמה: ${MODE}. פעל לפי ההנחיות הבאות בכל
תשובה, עד שהמשתמש מכבה במפורש (\"די צבר\" / \"stop sabra\" / \"normal mode\"):

${BODY}"

# SessionStart additionalContext is added to the model's context for this session.
jq -n --arg c "$CTX" '{hookSpecificOutput:{hookEventName:"SessionStart", additionalContext:$c}}'
exit 0
