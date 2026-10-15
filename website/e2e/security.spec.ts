import { expect, test } from '@playwright/test';

const storageKey = 'defense-learning-progress:v1';
const lessonId = '02-cryptography/01-symmetric-encryption';
const lessonPath = `docs/${lessonId}.md`;
const lessonRoute = `/#/read/${lessonPath}`;
const lessonTitle = '对称加密：AES 与认证加密';

test('untrusted Markdown cannot run HTML or dangerous links while allowed links remain useful', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const hostileMarkdown = [
    '# 安全渲染回归材料',
    '',
    '<script>window.__markdownXss = 1</script>',
    '<img src="missing-regression-image.png" onerror="window.__markdownXss=1">',
    '<svg onload="window.__markdownXss=1"></svg>',
    '<iframe srcdoc="<script>parent.__markdownXss=1</script>"></iframe>',
    '',
    '[危险脚本](javascript:window.__markdownXss=1)',
    '[危险数据](data:text/html;base64,PHNjcmlwdD53aW5kb3cuX194c3M9MTwvc2NyaXB0Pg==)',
    '[本机文件](file:///etc/passwd)',
    '[越界文件](../../../../outside.md)',
    '[越界伪装根文档](../../../../README.md)',
    '[编码越界](%2e%2e/%2e%2e/%2e%2e/outside.md)',
    '[未列入文档](../../unlisted-secret.md)',
    '[目录内未知文档](unlisted-secret.md)',
    '[下一节安全链接](02-asymmetric-encryption.md)',
    '[官方外链](https://www.rfc-editor.org/rfc/rfc8446)',
    '',
    '| 机制 | 边界 |',
    '| --- | --- |',
    '| 安全表格 | 应保留 |',
  ].join('\n');
  await page.route('**/content/docs/02-cryptography/01-symmetric-encryption.md', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/markdown; charset=utf-8',
      body: hostileMarkdown,
    }),
  );
  await page.goto(lessonRoute);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: '安全渲染回归材料', exact: true })).toBeVisible();
  await expect(main.getByRole('table')).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>).__markdownXss),
  ).toBeUndefined();
  expect(await main.locator('script, iframe, [onerror], [onload]').count()).toBe(0);
  const dangerousDestinations = await main
    .locator('a[href]')
    .evaluateAll((anchors) =>
      anchors
        .map((anchor) => anchor.getAttribute('href') ?? '')
        .filter((href) => /^(?:javascript|vbscript|data|file):/i.test(href.trim())),
    );
  expect(dangerousDestinations).toEqual([]);
  for (const label of [
    '危险脚本',
    '危险数据',
    '本机文件',
    '越界文件',
    '越界伪装根文档',
    '编码越界',
    '未列入文档',
    '目录内未知文档',
  ]) {
    await expect(main.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
  await expect(main.getByRole('link', { name: '官方外链', exact: true })).toHaveAttribute(
    'href',
    'https://www.rfc-editor.org/rfc/rfc8446',
  );
  await main.getByRole('link', { name: '下一节安全链接', exact: true }).click();
  await expect(
    main.getByRole('heading', { level: 1, name: '非对称密码：RSA、ECC 与密钥协商', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [caseName, broken] of [
  ['invalid JSON', '{bad-json'],
  [
    'invalid version-1 structure',
    JSON.stringify({ version: 1, completed: 'oops', bookmarks: null, attempts: [], lastPath: 7 }),
  ],
] as const)
  test(`corrupted saved progress gives a readable recovery state without replacing the bad record (${caseName})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: broken,
    });
    await page.goto(lessonRoute);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: '未能读取本地进度' })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(broken);
    expect(errors).toEqual([]);
  });

test('malicious saved fields cannot inject markup, routes or prototype properties', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const malicious = JSON.stringify({
    version: 1,
    completed: [lessonId, { bad: 'value' }, 'unknown-course'],
    bookmarks: ['javascript:window.__storageXss=1', '../../../../outside.md', lessonPath],
    lastPath: 'javascript:window.__storageXss=1',
    attempts: {
      '02-cryptography/01-symmetric-encryption': {
        choices: { 1: '<img src=x onerror="window.__storageXss=1">' },
        notes: { 6: '<img src=x onerror="window.__storageXss=1">' },
        revealed: [1, 'bad'],
        submitted: 'yes',
        updatedAt: { invalid: true },
      },
      ['__proto__']: { polluted: true },
    },
    ['__proto__']: { polluted: true },
  });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: storageKey,
    value: malicious,
  });
  await page.goto(lessonRoute);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^(?:标记为已学|已学完)$/ })).toBeVisible();
  await page.getByRole('link', { name: '我的学习', exact: true }).click();
  expect(
    await page.evaluate(() => ({
      marker: (window as unknown as Record<string, unknown>).__storageXss,
      prototype: ({} as Record<string, unknown>).polluted,
    })),
  ).toEqual({ marker: undefined, prototype: undefined });
  const destinations = await page
    .getByRole('main')
    .locator('a[href]')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
  expect(destinations.some((href) => /javascript:|outside\.md/i.test(href))).toBe(false);
  expect(errors).toEqual([]);
});

test('unwritable storage still allows reading and interactive progress with an explicit warning', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value() {
        throw new DOMException('Regression fixture: storage full', 'QuotaExceededError');
      },
    });
  });
  await page.goto(lessonRoute);
  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await main.getByRole('button', { name: '标记为已学', exact: true }).click();
  await expect(main.getByRole('button', { name: '已学完', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('status').filter({ hasText: '当前浏览器无法保存进度' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a SecurityError while accessing localStorage still permits reading and progress changes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Regression fixture: storage blocked', 'SecurityError');
      },
    });
  });
  await page.goto(lessonRoute);
  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', { level: 1, name: lessonTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '未能读取本地进度' })).toBeVisible();
  await main.getByRole('button', { name: '标记为已学', exact: true }).click();
  await expect(main.getByRole('button', { name: '已学完', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('status').filter({ hasText: '当前浏览器无法保存进度' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('invalid and unknown document routes recover through the public course directory', async ({
  page,
}) => {
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    if (/outside\.md|unlisted-secret\.md/.test(request.url()))
      forbiddenRequests.push(request.url());
  });
  for (const route of [
    '/#/read/%E0%A4%A',
    '/#/read/../../outside.md',
    '/#/read/docs/02-cryptography/unlisted-secret.md',
  ]) {
    await page.goto(route);
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { name: '没有找到这篇内容', exact: true }),
    ).toBeVisible();
    await main.getByRole('link', { name: '浏览课程目录', exact: true }).click();
    await expect(
      main.getByRole('heading', { level: 1, name: '一张完整的防御知识地图', exact: true }),
    ).toBeVisible();
  }
  expect(forbiddenRequests).toEqual([]);
});
