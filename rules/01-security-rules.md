# Security Rules (Compulsory — All Phases)

These rules apply at all times, regardless of what the user asks for. If a request conflicts with these rules, the agent should flag the conflict instead of silently complying or silently refusing.

## Secrets & Credentials
- NEVER hardcode API keys, tokens, passwords, DB connection strings, or private keys in source code.
- Always read secrets from environment variables or a secret manager (e.g. `.env` + `process.env`, AWS Secrets Manager, Vault).
- Add `.env`, `.env.*`, and any credentials file to `.gitignore` **before** the first commit — not after.
- If a secret is ever found in a diff, stop and flag it. Do not commit. Assume it needs to be rotated even after removal from the code.
- Never print secrets to logs, console output, or error messages.

## Input Validation & Injection Prevention
- Treat ALL external input as untrusted: user form input, query params, headers, file uploads, third-party API responses, webhook payloads.
- Use parameterized queries / prepared statements or ORM methods for all database access. Never build SQL via string concatenation or f-strings.
- Never pass user input directly to a shell command (`os.system`, `exec`, `eval`, `subprocess` with `shell=True`). Use safe APIs with argument arrays.
- Escape output for its context: HTML-escape for browser rendering, parameterize for SQL, avoid `innerHTML`/`dangerouslySetInnerHTML` with unsanitized data.
- Validate file uploads: check type, size, and content — never trust the file extension or MIME type alone.

## Authentication & Authorization
- Never disable, stub out, or bypass an auth check "temporarily to get it working." This is the most common way vibe-coded apps end up with an open database or admin panel.
- Enforce authorization checks on the server/backend. Client-side checks (hiding a button) are UX, not security.
- Apply least privilege: scope API keys, DB users, and cloud IAM roles to only what's needed.
- Never expose internal IDs, admin endpoints, or debug routes in production without auth.

## Data Protection
- Hash passwords with a proper algorithm (bcrypt/argon2/scrypt) — never store plaintext or use fast general-purpose hashes (MD5/SHA1) for passwords.
- Don't log sensitive data: passwords, tokens, full card numbers, government IDs, health data — even in debug/dev logs.
- Use HTTPS/TLS for any network calls carrying sensitive data.
- Default to encrypting sensitive data at rest when the platform makes this easy (managed DB encryption, etc.).

## Error Handling
- Never expose stack traces, internal error messages, DB schema, or file paths to end users in production responses.
- Return generic error messages externally; log full details internally.

## Dependencies & Supply Chain
- Prefer well-maintained, widely used libraries over obscure or unmaintained ones.
- Flag any new dependency that requests broad system, network, or filesystem access.
- Periodically check for known vulnerabilities (`npm audit`, `pip-audit`, `cargo audit`, etc.) and don't silently ignore high/critical findings.

## Configuration Hygiene
- Never let dev-only shortcuts leak into production: disabled CORS, wildcard CORS with credentials, permissive Content-Security-Policy, debug mode on, verbose logging on.
- CORS: use explicit origin allow-lists. Never combine `Access-Control-Allow-Origin: *` with `Allow-Credentials: true`.
- Keep dev/staging/prod configuration clearly separated (separate `.env` files, separate secrets, separate DB instances).

## Non-Negotiable Stance
The agent should refuse to silently work around these rules even under time pressure or explicit user instruction to "just make it work" — instead, it should explain the risk and propose a secure alternative.
