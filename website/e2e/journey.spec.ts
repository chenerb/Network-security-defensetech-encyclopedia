import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const lessonPath = 'docs/02-cryptography/01-symmetric-encryption.md';
const examPath = 'exams/02-cryptography/01-symmetric-encryption-题目.md';

function sourceDocuments(directory: 'docs' | 'exams', suffix: string) {
  return readdirSync(join(repositoryRoot, directory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .flatMap((chapter) =>
      readdirSync(join(repositoryRoot, directory, chapter.name))
        .filter((name) => name.endsWith(suffix))
        .map((name) => {
          const path = `${directory}/${chapter.name}/${name}`;
          const source = readFileSync(join(repositoryRoot, path), 'utf8');
          const title = source.match(/^#\s+(.+)$/m)?.[1].trim();
          if (!title) throw new Error(`Missing source heading: ${path}`);
          const questions =
            directory === 'exams'
              ? [...source.matchAll(/^###\s+(?:Q)?(\d+)[.．、]/gm)].map((match) => Number(match[1]))
              : [];
          return { path, title, questions };
        }),
    )
    .sort((left, right) => left.path.localeCompare(right.path));
}

const lessons = sourceDocuments('docs', '.md');
const exams = sourceDocuments('exams', '-题目.md');
const lessonTitle = lessons.find((entry) => entry.path === lessonPath)!.title;
const examTitle = exams.find((entry) => entry.path === examPath)!.title;

function pathFromHref(href: string) {
  const hash = href.includes('#') ? href.slice(href.indexOf('#')) : href;
  if (!hash.startsWith('#/read/')) return null;
  return decodeURIComponent(hash.slice('#/read/'.length).split('?')[0]);
}

async function documentLinks(scope: Locator) {
  const anchors = await scope.locator('a[href]').evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute('href')!,
      text: element.textContent ?? '',
    })),
  );
  return anchors
    .map((anchor) => ({ ...anchor, path: pathFromHref(anchor.href) }))
    .filter(
      (anchor): anchor is { href: string; text: string; path: string } => anchor.path !== null,
    );
}

async function documentLink(scope: Locator, path: string) {
  await expect
    .poll(async () => (await documentLinks(scope)).some((link) => link.path === path))
    .toBe(true);
  const link = (await documentLinks(scope)).find((entry) => entry.path === path)!;
  return scope.locator(`a[href=${JSON.stringify(link.href)}]`).first();
}

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectDocumentReady(main: Locator, document: { path: string; title: string }) {
  if (document.path.startsWith('exams/')) {
    await expect(main.getByRole('article', { name: document.title, exact: true })).toBeVisible();
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
  } else {
    await expect(
      main.getByRole('heading', { level: 1, name: document.title, exact: true }),
    ).toBeVisible();
  }
}

test('all 40 lessons and 70 papers are reachable from the public learning directories', async ({
  page,
}) => {
  test.setTimeout(180_000);
  expect(lessons).toHaveLength(40);
  expect(exams).toHaveLength(70);
  expect(exams.reduce((sum, paper) => sum + paper.questions.length, 0)).toBe(662);
  const main = page.getByRole('main');
  for (const [route, expected] of [
    ['/#/catalog', lessons],
    ['/#/exams', exams],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: '打开课程目录', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '关闭课程目录', exact: true })).not.toBeVisible();
    await expect
      .poll(async () => {
        const links = await documentLinks(main);
        return [
          ...new Set(
            links
              .filter((link) =>
                route.endsWith('catalog')
                  ? link.path.startsWith('docs/')
                  : link.path.endsWith('-题目.md'),
              )
              .map((link) => link.path),
          ),
        ].sort();
      })
      .toEqual(expected.map((entry) => entry.path).sort());
    const links = await documentLinks(main);
    for (const document of expected) {
      const link = links.find((entry) => entry.path === document.path)!;
      await page.goto(link.href);
      await expectDocumentReady(main, document);
      for (const number of document.questions) {
        await expect(main.getByText(new RegExp(`^第\\s*${number}\\s*题`)).first()).toBeVisible();
      }
      await expectNoPageOverflow(page);
    }
  }
});

