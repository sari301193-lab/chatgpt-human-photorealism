const BASE_QUALITIES = [
  'photorealistic human subject',
  'natural anatomy',
  'lifelike skin texture',
  'high detail'
];

export function normalizeList(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildPromptSections(formData) {
  const subject = String(formData.subject || '').trim();
  const sections = [
    {
      label: 'Core image',
      value: subject
        ? `Create a photorealistic human image of ${subject}`
        : 'Create a photorealistic human portrait'
    },
    {
      label: 'Base quality',
      value: [...BASE_QUALITIES, ...normalizeList(formData.quality)].join(', ')
    },
    {
      label: 'Face and expression',
      value: String(formData.face || '').trim()
    },
    {
      label: 'Pose and composition',
      value: String(formData.pose || '').trim()
    },
    {
      label: 'Wardrobe and styling',
      value: String(formData.wardrobe || '').trim()
    },
    {
      label: 'Environment',
      value: String(formData.environment || '').trim()
    },
    {
      label: 'Lighting',
      value: String(formData.lighting || '').trim()
    },
    {
      label: 'Camera',
      value: String(formData.camera || '').trim()
    },
    {
      label: 'Mood and color',
      value: String(formData.mood || '').trim()
    },
    {
      label: 'Fine details',
      value: String(formData.details || '').trim()
    }
  ].filter((section) => section.value);

  const negative = normalizeList(formData.negative);
  if (negative.length) {
    sections.push({
      label: 'Avoid',
      value: negative.join(', ')
    });
  }

  return sections;
}

export function buildPrompt(formData) {
  return buildPromptSections(formData)
    .map((section, index) => {
      if (index === 0) {
        return `${section.value}.`;
      }

      return `${section.label}: ${section.value}.`;
    })
    .join(' ');
}
