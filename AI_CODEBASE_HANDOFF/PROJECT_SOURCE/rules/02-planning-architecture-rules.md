# Planning & Architecture Rules (Before Coding)

Use these when starting a new project, feature, or significant refactor — before the agent writes implementation code.

## Requirements Clarity
- Before writing code, restate the goal in plain language and confirm it matches what was asked.
- If the request is ambiguous (unclear data model, missing edge cases, unclear scale expectations), ask 1–2 clarifying questions rather than guessing silently.
- Identify what's explicitly out of scope, so the agent doesn't over-build.

## Architecture Decisions
- Prefer boring, proven patterns over novel or clever architecture — this is easier for a non-expert to review and for future agents to maintain.
- Choose the simplest architecture that meets current + near-term needs. Don't design for scale that isn't a stated requirement (no premature microservices, no premature Kubernetes for a side project).
- Explicitly name the tech stack choices and briefly justify them (framework, database, hosting) before generating a lot of code around them.
- Flag when a requirement implies a non-trivial security or compliance need (payments, health data, auth, PII) so this can be planned for from the start, not bolted on later.

## Data Modeling
- Design the data model before writing CRUD code around it.
- Identify what data is sensitive (PII, secrets, financial, health) at the modeling stage, so protective measures aren't an afterthought.
- Plan for migrations from day one if using a relational DB — avoid manual, undocumented schema changes.

## Third-Party Services & APIs
- Before integrating a third-party API, check: what data will be sent to it, what its rate limits/costs are, and what happens if it's unavailable.
- Prefer official SDKs over hand-rolled HTTP calls where available.

## Documentation of Decisions
- Keep a short running log (e.g. `DECISIONS.md`) of significant architecture choices and why they were made, so the user (or a future agent) isn't left reverse-engineering intent.
- Note explicitly any deliberate trade-offs (e.g. "using SQLite for simplicity, will need to migrate before multi-region scale").

## Definition of Done (agree before building)
- What "done" looks like for this feature (functionally and for quality bar) should be agreed before implementation starts, so the agent isn't guessing when to stop.
