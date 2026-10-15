import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { DocumentEntry, ExamAttemptUpdate, ExamPaper, LearningProgress } from '../types';
import { catalog, getExam, getLesson, loadMarkdown, loadPaper } from '../lib/data';
import { parseRoute, routeForPath } from '../lib/paths';
import type { MarkdownHeading } from '../lib/markdown';
import { Markdown } from './Markdown';
import { ExamView } from './ExamView';
import './reader.css';
import './reading-interactions.css';

export interface ReaderPageProps {
  document: DocumentEntry;
  progress: LearningProgress;
  section?: string;
  onToggleComplete: (lessonId: string) => void;
  onToggleBookmark: (path: string) => void;
  onAttemptChange: (examId: string, updateAttempt: ExamAttemptUpdate) => void;
}

type Loaded =
  | { path: string; status: 'loading' | 'error' }
  | { path: string; status: 'markdown'; source: string }
  | { path: string; status: 'paper'; paper: ExamPaper };

const kinds = {
  section: '节末小测',
  chapter: '章节测验',
  challenge: '挑战卷',
  interview: '压力面',
};

export function ReaderPage({
  document: entry,
  progress,
  section,
  onToggleComplete,
  onToggleBookmark,
  onAttemptChange,
}: ReaderPageProps) {
  const [loaded, setLoaded] = useState<Loaded>({ path: entry.path, status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [headings, setHeadings] = useState<MarkdownHeading[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>();
  const reader = useRef<HTMLElement>(null);
  const jumpFrame = useRef<number | undefined>(undefined);
  const lesson = entry.lessonId ? getLesson(entry.lessonId) : undefined;
  const chapter = catalog.chapters.find((ch) => ch.id === entry.chapterId);
  const bookmarked = progress.bookmarks.includes(entry.path);
  const completed = Boolean(lesson && progress.completed.includes(lesson.id));
  const lessonIndex = lesson ? catalog.lessons.findIndex((item) => item.id === lesson.id) : -1;
  const previous = lessonIndex > 0 ? catalog.lessons[lessonIndex - 1] : undefined;
  const next = lessonIndex >= 0 ? catalog.lessons[lessonIndex + 1] : undefined;
  const related =
    entry.kind === 'lesson' && lesson
      ? catalog.exams.filter(
          (exam) =>
            exam.lessonId === lesson.id ||
            (exam.chapterId === lesson.chapterId && exam.kind !== 'section'),
        )
      : [];
  const exam = entry.examId ? getExam(entry.examId) : undefined;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoaded({ path: entry.path, status: 'loading' });
    setHeadings([]);
    setActiveHeading(undefined);
    const request =
      (entry.kind === 'question' || entry.kind === 'answer') && entry.examId
        ? loadPaper(entry.examId, controller.signal).then((paper) => ({
            path: entry.path,
            status: 'paper' as const,
            paper,
          }))
        : loadMarkdown(entry.path, controller.signal).then((source) => ({
            path: entry.path,
            status: 'markdown' as const,
            source,
          }));
    request
      .then((value) => {
        if (active && !controller.signal.aborted) setLoaded(value);
      })
      .catch(() => {
        if (active && !controller.signal.aborted) setLoaded({ path: entry.path, status: 'error' });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [entry.path, entry.kind, entry.examId, retry]);

  useEffect(() => {
    if (loaded.path !== entry.path || loaded.status !== 'markdown' || headings.length === 0) return;
    const article = reader.current?.querySelector('article');
    if (!article) return;
    const sections = headings.filter((heading) => heading.level > 1);
    const candidates = sections.length > 0 ? sections : headings;
    const elements = candidates
      .map((heading) => globalThis.document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element && article.contains(element)));
    let frame: number | undefined;
    const update = () => {
      frame = undefined;
      let current = elements[0];
      for (const element of elements) {
        const inset = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0;
        if (element.getBoundingClientRect().top > inset + 16) break;
        current = element;
      }
      setActiveHeading(current?.id);
    };
    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(article);
    schedule();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resize.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [entry.path, loaded, headings]);

  useEffect(() => {
    if (loaded.path !== entry.path || (loaded.status !== 'markdown' && loaded.status !== 'paper'))
      return;
    const cancelJump = () => {
      if (jumpFrame.current !== undefined) window.cancelAnimationFrame(jumpFrame.current);
      jumpFrame.current = undefined;
    };
    const position = (id: string) => {
      cancelJump();
      jumpFrame.current = window.requestAnimationFrame(() => {
        jumpFrame.current = undefined;
        const element = globalThis.document.getElementById(id);
        if (element && reader.current?.contains(element)) {
          element.scrollIntoView({ block: 'start' });
          element.focus({ preventScroll: true });
        }
      });
    };
    const followHash = () => {
      cancelJump();
      const route = parseRoute(window.location.hash);
      if (route.view === 'document' && route.path === entry.path) {
        if (route.section) position(route.section);
        else reader.current?.focus({ preventScroll: true });
      }
    };
    // Keep this listener mounted across same-document section changes; App may render during dispatch.
    // Rapid back/forward may return to the same section prop before React renders the interim route.
    window.addEventListener('hashchange', followHash);
    if (section) position(section);
    return () => {
      cancelJump();
      window.removeEventListener('hashchange', followHash);
    };
  }, [entry.path, loaded]);

  const ready = loaded.path === entry.path;
  const toc = headings.filter((heading) => heading.level > 1);
  const contents = toc.length > 0 ? toc : headings;

  function jumpToHeading(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    const disclosure = event.currentTarget.closest('details');
    if (disclosure) disclosure.open = false;
    const hash = routeForPath(entry.path, id);
    if (window.location.hash !== hash) window.location.hash = hash;
    if (jumpFrame.current !== undefined) window.cancelAnimationFrame(jumpFrame.current);
    // A repeated hash does not emit hashchange. Always position after the mobile TOC closes.
    jumpFrame.current = window.requestAnimationFrame(() => {
      jumpFrame.current = undefined;
      const element = globalThis.document.getElementById(id);
      if (element && reader.current?.querySelector('article')?.contains(element)) {
        element.scrollIntoView({ block: 'start' });
        element.focus({ preventScroll: true });
        setActiveHeading(contents.find((heading) => heading.id === id)?.id ?? contents[0]?.id);
      }
    });
  }

  const tocLinks = (
    <nav aria-label="本节目录">
      <ol>
        {contents.map((heading) => (
          <li key={heading.id} className={heading.level > 2 ? 'toc-nested' : ''}>
            <a
              href={routeForPath(entry.path, heading.id)}
              aria-current={activeHeading === heading.id ? 'location' : undefined}
              onClick={(event) => jumpToHeading(event, heading.id)}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <section ref={reader} className="reader-page" aria-label={entry.title} tabIndex={-1}>
      <header className="reader-toolbar">
        <div className="reader-location">
          <a href="#/catalog">课程目录</a>
          {chapter && <span>{chapter.title}</span>}
          {exam && <span>{kinds[exam.kind]}</span>}
        </div>
        <div className="reader-tools">
          <button
            type="button"
            className={`reader-quiet-button${bookmarked ? ' is-active' : ''}`}
            aria-pressed={bookmarked}
            onClick={() => onToggleBookmark(entry.path)}
          >
            {bookmarked ? '已收藏' : '加入收藏'}
          </button>
          {entry.kind === 'lesson' && lesson && (
            <button
              type="button"
              className={`reader-complete-button${completed ? ' is-complete' : ''}`}
              aria-pressed={completed}
              onClick={() => onToggleComplete(lesson.id)}
            >
              {completed ? '已学完' : '标记为已学'}
            </button>
          )}
        </div>
      </header>

      <div className="reader-main">
        {(!ready || loaded.status === 'loading') && (
          <div className="reader-loading" role="status" aria-live="polite">
            <span aria-hidden="true" />
            正在加载学习内容…
          </div>
        )}
        {ready && loaded.status === 'error' && (
          <div className="reader-error" role="alert">
            <h1>内容加载失败</h1>
            <p>未能读取这份学习内容。请重试，或回到课程目录选择其他内容。</p>
            <div>
              <button
                className="reader-primary-button"
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                重试
              </button>
              <a href="#/catalog">返回课程目录</a>
            </div>
          </div>
        )}
        {ready && loaded.status === 'markdown' && (
          <>
            {contents.length > 0 && (
              <details className="reader-mobile-toc">
                <summary>
                  本节目录 <span>{contents.length} 项</span>
                </summary>
                {tocLinks}
              </details>
            )}
            <article className="reader-article" aria-label={entry.title}>
              <Markdown source={loaded.source} sourcePath={entry.path} onHeadings={setHeadings} />
            </article>
            {entry.kind === 'lesson' && lesson && (
              <section className="reader-finish" aria-label="本节学习状态">
                <div>
                  <h2>{completed ? '本节已学完' : '读到这里，记录这一步'}</h2>
                  <p>
                    {completed
                      ? '可以继续下一节，也可以回到练习检查理解。'
                      : '完成标记可随时撤销，方便下次继续学习。'}
                  </p>
                </div>
                <button
                  type="button"
                  className={`reader-complete-button${completed ? ' is-complete' : ''}`}
                  aria-pressed={completed}
                  onClick={() => onToggleComplete(lesson.id)}
                >
                  {completed ? '取消已学' : '完成本节'}
                </button>
              </section>
            )}
            {related.length > 0 && (
              <section className="reader-practice" aria-labelledby="paired-practice-title">
                <div className="reader-section-title">
                  <h2 id="paired-practice-title">配套练习</h2>
                  <p>用问题检查理解，再带着错题回读。</p>
                </div>
                <div className="reader-practice-grid">
                  {related.map((paper) => (
                    <a key={paper.id} href={routeForPath(paper.questionPath)}>
                      <strong>{kinds[paper.kind]}</strong>
                      <span>{paper.questionCount} 题</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
            {entry.kind === 'lesson' && lesson && (
              <nav className="reader-pagination" aria-label="前后篇">
                {previous ? (
                  <a href={routeForPath(previous.path)}>
                    <span>上一篇</span>
                    <strong>{previous.title}</strong>
                  </a>
                ) : (
                  <a href="#/catalog">
                    <span>回到起点</span>
                    <strong>浏览学习地图与课程</strong>
                  </a>
                )}
                {next ? (
                  <a href={routeForPath(next.path)}>
                    <span>下一篇</span>
                    <strong>{next.title}</strong>
                  </a>
                ) : (
                  <a href="#/progress">
                    <span>读完这一程</span>
                    <strong>回顾已学与收藏</strong>
                  </a>
                )}
              </nav>
            )}
          </>
        )}
        {ready && loaded.status === 'paper' && (
          <ExamView
            key={loaded.paper.id}
            paper={loaded.paper}
            attempt={progress.attempts[loaded.paper.id]}
            showAnswers={entry.kind === 'answer'}
            onAttemptChange={(updateAttempt) => onAttemptChange(loaded.paper.id, updateAttempt)}
          />
        )}
      </div>

      {ready && loaded.status === 'markdown' && contents.length > 0 && (
        <aside className="reader-toc">
          <div className="reader-toc-inner">
            <p>本节目录</p>
            {tocLinks}
            <a
              className="reader-top-link"
              href={routeForPath(entry.path, headings[0]?.id)}
              onClick={(event) => headings[0] && jumpToHeading(event, headings[0].id)}
            >
              回到开篇
            </a>
          </div>
        </aside>
      )}
    </section>
  );
}

export default ReaderPage;
