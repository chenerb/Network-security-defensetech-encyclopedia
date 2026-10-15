import { test } from 'node:test';
import assert from 'node:assert/strict';

const api: Record<string, any> = await import('../src/lib/paths.ts').catch(() => ({}));
const ready = () => assert.equal(typeof api.resolveContentLink, 'function', '站内链接解析尚未实现');

test('Markdown中文试卷链接与标题片段变成可分享的站内路由', () => {
  ready();
  const result = api.resolveContentLink(
    '../../exams/02-cryptography/章节测验-题目.md#评分',
    'docs/02-cryptography/01-symmetric-encryption.md',
  );
  assert.deepEqual(result, {
    type: 'route',
    href: '#/read/exams/02-cryptography/%E7%AB%A0%E8%8A%82%E6%B5%8B%E9%AA%8C-%E9%A2%98%E7%9B%AE.md?section=%E8%AF%84%E5%88%86',
  });
  assert.deepEqual(api.parseRoute(result.href), {
    view: 'document',
    path: 'exams/02-cryptography/章节测验-题目.md',
    section: '评分',
  });
});

test('根路径及当前文档锚点保持在阅读器内', () => {
  ready();
  assert.deepEqual(
    api.resolveContentLink('/LEARNING_GUIDE.md', 'docs/02-cryptography/01-symmetric-encryption.md'),
    { type: 'route', href: '#/read/LEARNING_GUIDE.md' },
  );
  assert.equal(
    api.resolveContentLink('#核心原理', 'docs/02-cryptography/01-symmetric-encryption.md').href,
    '#/read/docs/02-cryptography/01-symmetric-encryption.md?section=%E6%A0%B8%E5%BF%83%E5%8E%9F%E7%90%86',
  );
});

test('危险协议、越界文件和内部维护文档不可作为学习链接', () => {
  ready();
  for (const href of [
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,hi',
    'file:///etc/passwd',
    '../../../../.env',
    '/docs/superpowers/specs/private.md',
    '/CLAUDE.md',
    '/images/../.env',
    '%E0%A4%A',
  ]) {
    assert.equal(
      api.resolveContentLink(href, 'docs/01-introduction/01-what-is-cybersecurity.md').type,
      'blocked',
      href,
    );
  }
});

test('允许的图片和离线示例使用子目录安全的静态资源地址', () => {
  ready();
  assert.deepEqual(
    api.resolveContentLink(
      '../../images/defense-workflow.svg',
      'docs/01-introduction/03-defense-in-depth.md',
    ),
    { type: 'asset', href: './content/images/defense-workflow.svg' },
  );
  assert.deepEqual(api.resolveContentLink('integrity_hmac.py', 'examples/README.md'), {
    type: 'asset',
    href: './content/examples/integrity_hmac.py',
  });
  assert.equal(
    api.resolveContentLink('https://www.nist.gov/example', 'README.md').type,
    'external',
  );
});

test('畸形或不支持的hash进入可恢复的未找到页', () => {
  ready();
  for (const route of [
    '#/read/%E0%A4%A',
    '#/read/../.env',
    '#/read/docs/superpowers/specs/a.md',
    '#/whatever',
  ])
    assert.deepEqual(api.parseRoute(route), { view: 'not-found' });
  assert.deepEqual(api.parseRoute(''), { view: 'home' });
  assert.deepEqual(api.parseRoute('#/exams'), { view: 'exams' });
});

test('目录形式合法但未构建的文档不能进入路由', () => {
  ready();
  const unknown = 'docs/02-cryptography/99-does-not-exist.md';
  assert.equal(api.routeForPath(unknown), '#/not-found');
  assert.deepEqual(api.parseRoute('#/read/' + unknown), { view: 'not-found' });
  assert.equal(
    api.resolveContentLink(
      '99-does-not-exist.md',
      'docs/02-cryptography/01-symmetric-encryption.md',
    ).type,
    'blocked',
  );
  assert.equal(
    api.resolveContentLink(
      '../../exams/02-cryptography/missing-题目.md',
      'docs/02-cryptography/01-symmetric-encryption.md',
    ).type,
    'blocked',
  );
});

test('规范化之前拒绝越过仓库根的父级路径且保留合法返回首页', () => {
  ready();
  const source = 'docs/02-cryptography/01-symmetric-encryption.md';
  assert.deepEqual(api.resolveContentLink('../../README.md', source), {
    type: 'route',
    href: '#/read/README.md',
  });
  assert.deepEqual(api.resolveContentLink('%2e%2e/%2e%2e/README.md', source), {
    type: 'route',
    href: '#/read/README.md',
  });
  for (const href of [
    '../../../../README.md',
    '../../../README.md',
    '/../../README.md',
    '%2e%2e/%2e%2e/%2e%2e/README.md',
    '..%2f..%2f..%2fREADME.md',
    '%252e%252e/%252e%252e/README.md',
    '%252e%252e%252fREADME.md',
  ])
    assert.equal(api.resolveContentLink(href, source).type, 'blocked', href);
});

test('静态资源仍受白名单限制且允许http和mailto外链', () => {
  ready();
  assert.equal(
    api.resolveContentLink(
      '../../examples/unknown.py',
      'docs/02-cryptography/01-symmetric-encryption.md',
    ).type,
    'blocked',
  );
  assert.equal(api.resolveContentLink('http://example.org/guide', 'README.md').type, 'external');
  assert.deepEqual(api.resolveContentLink('mailto:hello@example.org', 'README.md'), {
    type: 'external',
    href: 'mailto:hello@example.org',
  });
});
