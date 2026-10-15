import { expect, test, type Page } from '@playwright/test';

const first = '/#/read/docs/01-introduction/01-what-is-cybersecurity.md';
const second = '/#/read/docs/02-cryptography/01-symmetric-encryption.md';
const recordKey = 'defense-learning-progress:v1';
const exam = '/#/read/exams/01-introduction/01-what-is-cybersecurity-%E9%A2%98%E7%9B%AE.md';
const examId = '01-introduction/01-what-is-cybersecurity';

async function openPeer(page: Page, path: string) {
  const popup = page.waitForEvent('popup');
  await page.evaluate((path) => {
    Reflect.set(window, 'reviewPeer', window.open(path, 'learning-record-peer'));
  }, path);
  return popup;
}

type InTaskAction = { peer: boolean } & (
  { note: number; text: string } | { choice: number; key: string } | { button: string }
);

// Keep A's task running while B writes, so A cannot receive its queued storage event yet.
async function beforeStorageDelivery(page: Page, actions: InTaskAction[]) {
  return page.evaluate(
    ({ actions, key }) => {
      return actions.map((action) => {
        const realm = action.peer
          ? (Reflect.get(window, 'reviewPeer') as Window & typeof globalThis)
          : window;
        if ('note' in action) {
          const textarea = realm.document.querySelector(`#question-${action.note} textarea`);
          const setter = Object.getOwnPropertyDescriptor(
            realm.HTMLTextAreaElement.prototype,
            'value',
          )!.set!;
          setter.call(textarea, action.text);
          textarea!.dispatchEvent(new realm.Event('input', { bubbles: true }));
        } else if ('choice' in action) {
          const radio = realm.document.querySelector<HTMLInputElement>(
            `#question-${action.choice} input[type="radio"][value="${action.key}"]`,
          );
          if (!radio) throw new Error(`Missing choice: ${action.choice}/${action.key}`);
          radio.click();
        } else {
          const button = [...realm.document.querySelectorAll<HTMLButtonElement>('button')].find(
            (button) => button.textContent?.trim() === action.button,
          );
          if (!button) throw new Error(`Missing button: ${action.button}`);
          const confirm = realm.confirm;
          realm.confirm = () => true;
          try {
            button.click();
          } finally {
            realm.confirm = confirm;
          }
        }
        return JSON.parse(localStorage.getItem(key)!);
      });
    },
    { actions, key: recordKey },
  );
}

test('same-paper notes use the latest attempt before storage events arrive', async ({ page }) => {
  await page.goto(exam);
  await page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true }).waitFor();
  const other = await openPeer(page, exam);
  await other.getByRole('textbox', { name: '第 10 题学习笔记', exact: true }).waitFor();
  const snapshots = await beforeStorageDelivery(page, [
    { peer: true, note: 10, text: '另一页刚保存的第十题。' },
    { peer: false, note: 9, text: '当前页随后保存的第九题。' },
  ]);
  expect(snapshots[0].attempts[examId].notes).toEqual({ 10: '另一页刚保存的第十题。' });
  expect(snapshots[1].attempts[examId].notes).toEqual({
    9: '当前页随后保存的第九题。',
    10: '另一页刚保存的第十题。',
  });
  await expect(page.getByRole('textbox', { name: '第 10 题学习笔记', exact: true })).toHaveValue(
    '另一页刚保存的第十题。',
  );
});

test('same-paper clear is not undone by an edit before storage events arrive', async ({ page }) => {
  await page.goto(exam);
  await page
    .getByRole('textbox', { name: '第 10 题学习笔记', exact: true })
    .fill('待清空的旧笔记。');
  const other = await openPeer(page, exam);
  await expect(other.getByRole('textbox', { name: '第 10 题学习笔记', exact: true })).toHaveValue(
    '待清空的旧笔记。',
  );
  const snapshots = await beforeStorageDelivery(page, [
    { peer: true, button: '清空作答和笔记' },
    { peer: false, note: 9, text: '清空后新增的笔记。' },
  ]);
  expect(snapshots[0].attempts[examId].notes).toEqual({});
  expect(snapshots[1].attempts[examId].notes).toEqual({ 9: '清空后新增的笔记。' });
});

