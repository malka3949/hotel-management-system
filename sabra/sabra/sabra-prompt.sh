#!/usr/bin/env bash
# Sabra UserPromptSubmit hook — sets/clears the badge state from the prompt text, deterministically.
# This is what makes 🌵 appear the *moment* you invoke sabra, instead of relying on the model to
# remember to run `echo <mode> > sabra.state`. Wired in by install.sh. Reads {"prompt": "..."} on
# stdin, never blocks the prompt (always exit 0).

STATE="$HOME/.claude/sabra.state"
P="$(jq -r '.prompt // ""' 2>/dev/null)"
LP="$(printf '%s' "$P" | tr '[:upper:]' '[:lower:]')"   # lowercased for the English matches

# OFF triggers first — they literally contain "sabra"/"צבר", so they must win over the ON check.
case "$LP" in
  *"stop sabra"*|*"normal mode"*) rm -f "$STATE"; exit 0 ;;
esac
case "$P" in
  *"די צבר"*|*"דיי צבר"*) rm -f "$STATE"; exit 0 ;;
esac

# ON triggers — same vocabulary as the skill's description (English lowercased + Hebrew as-is).
HIT=0
case "$LP" in
  *sabra*|*dugri*|*tachles*|*"be direct"*|*"cut the fluff"*|*"no bullshit"*|*"stop hedging"*) HIT=1 ;;
esac
case "$P" in
  *צבר*|*דוגרי*|*תכל*|*"תהיה ישראלי"*) HIT=1 ;;
esac
[ "$HIT" = "1" ] || exit 0

# Pick intensity if named, else keep the current one, else default to full.
case "$LP" in
  *ultra*) MODE=ultra ;;
  *lite*)  MODE=lite ;;
  *full*)  MODE=full ;;
  *)       MODE="$( [ -f "$STATE" ] && tr -d '[:space:]' < "$STATE" || printf full )" ;;
esac
[ -n "$MODE" ] || MODE=full
printf '%s\n' "$MODE" > "$STATE"
exit 0
