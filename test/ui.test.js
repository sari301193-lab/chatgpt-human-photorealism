import test from 'node:test';
import assert from 'node:assert/strict';

import { copyPromptToClipboard, toBreakdownItems } from '../lib/ui.js';

test('toBreakdownItems preserves text content for safe rendering', () => {
  assert.deepEqual(toBreakdownItems([{ label: 'Avoid', value: '<script>alert(1)</script>' }]), [
    {
      label: 'Avoid:',
      value: '<script>alert(1)</script>'
    }
  ]);
});

test('copyPromptToClipboard writes text when clipboard is available', async () => {
  let copiedText = '';
  const result = await copyPromptToClipboard({
    clipboard: {
      async writeText(text) {
        copiedText = text;
      }
    },
    text: 'prompt text'
  });

  assert.equal(result, true);
  assert.equal(copiedText, 'prompt text');
});

test('copyPromptToClipboard returns false when text is empty', async () => {
  const result = await copyPromptToClipboard({
    clipboard: {
      async writeText() {
        throw new Error('should not run');
      }
    },
    text: ''
  });

  assert.equal(result, false);
});

test('copyPromptToClipboard rejects when clipboard is unavailable', async () => {
  await assert.rejects(() => copyPromptToClipboard({ clipboard: undefined, text: 'prompt text' }), /Clipboard API unavailable/);
});
