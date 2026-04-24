/**
 * AI Efficiency Assistant — File Export Utility
 *
 * Provides helpers to download AI-generated content as .md or .txt files.
 * Uses the Blob + Object URL approach so everything stays client-side.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format the current date as `YYYY-MM-DD` (local time).
 */
function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Sanitize a filename by removing characters that are illegal in file names.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generic file download using Blob + URL.createObjectURL.
 *
 * Creates a temporary anchor element, triggers a click, then revokes the
 * object URL to free memory.
 *
 * @param content  - The text content to write into the file.
 * @param filename - Desired filename **without** extension.
 * @param ext      - File extension including the dot (e.g. '.md', '.txt').
 * @param mimeType - The MIME type for the Blob (e.g. 'text/markdown;charset=utf-8').
 */
export function exportFile(
  content: string,
  filename: string,
  ext: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sanitizeFilename(filename) + ext;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay to ensure the download starts.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
}

/**
 * Export content as a Markdown (.md) file.
 *
 * @param content  - The markdown text to export.
 * @param filename - Optional base filename (without extension). Defaults to
 *                   `AI改写_YYYY-MM-DD`.
 */
export function exportAsMarkdown(content: string, filename?: string): void {
  const baseName = filename ?? `AI改写_${formatDate()}`;
  exportFile(content, baseName, '.md', 'text/markdown;charset=utf-8');
}

/**
 * Export content as a plain text (.txt) file.
 *
 * @param content  - The plain text to export.
 * @param filename - Optional base filename (without extension). Defaults to
 *                   `AI改写_YYYY-MM-DD`.
 */
export function exportAsText(content: string, filename?: string): void {
  const baseName = filename ?? `AI改写_${formatDate()}`;
  exportFile(content, baseName, '.txt', 'text/plain;charset=utf-8');
}

/**
 * Export content as a styled HTML (.html) file.
 *
 * Wraps the given HTML content in a complete document with basic typography
 * styles so it looks presentable when opened in a browser.
 *
 * @param content  - The HTML content to wrap and export.
 * @param filename - Optional base filename (without extension). Defaults to 'document'.
 */
export function exportAsHtml(content: string, filename = 'document') {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
    h1, h2, h3, h4 { margin-top: 1.5em; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1em; color: #666; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1f2937; color: #e5e7eb; padding: 1em; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>${content}</body>
</html>`;
  exportFile(html, filename, '.html', 'text/html;charset=utf-8');
}

/**
 * Export HTML content as plain text (.txt) by stripping all tags.
 *
 * @param content  - The HTML content to strip and export.
 * @param filename - Optional base filename (without extension). Defaults to 'document'.
 */
export function exportAsPlainText(content: string, filename = 'document') {
  const text = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
  exportFile(text, filename, '.txt', 'text/plain;charset=utf-8');
}
