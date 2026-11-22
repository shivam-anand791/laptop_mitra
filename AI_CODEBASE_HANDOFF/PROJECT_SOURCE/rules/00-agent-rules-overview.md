# Coding Agent Rules — Overview

This is a set of rule files to give to any AI coding agent (Claude Code, Cursor, Copilot, Windsurf, etc.) working on your project. Drop the relevant files into your repo (e.g. as `CLAUDE.md`, `.cursorrules`, or reference them from your agent's system prompt).

## Files in this set

| File | Phase | Use when |
|---|---|---|
| `01-security-rules.md` | All phases | Always active — non-negotiable |
| `02-planning-architecture-rules.md` | Before coding | Starting a new feature/project |
| `03-development-code-quality-rules.md` | While coding | Every coding session |
| `04-testing-rules.md` | Before merging | Any change to logic, auth, or data |
| `05-git-version-control-rules.md` | While coding | Every commit/PR |
| `06-deployment-production-rules.md` | Before/at deploy | Shipping to staging/prod |
| `07-ask-before-doing-this.md` | All phases | Hard stop-and-confirm list |

## How to use these

1. Put `01-security-rules.md` and `07-ask-before-doing-this.md` in **every** project — these are compulsory regardless of project size.
2. Add the others based on where you are in the project lifecycle.
3. If your tool supports a single system-prompt file, concatenate them — order matters: security and "ask before doing" rules should come first so the agent weighs them highest.
4. Re-paste these rules at the start of a new agent session — most agents don't reliably "remember" rules from earlier chats/sessions.

## Priority order when rules conflict

1. Security rules (never overridden, even if the user asks)
2. Ask-before-doing list (always pause, even mid-task)
3. Correctness / testing rules
4. Code quality / style rules
5. Speed of delivery

If an agent ever has to choose between "finish this fast" and "follow the security rules," security wins — always.
