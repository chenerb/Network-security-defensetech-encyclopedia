import { useState } from 'react';
import { catalog, getDocument, getLesson } from '../lib/data';
import { routeForPath } from '../lib/paths';
import type { Chapter, Exam, LearningProgress } from '../types';
import { Icon } from './Icon';

export const chapterName = (c: Chapter) =>
  c.title.replace(/^第[^章]+章[：:]\s*/, '').replace(/（前沿）/, '');
const firstLesson = () => catalog.lessons[0];
const examNames = {
  section: '节末小测',
  chapter: '章节综合',
  challenge: '挑战练习',
  interview: '岗位压力面',
};
const descriptions = [
  '从资产、威胁和 CIA 出发，建立系统性的防御视角。',
  '分清加密、认证与签名，找到数字信任的根基。',
  '确认谁在访问，也判断他可以做什么。',
  '理解通信保护、隔离、检测和流量治理。',
  '从操作系统到执行环境，减少单点失守的影响。',
  '让身份、输入和数据在正确的边界内流动。',
  '沿数据生命周期保护隐私，说明每项保证的前提。',
  '把发现、响应、证据和恢复连成可验证的流程。',
  '将模型能力与工具权限分开，评估真实的业务风险。',
  '带着具体问题，找到可信、适合自己的学习资源。',
];
function Breadcrumb({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="page-breadcrumb">
      <Icon name={icon} size={16} />
      {children}
    </div>
  );
}

