# AgentGate Change Assurance GA — Live Certification Runbook

This repository is the isolated live certification target for AgentGate Change Assurance. The workflow `.github/workflows/agentgate-ga-certification.yml` converts the previously manual Checkpoint E drill into a repeatable hosted release certification.

## Security model

The workflow does not automate the AgentGate human approval. It creates a real approval-required production-config PR, proves the native GitHub required check is `action_required` and the protected branch is blocked, then waits. A human must approve the assessment in AgentGate. Only after the same GitHub check run becomes `success` does the workflow merge and continue to outcome verification.

The workflow therefore tests the real control boundary instead of bypassing it.

## Required repository secrets

Configure these on `ehudso7/assurance-wire-live`:

- `AGENTGATE_CERT_GITHUB_TOKEN` — dedicated fine-grained PAT limited to this certification repository. It must be able to create/delete branches, create/read/merge pull requests, read checks/rulesets/actions, and push the certification fixture. Use a dedicated token rather than `GITHUB_TOKEN` so automation-created pushes/PRs produce normal downstream workflow events.
- `AGENTGATE_CERT_API_KEY` — AgentGate API key scoped to the organization bound to this repository. It is used only to read the resulting assessment and customer-safe timeline.
- `AGENTGATE_VERCEL_AUTOMATION_BYPASS_SECRET` — optional. Set only when the production AgentGate deployment requires the Vercel automation bypass header.

No GitHub App private key, UIE signing private key, Commitment private key, or dashboard session is stored in this repository.

## What one certification proves

A passing run must demonstrate all of the following on fresh live identifiers:

1. The active repository ruleset requires `AgentGate Change Assurance` and has no bypass actors.
2. A fresh PR touching `config/production.*` is assessed by AgentGate/UIE.
3. The assessment is independently verified and reaches `awaiting_approval`.
4. The native GitHub check reaches `action_required`.
5. GitHub reports the protected PR as blocked before approval.
6. A human approves the AgentGate approval in the product UI.
7. The same GitHub check-run ID becomes `success`.
8. GitHub moves to a mergeable post-approval state and the PR merges without bypass.
9. The sandbox production deployment workflow completes successfully.
10. AgentGate observes authoritative production deployment evidence and derives `deployment_succeeded`.
11. The complete change timeline verifies its hash-chain integrity.
12. A machine-readable JSON evidence record is emitted, SHA-256 hashed, uploaded as a workflow artifact, and signed with a GitHub artifact attestation.
13. The workflow verifies that attestation before completing.

## Running the certification

From GitHub Actions, select **AgentGate Change Assurance GA certification** and choose **Run workflow**. The default AgentGate URL is the current production API. The default wait window is 90 minutes.

Watch the workflow summary. When it displays **Human approval required**, open AgentGate, locate the displayed assessment/approval IDs, and approve the pending change. Do not modify the GitHub ruleset, dismiss the required check, use an administrator bypass, or merge the PR manually.

The workflow will resume automatically once AgentGate updates the same check run to `success`.

## Passing evidence

The final artifact is named approximately:

`agentgate-change-assurance-ga-certification-<run>-<attempt>`

and contains the JSON certification evidence. The JSON records the exact PR, head/merge SHAs, required ruleset, same-check-run transition, pre/post approval merge states, deployment workflow, AgentGate assessment, outcome, timeline integrity, and canonical SHA-256 digest.

GitHub's `actions/attest@v4` creates signed provenance for the evidence file. The workflow then verifies the attestation with `gh attestation verify` before declaring success.

## Failure policy

Any timeout, missing required check, missing no-bypass ruleset, changed check-run ID, unexpected merge state, failed deployment workflow, non-`deployment_succeeded` outcome, or failed evidence-chain verification fails the certification.

A failed run is evidence of a failed certification attempt, not authorization to weaken the ruleset or bypass AgentGate. Investigate the failure, fix the underlying system, and rerun with a fresh certification PR.

## Cleanup

On a successful run, the certification PR is merged and its temporary branch is deleted. The small production certification fixture remains on `main` as an auditable record of the drill. Failed runs may leave a branch or PR for forensic inspection; clean them only after the failure has been understood and recorded.
