# 5. Version Decision Policy

The LLM must check current versions before final recommendation.

## 5.1 General Version Rules

Prefer:

- LTS versions
- stable major versions
- versions supported by major dependencies
- versions supported by hosting/deployment platform

Avoid:

- deprecated versions
- end-of-life versions
- experimental releases
- newly released majors unless there is a strong reason
- versions not supported by critical dependencies

## 5.2 Required Version Checks

Before finalizing a stack, verify:

- runtime version
- framework version
- database version
- ORM compatibility
- deployment platform support
- package manager compatibility
- major dependency compatibility
- security support window
- LTS status

## 5.3 Example Checks

For Node.js:

- Is this version LTS?
- Does the framework support it?
- Does the hosting environment support it?
- Do native dependencies compile correctly?

For Next.js:

- Which React version is required?
- Which Node version is required?
- Are there breaking changes in routing, server actions, or build behavior?

For Rails:

- Which Ruby version is required?
- Do the required gems support it?
- Is the database adapter compatible?

For Laravel:

- Which PHP version is required?
- Do Composer dependencies support it?
- Are extensions installed on the server?

For Python:

- Which Python version is supported by libraries?
- Are AI/data libraries compatible?
- Are wheels available for deployment OS?

For Ubuntu 24.04 (default deployment OS):

- Does the runtime have an official APT package or PPA for Ubuntu 24.04?
- Are Docker base images available for Ubuntu 24.04 or compatible Debian base?
- Does the framework's recommended Docker image work without modification on amd64?
- Are there known incompatibilities with Ubuntu 24.04 system libraries (e.g., libssl, glibc)?
- Does the package manager (npm, pip, composer, bundler) work cleanly on Ubuntu 24.04?
- Is the framework compatible with aaPanel's Nginx configuration (reverse proxy to internal port)?
- If the framework manages its own web server (e.g., Rails Puma, Laravel Octane), can it run behind aaPanel's Nginx proxy without conflict?

---
