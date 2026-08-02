<!-- EH-GOV:BEGIN GENERATED source=ehudso7/project-governance version=2.0.0 — do not edit inside this block; edits will be overwritten by `malik sync`. Project-owned content belongs in the PROJECT block. -->
# CLAUDE.md — assurance-wire-live

Governance: `ehudso7/project-governance` v2.0.0 · profile `web-saas` · criticality `medium`

You are working in `assurance-wire-live` (web-saas). This project is governed: how you work here is defined by the pinned governance version above, not by ad-hoc judgment. `AGENTS.md` holds the cross-agent constitution; this file adds Claude Code specifics.

## Operating rules

1. **Inspect before changing.** Read the relevant code, tests, and docs before editing. Never edit a file you have not read.
2. **Classify the task first.** Every task is one of: `trivial`, `linear`, `multi-step`, `graph-required`, `high-risk-controlled`. State your classification before starting non-trivial work.
3. **Use graph workflows for non-trivial work.** For `multi-step` and above, identify the applicable workflow graph (see `GRAPH.md` and the table below), follow its nodes in order, and respect its gates. Do not collapse a graph-required workflow into one monolithic edit.
4. **Track state.** For graph-required work, create or update a task state record under `.governance/evidence/` (execution record per run). Distinguish `planned` → `implemented` → `tested` → `verified` explicitly; never report a later state than you have evidence for.
5. **Respect this repository's architecture.** Match existing patterns, module boundaries, and naming. Architecture changes go through the `architecture-review` graph.
6. **Validate before claiming completion.** Run the project's build/lint/test commands and report their real exit codes. Never claim success without command output backing it. A completion claim without verification evidence is a policy violation (`ai-agents.unverified-completion`).
7. **Produce evidence.** Non-trivial work produces an evidence bundle in `.governance/evidence/` (see `EVIDENCE.md`).
8. **Preserve unrelated work.** Never revert, reformat, or "clean up" code outside the task scope. Never discard uncommitted changes you did not author.
9. **Human approval is required for:** `production-deployment`, `destructive-migration`, `secrets`, `billing`, `authentication`, `authorization`. Request approval at those points and only those points — do not pad the session with unnecessary confirmations elsewhere.
10. **Stop on destructive or ambiguous high-risk operations.** If a step would drop data, rewrite history, touch secrets/billing/auth, or its intent is ambiguous, stop and ask.
11. **Full replacements when needed.** If an edit is too tangled for a patch, provide the complete replacement file rather than a partial diff that might corrupt it.
12. **Work checkpoint by checkpoint.** Finish and verify one graph node before moving to the next. Report blockers honestly instead of routing around them silently.

## Default workflow graphs

| Task kind | Graph |
|---|---|
| feature | `feature-development` |
| bug | `bug-resolution` |
| architecture | `architecture-review` |
| release | `production-release` |
| incident | `incident-response` |
| audit | `repository-audit` |
| security | `security-review` |
| dependency | `dependency-upgrade` |

Graph definitions live in the governance source (`graphs/`); render one with `malik graph render <id>`.

## Sensitive paths

Changes under these paths trigger sensitive-path policies (extra review, approval, or denial):

- `.github/workflows/**`
- `**/migrations/**`
- `infra/**`
- `**/*auth*`
- `**/*billing*`
- `**/*permission*`
- `**/*secret*`

## Policies in force

Required policy sets: `base`, `security`, `delivery`, `ai-agents`. Machine-readable definitions live in the governance source (`policies/`); run `malik inspect` for the resolved list.
<!-- EH-GOV:END GENERATED -->

<!-- EH-GOV:BEGIN PROJECT -->
<!-- Project-specific additions go here. `ehgov sync` never modifies this block. -->
<!-- EH-GOV:END PROJECT -->
