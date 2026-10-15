import { useEffect, useMemo, useRef, useState } from 'react';
import { loadSearchIndex } from '../lib/data';
import { routeForPath } from '../lib/paths';
import { searchDocuments } from '../lib/search';
import type { DocumentKind, SearchEntry } from '../types';
import { Icon } from './Icon';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<DocumentKind | undefined>();
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (!open || entries) return;
    const controller = new AbortController();
    setError(false);
    loadSearchIndex(controller.signal)
      .then(setEntries)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, entries, retry]);
  const results = useMemo(
    () => searchDocuments(query, entries || [], kind),
    [query, entries, kind],
  );
  return (
    <dialog
      className="search-dialog"
      ref={dialog}
      aria-labelledby="search-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="search-panel">
        <header>
          <h2 id="search-title">搜索课程与练习</h2>
          <button className="icon-button" aria-label="关闭搜索" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="search-input-wrap">
          <Icon name="search" size={21} />
          <input
            ref={input}
            type="search"
            placeholder="试试：零信任、nonce、提示注入…"
            value={query}
            aria-label="搜索课程与练习"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) {
                window.location.hash = routeForPath(results[0].entry.path);
                onClose();
              }
            }}
          />
        </div>
        <div className="search-filters" role="group" aria-label="搜索类型">
          {[
            [undefined, '全部'],
            ['lesson', '课程'],
            ['question', '练习'],
            ['reference', '学习参考'],
          ].map(([value, label]) => (
            <button
              key={label}
              aria-pressed={kind === value}
              onClick={() => setKind(value as DocumentKind | undefined)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-results">
          {error ? (
            <div role="alert" className="search-state">
              搜索内容加载失败。
              <button className="text-button" onClick={() => setRetry((v) => v + 1)}>
                重试
              </button>
            </div>
          ) : !entries ? (
            <p className="search-state" role="status">
              正在准备搜索内容…
            </p>
          ) : !query.trim() ? (
            <div className="search-state">
              <Icon name="search" size={26} />
              <p>带着一个问题，找到学习的入口。</p>
              <small>可搜索标题与正文，支持中文和英文术语。</small>
            </div>
          ) : !results.length ? (
            <div className="search-state" role="status">
              <p>没有找到相关内容</p>
              <small>试试更短的关键词，或切换搜索类型。</small>
            </div>
          ) : (
            <>
              <p className="search-result-count" role="status">
                找到 {results.length}
                {results.length === 40 ? '+' : ''} 条相关内容
              </p>
              {results.map((result) => (
                <a
                  className="search-result"
                  key={result.entry.path}
                  href={routeForPath(result.entry.path)}
                  onClick={onClose}
                >
                  <span className="search-result-kind">
                    {
                      { lesson: '课程', question: '练习', answer: '解析', reference: '参考' }[
                        result.entry.kind
                      ]
                    }
                  </span>
                  <strong>{result.entry.title}</strong>
                  <p>{result.snippet}</p>
                  <Icon name="chevron" size={15} />
                </a>
              ))}
            </>
          )}
        </div>
        <footer>
          <span>↵ 打开首项</span>
          <span>Esc 关闭</span>
        </footer>
      </div>
    </dialog>
  );
}