test('submitted choices stay locked before the other tab receives its storage event', async ({
  page,
}) => {
  await page.goto(exam);
  await page.getByRole('textbox', { name: '第 9 题学习笔记', exact: true }).waitFor();
  const other = await openPeer(page, exam);
  await other.getByRole('textbox', { name: '第 9 题学习笔记', exact: true }).waitFor();
  const snapshots = await beforeStorageDelivery(page, [
    { peer: true, choice: 1, key: 'C' },
    { peer: true, button: '核对答案' },
    { peer: false, choice: 1, key: 'A' },
  ]);
  expect(snapshots[1].attempts[examId]).toMatchObject({ choices: { 1: 'C' }, submitted: true });
  expect(snapshots[2].attempts[examId]).toMatchObject({ choices: { 1: 'C' }, submitted: true });
  const firstQuestion = page.getByRole('group', { name: /^第 1 题/ });
  await expect(firstQuestion.getByRole('radio', { name: /^C[.、\s]/ })).toBeChecked();
  await expect(firstQuestion.getByRole('radio', { name: /^A[.、\s]/ })).toBeDisabled();
});

test('unsaved work detects an external write before its storage event arrives', async ({
  page,
}) => {
  await page.goto(first);
  await page.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).waitFor();
  const other = await openPeer(page, second);
  await other.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).waitFor();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Reflect.set(window, 'restoreStorageWrite', () => {
      Storage.prototype.setItem = original;
    });
    Storage.prototype.setItem = () => {
      throw new DOMException('Regression fixture: temporarily full', 'QuotaExceededError');
    };
  });
  await page.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).click();
  await expect(page.locator('.storage-notice')).toContainText('当前浏览器无法保存进度');
  await page.evaluate(() => Reflect.get(window, 'restoreStorageWrite')());
  const snapshots = await beforeStorageDelivery(page, [
    { peer: true, button: '标记为已学' },
    { peer: false, button: '加入收藏' },
  ]);
  expect(snapshots[0].completed).toEqual(['02-cryptography/01-symmetric-encryption']);
  expect(snapshots[1]).toEqual(snapshots[0]);
  await expect(
    page.locator('.reader-toolbar').getByRole('button', { name: '已学完' }),
  ).toBeVisible();
  await expect(
    page.locator('.reader-toolbar').getByRole('button', { name: '已收藏' }),
  ).toBeVisible();
  await expect(page.locator('.storage-notice')).toContainText('刷新');
});

test('other tabs receive completion, cancellation and clearing without reviving old records', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await page.goto(first);
  await other.goto(second);
  const firstTools = page.locator('.reader-toolbar');
  const otherTools = other.locator('.reader-toolbar');
  await firstTools.getByRole('button', { name: '标记为已学', exact: true }).click();
  await expect(other.locator('.desktop-sidebar .sidebar-progress')).toContainText('已学 1 / 40');
  await otherTools.getByRole('button', { name: '标记为已学', exact: true }).click();
  await expect(page.locator('.desktop-sidebar .sidebar-progress')).toContainText('已学 2 / 40');
  await firstTools.getByRole('button', { name: '加入收藏', exact: true }).click();
  await otherTools.getByRole('button', { name: '加入收藏', exact: true }).click();
  await firstTools.getByRole('button', { name: '已学完', exact: true }).click();
  await expect(other.locator('.desktop-sidebar .sidebar-progress')).toContainText('已学 1 / 40');
  await page.reload();
  await expect(firstTools.getByRole('button', { name: '标记为已学', exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), recordKey);
  expect(saved.bookmarks).toEqual([
    'docs/01-introduction/01-what-is-cybersecurity.md',
    'docs/02-cryptography/01-symmetric-encryption.md',
  ]);
  await page.goto('/#/progress');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '清除本地记录', exact: true }).click();
  await expect(otherTools.getByRole('button', { name: '标记为已学', exact: true })).toBeVisible();
  await expect(otherTools.getByRole('button', { name: '加入收藏', exact: true })).toBeVisible();
  await otherTools.getByRole('button', { name: '加入收藏', exact: true }).click();
  await expect(page.getByRole('main').getByRole('link', { name: '对称加密' })).toBeVisible();
  await other.evaluate((key) => localStorage.removeItem(key), recordKey);
  await expect(page.getByRole('main').getByText('把想再读的内容留在这里')).toBeVisible();
});

