const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

async function withServer(app, run) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('serves plugin manifest with dynamic host URLs', async () => {
  const app = createApp({ apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ data: [] }) }) });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/.well-known/ai-plugin.json`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.api.url, `${baseUrl}/openapi.yaml`);
    assert.equal(payload.logo_url, `${baseUrl}/logo.svg`);
  });
});

test('rejects requests without a prompt', async () => {
  const app = createApp({ apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ data: [] }) }) });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/generate-human-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /prompt/i);
  });
});

test('forwards valid image requests to the OpenAI images API', async () => {
  let request;
  const app = createApp({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          created: 123,
          data: [{ url: 'https://example.com/image.png', revised_prompt: 'Improved prompt' }],
        }),
      };
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/generate-human-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Photorealistic portrait of a person in natural light',
        size: '1024x1792',
        quality: 'hd',
        style: 'vivid',
      }),
    });

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.image.url, 'https://example.com/image.png');
    assert.equal(request.url, 'https://api.openai.com/v1/images/generations');

    const body = JSON.parse(request.options.body);
    assert.deepEqual(body, {
      model: 'dall-e-3',
      prompt: 'Photorealistic portrait of a person in natural light',
      size: '1024x1792',
      quality: 'hd',
      style: 'vivid',
      n: 1,
    });
    assert.equal(request.options.headers.Authorization, ['Bearer', 'test-key'].join(' '));
  });
});
