import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { renderMarkdown } from '../lib/markdown';
import type { MarkdownHeading } from '../lib/markdown';

interface MarkdownProps {
  source: string;
  sourcePath: string;
  onHeadings?: (headings: MarkdownHeading[]) => void;
}

export function Markdown({ source, sourcePath, onHeadings }: MarkdownProps) {
  const rendered = useMemo(() => renderMarkdown(source, sourcePath), [source, sourcePath]);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    onHeadings?.(rendered.headings);
  }, [rendered, onHeadings]);

  async function copyCode(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-copy-code]');
    if (!button || !event.currentTarget.contains(button)) return;
    const code = button.closest('.markdown-code')?.querySelector('pre')?.textContent;
    if (code === undefined || code === null) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('代码已复制');
    } catch {
      setCopyStatus('无法自动复制，请选中代码后手动复制。');
    }
  }

  return (
    <>
      <div
        className="markdown-body"
        onClick={copyCode}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
      <span className="reader-sr-only" role="status" aria-live="polite">
        {copyStatus}
      </span>
    </>
  );
}
