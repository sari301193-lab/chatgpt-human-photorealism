import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { createAppServer } from '../server.js';

async function withServer(run) {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('plugin manifest is served from the well-known path', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/.well-known/ai-plugin.json`);
    const manifest = await response.json();

    assert.equal(response.status, 200);
    assert.equal(manifest.api.type, 'openapi');
    assert.equal(manifest.name_for_model, 'photorealistic_prompt_reverse_engineer');
  });
});

test('reverse engineer endpoint returns prompt sections', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reverse-engineer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: 'a woman in a red blazer',
        lighting: 'soft studio light',
        negative: 'extra fingers, waxy skin'
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(payload.prompt, /Create a photorealistic human image of a woman in a red blazer\./);
    assert.deepEqual(payload.sections.at(-1), {
      label: 'Avoid',
      value: 'extra fingers, waxy skin'
    });
  });
});

test('reverse engineer endpoint rejects malformed JSON', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/reverse-engineer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{bad json}'
    });
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Invalid JSON body');
  });
});
