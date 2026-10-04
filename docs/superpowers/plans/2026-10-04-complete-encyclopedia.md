# 百科全书完整首版 Implementation Plan

> **For agentic workers:** 按用户“直接开发至结束”的要求连续执行。三个独立章节任务并行，主任务维护工具与公共文件，最后统一验收。

**Goal:** 补齐现有十章教材、配套学习闭环和可重复运行的维护检查。

**Architecture:** 保留 Markdown；按章节隔离内容工作；Python 标准库负责离线实验与本地质量检查。

**Tech Stack:** Markdown、Mermaid/SVG、Python 3.9+、unittest、GitHub Actions。

**Spec:** [设计说明](../specs/2026-10-04-complete-encyclopedia-design.md)。

## Global Constraints

- 既定正文路径服从 SUMMARY；文档中文、防御优先。
- 新题原创，引用官方来源并说明版本；不虚构高校或企业题目出处。
- 不添加攻击工具；实验不联网、不修改系统配置；新增 Python 代码只用标准库。
- 内容任务不改公共文件，不提交或推送；由主任务统一验证。

## Review Focus

1. README/SUMMARY 指向不存在的文章或不正确的锚点。
2. 新题与解析编号不对应，评分总分不符，选择题有歧义。
3. 旧标准或“绝对安全”等误导性描述，以及缺少依据的来源声明。
4. 实验将外部输入当指令、允许越权或因错误输入崩溃。
5. 检查工具误识别 fenced code、中文锚点、带空格路径与题目格式。

## Task 1：信任与网络（第二至四章）

**Files:** `docs/02-cryptography/`、`docs/03-authentication-access-control/`、`docs/04-network-security/` 及对应 `exams/` 目录。

**Interfaces:** 消费 SUMMARY 文件名与 CLAUDE 教学结构；产出 12 篇正文、21 套试卷（42 文件）。

- [x] 核验 RFC、NIST、OWASP 官方资料。
- [x] 撰写完整正文、原创试卷与逐题解析。
- [x] 自查题量、配对、技术边界与相关导航，报告实际交付。

## Task 2：系统、应用与数据（第五至七章）

**Files:** 对应 `docs/05-*` 至 `docs/07-*` 与 `exams/`。

**Interfaces:** 同 Task 1；产出 11 篇正文、20 套试卷（40 文件）。

- [x] 核验官方系统安全、OWASP、NIST 隐私资料。
- [x] 撰写正文与四类原创试卷及解析。
- [x] 自查 SQL 参数化、浏览器边界、隔离和隐私解释，报告实际交付。

## Task 3：运营与 AI（第八至九章）

**Files:** 对应 `docs/08-*` 至 `docs/09-*` 与 `exams/`。

**Interfaces:** 同 Task 1；产出 9 篇正文、15 套试卷（30 文件）。

- [x] 核验 NIST CSF/IR/AI RMF、MITRE、OWASP LLM 官方资料。
- [x] 撰写正文与四类原创试卷及解析。
- [x] 自查 Agent 权限、注入边界、证据保全和评估指标，报告实际交付。

## Task 4：维护工具与离线实验

**Files:** `scripts/check_content.py`、`tests/`、`examples/`、`.github/workflows/content-check.yml`、`.gitignore`、`images/`。

**Interfaces:** `python3 scripts/check_content.py` 检查整库并以非零退出码报告错误；`python3 -m unittest discover -s tests -v` 验证工具与实验。

- [x] 先写临时目录夹具验证断链、锚点、代码块排除和试卷配对；运行确认缺少实现而失败。
- [x] 实现内容检查与 CLI，运行工具测试。
- [x] 为参数化查询、完整性验证、最小权限策略写行为测试；观察失败后实现安全示例。
- [x] 文档说明实验限制，增加防御流程 SVG 和 CI。

## Task 5：学习资源与公共文档

**Files:** `docs/10-resources/`、README、SUMMARY、CURRICULUM、CONTRIBUTING、CLAUDE、DEVELOPMENT_LOG、glossary、`exams/README.md`、第一章原文件。

- [x] 核验推荐资源的官方来源，撰写 5 篇资源指南。
- [x] 修正既有题目分值、未证实统计与归因，补充术语定位和试卷导航。
- [x] 更新目录、实测命令与开发日志，准确列出新增文章和试卷数量。

## Task 5B：学习指南适配与资源章题库

- [x] 阅读 ML-encyclopedia 典型正文、目录、题库和实验，记录设计对照。
- [x] 增加 LEARNING_GUIDE、REFERENCE_DESIGN，含读者路线、十章验收与综合防御任务。
- [x] 第十章五篇资源配五套小测、综合卷、挑战卷、压力面，共八套十六文件。

## Task 6：整库验收

- [x] 运行 `python3 -m unittest discover -s tests -v`，预期全部通过。
- [x] 运行 `python3 scripts/check_content.py`，预期零错误且报告 40 篇正文、70 套试卷。
- [x] 运行各离线示例与 `git diff --check`，预期成功。
- [x] 独立复核内容、题目、维护工具，修复实际发现后复验。
- [x] 将各项复验结果记录在开发日志，交付本地可审阅成果。

## 收尾记录

完成 40 篇正文、70 套配对试卷、662 道主问题、83 个术语和三个离线实验。两个独立复核任务检查工具及代表性内容；发现的六类代码缺陷已加入回归测试并修复，第一章题目及解析已同步精修。33 项行为测试、整库内容检查、三个实验 CLI 和差异空白检查通过。开发日志记录验证环境与远程 CI 未执行的边界。成果保留在本地 `codex/complete-encyclopedia` 分支。
