#!/usr/bin/env bash
# Sabra installer — תכל'ס. Deploys the skill, the statusline badge + context meter, and the two
# hooks (deterministic badge on prompt, ghost-badge clear on fresh session).
# Idempotent: safe to re-run. Preserves every other key in your settings.json.
#
# Interactive when run from a terminal — asks what to show in the statusline. Non-interactive
# (piped/CI) uses defaults, overridable up front:
#   SABRA_BADGE=1 SABRA_CTX=1 SABRA_CTX_STYLE=wide bash install.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILL_DST="$CLAUDE_DIR/skills/sabra"
RUNTIME="$CLAUDE_DIR/sabra"            # stable home for the scripts (survives repo deletion)
SETTINGS="$CLAUDE_DIR/settings.json"
CONF="$CLAUDE_DIR/sabra.conf"

command -v jq >/dev/null || { echo "✗ jq required. Install jq and re-run."; exit 1; }

# --- Choices (defaults; env overrides win; TTY prompts fill the rest) ------------------------
SABRA_BADGE="${SABRA_BADGE:-1}"
SABRA_CTX="${SABRA_CTX:-1}"
SABRA_CTX_STYLE="${SABRA_CTX_STYLE:-wide}"
SABRA_AUTOSTART="${SABRA_AUTOSTART:-0}"          # 0 = on-demand, 1 = always-on
SABRA_AUTOSTART_MODE="${SABRA_AUTOSTART_MODE:-full}"

ask_yn() { # ask_yn "question" default(1/0) -> echoes 1/0
  local q="$1" def="$2" ans
  local hint; [ "$def" = "1" ] && hint="[Y/n]" || hint="[y/N]"
  read -r -p "$q $hint " ans || true
  ans="$(printf '%s' "$ans" | tr '[:upper:]' '[:lower:]')"
  case "$ans" in y|yes|כן|כ) echo 1 ;; n|no|לא|ל) echo 0 ;; *) echo "$def" ;; esac
}

if [ -t 0 ]; then
  echo "🌵 הגדרת שורת הסטטוס — Enter לברירת המחדל."
  SABRA_BADGE="$(ask_yn "  • להציג את ה-badge של צבר (🌵 צבר·mode)?" "$SABRA_BADGE")"
  SABRA_CTX="$(ask_yn  "  • להציג את מד הקונטקסט (אחוז/בר)?" "$SABRA_CTX")"
  if [ "$SABRA_CTX" = "1" ]; then
    read -r -p "  • סגנון מד הקונטקסט — [w]ide (בר + טוקנים) / [c]ompact (אחוז בלבד)? [W/c] " s || true
    case "$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')" in c|compact) SABRA_CTX_STYLE=compact ;; *) SABRA_CTX_STYLE=wide ;; esac
  fi
  echo "🌵 מצב הפעלה:"
  echo "    • always-on  = צבר פעיל אוטומטית מתחילת כל שיחה."
  echo "    • on-demand  = צבר נטען רק כשאתה מפעיל אותו (/sabra או טריגר בהודעה)."
  SABRA_AUTOSTART="$(ask_yn "  • להפעיל always-on (צבר אוטומטי בכל שיחה)?" "$SABRA_AUTOSTART")"
  if [ "$SABRA_AUTOSTART" = "1" ]; then
    read -r -p "  • עוצמת ברירת מחדל ל-always-on — [l]ite / [f]ull / [u]ltra? [L/F/U] " m || true
    case "$(printf '%s' "$m" | tr '[:upper:]' '[:lower:]')" in l|lite) SABRA_AUTOSTART_MODE=lite ;; u|ultra) SABRA_AUTOSTART_MODE=ultra ;; *) SABRA_AUTOSTART_MODE=full ;; esac
  fi
fi

# 1) Skill (portable on its own).
mkdir -p "$SKILL_DST"
cp "$SRC/skills/sabra/SKILL.md" "$SKILL_DST/SKILL.md"

# 2) Runtime scripts → stable path (statusLine can't live in a plugin, so we copy, not reference repo).
mkdir -p "$RUNTIME"
cp "$SRC/statusline.sh" "$SRC/session-start.sh" "$SRC/sabra-prompt.sh" "$RUNTIME/"
chmod +x "$RUNTIME/statusline.sh" "$RUNTIME/session-start.sh" "$RUNTIME/sabra-prompt.sh"

# 3) Write the statusline config from the choices.
cat > "$CONF" <<EOF
# Sabra config — re-run install.sh or edit by hand. Read by statusline.sh + session-start.sh.
SABRA_BADGE=$SABRA_BADGE
SABRA_CTX=$SABRA_CTX
SABRA_CTX_STYLE=$SABRA_CTX_STYLE
SABRA_AUTOSTART=$SABRA_AUTOSTART
SABRA_AUTOSTART_MODE=$SABRA_AUTOSTART_MODE
EOF

# 4) Wire statusLine + both hooks into settings.json (the bit a plugin CANNOT carry).
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
SL_CMD="$RUNTIME/statusline.sh"
SS_CMD="bash \"$RUNTIME/session-start.sh\""
UP_CMD="bash \"$RUNTIME/sabra-prompt.sh\""
TMP="$(mktemp)"
jq --arg sl "$SL_CMD" --arg ss "$SS_CMD" --arg up "$UP_CMD" '
  .statusLine = {type:"command", command:$sl, padding:0}
  | .hooks = (.hooks // {})
  | .hooks.SessionStart = (
      ((.hooks.SessionStart // [])
        | map(select(((.hooks // []) | map(.command) | join(" ")) | contains("sabra/session-start.sh") | not)))
      + [ {matcher:"startup|clear", hooks:[ {type:"command", command:$ss} ]} ]
    )
  | .hooks.UserPromptSubmit = (
      ((.hooks.UserPromptSubmit // [])
        | map(select(((.hooks // []) | map(.command) | join(" ")) | contains("sabra/sabra-prompt.sh") | not)))
      + [ {hooks:[ {type:"command", command:$up} ]} ]
    )
' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"

rm -f "$CLAUDE_DIR/sabra.state"   # start clean — no ghost badge

echo "✓ צבר מותקן. תכל'ס:"
echo "  • סקייל:      $SKILL_DST/SKILL.md"
echo "  • סטטוסליין:  $SL_CMD  (badge=$SABRA_BADGE ctx=$SABRA_CTX style=$SABRA_CTX_STYLE)"
echo "  • config:     $CONF  (autostart=$SABRA_AUTOSTART mode=$SABRA_AUTOSTART_MODE)"
echo "  • hooks:      UserPromptSubmit (on-demand) + SessionStart (always-on / ניקוי)"
if [ "$SABRA_AUTOSTART" = "1" ]; then
  echo "  always-on דלוק → צבר ($SABRA_AUTOSTART_MODE) פעיל מתחילת כל שיחה חדשה."
else
  echo "  on-demand → פתח סשן חדש, הקלד /sabra ultra, ותראה 🌵 צבר·ultra — בלי תלות במודל."
fi
