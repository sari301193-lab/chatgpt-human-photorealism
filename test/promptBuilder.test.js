import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPrompt, buildPromptSections, normalizeList } from '../lib/promptBuilder.js';

test('normalizeList trims comma and newline separated values', () => {
  assert.deepEqual(normalizeList(' one, two\nthree ,,\n four '), ['one', 'two', 'three', 'four']);
});

test('buildPrompt uses a safe default when subject is missing', () => {
  const prompt = buildPrompt({});

  assert.match(prompt, /^Create a photorealistic human portrait\./);
  assert.match(prompt, /Base quality: photorealistic human subject, natural anatomy, lifelike skin texture, high detail\./);
});

test('buildPromptSections appends negative prompt section when provided', () => {
  const sections = buildPromptSections({
    subject: 'a woman in a red blazer',
    negative: 'extra fingers, blurry eyes'
  });

  assert.equal(sections.at(-1).label, 'Avoid');
  assert.equal(sections.at(-1).value, 'extra fingers, blurry eyes');
});

test('buildPrompt includes only populated sections', () => {
  const prompt = buildPrompt({
    subject: 'a man with short hair',
    lighting: 'soft natural window light',
    camera: '85mm lens'
  });

  assert.equal(
    prompt,
    'Create a photorealistic human image of a man with short hair. Base quality: photorealistic human subject, natural anatomy, lifelike skin texture, high detail. Lighting: soft natural window light. Camera: 85mm lens.'
  );
});
