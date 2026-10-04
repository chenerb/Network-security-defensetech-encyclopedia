# 离线防御实验

这里用可运行的微型实验连接“理解原理”和“验证控制”。只需要 Python 3.9+ 标准库；数据是合成的，数据库只在内存中，实验不联网、不读用户文件、不修改系统配置。每个实验对应教材中的防御机制，并有行为测试。

## 运行

在仓库根目录运行：

```bash
python3 examples/integrity_hmac.py
python3 examples/parameterized_query.py
python3 examples/agent_policy.py
python3 -m unittest discover -s tests -v
```

## 实验一：消息被修改后还能信吗？

[HMAC 实验](integrity_hmac.py) 对应[哈希与 MAC](../docs/02-cryptography/03-hash-and-mac.md)。原消息的验证结果是 `True`，金额从 100 改到 101 后是 `False`。改用另一把密钥也会失败。

先预测结果，再运行。为什么公开的 SHA-256 摘要不足以抵抗同时替换消息和摘要的人？为什么 HMAC 的双方都能生成标签，却不能据此证明某一方独自签发？本实验不涉及加密；生产环境的密钥需由密钥管理系统保护、轮换，不能跟消息一起公开。脚本每次生成临时密钥，所以每次运行的标签会变化。

## 实验二：姓名中的引号是数据还是语法？

[参数化查询](parameterized_query.py) 对应[SQL 注入防御](../docs/06-web-application-security/02-sql-injection.md)。数据库中存入 `O'Reilly`，绑定参数后能正确查到这一条；一个不存在的带引号姓名返回空列表。

把姓名当普通字符串传给数据库驱动，让驱动负责值的绑定。不要先手动拼 SQL 再交给 `execute`。排序列不能用值占位符代替，示例只允许程序内定义的 `id`、`name`。尝试不在列表中的排序选项，应收到 `ValueError`。生产应用还需单独实施租户隔离、对象授权、最小权限数据库账户及错误脱敏。

## 实验三：模型能不能替自己授权？

[Agent 权限判断](agent_policy.py) 对应[Agent 架构安全](../docs/09-ai-agent-security/04-agent-architecture-security.md)。结果依次是允许本租户读取、拒绝跨租户、拒绝分析员写入。未知工具、额外字段或畸形参数也被拒绝。

`context` 代表服务端已经认证的身份；模型只能提出 `request`。操作者写入还需一个来自可信审批服务的记录，其身份和参数摘要必须吻合。测试演示换对象或换身份后旧审批失败。

该示例用于解释策略，**不构成生产授权服务**：它不检查对象所有权、审批签名、有效期、一次性消费、状态版本或真实存储层的租户归属。真实系统必须从服务端读取这些事实，在执行时重新授权，并把审批核验与状态变更放进一致的事务。参数摘要仅证明参数相同，不能证明谁批准；不能从模型输出中读取 `context` 或 `approval`。本实验只返回布尔结果，不执行文件、网络或数据库写操作。

## 验收与复盘

测试覆盖消息篡改、错误密钥、非法标签、引号姓名、排序允许列表、跨租户、未知动作、参数变化和空输入。通过测试后，用自己的话解释每条拒绝规则保护了哪一道边界，再返回对应正文完成小测。

## 参考

- [Python hmac 文档](https://docs.python.org/3/library/hmac.html)
- [Python sqlite3 参数绑定](https://docs.python.org/3/library/sqlite3.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

仅用于教育学习与合法防御；所有示例代码采用仓库 [MIT 许可证](../LICENSE)。
