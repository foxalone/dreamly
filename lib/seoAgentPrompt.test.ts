import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeoAgentPrompt } from './seo/agentPrompt';
import type { Analysis } from './seo/opportunities';

const analysis: Analysis = {
  id: 'test', url: 'https://dreamly.art/ar/dreams/work', language: 'ar', createdAt: '2026-10-18T09:00:00Z', intent: 'Размышление о работе', queryCount: 0,
  original: { title: 'PRIVATE_ORIGINAL_TITLE', description: 'PRIVATE_ORIGINAL_DESCRIPTION' },
  title: { value: 'PRIVATE_SUGGESTED_TITLE', reason: 'title rationale', state: 'pending' },
  description: { value: 'PRIVATE_SUGGESTED_DESCRIPTION', reason: 'description rationale', state: 'applied' },
  content: [{ text: 'Add a reflective summary', reason: 'Explain intent', state: 'pending' }, { text: 'REJECTED_CONTENT', reason: 'REJECTED_REASON', state: 'rejected' }],
  links: [{ url: 'https://dreamly.art/ar/dreams/school', reason: 'Related responsibilities', state: 'pending' }, { url: 'https://dreamly.art/ar/dreams/REJECTED_LINK', reason: 'rejected', state: 'rejected' }],
};
function data(prompt: string | null) { assert.ok(prompt); return JSON.parse(prompt.split('Данные выбранных рекомендаций (JSON):\n')[1]); }

test('bulk prompt exports active manual tasks, page language and missing-query limitation without metadata or rejected items', () => {
  const prompt = buildSeoAgentPrompt(analysis)!;
  const exported = data(prompt);
  assert.equal(exported.pageUrl, analysis.url);
  assert.equal(exported.pageLanguage, 'ar');
  assert.equal(exported.contentTasks.length, 1);
  assert.equal(exported.internalLinkTasks.length, 1);
  assert.match(exported.queryEvidence, /отсутствует/);
  assert.doesNotMatch(prompt, /PRIVATE_|REJECTED_/);
  assert.match(prompt, /Не выполняй коммит, push или деплой автоматически/);
});
test('individual prompts contain exactly the selected task and do not mutate decisions', () => {
  const before = JSON.stringify(analysis);
  const content = data(buildSeoAgentPrompt(analysis, { group: 'content', index: 0 }));
  assert.equal(content.contentTasks.length, 1); assert.deepEqual(content.internalLinkTasks, []);
  const link = data(buildSeoAgentPrompt(analysis, { group: 'links', index: 0 }));
  assert.deepEqual(link.contentTasks, []); assert.equal(link.internalLinkTasks.length, 1);
  assert.equal(buildSeoAgentPrompt(analysis, { group: 'content', index: 1 }), null);
  assert.equal(buildSeoAgentPrompt(analysis, { group: 'links', index: 99 }), null);
  assert.equal(JSON.stringify(analysis), before);
});
