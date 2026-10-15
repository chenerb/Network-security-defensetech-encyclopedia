import { expect, test } from '@playwright/test';

const lessonPath = 'docs/01-introduction/01-what-is-cybersecurity.md';
const nextLessonPath = 'docs/01-introduction/02-cia-triad-threat-model.md';
const examPath = 'exams/01-introduction/01-what-is-cybersecurity-题目.md';
const answerPath = examPath.replace('-题目.md', '-答案解析.md');
const read = (path: string) => `/#/read/${encodeURI(path)}`;
const sourceUrl = '**/content/docs/01-introduction/01-what-is-cybersecurity.md';

test('正文可通过相邻一节继续学习', async ({ page }) => {
  await page.goto(read(lessonPath));
  await expect(page.getByRole('article')).toBeVisible();
  await page
    .getByRole('link', { name: /下一篇.*CIA/ })
    .last()
    .click();
  await expect(page).toHaveURL(new RegExp(encodeURI(nextLessonPath).replace(/\./g, '\\.')));
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toContainText('CIA');
});

test('未作答选择题核对后为零分，主观题要求自评', async ({ page }) => {
  await page.goto(read(examPath));
  await expect(page.getByRole('button', { name: '核对答案', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('0 / 48 分');
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('未答 6');
  await expect(
    page.getByText('开放题按解析中的评分要点自评，不计入自动得分。', { exact: true }),
  ).toBeVisible();
});

test('选择和开放笔记可刷新恢复，解析按题展开，重做保留笔记', async ({ page }) => {
  await page.goto(read(examPath));
  const first = page.getByRole('group', { name: /^第 1 题/ });
  await first.getByRole('radio', { name: /^A[.、\s]/ }).check();
  await page
    .getByRole('textbox', { name: '第 9 题学习笔记', exact: true })
    .fill('先写明威胁模型，再说明保证的假设。');
  await expect(page.getByRole('region', { name: '第 1 题解析', exact: true })).toHaveCount(0);
  await first.getByRole('button', { name: '查看解析', exact: true }).click();
  await expect(page.getByRole('region', { name: '第 1 题解析', exact: true })).toContainText('C');
  await page.reload();
  await expect(
    page.getByRole('group', { name: /^第 1 题/ }).getByRole('radio', { name: /^A[.、\s]/ }),
  ).toBeChecked();
  await expect(page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true })).toHaveValue(
    '先写明威胁模型，再说明保证的假设。',
  );
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('0 / 48 分');
  await page.getByRole('button', { name: '重新作答，保留笔记', exact: true }).click();
  await expect(
    page.getByRole('group', { name: /^第 1 题/ }).getByRole('radio', { name: /^A[.、\s]/ }),
  ).not.toBeChecked();
  await expect(page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true })).toHaveValue(
    '先写明威胁模型，再说明保证的假设。',
  );
  await expect(page.getByRole('region', { name: '第 1 题解析', exact: true })).toHaveCount(0);
  await page
    .getByRole('group', { name: /^第 1 题/ })
    .getByRole('radio', { name: /^C[.、\s]/ })
    .check();
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('8 / 48 分');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空作答和笔记', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true })).toHaveValue('');
});

test('显式进入答案链接可查看解析，不伪造提交或自动满分', async ({ page }) => {
  await page.goto(read(answerPath));
  await expect(page.getByRole('region', { name: '第 1 题解析', exact: true })).toBeVisible();
  await expect(
    page.getByText('当前为答案解析。客观题得分仍以你的实际作答为准。', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('0 / 48 分');
});

test('Markdown 保留代码标题和去重锚点，外链与代码可读', async ({ page }) => {
  const markdown = [
    '# 安全渲染夹具',
    '## `身份` 与权限',
    '第一段。',
    '## `身份` 与权限',
    '[外部资料](https://example.com/reference)',
    '[下一节](02-cia-triad-threat-model.md)',
    '```text',
    '<safe code>',
    '```',
  ].join('\n\n');
  await page.route(sourceUrl, (route) =>
    route.fulfill({ status: 200, contentType: 'text/markdown', body: markdown }),
  );
  await page.goto(read(lessonPath));
  const article = page.getByRole('article');
  const headings = article.getByRole('heading', { name: '身份 与权限', exact: true });
  await expect(headings).toHaveCount(2);
  await expect(headings.nth(0)).toHaveAttribute('id', '身份-与权限');
  await expect(headings.nth(1)).toHaveAttribute('id', '身份-与权限-1');
  await expect(article.getByRole('link', { name: '外部资料', exact: true })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await expect(article.getByRole('link', { name: '下一节', exact: true })).toHaveAttribute(
    'href',
    new RegExp('^#/read/docs/01-introduction/02-cia'),
  );
  await expect(article.getByText('<safe code>', { exact: true })).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制代码', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '代码已复制' })).toHaveCount(1);
  expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe('<safe code>');
});

test('加载失败可重试，快速换页后迟到内容不能覆盖当前正文', async ({ page }) => {
  let failing = true;
  await page.route(sourceUrl, async (route) => {
    if (failing) await route.abort();
    else await route.continue();
  });
  await page.goto(read(lessonPath));
  await expect(page.getByRole('alert')).toContainText('内容加载失败');
  failing = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await page.unroute(sourceUrl);
  await page.route(sourceUrl, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route
      .fulfill({ status: 200, contentType: 'text/markdown', body: '# 迟到的旧正文' })
      .catch(() => {});
  });
  await page.goto(read(lessonPath));
  await page.evaluate((path) => {
    window.location.hash = `#/read/${encodeURI(path)}`;
  }, nextLessonPath);
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).toContainText('CIA');
  await page.waitForTimeout(1100);
  await expect(page.getByRole('article').getByRole('heading', { level: 1 })).not.toContainText(
    '迟到',
  );
});

test('纯开放面试卷保留追问和自评，不生成虚假百分制成绩', async ({ page }) => {
  await page.goto(read('exams/09-ai-agent-security/压力面-题目.md'));
  await expect(page.getByRole('group', { name: /^第 \d+ 题/ })).toHaveCount(10);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: '第 1 题学习笔记', exact: true })
    .fill('最终授权应由模型之外的执行器核验。');
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩' })).toContainText('本卷采用自评');
  await expect(page.getByRole('status', { name: '客观题成绩' })).not.toContainText('100 分');
  await page
    .getByRole('group', { name: /^第 1 题/ })
    .getByRole('button', { name: '查看解析', exact: true })
    .click();
  await expect(page.getByRole('region', { name: '第 1 题解析', exact: true })).toContainText(
    '追问',
  );
});
