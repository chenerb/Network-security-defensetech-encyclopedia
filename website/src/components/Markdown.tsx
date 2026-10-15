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
  // Keep the sanitized subtree intact while its enhanced buttons display local copy feedback.
  const markup = useMemo(() => ({ __html: rendered.html }), [rendered]);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    setCopyStatus('');
    onHeadings?.(rendered.headings);
  }, [rendered, onHeadings]);

  async function copyCode(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-copy-code]');
    if (!button || !event.currentTarget.contains(button)) return;
    const container = event.currentTarget;
    const block = button.closest('.markdown-code');
    const code = block?.querySelector('pre')?.textContent;
    if (code === undefined || code === null) return;
    try {
      await navigator.clipboard.writeText(code);
      if (!container.isConnected || !container.contains(button)) return;
      button.textContent = '已复制';
      block?.querySelector('.markdown-copy-feedback')?.remove();
      setCopyStatus('代码已复制');
    } catch {
      if (!container.isConnected || !container.contains(button)) return;
      button.textContent = '重新复制';
      let feedback = block?.querySelector('.markdown-copy-feedback');
      if (!feedback && block) {
        feedback = globalThis.document.createElement('p');
        feedback.className = 'markdown-copy-feedback';
        block.append(feedback);
      }
      if (feedback) feedback.textContent = '无法自动复制，请选中代码后手动复制。';
      setCopyStatus('无法自动复制，请选中代码后手动复制。');
    }
  }

  return (
    <>
      <div className="markdown-body" onClick={copyCode} dangerouslySetInnerHTML={markup} />
      <span className="reader-sr-only" role="status" aria-live="polite">
        {copyStatus}
      </span>
    </>
  );
}
