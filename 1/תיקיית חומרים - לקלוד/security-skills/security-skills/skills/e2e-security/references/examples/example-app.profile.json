{
  "_comment": "EXAMPLE target profile (fictional). The e2e-security skill is generic — copy this and fill in your own app's values. Replace every placeholder.",
  "name": "example-app",
  "baseUrl": "http://localhost:3000",
  "auth": {
    "mode": "form",
    "loginPath": "/login",
    "userField": "email",
    "passField": "password",
    "submit": "auto",
    "loginEndpoint": "/api/auth/login",
    "userKey": "email",
    "passKey": "password"
  },
  "accounts": [
    { "role": "admin",   "username": "admin@example.test",  "password": "<seed-password>" },
    { "role": "userA",   "username": "alice@example.test",  "password": "<seed-password>" },
    { "role": "userB",   "username": "bob@example.test",    "password": "<seed-password>" }
  ],
  "dbUrl": "postgresql://<user>:<password>@localhost:<port>/<database>",
  "hints": {
    "openapi": "/api/docs-json",
    "sensitivePaths": ["/api/files/", "/metrics", "/admin", "/api/docs"],
    "selfUpdateEndpoint": "PATCH /api/users/me",
    "ownedResource": "<the resource a user owns: order|invoice|document|...>",
    "privilegedFields": ["role", "isAdmin", "balance"]
  },
  "reset": "<command that restores your seed/throwaway data, e.g. npm run db:seed>"
}
