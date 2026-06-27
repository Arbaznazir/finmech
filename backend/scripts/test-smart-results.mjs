/**
 * Smoke test: smart result catalog, evaluator logic, and public API.
 * Run: node backend/scripts/test-smart-results.mjs
 */

import {
  getTemplatesForModel,
  getOutputFieldsForModel,
  listModelsForSmartResultAdmin,
} from '../src/data/smart-result-catalog.js';

const API = process.env.API_URL || 'http://localhost:5001/api';

// Mirror frontend evaluator (keep in sync)
function getOutputValue(outputs, field) {
  if (!field.includes('.')) return outputs[field];
  let cur = outputs;
  for (const part of field.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function normalizeCompareValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    return lower;
  }
  return String(v).toLowerCase();
}

function compareEqual(a, b) {
  if (typeof a === typeof b) return a === b;
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function evaluateCondition(outputs, condition) {
  const actual = normalizeCompareValue(getOutputValue(outputs, condition.field));
  const expected = normalizeCompareValue(condition.value);
  const expected2 =
    condition.value2 !== undefined ? normalizeCompareValue(condition.value2) : null;
  if (actual === null || expected === null) return false;
  switch (condition.op) {
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'eq':
      return compareEqual(actual, expected);
    case 'neq':
      return !compareEqual(actual, expected);
    case 'between':
      return (
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        typeof expected2 === 'number' &&
        actual >= expected &&
        actual <= expected2
      );
    case 'contains':
      return String(actual).includes(String(expected));
    default:
      return false;
  }
}

function evaluateRule(outputs, rule) {
  if (!rule.conditions?.length) return false;
  const results = rule.conditions.map((c) => evaluateCondition(outputs, c));
  return rule.combineMode === 'any' ? results.some(Boolean) : results.every(Boolean);
}

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function satisfyingValue(condition) {
  const { op, value, value2 } = condition;
  const n = Number(value);
  switch (op) {
    case 'eq':
      return value;
    case 'gt':
      return Number.isNaN(n) ? value : n + 1;
    case 'gte':
      return value;
    case 'lt':
      return Number.isNaN(n) ? value : n - 1;
    case 'lte':
      return value;
    case 'between': {
      const a = Number(value);
      const b = Number(value2);
      return (a + b) / 2;
    }
    case 'contains':
      return `prefix_${value}_suffix`;
    case 'neq':
      return typeof value === 'boolean' ? !value : `not_${value}`;
    default:
      return value;
  }
}

function buildMatchingOutputs(rule) {
  const outputs = {};
  for (const c of rule.conditions) {
    setNested(outputs, c.field, satisfyingValue(c));
  }
  return outputs;
}

function buildNonMatchingOutputs(rule) {
  const outputs = buildMatchingOutputs(rule);
  const c = rule.conditions[0];
  if (!c) return outputs;
  if (c.op === 'eq' && typeof c.value === 'number') {
    setNested(outputs, c.field, c.value - 99999);
  } else if (c.op === 'eq') {
    setNested(outputs, c.field, `__nomatch_${c.value}__`);
  } else if (c.op === 'gt') {
    setNested(outputs, c.field, Number(c.value) - 1);
  } else {
    setNested(outputs, c.field, null);
  }
  return outputs;
}

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed++;
  failures.push({ label, detail });
  console.log(`  ✗ ${label}: ${detail}`);
}

console.log('\n=== Smart Results Test Suite ===\n');

// 1. Catalog structure
console.log('1. Catalog & model list');
const free = listModelsForSmartResultAdmin('free');
const standalone = listModelsForSmartResultAdmin('standalone');
if (free.length >= 4) ok(`Free models: ${free.length}`);
else fail('Free models count', `expected >= 4, got ${free.length}`);

if (standalone.length >= 12) ok(`Standalone models: ${standalone.length}`);
else fail('Standalone models count', `expected >= 12, got ${standalone.length}`);

const cfsOps = standalone.find((m) => m.modelSlug === 'cashflow-ops');
if (cfsOps?.displayName?.includes('Cash Flow Statement')) {
  ok(`Grouped name: ${cfsOps.displayName}`);
} else {
  fail('Grouped display name', JSON.stringify(cfsOps));
}

for (const m of [...free, ...standalone]) {
  const fields = getOutputFieldsForModel(m.modelSlug);
  if (fields.length > 0) ok(`${m.modelSlug}: ${fields.length} output fields`);
  else fail(`${m.modelSlug}`, 'no output fields defined');
}

// 2. Template evaluator — every template should match when outputs satisfy conditions
console.log('\n2. Template rules (match + no-match)');
const allSlugs = [...new Set([...free, ...standalone].map((m) => m.modelSlug))];
let templateCount = 0;

for (const slug of allSlugs) {
  const templates = getTemplatesForModel(slug);
  for (const t of templates) {
    templateCount++;
    const matchOut = buildMatchingOutputs(t);
    const noMatchOut = buildNonMatchingOutputs(t);
    const shouldMatch = evaluateRule(matchOut, t);
    const shouldNot = evaluateRule(noMatchOut, t);

    if (shouldMatch) ok(`${slug} / ${t.id} — matches when expected`);
    else fail(`${slug} / ${t.id} — positive case`, JSON.stringify({ matchOut, conditions: t.conditions }));

    if (!shouldNot) ok(`${slug} / ${t.id} — does not match when expected`);
    else fail(`${slug} / ${t.id} — negative case`, 'matched when it should not');
  }
}
console.log(`   (${templateCount} templates tested)`);

// 3. Nested path unit tests
console.log('\n3. Nested field paths');
const nestedOut = {
  insights: { classification: 'GREEN', healthScore: 85 },
  summary: { fundingRequired: 2_000_000, overallPatBand: 'green' },
  status: { rag: 'GREEN' },
};
if (evaluateCondition(nestedOut, { field: 'insights.classification', op: 'eq', value: 'GREEN' })) {
  ok('insights.classification eq GREEN');
} else fail('nested eq', 'insights.classification');
if (evaluateCondition(nestedOut, { field: 'summary.fundingRequired', op: 'gt', value: 1_000_000 })) {
  ok('summary.fundingRequired gt 1M');
} else fail('nested gt', 'summary.fundingRequired');
if (evaluateCondition(nestedOut, { field: 'status.rag', op: 'eq', value: 'green' })) {
  ok('status.rag case-insensitive eq');
} else fail('case insensitive', 'status.rag');

// 4. Public API
console.log('\n4. Public API GET /smart-result-points');
let apiOk = 0;
let apiFail = 0;
for (const slug of allSlugs) {
  try {
    const res = await fetch(`${API}/smart-result-points?modelSlug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.points)) {
      apiOk++;
      ok(`API ${slug} → ${data.points.length} points`);
    } else {
      apiFail++;
      fail(`API ${slug}`, `${res.status} ${JSON.stringify(data)}`);
    }
  } catch (e) {
    apiFail++;
    fail(`API ${slug}`, e.message);
  }
}

// Summary
console.log('\n=== Summary ===');
console.log(`Assertions passed: ${passed}`);
console.log(`Assertions failed: ${failed}`);
console.log(`API slugs OK: ${apiOk}/${allSlugs.length}`);

if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(` - ${f.label}: ${f.detail}`);
  process.exit(1);
}

console.log('\nAll smart result tests passed.\n');
process.exit(0);
