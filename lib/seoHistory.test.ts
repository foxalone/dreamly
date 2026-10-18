import test from 'node:test';
import assert from 'node:assert/strict';
import { manualProgress, updateManualTask } from './seo/history';
import { buildSeoAgentPrompt } from './seo/agentPrompt';
import type { Analysis } from './seo/opportunities';
const analysis = (): Analysis => ({
  id: 'sample', url: 'https://dreamly.art/dreams/work', createdAt: '2026-10-18', language: 'en', queryCount: 0, intent: 'Work reflection',
  original: { title: 'Old title', description: 'Old description' }, title: { value: 'New title', reason: 'why', state: 'applied' }, description: { value: 'New description', reason: 'why', state: 'pending' },
  content: [{ text: 'Add reflection', reason: 'why', state: 'pending' }], links: [{ url: 'https://dreamly.art/dreams/school', reason: 'why', state: 'pending' }],
});
test('manual tasks retain timestamps and decisions across handoff, completion and reopening', () => {
  const a = analysis();
  a.content = updateManualTask(a, 'content', 0, 'handoff') as Analysis['content'];
  assert.equal(a.content[0].state, 'handed_off'); assert.ok(a.content[0].handedOffAt);
  assert.throws(() => updateManualTask(a, 'content', 0, 'handoff'), /уже/);
  a.content = updateManualTask(a, 'content', 0, 'complete') as Analysis['content'];
  assert.ok(a.content[0].completedAt); assert.equal(manualProgress(a).done, 1);
  assert.throws(() => updateManualTask(a, 'content', 0, 'edit', 'New copy'), /Сначала/);
  assert.doesNotMatch(buildSeoAgentPrompt(a)!, /Add reflection/);
  a.content = updateManualTask(a, 'content', 0, 'reopen') as Analysis['content'];
  assert.equal(a.content[0].completedAt, null); assert.equal(a.content[0].handedOffAt, null);
  assert.match(buildSeoAgentPrompt(a)!, /Add reflection/);
});
test('completed and rejected tasks never produce another bulk prompt; malformed tasks cannot be updated', () => {
  const a = analysis();
  a.content = updateManualTask(a, 'content', 0, 'complete') as Analysis['content'];
  a.links = updateManualTask(a, 'links', 0, 'reject') as Analysis['links'];
  assert.equal(buildSeoAgentPrompt(a), null);
  assert.deepEqual(manualProgress(a), { pending: 0, handedOff: 0, done: 1, rejected: 1, applied: 1 });
  assert.throws(() => updateManualTask(a, 'links', 99, 'complete'), /не найдена/);
  assert.throws(() => updateManualTask(a, 'content', NaN, 'complete'), /не найдена/);
});
