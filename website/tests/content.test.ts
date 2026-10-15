import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, parseExamPaper } from '../../scripts/site-content.mjs';
import { createDataClient } from '../src/lib/content-client.ts';
import type { Catalog } from '../src/types.ts';

const questionPath = 'exams/01-demo/01-lesson-题目.md';
const answerPath = 'exams/01-demo/01-lesson-答案解析.md';
const questions = `# 手工试卷

### 1. 明文选项（选择题，10 分）
哪项属于受控权限？
A. 全部开放
B. 指定角色
C. 不记日志
D. 永久共享

### 2. 列表选项（10分）
请选择安全边界。
- A. 前端按钮
- B. 文件名
- C. 服务端授权
- D. 字体

### 3. 加粗选项
**题型**：选择题；**分值**：10 分。
- **A.** 验证来源
- **B.** 忽略来源
- **C.** 公开密钥秘密
- **D.** 仅作编码

### 4. 为什么需要记录拒绝？
**题型**：简答题；**分值**：10 分。

### 5. 允许与拒绝
给出两个合成验证用例。

### 6. 恢复条件
说明恢复条件。

### 7. 保留追问
说明会话撤销。
**继续追问**：已签发令牌怎么办？

### 8. 综合场景
设计资源隔离与验收。

## 学习导航
- [答案解析](01-lesson-答案解析.md)
- [试卷导航](../README.md)
`;
const answers = `# 手工解析
## 考点分布表
| 题号 | 题型 | 考点 | 分值 |
| --- | --- | --- | --- |
| 1 | 选择题 | 权限 | 10 |
| 2 | 选择题 | 边界 | 10 |
| 3 | 选择题 | 来源 | 10 |
| 4 | 简答题 | 拒绝记录 | 10 |
| 5 | 简答题 | 对照 | 10 |
| 6 | 简答题 | 恢复 | 10 |
| 7 | 面试题 | 撤销 | 10 |
| 8 | 场景题 | 隔离 | 30 |
## 逐题解析
### 1. 明文选项（选择题，10 分）
**正确答案：B。**
- A（错误）：扩大权限。
- B（正确）：有限授权。
- C（错误）：失去证据。
- D（错误）：无法独立撤销。
### 2. 列表选项（10分）
**正确答案**：C。
- A（错误）：客户端可改。
- B（错误）：命名不授权。
- C（正确）：服务端检查。
- D（错误）：不涉及权限。
### 3. 加粗选项
**正确答案：A。**
- A（正确）：可信来源是前提。
- B（错误）：缺少来源。
- C（错误）：泄露秘密。
- D（错误）：编码不认证。
### 4. 为什么需要记录拒绝？
**正确答案 / 参考要点：**
便于调查并验证策略。
### 5. 允许与拒绝
合法操作通过，越权被拒。
### 6. 恢复条件
恢复前先验证修复。
### 7. 保留追问
撤销会话并检查令牌期限。
**追问应答**：短期令牌或受控撤销机制。
### 8. 综合场景
仅供核对的机密解析标记ZXQA。
**评分要点**：边界10分；控制10分；验收10分。
## 回顾导航
- [题目](01-lesson-题目.md)
`;
const paperInput = {
  id: '01-demo/01-lesson',
  title: '手工试卷',
  kind: 'section',
  questionPath,
  answerPath,
  questionSource: questions,
  answerSource: answers,
};

test('parses three hand-written choice layouts and preserves open prompts without navigation', () => {
  const paper = parseExamPaper(paperInput);
  assert.deepEqual(
    paper?.questions?.slice(0, 3).map((q) => ({
      answer: q.answer,
      points: q.points,
      keys: q.options.map((o) => o.key),
      prompt: q.prompt,
    })),
    [
      { answer: 'B', points: 10, keys: ['A', 'B', 'C', 'D'], prompt: '哪项属于受控权限？' },
      { answer: 'C', points: 10, keys: ['A', 'B', 'C', 'D'], prompt: '请选择安全边界。' },
      { answer: 'A', points: 10, keys: ['A', 'B', 'C', 'D'], prompt: '加粗选项' },
    ],
  );
  assert.equal(paper.questions[3].prompt, '为什么需要记录拒绝？');
  assert.equal(paper.questions[6].type, 'open');
  assert.equal(paper.questions[6].answer, null);
  assert.match(paper.questions[6].prompt, /继续追问/);
  assert.match(paper.questions[6].explanation, /追问应答/);
  assert.doesNotMatch(paper.questions[7].prompt, /导航|答案解析/);
  assert.doesNotMatch(paper.questions[7].explanation, /导航|\[题目\]/);
  assert.deepEqual(paper.questions[0].options[1], { key: 'B', label: '指定角色' });
});

