# 前端学习网站

网站将仓库教材连接成课程阅读、练习、搜索与学习记录。当前内容为 **40 篇课程、70 套试卷、662 道题**；Markdown 仍是内容来源，前端不维护另一份教材。

## 本机运行

需要 **Node.js 24 或更新版本**及 npm。以下命令都在仓库根目录执行：

```bash
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173`。开发命令会先生成网站内容，再启动 Vite；首次运行无需手工准备目录数据。

## 构建与静态预览

```bash
npm run build
npm run preview
```

构建会依次生成内容、检查 TypeScript，再输出到仓库根目录的 `dist/`。预览地址为 `http://127.0.0.1:4173`。静态托管时发布完整的 `dist/`，包括其中的内容资源。

[Vite 配置](../vite.config.ts)使用相对资源基址 `base: './'`，页面采用 hash 路由，例如 `#/read/docs/02-cryptography/01-symmetric-encryption.md`，因此可以放在静态站点的子目录，无须为阅读路径配置服务器页面回退。

验证 `/study/` 子目录：

```bash
npm run build
npm run preview -- --base /study/
```

打开 `http://127.0.0.1:4173/study/`，再检查阅读、练习和刷新。

网站没有离线 PWA 或 Service Worker 缓存。构建后仍需本地或静态 **HTTP 服务器**；不能通过双击 `dist/index.html`、使用 `file://` 代替预览，按需加载的原文和试卷依赖 HTTP 请求。

## 更新教材与生成数据

课程正文来自 `docs/`（[正文示例](../docs/01-introduction/01-what-is-cybersecurity.md)），题目和解析来自 `exams/`（[使用说明](../exams/README.md)），章节次序以 [SUMMARY.md](../SUMMARY.md) 为准。参考资料也从仓库指定 Markdown 文件读取。

修改 Markdown 后执行：

```bash
npm run content
```

然后刷新页面；重启 `npm run dev` 也会自动重新生成。开发服务器不会自动监视并重新解析仓库中全部 Markdown，不能只改原文而沿用旧的题库数据。

生成命令等价于：

```bash
node scripts/build-site.mjs
```

[生成入口](../scripts/build-site.mjs)调用[内容解析与校验](../scripts/site-content.mjs)，输出目录、搜索索引、逐卷 JSON 和原文资源：

| 位置 | 用途 |
|---|---|
| `website/src/generated/catalog.json` | 章节、课程、试卷和文档目录 |
| `website/public/content/search.json` | 搜索内容 |
| `website/public/content/papers/` | 逐卷题目、选项、分值及解析 |
| `website/public/content/` 下的其余生成文件 | 教材、题答原文与允许的静态资源 |

这些生成目录及 `dist/` 已在 [.gitignore](../.gitignore) 中排除，**不要直接编辑或提交**；应修改源 Markdown 后重新生成。数据契约定义在 [src/types.ts](src/types.ts)，按需读取由 [src/lib/data.ts](src/lib/data.ts) 提供。

生成器核对题号连续性、题答对应、选择题四项与唯一答案、分值合计等。格式不支持、数据不完整或验证不通过时，CLI 会报告源文件并阻止构建，不会静默丢题。结构验证不能代替技术内容和答案正确性的人工评审。

## 阅读、练习与记录

- 搜索覆盖正文、题目与参考资料，默认不索引答案解析，避免提前泄题。
- 选择题可以作答并核对；自动得分只包含 **308 道选择题**。其余 **354 道判断、简答、场景和面试题**作为开放题保存笔记，按解析中的要点评阅，不自动赋满分。
- 解析需通过“查看解析”或答案链接主动打开；重做可以保留笔记，也可以明确清空作答和笔记。
- 已学标记、收藏、上次阅读与作答记录保存在当前浏览器，不会跨设备或跨浏览器同步；清除站点数据或使用不同站点来源可能使记录不可见。
- “导出学习记录”生成 JSON 备份；**目前没有导入界面**，导出不代表网站可以自动恢复或迁移记录。存储不可写时会提示，但仍可阅读。

## 检查与浏览器测试

```bash
npm test
npm run check
npm run build
npm run test:e2e
```

`npm test` 运行内容、路径、搜索与本地进度等行为测试；`check` 检查类型；`build` 同时验证生成与生产构建。端到端配置会先准备生产构建，并启动开发服务与生产预览服务，分别验证学习流程和子目录托管。测试报告与临时产物不应提交；具体覆盖和结果以当前测试及实际运行输出为准。

真实浏览器测试需要 Chromium：

```bash
npx playwright install chromium
```

Linux CI 需要浏览器系统依赖时：

```bash
npx playwright install --with-deps chromium
```

macOS 若已安装 `/Applications/Google Chrome.app`，配置会自动复用系统 Chrome。服务与浏览器设置见 [Playwright 配置](../playwright.config.ts)，用例位于 `website/e2e/`，例如[阅读与练习行为测试](e2e/reader.spec.ts)。

## 实现边界

Markdown 使用 marked 解析、DOMPurify 清理，并按允许列表解析文档、图片和资源路径；危险协议、脚本与事件属性不会作为页面行为执行，外链使用 `noopener noreferrer`。实现见 [Markdown 渲染](src/lib/markdown.ts)与[路径解析](src/lib/paths.ts)。

网站不依赖外部字体、访问分析或后端账号登录。页面中的资料链接由读者选择访问；浏览器本地记录也不构成保密存储。当前交付是静态学习工作台，没有账户同步、服务端考试或防篡改成绩认证；已有清理与校验措施不应被解释为对任意部署环境的生产安全保证。
