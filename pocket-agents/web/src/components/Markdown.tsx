import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// The professional side of the app: agent output rendered as clean document
// HTML (never pixelated). Sanitized even though the source is our own model.
export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false })), [text]);
  return <div className="output-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
