# 前端学习网站设计

## 意图与范围

用户要求进一步优化项目，此前明确询问前端学习网站，而当前仅有教材与题库。这轮交付可本地运行、可静态构建的学习网站，连接正文、练习和复习。沿用用户“直接开发至结束”的执行偏好；本地开发完成后验证和保留提交，不自动公开部署。

## 体验与视觉

界面是安静的中文学习工作台。左侧十章课程导航，中央呈现学习地图、正文或练习，阅读时右侧显示本节目录。移动端目录折叠为抽屉。主色为深蓝墨色 #172b4d、阅读白 #ffffff、底色 #f3f6fa、行动蓝 #315fc4、辅助青 #26776c 和练习琥珀 #ae7830；系统中文无衬线为正文，宋体用于首页标题，避免外部字体依赖。章节编号表达真实顺序；防御路径图作为首页的主要视觉，而非装饰性图表。

```text
顶栏：品牌 / 学习地图 / 练习中心 / 搜索
左侧课程目录 | 中央学习内容与下一步 | 阅读时的节内目录
```

首页给出继续学习入口和四段防御路径，课程目录按十章展开，练习中心可按章和类型筛选。正文支持锚点、表格、代码、引用和仓库内导航；提供上一节、下一节、配套练习、收藏和完成标记。搜索覆盖正文、题目和学习参考资料，答案不参与默认搜索以免泄题。

选择题可选答案并核对，开放题保存学习笔记、显示评分要点。分数只计算可自动判断的选择题，主观题明确要求自评，不给虚假的满分或能力认证。进度、收藏、笔记和作答仅保存在当前浏览器；存储损坏或不可写时网站仍可阅读并给出状态提示。

## 架构与契约

采用 React、TypeScript、Vite；Markdown 仍为唯一内容来源。构建前用 Node 脚本读取 SUMMARY、40 篇正文、140 个试卷文件及指定参考文档，生成小型目录、延迟加载的搜索索引、逐卷 JSON 和原文资源。生成目录和构建产物不入版本库。hash 路由与相对资源路径支持部署在子目录；静态服务器无须配置页面回退。

共用类型定义在 website/src/types.ts。catalog 模块导出 catalog、getDocument(path)、getLesson(id)、getExam(id)、loadMarkdown(path, signal?)、loadPaper(id, signal?) 和 loadSearchIndex(signal?)。课程/试卷 id 为章节目录加文件 stem；DocumentEntry.path 为仓库相对路径。试卷解析必须核对每套总分100、题答编号一致、每道选择题四项及唯一答案；发现不支持的格式时构建失败并指出源文件，不跳过题目。

路径模块导出 routeForPath(path, section?) 与 resolveContentLink(href, sourcePath)。前者生成 #/read/ 后接编码的仓库路径，可用 section 查询项定位标题。后者返回 { type: route|asset|external|blocked, href }，外链仅允许 https/http/mailto，内部路径必须在已生成文档或静态资源允许列表内。Markdown 经 marked 解析后由 DOMPurify 清理，再重写链接；禁止脚本、事件属性和危险协议。

ReaderPage 接收 document、progress、section、onToggleComplete(lessonId)、onToggleBookmark(path)、onAttemptChange(examId, attempt)。它负责原文/试卷加载、阅读目录、练习与错误重试；外壳负责路由、导航、搜索和持久化。ExamAttempt 与 LearningProgress 的版本和字段以共用类型为准。

## 验收

40 篇课程和70套试卷全部入站、662题不丢失；所有允许的 Markdown 导航可以站内阅读或下载。桌面与390px移动端无横向页面溢出，键盘能操作导航、搜索和答题。刷新后进度与笔记保留，坏路由和加载失败可恢复。安全回归涵盖 HTML/危险链接、恶意存储与越界路径。运行原有33项Python测试、内容检查、前端行为测试、TypeScript检查、生产构建和真实浏览器端到端测试；最后独立复核并记录结果。
