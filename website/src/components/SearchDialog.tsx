import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { loadSearchIndex } from '../lib/data';
import { routeForPath } from '../lib/paths';
import { searchDocuments } from '../lib/search';
import type { DocumentKind, SearchEntry } from '../types';
import { Icon } from './Icon';
import './search-interactions.css';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  const composing = useRef(false);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<DocumentKind | undefined>();
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else {
      composing.current = false;
      dialog.current?.close();
    }
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
  const isComposing = (event: KeyboardEvent<HTMLElement>) =>
    composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
  const focusResult = (index: number) => {
    const link = resultLinks.current[index];
    link?.focus({ preventScroll: true });
    link?.scrollIntoView({ block: 'nearest' });
  };
  return (
    <dialog
      className="search-dialog"
      ref={dialog}
      aria-labelledby="search-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (!isComposing(event)) onClose();
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
            aria-describedby="search-keyboard-hint"
            onChange={(event) => setQuery(event.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              if (isComposing(event)) return;
              if (results.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault();
                focusResult(event.key === 'ArrowDown' ? 0 : results.length - 1);
              }
              if (event.key === 'Enter' && results[0]) {
                event.preventDefault();
                window.location.hash = routeForPath(results[0].entry.path);
                onClose();
              }
            }}
          />
          {query && (
            <button
              className="search-clear"
              type="button"
              aria-label="清空搜索"
              onClick={() => {
                setQuery('');
                input.current?.focus();
              }}
            >
              <Icon name="close" size={17} />
            </button>
          )}
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
              {results.map((result, index) => (
                <a
                  className="search-result"
                  key={result.entry.path}
                  ref={(link) => {
                    resultLinks.current[index] = link;
                  }}
                  href={routeForPath(result.entry.path)}
                  onClick={onClose}
                  onKeyDown={(event) => {
                    if (isComposing(event)) return;
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      if (event.key === 'ArrowUp' && index === 0) input.current?.focus();
                      else
                        focusResult(
                          Math.min(
                            results.length - 1,
                            index + (event.key === 'ArrowDown' ? 1 : -1),
                          ),
                        );
                    }
                  }}
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
          <span id="search-keyboard-hint">↑↓ 选择结果 · Enter 打开</span>
          <span>Esc 关闭</span>
        </footer>
      </div>
    </dialog>
  );
}
