const express = require('express');
const fs = require('fs');
const path = require('path');

const VALID_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024']);
const VALID_QUALITIES = new Set(['standard', 'hd']);
const VALID_STYLES = new Set(['natural', 'vivid']);

function readPublicFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', 'public', ...parts), 'utf8');
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl ? baseUrl.replace(/\/+$/, '') : null;
}

function requirePublicBaseUrl(res, configuredBaseUrl) {
  if (!configuredBaseUrl) {
    res.status(500).json({ error: 'PUBLIC_BASE_URL is not configured.' });
    return null;
  }

  return configuredBaseUrl;
}

async function parseResponseBody(response) {
  if (typeof response.text !== 'function') {
    return typeof response.json === 'function' ? response.json() : null;
  }

  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function createApp({
  apiKey = process.env.OPENAI_API_KEY,
  baseUrl = process.env.PUBLIC_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  const app = express();
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const openApiTemplate = readPublicFile('openapi.yaml');

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => {
    res.json({
      name: 'chatgpt-human-photorealism',
      description: 'ChatGPT plugin for generating photorealistic human images with DALL-E.',
      docs: normalizedBaseUrl
        ? {
            manifest: `${normalizedBaseUrl}/.well-known/ai-plugin.json`,
            openapi: `${normalizedBaseUrl}/openapi.yaml`,
            health: `${normalizedBaseUrl}/health`,
          }
        : null,
      configuration: normalizedBaseUrl ? 'ready' : 'Set PUBLIC_BASE_URL to expose plugin metadata.',
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/.well-known/ai-plugin.json', (req, res) => {
    const publicBaseUrl = requirePublicBaseUrl(res, normalizedBaseUrl);

    if (!publicBaseUrl) {
      return;
    }

    res.json({
      schema_version: 'v1',
      name_for_human: 'Human Photorealism',
      name_for_model: 'human_photorealism',
      description_for_human: 'Generate photorealistic human images with DALL-E.',
      description_for_model:
        'Use this plugin to generate photorealistic human images. Provide a detailed prompt describing the subject, setting, lighting, wardrobe, camera framing, and mood.',
      auth: {
        type: 'none',
      },
      api: {
        type: 'openapi',
        url: `${publicBaseUrl}/openapi.yaml`,
      },
      logo_url: `${publicBaseUrl}/logo.svg`,
      contact_email: 'support@example.com',
      legal_info_url: 'https://example.com/legal',
    });
  });

  app.get('/openapi.yaml', (req, res) => {
    const publicBaseUrl = requirePublicBaseUrl(res, normalizedBaseUrl);

    if (!publicBaseUrl) {
      return;
    }

    res.type('text/yaml').send(openApiTemplate.replace(/__SERVER_URL__/g, publicBaseUrl));
  });

  app.post('/generate-human-image', async (req, res) => {
    const { prompt, size = '1024x1024', quality = 'standard', style = 'natural' } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'The "prompt" field is required.' });
    }

    if (!VALID_SIZES.has(size)) {
      return res.status(400).json({ error: `Invalid size. Expected one of: ${[...VALID_SIZES].join(', ')}` });
    }

    if (!VALID_QUALITIES.has(quality)) {
      return res
        .status(400)
        .json({ error: `Invalid quality. Expected one of: ${[...VALID_QUALITIES].join(', ')}` });
    }

    if (!VALID_STYLES.has(style)) {
      return res.status(400).json({ error: `Invalid style. Expected one of: ${[...VALID_STYLES].join(', ')}` });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    }

    try {
      const response = await fetchImpl('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ['Bearer', apiKey].join(' '),
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt.trim(),
          size,
          quality,
          style,
          n: 1,
        }),
      });

      const payload = await parseResponseBody(response);

      if (!response.ok) {
        return res.status(response.status).json({
          error:
            (payload && typeof payload === 'object' && payload.error && payload.error.message) ||
            (typeof payload === 'string' && payload) ||
            'Failed to generate image.',
        });
      }

      const image = payload && typeof payload === 'object' ? payload.data?.[0] || null : null;

      if (!image) {
        return res.status(502).json({
          error: 'OpenAI did not return an image result.',
        });
      }

      return res.json({
        created: payload.created,
        image,
      });
    } catch (error) {
      console.error('Failed to generate image with OpenAI', error);
      return res.status(502).json({
        error: 'Failed to generate image.',
      });
    }
  });

  return app;
}

module.exports = {
  createApp,
};
