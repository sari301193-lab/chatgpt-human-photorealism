export function toBreakdownItems(sections) {
  return sections.map((section) => ({
    label: `${section.label}:`,
    value: section.value
  }));
}

export async function copyPromptToClipboard({ clipboard, text }) {
  if (!text) {
    return false;
  }

  if (!clipboard?.writeText) {
    throw new Error('Clipboard API unavailable');
  }

  await clipboard.writeText(text);
  return true;
}
