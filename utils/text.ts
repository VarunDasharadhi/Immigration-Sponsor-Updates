/**
 * text.ts
 * Plain-text utilities safe to use in both Node and browser.
 */

/**
 * Strip common markdown artifacts from AI output:
 *   **bold**, *italic*, __underline__, `code`, # headings, > blockquotes,
 *   leading list markers, and [label](url) links (keeps the label).
 *
 * Never apply to URL fields — pass those through cleanUrl instead.
 */
export function stripMarkdown(s: string): string {
  if (!s) return s;
  return s
    // [label](url) → label
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // **bold** / __bold__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // *italic* / _italic_
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // `code`
    .replace(/`([^`]*)`/g, '$1')
    // Leading heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Leading blockquote markers
    .replace(/^>\s*/gm, '')
    // Leading list markers (- item, * item, 1. item)
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}
