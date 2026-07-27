# 🌵 Sabra — הישראלי

A Claude Code skill that makes Claude respond and code like a no-nonsense Israeli dev:
**dugri** (straight talk), **tachles** (bottom line first), scrappy but not sloppy.
Inspired by [CAVEMAN](https://github.com/JuliusBrussee/caveman) and
[PONYTAIL](https://github.com/DietrichGebert/ponytail) — same `lite/full/ultra` intensity
scale, but it governs **both tone and code approach** with a healthy dose of chutzpah.

## What it does
- **Tone:** bottom line first, no hedging, no corporate fluff, light natural Israeli expressions.
- **Code:** a decision ladder (does it need to exist? → reuse? → stdlib? → native? → one line? → minimum) — ships the leanest thing that works, never sloppy on security/validation/a11y.
- **Status badge:** a colored `🌵 צבר·<mode>` in your Claude Code statusline showing the active intensity.

## Install (one command)
```bash
git clone https://github.com/<you>/sabra.git
cd sabra && bash install.sh
```
Requires `jq`. Open a **new** Claude Code session afterward (statusline + hooks load on startup).

### What install.sh does
| Piece | Where it goes | Portable on its own? |
|-------|---------------|----------------------|
| Skill (`SKILL.md`) | `~/.claude/skills/sabra/` | ✅ yes — just copy the file |
| Statusline badge + context meter | `~/.claude/sabra/statusline.sh` + `~/.claude/sabra.conf` + a line in `~/.claude/settings.json` | ❌ no — Claude Code does **not** let plugins set the statusline, so the installer wires it into *your* settings |
| `UserPromptSubmit` hook (`sabra-prompt.sh`) | `~/.claude/sabra/` + entry in `settings.json` | ❌ no — Claude Code wires hooks per user |
| `SessionStart` hook (`session-start.sh`) | `~/.claude/sabra/` + entry in `settings.json` | ❌ no — same reason |

### The two hooks (how sabra actually turns on)
Sabra ships **two** hooks with distinct jobs:

- **`UserPromptSubmit` → `sabra-prompt.sh` — *on-demand*.** Fires on every message you send. It
  matches the same triggers the skill does (`sabra`, `צבר`, `/sabra ultra`, `dugri`, `be direct`,
  …) and **deterministically** writes the mode to `~/.claude/sabra.state` — so the 🌵 badge lights
  up the instant you invoke sabra, with **zero reliance on the model** remembering to do it.
  Off-triggers (`stop sabra` / `די צבר` / `normal mode`) clear it.
- **`SessionStart` → `session-start.sh` — *always-on or clean-slate*.** Runs at the start of every
  fresh session and reads `SABRA_AUTOSTART` from `~/.claude/sabra.conf`:
  - **`0` (on-demand, default):** clears the state so there's no ghost badge from a previous
    session — sabra stays off until you invoke it (via the hook above).
  - **`1` (always-on):** sabra is live from message one — it writes the badge state **and injects
    the skill instructions into the session**, so the behavior is on without you invoking anything.
    Default intensity = `SABRA_AUTOSTART_MODE`.

### Choosing at install time
Run from a terminal and the installer **asks**: show the sabra badge? show the context meter
(`wide` = bar + tokens, or `compact` = percentage only)? and **always-on vs on-demand** (plus the
default intensity for always-on). All of it lands in `~/.claude/sabra.conf` — edit it or re-run
`install.sh` anytime. Non-interactive? Override up front:
```bash
SABRA_BADGE=1 SABRA_CTX=1 SABRA_CTX_STYLE=compact \
SABRA_AUTOSTART=1 SABRA_AUTOSTART_MODE=ultra bash install.sh
```
It's idempotent (safe to re-run) and preserves every other key in your `settings.json`.

## Usage
| Command | Effect |
|---------|--------|
| `/sabra` | activate (default **full**) |
| `/sabra lite` · `/sabra full` · `/sabra ultra` | set intensity |
| `"די צבר"` / `"stop sabra"` / `"normal mode"` | turn off |

## Uninstall
```bash
bash uninstall.sh
```

## Why the badge needs an installer (the honest bit)
Claude Code plugins can carry skills and hooks, but **not** the main `statusLine` — that config
lives only in the user's own `settings.json` and `${CLAUDE_PLUGIN_ROOT}` isn't substituted there.
That's why CAVEMAN ships an `install.sh` too, and so does this. The skill itself is 100% portable
on its own — `install.sh` only exists to deliver the badge.

MIT.
