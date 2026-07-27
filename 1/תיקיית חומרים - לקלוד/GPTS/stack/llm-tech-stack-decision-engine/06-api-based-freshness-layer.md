# 6. API-Based Freshness Layer

The decision engine should maintain fresh version data.

## 6.1 Data Sources

Use official or highly trusted sources.
All links below are the canonical sources for version updates, security advisories, and EOL status.

### Package Registries

| Registry | URL | Use for |
|---|---|---|
| npm | https://www.npmjs.com | Node.js packages |
| PyPI | https://pypi.org | Python packages |
| Packagist | https://packagist.org | PHP/Composer packages |
| RubyGems | https://rubygems.org | Ruby gems |
| Maven Central | https://central.sonatype.com | Java/JVM packages |
| NuGet | https://www.nuget.org | .NET packages |
| crates.io | https://crates.io | Rust packages |
| pkg.go.dev | https://pkg.go.dev | Go packages |

### Runtime Release Pages

| Runtime | Releases | LTS / EOL |
|---|---|---|
| Node.js | https://nodejs.org/en/download/releases | https://nodejs.org/en/about/previous-releases |
| Python | https://www.python.org/downloads | https://devguide.python.org/versions |
| PHP | https://www.php.net/downloads.php | https://www.php.net/supported-versions.php |
| Ruby | https://www.ruby-lang.org/en/downloads | https://www.ruby-lang.org/en/downloads/branches |
| Go | https://go.dev/dl | https://go.dev/doc/devel/release |
| Java (OpenJDK) | https://jdk.java.net | https://endoflife.date/java |
| .NET | https://dotnet.microsoft.com/en-us/download | https://dotnet.microsoft.com/en-us/platform/support/policy |
| Rust | https://www.rust-lang.org/releases.html | https://forge.rust-lang.org/release/platform-support.html |

### Framework Release Pages

| Framework | Releases | Changelog |
|---|---|---|
| Next.js | https://github.com/vercel/next.js/releases | https://nextjs.org/blog |
| React | https://github.com/facebook/react/releases | https://react.dev/blog |
| NestJS | https://github.com/nestjs/nest/releases | https://docs.nestjs.com/migration-guide |
| Laravel | https://github.com/laravel/laravel/releases | https://laravel.com/docs/releases |
| Symfony | https://github.com/symfony/symfony/releases | https://symfony.com/releases |
| Django | https://github.com/django/django/releases | https://docs.djangoproject.com/en/stable/releases |
| FastAPI | https://github.com/fastapi/fastapi/releases | https://fastapi.tiangolo.com/release-notes |
| Rails | https://github.com/rails/rails/releases | https://rubyonrails.org/category/releases |
| Spring Boot | https://github.com/spring-projects/spring-boot/releases | https://spring.io/blog |
| ASP.NET Core | https://github.com/dotnet/aspnetcore/releases | https://learn.microsoft.com/en-us/aspnet/core/release-notes |
| Vue | https://github.com/vuejs/core/releases | https://blog.vuejs.org |
| Nuxt | https://github.com/nuxt/nuxt/releases | https://nuxt.com/blog |
| Prisma | https://github.com/prisma/prisma/releases | https://www.prisma.io/blog |
| Drizzle | https://github.com/drizzle-team/drizzle-orm/releases | — |

### Database Release Pages

| Database | Releases | EOL |
|---|---|---|
| PostgreSQL | https://www.postgresql.org/support/versioning | https://endoflife.date/postgresql |
| MySQL | https://dev.mysql.com/downloads/mysql | https://endoflife.date/mysql |
| MariaDB | https://mariadb.org/download | https://endoflife.date/mariadb |
| Redis | https://github.com/redis/redis/releases | https://endoflife.date/redis |
| MongoDB | https://www.mongodb.com/try/download/community | https://endoflife.date/mongodb |
| ClickHouse | https://github.com/ClickHouse/ClickHouse/releases | https://github.com/ClickHouse/ClickHouse/blob/master/SECURITY.md |

### Security Advisories

| Source | URL | Covers |
|---|---|---|
| GitHub Advisory Database | https://github.com/advisories | All ecosystems |
| NIST NVD | https://nvd.nist.gov/vuln/search | CVE database |
| Snyk Vulnerability DB | https://security.snyk.io | npm, PyPI, RubyGems, Maven, Go, .NET |
| npm audit advisories | https://www.npmjs.com/advisories | Node.js packages |
| PyPI Safety DB | https://pypi.org/project/safety | Python packages |
| PHP Security Advisories | https://github.com/FriendsOfPHP/security-advisories | PHP/Composer |
| RubyGems Advisory DB | https://github.com/rubysec/ruby-advisory-db | Ruby gems |
| OSV (Open Source Vulnerabilities) | https://osv.dev | All ecosystems, Google-maintained |
| OWASP Top 10 | https://owasp.org/www-project-top-ten | Web application security baseline |

### EOL / End-of-Life Tracking

| Source | URL | Notes |
|---|---|---|
| endoflife.date | https://endoflife.date | Single source for EOL dates across all major runtimes, frameworks, and databases |

### Infrastructure and Deployment

| Tool | URL | Notes |
|---|---|---|
| aaPanel | https://www.aapanel.com/new/download.html | Release notes and changelog |
| Docker Hub | https://hub.docker.com | Official base images |
| Docker Engine releases | https://docs.docker.com/engine/release-notes | Docker version history |
| Ubuntu LTS releases | https://ubuntu.com/about/release-cycle | Ubuntu support lifecycle |
| Contabo | https://contabo.com | VPS/VDS provider |
| Let's Encrypt | https://letsencrypt.org/docs/rate-limits | SSL rate limits and status |

## 6.2 Version Cache

Store:

- technology name
- current stable version
- current LTS version
- release date
- EOL date
- compatibility notes
- known breaking changes
- dependency requirements
- last checked timestamp
- source URL

## 6.3 Update Frequency

Suggested schedule:

- Daily for major runtimes and frameworks
- Weekly for libraries
- Immediate refresh when the user asks for a specific stack
- Manual override for critical known issues

## 6.4 Confidence Levels

Every version recommendation should include confidence:

- High: official source verified recently
- Medium: package registry verified but compatibility not deeply checked
- Low: data is stale or incomplete

---