test('rejects duplicate numbering with source location instead of dropping a question', () => {
  assert.throws(
    () => parseExamPaper({ ...paperInput, questionSource: questions.replace('### 2.', '### 1.') }),
    /exams\/01-demo\/01-lesson-题目\.md:\d+:.*(?:题号|编号)/,
  );
});

test('rejects mismatched answer titles and extra numbered sections', () => {
  assert.throws(
    () =>
      parseExamPaper({
        ...paperInput,
        answerSource: answers.replace('### 2. 列表选项', '### 2. 不匹配标题'),
      }),
    /答案解析\.md:\d+:.*第2题.*标题/,
  );
  assert.throws(
    () =>
      parseExamPaper({
        ...paperInput,
        answerSource: answers.replace('## 回顾导航', '### 9. 额外答案\n未知\n## 回顾导航'),
      }),
    /答案解析\.md:\d+:.*(?:题量|数量)/,
  );
});

test('uses score-table points and rejects missing rows or a non-100 total', () => {
  assert.throws(
    () =>
      parseExamPaper({
        ...paperInput,
        answerSource: answers.replace('| 8 | 场景题 | 隔离 | 30 |', '| 8 | 场景题 | 隔离 | 31 |'),
      }),
    /答案解析\.md:\d+:.*100/,
  );
  assert.throws(
    () =>
      parseExamPaper({
        ...paperInput,
        answerSource: answers.replace('| 8 | 场景题 | 隔离 | 30 |', ''),
      }),
    /答案解析\.md:\d+:.*(?:评分|分值|考点)/,
  );
});

test('reads the named score column rather than assuming it is the final table column', () => {
  const reordered = `## 考点分布表
| 分值 | 题号 | 题型 | 考点 |
| --- | --- | --- | --- |
| 10 | 1 | 选择题 | 权限 |
| 10 | 2 | 选择题 | 边界 |
| 10 | 3 | 选择题 | 来源 |
| 10 | 4 | 简答题 | 拒绝记录 |
| 10 | 5 | 简答题 | 对照 |
| 10 | 6 | 简答题 | 恢复 |
| 10 | 7 | 面试题 | 撤销 |
| 30 | 8 | 场景题 | 隔离 |
`;
  const paper = parseExamPaper({
    ...paperInput,
    answerSource: answers.replace(/## 考点分布表[\s\S]*?(?=## 逐题解析)/, reordered),
  });
  assert.deepEqual(
    paper.questions.map((q) => q.points),
    [10, 10, 10, 10, 10, 10, 10, 30],
  );
});

test('rejects unsupported numeric question headings rather than hiding them in the previous prompt', () => {
  assert.throws(
    () =>
      parseExamPaper({
        ...paperInput,
        questionSource: questions.replace(
          '## 学习导航',
          '### 9) 非标准题号\n不能漏掉。\n## 学习导航',
        ),
      }),
    /题目\.md:\d+:.*(?:题号|主问题|格式)/,
  );
});

test('rejects incomplete choices, conflicting answers and unsupported choice formatting', () => {
  for (const input of [
    { ...paperInput, questionSource: questions.replace('D. 永久共享', '') },
    {
      ...paperInput,
      answerSource: answers.replace('**正确答案：B。**', '**正确答案：B。**\n**正确答案：C。**'),
    },
    { ...paperInput, questionSource: questions.replace('D. 永久共享', 'E. 永久共享') },
    { ...paperInput, questionSource: questions.replace('A. 全部开放', 'A、全部开放') },
  ])
    assert.throws(
      () => parseExamPaper(input),
      /(?:题目|答案解析)\.md:\d+:.*第1题.*(?:选项|答案|格式)/,
    );
});

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const rootDir = await mkdtemp(join(tmpdir(), 'defense-content-'));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  for (const d of ['docs/01-demo', 'exams/01-demo', 'images', 'examples']) {
    await mkdir(join(rootDir, d), { recursive: true });
  }
  const files: Record<string, string> = {
    'SUMMARY.md': '# 目录\n## 第一章：手工章节\n* [入门课程](docs/01-demo/01-lesson.md)\n',
    'README.md': '# 读者首页\n读者参考标记RDSC。\n',
    'docs/01-demo/01-lesson.md': '# 入门课程\n## 概述\n学习有限权限的可验证步骤。\n',
    [questionPath]: questions,
    [answerPath]: answers,
    'images/diagram.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    'examples/demo.py': 'print("offline")\n',
    LICENSE: 'fixture-license\n',
  };
  await Promise.all(Object.entries(files).map(([p, text]) => writeFile(join(rootDir, p), text)));
  return {
    rootDir,
    outputDir: join(rootDir, 'site-output'),
    referencePaths: ['SUMMARY.md', 'README.md'],
    assetPaths: ['images/diagram.svg', 'examples/demo.py', 'LICENSE'],
    requiredExamKinds: [],
    expectedCounts: { chapters: 1, lessons: 1, exams: 1, questions: 8 },
  };
}

