# Supply chain & dependencies — deep dive

Domain/category: `supply-chain`. The code can be perfect and the app still ships a known-vulnerable or
malicious dependency. This category audits *what you pull in*, not what you wrote. Audited by
`dependency-auditor` (read-only — runs audit commands, never installs/upgrades).

Core rule: **know every dependency, pin it, scan it for known vulns, and trust nothing with an install
hook or a typosquatted name.**

---

## AUDIT CHECK (what the auditor runs / reads)

### 1. Known vulnerabilities (CVE / advisory)
Run the ecosystem scanner (read-only, no install):
```text
node:    npm audit --json   (or: pnpm audit --json / yarn npm audit)
python:  pip-audit -f json   (or: safety check --json)
multi:   osv-scanner --format json -r .   (if available)
```
Map results: severity (critical/high → 🔴, moderate → 🟡, low → 🔵), advisory id/CVE as the anchor,
the package@version, and whether a fixed version exists. If no scanner is installed, say so explicitly
in the report (don't claim "no vulns").
**Anchor:** the GHSA/CVE id.

### 2. Lockfile integrity
- A lockfile exists and is committed (`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `poetry.lock`).
- No drift: `package.json` ranges resolve within the lockfile.
**CHECK:** missing/uncommitted lockfile → builds are non-reproducible (🟡); a finding can't be trusted
without one.

### 3. Version pinning
- Direct deps pinned or tightly ranged — wide floats (`*`, `latest`, `^0.x`) pull unreviewed code.
**CHECK:** `"dep": "*"` / `"latest"` in `package.json` → 🟡.

### 4. Install-time scripts (the malware vector)
- `postinstall` / `preinstall` / `prepare` scripts run arbitrary code on `npm install`.
**CHECK:** grep dependencies' presence of install hooks; flag unexpected ones. Recommend
`npm ci --ignore-scripts` in CI where feasible. 🔴 if an obscure dep runs a network/install script.

### 5. Suspicious / abandoned / typosquat deps
- Names a hair off a popular package (`crossenv` vs `cross-env`), unmaintained (no release in years),
  single-maintainer high-privilege, or pulling from a non-registry git/url source.
**CHECK:** scan the dependency list for typosquat-looking names and direct git/tarball URLs. 🟡–🔴.

### 6. Secrets / private registries
- `.npmrc` / `pip.conf` with a hard-coded auth token committed (ties to `09-secrets-management.md`).
**CHECK:** committed registry creds → 🔴.

## Output (findings)
```text
🔴 [supply-chain] package@version — <advisory>: <what>. Anchor: <GHSA/CVE>. Fix: bump to <fixed ver>.
🔴 obscure dependency runs a postinstall script with network access
🟡 no committed lockfile → non-reproducible builds; audit results unreliable
🟡 direct dependency pinned to "*"/"latest"
🟡 typosquat-looking / abandoned / single-maintainer high-privilege dependency
🔵 transitive low-severity advisory with no direct fix
```
If the scanner couldn't run (not installed / offline), report that as a coverage gap — never imply clean.

> Remediation is `npm audit fix` / version bumps — **describe it, never run it** (read-only). Pinning +
> a CI `npm audit --audit-level=high` gate is the durable fix; if the repo's CI already gates on this,
> verify it still holds.
