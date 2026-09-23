# chatgpt-human-photorealism

ChatGPT plugin for generating photorealistic human images using the OpenAI DALL-E API.

## Features

- ChatGPT plugin manifest at `/.well-known/ai-plugin.json`
- OpenAPI spec at `/openapi.yaml`
- Image generation endpoint at `POST /generate-human-image`
- Basic health endpoint at `GET /health`

## Requirements

- Node.js 18+
- An `OPENAI_API_KEY` with access to the Images API

## Setup

```bash
npm install
OPENAI_API_KEY=your_key_here PUBLIC_BASE_URL=http://localhost:3000 npm start
```

The service starts on port `3000` by default. Override it with `PORT`.
Set `PUBLIC_BASE_URL` to the externally reachable base URL you want exposed in the plugin manifest and OpenAPI spec. The metadata routes return an error until this is configured.

## API

### `POST /generate-human-image`

Request body:

```json
{
  "prompt": "Photorealistic studio portrait of a smiling person with soft cinematic lighting",
  "size": "1024x1024",
  "quality": "standard",
  "style": "natural"
}
```

Supported values:

- `size`: `1024x1024`, `1024x1792`, `1792x1024`
- `quality`: `standard`, `hd`
- `style`: `natural`, `vivid`

Successful responses return the generated image metadata from OpenAI, including the image URL when available.

## Testing

```bash
npm test
```
