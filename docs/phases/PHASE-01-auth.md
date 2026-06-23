# Phase 1 — Authentication & Users System

## Purpose

Establish secure, role-based user authentication and branch-scoped authorization. Every subsequent phase depends on knowing **who** the user is and **which branch** they belong to.

---

## Big Picture

Authentication is the security backbone of the entire platform. The system supports 4 roles (chain-admin, hotel-manager, receptionist, housekeeping), each with different access levels. Branch scoping means a receptionist at Branch A cannot see Branch B's data — enforced at the middleware layer, not the UI layer.

All API endpoints from Phase 2 onward will require a valid JWT and pass the current user + branch context through the request pipeline.

Architecture ref: ARCHITECTURE.md § 2.5 Authentication, § 7 Security Architecture

---

## Scope

### In Scope
- Users table with roles and branch assignment
- Branches table (basic, extended in later phases)
- JWT access token + refresh token pattern
- Auth guard middleware (validates JWT on every protected route)
- Role guard middleware (checks role per route)
- Branch scope middleware (injects `branchId` from token, validates access)
- Login endpoint
- Refresh token endpoint
- Logout endpoint (token invalidation)
- Admin-only: create user endpoint
- Frontend: Login page
- Frontend: Protected route wrapper
- Frontend: Auth state management (Zustand or Context)
- Audit log entries for: login, logout, failed login attempts

### Out of Scope
- Self-registration (employees are created by admins only)
- Password reset flow (Phase 8 security hardening)
- OAuth / SSO (future phase)
- Firebase auth (not selected — using JWT directly)

---

## Technical Requirements

| Requirement | Detail |
|---|---|
| Token type | JWT (RS256 or HS256) |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| Password hashing | bcrypt (rounds: 12) |
| Branch scoping | `branchId` embedded in JWT payload |
| Role embedding | `role` embedded in JWT payload |
| Token storage (frontend) | HttpOnly cookie (not localStorage) |
| Audit trail | Every auth event logged to `audit_logs` table |

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | varchar(255) | |
| email | varchar(255) | unique |
| password_hash | varchar | bcrypt |
| role | enum | chain_admin, hotel_manager, receptionist, housekeeping |
| branch_id | uuid | FK → branches (null for chain_admin) |
| is_active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

### `branches`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | varchar(255) | |
| address | text | |
| phone | varchar(30) | nullable |
| email | varchar(255) | nullable |
| contact_person | varchar(255) | nullable |
| timezone | varchar(50) | default 'Asia/Jerusalem' |
| is_active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| token_hash | varchar | hashed refresh token |
| expires_at | timestamp | |
| revoked_at | timestamp | nullable |
| created_at | timestamp | |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users, nullable |
| action | varchar(100) | e.g. 'LOGIN', 'LOGOUT', 'FAILED_LOGIN' |
| entity_type | varchar(100) | nullable |
| entity_id | uuid | nullable |
| metadata | jsonb | IP, user agent, etc. |
| branch_id | uuid | nullable |
| created_at | timestamp | immutable — no updates ever |

