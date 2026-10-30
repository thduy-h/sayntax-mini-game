// Local SDK contract test only. No real key, gateway call, or network request.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

for (const [kind, key, needsBearer] of [
  ['legacy-shaped test JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.test', true],
  ['publishable test key', 'sb_publishable_TEST_ONLY', false],
]) {
  let headers;
  const client = createClient('https://example.supabase.co', key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (_url, init) => {
      headers = new Headers(init.headers);
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const result = await client.functions.invoke('arena-get-state', {
    body: { code: 'TEST24' }, headers: { 'x-team-token': 'independent-test-team-token' },
  });
  assert.equal(result.error, null);
  assert.equal(headers.get('apikey'), key);
  assert.equal(headers.has('authorization'), needsBearer);
  if (needsBearer) assert.equal(headers.get('authorization'), `Bearer ${key}`);
  assert.equal(headers.get('x-team-token'), 'independent-test-team-token');
  console.log(`${kind}: expected API/gateway/team headers verified locally`);
}
