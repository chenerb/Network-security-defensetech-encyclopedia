import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { resolveContentLink } from './paths';

export interface MarkdownHeading {
  id: string;
  text: string;
  level: number;
}

/** Uses rendered heading text, including inline code, rather than raw Markdown. */
export function headingSlug(text: string): string {
  return (
    text
      .normalize('NFC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s+/gu, '-') || 'section'
  );
}

export function renderMarkdown(
  source: string,
  sourcePath: string,
): { html: string; headings: MarkdownHeading[] } {
  const rendered = marked.parse(source, { async: false, gfm: true });
  const clean = DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'style',
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'video',
      'audio',
      'canvas',
      'svg',
      'math',
    ],
    FORBID_ATTR: ['style', 'id', 'name', 'srcset', 'srcdoc', 'autofocus'],
    ALLOW_DATA_ATTR: false,
  });
  const container = document.createElement('div');
  container.innerHTML = clean;
  const used = new Set<string>();
  const headings: MarkdownHeading[] = [];
  for (const heading of container.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')) {
    const text = heading.textContent?.trim() || '本节';
    const base = headingSlug(text);
    let id = base;
    for (let suffix = 1; used.has(id); suffix += 1) id = `${base}-${suffix}`;
    used.add(id);
    heading.id = id;
    heading.tabIndex = -1;
    headings.push({ id, text, level: Number(heading.tagName.slice(1)) });
  }
  for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a')) {
    const raw = anchor.getAttribute('href');
    const resolved = raw ? resolveContentLink(raw, sourcePath) : { type: 'blocked', href: '' };
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
    if (resolved.type === 'blocked') {
      anchor.removeAttribute('href');
      continue;
    }
    anchor.href = resolved.href;
    if (resolved.type === 'external') {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
  }
  for (const img of container.querySelectorAll<HTMLImageElement>('img')) {
    const raw = img.getAttribute('src');
    const resolved = raw ? resolveContentLink(raw, sourcePath) : { type: 'blocked', href: '' };
    if (
      resolved.type !== 'asset' ||
      !/\.(svg|png|jpe?g|webp|gif|avif)(?:[?#]|$)/i.test(resolved.href)
    ) {
      img.removeAttribute('src');
      continue;
    }
    img.src = resolved.href;
    img.loading = 'lazy';
    img.decoding = 'async';
  }
  for (const pre of container.querySelectorAll<HTMLPreElement>('pre')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-code';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '复制代码';
    button.setAttribute('data-copy-code', 'true');
    pre.replaceWith(wrapper);
    wrapper.append(button, pre);
  }
  for (const table of container.querySelectorAll<HTMLTableElement>('table')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-table';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', '表格，可横向滚动');
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
  return { html: container.innerHTML, headings };
}
