import type { Catalog, Exam, ExamPaper, ExamQuestion, SearchEntry } from '../types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validQuestion(value: unknown, index: number): value is ExamQuestion {
  if (
    !isRecord(value) ||
    value.number !== index + 1 ||
    typeof value.title !== 'string' ||
    typeof value.prompt !== 'string' ||
    typeof value.explanation !== 'string' ||
    !Number.isInteger(value.points) ||
    Number(value.points) <= 0 ||
    !Array.isArray(value.options)
  )
    return false;
  if (value.type === 'open') return value.options.length === 0 && value.answer === null;
  return (
    value.type === 'choice' &&
    typeof value.answer === 'string' &&
    /^[A-D]$/.test(value.answer) &&
    value.options.length === 4 &&
    value.options.every(
      (option, n) =>
        isRecord(option) &&
        option.key === 'ABCD'[n] &&
        typeof option.label === 'string' &&
        !!option.label.trim(),
    )
  );
}

function validPaper(value: unknown, exam: Exam): value is ExamPaper {
  return (
    isRecord(value) &&
    value.id === exam.id &&
    value.kind === exam.kind &&
    typeof value.title === 'string' &&
    value.questionPath === exam.questionPath &&
    value.answerPath === exam.answerPath &&
    Array.isArray(value.questions) &&
    value.questions.length === exam.questionCount &&
    value.questions.every(validQuestion) &&
    value.questions.reduce((sum, q) => sum + q.points, 0) === 100
  );
}

/** Fetching is injected only at the network boundary, so the same client works in Vite and Node tests. */
export function createDataClient(catalog: Catalog, baseUrl: string, fetcher: typeof fetch = fetch) {
  const documents = new Map(catalog.documents.map((entry) => [entry.path, entry]));
  const lessons = new Map(catalog.lessons.map((lesson) => [lesson.id, lesson]));
  const exams = new Map(catalog.exams.map((exam) => [exam.id, exam]));
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const resource = (path: string) =>
    `${base}content/${path.split('/').map(encodeURIComponent).join('/')}`;

  async function request(path: string, label: string, signal?: AbortSignal): Promise<Response> {
    let response: Response;
    try {
      response = await fetcher(resource(path), { signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new Error(
        `无法加载${label}：${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok)
      throw new Error(`无法加载${label}：HTTP ${response.status} ${response.statusText}`.trim());
    return response;
  }

  async function json(path: string, label: string, signal?: AbortSignal): Promise<unknown> {
    const response = await request(path, label, signal);
    try {
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      throw new Error(`${label}的JSON格式无效，请重试或重新构建内容。`);
    }
  }

  return {
    getDocument: (path: string) => documents.get(path),
    getLesson: (id: string) => lessons.get(id),
    getExam: (id: string) => exams.get(id),
    async loadMarkdown(path: string, signal?: AbortSignal): Promise<string> {
      if (!documents.has(path)) throw new Error(`未知文档路径：${path}`);
      const response = await request(path, `文档 ${path}`, signal);
      return response.text();
    },
    async loadPaper(id: string, signal?: AbortSignal): Promise<ExamPaper> {
      const exam = exams.get(id);
      if (!exam) throw new Error(`未知试卷编号：${id}`);
      const value = await json(`papers/${id}.json`, `试卷 ${id}`, signal);
      if (!validPaper(value, exam))
        throw new Error(`试卷 ${id} 格式无效或与课程目录不匹配，请重新构建内容。`);
      return value;
    },
    async loadSearchIndex(signal?: AbortSignal): Promise<SearchEntry[]> {
      const value = await json('search.json', '搜索索引', signal);
      if (
        !Array.isArray(value) ||
        !value.every((entry) => {
          if (
            !isRecord(entry) ||
            typeof entry.path !== 'string' ||
            typeof entry.title !== 'string' ||
            typeof entry.text !== 'string' ||
            entry.kind === 'answer'
          )
            return false;
          const document = documents.get(entry.path);
          return (
            !!document && document.kind === entry.kind && document.chapterId === entry.chapterId
          );
        })
      )
        throw new Error('搜索索引格式无效或包含未知/答案文档，请重新构建内容。');
      return value as SearchEntry[];
    },
  };
}
