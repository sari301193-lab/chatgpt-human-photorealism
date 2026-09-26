import { buildPrompt, buildPromptSections } from '/lib/promptBuilder.js';

const form = document.querySelector('#prompt-form');
const output = document.querySelector('#prompt-output');
const breakdown = document.querySelector('#prompt-breakdown');
const copyButton = document.querySelector('#copy-output');
const exampleButton = document.querySelector('#load-example');

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
  breakdown.innerHTML = '';

  sections.forEach((section) => {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${section.label}:</strong> ${section.value}`;
    breakdown.appendChild(item);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderPrompt(getFormData());
});

copyButton.addEventListener('click', async () => {
  if (!output.value) {
    return;
  }

  await navigator.clipboard.writeText(output.value);
  copyButton.textContent = 'Copied';
  window.setTimeout(() => {
    copyButton.textContent = 'Copy';
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
