#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const repo = process.env.CERT_REPO || process.env.GITHUB_REPOSITORY || 'ehudso7/assurance-wire-live';
const [owner, name] = repo.split('/');
const agentGateUrl = required('AGENTGATE_URL').replace(/\/$/, '');
const agentGateApiKey = required('AGENTGATE_CERT_API_KEY');
const bypass = process.env.AGENTGATE_VERCEL_AUTOMATION_BYPASS_SECRET || '';
const timeoutMs = Number(process.env.CERT_TIMEOUT_SECONDS || 5400) * 1000;
const pollMs = Number(process.env.CERT_POLL_SECONDS || 10) * 1000;
const runId = process.env.GITHUB_RUN_ID || String(Date.now());
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const branch = `cert/agentgate-ga-${runId}-${runAttempt}`;
const fixture = `config/production.ga-certification-${runId}-${runAttempt}.yaml`;
const artifactDir = process.env.CERT_ARTIFACT_DIR || 'artifacts';
const artifactPath = `${artifactDir}/agentgate-change-assurance-ga-${runId}-${runAttempt}.json`;

await fs.mkdir(artifactDir, { recursive: true });

const baseline = ghJson(['api', `repos/${repo}`]);
const baseBranch = baseline.default_branch || 'main';
const baseSha = ghText(['api', `repos/${repo}/git/ref/heads/${baseBranch}`, '--jq', '.object.sha']).trim();

run('git', ['config', 'user.name', 'AgentGate GA Certification']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['switch', '-c', branch]);
await fs.writeFile(fixture, `# AgentGate Change Assurance GA certification\nrun_id: ${runId}\nrun_attempt: ${runAttempt}\ncreated_at: ${new Date().toISOString()}\nenvironment: production\nrequires_human_approval: true\n`);
run('git', ['add', fixture]);
run('git', ['commit', '-m', `cert: AgentGate GA live drill ${runId}.${runAttempt}`]);
run('git', ['push', '-u', 'origin', branch]);
const headSha = ghText(['rev-parse', 'HEAD'], { command: 'git' }).trim();

const prUrl = ghText([
  'pr', 'create', '--repo', repo, '--base', baseBranch, '--head', branch,
  '--title', `AgentGate GA certification ${runId}.${runAttempt}`,
  '--body', 'Automated live Change Assurance certification drill. This PR must remain blocked until the AgentGate Change Assurance required check is approved.',
]).trim();
const prNumber = Number(prUrl.split('/').pop());
if (!Number.isInteger(prNumber)) fail(`Could not determine PR number from ${prUrl}`);

const ruleset = verifyRuleset();
const assessment = await waitForAssessment('awaiting_approval');
const checkBefore = await waitForCheck('action_required');
const mergeBefore = await waitForMergeState(['BLOCKED']);

const phaseA = {
  certified_at: new Date().toISOString(), repo, base_branch: baseBranch, base_sha: baseSha,
  branch, fixture, pr_number: prNumber, pr_url: prUrl, head_sha: headSha,
  ruleset, assessment_id: assessment.assessment_id, approval_id: assessment.approval_id,
  check_run_id: checkBefore.id, check_conclusion: checkBefore.conclusion,
  merge_state_before_approval: mergeBefore.mergeStateStatus,
};
await fs.writeFile(`${artifactDir}/phase-a.json`, `${JSON.stringify(phaseA, null, 2)}\n`);
summary(`### Human approval required\n\nAgentGate has correctly blocked ${prUrl}.\n\nAssessment: \`${assessment.assessment_id}\`  \nApproval: \`${assessment.approval_id}\`  \nCheck run: \`${checkBefore.id}\`  \nMerge state: **${mergeBefore.mergeStateStatus}**\n\nApprove this assessment in the AgentGate dashboard. This workflow will continue polling without bypassing the human control.\n`);

const approved = await waitForAssessment('allowed');
const checkAfter = await waitForCheck('success');
if (String(checkAfter.id) !== String(checkBefore.id)) fail('Approval did not update the same GitHub check run.');
const mergeAfter = await waitForMergeState(['CLEAN', 'HAS_HOOKS', 'UNSTABLE']);

run('gh', ['pr', 'merge', String(prNumber), '--repo', repo, '--merge', '--delete-branch']);
const merged = await waitForPrMerged();
const mergeSha = merged.mergeCommit?.oid;
if (!mergeSha) fail('Merged PR did not expose merge commit SHA.');

const deployRun = await waitForDeploymentWorkflow(mergeSha);
const timeline = await waitForTimeline(approved.assessment_id, 'deployment_succeeded');
if (!timeline.integrity?.verified) fail('AgentGate timeline integrity verification failed.');

