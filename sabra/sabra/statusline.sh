#!/usr/bin/env bash
# Sabra statusline — model + dir, an optional context-window meter, and a 🌵 צבר badge when
# sabra mode is active. Every visual piece is config-driven via ~/.claude/sabra.conf (written by
# install.sh): SABRA_BADGE (0/1), SABRA_CTX (0/1), SABRA_CTX_STYLE (compact|wide). Missing conf
# = everything on, wide. The active sabra mode is read from ~/.claude/sabra.state (set by the
# UserPromptSubmit hook, cleared on a fresh session by the SessionStart hook — no ghost badge).

STATE_FILE="$HOME/.claude/sabra.state"
CONF_FILE="$HOME/.claude/sabra.conf"

# Defaults — overridden by the conf if present.
SABRA_BADGE=1
SABRA_CTX=1
SABRA_CTX_STYLE=wide
[ -f "$CONF_FILE" ] && . "$CONF_FILE"

# Parse the JSON Claude Code pipes on stdin in one jq call (fast). IFS=tab so a dir with spaces
# doesn't break the split now that extra fields follow it.
IFS=$'\t' read -r MODEL DIR USED TOTAL PCT < <(jq -r '[
  (.model.display_name // "?"),
  (.workspace.current_dir // .cwd // ""),
  (.context_window.total_input_tokens // 0),
  (.context_window.context_window_size // 0),
  (.context_window.used_percentage // 0)
] | @tsv' 2>/dev/null)
[ -z "$MODEL" ] && MODEL="?"

# Shorten the dir: ~ for home, basename if long.
SHORT_DIR="${DIR/#$HOME/\~}"
[ "${#SHORT_DIR}" -gt 24 ] && SHORT_DIR=".../$(basename "$DIR")"

# LEFT side — always shown so the statusline isn't empty when sabra is off.
LEFT="${MODEL} · ${SHORT_DIR}"

# Append the sabra badge to the left side if a mode is active AND the badge is enabled.
if [ "${SABRA_BADGE:-1}" = "1" ] && [ -f "$STATE_FILE" ]; then
  MODE="$(tr -d '[:space:]' < "$STATE_FILE")"
  case "$MODE" in
    lite)  COLOR='\033[36m' ;;            # cyan
    full)  COLOR='\033[32m' ;;            # green
    ultra) COLOR='\033[1;31m' ;;          # bold red
    "")    MODE="" ;;
    *)     COLOR='\033[32m' ; MODE='full' ;;
  esac
  [ -n "$MODE" ] && LEFT="${LEFT}  ${COLOR}🌵 צבר·${MODE}\033[0m"
fi

# Context window meter. Empty when disabled or there's no data yet (fresh session / right after
# /compact → TOTAL=0). compact = colored "PCT%"; wide = "[bar] PCT% used/total".
CTX=""
if [ "${SABRA_CTX:-1}" = "1" ] && [ "${TOTAL:-0}" -gt 0 ] 2>/dev/null; then
  PCT_INT="${PCT%.*}"; PCT_INT="${PCT_INT:-0}"
  if   [ "$PCT_INT" -lt 50 ]; then CCOLOR='\033[32m'   # green
  elif [ "$PCT_INT" -lt 80 ]; then CCOLOR='\033[33m'   # yellow
  else                             CCOLOR='\033[31m'   # red
  fi
  if [ "${SABRA_CTX_STYLE:-wide}" = "compact" ]; then
    CTX="${CCOLOR}${PCT_INT}%\033[0m"
  else
    FILLED=$(( PCT_INT / 10 )); [ "$FILLED" -gt 10 ] && FILLED=10
    EMPTY=$(( 10 - FILLED ))
    bar() { local n=$1 ch=$2 out=''; while [ "$n" -gt 0 ]; do out="$out$ch"; n=$((n-1)); done; printf '%s' "$out"; }
    BAR="$(bar "$FILLED" '▓')$(bar "$EMPTY" '░')"
    # Human-readable token count: M above a million (one decimal, e.g. 1M / 1.2M), k below.
    fmt() {
      local n=$1
      if [ "$n" -ge 1000000 ]; then
        local t=$(( n / 100000 ))            # tenths of a million
        if [ $(( t % 10 )) -eq 0 ]; then printf '%dM' $(( t / 10 ))
        else printf '%d.%dM' $(( t / 10 )) $(( t % 10 )); fi
      else
        printf '%dk' $(( n / 1000 ))
      fi
    }
    CTX="${CCOLOR}[${BAR}] ${PCT_INT}% $(fmt "$USED")/$(fmt "$TOTAL")\033[0m"
  fi
fi

# Assemble: pin the context to the LEFT, before the model. Skipped when there's no meter.
if [ -n "$CTX" ]; then
  LINE="${CTX}  ${LEFT}"
else
  LINE="${LEFT}"
fi

printf '%b\n' "$LINE"