**DB-level immutability for audit_logs (add in migration):**
```sql
-- Revoke UPDATE and DELETE from the application DB user
REVOKE UPDATE, DELETE ON audit_logs FROM hotel_app_user;
-- Or use a trigger as belt-and-suspenders
CREATE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## Tasks

### Backend
- [ ] Create `AuthModule` with `AuthService`, `AuthController`
- [ ] Create `UsersModule` with `UsersService`, `UsersRepository`
- [ ] Create `BranchesModule` with full CRUD (create/list/update/delete — chain_admin only)
- [ ] `POST /api/v1/auth/login` — returns access + refresh tokens
- [ ] `POST /api/v1/auth/refresh` — exchanges refresh token for new access token
- [ ] `POST /api/v1/auth/logout` — revokes refresh token
- [ ] `POST /api/v1/users` — admin creates user (chain_admin only)
- [ ] `GET /api/v1/users` — list users for branch (manager+)
- [ ] `PATCH /api/v1/users/:id` — update user (chain_admin only)
- [ ] `GET /api/v1/users/me` — returns current user profile
- [ ] `GET /api/v1/branches` — list branches (chain_admin: all; others: own)
- [ ] `POST /api/v1/branches` — create branch (chain_admin)
- [ ] `PATCH /api/v1/branches/:id` — update branch (chain_admin)
- [ ] `POST /api/v1/branches/:id/assign-user` — assign user to branch (chain_admin)
- [ ] `JwtAuthGuard` — validates access token, rejects expired/invalid
- [ ] `RolesGuard` — decorator-driven role checks (`@Roles('hotel_manager')`)
- [ ] `BranchGuard` — injects and validates branch scope from JWT
- [ ] Audit log service — called from auth events
- [ ] DB-level audit_log immutability migration (REVOKE + RULE)
- [ ] Apply `ThrottlerGuard` to auth endpoints: 30 req/min per IP
- [ ] CSRF double-submit cookie protection on all cookie-mutating endpoints
- [ ] Create `NotificationModule` stub with `NotificationService` interface (email sending — wired in later phases as events fire)
- [ ] Seed script: create initial chain_admin user and first branch

### Frontend
- [ ] `/login` page — email + password form, RTL layout
- [ ] Auth API client (`src/lib/api/auth.ts`)
- [ ] Auth store (Zustand): `user`, `role`, `branchId`, `isAuthenticated`
- [ ] `ProtectedRoute` HOC — redirects to `/login` if not authenticated
- [ ] `RoleGate` component — hides UI elements based on role
- [ ] Topbar: display logged-in user name + role badge
- [ ] Sidebar: role-aware navigation items
- [ ] Logout button in Topbar
- [ ] `/admin/branches` — branch list page (chain_admin only)
  - Table: name, address, phone, active status
  - Create branch button
  - Edit branch (name, address, contact details)
- [ ] `/admin/users` — user management page (chain_admin; manager for own branch)
  - Table: name, email, role, branch, active status
  - Create user form (role + branch assignment)
  - Deactivate user button

---

## Expected Deliverables

1. Login page functional — valid credentials issue JWT, stored as HttpOnly cookie
2. Invalid credentials return `401` with consistent error format
3. Accessing protected routes without token returns `401`
4. Role-based route access works: manager routes blocked for receptionist
5. Branch scoping: user can only access their assigned branch's data
6. Admin can create users with assigned roles and branches
7. Audit log records login/logout events (immutable at DB level)
8. Branch CRUD and user-to-branch assignment works
9. Auth endpoint rate limiting active (30/min per IP)
10. NotificationService stub wired and ready for first consumer (Phase 5)

---

## Validation Checklist

- [ ] `POST /api/v1/auth/login` with valid creds → `200` with tokens
- [ ] `POST /api/v1/auth/login` with bad creds → `401`
- [ ] Expired access token → `401` with `TOKEN_EXPIRED` code
- [ ] `POST /api/v1/auth/refresh` with valid refresh → new access token
- [ ] Revoked refresh token → `401`
- [ ] Role guard: `hotel_manager` endpoint returns `403` for `receptionist`
- [ ] Branch guard: user from Branch A cannot access Branch B data
- [ ] `chain_admin` has cross-branch visibility
- [ ] Audit log has entry for every login/logout
- [ ] Password not stored in plain text (bcrypt hash in DB)
- [ ] Login page renders RTL correctly
- [ ] Protected routes redirect to `/login` when unauthenticated
- [ ] TypeScript: zero `any` in auth module

---

## Exit Criteria

All of the following must be true before Phase 2 begins:

1. Authentication flow works end-to-end (login → protected API call → logout)
2. RBAC tested for all 4 roles
3. Branch scoping validated — cross-branch data leak tested and blocked
4. Audit logs persisting for all auth events
5. Seed script creates a usable chain_admin user
6. Zero TypeScript errors in auth module
7. Integration tests cover: login, refresh, logout, role guard, branch guard
