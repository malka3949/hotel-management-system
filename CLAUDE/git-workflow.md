# Git Workflow

## Branch model

| Branch    | Purpose              | Notes                                      |
|-----------|----------------------|--------------------------------------------|
| `main`    | Production           | Protected. PR required. Never commit directly. |
| `develop` | Staging auto-deploy  | Merge target for all feature branches.     |
| `feature/phase-{N}-{short-name}` | Feature work | One branch per phase task. |

**Flow:** `feature/...` → PR → `develop` → (release PR) → `main`

## Rules

- **One phase = one branch.** Name: `feature/phase-{N}-{short-name}`.
- **Never commit directly** to `main` or `develop`.
- **PR required** to merge into `develop`.
- **No push unless asked.** Local commits only by default.
- **No `--no-verify`** unless explicitly requested.
- **Docs in same commit as code.** `CLAUDE.md`, `PROJECT_STATUS.md`, phase docs — same commit as the code they describe.
- Commit message: **why, not what**.

## Parallel work — worktrees

| Situation | Isolation |
|-----------|-----------|
| One task at a time | Branch only. No worktree needed. |
| N tasks in parallel | One worktree per task. Mandatory. |

```bash
git worktree add ../wt-<task> -b feature/phase-{N}-<task>
# work and commit inside ../wt-<task>
git worktree remove ../wt-<task>   # after merge
```

**NEVER** run two implementers in the same working directory — silent data loss.

## Review (pre-merge)

1. Commit on feature branch.
2. Run `code-reviewer` + `security-reviewer` on diff: `git diff develop...HEAD`.
3. P0/P1 found → fix on same branch (new commit) → re-review.
4. Merge to `develop` only when both reviews are clean.

## Merge & cleanup

```bash
git switch develop
git merge --no-ff feature/phase-{N}-<task>
git branch -d feature/phase-{N}-<task>
```
