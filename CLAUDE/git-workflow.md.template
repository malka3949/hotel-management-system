# Git Workflow

Single source of truth for branching, commits, worktrees, review, and merge.
**Goal: parallel work never collides — two tasks never step on each other's files.**

Read before: starting any task that commits code, or running more than one implementer at once.

---

## Branch model

- **One task = one branch.** Name `task/<short-desc>`. NEVER commit task work directly to the default branch (`main`/`master`). Why: the default stays always-clean and reviewable; a bad commit never lands on what others branch from.
- **On the default branch when you start?** Create the branch first, then work.
- **One commit per coherent change.** Descriptive message. Docs (`CLAUDE.md`, `CLAUDE/<topic>.md`, `PROGRESS.txt`) go in the **same commit** as the code they describe.
- **No push unless asked.** Local commits only.

---

## Worktrees — isolation for parallel work

A worktree is its own directory + its own branch, so two tasks **physically cannot** touch the same working files. Use one whenever more than one implementer runs at the same time.

| Situation | Isolation |
|-----------|-----------|
| One task at a time | Branch only. No worktree needed. |
| N tasks / implementers in parallel | One worktree per task. **Mandatory.** |
| Subagents writing in parallel (Agent tool) | Pass `isolation: "worktree"` — each writer gets its own worktree automatically. |

Manual worktree:

```
git worktree add ../wt-<task> -b task/<task>   # new dir + new branch
# ...work and commit INSIDE ../wt-<task>...
git worktree remove ../wt-<task>               # after merge
```

**NEVER run two implementers in the same working directory.** Why: concurrent edits to the same files overwrite each other with no merge boundary — silent data loss.

---

## Review = pre-merge (NOT post-commit)

1. Commit on the task branch.
2. Run `code-reviewer` + `security-reviewer` on the **branch diff**: `git diff <default>...HEAD`.
3. P0/P1 found? Implementer fixes on the same branch (new commit). Re-review.
4. Merge to the default branch **only when both reviews are clean**.

Why pre-merge: the default branch never holds un-reviewed code. A bad commit lives on a throwaway branch, never in shared history. (Reviewers are read-only — they need no worktree.)

---

## Merge & cleanup

```
git switch <default>
git merge --no-ff task/<task>      # keep the task boundary visible in history
git branch -d task/<task>
git worktree remove ../wt-<task>   # only if a worktree was used
```

No push unless asked.
