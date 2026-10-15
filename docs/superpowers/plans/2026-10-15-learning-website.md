# 前端学习网站 Implementation Plan

> **For agentic workers:** 使用并行子任务开发独立模块，主任务整合、浏览器验证并收尾；按用户已授权的连续开发方式执行。

**Goal:** 为现有教材提供可运行、可构建的学习网站。

**Architecture:** Markdown 构建为目录及按需加载内容；React 外壳连接阅读、练习、搜索和本地进度。

**Tech Stack:** Node 24+、React、TypeScript、Vite、marked、DOMPurify、Node test、Playwright。

**Spec:** [设计说明](../specs/2026-10-15-learning-website-design.md)。

## Global Constraints

- 复用40篇正文、70套试卷、662题；Markdown为唯一内容来源，不复制修改教材来适配界面。
- 生成数据与构建目录忽略提交；页面无账号、外部字体、跟踪或后端服务依赖。
- hash路由、相对资源；本地浏览器存储；未知格式构建失败并报告来源。
- 共用类型以 website/src/types.ts 为准。独立模块不改其他任务所有文件，不单独提交或推送。

## Review Focus

- 试卷三种选项排版与分值格式，全部662题应被保留并正确识别。
- 路由和Markdown里的中文、空格、锚点、父目录路径与站点子路径。
- 外部HTML、危险链接和存储污染不能变成脚本或权限。
- 存储不可用、加载失败、坏链接和快速切换页面应给出可恢复状态。
- 移动端抽屉、搜索焦点、键盘答题与长表格只在容器内滚动。

## Task 1：内容构建与数据接口

**Files:** scripts/build-site.mjs、scripts/site-content.mjs、website/src/lib/data.ts、website/tests/content.test.ts。

**Interfaces:** 生成 catalog.json、search.json、papers 与原文资源；导出设计规定的数据API。

- [x] 用手工夹具先验证题号配对、不同排版、分值及正确答案，观察失败。
- [x] 实现生成器和数据接口；全库40/70/662验收，异常格式不静默跳过。
- [x] 验证缺文件、重复编号、无效选择答案与非100分拒绝构建。

## Task 2：阅读与练习

**Files:** website/src/components/ReaderPage.tsx、Markdown.tsx、ExamView.tsx、reader.css；website/src/lib/markdown.ts；对应测试。

**Interfaces:** ReaderPage props及数据接口由设计规定；共享CSS变量由主任务维护。

- [x] 先用浏览器行为用例定义安全渲染、加载失败、题目作答、解析和笔记持久化。
- [x] 实现安全Markdown、目录锚点、文章翻页和练习入口。
- [x] 实现四种练习模式与客观题核对，开放题按要点自评，状态交由父级持久化。

## Task 3：网站外壳与学习状态

**Files:** 根目录package/锁文件/Vite配置、website/index.html、website/src/App.tsx、main.tsx、styles.css、components/Icon.tsx、lib/paths.ts、lib/progress.ts、lib/search.ts及测试。

- [x] 先验证路径越界/危险协议、坏存储/失败存储、搜索与去重等行为。
- [x] 实现首页、防御路径、课程目录、练习筛选、学习进度和收藏。
- [x] 实现搜索对话框、键盘焦点、手机目录、加载和错误状态。

## Task 4：验收与维护

**Files:** website/e2e、Playwright配置、README、DEVELOPMENT_LOG、CONTRIBUTING、CLAUDE、CI与.gitignore。

- [x] 构建生产站点，验证子目录静态托管及首次/刷新访问。
- [x] 运行安全、持久化、答题、导航、搜索和移动端真实浏览器用例。
- [x] 执行原有Python检查、前端测试、类型检查、生产构建与差异检查。
- [x] 独立复核，修复后重验；记录运行命令和实际验证结果。

## 验收记录

2026-10-15：已接入40课程、70套试卷、662题；308选择题与354开放题分开评阅。35项Python测试、26项Node行为测试、20项真实浏览器测试、TypeScript检查、格式检查与生产构建通过。独立复核发现的路径、存储、搜索和焦点问题均已加回归修正。199份源Markdown检查零错误，生成/生产副本不重复计数。桌面1440px与手机390px已截图检查，/study/静态子路径已实测。详细命令与边界见网站README及开发日志。
