export type AssistantMessageBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string; index?: number }
  | { type: "paragraph"; text: string };

function cleanInline(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Some providers occasionally return valid Markdown without line breaks. Insert
 * conservative boundaries around labels and numbered steps before rendering so
 * a useful answer never becomes one unreadable wall of text.
 */
function normalizeBlockBreaks(content: string): string {
  return content
    .replace(/\r/g, "")
    .replace(/\s*\*\*([^*\n]{2,64}):\*\*\s*/g, "\n**$1:**\n")
    .replace(/\s*(?<!\*)\*([^*\n]{2,48}):\*(?!\*)\s*/g, "\n*$1:*\n")
    .replace(/\s+(?=\d{1,2}[.)]\s+)/g, "\n")
    .replace(/\s+(?=[•-]\s+)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseAssistantMessage(content: string): AssistantMessageBlock[] {
  const lines = normalizeBlockBreaks(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: AssistantMessageBlock[] = [];

  for (const raw of lines) {
    const heading = raw.match(/^#{1,4}\s+(.+)$/);
    if (heading?.[1]) {
      blocks.push({ type: "heading", text: cleanInline(heading[1]) });
      continue;
    }

    const numbered = raw.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (numbered?.[2]) {
      blocks.push({
        type: "bullet",
        index: Number(numbered[1]),
        text: cleanInline(numbered[2]),
      });
      continue;
    }

    const bullet = raw.match(/^[-•]\s+(.+)$/);
    if (bullet?.[1]) {
      blocks.push({ type: "bullet", text: cleanInline(bullet[1]) });
      continue;
    }

    const label = raw.match(/^\*{1,2}([^*]{2,64}):\*{1,2}$/);
    if (label?.[1]) {
      blocks.push({ type: "heading", text: cleanInline(label[1]) });
      continue;
    }

    blocks.push({ type: "paragraph", text: cleanInline(raw) });
  }

  return blocks.length
    ? blocks
    : [{ type: "paragraph", text: cleanInline(content) }];
}
