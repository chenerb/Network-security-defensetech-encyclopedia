import { test } from 'node:test';
import assert from 'node:assert/strict';
const api: Record<string, any> = await import('../src/lib/progress.ts').catch(() => ({}));
const valid = {
  lessonIds: ['ch/one', 'ch/two'],
  documentPaths: ['docs/ch/one.md'],
  examIds: ['ch/one'],
};
const ready = () => assert.equal(typeof api.readProgress, 'function', '学习进度持久化尚未实现');
function store(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}

test('保存完成、收藏、作答和笔记后可以从同一存储恢复', () => {
  ready();
  const storage = store();
  const progress = {
    version: 1,
    completed: ['ch/one'],
    bookmarks: ['docs/ch/one.md'],
    lastPath: 'docs/ch/one.md',
    attempts: {
      'ch/one': {
        choices: { 1: 'B' },
        notes: { 6: '先核验权限' },
        revealed: [1],
        submitted: true,
        updatedAt: '2026-10-15T10:00:00Z',
      },
    },
  };
  assert.equal(api.writeProgress(storage, progress), true);
  assert.deepEqual(api.readProgress(storage, valid).progress, progress);
});

test('坏JSON、不支持的版本与空值会恢复可用的空进度', () => {
  ready();
  for (const raw of [
    '{broken',
    'null',
    '[]',
    '{"version":99}',
    '"text"',
    '{"version":1,"completed":"oops","bookmarks":null,"attempts":[],"lastPath":7}',
  ]) {
    const result = api.readProgress(store(raw), valid);
    assert.deepEqual(result.progress.completed, []);
    assert.deepEqual(result.progress.bookmarks, []);
    assert.ok(result.warning);
  }
  assert.equal(api.readProgress(store(), valid).warning, null);
});

test('恢复时去重并过滤未知课程、文档、试卷与无效答案', () => {
  ready();
  const raw = JSON.stringify({
    version: 1,
    completed: ['ch/one', 'ch/one', 7, 'unknown'],
    bookmarks: ['docs/ch/one.md', '../.env'],
    lastPath: 'bad',
    attempts: {
      'ch/one': {
        choices: { 1: 'B', 2: 'X', '-1': 'A' },
        notes: { 6: '保留', 7: {} },
        revealed: [1, 1, -2],
        submitted: true,
        updatedAt: 'bad',
      },
      unknown: {},
      __proto__: { polluted: true },
    },
  });
  const p = api.readProgress(store(raw), valid).progress;
  assert.deepEqual(p.completed, ['ch/one']);
  assert.deepEqual(p.bookmarks, ['docs/ch/one.md']);
  assert.equal(p.lastPath, null);
  assert.deepEqual(p.attempts['ch/one'].choices, { 1: 'B' });
  assert.deepEqual(p.attempts['ch/one'].notes, { 6: '保留' });
  assert.deepEqual(p.attempts['ch/one'].revealed, [1]);
  assert.deepEqual(Object.keys(p.attempts), ['ch/one']);
  assert.equal(({} as any).polluted, undefined);
});

test('存储被禁用或写满时返回失败状态，不阻止继续阅读', () => {
  ready();
  const blocked = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.ok(api.readProgress(blocked, valid).warning);
  assert.equal(api.writeProgress(blocked, api.emptyProgress()), false);
});
