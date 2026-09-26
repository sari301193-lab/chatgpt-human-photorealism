import { buildPrompt, buildPromptSections } from '/lib/promptBuilder.js';
import { copyPromptToClipboard, toBreakdownItems } from '/lib/ui.js';

const form = document.querySelector('#prompt-form');
const output = document.querySelector('#prompt-output');
const breakdown = document.querySelector('#prompt-breakdown');
const copyButton = document.querySelector('#copy-output');
const copyStatus = document.querySelector('#copy-status');
const exampleButton = document.querySelector('#load-example');
let copyResetTimer;

const example = {
  subject: 'a young man with olive skin, short curly hair, and light stubble',
  face: 'neutral expression, focused eyes, realistic skin texture',
  pose: 'three-quarter portrait, shoulders angled toward camera, chest-up framing',
  wardrobe: 'dark charcoal turtleneck and textured wool coat',
  environment: 'foggy urban rooftop skyline just after sunset',
  lighting: 'soft overcast key light with subtle cool backlight',
  camera: '50mm lens, shallow depth of field, editorial portrait framing',
  mood: 'cinematic, muted blue-gray palette with natural contrast',
  details: 'stray hairs visible, pores and faint under-eye texture preserved, gentle fabric wrinkles',
  quality: 'subtle imperfections, realistic shadow falloff',
  negative: 'over-smoothed skin, plastic texture, extra limbs, malformed hands'
};

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function renderPrompt(data) {
  const sections = buildPromptSections(data);
  output.value = buildPrompt(data);
  breakdown.replaceChildren();

  toBreakdownItems(sections).forEach((section) => {
    const item = document.createElement('li');
    const label = document.createElement('strong');

    label.textContent = section.label;
    item.append(label, ` ${section.value}`);
    breakdown.appendChild(item);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderPrompt(getFormData());
});

copyButton.addEventListener('click', async () => {
  copyStatus.textContent = '';

  try {
    const copied = await copyPromptToClipboard({
      clipboard: navigator.clipboard,
      text: output.value
    });

    if (!copied) {
      return;
    }

    copyButton.textContent = 'Copied';
    copyStatus.textContent = 'Prompt copied to clipboard.';
  } catch {
    copyButton.textContent = 'Clipboard unavailable';
    copyStatus.textContent = 'Clipboard unavailable. Copy the prompt manually.';
  }

  window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    copyButton.textContent = 'Copy';
    copyStatus.textContent = 'Ready to copy prompt.';
  }, 1200);
});

exampleButton.addEventListener('click', () => {
  Object.entries(example).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });

  renderPrompt(example);
});

renderPrompt({});