export function Home({ progress }: { progress: LearningProgress }) {
  const resume = progress.lastPath ? getDocument(progress.lastPath) : undefined;
  const next = catalog.lessons.find((x) => !progress.completed.includes(x.id)) || firstLesson();
  const destination = resume?.path || next.path;
  const [persona, setPersona] = useState('beginner');
  const recommendations: Record<string, { title: string; text: string; indices: number[] }> = {
    beginner: {
      title: '先看见风险，再理解技术',
      text: '从导论建立直觉，顺着密码学与身份认证，找到每道防线的理由。',
      indices: [0, 1, 2],
    },
    developer: {
      title: '从你每天写的代码开始',
      text: '围绕输入、权限和数据，让防御原则落到接口与工程流程。',
      indices: [5, 2, 6],
    },
    ai: {
      title: '把模型能力与系统权限分开',
      text: '补齐风险与身份基础，再理解提示注入、工具边界和评估。',
      indices: [0, 2, 8],
    },
  };
  const recommendation = recommendations[persona];
  return (
    <div className="overview-page">
      <Breadcrumb icon="layers">
        学习工作台 <span>/</span> 学习地图
      </Breadcrumb>
      <section className="welcome-section">
        <div className="welcome-copy">
          <span className="content-edition">系统学习 · 防御优先</span>
          <h1>
            从理解风险，
            <br />
            到验证防御。
          </h1>
          <p>
            把密码、身份、系统与 AI 连成一张知识地图。
            <br className="desktop-break" />
            带着问题阅读，用场景练习检验理解。
          </p>
          <div className="welcome-actions">
            <a className="button primary" href={routeForPath(destination)}>
              {resume ? '继续学习' : '开始第一节'}
              <Icon name="arrow" size={17} />
            </a>
            <a className="text-link" href={routeForPath('LEARNING_GUIDE.md')}>
              如何使用这份指南
              <Icon name="chevron" size={14} />
            </a>
          </div>
        </div>
        <div className="learning-brief">
          <div className="brief-icon">
            <Icon name="book" size={24} />
          </div>
          <span>你的下一步</span>
          <h2>{resume?.title || next.title}</h2>
          <p>
            {resume
              ? '回到上次阅读的位置，把想法讲清楚。'
              : '先了解安全目标与威胁，再选择合适的控制。'}
          </p>
          <a href={routeForPath(destination)}>
            {resume ? '接着读' : '打开课程'}
            <Icon name="arrow" size={16} />
          </a>
          <div className="brief-bottom">
            <span>{catalog.chapters.length} 个章节</span>
            <span>{catalog.lessons.length} 篇课程</span>
            <span>{catalog.exams.length} 套练习</span>
          </div>
        </div>
      </section>
      <section className="defense-path" aria-labelledby="path-heading">
        <div className="section-heading">
          <div>
            <h2 id="path-heading">沿着防御的逻辑学习</h2>
            <p>先建立信任，再保护边界，把防御落实到运营与新场景。</p>
          </div>
          <a className="text-link" href="#/catalog">
            全部课程
            <Icon name="chevron" size={14} />
          </a>
        </div>
        <div className="path-stages">
          {[
            {
              title: '建立信任',
              icon: 'key',
              range: '第 1—3 章',
              description: '安全目标 · 密码 · 身份',
              index: 0,
            },
            {
              title: '保护边界',
              icon: 'network',
              range: '第 4—7 章',
              description: '网络 · 系统 · 应用 · 数据',
              index: 3,
            },
            {
              title: '持续防御',
              icon: 'activity',
              range: '第 8 章',
              description: '检测 · 响应 · 恢复',
              index: 7,
            },
            {
              title: '面向新场景',
              icon: 'spark',
              range: '第 9—10 章',
              description: 'AI 与 Agent · 学习资源',
              index: 8,
            },
          ].map((stage, index) => (
            <a
              key={stage.title}
              className={`path-stage stage-${index}`}
              href={routeForPath(getLesson(catalog.chapters[stage.index].lessonIds[0])!.path)}
            >
              <span className="path-node">
                <Icon name={stage.icon} size={23} />
              </span>
              <small>{stage.range}</small>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
              <Icon name="chevron" size={16} />
            </a>
          ))}
        </div>
      </section>
      <div className="home-lower-grid">
        <section className="recommended-courses">
          <div className="section-heading">
            <div>
              <h2>从基础筑起防线</h2>
              <p>每一章都连接原理、故事、实践与练习。</p>
            </div>
            <a className="text-link" href="#/catalog">
              查看全部
              <Icon name="chevron" size={14} />
            </a>
          </div>
          <div className="chapter-preview-list">
            {catalog.chapters.slice(0, 4).map((chapter, index) => (
              <a
                className="chapter-preview"
                key={chapter.id}
                href={routeForPath(getLesson(chapter.lessonIds[0])!.path)}
              >
                <span className="preview-number">{chapter.id.slice(0, 2)}</span>
                <div>
                  <h3>{chapterName(chapter)}</h3>
                  <p>{descriptions[index]}</p>
                  <small>
                    {chapter.lessonIds.length} 篇课程 <span>·</span> {chapter.examIds.length} 套练习
                  </small>
                </div>
                <Icon name="arrow" size={18} />
              </a>
            ))}
          </div>
        </section>
        <aside className="route-recommendation">
          <div className="recommendation-title">
            <Icon name="target" size={20} />
            <h2>找到适合你的起点</h2>
          </div>
          <div className="persona-tabs" role="group" aria-label="选择学习起点">
            {[
              ['beginner', '从零开始'],
              ['developer', '开发工程师'],
              ['ai', 'AI 从业者'],
            ].map(([id, text]) => (
              <button key={id} aria-pressed={persona === id} onClick={() => setPersona(id)}>
                {text}
              </button>
            ))}
          </div>
          <h3>{recommendation.title}</h3>
          <p>{recommendation.text}</p>
          <ol className="route-steps">
            {recommendation.indices.map((index, order) => {
              const chapter = catalog.chapters[index];
              return (
                <li key={chapter.id}>
                  <span>{order + 1}</span>
                  <a href={routeForPath(getLesson(chapter.lessonIds[0])!.path)}>
                    {chapterName(chapter)}
                    <Icon name="chevron" size={13} />
                  </a>
                </li>
              );
            })}
          </ol>
          <a className="recommendation-guide" href={routeForPath('LEARNING_GUIDE.md')}>
            阅读完整学习路线
            <Icon name="arrow" size={15} />
          </a>
          <div className="feynman-note">
            <Icon name="pen" size={20} />
            <div>
              <strong>学会之后，试着讲出来</strong>
              <p>合上文章，用三句话解释一个概念，再说出它的适用条件。</p>
            </div>
          </div>
        </aside>
      </div>
      <section className="practice-banner">
        <span className="practice-symbol">
          <Icon name="pen" size={28} />
        </span>
        <div>
          <h2>读懂只是起点，练习让理解更扎实。</h2>
          <p>从节末小测到岗位压力面，检验概念、边界与防御判断。</p>
        </div>
        <a className="button secondary" href="#/exams">
          进入练习中心
          <Icon name="arrow" size={16} />
        </a>
      </section>
    </div>
  );
}