test('builds real fixture resources with paired ids and keeps answers out of search', async (t) => {
  const config = await fixture(t);
  const result = await buildSite(config);
  assert.equal(result?.catalog?.lessons?.length, 1);
  const catalog = JSON.parse(
    await readFile(join(config.outputDir, 'src/generated/catalog.json'), 'utf8'),
  );
  assert.equal(catalog.lessons[0].id, '01-demo/01-lesson');
  assert.equal(catalog.exams[0].lessonId, catalog.lessons[0].id);
  assert.equal(catalog.chapters[0].id, '01-demo');
  assert.deepEqual(catalog.documents.map((d: { kind: string }) => d.kind).sort(), [
    'answer',
    'lesson',
    'question',
    'reference',
    'reference',
  ]);
  const search = JSON.parse(
    await readFile(join(config.outputDir, 'public/content/search.json'), 'utf8'),
  );
  assert.equal(search.length, 4);
  assert.ok(search.some((d: { text: string }) => d.text.includes('读者参考标记RDSC')));
  assert.ok(search.every((d: { kind: string }) => d.kind !== 'answer'));
  assert.doesNotMatch(JSON.stringify(search), /机密解析标记ZXQA/);
  assert.equal(
    await readFile(join(config.outputDir, 'public/content', questionPath), 'utf8'),
    questions,
  );
  assert.equal(
    await readFile(join(config.outputDir, 'public/content/examples/demo.py'), 'utf8'),
    'print("offline")\n',
  );
  assert.equal(
    await readFile(join(config.outputDir, 'public/content/LICENSE'), 'utf8'),
    'fixture-license\n',
  );
  const paper = JSON.parse(
    await readFile(join(config.outputDir, 'public/content/papers/01-demo/01-lesson.json'), 'utf8'),
  );
  assert.equal(paper.questions.length, 8);
  assert.equal(paper.questions[7].points, 30);
  assert.match(paper.questions[7].explanation, /机密解析标记ZXQA/);
});

test('fails fixture builds with a missing answer or source outside the repository', async (t) => {
  const config = await fixture(t);
  await rm(join(config.rootDir, answerPath));
  await assert.rejects(buildSite(config), /答案解析\.md:1:.*(?:读取|缺少|不存在)/);
  await writeFile(
    join(config.rootDir, 'SUMMARY.md'),
    '# 目录\n## 第一章：越界\n* [课程](docs/01-demo/../../../../outside.md)\n',
  );
  await assert.rejects(buildSite(config), /SUMMARY\.md:\d+:.*(?:路径|越界)/);
});

const clientCatalog: Catalog = {
  version: 1,
  chapters: [
    {
      id: '01-demo',
      title: '示例',
      summary: '',
      lessonIds: ['01-demo/第一课'],
      examIds: ['01-demo/第一课'],
    },
  ],
  lessons: [
    {
      id: '01-demo/第一课',
      chapterId: '01-demo',
      title: '第一课',
      path: 'docs/01-demo/第一课.md',
      description: '',
      minutes: 3,
    },
  ],
  exams: [
    {
      id: '01-demo/第一课',
      chapterId: '01-demo',
      title: '例题',
      kind: 'section',
      lessonId: '01-demo/第一课',
      questionPath: 'exams/01-demo/第一课-题目.md',
      answerPath: 'exams/01-demo/第一课-答案解析.md',
      questionCount: 1,
    },
  ],
  documents: [
    {
      path: 'docs/01-demo/第一课.md',
      title: '第一课',
      kind: 'lesson',
      chapterId: '01-demo',
      lessonId: '01-demo/第一课',
      examId: null,
    },
  ],
};

