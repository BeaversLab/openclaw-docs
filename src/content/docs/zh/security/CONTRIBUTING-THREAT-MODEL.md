---
summary: "如何为 OpenClaw 威胁模型做出贡献"
title: "为威胁模型做贡献"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

感谢您帮助提高 OpenClaw 的安全性。此威胁模型是一份动态文档，我们欢迎任何人做出贡献——您无需成为安全专家。

## 贡献方式

### 添加威胁

发现了我们未涵盖的攻击向量或风险？请在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提出问题，并用您自己的话进行描述。您无需了解任何框架或填写每个字段——只需描述场景即可。

**建议包含（但非必需）：**

- 攻击场景及其可能被利用的方式
- OpenClaw 的哪些部分受影响（CLI、网关、通道、ClawHub、MCP 服务器等）
- 您认为的严重程度（低 / 中 / 高 / 严重）
- 相关研究、CVE 或现实示例的任何链接

我们将在审查期间处理 ATLAS 映射、威胁 ID 和风险评估。如果您想包含这些细节，那很好——但这并不是预期的要求。

> **这是用于向威胁模型添加内容，而非报告实时漏洞。** 如果您发现了可利用的漏洞，请参阅我们的 [信任页面](https://trust.openclaw.ai) 了解负责任的披露说明。

### 建议缓解措施

关于如何解决现有威胁有什么想法吗？打开一个 issue 或 PR 引用该威胁。有用的缓解措施应具体且可操作——例如，“在网关处实施每个发送者每分钟 10 条消息的速率限制”比“实施速率限制”更好。

### 提出攻击链

攻击链展示了多个威胁如何组合成一个现实的攻击场景。如果您发现了危险的组合，请描述步骤以及攻击者如何将它们串联起来。一段简短的关于攻击在实践中如何展开的叙述比正式的模板更有价值。

### 修复或改进现有内容

拼写错误、澄清、过时信息、更好的示例——欢迎提交 PR，无需提出 issue。

## 我们使用的工具

### MITRE ATLAS 框架

此威胁模型基于 [MITRE ATLAS](https://atlas.mitre.org/)（AI 系统对抗性威胁格局）构建，该框架专为 AI/ML 威胁（如提示注入、工具滥用和代理利用）而设计。您无需了解 ATLAS 即可做出贡献——我们会在审查期间将提交的内容映射到该框架。

### 威胁 ID

每个威胁都会获得一个类似 `T-EXEC-003` 的 ID。类别包括：

| 代码    | 类别                                  |
| ------- | ------------------------------------- |
| RECON   | 侦察 (Reconnaissance) - 信息收集      |
| ACCESS  | 初始访问 (Initial access) - 获取入口  |
| EXEC    | 执行 (Execution) - 运行恶意操作       |
| PERSIST | 持久化 (Persistence) - 维持访问权限   |
| EVADE   | 防御规避 (Defense evasion) - 避免检测 |
| DISC    | 设备发现 - 了解环境                   |
| EXFIL   | 数据渗出 - 窃取数据                   |
| IMPACT  | 影响 - 破坏或中断                     |

ID 由维护者在审查期间分配。您无需选择一个。

### 风险级别

| 级别                | 含义                                      |
| ------------------- | ----------------------------------------- |
| **严重 (Critical)** | 系统完全沦陷，或高可能性 + 严重影响       |
| **高 (High)**       | 可能造成重大损害，或中等可能性 + 严重影响 |
| **中等 (Medium)**   | 中等风险，或低可能性 + 高影响             |
| **低 (Low)**        | 可能性低且影响有限                        |

如果您不确定风险级别，只需描述影响，我们会进行评估。

## 审查流程

1. **分类 (Triage)** - 我们会在 48 小时内审查新的提交
2. **评估 (Assessment)** - 我们验证可行性，分配 ATLAS 映射和威胁 ID，并确认风险级别
3. **文档 (Documentation)** - 我们确保所有内容格式正确且完整
4. **合并 (Merge)** - 添加到威胁模型和可视化中

## 资源

- [ATLAS 网站](https://atlas.mitre.org/)
- [ATLAS 技术战术](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [OpenClaw 威胁模型](/zh/security/THREAT-MODEL-ATLAS)

## 联系方式

- **安全漏洞：** 请参阅我们的 [信任页面](https://trust.openclaw.ai) 了解报告说明
- **威胁模型咨询：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提交 issue
- **常规交流：** Discord #security 渠道

## 致谢

威胁模型的贡献者将在威胁模型致谢、发行说明以及 OpenClaw 安全名人堂中获得认可，以表彰其重大贡献。

## 相关内容

- [威胁模型](/zh/security/THREAT-MODEL-ATLAS)
- [形式化验证](/zh/security/formal-verification)
