import { readFile, readdir, realpath, lstat, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

export const REFERENCE_PATHS = [
  'SUMMARY.md',
  'README.md',
  'LEARNING_GUIDE.md',
  'CURRICULUM.md',
  'exams/README.md',
  'examples/README.md',
  'glossary/english-chinese.md',
  'glossary/index.md',
  'CONTRIBUTING.md',
  'DEVELOPMENT_LOG.md',
  'REFERENCE_DESIGN.md',
  'images/README.md',
  'scripts/README.md',
  'website/README.md',
];
export const ASSET_PATHS = [
  'images',
  'examples/agent_policy.py',
  'examples/integrity_hmac.py',
  'examples/parameterized_query.py',
  'LICENSE',
];

function fail(path, line, message, number) {
  throw new Error(`${path}:${line}: ${number ? `第${number}题 ` : ''}${message}`);
}

function linesOf(source) {
  return source.replaceAll('\r\n', '\n').split('\n');
}

// Code examples must not become questions, metadata or navigation headings.
function visibleLines(source) {
  let fence = null;
  return linesOf(source).map((line) => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim())
        fence = null;
      return '';
    }
    if (match) {
      fence = match[1];
      return '';
    }
    return line;
  });
}

function documentTitle(source, path) {
  const title = visibleLines(source).find((line) => /^#\s+\S/.test(line));
  if (!title) fail(path, 1, '缺少文档一级标题');
  return title.replace(/^#\s+/, '').trim();
}

function splitQuestions(source, path) {
  const raw = linesOf(source);
  const visible = visibleLines(source);
  const parts = [];
  let current = null;
  let footer = false;
  const footerHeading =
    /^##\s+(?:学习导航|回顾导航|相关链接|自测建议|试卷导航|参考文献|学习建议|导航)\s*$/;
  for (let index = 0; index < visible.length; index++) {
    const text = visible[index];
    const numbered = text.match(/^###\s+(\d+)[.．、]\s+(.+)$/);
    if (numbered) {
      if (footer) fail(path, index + 1, '导航页尾后出现主问题，格式不支持', Number(numbered[1]));
      const number = Number(numbered[1]);
      if (number !== parts.length + 1)
        fail(path, index + 1, '题号/编号必须从1连续且不能重复', number);
      current = { number, title: numbered[2].trim(), line: index + 1, body: [], bodyLines: [] };
      parts.push(current);
      continue;
    }
    if (/^#{1,6}\s+\d+(?:\D|$)/.test(text))
      fail(path, index + 1, '主问题必须采用 ### 数字. 标题 格式');
    if (!current || footer) continue;
    if (/^##\s+/.test(text)) {
      if (!footerHeading.test(text))
        fail(path, index + 1, '主问题后遇到不支持的二级标题，不能静默截断');
      footer = true;
      continue;
    }
    // The repository also uses this one-line footer without a section heading.
    if (/^\s*-\s*\[(?:试卷导航|返回试卷导航)\]\(/.test(text)) continue;
    current.body.push(raw[index]);
    current.bodyLines.push(index + 1);
  }
  if (!parts.length) fail(path, 1, '未找到 ### 数字. 格式的主问题');
  return parts;
}

function scoreTable(source, path) {
  const lines = visibleLines(source);
  const start = lines.findIndex((line) => /^##\s+考点分布表\s*$/.test(line));
  if (start < 0) fail(path, 1, '缺少权威考点分布表与分值');
  const rows = [];
  let columns = null;
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (/^#{1,6}\s/.test(line)) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!columns) {
      const number = cells.indexOf('题号'),
        type = cells.findIndex((c) => c === '题型' || c === '类型'),
        points = cells.indexOf('分值');
      if (number < 0 || type < 0 || points < 0 || new Set(cells).size !== cells.length)
        fail(path, index + 1, '考点表必须有唯一的题号、题型/类型与分值列');
      columns = { number, type, points, length: cells.length };
      continue;
    }
    if (
      cells.length !== columns.length ||
      !/^\d+$/.test(cells[columns.number]) ||
      !/^\d+$/.test(cells[columns.points])
    )
      fail(path, index + 1, '考点表题号或分值格式不支持');
    const number = Number(cells[columns.number]);
    const points = Number(cells[columns.points]);
    if (number !== rows.length + 1) fail(path, index + 1, '考点表题号/编号不连续或重复', number);
    if (!Number.isSafeInteger(points) || points <= 0 || points > 100)
      fail(path, index + 1, '考点表分值必须是1–100的整数', number);
    const choice = /^选择(?:题)?$/.test(cells[columns.type]);
    if (
      !choice &&
      !/^(?:简答题?|判断题|场景(?:分析)?题?|面试题?|压力面试题)$/.test(cells[columns.type])
    ) {
      fail(path, index + 1, `考点表题型不支持：${cells[columns.type]}`, number);
    }
    rows.push({ number, points, choice, line: index + 1 });
  }
  if (!rows.length) fail(path, start + 1, '考点表没有逐题分值');
  return { rows, line: start + 1 };
}

function cleanQuestionTitle(title) {
  return title
    .replace(
      /\s*[（(](?:(?:选择题|判断题|简答题|场景(?:分析)?题|面试题|压力面试题)[，,、]\s*)?\d+\s*分[）)]\s*$/,
      '',
    )
    .trim();
}

function questionContent(part, path, expectedChoice) {
  const options = [];
  const prompt = [];
  let fenced = false;
  for (let index = 0; index < part.body.length; index++) {
    const text = part.body[index];
    if (/^\s{0,3}(?:`{3,}|~{3,})/.test(text)) fenced = !fenced;
    if (!fenced && /^\s*\*\*(?:题型|分值)\*\*[：:]/.test(text)) continue;
    const option =
      !fenced &&
      (text.match(/^\s*(?:-\s*)?\*\*([A-Z])[.．]\*\*\s*(.+)$/) ||
        text.match(/^\s*(?:-\s*)?([A-Z])[.．]\s*(.+)$/));
    if (option) {
      options.push({ key: option[1], label: option[2].trim() });
    } else {
      if (!fenced && /^\s*(?:-\s*)?(?:\*\*)?[A-Z][.．、:：)）]/.test(text)) {
        fail(path, part.bodyLines[index], '选项格式不支持', part.number);
      }
      prompt.push(text);
    }
  }
  if (expectedChoice && options.map((o) => o.key).join('') !== 'ABCD')
    fail(path, part.line, '选择题选项必须为唯一且按顺序的A–D四项', part.number);
  if (!expectedChoice && options.length)
    fail(path, part.line, '开放题与考点表题型矛盾：发现选择选项', part.number);
  return { options, prompt: prompt.join('\n').trim() || cleanQuestionTitle(part.title) };
}

export function parseExamPaper({
  id,
  title,
  kind,
  questionPath,
  answerPath,
  questionSource,
  answerSource,
}) {
  const questionParts = splitQuestions(questionSource, questionPath);
  const answerParts = splitQuestions(answerSource, answerPath);
  if (questionParts.length !== answerParts.length)
    fail(answerPath, answerParts.at(-1).line, '题目与答案的题量不一致');
  const ranges = { section: [8, 10], chapter: [15, 18], challenge: [8, 10], interview: [10, 12] };
  const range = ranges[kind];
  if (!range) fail(questionPath, 1, `不支持的试卷类型：${kind}`);
  if (questionParts.length < range[0] || questionParts.length > range[1])
    fail(questionPath, 1, `${kind}试卷题量须为${range[0]}–${range[1]}`);
  const { rows, line } = scoreTable(answerSource, answerPath);
  if (rows.length !== questionParts.length)
    fail(answerPath, line, '考点表评分条目数必须与主问题数量一致');
  if (rows.reduce((sum, row) => sum + row.points, 0) !== 100)
    fail(answerPath, line, '考点表总分必须恰为100分');
  const questions = questionParts.map((part, index) => {
    const answerPart = answerParts[index];
    if (part.title !== answerPart.title)
      fail(answerPath, answerPart.line, '题目与解析标题不一致', part.number);
    const { choice, points } = rows[index];
    const { options, prompt } = questionContent(part, questionPath, choice);
    const explanation = answerPart.body.join('\n').trim();
    if (!explanation) fail(answerPath, answerPart.line, '缺少逐题解析', part.number);
    let answer = null;
    if (choice) {
      const keys = [
        ...explanation.matchAll(
          /^\s*\*\*正确答案(?:\*\*)?[：:]\s*(?:\*\*)?([A-D])(?:[。．.]|\*\*|\s*$)/gm,
        ),
      ].map((m) => m[1]);
      if (keys.length !== 1)
        fail(answerPath, answerPart.line, '选择题必须有且仅有一个A–D正确答案', part.number);
      answer = keys[0];
      const explanations = [...explanation.matchAll(/^\s*-\s*(?:\*\*)?([A-Z])（/gm)].map(
        (m) => m[1],
      );
      if (explanations.join('') !== 'ABCD')
        fail(answerPath, answerPart.line, '选择题解析必须包含唯一的A–D各选项说明', part.number);
      const tags = [...explanation.matchAll(/^\s*-\s*(?:\*\*)?([A-D])（正确）/gm)].map((m) => m[1]);
      if (tags.length && (tags.length !== 1 || tags[0] !== answer))
        fail(answerPath, answerPart.line, '选项正确标记与答案冲突', part.number);
    }
    return {
      number: part.number,
      title: cleanQuestionTitle(part.title),
      prompt,
      options,
      answer,
      points,
      explanation,
      type: choice ? 'choice' : 'open',
    };
  });
  return {
    id,
    title: title || documentTitle(questionSource, questionPath),
    kind,
    questionPath,
    answerPath,
    questions,
  };
}

export function plainText(source) {
  return source
    .replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^[ \t]*#{1,6}\s+/gm, '')
    .replace(/^[ \t]*[`~]{3,}.*$/gm, '')
    .replace(/[*_`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function description(source) {
  const overview = source.match(/^##\s+概述\s*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m)?.[1];
  const text = overview || source.replace(/^#\s+.*$/m, '');
  const paragraph = text.split(/\n\s*\n/).find((p) => p.trim() && !/^\s*[>#|]/.test(p)) || text;
  return plainText(paragraph).slice(0, 140);
}

function assertRepoPath(path, source = path, line = 1) {
  if (
    !path ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.startsWith('/') ||
    path.split('/').some((p) => !p || p === '.' || p === '..')
  )
    fail(source, line, `不允许越界或非规范仓库路径：${path}`);
}

async function sourceFile(rootDir, path) {
  assertRepoPath(path);
  const full = resolve(rootDir, path);
  try {
    const actual = await realpath(full);
    const rel = relative(rootDir, actual);
    if (rel.startsWith('..') || rel.startsWith('/')) fail(path, 1, '源路径通过符号链接越界');
    return await readFile(full);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${path}:`)) throw error;
    fail(path, 1, `无法读取源文件：${error instanceof Error ? error.message : String(error)}`);
  }
}

function summaryLessons(source) {
  let heading = null;
  const lessons = [];
  for (const [index, line] of linesOf(source).entries()) {
    if (/^##\s+第.+章[：:]/.test(line)) heading = line.replace(/^##\s+/, '').trim();
    const link = line.match(/^\s*[*-]\s+\[([^\]]+)\]\((docs\/[^)]+)\)\s*$/);
    if (!link) continue;
    assertRepoPath(link[2], 'SUMMARY.md', index + 1);
    if (!heading || !/^docs\/\d{2}-[^/]+\/[^/]+\.md$/.test(link[2]))
      fail('SUMMARY.md', index + 1, '课程路径或章节标题格式不支持');
    const [, chapterId, filename] = link[2].split('/');
    const id = `${chapterId}/${filename.slice(0, -3)}`;
    if (lessons.some((l) => l.id === id)) fail('SUMMARY.md', index + 1, '课程路径重复');
    lessons.push({
      id,
      chapterId,
      title: link[1],
      path: link[2],
      chapterTitle: heading.replace(/^第.+?章[：:]\s*/, ''),
    });
  }
  if (!lessons.length) fail('SUMMARY.md', 1, '目录没有有效课程');
  return lessons;
}

async function collectAssets(rootDir, assetPaths) {
  const files = new Map();
  async function visit(path) {
    assertRepoPath(path);
    let entry;
    try {
      entry = await lstat(join(rootDir, path));
    } catch {
      fail(path, 1, '静态资源不存在或无法读取');
    }
    if (entry.isSymbolicLink()) fail(path, 1, '静态资源不允许符号链接');
    if (entry.isDirectory()) {
      for (const name of (await readdir(join(rootDir, path))).sort()) {
        if (!name.startsWith('.')) await visit(`${path}/${name}`);
      }
    } else if (entry.isFile()) files.set(path, await sourceFile(rootDir, path));
    else fail(path, 1, '不支持的静态资源类型');
  }
  for (const path of assetPaths) await visit(path);
  return files;
}

export async function buildSite({
  rootDir,
  outputDir,
  referencePaths = REFERENCE_PATHS,
  assetPaths = ASSET_PATHS,
  requiredExamKinds = ['chapter', 'challenge', 'interview'],
  expectedCounts = { chapters: 10, lessons: 40, exams: 70, questions: 662 },
} = {}) {
  rootDir = await realpath(resolve(rootDir || process.cwd()));
  outputDir = resolve(outputDir || join(rootDir, 'website'));
  const summary = (await sourceFile(rootDir, 'SUMMARY.md')).toString('utf8');
  const planned = summaryLessons(summary);
  const chapters = [],
    lessons = [],
    exams = [],
    papers = [],
    documents = [];
  const sources = new Map();
  const addDocument = (path, source, kind, chapterId = null, lessonId = null, examId = null) => {
    if (sources.has(path)) fail(path, 1, '文档路径重复');
    sources.set(path, source);
    documents.push({ path, title: documentTitle(source, path), kind, chapterId, lessonId, examId });
  };
  for (const plannedLesson of planned) {
    const { chapterTitle, ...lesson } = plannedLesson;
    const source = (await sourceFile(rootDir, lesson.path)).toString('utf8');
    let chapter = chapters.find((c) => c.id === lesson.chapterId);
    if (!chapter) {
      chapter = {
        id: lesson.chapterId,
        title: chapterTitle,
        summary: description(source),
        lessonIds: [],
        examIds: [],
      };
      chapters.push(chapter);
    } else if (chapter.title !== chapterTitle)
      fail('SUMMARY.md', 1, `章节目录${chapter.id}对应多个标题`);
    lessons.push({
      ...lesson,
      description: description(source),
      minutes: Math.max(3, Math.ceil(plainText(source).length / 350)),
    });
    chapter.lessonIds.push(lesson.id);
    addDocument(lesson.path, source, 'lesson', lesson.chapterId, lesson.id);
  }
  for (const chapter of chapters) {
    const directory = `exams/${chapter.id}`;
    let filenames;
    try {
      filenames = (await readdir(join(rootDir, directory)))
        .filter((name) => name.endsWith('.md'))
        .sort();
    } catch {
      fail(directory, 1, '缺少章节试卷目录');
    }
    for (const filename of filenames) {
      if (!/-(?:题目|答案解析)\.md$/.test(filename))
        fail(`${directory}/${filename}`, 1, '章节试卷文件名格式不支持');
      if (
        filename.endsWith('-答案解析.md') &&
        !filenames.includes(filename.replace('-答案解析.md', '-题目.md'))
      )
        fail(`${directory}/${filename}`, 1, '缺少配对题目文件');
    }
    const questionNames = filenames.filter((name) => name.endsWith('-题目.md'));
    const rank = (name) =>
      ({ 章节测验: 1, 挑战卷: 2, 压力面: 3 })[name.replace('-题目.md', '')] || 0;
    questionNames.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'en'));
    for (const filename of questionNames) {
      const stem = filename.replace('-题目.md', '');
      const kind =
        { 章节测验: 'chapter', 挑战卷: 'challenge', 压力面: 'interview' }[stem] || 'section';
      const id = `${chapter.id}/${stem}`;
      const lessonId = kind === 'section' ? id : null;
      if (lessonId && !lessons.some((l) => l.id === lessonId))
        fail(`${directory}/${filename}`, 1, '小测没有对应的SUMMARY课程');
      const questionPath = `${directory}/${filename}`;
      const answerPath = `${directory}/${stem}-答案解析.md`;
      const [qbuffer, abuffer] = await Promise.all([
        sourceFile(rootDir, questionPath),
        sourceFile(rootDir, answerPath),
      ]);
      const questionSource = qbuffer.toString('utf8'),
        answerSource = abuffer.toString('utf8');
      const title = documentTitle(questionSource, questionPath);
      const paper = parseExamPaper({
        id,
        title,
        kind,
        questionPath,
        answerPath,
        questionSource,
        answerSource,
      });
      papers.push(paper);
      exams.push({
        id,
        chapterId: chapter.id,
        title,
        kind,
        lessonId,
        questionPath,
        answerPath,
        questionCount: paper.questions.length,
      });
      chapter.examIds.push(id);
      addDocument(questionPath, questionSource, 'question', chapter.id, lessonId, id);
      addDocument(answerPath, answerSource, 'answer', chapter.id, lessonId, id);
    }
    for (const id of chapter.lessonIds)
      if (!exams.some((e) => e.id === id)) fail(`docs/${id}.md`, 1, '课程缺少配套小测');
    for (const kind of requiredExamKinds) {
      if (!exams.some((e) => e.chapterId === chapter.id && e.kind === kind))
        fail(directory, 1, `缺少${kind}试卷`);
    }
  }
  for (const path of referencePaths) {
    if (path === 'CLAUDE.md' || path.startsWith('docs/superpowers/'))
      fail(path, 1, '内部开发指令不得进入读者目录');
    addDocument(path, (await sourceFile(rootDir, path)).toString('utf8'), 'reference');
  }
  const totals = {
    chapters: chapters.length,
    lessons: lessons.length,
    exams: exams.length,
    questions: papers.reduce((sum, paper) => sum + paper.questions.length, 0),
    choice: papers.reduce(
      (sum, paper) => sum + paper.questions.filter((q) => q.type === 'choice').length,
      0,
    ),
    open: papers.reduce(
      (sum, paper) => sum + paper.questions.filter((q) => q.type === 'open').length,
      0,
    ),
  };
  for (const [key, expected] of Object.entries(expectedCounts))
    if (totals[key] !== expected)
      fail('SUMMARY.md', 1, `${key}覆盖数量不符：期望${expected}，实际${totals[key]}`);
  const catalog = { version: 1, chapters, lessons, exams, documents };
  const searchIndex = documents
    .filter((d) => d.kind !== 'answer')
    .map((d) => ({
      path: d.path,
      title: d.title,
      text: plainText(sources.get(d.path)),
      kind: d.kind,
      chapterId: d.chapterId,
    }));
  const assets = await collectAssets(rootDir, assetPaths);
  const contentDir = join(outputDir, 'public/content'),
    generatedDir = join(outputDir, 'src/generated');
  // Validate everything before replacing a previous successful content build.
  await mkdir(generatedDir, { recursive: true });
  await rm(contentDir, { recursive: true, force: true });
  await mkdir(contentDir, { recursive: true });
  async function output(path, data) {
    const target = join(contentDir, path);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, data);
  }
  for (const [path, source] of sources) await output(path, source);
  for (const [path, data] of assets) await output(path, data);
  for (const paper of papers)
    await output(`papers/${paper.id}.json`, `${JSON.stringify(paper, null, 2)}\n`);
  await output('search.json', `${JSON.stringify(searchIndex)}\n`);
  await writeFile(join(generatedDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  return { catalog, searchIndex, papers, totals, assets: [...assets.keys()] };
}