export function CatalogPage({ progress }: { progress: LearningProgress }) {
  return (
    <div className="listing-page">
      <Breadcrumb icon="book">
        系统学习 <span>/</span> 课程目录
      </Breadcrumb>
      <div className="page-heading">
        <h1>一张完整的防御知识地图</h1>
        <p>十个章节，由原理走向实践。按顺序学习，也可以从你遇到的问题进入。</p>
      </div>
      <div className="catalog-grid">
        {catalog.chapters.map((chapter, index) => {
          const completed = chapter.lessonIds.filter((id) =>
            progress.completed.includes(id),
          ).length;
          return (
            <section className="catalog-chapter" key={chapter.id}>
              <header>
                <span className="catalog-number">{chapter.id.slice(0, 2)}</span>
                <div>
                  <h2>{chapterName(chapter)}</h2>
                  <p>{descriptions[index]}</p>
                </div>
              </header>
              <div className="catalog-chapter-status">
                <span>{chapter.lessonIds.length} 篇课程</span>
                <span>
                  {completed} / {chapter.lessonIds.length} 已学
                </span>
              </div>
              <ul>
                {chapter.lessonIds.map((id, order) => {
                  const lesson = getLesson(id)!;
                  const done = progress.completed.includes(id);
                  return (
                    <li key={id}>
                      <a href={routeForPath(lesson.path)}>
                        <span className="lesson-order">{order + 1}</span>
                        <span className="catalog-lesson-title">{lesson.title}</span>
                        <span className="lesson-time">{lesson.minutes} 分钟</span>
                        {done ? <Icon name="check" size={16} /> : <Icon name="chevron" size={14} />}
                      </a>
                    </li>
                  );
                })}
              </ul>
              <a
                className="chapter-exam-link"
                href={routeForPath(
                  catalog.exams.find(
                    (exam) => exam.chapterId === chapter.id && exam.kind === 'chapter',
                  )!.questionPath,
                )}
              >
                <Icon name="pen" size={15} />
                章节综合练习
                <Icon name="chevron" size={13} />
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ExamsPage({ progress }: { progress: LearningProgress }) {
  const [chapter, setChapter] = useState('all');
  const [kind, setKind] = useState('all');
  const exams = catalog.exams.filter(
    (x) => (chapter === 'all' || x.chapterId === chapter) && (kind === 'all' || x.kind === kind),
  );
  return (
    <div className="listing-page">
      <Breadcrumb icon="pen">
        场景与评估 <span>/</span> 练习中心
      </Breadcrumb>
      <div className="page-heading">
        <h1>把理解放进真实的问题里</h1>
        <p>概念小测、综合设计、挑战练习与岗位追问。先独立作答，再核对解析。</p>
      </div>
      <div className="exercise-intro">
        <Icon name="info" size={19} />
        <p>
          选择题可自动核对；开放题请按评分要点自评。分数帮助发现薄弱点，不能替代实际防御能力的验证。
        </p>
      </div>
      <div className="exercise-filters">
        <div className="filter-tabs" role="group" aria-label="按练习类型筛选">
          <button aria-pressed={kind === 'all'} onClick={() => setKind('all')}>
            全部练习
          </button>
          {Object.entries(examNames).map(([key, title]) => (
            <button key={key} aria-pressed={kind === key} onClick={() => setKind(key)}>
              {title}
            </button>
          ))}
        </div>
        <select
          value={chapter}
          onChange={(event) => setChapter(event.target.value)}
          aria-label="按章节筛选"
        >
          <option value="all">全部章节</option>
          {catalog.chapters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id.slice(0, 2)} {chapterName(item)}
            </option>
          ))}
        </select>
      </div>
      <p className="result-count" role="status">
        共 {exams.length} 套练习
      </p>
      <div className="exam-grid">
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} progress={progress} />
        ))}
      </div>
    </div>
  );
}
function ExamCard({ exam, progress }: { exam: Exam; progress: LearningProgress }) {
  const chapter = catalog.chapters.find((x) => x.id === exam.chapterId)!;
  const attempt = progress.attempts[exam.id];
  return (
    <a className="exam-card" href={routeForPath(exam.questionPath)}>
      <div className="exam-card-top">
        <span className={`exam-kind kind-${exam.kind}`}>{examNames[exam.kind]}</span>
        <span className="exam-chapter">第 {Number(chapter.id.slice(0, 2))} 章</span>
      </div>
      <h2>{exam.title.split(/\s*[··]\s*/)[0]}</h2>
      <p>{chapterName(chapter)}</p>
      <div className="exam-card-bottom">
        <span>
          {exam.questionCount} 题 <span>·</span> 100 分
        </span>
        <strong>
          {attempt?.submitted ? '已核对' : attempt ? '继续作答' : '开始练习'}
          <Icon name="arrow" size={15} />
        </strong>
      </div>
    </a>
  );
}

