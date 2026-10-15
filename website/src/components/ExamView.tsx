import { useId, useMemo } from 'react';
import type { ChoiceKey, ExamAttempt, ExamPaper } from '../types';
import { routeForPath } from '../lib/paths';
import { Markdown } from './Markdown';

export interface ExamViewProps {
  paper: ExamPaper;
  attempt?: ExamAttempt;
  showAnswers?: boolean;
  onAttemptChange: (attempt: ExamAttempt) => void;
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
  const score = useMemo(() => {
    let earned = 0;
    let maximum = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let open = 0;
    for (const q of paper.questions) {
      if (q.type !== 'choice') {
        open += 1;
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
    return { earned, maximum, correct, wrong, unanswered, open };
  }, [paper, current.choices]);
  const hasWork =
    current.submitted ||
    current.revealed.length > 0 ||
    Object.keys(current.choices).length > 0 ||
    Object.keys(current.notes).length > 0;

  function update(patch: Partial<ExamAttempt>) {
    onAttemptChange({ ...current, ...patch, updatedAt: new Date().toISOString() });
  }
  function select(number: number, key: ChoiceKey) {
    update({ choices: { ...current.choices, [number]: key } });
  }
  function reset(keepNotes: boolean) {
    onAttemptChange({ ...emptyAttempt(), notes: keepNotes ? { ...current.notes } : {} });
  }

  return (
    <article className="exam-view" aria-label={paper.title}>
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

      <nav className="exam-jump" aria-label="题目导航">
        {paper.questions.map((q) => (
          <a
            key={q.number}
            href={routeForPath(
              showAnswers ? paper.answerPath : paper.questionPath,
              `question-${q.number}`,
            )}
            aria-label={`跳到第 ${q.number} 题`}
          >
            {q.number}
          </a>
        ))}
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
                    onChange={(event) =>
                      update({ notes: { ...current.notes, [q.number]: event.target.value } })
                    }
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
                      update({
                        revealed: revealed
                          ? current.revealed.filter((n) => n !== q.number)
                          : [...current.revealed, q.number],
                      })
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
          <div className="exam-score" role="status" aria-label="客观题成绩">
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
        <button
          className="reader-primary-button"
          type="button"
          onClick={() => update({ submitted: true })}
        >
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