test('a lesson, bookmarks, answers and self-assessment notes survive a complete learning journey', async ({
  page,
}) => {
  await page.goto('/#/catalog');
  const main = page.getByRole('main');
  await (await documentLink(main, lessonPath)).click();
  await expect(
    main.getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await main.getByRole('button', { name: '标记为已学', exact: true }).click();
  await main.getByRole('button', { name: '加入收藏', exact: true }).click();
  await page.reload();
  await expect(main.getByRole('button', { name: '已学完', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(main.getByRole('button', { name: '已收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await (await documentLink(main, examPath)).click();
  await expectDocumentReady(main, { path: examPath, title: examTitle });
  const firstQuestion = main.getByRole('group', { name: /第\s*1\s*题/ });
  await firstQuestion.getByRole('radio', { name: /密钥长度/ }).check();
  const note = '先将密钥与密文分开授权，再演练密钥轮换。';
  await main.getByRole('textbox', { name: '第 6 题学习笔记', exact: true }).fill(note);
  await main.getByRole('button', { name: '核对答案', exact: true }).click();
  await page.reload();
  await expect(firstQuestion.getByRole('radio', { name: /密钥长度/ })).toBeChecked();
  await expect(main.getByRole('textbox', { name: '第 6 题学习笔记', exact: true })).toHaveValue(
    note,
  );
  await page.getByRole('link', { name: '我的学习', exact: true }).click();
  await expect(await documentLink(main, lessonPath)).toBeVisible();
  await (await documentLink(main, lessonPath)).click();
  await expect(main.getByRole('button', { name: '已学完', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('keyboard search finds nonce lessons without including answer sheets', async ({ page }) => {
  await page.goto('/');
  const searchButton = page.getByRole('button', { name: '搜索', exact: true });
  await searchButton.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '搜索课程与练习', exact: true });
  const searchbox = dialog.getByRole('searchbox', { name: '搜索课程与练习', exact: true });
  await expect(searchbox).toBeFocused();
  await searchbox.fill('nonce');
  await documentLink(dialog, lessonPath);
  expect((await documentLinks(dialog)).some((link) => link.path.endsWith('-答案解析.md'))).toBe(
    false,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(searchButton).toBeFocused();
  await searchButton.press('Enter');
  await dialog.getByRole('searchbox', { name: '搜索课程与练习', exact: true }).fill('nonce');
  await (await documentLink(dialog, lessonPath)).click();
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
});

test('390px navigation opens, selects a course and closes without horizontal page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: '课程目录', exact: true });
  await expect(navigation).not.toBeVisible();
  await page.getByRole('button', { name: '打开课程目录', exact: true }).click();
  await expect(navigation).toBeVisible();
  const link = await documentLink(navigation, lessonPath);
  const chapter = link.locator('xpath=ancestor::details[1]');
  if (
    (await chapter.count()) &&
    !(await chapter.evaluate((element) => element.hasAttribute('open')))
  ) {
    await chapter.locator('summary').click();
  }
  await link.click();
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await expect(navigation).not.toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: '打开课程目录', exact: true }).click();
  await page.getByRole('button', { name: '关闭课程目录', exact: true }).click();
  await expect(navigation).not.toBeVisible();
  for (const path of [
    'docs/07-data-security-privacy/03-privacy-preserving.md',
    'exams/09-ai-agent-security/章节测验-题目.md',
  ]) {
    await page.goto(`/#/read/${path.split('/').map(encodeURIComponent).join('/')}`);
    const document = [...lessons, ...exams].find((entry) => entry.path === path)!;
    await expectDocumentReady(page.getByRole('main'), document);
    await expectNoPageOverflow(page);
  }
});

test('mobile course navigation keeps keyboard focus inside its modal and returns it after Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const opener = page.getByRole('button', { name: '打开课程目录', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: '课程目录抽屉', exact: true });
  await expect(drawer).toBeVisible();
  const focusIsInside = () =>
    drawer.evaluate((element) => element.contains(document.activeElement));
  await expect.poll(focusIsInside).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect.poll(focusIsInside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.press('Enter');
  await expect(drawer).toBeVisible();
  await expect.poll(focusIsInside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('production static hosting keeps content under /study/ after direct entry and refresh @subpath', async ({
  page,
}) => {
  const suppliedBase = process.env.STUDY_BASE_URL ?? 'http://127.0.0.1:4173/study/';
  const base = suppliedBase.endsWith('/') ? suppliedBase : suppliedBase + '/';
  const contentRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/content/')) contentRequests.push(request.url());
  });
  await page.goto(`${base}#/catalog`);
  const main = page.getByRole('main');
  await (await documentLink(main, lessonPath)).click();
  await expect(
    main.getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    main.getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await (await documentLink(main, examPath)).click();
  await expectDocumentReady(main, { path: examPath, title: examTitle });
  await page.reload();
  await expectDocumentReady(main, { path: examPath, title: examTitle });
  expect(new URL(page.url()).pathname).toBe(new URL(base).pathname);
  expect(contentRequests.length).toBeGreaterThan(0);
  expect(contentRequests.every((url) => url.startsWith(new URL('content/', base).href))).toBe(true);
  await expectNoPageOverflow(page);
});