const evidence = {
  schema: 'agentgate.change-assurance.ga-certification.v1',
  generated_at: new Date().toISOString(),
  result: 'pass',
  repository: repo,
  github: {
    base_branch: baseBranch, base_sha: baseSha, head_sha: headSha, merge_sha: mergeSha,
    pull_request_number: prNumber, pull_request_url: prUrl, certification_branch: branch,
    required_ruleset: ruleset,
    check_run: { id: checkBefore.id, same_run_after_approval: String(checkAfter.id) === String(checkBefore.id), before: checkBefore.conclusion, after: checkAfter.conclusion },
    merge_state_before_approval: mergeBefore.mergeStateStatus,
    merge_state_after_approval: mergeAfter.mergeStateStatus,
    deployment_workflow: deployRun,
  },
  agentgate: {
    assessment_id: approved.assessment_id,
    approval_id: approved.approval_id,
    status_after_approval: approved.status,
    verified: approved.verified,
    verdict_effect: approved.verdict_effect,
    outcome_verdict: timeline.outcome?.verdict,
    timeline_integrity: timeline.integrity,
    timeline_event_count: Array.isArray(timeline.events) ? timeline.events.length : null,
  },
};
evidence.content_sha256 = sha256(canonical({ ...evidence, content_sha256: undefined }));
await fs.writeFile(artifactPath, `${JSON.stringify(evidence, null, 2)}\n`);
summary(`### Certification PASS\n\n- PR: ${prUrl}\n- Required check: action_required → success on the same run \`${checkBefore.id}\`\n- Merge gate: ${mergeBefore.mergeStateStatus} → ${mergeAfter.mergeStateStatus}\n- Deployment workflow: \`${deployRun.id}\` success\n- AgentGate outcome: **${timeline.outcome.verdict}**\n- Timeline integrity: **verified** (${timeline.integrity.count} events)\n- Evidence SHA-256: \`${evidence.content_sha256}\`\n`);
console.log(`PASS ${artifactPath} sha256=${evidence.content_sha256}`);

function verifyRuleset() {
  const summaries = ghJson(['api', `repos/${repo}/rulesets?includes_parents=true`]);
  for (const item of summaries) {
    if (item.enforcement !== 'active') continue;
    const full = ghJson(['api', `repos/${repo}/rulesets/${item.id}`]);
    const rule = (full.rules || []).find((r) => r.type === 'required_status_checks');
    const checks = rule?.parameters?.required_status_checks || [];
    const required = checks.find((c) => c.context === 'AgentGate Change Assurance');
    if (required && (!full.bypass_actors || full.bypass_actors.length === 0)) {
      return { id: full.id, name: full.name, enforcement: full.enforcement, integration_id: required.integration_id ?? null, bypass_actor_count: 0 };
    }
  }
  fail('No active no-bypass ruleset requires AgentGate Change Assurance.');
}

async function waitForAssessment(status) {
  return waitUntil(async () => {
    const list = await agentGate(`/v1/change-assessments?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`);
    return (list.assessments || []).find((a) => a.head_sha === headSha && a.status === status) || null;
  }, `assessment status ${status}`);
}

async function waitForCheck(conclusion) {
  return waitUntil(async () => {
    const data = ghJson(['api', `repos/${repo}/commits/${headSha}/check-runs`]);
    return (data.check_runs || []).find((c) => c.name === 'AgentGate Change Assurance' && c.conclusion === conclusion) || null;
  }, `AgentGate check conclusion ${conclusion}`);
}

async function waitForMergeState(states) {
  return waitUntil(async () => {
    const data = ghJson(['pr', 'view', String(prNumber), '--repo', repo, '--json', 'mergeStateStatus,mergeable,url']);
    return states.includes(data.mergeStateStatus) ? data : null;
  }, `merge state ${states.join('|')}`);
}

async function waitForPrMerged() {
  return waitUntil(async () => {
    const data = ghJson(['pr', 'view', String(prNumber), '--repo', repo, '--json', 'state,mergedAt,mergeCommit']);
    return data.state === 'MERGED' ? data : null;
  }, 'PR merged');
}

async function waitForDeploymentWorkflow(sha) {
  return waitUntil(async () => {
    const data = ghJson(['api', `repos/${repo}/actions/runs?head_sha=${sha}&event=push&per_page=100`]);
    const run = (data.workflow_runs || []).find((r) => r.name === 'Deploy production');
    if (!run || run.status !== 'completed') return null;
    if (run.conclusion !== 'success') fail(`Deploy production concluded ${run.conclusion}`);
    return { id: run.id, name: run.name, conclusion: run.conclusion, html_url: run.html_url };
  }, 'Deploy production workflow success');
}

async function waitForTimeline(id, verdict) {
  return waitUntil(async () => {
    const data = await agentGate(`/v1/change-assessments/${encodeURIComponent(id)}/timeline`);
    return data.outcome?.verdict === verdict ? data : null;
  }, `AgentGate outcome ${verdict}`);
}

async function waitUntil(fn, label) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) { lastError = err; }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  fail(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function agentGate(path) {
  const headers = { authorization: `Bearer ${agentGateApiKey}`, accept: 'application/json' };
  if (bypass) headers['x-vercel-protection-bypass'] = bypass;
  const res = await fetch(`${agentGateUrl}${path}`, { headers, redirect: 'follow' });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`Non-JSON AgentGate response: HTTP ${res.status}`); }
  if (!res.ok) throw new Error(`AgentGate HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function ghJson(args) { return JSON.parse(ghText(args)); }
function ghText(args, opts = {}) { return execFileSync(opts.command || 'gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function run(command, args) { execFileSync(command, args, { stdio: 'inherit' }); }
function required(name) { const v = process.env[name]; if (!v?.trim()) fail(`${name} is required.`); return v.trim(); }
function summary(text) { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`).catch(() => {}); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`; return JSON.stringify(value); }
function fail(message) { console.error(`FAIL ${message}`); process.exit(1); }
