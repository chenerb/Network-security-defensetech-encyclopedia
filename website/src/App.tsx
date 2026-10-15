import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { catalog, getDocument, getLesson } from './lib/data';
import { parseRoute, routeForPath } from './lib/paths';
import { emptyProgress, PROGRESS_KEY, readProgress, writeProgress } from './lib/progress';
import './components/shell-interactions.css';
import type { LearningProgress } from './types';
import { ReaderPage } from './components/ReaderPage';
import { Icon } from './components/Icon';
import { SearchDialog } from './components/SearchDialog';
import {
  CatalogPage,
  chapterName,
  ExamsPage,
  Home,
  ProgressPage,
} from './components/LearningPages';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
const validContent = {
  lessonIds: catalog.lessons.map((x) => x.id),
  documentPaths: catalog.documents.map((x) => x.path),
  examIds: catalog.exams.map((x) => x.id),
};
const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

function readProgressSnapshot() {
  const target = storage();
  let fingerprint: string | null | undefined;
  // Capture the exact validated read, including a missing key; storage events may still be queued.
  const result = readProgress(
    target && {
      getItem(key) {
        const source = target.getItem(key);
        fingerprint = source;
        return source;
      },
      setItem: (key, value) => target.setItem(key, value),
    },
    validContent,
  );
  return { ...result, fingerprint };
}

