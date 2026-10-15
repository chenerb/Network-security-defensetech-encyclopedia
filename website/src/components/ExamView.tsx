import { useId, useMemo, useRef } from 'react';
import type { ChoiceKey, ExamAttempt, ExamAttemptUpdate, ExamPaper } from '../types';
import { routeForPath } from '../lib/paths';
import { Markdown } from './Markdown';
import './exam-interactions.css';

export interface ExamViewProps {
  paper: ExamPaper;
  attempt?: ExamAttempt;
  showAnswers?: boolean;
  onAttemptChange: (updateAttempt: ExamAttemptUpdate) => void;
}

const emptyAttempt = (): ExamAttempt => ({
  choices: {},
  notes: {},
  revealed: [],
  submitted: false,
  updatedAt: new Date().toISOString(),
});

export function ExamView({ paper, attempt, showAnswers = false, onAttemptChange }: ExamViewProps) {
  const current = attempt ?? emptyAttempt();
  const inputId = useId();
  const articleRef = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const score = useMemo(() => {
    let earned = 0;
    let maximum = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let open = 0;
    let noted = 0;
    for (const q of paper.questions) {
      if (q.type !== 'choice') {
        open += 1;
        if (current.notes[q.number]?.trim()) noted += 1;
        continue;
      }
      maximum += q.points;
      const selected = Object.hasOwn(current.choices, q.number)
        ? current.choices[q.number]
        : undefined;
      if (!selected || !q.options.some((option) => option.key === selected)) unanswered += 1;
      else if (q.answer !== null && selected === q.answer) {
        correct += 1;
        earned += q.points;
      } else wrong += 1;
    }
    return {
      earned,
      maximum,
      correct,
      wrong,
      unanswered,
      open,
      noted,
      answered: correct + wrong,
      choiceCount: correct + wrong + unanswered,
    };
  }, [paper, current.choices, current.notes]);
  const hasWork =
    current.submitted ||
    current.revealed.length > 0 ||
    Object.keys(current.choices).length > 0 ||
    Object.keys(current.notes).length > 0;

  const selectedChoice = (number: number) =>
    Object.hasOwn(current.choices, number) ? current.choices[number] : undefined;
  const isChoiceAnswered = (question: ExamPaper['questions'][number]) =>
    question.type === 'choice' &&
    question.options.some((option) => option.key === selectedChoice(question.number));
  const firstUnanswered = paper.questions.find(
    (question) => question.type === 'choice' && !isChoiceAnswered(question),
  );
  const firstWrong = current.submitted
    ? paper.questions.find(
        (question) =>
          isChoiceAnswered(question) && selectedChoice(question.number) !== question.answer,
      )
    : undefined;

  function questionState(question: ExamPaper['questions'][number]) {
    if (question.type === 'open')
      return current.notes[question.number]?.trim()
        ? { key: 'noted', label: '有笔记' }
        : { key: 'empty-note', label: '未记笔记' };
    if (!isChoiceAnswered(question)) return { key: 'unanswered', label: '未作答' };
    if (!current.submitted) return { key: 'answered', label: '已作答' };
    return selectedChoice(question.number) === question.answer
      ? { key: 'correct', label: '正确' }
      : { key: 'review', label: '需复习' };
  }

  function focusQuestion(number: number) {
    const target = articleRef.current?.querySelector<HTMLElement>(`#question-${number}`);
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }

  function jumpToQuestion(number: number) {
    const hash = routeForPath(
      showAnswers ? paper.answerPath : paper.questionPath,
      `question-${number}`,
    );
    if (window.location.hash !== hash) window.location.hash = hash;
    focusQuestion(number);
  }

  function checkAnswers() {
    update(() => ({ submitted: true }));
    window.requestAnimationFrame(() => {
      scoreRef.current?.scrollIntoView({ block: 'center' });
      scoreRef.current?.focus({ preventScroll: true });
    });
  }

  function update(makePatch: (latest: ExamAttempt) => Partial<ExamAttempt>) {
    onAttemptChange((stored) => {
      const latest = stored ?? emptyAttempt();
      return { ...latest, ...makePatch(latest), updatedAt: new Date().toISOString() };
    });
  }
  function select(number: number, key: ChoiceKey) {
    update((latest) => (latest.submitted ? {} : { choices: { ...latest.choices, [number]: key } }));
  }
  function reset(keepNotes: boolean) {
    if (!keepNotes && !window.confirm('清空本卷的所有作答和学习笔记？此操作不能撤回。')) return;
    onAttemptChange((latest) => ({
      ...emptyAttempt(),
      notes: keepNotes ? { ...latest?.notes } : {},
    }));
    if (keepNotes && paper.questions[0])
      window.requestAnimationFrame(() => focusQuestion(paper.questions[0].number));
  }

  return (
    <article className="exam-view" aria-label={paper.title} ref={articleRef}>
      <header className="exam-header">
        <p className="reader-kicker">自测与复盘</p>
        <h1>{paper.title.replace(/\s*[·（(]\s*题目[）)]?$/, '')}</h1>
        <p className="exam-description">
          共 {paper.questions.length} 题。先独立作答，再对照解析找出需要回读的概念。
        </p>
        <nav className="exam-tabs" aria-label="练习视图">
          <a
            href={routeForPath(paper.questionPath)}
            aria-current={!showAnswers ? 'page' : undefined}
          >
            题目
          </a>
          <a href={routeForPath(paper.answerPath)} aria-current={showAnswers ? 'page' : undefined}>
            答案解析
          </a>
        </nav>
        {showAnswers && (
          <p className="exam-answer-notice">当前为答案解析。客观题得分仍以你的实际作答为准。</p>
        )}
        <p className="exam-self-assess">开放题按解析中的评分要点自评，不计入自动得分。</p>
        <p className="exam-storage-note">
          作答和学习笔记保存在当前浏览器。查看解析后的得分仅用于复习。
        </p>
      </header>

      <section className="exam-progress-panel" aria-label="本卷作答概览">
        <div
          className="exam-progress-counts"
          role="status"
          aria-label="作答进度"
          aria-live="polite"
          aria-atomic="true"
        >
          {score.choiceCount > 0 && (
            <div>
              <p>
                选择题已答{' '}
                <strong>
                  {score.answered} / {score.choiceCount}
                </strong>
                <span>未答 {score.unanswered}</span>
              </p>
              <progress
                aria-label="选择题作答进度"
                value={score.answered}
                max={score.choiceCount}
              />
            </div>
          )}
          {score.open > 0 && (
            <div>
              <p>
                开放题有笔记{' '}
                <strong>
                  {score.noted} / {score.open}
                </strong>
              </p>
              <progress aria-label="开放题笔记记录进度" value={score.noted} max={score.open} />
            </div>
          )}
        </div>
        <div className="exam-progress-actions">
          <p>
            {current.submitted
              ? '题号已标出核对结果，开放题仍需按评分要点自评。'
              : '核对前仅显示作答状态；有笔记不代表答案正确。'}
          </p>
          {!current.submitted && firstUnanswered && (
            <button
              className="reader-text-button"
              type="button"
              onClick={() => jumpToQuestion(firstUnanswered.number)}
            >
              跳到首个未答选择题
            </button>
          )}
        </div>
      </section>

      <nav className="exam-jump" aria-label="题目导航">
        {paper.questions.map((q) => {
          const state = questionState(q);
          return (
            <a
              key={q.number}
              href={routeForPath(
                showAnswers ? paper.answerPath : paper.questionPath,
                `question-${q.number}`,
              )}
              aria-label={`跳到第 ${q.number} 题，${state.label}`}
              data-state={state.key}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                jumpToQuestion(q.number);
              }}
            >
              <span>{q.number}</span>
              <small>{state.label}</small>
            </a>
          );
        })}
      </nav>

      <div className="exam-questions">
        {paper.questions.map((q) => {
          const revealed = showAnswers || current.revealed.includes(q.number);
          const selected = Object.hasOwn(current.choices, q.number)
            ? current.choices[q.number]
            : undefined;
          const isAnswered =
            selected !== undefined && q.options.some((option) => option.key === selected);
          const isCorrect = q.type === 'choice' && isAnswered && selected === q.answer;
          const outcome = !isAnswered ? '未作答' : isCorrect ? '回答正确' : '还需复习';
          return (
            <fieldset
              className="exam-question"
              id={`question-${q.number}`}
              key={q.number}
              tabIndex={-1}
            >
              <legend>
                <span className="question-number">第 {q.number} 题</span>
                <span className="question-title">{q.title}</span>
              </legend>
              <div className="question-meta">
                <span>{q.type === 'choice' ? '单项选择' : '开放题，自评'}</span>
                <span>{q.points} 分</span>
              </div>
              {q.prompt.trim() !== q.title.trim() && (
                <Markdown source={q.prompt} sourcePath={paper.questionPath} />
              )}
              {q.type === 'choice' ? (
                <div className="question-options">
                  {q.options.map((option) => (
                    <label
                      className={`question-option${selected === option.key ? ' is-selected' : ''}`}
                      key={option.key}
                    >
                      <input
                        type="radio"
                        name={`${inputId}-question-${q.number}`}
                        value={option.key}
                        checked={selected === option.key}
                        disabled={current.submitted}
                        onChange={() => select(q.number, option.key)}
                      />
                      <span className="option-key">{option.key}.</span>
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="question-notes">
                  <label htmlFor={`${inputId}-note-${q.number}`}>第 {q.number} 题学习笔记</label>
                  <textarea
                    id={`${inputId}-note-${q.number}`}
                    value={current.notes[q.number] ?? ''}
                    maxLength={20_000}
                    rows={5}
                    placeholder="写下你的判断、依据和防御步骤，再查看评分要点。"
                    onChange={(event) => {
                      const value = event.target.value;
                      update((latest) => ({ notes: { ...latest.notes, [q.number]: value } }));
                    }}
                  />
                </div>
              )}
              {current.submitted && q.type === 'choice' && (
                <p className={`question-outcome${isCorrect ? ' is-correct' : ''}`}>
                  {outcome}，本题 {isCorrect ? q.points : 0} / {q.points} 分
                  {q.answer ? `。正确选项：${q.answer}` : ''}。
                </p>
              )}
              <div className="question-actions">
                {!showAnswers && (
                  <button
                    className="reader-text-button"
                    type="button"
                    aria-expanded={revealed}
                    aria-controls={`${inputId}-explanation-${q.number}`}
                    onClick={() =>
                      update((latest) => ({
                        revealed: latest.revealed.includes(q.number)
                          ? latest.revealed.filter((n) => n !== q.number)
                          : [...latest.revealed, q.number],
                      }))
                    }
                  >
                    {revealed ? '收起解析' : '查看解析'}
                  </button>
                )}
                {q.type !== 'choice' && <span>按下方评分要点自行评阅</span>}
              </div>
              {revealed && (
                <section
                  className="question-explanation"
                  id={`${inputId}-explanation-${q.number}`}
                  role="region"
                  aria-label={`第 ${q.number} 题解析`}
                >
                  <div className="explanation-heading">解析与评分要点</div>
                  <Markdown source={q.explanation} sourcePath={paper.answerPath} />
                </section>
              )}
            </fieldset>
          );
        })}
      </div>

      <section className="exam-finish" aria-label="核对与重做">
        {current.submitted && (
          <div
            className="exam-score"
            role="status"
            aria-label="客观题成绩"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={-1}
            ref={scoreRef}
          >
            {score.maximum > 0 ? (
              <>
                <strong>
                  {score.earned} / {score.maximum} 分
                </strong>
                <p>
                  仅计算选择题：正确 {score.correct}，错误 {score.wrong}，未答 {score.unanswered}。
                </p>
              </>
            ) : (
              <>
                <strong>本卷采用自评</strong>
                <p>没有可自动评分的选择题，请对照各题解析和评分要点复盘。</p>
              </>
            )}
            {score.open > 0 && <p>另有 {score.open} 道开放题，需要自行评阅。</p>}
          </div>
        )}
        {current.submitted && (firstWrong || firstUnanswered) && (
          <nav className="exam-review-actions" aria-label="定向复盘">
            {firstWrong && (
              <button
                className="reader-text-button"
                type="button"
                onClick={() => jumpToQuestion(firstWrong.number)}
              >
                跳到首道错题
              </button>
            )}
            {firstUnanswered && (
              <button
                className="reader-text-button"
                type="button"
                onClick={() => jumpToQuestion(firstUnanswered.number)}
              >
                跳到首个未答选择题
              </button>
            )}
          </nav>
        )}
        <button className="reader-primary-button" type="button" onClick={checkAnswers}>
          核对答案
        </button>
        {hasWork && (
          <div className="exam-reset">
            <button className="reader-text-button" type="button" onClick={() => reset(true)}>
              重新作答，保留笔记
            </button>
            <button
              className="reader-text-button is-muted"
              type="button"
              onClick={() => reset(false)}
            >
              清空作答和笔记
            </button>
          </div>
        )}
      </section>
    </article>
  );
}