test('loads known content under a subdirectory with encoded paths and forwards cancellation', async () => {
  const controller = new AbortController();
  const paper = {
    id: '01-demo/第一课',
    title: '例题',
    kind: 'section',
    questionPath: 'exams/01-demo/第一课-题目.md',
    answerPath: 'exams/01-demo/第一课-答案解析.md',
    questions: [
      {
        number: 1,
        title: '说明',
        prompt: '解释边界',
        options: [],
        answer: null,
        points: 100,
        explanation: '核对身份和对象。',
        type: 'open',
      },
    ],
  };
  const index = [
    {
      path: 'docs/01-demo/第一课.md',
      title: '第一课',
      text: '有限权限',
      kind: 'lesson',
      chapterId: '01-demo',
    },
  ];
  const requests: string[] = [];
  const client = createDataClient(clientCatalog, '/academy/', async (url, init) => {
    assert.equal(init?.signal, controller.signal);
    requests.push(String(url));
    if (String(url).endsWith('.md')) return new Response('# 第一课\n内容');
    if (String(url).endsWith('search.json')) return Response.json(index);
    return Response.json(paper);
  });
  assert.equal(client.getDocument('docs/01-demo/第一课.md')?.title, '第一课');
  assert.equal(client.getLesson('01-demo/第一课')?.minutes, 3);
  assert.equal(client.getExam('01-demo/第一课')?.kind, 'section');
  assert.equal(
    await client.loadMarkdown('docs/01-demo/第一课.md', controller.signal),
    '# 第一课\n内容',
  );
  assert.deepEqual(await client.loadPaper('01-demo/第一课', controller.signal), paper);
  assert.deepEqual(await client.loadSearchIndex(controller.signal), index);
  assert.deepEqual(requests, [
    '/academy/content/docs/01-demo/%E7%AC%AC%E4%B8%80%E8%AF%BE.md',
    '/academy/content/papers/01-demo/%E7%AC%AC%E4%B8%80%E8%AF%BE.json',
    '/academy/content/search.json',
  ]);
});

test('rejects unknown document paths and exam ids before making a request', async () => {
  let requested = 0;
  const client = createDataClient(clientCatalog, './', async () => {
    requested++;
    return new Response('unexpected');
  });
  assert.equal(client.getDocument('../CLAUDE.md'), undefined);
  assert.equal(client.getLesson('__proto__'), undefined);
  assert.equal(client.getExam('missing'), undefined);
  await assert.rejects(client.loadMarkdown('../CLAUDE.md'), /未知.*文档/);
  await assert.rejects(client.loadPaper('01-demo/../../secret'), /未知.*试卷/);
  assert.equal(requested, 0);
});

test('reports HTTP, network and invalid JSON failures while preserving AbortError', async () => {
  const path = 'docs/01-demo/第一课.md';
  const missing = createDataClient(
    clientCatalog,
    './',
    async () => new Response('missing', { status: 404 }),
  );
  await assert.rejects(missing.loadMarkdown(path), /第一课\.md.*404/);
  const offline = createDataClient(clientCatalog, './', async () => {
    throw new Error('offline');
  });
  await assert.rejects(offline.loadMarkdown(path), /第一课\.md.*offline/);
  const invalid = createDataClient(clientCatalog, './', async () => new Response('{broken'));
  await assert.rejects(invalid.loadPaper('01-demo/第一课'), /试卷.*JSON|JSON.*试卷/);
  const wrongId = createDataClient(clientCatalog, './', async () =>
    Response.json({ id: 'other', questions: [] }),
  );
  await assert.rejects(wrongId.loadPaper('01-demo/第一课'), /试卷.*格式|试卷.*匹配/);
  const aborted = new DOMException('cancelled', 'AbortError');
  const cancelled = createDataClient(clientCatalog, './', async () => {
    throw aborted;
  });
  await assert.rejects(cancelled.loadMarkdown(path), (error) => error === aborted);
});
