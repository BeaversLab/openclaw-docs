---
summary: "映射到 MITRE ATLAS 框架的 OpenClaw 威胁模型"
title: "威胁模型 (MITRE ATLAS)"
read_when:
  - Reviewing security posture or threat scenarios
  - Working on security features or audit responses
---

## MITRE ATLAS 框架

**版本：** 1.0-draft
**最后更新：** 2026-02-04
**方法论：** MITRE ATLAS + 数据流图
**框架：** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### 框架归属

此威胁模型基于 [MITRE ATLAS](https://atlas.mitre.org/) 构建，它是用于记录 AI/ML 系统对抗性威胁的行业标准框架。ATLAS 由 [MITRE](https://www.mitre.org/) 与 AI 安全社区协作维护。

**关键 ATLAS 资源：**

- [ATLAS 技术](https://atlas.mitre.org/techniques/)
- [ATLAS 策略](https://atlas.mitre.org/tactics/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [贡献给 ATLAS](https://atlas.mitre.org/resources/contribute)

### 为本威胁模型做贡献

这是由 OpenClaw 社区维护的动态文档。请参阅 [CONTRIBUTING-THREAT-MODEL.md](/zh/security/CONTRIBUTING-THREAT-MODEL) 了解贡献指南：

- 报告新威胁
- 更新现有威胁
- 提议攻击链
- 建议缓解措施

---

## 1. 简介

### 1.1 目的

本威胁模型记录了针对 OpenClaw AI 代理平台和 ClawHub 技能市场的对抗性威胁，使用了专为 AI/ML 系统设计的 MITRE ATLAS 框架。

### 1.2 范围

| 组件                | 是否包含 | 备注                                          |
| ------------------- | -------- | --------------------------------------------- |
| OpenClaw 代理运行时 | 是       | 核心代理执行、工具调用、会话                  |
| Gateway(网关)       | 是       | 身份验证、路由、渠道集成                      |
| 渠道集成            | 是       | WhatsApp、Telegram、Discord、Signal、Slack 等 |
| ClawHub 市场        | 是       | 技能发布、审核、分发                          |
| MCP 服务器          | 是       | 外部工具提供商                                |
| 用户设备            | 部分     | 移动应用、桌面客户端                          |

### 1.3 范围之外

本威胁模型未明确排除任何内容。

---

## 2. 系统架构

### 2.1 信任边界

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WhatsApp   │  │  Telegram   │  │   Discord   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 1: Channel Access                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      GATEWAY                              │   │
│  │  • Device Pairing (1h DM / 5m node grace period)           │   │
│  │  • AllowFrom / AllowList validation                       │   │
│  │  • Token/Password/Tailscale auth                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 2: Session Isolation              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AGENT SESSIONS                          │   │
│  │  • Session key = agent:channel:peer                       │   │
│  │  • Tool policies per agent                                │   │
│  │  • Transcript logging                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 3: Tool Execution                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION SANDBOX                        │   │
│  │  • Docker sandbox OR Host (exec-approvals)                │   │
│  │  • Node remote execution                                  │   │
│  │  • SSRF protection (DNS pinning + IP blocking)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 4: External Content               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FETCHED URLs / EMAILS / WEBHOOKS             │   │
│  │  • External content wrapping (XML tags)                   │   │
│  │  • Security notice injection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 5: Supply Chain                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLAWHUB                              │   │
│  │  • Skill publishing (semver, SKILL.md required)           │   │
│  │  • Pattern-based moderation flags                         │   │
│  │  • VirusTotal scanning (coming soon)                      │   │
│  │  • GitHub account age verification                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

| 流  | 源            | 目标          | 数据           | 保护           |
| --- | ------------- | ------------- | -------------- | -------------- |
| F1  | 渠道          | Gateway(网关) | 用户消息       | TLS，AllowFrom |
| F2  | Gateway(网关) | Agent         | 路由消息       | 会话隔离       |
| F3  | Agent         | 工具          | 工具调用       | 策略执行       |
| F4  | Agent         | 外部          | web_fetch 请求 | SSRF 阻断      |
| F5  | ClawHub       | Agent         | 技能代码       | 审核、扫描     |
| F6  | Agent         | 渠道          | 响应           | 输出过滤       |

---

## 3. 基于 ATLAS 战术的威胁分析

### 3.1 侦察 (AML.TA0002)

#### T-RECON-001：Agent 端点发现

| 属性             | 值                                         |
| ---------------- | ------------------------------------------ |
| **ATLAS ID**     | AML.T0006 - 主动扫描                       |
| **描述**         | 攻击者扫描暴露的 OpenClaw 网关端点         |
| **攻击向量**     | 网络扫描、shodan 查询、DNS 枚举            |
| **受影响的组件** | Gateway(网关)，暴露的 API 端点             |
| **当前缓解措施** | Tailscale 身份验证选项，默认绑定到回环地址 |
| **剩余风险**     | 中等 - 公共网关可被发现                    |
| **建议**         | 记录安全部署，在发现端点上添加速率限制     |

#### T-RECON-002：渠道集成探测

| 属性             | 值                                     |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0006 - 主动扫描                   |
| **描述**         | 攻击者探测消息渠道以识别 AI 管理的账户 |
| **攻击向量**     | 发送测试消息，观察响应模式             |
| **受影响的组件** | 所有渠道集成                           |
| **当前缓解措施** | 无特定措施                             |
| **剩余风险**     | 低 - 单纯发现的收益有限                |
| **建议**         | 考虑随机化响应时间                     |

---

### 3.2 初始访问 (AML.TA0004)

#### T-ACCESS-001：配对码拦截

| 属性             | 值                                                                         |
| ---------------- | -------------------------------------------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问                                           |
| **描述**         | 攻击者在配对宽限期内拦截配对码（私信渠道配对为 1 小时，节点配对为 5 分钟） |
| **攻击向量**     | 肩窥、网络嗅探、社会工程学                                                 |
| **受影响的组件** | 设备配对系统                                                               |
| **当前缓解措施** | 1 小时过期（私信配对）/ 5 分钟过期（节点配对），通过现有渠道发送代码       |
| **剩余风险**     | 中等 - 宽限期可被利用                                                      |
| **建议**         | 缩短宽限期，添加确认步骤                                                   |

#### T-ACCESS-002：AllowFrom 欺骗

| 属性               | 值                                        |
| ------------------ | ----------------------------------------- |
| **ATLAS ID**       | AML.T0040 - AI Model Inference API Access |
| **描述**           | 攻击者在渠道中伪造允许的发送者身份        |
| **攻击向量**       | 取决于渠道 - 电话号码欺骗、用户名冒充     |
| **受影响的组件**   | 针对每个渠道的 AllowFrom 验证             |
| **当前的缓解措施** | 特定于渠道的身份验证                      |
| **剩余风险**       | 中等 - 部分渠道易受欺骗攻击               |
| **建议**           | 记录特定于渠道的风险，尽可能添加加密验证  |

#### T-ACCESS-003: Token Theft

| 属性               | 值                                         |
| ------------------ | ------------------------------------------ |
| **ATLAS ID**       | AML.T0040 - AI Model Inference API Access  |
| **描述**           | 攻击者从配置文件中窃取身份验证令牌         |
| **攻击向量**       | 恶意软件、未经授权的设备访问、配置备份泄露 |
| **受影响的组件**   | ~/.openclaw/credentials/, 配置存储         |
| **当前的缓解措施** | 文件权限                                   |
| **剩余风险**       | 高 - 令牌以明文形式存储                    |
| **建议**           | 实施静态令牌加密，添加令牌轮换             |

---

### 3.3 执行 (AML.TA0005)

#### T-EXEC-001: Direct Prompt Injection

| 属性               | 值                                             |
| ------------------ | ---------------------------------------------- |
| **ATLAS ID**       | AML.T0051.000 - LLM Prompt Injection: Direct   |
| **描述**           | 攻击者发送精心设计的提示词以操纵代理行为       |
| **攻击向量**       | 包含对抗性指令的渠道消息                       |
| **受影响的组件**   | Agent LLM，所有输入面                          |
| **当前的缓解措施** | 模式检测，外部内容包装                         |
| **剩余风险**       | 严重 - 仅检测，不阻止；复杂的攻击可绕过        |
| **建议**           | 实施多层防御、输出验证，对敏感操作进行用户确认 |

#### T-EXEC-002: Indirect Prompt Injection

| 属性               | 值                                             |
| ------------------ | ---------------------------------------------- |
| **ATLAS ID**       | AML.T0051.001 - LLM Prompt Injection: Indirect |
| **描述**           | 攻击者在获取的内容中嵌入恶意指令               |
| **攻击向量**       | 恶意 URL、受感染的电子邮件、受损的 Webhook     |
| **受影响的组件**   | web_fetch、电子邮件摄取、外部数据源            |
| **当前的缓解措施** | 使用 XML 标签和安全通知包装内容                |
| **剩余风险**       | 高 - LLM 可能会忽略包装器指令                  |
| **建议**           | 实施内容清理，隔离执行上下文                   |

#### T-EXEC-003: 工具参数注入

| 属性             | 值                                   |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示注入：直接   |
| **描述**         | 攻击者通过提示注入操作工具参数       |
| **攻击向量**     | 精心制作的提示词，用于影响工具参数值 |
| **受影响组件**   | 所有工具调用                         |
| **当前缓解措施** | 针对危险命令的执行批准               |
| **剩余风险**     | 高 - 依赖于用户判断                  |
| **建议**         | 实施参数验证，使用参数化工具调用     |

#### T-EXEC-004: 执行批准绕过

| 属性             | 值                               |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0043 - 编制对抗性数据       |
| **描述**         | 攻击者编制绕过批准允许列表的命令 |
| **攻击向量**     | 命令混淆、别名利用、路径操作     |
| **受影响组件**   | exec-approvals.ts, 命令允许列表  |
| **当前缓解措施** | 允许列表 + 询问模式              |
| **剩余风险**     | 高 - 无命令清理                  |
| **建议**         | 实施命令规范化，扩展阻止列表     |

---

### 3.4 持久化 (AML.TA0006)

#### T-PERSIST-001: 恶意技能安装

| 属性             | 值                                                |
| ---------------- | ------------------------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - 供应链入侵：AI 软件               |
| **描述**         | 攻击者向 ClawHub 发布恶意技能                     |
| **攻击向量**     | 创建账户，发布包含隐藏恶意代码的技能              |
| **受影响组件**   | ClawHub, 技能加载, 代理执行                       |
| **当前缓解措施** | GitHub 账户年龄验证，基于模式的审核标记           |
| **剩余风险**     | 严重 - 无沙箱隔离，审查有限                       |
| **建议**         | VirusTotal 集成（进行中），技能沙箱隔离，社区审查 |

#### T-PERSIST-002: 技能更新投毒

| 属性             | 值                                       |
| ---------------- | ---------------------------------------- |
| **ATLAS ID**     | AML.T0010.001 - 供应链入侵：AI 软件      |
| **描述**         | 攻击者入侵热门技能并推送恶意更新         |
| **攻击向量**     | 账户入侵，对技能所有者进行社会工程学攻击 |
| **受影响组件**   | ClawHub 版本控制、自动更新流程           |
| **当前缓解措施** | 版本指纹识别                             |
| **剩余风险**     | 高 - 自动更新可能会拉取恶意版本          |
| **建议**         | 实施更新签名、回滚能力、版本固定         |

#### T-PERSIST-003：代理配置篡改

| 属性             | 值                                     |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0010.002 - 供应链妥协：数据       |
| **描述**         | 攻击者修改代理配置以持久化访问         |
| **攻击向量**     | 配置文件修改、设置注入                 |
| **受影响的组件** | 代理配置、工具策略                     |
| **当前缓解措施** | 文件权限                               |
| **剩余风险**     | 中 - 需要本地访问                      |
| **建议**         | 配置完整性验证、配置更改的审计日志记录 |

---

### 3.5 防御规避 (AML.TA0007)

#### T-EVADE-001：审核模式绕过

| 属性             | 值                                                       |
| ---------------- | -------------------------------------------------------- |
| **ATLAS ID**     | AML.T0043 - 制作对抗性数据                               |
| **描述**         | 攻击者精心制作技能内容以绕过审核模式                     |
| **攻击向量**     | Unicode 同形异义字、编码技巧、动态加载                   |
| **受影响的组件** | ClawHub moderation.ts                                    |
| **当前缓解措施** | 基于模式的 FLAG_RULES                                    |
| **剩余风险**     | 高 - 简单的正则表达式很容易被绕过                        |
| **建议**         | 添加行为分析（VirusTotal Code Insight）、基于 AST 的检测 |

#### T-EVADE-002：内容包装器转义

| 属性             | 值                                            |
| ---------------- | --------------------------------------------- |
| **ATLAS ID**     | AML.T0043 - 制作对抗性数据                    |
| **描述**         | 攻击者精心制作可以转义 XML 包装器上下文的内容 |
| **攻击向量**     | 标签操作、上下文混淆、指令覆盖                |
| **受影响的组件** | 外部内容包装                                  |
| **当前缓解措施** | XML 标签 + 安全通知                           |
| **剩余风险**     | 中 - 定期发现新的转义方式                     |
| **建议**         | 多层包装器、输出端验证                        |

---

### 3.6 设备发现 (AML.TA0008)

#### T-DISC-001：工具枚举

| 属性             | 值                               |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问 |
| **描述**         | 攻击者通过提示枚举可用工具       |
| **攻击向量**     | “你有什么工具？”风格的查询       |
| **受影响的组件** | 代理工具注册表                   |
| **当前缓解措施** | 无特定措施                       |
| **剩余风险**     | 低 - 工具通常已有文档说明        |
| **建议**         | 考虑工具可见性控制               |

#### T-DISC-002：会话数据提取

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推断 API 访问   |
| **描述**         | 攻击者从会话上下文中提取敏感数据   |
| **攻击向量**     | “我们讨论了什么？”查询、上下文探测 |
| **受影响组件**   | 会话记录、上下文窗口               |
| **当前缓解措施** | 按发送方隔离会话                   |
| **剩余风险**     | 中等 - 可访问会话内数据            |
| **建议**         | 在上下文中实施敏感数据脱敏         |

---

### 3.7 收集与渗漏 (AML.TA0009, AML.TA0010)

#### T-EXFIL-001：通过 web_fetch 进行数据窃取

| 属性             | 值                                            |
| ---------------- | --------------------------------------------- |
| **ATLAS ID**     | AML.T0009 - Collection                        |
| **描述**         | 攻击者指示代理将数据发送到外部 URL 以渗漏数据 |
| **攻击向量**     | 提示注入导致代理将数据 POST 到攻击者服务器    |
| **受影响组件**   | web_fetch 工具                                |
| **当前缓解措施** | 针对内部网络的 SSRF 阻断                      |
| **剩余风险**     | 高 - 允许外部 URL                             |
| **建议**         | 实施 URL 白名单、数据分类感知                 |

#### T-EXFIL-002：未经授权的消息发送

| 属性             | 值                                   |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0009 - Collection               |
| **描述**         | 攻击者导致代理发送包含敏感数据的消息 |
| **攻击向量**     | 提示注入导致代理向攻击者发送消息     |
| **受影响组件**   | 消息工具、渠道集成                   |
| **当前缓解措施** | 出站消息限制                         |
| **剩余风险**     | 中等 - 限制可能会被绕过              |
| **建议**         | 要求对新收件人进行明确确认           |

#### T-EXFIL-003：凭据收集

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0009 - Collection             |
| **描述**         | 恶意 Skills 从代理上下文中收集凭据 |
| **攻击向量**     | Skills 代码读取环境变量、配置文件  |
| **受影响组件**   | Skills 执行环境                    |
| **当前缓解措施** | 无针对 Skills 的特定措施           |
| **剩余风险**     | 严重 - Skills 以代理权限运行       |
| **建议**         | Skills 沙箱隔离、凭据隔离          |

---

### 3.8 影响 (AML.TA0011)

#### T-IMPACT-001：未经授权的命令执行

| 属性                    | 值                                                  |
| ----------------------- | --------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity                |
| **Description**         | Attacker executes arbitrary commands on user system |
| **Attack Vector**       | Prompt injection combined with exec approval bypass |
| **Affected Components** | Bash 工具, command execution                        |
| **Current Mitigations** | Exec approvals, Docker sandbox option               |
| **Residual Risk**       | Critical - Host execution without sandbox           |
| **Recommendations**     | Default to sandbox, improve approval UX             |

#### T-IMPACT-002: Resource Exhaustion (DoS)

| Attribute               | Value                                              |
| ----------------------- | -------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity               |
| **Description**         | Attacker exhausts API credits or compute resources |
| **Attack Vector**       | Automated message flooding, expensive 工具 calls   |
| **Affected Components** | Gateway(网关), agent sessions, API 提供商          |
| **Current Mitigations** | None                                               |
| **Residual Risk**       | High - No rate limiting                            |
| **Recommendations**     | Implement per-sender rate limits, cost budgets     |

#### T-IMPACT-003: Reputation Damage

| Attribute               | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity                    |
| **Description**         | Attacker causes agent to send harmful/offensive content |
| **Attack Vector**       | Prompt injection causing inappropriate responses        |
| **Affected Components** | Output generation, 渠道 messaging                       |
| **Current Mitigations** | LLM 提供商 content policies                             |
| **Residual Risk**       | Medium - Provider filters imperfect                     |
| **Recommendations**     | Output filtering layer, user controls                   |

---

## 4. ClawHub Supply Chain Analysis

### 4.1 Current Security Controls

| Control              | Implementation              | Effectiveness                                        |
| -------------------- | --------------------------- | ---------------------------------------------------- |
| GitHub Account Age   | `requireGitHubAccountAge()` | Medium - Raises bar for new attackers                |
| Path Sanitization    | `sanitizePath()`            | High - Prevents path traversal                       |
| File Type Validation | `isTextFile()`              | Medium - Only text files, but can still be malicious |
| Size Limits          | 50MB total bundle           | High - Prevents resource exhaustion                  |
| Required SKILL.md    | Mandatory readme            | Low security value - Informational only              |
| Pattern Moderation   | FLAG_RULES in moderation.ts | Low - Easily bypassed                                |
| Moderation Status    | `moderationStatus` field    | 中等 - 可进行人工审查                                |

### 4.2 审核标记模式

`moderation.ts` 中的当前模式：

```javascript
// Known-bad identifiers
/(keepcold131\/ClawdAuthenticatorTool|ClawdAuthenticatorTool)/i

// Suspicious keywords
/(malware|stealer|phish|phishing|keylogger)/i
/(api[-_ ]?key|token|password|private key|secret)/i
/(wallet|seed phrase|mnemonic|crypto)/i
/(discord\.gg|webhook|hooks\.slack)/i
/(curl[^\n]+\|\s*(sh|bash))/i
/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd)/i
```

**局限性：**

- 仅检查 slug、displayName、summary、frontmatter、metadata、文件路径
- 不分析实际的技能代码内容
- 简单的正则表达式很容易通过混淆绕过
- 无行为分析

### 4.3 计划改进

| 改进措施        | 状态                            | 影响                                                                |
| --------------- | ------------------------------- | ------------------------------------------------------------------- |
| VirusTotal 集成 | 进行中                          | 高 - Code Insight 行为分析                                          |
| 社区举报        | 部分（`skillReports` 表已存在） | 中等                                                                |
| 审计日志        | 部分（`auditLogs` 表已存在）    | 中等                                                                |
| 徽章系统        | 已实施                          | 中等 - `highlighted`, `official`, `deprecated`, `redactionApproved` |

---

## 5. 风险 Matrix

### 5.1 可能性 vs 影响

| 威胁 ID       | 可能性 | 影响 | 风险等级 | 优先级 |
| ------------- | ------ | ---- | -------- | ------ |
| T-EXEC-001    | 高     | 严重 | **严重** | P0     |
| T-PERSIST-001 | 高     | 严重 | **严重** | P0     |
| T-EXFIL-003   | 中等   | 严重 | **严重** | P0     |
| T-IMPACT-001  | 中等   | 严重 | **高**   | P1     |
| T-EXEC-002    | 高     | 高   | **高**   | P1     |
| T-EXEC-004    | 中等   | 高   | **高**   | P1     |
| T-ACCESS-003  | 中等   | 高   | **高**   | P1     |
| T-EXFIL-001   | 中等   | 高   | **高**   | P1     |
| T-IMPACT-002  | 高     | 中等 | **高**   | P1     |
| T-EVADE-001   | 高     | 中等 | **中等** | P2     |
| T-ACCESS-001  | 低     | 高   | **中等** | P2     |
| T-ACCESS-002  | 低     | 高   | **中等** | P2     |
| T-PERSIST-002 | 低     | 高   | **中等** | P2     |

### 5.2 关键路径攻击链

**攻击链 1：基于技能的数据窃取**

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**攻击链 2：提示注入导致 RCE**

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**攻击链 3：通过获取的内容进行间接注入**

```
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)
```

---

## 6. 建议总结

### 6.1 紧急 (P0)

| ID    | 建议                   | 解决对象                   |
| ----- | ---------------------- | -------------------------- |
| R-001 | 完成 VirusTotal 集成   | T-PERSIST-001, T-EVADE-001 |
| R-002 | 实施技能沙箱隔离       | T-PERSIST-001, T-EXFIL-003 |
| R-003 | 为敏感操作添加输出验证 | T-EXEC-001, T-EXEC-002     |

### 6.2 短期 (P1)

| ID    | 建议                           | 解决对象     |
| ----- | ------------------------------ | ------------ |
| R-004 | 实施速率限制                   | T-IMPACT-002 |
| R-005 | 添加静态令牌加密               | T-ACCESS-003 |
| R-006 | 改进执行批准的用户体验和验证   | T-EXEC-004   |
| R-007 | 为 web_fetch 实施 URL 允许列表 | T-EXFIL-001  |

### 6.3 中期 (P2)

| ID    | 建议                           | 解决          |
| ----- | ------------------------------ | ------------- |
| R-008 | 在可能的情况下添加加密渠道验证 | T-ACCESS-002  |
| R-009 | 实现配置完整性验证             | T-PERSIST-003 |
| R-010 | 添加更新签名和版本锁定         | T-PERSIST-002 |

---

## 7. 附录

### 7.1 ATLAS 技术映射

| ATLAS ID      | 技术名称             | OpenClaw 威胁                                                    |
| ------------- | -------------------- | ---------------------------------------------------------------- |
| AML.T0006     | 主动扫描             | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | 收集                 | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供应链：AI 软件      | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供应链：数据         | T-PERSIST-003                                                    |
| AML.T0031     | 侵蚀 AI 模型完整性   | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推理 API 访问 | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 制作对抗性数据       | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM 提示注入：直接   | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM 提示注入：间接   | T-EXEC-002                                                       |

### 7.2 关键安全文件

| 路径                                | 目的                   | 风险级别 |
| ----------------------------------- | ---------------------- | -------- |
| `src/infra/exec-approvals.ts`       | 命令批准逻辑           | **严重** |
| `src/gateway/auth.ts`               | Gateway(网关) 身份验证 | **严重** |
| `src/infra/net/ssrf.ts`             | SSRF 保护              | **严重** |
| `src/security/external-content.ts`  | 提示注入缓解           | **严重** |
| `src/agents/sandbox/tool-policy.ts` | 工具策略执行           | **严重** |
| `src/routing/resolve-route.ts`      | 会话隔离               | **中等** |

### 7.3 术语表

| 术语              | 定义                            |
| ----------------- | ------------------------------- |
| **ATLAS**         | MITRE 的 AI 系统对抗性威胁全景  |
| **ClawHub**       | OpenClaw 的技能市场             |
| **Gateway(网关)** | OpenClaw 的消息路由和身份验证层 |
| **MCP**           | 模型上下文协议 - 工具提供商接口 |
| **提示注入**      | 将恶意指令嵌入输入的攻击        |
| **技能**          | OpenClaw 代理的可下载扩展       |
| **SSRF**          | 服务器端请求伪造                |

---

_此威胁模型是一份持续更新的文档。请将安全问题报告至 security@openclaw.ai_

## 相关

- [形式化验证](/zh/security/formal-verification)
- [为威胁模型做出贡献](/zh/security/CONTRIBUTING-THREAT-MODEL)