const conflictWarning = '其他标签页更新了学习记录，本页仍有未保存内容。请导出备份后刷新。';

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty-state" role="alert">
        <h1>这个页面暂时无法显示</h1>
        <p>可以重新加载，或回到学习地图继续。</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          重新加载
        </button>
        <a href="#/">返回学习地图</a>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [initial] = useState(readProgressSnapshot);
  const [progress, setProgress] = useState(initial.progress);
  const progressRef = useRef(progress);
  const mayPersist = useRef(!initial.warning);
  const unsavedProgress = useRef(false);
  const unsavedBaseline = useRef<string | null | undefined>(undefined);
  const externalConflict = useRef(false);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const currentPath = route.view === 'document' ? route.path : null;
  const entry = currentPath ? getDocument(currentPath) : undefined;
  const updateProgress = useCallback(
    (updater: (old: LearningProgress) => LearningProgress, userAction = true) => {
      const latest = readProgressSnapshot();
      if (
        unsavedProgress.current &&
        latest.fingerprint !== undefined &&
        latest.fingerprint !== unsavedBaseline.current
      ) {
        externalConflict.current = true;
        mayPersist.current = false;
        setStorageWarning(conflictWarning);
      }
      const next = updater(
        latest.warning || unsavedProgress.current ? progressRef.current : latest.progress,
      );
      progressRef.current = next;
      setProgress(next);
      if (latest.warning && !userAction) mayPersist.current = false;
      if (userAction) mayPersist.current = !externalConflict.current;
      if (mayPersist.current) {
        const saved = writeProgress(storage(), next);
        if (!saved && !unsavedProgress.current) unsavedBaseline.current = latest.fingerprint;
        if (saved) unsavedBaseline.current = undefined;
        unsavedProgress.current = !saved;
        setStorageWarning(saved ? null : '当前浏览器无法保存进度，本次学习仍可继续。');
      }
    },
    [],
  );

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if ((event.key !== PROGRESS_KEY && event.key !== null) || event.storageArea !== storage())
        return;
      const latest = readProgress(storage(), validContent);
      if (latest.warning) {
        mayPersist.current = false;
        setStorageWarning('其他标签页的学习记录暂时无法读取，当前内容已保留。请先备份原记录。');
        return;
      }
      if (unsavedProgress.current) {
        externalConflict.current = true;
        mayPersist.current = false;
        setStorageWarning(conflictWarning);
        return;
      }
      progressRef.current = latest.progress;
      setProgress(latest.progress);
      mayPersist.current = true;
      setStorageWarning(null);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const change = () => {
      setRoute(parseRoute(window.location.hash));
      setMobileOpen(false);
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMobileOpen(false);
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener('hashchange', change);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('hashchange', change);
      window.removeEventListener('keydown', shortcut);
    };
  }, []);
  useEffect(() => {
    document.title = `${entry?.title || '防御技术'} · 学习指南`;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    if (entry && progressRef.current.lastPath !== entry.path)
      updateProgress((old) => ({ ...old, lastPath: entry.path }), false);
  }, [currentPath, route.view, entry, updateProgress]);
  useEffect(() => {
    if (!mobileOpen) {
      mobileDialog.current?.close();
      return;
    }
    mobileDialog.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = old;
    };
  }, [mobileOpen]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1001px)');
    const close = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);

  const percentage = Math.round((progress.completed.length / catalog.lessons.length) * 100);
  const navigation = (
    <>
      <div className="sidebar-heading">
        <span>课程目录</span>
        <span className="muted">{catalog.lessons.length} 篇</span>
        <button
          className="icon-button mobile-only"
          aria-label="关闭课程目录"
          onClick={() => setMobileOpen(false)}
        >
          <Icon name="close" />
        </button>
      </div>
      <nav className="sidebar-quick-navigation" aria-label="移动端主导航">
        {[
          ['#/', '学习地图', 'home'],
          ['#/catalog', '课程目录', 'catalog'],
          ['#/exams', '练习中心', 'exams'],
          ['#/progress', '我的学习', 'progress'],
        ].map(([href, label, view]) => (
          <a key={view} href={href} aria-current={route.view === view ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <nav className="chapter-navigation" aria-label="课程目录">
        {catalog.chapters.map((chapter, index) => (
          <details
            className="chapter-nav"
            key={chapter.id}
            open={chapter.id === entry?.chapterId || (!entry?.chapterId && index === 0)}
          >
            <summary>
              <span
                className={`chapter-number ${chapter.id === entry?.chapterId ? 'selected' : ''}`}
              >
                {chapter.id.slice(0, 2)}
              </span>
              <span>{chapterName(chapter)}</span>
              <Icon name="chevron" size={14} />
            </summary>
            <div className="chapter-links">
              {chapter.lessonIds.map((id) => {
                const lesson = getLesson(id)!;
                const done = progress.completed.includes(id);
                return (
                  <a
                    key={id}
                    href={routeForPath(lesson.path)}
                    aria-current={currentPath === lesson.path ? 'page' : undefined}
                  >
                    <span className={`lesson-dot ${done ? 'complete' : ''}`}>
                      {done && <Icon name="check" size={10} />}
                    </span>
                    <span>{lesson.title.split('：')[0]}</span>
                  </a>
                );
              })}
            </div>
          </details>
        ))}
      </nav>
      <div className="sidebar-tools">
        <a href={routeForPath('glossary/english-chinese.md')}>
          <Icon name="book" size={17} />
          术语速查
        </a>
        <a href={routeForPath('examples/README.md')}>
          <Icon name="layers" size={17} />
          离线实践
        </a>
      </div>
      <a className="sidebar-progress" href="#/progress">
        <span>
          我的学习进度 <strong>{percentage}%</strong>
        </span>
        <progress
          value={progress.completed.length}
          max={catalog.lessons.length}
          aria-label="课程完成进度"
        />
        <small>
          已学 {progress.completed.length} / {catalog.lessons.length} 篇课程
        </small>
      </a>
      <p className="sidebar-footnote">
        每次读懂一个概念，
        <br />
        就是更可靠的一道防线。
      </p>
    </>
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="brand-area">
          <button
            className="icon-button mobile-only"
            aria-label="打开课程目录"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <a className="brand" href="#/" aria-label="防御技术学习指南首页">
            <span className="brand-mark">
              <Icon name="shield" size={24} />
            </span>
            <span>
              <strong>防御技术</strong>
              <small>网络安全学习指南</small>
            </span>
          </a>
        </div>
        <nav className="top-navigation" aria-label="主导航">
          <a href="#/" aria-current={route.view === 'home' ? 'page' : undefined}>
            学习地图
          </a>
          <a href="#/catalog" aria-current={route.view === 'catalog' ? 'page' : undefined}>
            课程目录
          </a>
          <a href="#/exams" aria-current={route.view === 'exams' ? 'page' : undefined}>
            练习中心
          </a>
        </nav>
        <div className="header-actions">
          <button className="search-trigger" aria-label="搜索" onClick={() => setSearchOpen(true)}>
            <Icon name="search" size={17} />
            <span>搜索知识点、课程…</span>
            <kbd>{/Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</kbd>
          </button>
          <a
            className="my-learning"
            href="#/progress"
            aria-label="我的学习"
            aria-current={route.view === 'progress' ? 'page' : undefined}
          >
            <Icon name="activity" size={18} />
            <span>我的学习</span>
          </a>
        </div>
      </header>
      <aside className="desktop-sidebar">{navigation}</aside>
      <dialog
        ref={mobileDialog}
        className="mobile-sidebar-dialog"
        aria-label="课程目录抽屉"
        onCancel={() => setMobileOpen(false)}
        onClose={(event) => {
          if (!event.currentTarget.open) setMobileOpen(false);
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX > rect.right || event.clientX < rect.left) setMobileOpen(false);
        }}
      >
        {navigation}
      </dialog>
      <main
        id="main-content"
        className={`workspace ${route.view === 'document' ? 'reading-workspace' : ''}`}
        ref={main}
        tabIndex={-1}
      >
        {storageWarning && (
          <div className="storage-notice" role="status">
            <Icon name="info" size={17} />
            <span>{storageWarning}</span>
          </div>
        )}
        <PageBoundary key={currentPath || route.view}>
          {route.view === 'home' && <Home progress={progress} />}
          {route.view === 'catalog' && <CatalogPage progress={progress} />}
          {route.view === 'exams' && <ExamsPage progress={progress} />}
          {route.view === 'progress' && (
            <ProgressPage
              progress={progress}
              onReset={() => {
                if (
                  window.confirm('清除当前浏览器中的完成标记、收藏和全部作答记录？此操作不能撤回。')
                ) {
                  externalConflict.current = false;
                  unsavedProgress.current = false;
                  unsavedBaseline.current = undefined;
                  updateProgress(() => emptyProgress());
                }
              }}
            />
          )}
          {route.view === 'document' && entry && (
            <ReaderPage
              key={entry.path}
              document={entry}
              progress={progress}
              section={route.section}
              onToggleComplete={(id) =>
                updateProgress((old) => ({ ...old, completed: toggle(old.completed, id) }))
              }
              onToggleBookmark={(path) =>
                updateProgress((old) => ({ ...old, bookmarks: toggle(old.bookmarks, path) }))
              }
              onAttemptChange={(id, updateAttempt) =>
                updateProgress((old) => ({
                  ...old,
                  attempts: { ...old.attempts, [id]: updateAttempt(old.attempts[id]) },
                }))
              }
            />
          )}
          {(route.view === 'not-found' || (route.view === 'document' && !entry)) && (
            <div className="empty-state">
              <Icon name="search" size={34} />
              <h1>没有找到这篇内容</h1>
              <p>链接可能不完整。可以从目录重新选择，或搜索你想了解的概念。</p>
              <a className="button primary" href="#/catalog">
                浏览课程目录
              </a>
              <button className="button quiet" onClick={() => setSearchOpen(true)}>
                搜索内容
              </button>
            </div>
          )}
        </PageBoundary>
        <footer className="workspace-footer">
          <span>理解威胁 · 验证控制 · 持续改进</span>
          <span>仅用于教育学习与合法防御</span>
        </footer>
      </main>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
