import { expect, test } from '@playwright/test';

const paper = 'exams/01-introduction/01-what-is-cybersecurity-题目.md';
const read = (path: string) => `/#/read/${encodeURI(path)}`;

async function choose(page: import('@playwright/test').Page, number: number, key: string) {
  await page
    .getByRole('group', { name: new RegExp(`^第 ${number} 题`) })
    .getByRole('radio', { name: new RegExp(`^${key}[.、\\s]`) })
    .check();
}

test('进度区分选择作答与非空笔记，核对前不显示正确性，刷新后保留', async ({ page }) => {
  await page.goto(read(paper));
  const progress = page.getByRole('status', { name: '作答进度', exact: true });
  const navigation = page.getByRole('navigation', { name: '题目导航', exact: true });
  await expect(progress).toContainText('选择题已答 0 / 6');
  await expect(progress).toContainText('开放题有笔记 0 / 4');
  await choose(page, 1, 'C');
  await choose(page, 2, 'A');
  const notes = page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true });
  await notes.fill('   \n  ');
  await expect(progress).toContainText('开放题有笔记 0 / 4');
  await notes.fill('先说明威胁模型与保证前提。');
  await expect(progress).toContainText('选择题已答 2 / 6');
  await expect(progress).toContainText('开放题有笔记 1 / 4');
  await expect(
    navigation.getByRole('link', { name: '跳到第 1 题，已作答', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: '跳到第 2 题，已作答', exact: true }),
  ).toBeVisible();
  await expect(navigation.getByRole('link', { name: /正确|需复习/ })).toHaveCount(0);
  await expect(
    navigation.getByRole('link', { name: '跳到第 9 题，有笔记', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(progress).toContainText('选择题已答 2 / 6');
  await expect(progress).toContainText('开放题有笔记 1 / 4');
  await page.getByRole('button', { name: '跳到首个未答选择题', exact: true }).click();
  await expect(page.getByRole('group', { name: /^第 3 题/ })).toBeFocused();
  await expect(page).toHaveURL(/section=question-3/);
  const first = navigation.getByRole('link', { name: '跳到第 1 题，已作答', exact: true });
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: /^第 1 题/ })).toBeFocused();
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: /^第 1 题/ })).toBeFocused();
});

test('核对后成绩获得焦点，题号区分正确、需复习与未答，可直接跳到目标', async ({ page }) => {
  await page.goto(read(paper));
  await choose(page, 1, 'C');
  await choose(page, 2, 'A');
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  const score = page.getByRole('status', { name: '客观题成绩', exact: true });
  await expect(score).toContainText('8 / 48 分');
  await expect(score).toContainText('未答 4');
  await expect(score).toBeFocused();
  const navigation = page.getByRole('navigation', { name: '题目导航', exact: true });
  await expect(
    navigation.getByRole('link', { name: '跳到第 1 题，正确', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: '跳到第 2 题，需复习', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: '跳到第 3 题，未作答', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '跳到首道错题', exact: true }).click();
  await expect(page.getByRole('group', { name: /^第 2 题/ })).toBeFocused();
  await page.getByRole('button', { name: '跳到首个未答选择题', exact: true }).click();
  await expect(page.getByRole('group', { name: /^第 3 题/ })).toBeFocused();
  await page.reload();
  await expect(
    navigation.getByRole('link', { name: '跳到第 1 题，正确', exact: true }),
  ).toBeVisible();
  await expect(score).toContainText('8 / 48 分');
});

test('清空需要确认，取消不丢记录，保留笔记重做不触发清空确认', async ({ page }) => {
  await page.goto(read(paper));
  await choose(page, 1, 'C');
  const notes = page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true });
  await notes.fill('这份笔记需要保留。');
  const cancelledDialog = page.waitForEvent('dialog');
  const cancelClick = page.getByRole('button', { name: '清空作答和笔记', exact: true }).click();
  const firstDialog = await cancelledDialog;
  expect(firstDialog.type()).toBe('confirm');
  expect(firstDialog.message()).toContain('学习笔记');
  await firstDialog.dismiss();
  await cancelClick;
  await expect(notes).toHaveValue('这份笔记需要保留。');
  await expect(
    page.getByRole('group', { name: /^第 1 题/ }).getByRole('radio', { name: /^C[.、\s]/ }),
  ).toBeChecked();
  await page.reload();
  await expect(notes).toHaveValue('这份笔记需要保留。');
  await page.getByRole('button', { name: '重新作答，保留笔记', exact: true }).click();
  await expect(notes).toHaveValue('这份笔记需要保留。');
  await expect(page.getByRole('status', { name: '作答进度', exact: true })).toContainText(
    '选择题已答 0 / 6',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清空作答和笔记', exact: true }).click();
  await page.reload();
  await expect(notes).toHaveValue('');
  await expect(page.getByRole('status', { name: '作答进度', exact: true })).toContainText(
    '开放题有笔记 0 / 4',
  );
});

test('390px纯开放卷只显示笔记进度与自评，空白笔记不算完成且页面不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(read('exams/09-ai-agent-security/压力面-题目.md'));
  const progress = page.getByRole('status', { name: '作答进度', exact: true });
  const navigation = page.getByRole('navigation', { name: '题目导航', exact: true });
  await expect(progress).toContainText('开放题有笔记 0 / 10');
  await expect(page.getByRole('button', { name: '跳到首个未答选择题', exact: true })).toHaveCount(
    0,
  );
  const notes = page.getByRole('textbox', { name: '第 1 题学习笔记', exact: true });
  await notes.fill(' \n ');
  await expect(progress).toContainText('开放题有笔记 0 / 10');
  await notes.fill('最终授权由模型之外的执行器核验。');
  await expect(progress).toContainText('开放题有笔记 1 / 10');
  await page.getByRole('button', { name: '核对答案', exact: true }).click();
  await expect(page.getByRole('status', { name: '客观题成绩', exact: true })).toContainText(
    '本卷采用自评',
  );
  await expect(
    navigation.getByRole('link', { name: '跳到第 1 题，有笔记', exact: true }),
  ).toBeVisible();
  await expect(navigation.getByRole('link', { name: /正确|需复习/ })).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
});
