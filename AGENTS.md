<!-- EH-GOV:BEGIN GENERATED source=ehudso7/project-governance version=2.0.0 — do not edit inside this block; edits will be overwritten by `malik sync`. Project-owned content belongs in the PROJECT block. -->
# AGENTS.md — assurance-wire-live

Cross-agent constitution for `assurance-wire-live`. Applies to every AI coding agent operating in this repository (Claude Code, Codex, and future runtimes). Runtime-specific files (`CLAUDE.md`, etc.) defer to this one.

Governance: `ehudso7/project-governance` v2.0.0 · profile `web-saas` · criticality `medium`

## Constitution

1. **Inspect before changing.** Understand the code you are about to modify. Do not guess project commands, paths, or conventions — verify them.
2. **Classify every task** as `trivial`, `linear`, `multi-step`, `graph-required`, or `high-risk-controlled`, and use the matching workflow graph for non-trivial work (see `GRAPH.md`).
3. **No monolithic execution** of graph-required work: follow the graph's nodes, gates, and failure paths.
4. **Honest state reporting.** `planned`, `implemented`, `tested`, and `verified` are distinct states. Claiming `verified` requires recorded command output with passing exit codes.
5. **Evidence.** Non-trivial work produces an execution record and evidence bundle under `.governance/evidence/` (contracts in the governance source `schemas/`).
6. **Human approval is mandatory for:** `production-deployment`, `destructive-migration`, `secrets`, `billing`, `authentication`, `authorization`.
7. **Sensitive paths** (below) carry extra policy weight; treat changes there as high-risk.
8. **Never** commit secrets, fabricate test results, discard unrelated work, or bypass a failing gate by weakening it.

## Sensitive paths

- `.github/workflows/**`
- `**/migrations/**`
- `infra/**`
- `**/*auth*`
- `**/*billing*`
- `**/*permission*`
- `**/*secret*`

## Workflow graph defaults

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

## Governance tooling

- `malik inspect` — project governance status
- `malik validate` — validate this repository against profile `web-saas`
- `malik sync --check` — check generated sections for drift against the pinned governance version
<!-- EH-GOV:END GENERATED -->

<!-- EH-GOV:BEGIN PROJECT -->
<!-- Project-specific additions go here. `ehgov sync` never modifies this block. -->
<!-- EH-GOV:END PROJECT -->
