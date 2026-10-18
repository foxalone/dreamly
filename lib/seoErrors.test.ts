import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { seoErrorResponse } from './seo/errors';

test('OpenAI exhausted balance is distinguished from request throttling without leaking provider details', () => {
  for (const code of ['credit_balance_exhausted', 'insufficient_quota', 'billing_hard_limit_reached']) {
    const upstream = new OpenAI.APIError(429, { code, message: 'private provider response sk-secret', type: 'billing_error' }, 'private provider response sk-secret', new Headers());
    const response = seoErrorResponse(upstream);
    assert.equal(response.status, 503);
    assert.equal(response.code, 'SEO_AI_BALANCE');
    assert.match(response.error, /баланс/);
    assert.doesNotMatch(JSON.stringify(response), /sk-secret|private provider/);
  }
  assert.equal(seoErrorResponse({ status:429, code:'rate_limit_exceeded' }).code, 'SEO_AI_RATE_LIMIT');
});
test('connection, timeout, authentication and malformed responses have actionable Russian messages', () => {
  assert.equal(seoErrorResponse({ name:'APIConnectionTimeoutError' }).status, 504);
  assert.equal(seoErrorResponse({ name:'APIConnectionError' }).status, 502);
  assert.equal(seoErrorResponse({ status:401, code:'invalid_api_key' }).code, 'SEO_AI_KEY');
  assert.equal(seoErrorResponse(new SyntaxError('Unexpected token SECRET')).code, 'SEO_INVALID_RESPONSE');
  assert.equal(seoErrorResponse(new Error('UNAUTHENTICATED')).status, 401);
  assert.equal(seoErrorResponse(new Error('FORBIDDEN')).status, 403);
  assert.equal(seoErrorResponse(new Error('Сначала загрузите отчёт.')).error, 'Сначала загрузите отчёт.');
  assert.doesNotMatch(seoErrorResponse(new Error('private detail SECRET')).error, /SECRET/);
});
