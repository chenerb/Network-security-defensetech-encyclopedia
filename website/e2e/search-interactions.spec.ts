import { expect, test, type Page } from '@playwright/test';
import generatedCatalog from '../src/generated/catalog.json' with { type: 'json' };
import type { SearchEntry } from '../src/types';

const lessonDocuments = generatedCatalog.documents.filter((entry) => entry.kind === 'lesson');
const firstLessons = lessonDocuments.slice(0, 12);
const questionPath = 'exams/01-introduction/01-what-is-cybersecurity-题目.md';
const entries: SearchEntry[] = [
  ...firstLessons.map((entry, index) => ({
    path: entry.path,
    chapterId: entry.chapterId,
    kind: 'lesson' as const,
    title: `安全入口 ${index + 1}${index === 11 ? ` ${'LongSecurityTerm'.repeat(25)}` : ''}`,
    text: '安全入口：验证搜索键盘、输入法和滚动交互。',
  })),
  {
    path: questionPath,
    chapterId: '01-introduction',
    kind: 'question',
    title: '安全入口练习',
    text: '安全入口：可以切换到练习类型。',
  },
  {
    path: 'README.md',
    chapterId: null,
    kind: 'reference',
    title: '安全入口参考',
    text: '安全入口：读者参考。',
  },
];

async function openSearch(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  return page.getByRole('dialog', { name: '搜索课程与练习', exact: true });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/content/search.json', (route) => route.fulfill({ json: entries }));
});

for (const mode of ['composition events', 'native isComposing', 'legacy keyCode 229']) {
  test(`输入法确认不打开搜索结果（${mode}）`, async ({ page }) => {
    const dialog = await openSearch(page);
    const input = dialog.getByRole('searchbox', { name: '搜索课程与练习', exact: true });
    await input.fill('安全入口');
    await expect(dialog.locator('a.search-result')).toHaveCount(14);
    const initialUrl = page.url();
    if (mode === 'composition events') await input.dispatchEvent('compositionstart');
    await input.dispatchEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      isComposing: mode === 'native isComposing',
      keyCode: mode === 'legacy keyCode 229' ? 229 : 13,
    });
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(initialUrl);
    if (mode === 'composition events') await input.dispatchEvent('compositionend');
    await input.press('Enter');
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(firstLessons[0].path.replace(/\./g, '\\.')));
  });
}

test('方向键聚焦原生结果链接并滚动，Enter打开选定项', async ({ page }) => {
  const dialog = await openSearch(page);
  const input = dialog.getByRole('searchbox', { name: '搜索课程与练习', exact: true });
  await input.fill('安全入口');
  const results = dialog.locator('a.search-result');
  await expect(results).toHaveCount(14);
  await input.press('ArrowDown');
  await expect(results.nth(0)).toBeFocused();
  await results.nth(0).press('ArrowDown');
  await expect(results.nth(1)).toBeFocused();
  await results.nth(1).press('ArrowUp');
  await expect(results.nth(0)).toBeFocused();
  for (let index = 0; index < 11; index++) await page.keyboard.press('ArrowDown');
  const selected = results.nth(11);
  await expect(selected).toBeFocused();
  await expect(dialog.getByRole('link')).toHaveCount(14);
  await expect(dialog.getByRole('option')).toHaveCount(0);
  expect(
    await selected.evaluate((element) => {
      const resultBounds = element.getBoundingClientRect();
      const containerBounds = element.closest('.search-results')!.getBoundingClientRect();
      return resultBounds.bottom > containerBounds.top && resultBounds.top < containerBounds.bottom;
    }),
  ).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(firstLessons[11].path.replace(/\./g, '\\.')));
  await expect(dialog).not.toBeVisible();
});

test('Tab保留原生链接顺序，清空搜索回焦且保留类型筛选', async ({ page }) => {
  const dialog = await openSearch(page);
  const input = dialog.getByRole('searchbox', { name: '搜索课程与练习', exact: true });
  await input.fill('安全入口');
  await input.press('Tab');
  const clear = dialog.getByRole('button', { name: '清空搜索', exact: true });
  await expect(clear).toBeFocused();
  for (let index = 0; index < 5; index++) await page.keyboard.press('Tab');
  await expect(dialog.locator('a.search-result').first()).toBeFocused();
  await dialog.getByRole('button', { name: '练习', exact: true }).click();
  await expect(dialog.locator('a.search-result')).toHaveCount(1);
  await clear.click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(dialog.getByRole('button', { name: '练习', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(dialog.getByText('带着一个问题，找到学习的入口。')).toBeVisible();
  await input.fill('没有这样的搜索内容');
  await expect(dialog.getByText('没有找到相关内容', { exact: true })).toBeVisible();
  await input.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeFocused();
});

test('搜索索引加载失败可重试，加载期间状态可见', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  await page.route('**/content/search.json', async (route) => {
    if (++attempts === 1) {
      await pending;
      await route.abort();
    } else await route.fulfill({ json: entries });
  });
  try {
    const dialog = await openSearch(page);
    await expect(dialog.getByRole('status')).toHaveText('正在准备搜索内容…');
    release();
    await expect(dialog.getByRole('alert')).toContainText('搜索内容加载失败');
    await dialog.getByRole('button', { name: '重试', exact: true }).click();
    await dialog.getByRole('searchbox').fill('安全入口');
    await expect(dialog.locator('a.search-result')).toHaveCount(14);
  } finally {
    release();
  }
});

test('窄屏长标题和操作栏无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const dialog = await openSearch(page);
  await dialog.getByRole('searchbox').fill('安全入口');
  await expect(dialog.locator('a.search-result')).toHaveCount(14);
  expect(
    await dialog.evaluate((element) => {
      const panel = element.querySelector('.search-panel')!;
      const results = element.querySelector('.search-results')!;
      return (
        element.scrollWidth <= element.clientWidth &&
        panel.scrollWidth <= panel.clientWidth &&
        results.scrollWidth <= results.clientWidth &&
        document.documentElement.scrollWidth <= window.innerWidth
      );
    }),
  ).toBe(true);
  await expect(dialog.getByRole('button', { name: '清空搜索', exact: true })).toBeVisible();
});
