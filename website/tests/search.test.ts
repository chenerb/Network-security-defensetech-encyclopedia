import { test } from 'node:test';
import assert from 'node:assert/strict';
const api: Record<string, any> = await import('../src/lib/search.ts').catch(() => ({}));
const entries = [
  {
    path: 'a.md',
    title: '哈希与消息认证',
    text: 'HMAC 不是加密，nonce 需要根据模式管理。',
    kind: 'lesson',
    chapterId: '02',
  },
  {
    path: 'b.md',
    title: 'Nonce 管理',
    text: '重启、并发和回滚需要验证唯一性。',
    kind: 'lesson',
    chapterId: '02',
  },
  {
    path: 'c.md',
    title: '密码学综合卷',
    text: '说明 nonce 和密钥的关系。',
    kind: 'question',
    chapterId: '02',
  },
];
const ready = () => assert.equal(typeof api.searchDocuments, 'function', '全文搜索尚未实现');

test('中文全文和英文大小写搜索命中正文并优先标题', () => {
  ready();
  assert.deepEqual(
    api.searchDocuments('nONce', entries).map((r: any) => r.entry.path),
    ['b.md', 'a.md', 'c.md'],
  );
  assert.equal(api.searchDocuments('不是加密', entries)[0].entry.path, 'a.md');
});

test('多个词要求同时满足，支持类型筛选与无结果', () => {
  ready();
  assert.deepEqual(
    api.searchDocuments('nonce 密钥', entries).map((r: any) => r.entry.path),
    ['c.md'],
  );
  assert.deepEqual(
    api.searchDocuments('nonce', entries, 'question').map((r: any) => r.entry.path),
    ['c.md'],
  );
  assert.deepEqual(api.searchDocuments('不存在的词', entries), []);
  assert.deepEqual(api.searchDocuments('   ', entries), []);
});
