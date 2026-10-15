import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const lessonPath = 'docs/01-introduction/01-what-is-cybersecurity.md';
const sourceUrl = '**/content/docs/01-introduction/01-what-is-cybersecurity.md';
const lessonUrl = `/#/read/${lessonPath}`;
const paragraph = '从身份、授权和审计三个方面复核防御边界。';
const longSource = [
  '# 阅读交互夹具',
  '## 身份与 `权限`',
  ...Array.from({ length: 16 }, () => paragraph),
  '## 身份与 `权限`',
  ...Array.from({ length: 16 }, () => paragraph),
  '## 边界复核',
  ...Array.from({ length: 20 }, () => paragraph),
].join('\n\n');

async function openFixture(page: Page, source = longSource) {
  await page.route(sourceUrl, (route) =>
    route.fulfill({ status: 200, contentType: 'text/markdown', body: source }),
  );
  await page.goto(lessonUrl);
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toHaveText(
    '阅读交互夹具',
  );
}

test('自然滚动更新目录当前位置，同时保留 URL 和浏览器历史', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFixture(page);
  const toc = page.locator('.reader-toc').getByRole('navigation', { name: '本节目录' });
  const before = await page.evaluate(() => ({ url: location.href, history: history.length }));
  const target = page.getByRole('article').getByRole('heading', { name: '边界复核', exact: true });
  const distance = await target.evaluate((element) => element.getBoundingClientRect().top - 105);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, distance);
  await expect(toc.getByRole('link', { name: '边界复核', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  );
  expect(await page.evaluate(() => ({ url: location.href, history: history.length }))).toEqual(
    before,
  );
  await page.mouse.wheel(0, -distance);
  await expect(toc.getByRole('link', { name: '身份与 权限', exact: true }).first()).toHaveAttribute(
    'aria-current',
    'location',
  );
  expect(await page.evaluate(() => ({ url: location.href, history: history.length }))).toEqual(
    before,
  );
});

test('重复点击同一中文目录锚点仍定位和聚焦，后退可回到上个标题', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFixture(page);
  const toc = page.locator('.reader-toc').getByRole('navigation', { name: '本节目录' });
  const link = toc.getByRole('link', { name: '身份与 权限', exact: true }).nth(1);
  const target = page.locator('article [id="身份与-权限-1"]');
  await link.click();
  await expect(target).toBeFocused();
  await expect(page).toHaveURL(/section=%E8%BA%AB%E4%BB%BD%E4%B8%8E-%E6%9D%83%E9%99%90-1$/);
  const before = await page.evaluate(() => ({ url: location.href, history: history.length }));
  await page.mouse.wheel(0, 450);
  await link.click();
  await expect(target).toBeFocused();
  await expect
    .poll(() => target.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(120);
  expect(await page.evaluate(() => ({ url: location.href, history: history.length }))).toEqual(
    before,
  );
  await toc.getByRole('link', { name: '边界复核', exact: true }).click();
  await page.goBack();
  await expect(target).toBeFocused();
  await expect
    .poll(() => target.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(120);
  await page.getByRole('link', { name: '回到开篇', exact: true }).click();
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByRole('link', { name: '回到开篇', exact: true }).click();
  await expect(toc.getByRole('link', { name: '身份与 权限', exact: true }).first()).toHaveAttribute(
    'aria-current',
    'location',
  );
});

test('手机目录选中标题后收起并将焦点交给正文，包括重复选择', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  const mobileToc = page.locator('.reader-mobile-toc');
  const target = page.getByRole('article').getByRole('heading', { name: '边界复核', exact: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await mobileToc.locator('summary').click();
    await mobileToc.getByRole('link', { name: '边界复核', exact: true }).click();
    await expect(mobileToc).not.toHaveAttribute('open');
    await expect(target).toBeFocused();
    await expect
      .poll(() => target.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(120);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('无滚动位移时重复回到开篇仍高亮首个目录项且不新增历史', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1800 });
  await openFixture(page, '# 阅读交互夹具\n\n## 身份与 `权限`\n\n简短说明。');
  const first = page
    .locator('.reader-toc')
    .getByRole('navigation', { name: '本节目录' })
    .getByRole('link', { name: '身份与 权限', exact: true });
  await expect(first).toHaveAttribute('aria-current', 'location');
  // The entire short page fits, so scroll events cannot repair an incorrect clicked-heading state.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  const top = page.getByRole('link', { name: '回到开篇', exact: true });
  await top.click();
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toBeFocused();
  const before = await page.evaluate(() => ({
    url: location.href,
    history: history.length,
    scrollY,
  }));
  await top.click();
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toBeFocused();
  await expect(first).toHaveAttribute('aria-current', 'location');
  expect(
    await page.evaluate(() => ({ url: location.href, history: history.length, scrollY })),
  ).toEqual(before);
});

test('连续后退到无锚点正文时恢复阅读器焦点并保留浏览器滚动位置', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFixture(page);
  const originalUrl = page.url();
  const originalScroll = await page.evaluate(() => scrollY);
  const toc = page.locator('.reader-toc').getByRole('navigation', { name: '本节目录' });
  await toc.getByRole('link', { name: '身份与 权限', exact: true }).nth(1).click();
  await expect(page.locator('article [id="身份与-权限-1"]')).toBeFocused();
  await toc.getByRole('link', { name: '边界复核', exact: true }).click();
  await expect(
    page.getByRole('article').getByRole('heading', { name: '边界复核', exact: true }),
  ).toBeFocused();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(originalUrl);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalScroll);
  await expect(page.locator('.reader-page')).toBeFocused();
});

