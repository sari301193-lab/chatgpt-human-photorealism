const express = require('express');
const fs = require('fs');
const path = require('path');

const VALID_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024']);
const VALID_QUALITIES = new Set(['standard', 'hd']);
const VALID_STYLES = new Set(['natural', 'vivid']);

function readPublicFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', 'public', ...parts), 'utf8');
}

function buildPublicUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function createApp({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  const app = express();
  const openApiTemplate = readPublicFile('openapi.yaml');

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => {
    res.json({
      name: 'chatgpt-human-photorealism',
      description: 'ChatGPT plugin for generating photorealistic human images with DALL-E.',
      docs: {
        manifest: `${buildPublicUrl(req)}/.well-known/ai-plugin.json`,
        openapi: `${buildPublicUrl(req)}/openapi.yaml`,
        health: `${buildPublicUrl(req)}/health`,
      },
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/.well-known/ai-plugin.json', (req, res) => {
    const baseUrl = buildPublicUrl(req);
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
        url: `${baseUrl}/openapi.yaml`,
      },
      logo_url: `${baseUrl}/logo.svg`,
      contact_email: 'support@example.com',
      legal_info_url: 'https://example.com/legal',
    });
  });

  app.get('/openapi.yaml', (req, res) => {
    const baseUrl = buildPublicUrl(req);
    res.type('text/yaml').send(openApiTemplate.replace(/__SERVER_URL__/g, baseUrl));
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

      const payload = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: payload?.error?.message || 'Failed to generate image.',
        });
      }

      return res.json({
        created: payload.created,
        image: payload.data?.[0] || null,
      });
    } catch (error) {
      return res.status(502).json({
        error: error instanceof Error ? error.message : 'Unexpected error while generating image.',
      });
    }
  });

  return app;
}

module.exports = {
  createApp,
};
