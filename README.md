# 网络安全防御技术百科全书

> 一本系统全面、通俗易懂的网络安全防御技术教程文档

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
**版本：v1.0.0 · 完整首版**

---

## 📖 项目简介

本项目旨在系统梳理从传统信息安全防御到前沿 AI/Agent 安全的完整知识体系，帮助读者：

- **理解威胁本质**：从攻击者的视角理解威胁，从而更深刻地理解防御
- **掌握防御技术**：深入掌握加密、认证、隔离、检测、响应等核心防御手段的原理与直觉
- **应对前沿挑战**：系统学习 LLM 与 Agent 时代的全新攻防面（提示注入、数据投毒、AI 红队）
- **学以致用**：通过丰富的示例、寓言故事和测试卷，将理论转化为实战能力

> **核心理念**：安全是"防御者思维"的修炼——不是在攻击发生后补救，而是在攻击发生前建立纵深防御。

---

## 🧭 学习入口

本项目参考机器学习指南 ML-encyclopedia 的分层知识地图、故事化讲解、费曼自测和四级试卷体系，形成“理解原理 → 验证控制 → 场景复盘”的防御学习闭环。

- [学习指南](LEARNING_GUIDE.md)：按基础选路线、每章验收任务与带 Agent 网店综合练习。
- [全文目录](SUMMARY.md)：十章 40 篇正文。
- [试卷导航](exams/README.md)：全十章 70 套试卷，每套含独立题目与详细解析，共 140 个试卷文件。
- [离线实验](examples/README.md)：HMAC、参数化查询、Agent 模型外权限控制，仅需 Python 标准库。
- [术语定位](glossary/index.md)：缩写、定义与正文链接。
- [参考项目设计对照](REFERENCE_DESIGN.md)：本次如何借鉴机器学习指南。

## 🗺️ 知识地图

```
信任的根基（为什么能"信"）
├── 信息安全导论（CIA 三要素、威胁模型、纵深防御）
├── 密码学基础（对称/非对称加密、哈希、签名、PKI）
└── 身份认证与访问控制（口令/MFA、DAC/MAC/RBAC、零信任）
         ↓
边界的防御（在哪一道防线拦）
├── 网络安全防御（TLS、防火墙、IDS/IPS、VPN、DDoS）
├── 系统安全（OS 安全、内存安全、恶意软件、沙箱）
└── Web 与应用安全（OWASP、注入、XSS/CSRF、安全编码）
         ↓
数据与运营（出事前后怎么办）
├── 数据安全与隐私（数据生命周期、数据库安全、隐私保护）
└── 安全管理与运营（风险管理、SOC/SIEM、应急响应、红蓝对抗）
         ↓
前沿战场（AI 时代的新攻防）
└── AI 与 Agent 安全（LLM 安全、提示注入、投毒、Agent 架构、AI 红队）
```

---

## 📚 文档目录

### 第一章：信息安全导论
- [什么是网络安全与信息安全](docs/01-introduction/01-what-is-cybersecurity.md)
- [安全三要素：CIA 与威胁模型](docs/01-introduction/02-cia-triad-threat-model.md)
- [纵深防御与安全发展史](docs/01-introduction/03-defense-in-depth.md)

### 第二章：密码学基础
- [对称加密（AES）](docs/02-cryptography/01-symmetric-encryption.md)
- [非对称加密（RSA/ECC）](docs/02-cryptography/02-asymmetric-encryption.md)
- [哈希与消息认证码](docs/02-cryptography/03-hash-and-mac.md)
- [数字签名与公钥基础设施 PKI](docs/02-cryptography/04-digital-signature-pki.md)

### 第三章：身份认证与访问控制
- [口令与多因素认证](docs/03-authentication-access-control/01-password-mfa.md)
- [访问控制模型（DAC/MAC/RBAC）](docs/03-authentication-access-control/02-access-control-models.md)
- [单点登录与零信任](docs/03-authentication-access-control/03-sso-zero-trust.md)

### 第四章：网络安全防御
- [TLS 与 HTTPS](docs/04-network-security/01-tls-https.md)
- [防火墙与网络隔离](docs/04-network-security/02-firewall.md)
- [入侵检测与防御（IDS/IPS）](docs/04-network-security/03-ids-ips.md)
- [VPN 与加密隧道](docs/04-network-security/04-vpn.md)
- [DDoS 攻击与防御](docs/04-network-security/05-ddos-defense.md)

### 第五章：系统安全
- [操作系统安全机制](docs/05-system-security/01-os-security.md)
- [内存安全与漏洞利用](docs/05-system-security/02-memory-safety.md)
- [恶意软件分析与防御](docs/05-system-security/03-malware.md)
- [沙箱与虚拟化隔离](docs/05-system-security/04-sandbox-virtualization.md)

### 第六章：Web 与应用安全
- [OWASP Top 10 总览](docs/06-web-application-security/01-owasp-top10.md)
- [SQL 注入攻击与防御](docs/06-web-application-security/02-sql-injection.md)
- [XSS 与 CSRF](docs/06-web-application-security/03-xss-csrf.md)
- [安全编码与安全开发生命周期](docs/06-web-application-security/04-secure-coding.md)