test('文末完成入口与顶部同步，可撤销且刷新后保留', async ({ page }) => {
  await openFixture(page, '# 阅读交互夹具\n\n## 复盘\n\n读完后检查学习状态。');
  const finish = page.getByRole('region', { name: '本节学习状态', exact: true });
  await finish.getByRole('button', { name: '完成本节', exact: true }).click();
  await expect(page.getByRole('button', { name: '已学完', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(finish.getByRole('button', { name: '取消已学', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await finish.getByRole('button', { name: '取消已学', exact: true }).click();
  await expect(page.getByRole('button', { name: '标记为已学', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: '标记为已学', exact: true }).click();
  await expect(finish.getByRole('button', { name: '取消已学', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

const codeSource =
  '# 阅读交互夹具\n\n```text\nfirst safe sample\n```\n\n```text\nsecond safe sample\n```';

test('代码复制在各自按钮显示成功，多个代码块状态独立', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openFixture(page, codeSource);
  const blocks = page.getByRole('article').locator('.markdown-code');
  await blocks.nth(0).getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(blocks.nth(0).getByRole('button', { name: '已复制', exact: true })).toBeVisible();
  await expect(blocks.nth(1).getByRole('button', { name: '复制代码', exact: true })).toBeVisible();
  expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe(
    'first safe sample',
  );
  await blocks.nth(1).getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(blocks.nth(0).getByRole('button', { name: '已复制', exact: true })).toBeVisible();
  await expect(blocks.nth(1).getByRole('button', { name: '已复制', exact: true })).toBeVisible();
  expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe(
    'second safe sample',
  );
  await expect(page.getByRole('status').filter({ hasText: '代码已复制' })).toHaveCount(1);
});

test('剪贴板拒绝后在对应代码块显示手动复制指引，其余块不受影响', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
      configurable: true,
    });
  });
  await openFixture(page, codeSource);
  const blocks = page.getByRole('article').locator('.markdown-code');
  await blocks.nth(0).getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(
    blocks.nth(0).getByText('无法自动复制，请选中代码后手动复制。', { exact: true }),
  ).toBeVisible();
  await expect(blocks.nth(0).getByRole('button', { name: '重新复制', exact: true })).toBeVisible();
  await expect(blocks.nth(1).getByRole('button', { name: '复制代码', exact: true })).toBeVisible();
  await expect(
    blocks.nth(1).getByText('无法自动复制，请选中代码后手动复制。', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: '手动复制' })).toHaveCount(1);
});
