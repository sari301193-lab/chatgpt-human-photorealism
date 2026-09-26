# chatgpt-human-photorealism

A small web app and ChatGPT plugin-compatible API for reverse-engineering photorealistic human image prompts.

## What it does

The app helps you break a target image into reusable prompt components such as subject, expression, wardrobe, environment, lighting, camera, and negative prompt constraints. It then combines those observations into a single prompt that can be reused or refined.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Use as a ChatGPT plugin

When the app is running locally, it also exposes plugin metadata and an API:

- Manifest: `http://localhost:3000/.well-known/ai-plugin.json`
- OpenAPI spec: `http://localhost:3000/openapi.yaml`
- Reverse-engineering endpoint: `POST http://localhost:3000/api/reverse-engineer`

Example request body:

```json
{
  "subject": "a woman in a red blazer",
  "lighting": "soft studio light",
  "environment": "minimal editorial backdrop",
  "negative": "extra fingers, waxy skin"
}
```

The API returns a generated `prompt` string and a `sections` breakdown.

## Test

```bash
npm test
```
