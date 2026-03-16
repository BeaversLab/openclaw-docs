# OpenClaw 威胁模型 v1.0

## MITRE ATLAS 框架

**Version:** 1.0-draft
**Last Updated:** 2026-02-04
**Methodology:** MITRE ATLAS + Data Flow Diagrams
**Framework:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### 框架归属

This threat 模型 is built on [MITRE ATLAS](https://atlas.mitre.org/), the industry-standard framework for documenting adversarial threats to AI/ML systems. ATLAS is maintained by [MITRE](https://www.mitre.org/) in collaboration with the AI security community.

**关键 ATLAS 资源:**

- [ATLAS Techniques](https://atlas.mitre.org/techniques/)
- [ATLAS Tactics](https://atlas.mitre.org/tactics/)
- [ATLAS Case Studies](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [Contributing to ATLAS](https://atlas.mitre.org/resources/contribute)

### 为本威胁模型做贡献

这是一份由 OpenClaw 社区维护的动态文档。请参阅 [CONTRIBUTING-THREAT-MODEL.md](/en/security/CONTRIBUTING-THREAT-MODEL) 了解贡献指南：

- 报告新威胁
- 更新现有威胁
- 提议攻击链
- 建议缓解措施

---

## 1. Introduction

### 1.1 Purpose

此威胁模型记录了 OpenClaw AI 代理平台和 ClawHub 技能市场的对抗性威胁，使用专为 AI/ML 系统设计的 MITRE ATLAS 框架。

### 1.2 Scope

| Component            | Included | Notes                                           |
| -------------------- | -------- | ----------------------------------------------- |
| OpenClaw 代理运行时  | Yes      | Core agent execution, 工具 calls, sessions      |
| Gateway(网关)        | Yes      | Authentication, routing, 渠道 integration       |
| Channel Integrations | Yes      | WhatsApp、Telegram、Discord、Signal、Slack 等。 |
| ClawHub 市场         | Yes      | Skill publishing, moderation, distribution      |
| MCP Servers          | Yes      | External 工具 providers                         |
| User Devices         | Partial  | Mobile apps, desktop clients                    |

### 1.3 Out of Scope

Nothing is explicitly out of scope for this threat 模型.

---

## 2. System Architecture

### 2.1 Trust Boundaries

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
│  │  • Device Pairing (30s grace period)                      │   │
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

### 2.2 Data Flows

| Flow | Source        | Destination   | Data               | Protection           |
| ---- | ------------- | ------------- | ------------------ | -------------------- |
| F1   | Channel       | Gateway(网关) | User messages      | TLS, AllowFrom       |
| F2   | Gateway(网关) | Agent         | Routed messages    | Session isolation    |
| F3   | Agent         | Tools         | Tool invocations   | Policy enforcement   |
| F4   | Agent         | External      | web_fetch requests | SSRF blocking        |
| F5   | ClawHub       | Agent         | Skill code         | Moderation, scanning |
| F6   | Agent         | Channel       | Responses          | Output filtering     |

---

## 3. 按ATLAS策略进行威胁分析

### 3.1 侦察 (AML.TA0002)

#### T-RECON-001：代理端点发现

| 属性             | 值                                         |
| ---------------- | ------------------------------------------ |
| **ATLAS ID**     | AML.T0006 - 主动扫描                       |
| **描述**         | 攻击者扫描暴露的 OpenClaw 网关端点         |
| **攻击向量**     | 网络扫描、Shodan 查询、DNS 枚举            |
| **受影响的组件** | Gateway(网关)，已暴露的 API 端点           |
| **当前缓解措施** | Tailscale 认证选项，默认绑定到环回地址     |
| **剩余风险**     | 中等 - 可发现的公共网关                    |
| **建议**         | 记录安全部署，在设备发现端点上添加速率限制 |

#### T-RECON-002：渠道集成探测

| 属性             | 值                                     |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0006 - 主动扫描                   |
| **描述**         | 攻击者探测消息渠道以识别 AI 管理的账户 |
| **攻击向量**     | 发送测试消息，观察响应模式             |
| **受影响的组件** | 所有渠道集成                           |
| **当前缓解措施** | 无特定措施                             |
| **剩余风险**     | 低 - 仅通过设备发现获取的价值有限      |
| **建议**         | 考虑随机化响应时间                     |

---

### 3.2 初始访问 (AML.TA0004)

#### T-ACCESS-001：配对码拦截

| 属性             | 值                               |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问 |
| **描述**         | 攻击者在 30 秒宽限期内拦截配对码 |
| **攻击向量**     | 肩窥、网络嗅探、社会工程学       |
| **受影响的组件** | 设备配对系统                     |
| **当前缓解措施** | 30 秒过期，通过现有渠道发送代码  |
| **剩余风险**     | 中等 - 宽限期可被利用            |
| **建议**         | 缩短宽限期，添加确认步骤         |

#### T-ACCESS-002：AllowFrom 欺骗

| 属性             | 值                                     |
| ---------------- | -------------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问       |
| **描述**         | 攻击者在渠道中欺骗允许的发件人身份     |
| **攻击向量**     | 取决于渠道 - 电话号码欺骗、用户名冒充  |
| **受影响的组件** | 每个渠道的 AllowFrom 验证              |
| **当前缓解措施** | 特定于渠道的身份验证                   |
| **剩余风险**     | 中等 - 某些渠道易受欺骗攻击            |
| **建议**         | 记录特定渠道的风险，尽可能添加加密验证 |

#### T-ACCESS-003: Token Theft

| 属性             | 值                                         |
| ---------------- | ------------------------------------------ |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问           |
| **描述**         | 攻击者从配置文件中窃取身份验证令牌         |
| **攻击向量**     | 恶意软件、未经授权的设备访问、配置备份泄露 |
| **受影响的组件** | ~/.openclaw/credentials/, 配置存储         |
| **当前缓解措施** | 文件权限                                   |
| **剩余风险**     | 高 - Token 以明文形式存储                  |
| **建议**         | 实施静态令牌加密，添加令轮换机制           |

---

### 3.3 执行 (AML.TA0005)

#### T-EXEC-001: Direct Prompt Injection

| 属性             | 值                                             |
| ---------------- | ---------------------------------------------- |
| **ATLAS ID**     | AML.T0051.000 - LLM 提示注入：直接             |
| **描述**         | 攻击者发送精心设计的提示以操控代理行为         |
| **攻击向量**     | 包含对抗性指令的渠道消息                       |
| **受影响的组件** | Agent LLM，所有输入表面                        |
| **当前缓解措施** | 模式检测，外部内容封装                         |
| **剩余风险**     | 严重 - 仅检测，不阻断；复杂的攻击可以绕过      |
| **建议**         | 实施多层防御、输出验证、针对敏感操作的用户确认 |

#### T-EXEC-002: Indirect Prompt Injection

| 属性             | 值                                      |
| ---------------- | --------------------------------------- |
| **ATLAS ID**     | AML.T0051.001 - LLM 提示注入：间接      |
| **描述**         | 攻击者在获取的内容中嵌入恶意指令        |
| **攻击向量**     | 恶意 URL、受污染的邮件、受损的 Webhooks |
| **受影响的组件** | web_fetch、邮件摄取、外部数据源         |
| **当前缓解措施** | 使用 XML 标签和安全通知封装内容         |
| **剩余风险**     | 高 - LLM 可能会忽略包装指令             |
| **建议**         | 实施内容清理，隔离执行上下文            |

#### T-EXEC-003: Tool Argument Injection

| 属性               | 值                                 |
| ------------------ | ---------------------------------- |
| **ATLAS ID**       | AML.T0051.000 - LLM 提示注入：直接 |
| **描述**           | 攻击者通过提示注入操纵工具参数     |
| **攻击向量**       | 能够影响工具参数值的精心构造的提示 |
| **受影响的组件**   | 所有工具调用                       |
| **当前的缓解措施** | 针对危险命令的执行审批             |
| **剩余风险**       | 高 - 依赖于用户的判断              |
| **建议**           | 实施参数验证、参数化的工具调用     |

#### T-EXEC-004: 执行审批绕过

| 属性               | 值                               |
| ------------------ | -------------------------------- |
| **ATLAS ID**       | AML.T0043 - 构造对抗性数据       |
| **描述**           | 攻击者构造绕过审批允许列表的命令 |
| **攻击向量**       | 命令混淆、别名利用、路径操纵     |
| **受影响的组件**   | exec-approvals.ts、命令允许列表  |
| **当前的缓解措施** | 允许列表 + 询问模式              |
| **剩余风险**       | 高 - 无命令清理                  |
| **建议**           | 实施命令规范化、扩展阻止列表     |

---

### 3.4 持久化 (AML.TA0006)

#### T-PERSIST-001: 恶意技能安装

| 属性               | 值                                                |
| ------------------ | ------------------------------------------------- |
| **ATLAS ID**       | AML.T0010.001 - 供应链妥协：AI 软件               |
| **描述**           | 攻击者将恶意技能发布到 ClawHub                    |
| **攻击向量**       | 创建账户，发布带有隐藏恶意代码的技能              |
| **受影响的组件**   | ClawHub，技能加载，agent 执行                     |
| **当前的缓解措施** | GitHub 账户年龄验证，基于模式的审核标记           |
| **剩余风险**       | 严重 - 无沙箱隔离，审查有限                       |
| **建议**           | VirusTotal 集成（进行中）、技能沙箱隔离、社区审查 |

#### T-PERSIST-002: 技能更新投毒

| 属性               | 值                                     |
| ------------------ | -------------------------------------- |
| **ATLAS ID**       | AML.T0010.001 - 供应链妥协：AI 软件    |
| **描述**           | 攻击者入侵流行技能并推送恶意更新       |
| **攻击向量**       | 账户入侵、对技能所有者的社会工程学攻击 |
| **受影响的组件**   | ClawHub 版本控制，自动更新流           |
| **当前的缓解措施** | 版本指纹识别                           |
| **剩余风险**       | 高 - 自动更新可能会拉取恶意版本        |
| **建议**           | 实施更新签名、回滚能力、版本锁定       |

#### T-PERSIST-003: Agent Configuration Tampering

| 属性             | 值                                            |
| ---------------- | --------------------------------------------- |
| **ATLAS ID**     | AML.T0010.002 - Supply Chain Compromise: Data |
| **描述**         | 攻击者修改代理配置以持久化访问                |
| **攻击向量**     | 配置文件修改，设置注入                        |
| **受影响的组件** | 代理配置，工具策略                            |
| **当前缓解措施** | 文件权限                                      |
| **剩余风险**     | 中等 - 需要本地访问                           |
| **建议**         | 配置完整性验证，配置更改的审计日志记录        |

---

### 3.5 Defense Evasion (AML.TA0007)

#### T-EVADE-001: Moderation Pattern Bypass

| 属性             | 值                                                      |
| ---------------- | ------------------------------------------------------- |
| **ATLAS ID**     | AML.T0043 - Craft Adversarial Data                      |
| **描述**         | 攻击者精心制作技能内容以绕过审核模式                    |
| **攻击向量**     | Unicode 同形异义字，编码技巧，动态加载                  |
| **受影响的组件** | ClawHub moderation.ts                                   |
| **当前缓解措施** | 基于模式的 FLAG_RULES                                   |
| **剩余风险**     | 高 - 简单的正则表达式很容易被绕过                       |
| **建议**         | 添加行为分析 (VirusTotal Code Insight)，基于 AST 的检测 |

#### T-EVADE-002: Content Wrapper Escape

| 属性             | 值                                          |
| ---------------- | ------------------------------------------- |
| **ATLAS ID**     | AML.T0043 - Craft Adversarial Data          |
| **描述**         | 攻击者精心制作可逃离 XML 包装器上下文的内容 |
| **攻击向量**     | 标签操作，上下文混淆，指令覆盖              |
| **受影响的组件** | 外部内容包装                                |
| **当前缓解措施** | XML 标签 + 安全提示                         |
| **剩余风险**     | 中等 - 经常发现新的逃逸方法                 |
| **建议**         | 多层包装器，输出端验证                      |

---

### 3.6 设备发现 (AML.TA0008)

#### T-DISC-001: Tool Enumeration

| 属性             | 值                               |
| ---------------- | -------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问 |
| **描述**         | 攻击者通过提示枚举可用工具       |
| **攻击向量**     | “你有哪些工具？”风格的查询       |
| **受影响的组件** | 代理工具注册表                   |
| **当前缓解措施** | 无具体措施                       |
| **剩余风险**     | 低 - 工具通常有文档记录          |
| **建议**         | 考虑工具可见性控制               |

#### T-DISC-002：会话数据提取

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0040 - AI 模型推理 API 访问   |
| **描述**         | 攻击者从会话上下文中提取敏感数据   |
| **攻击向量**     | “我们讨论了什么？”查询，上下文探测 |
| **受影响的组件** | 会话记录，上下文窗口               |
| **当前缓解措施** | 按发送方隔离会话                   |
| **残余风险**     | 中等 - 会话内数据可访问            |
| **建议**         | 在上下文中实施敏感数据脱敏         |

---

### 3.7 收集与渗出 (AML.TA0009, AML.TA0010)

#### T-EXFIL-001：通过 web_fetch 进行数据窃取

| 属性             | 值                                                |
| ---------------- | ------------------------------------------------- |
| **ATLAS ID**     | AML.T0009 - Collection                            |
| **描述**         | 攻击者指示代理将数据发送到外部 URL 以进行数据渗出 |
| **攻击向量**     | 提示注入导致代理将数据 POST 到攻击者服务器        |
| **受影响的组件** | web_fetch 工具                                    |
| **当前缓解措施** | 针对内部网络的 SSRF 阻断                          |
| **残余风险**     | 高 - 允许外部 URL                                 |
| **建议**         | 实施 URL 白名单，数据分类感知                     |

#### T-EXFIL-002：未经授权的消息发送

| 属性             | 值                                   |
| ---------------- | ------------------------------------ |
| **ATLAS ID**     | AML.T0009 - Collection               |
| **描述**         | 攻击者导致代理发送包含敏感数据的消息 |
| **攻击向量**     | 提示注入导致代理向攻击者发送消息     |
| **受影响的组件** | 消息工具，渠道集成                   |
| **当前缓解措施** | 出站消息限制                         |
| **残余风险**     | 中等 - 限制可能会被绕过              |
| **建议**         | 要求对新收件人进行明确确认           |

#### T-EXFIL-003：凭据窃取

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0009 - Collection             |
| **描述**         | 恶意 Skills 从代理上下文中窃取凭据 |
| **攻击向量**     | Skill 代码读取环境变量，配置文件   |
| **受影响的组件** | Skill 执行环境                     |
| **当前缓解措施** | 无针对 Skills 的特定措施           |
| **残余风险**     | 严重 - Skills 以代理权限运行       |
| **建议**         | Skill 沙箱隔离，凭据隔离           |

---

### 3.8 影响 (AML.TA0011)

#### T-IMPACT-001: 未授权命令执行

| 属性             | 值                             |
| ---------------- | ------------------------------ |
| **ATLAS ID**     | AML.T0031 - 侵蚀 AI 模型完整性 |
| **描述**         | 攻击者在用户系统上执行任意命令 |
| **攻击向量**     | 提示词注入结合执行审批绕过     |
| **受影响的组件** | Bash 工具，命令执行            |
| **当前缓解措施** | 执行批准，Docker 沙盒选项      |
| **剩余风险**     | 严重 - 无沙箱的主机执行        |
| **建议**         | 默认使用沙箱，改进审批用户体验 |

#### T-IMPACT-002: 资源耗尽 (DoS)

| 属性             | 值                                 |
| ---------------- | ---------------------------------- |
| **ATLAS ID**     | AML.T0031 - 侵蚀 AI 模型完整性     |
| **描述**         | 攻击者耗尽 API 额度或计算资源      |
| **攻击向量**     | 自动消息泛洪，昂贵的工具调用       |
| **受影响的组件** | Gateway(网关)、代理会话、API提供商 |
| **当前缓解措施** | 无                                 |
| **剩余风险**     | 高 - 无速率限制                    |
| **建议**         | 实施基于发送方的速率限制，成本预算 |

#### T-IMPACT-003: 声誉损害

| 属性             | 值                                |
| ---------------- | --------------------------------- |
| **ATLAS ID**     | AML.T0031 - 侵蚀 AI 模型完整性    |
| **描述**         | 攻击者导致代理发送有害/冒犯性内容 |
| **攻击向量**     | 提示词注入导致不当响应            |
| **受影响的组件** | 输出生成，渠道消息传递            |
| **当前缓解措施** | LLM 提供商内容策略                |
| **剩余风险**     | 中等 - 提供商过滤器不完善         |
| **建议**         | 输出过滤层，用户控制              |

---

## 4. ClawHub 供应链分析

### 4.1 当前安全控制

| 控制            | 实施                          | 有效性                                    |
| --------------- | ----------------------------- | ----------------------------------------- |
| GitHub 账户年龄 | `requireGitHubAccountAge()`   | 中等 - 提高了新攻击者的门槛               |
| 路径清理        | `sanitizePath()`              | 高 - 防止路径遍历                         |
| 文件类型验证    | `isTextFile()`                | 中等 - 仅限文本文件，但仍可能包含恶意内容 |
| 大小限制        | 50MB 总包大小                 | 高 - 防止资源耗尽                         |
| 必需的 SKILL.md | 强制自述文件                  | 低安全价值 - 仅供参考                     |
| 模式审核        | moderation.ts 中的 FLAG_RULES | 低 - 容易绕过                             |
| 审核状态        | `moderationStatus` 字段       | 中 - 可进行人工审查                       |

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
- 简单的正则表达式容易通过混淆绕过
- 无行为分析

### 4.3 计划改进

| 改进            | 状态                            | 影响                                                              |
| --------------- | ------------------------------- | ----------------------------------------------------------------- |
| VirusTotal 集成 | 进行中                          | 高 - Code Insight 行为分析                                        |
| 社区举报        | 部分（`skillReports` 表已存在） | 中                                                                |
| 审计日志        | 部分（`auditLogs` 表已存在）    | 中                                                                |
| 徽章系统        | 已实施                          | 中 - `highlighted`、`official`、`deprecated`、`redactionApproved` |

---

## 5. 风险 Matrix

### 5.1 可能性与影响

| 威胁 ID       | 可能性 | 影响 | 风险级别 | 优先级 |
| ------------- | ------ | ---- | -------- | ------ |
| T-EXEC-001    | 高     | 关键 | **关键** | P0     |
| T-PERSIST-001 | 高     | 关键 | **关键** | P0     |
| T-EXFIL-003   | 中     | 关键 | **关键** | P0     |
| T-IMPACT-001  | 中     | 关键 | **高**   | P1     |
| T-EXEC-002    | 高     | 高   | **高**   | P1     |
| T-EXEC-004    | 中     | 高   | **高**   | P1     |
| T-ACCESS-003  | 中     | 高   | **高**   | P1     |
| T-EXFIL-001   | 中     | 高   | **高**   | P1     |
| T-IMPACT-002  | 高     | 中   | **高**   | P1     |
| T-EVADE-001   | 高     | 中   | **中**   | P2     |
| T-ACCESS-001  | 低     | 高   | **中**   | P2     |
| T-ACCESS-002  | 低     | 高   | **中**   | P2     |
| T-PERSIST-002 | 低     | 高   | **中**   | P2     |

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

## 6. 建议摘要

### 6.1 立即 (P0)

| ID    | 建议                   | 解决对象                   |
| ----- | ---------------------- | -------------------------- |
| R-001 | 完成 VirusTotal 集成   | T-PERSIST-001、T-EVADE-001 |
| R-002 | 实施技能沙箱隔离       | T-PERSIST-001、T-EXFIL-003 |
| R-003 | 为敏感操作添加输出验证 | T-EXEC-001、T-EXEC-002     |

### 6.2 短期 (P1)

| ID    | 建议                         | 解决对象     |
| ----- | ---------------------------- | ------------ |
| R-004 | 实施速率限制                 | T-IMPACT-002 |
| R-005 | 添加静态令牌加密             | T-ACCESS-003 |
| R-006 | 改进执行审批的用户体验和验证 | T-EXEC-004   |
| R-007 | 为 web_fetch 实施 URL 白名单 | T-EXFIL-001  |

### 6.3 中期 (P2)

| ID    | 建议                   | 针对          |
| ----- | ---------------------- | ------------- |
| R-008 | 尽可能添加加密渠道验证 | T-ACCESS-002  |
| R-009 | 实施配置完整性验证     | T-PERSIST-003 |
| R-010 | 添加更新签名和版本固定 | T-PERSIST-002 |

---

## 7. 附录

### 7.1 ATLAS 技术映射

| ATLAS ID      | 技术名称                       | OpenClaw 威胁                                                    |
| ------------- | ------------------------------ | ---------------------------------------------------------------- |
| AML.T0006     | 主动扫描                       | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | 收集                           | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | 供应链：AI 软件                | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | 供应链：数据                   | T-PERSIST-003                                                    |
| AML.T0031     | 侵蚀 AI 模型完整性             | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI 模型推理 API 访问           | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | 制作对抗性数据                 | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM Prompt Injection: Direct   | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM Prompt Injection: Indirect | T-EXEC-002                                                       |

### 7.2 关键安全文件

| 路径                                | 用途                   | 风险等级 |
| ----------------------------------- | ---------------------- | -------- |
| `src/infra/exec-approvals.ts`       | 命令批准逻辑           | **严重** |
| `src/gateway/auth.ts`               | Gateway(网关) 身份验证 | **严重** |
| `src/web/inbound/access-control.ts` | 渠道访问控制           | **严重** |
| `src/infra/net/ssrf.ts`             | SSRF 防护              | **严重** |
| `src/security/external-content.ts`  | 提示注入缓解           | **严重** |
| `src/agents/sandbox/tool-policy.ts` | 工具策略执行           | **严重** |
| `convex/lib/moderation.ts`          | ClawHub moderation     | **高**   |
| `convex/lib/skillPublish.ts`        | 技能发布流程           | **高**   |
| `src/routing/resolve-route.ts`      | 会话隔离               | **中**   |

### 7.3 术语表

| 术语              | 定义                                                |
| ----------------- | --------------------------------------------------- |
| **ATLAS**         | MITRE 针对 AI 系统的对抗性威胁态势                  |
| **ClawHub**       | OpenClaw's skill marketplace                        |
| **Gateway(网关)** | OpenClaw's message routing and authentication layer |
| **MCP**           | 模型上下文协议 - 工具提供商接口                     |
| **提示词注入**    | 一种将恶意指令嵌入输入的攻击                        |
| **技能**          | Downloadable extension for OpenClaw agents          |
| **SSRF**          | 服务器端请求伪造                                    |

---

_本威胁模型是一份持续更新的文档。请将安全问题报告至 security@openclaw.ai_

import zh from "/components/footer/zh.mdx";

<zh />
