export type Route =
  | { view: 'home' | 'catalog' | 'exams' | 'progress' | 'not-found' }
  | { view: 'document'; path: string; section?: string };
export interface ContentLink {
  type: 'route' | 'asset' | 'external' | 'blocked';
  href: string;
}

const documentPaths = new Set(generatedCatalog.documents.map((document) => document.path));
const assets = new Set([
  'images/defense-workflow.svg',
  'examples/integrity_hmac.py',
  'examples/parameterized_query.py',
  'examples/agent_policy.py',
  'LICENSE',
]);

function allowedDocument(path: string) {
  return documentPaths.has(path);
}

export function routeForPath(path: string, section?: string): string {
  if (!allowedDocument(path) || path.split('/').some((p) => p === '.' || p === '..'))
    return '#/not-found';
  try {
    return (
      '#/read/' +
      encodeURI(path).replaceAll('?', '%3F').replaceAll('#', '%23') +
      (section ? '?section=' + encodeURIComponent(section) : '')
    );
  } catch {
    return '#/not-found';
  }
}

export function parseRoute(hash: string): Route {
  const value = hash.replace(/^#/, '');
  const simple: Record<string, Route['view']> = {
    '': 'home',
    '/': 'home',
    '/catalog': 'catalog',
    '/exams': 'exams',
    '/progress': 'progress',
  };
  if (Object.hasOwn(simple, value)) return { view: simple[value] } as Route;
  if (!value.startsWith('/read/')) return { view: 'not-found' };
  try {
    const [encoded, query = ''] = value.slice(6).split('?');
    const path = decodeURIComponent(encoded);
    if (!allowedDocument(path) || path.split('/').some((p) => p === '..' || p === '.'))
      return { view: 'not-found' };
    const section = new URLSearchParams(query).get('section');
    return { view: 'document', path, ...(section ? { section } : {}) };
  } catch {
    return { view: 'not-found' };
  }
}

export function resolveContentLink(href: string, sourcePath: string): ContentLink {
  const blocked: ContentLink = { type: 'blocked', href: '' };
  try {
    const raw = href.trim();
    if (/[\u0000-\u001f\u007f\\]/.test(raw)) return blocked;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
      const external = new URL(raw, 'https://content.invalid/');
      return ['https:', 'http:', 'mailto:'].includes(external.protocol)
        ? { type: 'external', href: external.href }
        : blocked;
    }
    const hashAt = raw.indexOf('#');
    const withoutHash = hashAt < 0 ? raw : raw.slice(0, hashAt);
    const section = hashAt < 0 ? '' : decodeURIComponent(raw.slice(hashAt + 1));
    const queryAt = withoutHash.indexOf('?');
    const encodedPath = queryAt < 0 ? withoutHash : withoutHash.slice(0, queryAt);
    const decodedPath = decodeURIComponent(encodedPath);
    // Decode exactly once. Residual encoding must not become a second traversal pass.
    if (/[%\\?#\u0000-\u001f\u007f]/.test(decodedPath)) return blocked;
    const source = sourcePath.split('/');
    if (
      source.some((segment) => !segment || segment === '.' || segment === '..') ||
      /[%\\?#]/.test(sourcePath)
    )
      return blocked;
    const stack = !decodedPath ? source : decodedPath.startsWith('/') ? [] : source.slice(0, -1);
    for (const segment of decodedPath.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') {
        if (!stack.length) return blocked;
        stack.pop();
      } else stack.push(segment);
    }
    const path = stack.join('/');
    if (allowedDocument(path)) return { type: 'route', href: routeForPath(path, section) };
    if (assets.has(path)) {
      const base = import.meta.env?.BASE_URL || './';
      return {
        type: 'asset',
        href: `${base}content/${path.split('/').map(encodeURIComponent).join('/')}`,
      };
    }
    return blocked;
  } catch {
    return blocked;
  }
}
import generatedCatalog from '../generated/catalog.json' with { type: 'json' };