### 第七章：数据安全与隐私
- [数据全生命周期防护](docs/07-data-security-privacy/01-data-lifecycle.md)
- [数据库安全与脱敏](docs/07-data-security-privacy/02-database-security.md)
- [隐私保护技术](docs/07-data-security-privacy/03-privacy-preserving.md)

### 第八章：安全管理与运营
- [风险管理与合规体系](docs/08-security-management-operations/01-risk-management.md)
- [安全运营中心 SOC 与 SIEM](docs/08-security-management-operations/02-soc-siem.md)
- [应急响应与数字取证](docs/08-security-management-operations/03-incident-response.md)
- [红蓝对抗与渗透测试](docs/08-security-management-operations/04-red-blue-team.md)

### 第九章：AI 与 Agent 安全（前沿）
- [LLM 安全基础](docs/09-ai-agent-security/01-llm-security-basics.md)
- [提示注入与越狱](docs/09-ai-agent-security/02-prompt-injection.md)
- [数据投毒与对抗攻击](docs/09-ai-agent-security/03-data-poisoning-adversarial.md)
- [Agent 架构安全（工具调用与权限）](docs/09-ai-agent-security/04-agent-architecture-security.md)
- [AI 安全红队与评估](docs/09-ai-agent-security/05-ai-red-team.md)

### 第十章：学习资源
- [推荐书籍](docs/10-resources/01-books.md)
- [在线课程](docs/10-resources/02-courses.md)
- [重要论文与报告](docs/10-resources/03-papers-reports.md)
- [工具与平台（CTF/靶场）](docs/10-resources/04-tools-platforms.md)
- [社区与会议](docs/10-resources/05-communities-conferences.md)

### 附录
- [英汉术语对照表](glossary/english-chinese.md)
- [术语索引](glossary/index.md)

> 📐 想了解课程体系的设计依据（公开课程与官方规范映射）？请看 [CURRICULUM.md](CURRICULUM.md)。

---

## 🚀 快速开始

**如果你是完全的初学者：**
1. 从[什么是网络安全](docs/01-introduction/01-what-is-cybersecurity.md)开始
2. 理解[安全三要素 CIA 与威胁模型](docs/01-introduction/02-cia-triad-threat-model.md)
3. 建立[纵深防御](docs/01-introduction/03-defense-in-depth.md)的全局观
4. 按顺序学习密码学 → 认证 → 网络 → 系统 → Web → 数据 → 运营 → AI 安全

**如果你有编程/网络基础，想快速补齐防御技能：**
1. 重点学习[Web 与应用安全](docs/06-web-application-security/01-owasp-top10.md)（与开发最相关）
2. 补齐[网络安全防御](docs/04-network-security/01-tls-https.md)
3. 精读[身份认证与访问控制](docs/03-authentication-access-control/01-password-mfa.md)

**如果你关注前沿 Agent 安全：**
1. 快速过一遍[密码学基础](docs/02-cryptography/01-symmetric-encryption.md)
2. 直接进入[AI 与 Agent 安全](docs/09-ai-agent-security/01-llm-security-basics.md)
3. 补充[Web 安全](docs/06-web-application-security/01-owasp-top10.md)（Agent 常与之交互）

---

## 📝 学完即测

本项目遵循"**费曼学习法 + 寓言故事 + 学完即测**"的教学理念：

- 每篇文章配有**寓言故事**和**费曼自测**，边读边思考
- 每节配有**节末小测**，每章配有**章节综合卷**（见 [`exams/`](exams/README.md) 目录）
- 所有试卷均提供**题目版**和**带答案+分析的解析版**，采用原创概念题与岗位场景，覆盖易混淆点、边界条件和防御方案验收；不声明来自未经核验的高校或企业真题

> **建议**：学完一节 → 做对应节末小测 → 对照解析查漏补缺 → 再进入下一节。

---

## 🔍 本地验证

在仓库根目录运行，支持 Python 3.9+，无需安装第三方依赖：

```bash
python3 -m unittest discover -s tests -v
python3 scripts/check_content.py
python3 examples/integrity_hmac.py
python3 examples/parameterized_query.py
python3 examples/agent_policy.py
```

检查覆盖内部路径与锚点、教学模块、题目和解析的配对与编号、各章题量。CI 使用同一组命令；外部参考的可访问性与技术准确性需单独复核，结构检查不能替代内容评审。

## 🤝 贡献指南

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与本项目。

贡献类型：
- 📝 撰写新文章
- 🔧 修正技术错误
- 🌐 翻译文章
- 💡 添加代码/实验示例
- 🎨 制作图表

---

## 📄 许可证

- 文档内容：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- 代码示例：[MIT License](LICENSE)

> ⚠️ **免责声明**：本项目所有内容仅用于**教育学习与合法防御**目的。请勿将书中技术用于任何未经授权的攻击行为，否则后果自负。

---

**最后更新**：2026年10月4日 ｜ **维护者**：网络安全防御技术百科全书项目组

📔 查看[开发日志](DEVELOPMENT_LOG.md)了解项目演进历史与最新进展。
