# 英汉术语对照表

按英文排序，提供简短定义与正文入口。MAC 有“强制访问控制”和“消息认证码”两种含义，须按上下文区分。数学和协议保证的前提见对应正文；这里是学习速查。

| 英文 | 中文 | 一句话说明 | 正文 |
|---|---|---|---|
| Access Control | 访问控制 | 按主体、动作和资源决定能否访问 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Advanced Persistent Threat (APT) | 高级持续性威胁 | 长期、有组织地针对目标的威胁活动 | [详解](../docs/01-introduction/01-what-is-cybersecurity.md) |
| Adversarial Example | 对抗样本 | 用于使模型行为偏离目标的特定输入 | [详解](../docs/09-ai-agent-security/03-data-poisoning-adversarial.md) |
| AI Red Teaming | AI 安全红队 | 在明确范围内评估 AI 系统失效场景 | [详解](../docs/09-ai-agent-security/05-ai-red-team.md) |
| Asymmetric Cryptography | 非对称密码学 | 使用公私钥的签名、密钥交换或加密构造 | [详解](../docs/02-cryptography/02-asymmetric-encryption.md) |
| Authenticated Encryption with Associated Data (AEAD) | 带关联数据的认证加密 | 同时保护密文完整性与机密性，并认证关联数据 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Authentication | 身份认证 | 验证请求主体声称的身份 | [详解](../docs/03-authentication-access-control/01-password-mfa.md) |
| Authorization | 授权 | 判断已识别主体可以做什么 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Availability | 可用性 | 授权主体需要时可访问和使用系统 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Buffer Overflow | 缓冲区溢出 | 访问超出分配内存边界的缺陷 | [详解](../docs/05-system-security/02-memory-safety.md) |
| Certificate Authority (CA) | 证书颁发机构 | 依据规则签发绑定身份与公钥的证书 | [详解](../docs/02-cryptography/04-digital-signature-pki.md) |
| CIA Triad | 安全三要素 | 机密性、完整性、可用性的目标分类 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Confidentiality | 机密性 | 信息不向未授权主体披露 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Content Security Policy (CSP) | 内容安全策略 | 浏览器对页面资源与脚本等行为施加的策略 | [详解](../docs/06-web-application-security/03-xss-csrf.md) |
| Cross-Origin Resource Sharing (CORS) | 跨源资源共享 | 服务器允许浏览器脚本读取特定跨源响应的机制 | [详解](../docs/06-web-application-security/03-xss-csrf.md) |
| Cross-Site Request Forgery (CSRF) | 跨站请求伪造 | 诱导浏览器利用现有凭证发出非预期请求 | [详解](../docs/06-web-application-security/03-xss-csrf.md) |
| Cross-Site Scripting (XSS) | 跨站脚本 | 不可信内容在受信任页面上下文中执行 | [详解](../docs/06-web-application-security/03-xss-csrf.md) |
| Cryptography | 密码学 | 研究保护信息与认证的数学构造及安全性质 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Data Lifecycle | 数据生命周期 | 从采集到使用、共享、归档和删除的过程 | [详解](../docs/07-data-security-privacy/01-data-lifecycle.md) |
| Data Poisoning | 数据投毒 | 污染训练或知识来源影响后续模型或系统行为 | [详解](../docs/09-ai-agent-security/03-data-poisoning-adversarial.md) |
| Decryption | 解密 | 用相应密钥从密文恢复明文 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Defense in Depth | 纵深防御 | 组合预防、检测、响应和恢复等多道控制 | [详解](../docs/01-introduction/03-defense-in-depth.md) |
| Denial of Service (DoS) | 拒绝服务 | 使授权访问无法得到正常服务 | [详解](../docs/04-network-security/05-ddos-defense.md) |
| Differential Privacy | 差分隐私 | 限定相邻数据集输出分布差异的隐私保证 | [详解](../docs/07-data-security-privacy/03-privacy-preserving.md) |
| Digital Signature | 数字签名 | 私钥签署、公钥验证消息认证与完整性 | [详解](../docs/02-cryptography/04-digital-signature-pki.md) |
| Discretionary Access Control (DAC) | 自主访问控制 | 对象拥有者可依策略管理访问权限 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Distributed Denial of Service (DDoS) | 分布式拒绝服务 | 多个来源协同消耗服务或网络资源 | [详解](../docs/04-network-security/05-ddos-defense.md) |
| Encryption | 加密 | 用密钥将明文转换为密文 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Endpoint Detection and Response (EDR) | 端点检测与响应 | 收集主机行为并支持调查和处置 | [详解](../docs/05-system-security/03-malware.md) |
| Exploit | 漏洞利用 | 使软件或系统弱点造成具体后果的行为或机制 | [详解](../docs/05-system-security/02-memory-safety.md) |
| False Negative (FN) | 假阴性或漏报 | 实际异常被判断为正常 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| False Positive (FP) | 假阳性或误报 | 实际正常被判断为异常 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Firewall | 防火墙 | 依据规则控制网络流量的机制 | [详解](../docs/04-network-security/02-firewall.md) |
| Hash Function | 哈希函数 | 把输入映射为固定长度摘要的函数 | [详解](../docs/02-cryptography/03-hash-and-mac.md) |
| Identity Provider (IdP) | 身份提供方 | 向依赖方提供身份认证断言的服务 | [详解](../docs/03-authentication-access-control/03-sso-zero-trust.md) |
| Incident Response | 应急响应 | 准备、检测、处置和恢复安全事件的活动 | [详解](../docs/08-security-management-operations/03-incident-response.md) |
| Integrity | 完整性 | 防止或检测未授权的信息修改与破坏 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Intrusion Detection System (IDS) | 入侵检测系统 | 观察行为并产生可疑活动告警 | [详解](../docs/04-network-security/03-ids-ips.md) |
| Intrusion Prevention System (IPS) | 入侵防御系统 | 检测并在流量路径上执行阻断 | [详解](../docs/04-network-security/03-ids-ips.md) |
| Jailbreak | 越狱 | 使模型偏离其行为约束的输入或交互 | [详解](../docs/09-ai-agent-security/02-prompt-injection.md) |
| Key Management | 密钥管理 | 密钥生成、保管、使用、轮换和销毁 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Large Language Model (LLM) | 大语言模型 | 从大规模语言数据中学习并生成语言的模型 | [详解](../docs/09-ai-agent-security/01-llm-security-basics.md) |
| Least Privilege | 最小权限 | 仅授予任务必需的资源、动作和时限 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Malware | 恶意软件 | 具有未授权或有害行为的软件 | [详解](../docs/05-system-security/03-malware.md) |
| Mandatory Access Control (MAC) | 强制访问控制 | 由系统统一依据标签等政策执行的控制 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Memory Safety | 内存安全 | 约束无效内存访问和对象生命周期错误 | [详解](../docs/05-system-security/02-memory-safety.md) |
| Message Authentication Code (MAC) | 消息认证码 | 共享密钥下认证消息来源与完整性的标签 | [详解](../docs/02-cryptography/03-hash-and-mac.md) |
| Model Inversion | 模型逆向 | 从模型信息推断训练相关数据的隐私风险 | [详解](../docs/09-ai-agent-security/03-data-poisoning-adversarial.md) |
| Multi-Factor Authentication (MFA) | 多因素认证 | 结合不同类型因素进行认证 | [详解](../docs/03-authentication-access-control/01-password-mfa.md) |
| Non-Repudiation | 不可否认性 | 支持事件归因、抵抗抵赖的证据性质 | [详解](../docs/02-cryptography/04-digital-signature-pki.md) |
| Nonce | 单次值 | 协议或算法要求满足特定唯一性等条件的值 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| OpenID Connect (OIDC) | 开放身份连接 | 在 OAuth 2.0 上建立的身份认证层 | [详解](../docs/03-authentication-access-control/03-sso-zero-trust.md) |
| Passkey | 通行密钥 | 基于公钥凭证的认证方式，具体保证依实现与恢复流程 | [详解](../docs/03-authentication-access-control/01-password-mfa.md) |
| Penetration Testing | 渗透测试 | 在明确授权范围内验证系统安全弱点 | [详解](../docs/08-security-management-operations/04-red-blue-team.md) |
| Phishing | 钓鱼 | 通过伪装或欺骗诱导披露信息或执行操作 | [详解](../docs/03-authentication-access-control/01-password-mfa.md) |
| Precision | 精确率 | 检测评估中 TP/(TP+FP)，反映告警的准确程度 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Privacy Budget | 隐私预算 | 用于跟踪差分隐私机制累计保证的参数 | [详解](../docs/07-data-security-privacy/03-privacy-preserving.md) |
| Prompt Injection | 提示注入 | 不可信输入被当作指令影响模型或系统的行为 | [详解](../docs/09-ai-agent-security/02-prompt-injection.md) |
| Public Key Infrastructure (PKI) | 公钥基础设施 | 证书、信任链与公钥身份绑定的管理体系 | [详解](../docs/02-cryptography/04-digital-signature-pki.md) |
| Recall | 召回率 | 检测评估中 TP/(TP+FN)，反映异常的检出程度 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Recovery Point Objective (RPO) | 恢复点目标 | 业务可接受的数据回退时间范围目标 | [详解](../docs/08-security-management-operations/03-incident-response.md) |
| Recovery Time Objective (RTO) | 恢复时间目标 | 业务可接受的恢复服务用时目标 | [详解](../docs/08-security-management-operations/03-incident-response.md) |
| Retrieval-Augmented Generation (RAG) | 检索增强生成 | 把检索内容作为模型生成上下文的系统方式 | [详解](../docs/09-ai-agent-security/04-agent-architecture-security.md) |
| Role-Based Access Control (RBAC) | 基于角色的访问控制 | 通过角色组织与分配动作权限 | [详解](../docs/03-authentication-access-control/02-access-control-models.md) |
| Same-Origin Policy (SOP) | 同源策略 | 浏览器约束跨源访问的一组规则 | [详解](../docs/06-web-application-security/03-xss-csrf.md) |
| Sandbox | 沙箱 | 限制程序可访问资源与行为的执行环境 | [详解](../docs/05-system-security/04-sandbox-virtualization.md) |
| Secure Software Development Lifecycle (SSDLC) | 安全开发生命周期 | 在设计、实现、交付和维护中落实安全活动 | [详解](../docs/06-web-application-security/04-secure-coding.md) |
| Security Information and Event Management (SIEM) | 安全信息与事件管理 | 集中检索与关联安全事件数据的平台能力 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Security Operations Center (SOC) | 安全运营中心 | 组织持续监测、分析和处置安全事件的人员与流程 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Single Sign-On (SSO) | 单点登录 | 利用联合身份等机制访问多个服务 | [详解](../docs/03-authentication-access-control/03-sso-zero-trust.md) |
| SQL Injection | SQL 注入 | 不可信输入参与 SQL 语法造成非预期执行 | [详解](../docs/06-web-application-security/02-sql-injection.md) |
| Supply Chain Risk | 供应链风险 | 依赖、构建、分发或供应商失效带来的风险 | [详解](../docs/06-web-application-security/01-owasp-top10.md) |
| Symmetric Encryption | 对称加密 | 加解密使用相同秘密或由其派生的密钥 | [详解](../docs/02-cryptography/01-symmetric-encryption.md) |
| Threat Model | 威胁模型 | 对资产、边界、威胁和假设的结构化描述 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Time of Check to Time of Use (TOCTOU) | 检查与使用时序差 | 检查后状态变化导致执行依据失效的风险 | [详解](../docs/09-ai-agent-security/04-agent-architecture-security.md) |
| Tool Calling | 工具调用 | 模型提出结构化动作请求，由系统决定并执行 | [详解](../docs/09-ai-agent-security/04-agent-architecture-security.md) |
| Transport Layer Security (TLS) | 传输层安全协议 | 认证与保护客户端和服务器通信的协议 | [详解](../docs/04-network-security/01-tls-https.md) |
| True Negative (TN) | 真阴性 | 实际正常被正确判断为正常 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| True Positive (TP) | 真阳性 | 实际异常被正确判断为异常 | [详解](../docs/08-security-management-operations/02-soc-siem.md) |
| Virtual Private Network (VPN) | 虚拟专用网络 | 在网络上建立经认证与加密保护的隧道 | [详解](../docs/04-network-security/04-vpn.md) |
| Vulnerability | 漏洞 | 可能导致安全目标受损的弱点 | [详解](../docs/01-introduction/02-cia-triad-threat-model.md) |
| Web Application Firewall (WAF) | Web 应用防火墙 | 检查 HTTP 应用流量并施加规则的控制 | [详解](../docs/06-web-application-security/01-owasp-top10.md) |
| Zero Trust | 零信任 | 不因网络位置给予隐式信任的资源访问原则 | [详解](../docs/03-authentication-access-control/03-sso-zero-trust.md) |

[主题索引](index.md) · [学习指南](../LEARNING_GUIDE.md)

最后更新：2026-10-04。