test('an invalid record from another tab preserves visible work and is not overwritten by navigation', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await page.goto(first);
  await other.goto(second);
  await other.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).click();
  await page.evaluate((key) => localStorage.setItem(key, '{broken-backup'), recordKey);
  await expect(other.locator('.storage-notice')).toContainText('学习记录');
  await expect(
    other.locator('.reader-toolbar').getByRole('button', { name: '已学完' }),
  ).toBeVisible();
  await other.locator('.reader-toolbar').getByRole('link', { name: '课程目录' }).click();
  await other
    .getByRole('main')
    .locator('a[href="#/read/docs/01-introduction/01-what-is-cybersecurity.md"]')
    .click();
  await expect(other.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await other.evaluate((key) => localStorage.getItem(key), recordKey)).toBe(
    '{broken-backup',
  );
});

test('unsaved work stays in memory after an external clear and cannot overwrite it when writes recover', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await page.goto(first);
  await other.goto(second);
  await page.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).waitFor();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorageWrite: () => void }).restoreStorageWrite = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Regression fixture: temporarily full', 'QuotaExceededError');
    };
  });
  await page.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).click();
  await expect(page.locator('.storage-notice')).toContainText('当前浏览器无法保存进度');
  await other.locator('.reader-toolbar').getByRole('button', { name: '标记为已学' }).click();
  await other.goto('/#/progress');
  other.once('dialog', (dialog) => dialog.accept());
  await other.getByRole('button', { name: '清除本地记录', exact: true }).click();
  await expect(page.locator('.storage-notice')).toContainText('未保存');
  await expect(
    page.locator('.reader-toolbar').getByRole('button', { name: '已学完' }),
  ).toBeVisible();
  const cleared = await other.evaluate((key) => localStorage.getItem(key), recordKey);
  expect(JSON.parse(cleared!).completed).toEqual([]);
  await page.evaluate(() => {
    (window as unknown as { restoreStorageWrite: () => void }).restoreStorageWrite();
    window.location.hash = '#/read/docs/01-introduction/03-defense-in-depth.md';
  });
  const tools = page.locator('.reader-toolbar');
  await expect(tools.getByRole('button', { name: '加入收藏', exact: true })).toBeVisible();
  expect.soft(await page.evaluate((key) => localStorage.getItem(key), recordKey)).toBe(cleared);
  await tools.getByRole('button', { name: '加入收藏', exact: true }).click();
  await expect(tools.getByRole('button', { name: '已收藏', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), recordKey)).toBe(cleared);
  await expect(page.locator('.storage-notice')).toContainText('刷新');
});

test('mobile navigation reaches exercises and learning records from an article', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(first);
  await page.getByRole('button', { name: '打开课程目录', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: '课程目录抽屉' });
  const navigation = drawer.getByRole('navigation', { name: '移动端主导航' });
  await navigation.getByRole('link', { name: '练习中心', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/#\/exams$/);
  await page.getByRole('button', { name: '打开课程目录', exact: true }).click();
  await navigation.getByRole('link', { name: '我的学习', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/#\/progress$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
