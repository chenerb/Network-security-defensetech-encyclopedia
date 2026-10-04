# XSS 与 CSRF：区分浏览器中的两条信任边界

> **学习范围**：本文仅用于教育学习与授权防御；威胁背景服务于防御设计。

## 概述

网页显示了一段不可信文字，与浏览器替你发送了一个操作请求，为什么需要不同防御？跨站脚本（Cross-Site Scripting，XSS）让不可信内容成为可信站点的执行代码；跨站请求伪造（Cross-Site Request Forgery，CSRF）借浏览器自动携带的凭据诱发操作。本篇仅用于教育与合法防御。

## 历史背景

交互网站允许留言、模板和客户端渲染，带来反射型、存储型与 DOM 型 XSS 风险。基于 Cookie 的登录让浏览器自动附带会话信息，也推动了 CSRF 防御。现代框架、Cookie 属性与浏览器策略降低部分风险，但应用仍要正确处理上下文和操作授权。

## 核心原理

XSS 的关键不是文本含有某个字符，而是文本进入了哪种解释器。HTML 正文、带引号属性、JavaScript、CSS 和 URL 的语法不同，要使用对应的输出编码（Output Encoding），尽量避免把不可信数据放入危险脚本或样式上下文。显示纯文本优先使用安全文本 API；富文本必须经过维护中的 HTML 净化器，允许有限标签与属性。编码和净化服务于不同目标。

内容安全策略（Content Security Policy，CSP）能限制脚本来源及执行方式，是纵深防御。宽泛来源、任意内联脚本或不正确 nonce 使用会削弱效果；CSP 不应替代输出处理。HttpOnly 限制脚本读取 Cookie，但同源脚本仍可能发起已登录操作，因此不能称为完整 XSS 防护。

CSRF 常见前提是请求自动携带身份凭据。服务端可验证不可预测、绑定会话的令牌，或采用正确绑定与签名的双提交方案；同时检查请求来源，配置合适的 SameSite Cookie。SameSite 涉及“站点”，同源策略涉及“源”，同站子域也不能默认互信。CORS 主要控制跨源脚本读取响应，不是通用 CSRF 防线。

状态变更不使用 GET。令牌缺失或验证失败时，服务端拒绝操作，不能只是隐藏按钮。已有 XSS 可能读取令牌或调用同源接口，因此 CSRF 防御不能修复 XSS。敏感操作还应有业务授权、确认或再认证。

> 🧠 费曼自问：保管身份证和核验每次转账意图，为什么是不同任务？

## 通俗解释

XSS 像陌生人把公告文字改成办公楼内部指令；CSRF 像外人诱导快递员带着你的通行证去办理业务。前者要管文字是否变成指令，后者要核验请求确实来自你的操作流程。

## 📖 寓言故事

学校有块电子公告板和一间借书室。老师把家长留言直接交给公告板的自动助手，某段留言被误当成老师的命令，助手开始更改通知。另一边，借书室只看学生证，外校传来的“活动报名单”却诱导学生顺手提交借书请求。校长先给学生证加封套，以为问题解决，助手仍能发出命令，报名单也仍能被送到借书室。后来公告板只把留言当文字显示，借书室要求每次操作带本次流程的确认凭条，并核对借阅权限。校长还限制了助手可执行的任务。寓意是：内容执行边界与请求意图边界必须分别保护，辅助限制也不能替代主防线。

## 防御步骤

1. 追踪不可信内容的所有输出点，记录具体 HTML、脚本和 URL 上下文。
2. 使用框架默认安全输出和文本 API；富文本净化，避免危险 DOM 接口和任意脚本插入。
3. 逐步部署严格 CSP，先观察报告再执行，配合依赖审核与安全 Cookie。
4. 对状态变更验证 CSRF 令牌及来源，选用合适 SameSite，拒绝不符合业务方法的请求。
5. 验证缺失、过期、跨会话令牌与跨角色访问，检查日志不泄露令牌和个人内容。

## 优缺点分析

框架自动编码减少重复工作，但绕过默认接口会重新引入风险；净化器允许格式却需要更新。令牌可靠性依赖服务端正确绑定，SameSite 可能影响单点登录等跨站流程，应通过具体测试确定配置。

## 应用场景

论坛、工单和富文本编辑器重视 XSS；修改邮箱、转账和管理操作重视 CSRF、授权与意图确认。单页应用也需要根据真实凭据传递方式分析风险。

## 实践建议

在本地虚构页面中检查纯文本渲染和编码结果，用人工设计的合法边界文字验证。不要用“过滤一个标签”作为验收标准，也不要因采用 JSON API 就自动认为 CSRF 不可能。

## 🧠 费曼自测

1. HTML 正文编码为什么不能直接替代所有上下文处理？
2. 富文本净化与输出编码有何区别？
3. 为什么 HttpOnly 和 CORS 都不是完整防线？
4. 为什么 CSRF 令牌挡不住已有的同源 XSS？

## 总结

XSS 防御控制内容何时成为代码；CSRF 防御验证自动带凭据请求的来源与意图。两者与授权共同工作，CSP、Cookie 属性提供额外保护。

## 参考文献

核验日期：2026-10-04。持续更新文档以核验时页面为准；历史指南不代表产品当前默认配置。

1. [OWASP：Cross Site Scripting Prevention（持续更新）](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
2. [OWASP：Cross-Site Request Forgery Prevention（持续更新）](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
3. [OWASP：Content Security Policy（持续更新）](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## 相关链接

- [上一篇](02-sql-injection.md)
- [下一篇](04-secure-coding.md)
- [节末小测题目](../../exams/06-web-application-security/03-xss-csrf-题目.md)
- [节末小测答案解析](../../exams/06-web-application-security/03-xss-csrf-答案解析.md)
- [章节综合卷](../../exams/06-web-application-security/章节测验-题目.md)
- [挑战卷](../../exams/06-web-application-security/挑战卷-题目.md)
- [压力面](../../exams/06-web-application-security/压力面-题目.md)