export function ProgressPage({
  progress,
  onReset,
}: {
  progress: LearningProgress;
  onReset: () => void;
}) {
  const [tab, setTab] = useState('bookmarks');
  const completed = catalog.lessons.filter((x) => progress.completed.includes(x.id));
  const bookmarks = progress.bookmarks.map((path) => getDocument(path)).filter((x) => !!x);
  const attempts = catalog.exams.filter((x) => progress.attempts[x.id]);
  const percentage = Math.round((completed.length / catalog.lessons.length) * 100);
  function exportRecord() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'defense-learning-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="listing-page">
      <Breadcrumb icon="activity">
        学习记录 <span>/</span> 我的学习
      </Breadcrumb>
      <div className="page-heading">
        <h1>记录你的防御思维成长</h1>
        <p>完成标记、收藏和作答记录保存在当前浏览器，方便回来接着学。</p>
      </div>
      <div className="progress-overview">
        <div
          className="progress-circle"
          style={{ background: `conic-gradient(var(--blue) ${percentage}%, var(--line) 0)` }}
        >
          <span>
            <strong>{percentage}%</strong>
            <small>课程完成</small>
          </span>
        </div>
        <div className="progress-description">
          <h2>
            {completed.length ? '一步一步，把知识连起来。' : '从一个问题开始，建立自己的知识地图。'}
          </h2>
          <p>
            已学 {completed.length} / {catalog.lessons.length} 篇课程，记录了 {attempts.length}{' '}
            套练习。
          </p>
          <a
            href={routeForPath(progress.lastPath || firstLesson().path)}
            className="button primary"
          >
            {progress.lastPath ? '继续学习' : '开始学习'}
            <Icon name="arrow" size={15} />
          </a>
        </div>
      </div>
      <div className="progress-controls">
        <div className="filter-tabs" role="group" aria-label="学习记录类型">
          {[
            ['bookmarks', '我的收藏', bookmarks.length],
            ['completed', '已学课程', completed.length],
            ['attempts', '练习记录', attempts.length],
          ].map(([id, name, count]) => (
            <button key={id} aria-pressed={tab === id} onClick={() => setTab(String(id))}>
              {name}
              <span className="tab-count">{count}</span>
            </button>
          ))}
        </div>
        <button className="text-button" onClick={exportRecord}>
          <Icon name="download" size={15} />
          导出学习记录
        </button>
      </div>
      {tab === 'bookmarks' && (
        <div className="progress-list">
          {bookmarks.map((x) => (
            <a key={x.path} href={routeForPath(x.path)}>
              <Icon name="bookmark" size={18} />
              <span>{x.title}</span>
              <Icon name="chevron" size={15} />
            </a>
          ))}
          {!bookmarks.length && (
            <EmptyNote
              icon="bookmark"
              title="把想再读的内容留在这里"
              text="阅读时点击“加入收藏”，之后就能在这里快速找到。"
            />
          )}
        </div>
      )}
      {tab === 'completed' && (
        <div className="progress-list">
          {completed.map((x) => (
            <a key={x.id} href={routeForPath(x.path)}>
              <Icon name="check" size={18} />
              <span>{x.title}</span>
              <Icon name="chevron" size={15} />
            </a>
          ))}
          {!completed.length && (
            <EmptyNote
              icon="book"
              title="读懂一篇，再留下完成标记"
              text="课程中的“标记为已学”帮助你记录阅读进度。"
            />
          )}
        </div>
      )}
      {tab === 'attempts' && (
        <div className="exam-grid">
          {attempts.map((exam) => (
            <ExamCard key={exam.id} exam={exam} progress={progress} />
          ))}
          {!attempts.length && (
            <EmptyNote
              icon="pen"
              title="用一次练习，找到学习的下一步"
              text="你的选择和学习笔记会在作答时自动保存。"
            />
          )}
        </div>
      )}
      <div className="local-data-note">
        <Icon name="info" size={17} />
        <p>学习记录仅保存在当前浏览器，不会同步到其他设备。需要保留时可导出备份。</p>
        <button onClick={onReset} className="text-button danger">
          清除本地记录
        </button>
      </div>
    </div>
  );
}
function EmptyNote({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty-note">
      <Icon name={icon} size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
      <a href="#/catalog" className="text-link">
        浏览课程目录
        <Icon name="arrow" size={15} />
      </a>
    </div>
  );
}
