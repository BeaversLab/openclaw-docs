---
summary: "如何为 OpenClaw 威胁模型做出贡献"
title: "为威胁模型做贡献"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# 为 OpenClaw 威胁模型做贡献

感谢您帮助让 OpenClaw 更加安全。此威胁模型是一份不断更新的文档，我们欢迎任何人的贡献——您不需要成为安全专家。

## 贡献方式

### 添加威胁

发现了我们未涵盖的攻击向量或风险？请在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上开启一个 Issue 并用自己的话描述它。您不需要了解任何框架或填写每个字段——只需描述该场景即可。

**最好包括以下内容（但非必需）：**

- 攻击场景及其利用方式
- OpenClaw 的哪些部分受影响（CLI、网关、通道、ClawHub、MCP 服务器等）
- 您认为的严重程度（低 / 中 / 高 / 严重）
- 相关研究、CVE 或真实案例的任何链接

我们将在审查期间处理 ATLAS 映射、威胁 ID 和风险评估。如果您想包含这些详细信息，那很好——但这并不是预期的。

> **这是为了添加到威胁模型中，而不是报告现存的漏洞。** 如果您发现了可利用的漏洞，请参阅我们的 [Trust 页面](https://trust.openclaw.ai) 了解负责任的披露说明。

### 建议缓解措施

有解决现有威胁的想法？打开一个引用该威胁的 issue 或 PR。有用的缓解措施应具体且可操作——例如，“在网关实施每发送方 10 条/分钟的消息速率限制”比“实施速率限制”更好。

### 提出攻击链

攻击链展示了多个威胁如何组合成一个现实的攻击场景。如果您看到了危险的组合，请描述步骤以及攻击者如何将它们链接在一起。一段简短的关于攻击在实践中如何展开的叙述比正式的模板更有价值。

### 修复或改进现有内容

拼写错误、澄清说明、过时信息、更好的示例——欢迎 PR，无需 issue。

## 我们使用的内容

### MITRE ATLAS

此威胁模型基于 [MITRE ATLAS](https://atlas.mitre.org/)（针对 AI 系统的对抗性威胁景观）构建，该框架专为 AI/ML 威胁设计，例如提示注入、工具滥用和代理利用。您不需要了解 ATLAS 即可做出贡献——我们会在审查期间将提交的内容映射到该框架。

### 威胁 ID

每个威胁都会获得一个类似 `T-EXEC-003` 的 ID。类别包括：

| 代码    | 类别                       |
| ------- | -------------------------- |
| RECON   | Reconnaissance - 信息收集  |
| ACCESS  | Initial access - 获取入口  |
| EXEC    | Execution - 执行恶意操作   |
| PERSIST | Persistence - 维持访问权限 |
| EVADE   | Defense evasion - 逃避检测 |
| DISC    | 设备发现 - 了解环境        |
| EXFIL   | Exfiltration - 窃取数据    |
| IMPACT  | Impact - 破坏或中断        |

ID 由维护者在审查期间分配。您无需自行选择。

### 风险级别

| 等级     | 含义                                      |
| -------- | ----------------------------------------- |
| **严重** | 系统完全受损，或高可能性 + 严重影响       |
| **高**   | 可能造成重大破坏，或中等可能性 + 严重影响 |
| **中等** | 中等风险，或低可能性 + 高影响             |
| **低**   | 可能性低且影响有限                        |

如果您不确定风险等级，只需描述影响，我们会进行评估。

## 审查流程

1. **分类** - 我们会在 48 小时内审查新的提交内容
2. **评估** - 我们验证可行性，分配 ATLAS 映射和威胁 ID，验证风险等级
3. **文档记录** - 我们确保所有内容格式正确且完整
4. **合并** - 添加到威胁模型和可视化中

## 资源

- [ATLAS 网站](https://atlas.mitre.org/)
- [ATLAS 技术](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威胁模型](/zh/security/THREAT-MODEL-ATLAS)

## 联系方式

- **安全漏洞：** 请参阅我们的 [Trust 页面](https://trust.openclaw.ai) 了解报告说明
- **威胁模型问题：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上开启一个 Issue
- **一般交流：** Discord #security 渠道

## 致谢

威胁模型的贡献者将在威胁模型致谢、发布说明以及 OpenClaw 安全名人堂中获得认可，以表彰其重要贡献。

## 相关内容

- [威胁模型](/zh/security/THREAT-MODEL-ATLAS)
- [形式化验证](/zh/security/formal-verification)
