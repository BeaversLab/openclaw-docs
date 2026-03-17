---
summary: "用于 `openclaw security`（审计和修复常见安全隐患）的 CLI 参考"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关：

- 安全指南：[安全](/zh/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

当多个私信发送者共享主会话时，审计会发出警告并推荐**安全私信模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"`（对于多账号渠道使用 `per-account-channel-peer`）。
这是为了协作/共享收件箱的加固。由互不信任/敌对的操作员共享单个 Gateway(网关) 不是推荐的设置；请使用单独的 Gateway(网关)（或单独的操作系统用户/主机）来拆分信任边界。
当配置暗示可能存在共享用户入口（例如开放式私信/群组策略、配置的群组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认是一个个人助手信任模型。
对于有意的共享用户设置，审计建议是对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并确保个人/私密身份或凭证不涉及该运行时。
当小型模型（`<=300B`）在没有沙箱隔离的情况下使用并启用了 Web/浏览器工具时，它也会发出警告。
对于 Webhook 入口，当 `hooks.defaultSessionKey` 未设置、启用了请求 `sessionKey` 覆盖以及在没有 `hooks.allowedSessionKeyPrefixes` 的情况下启用覆盖时，它会发出警告。
当在沙箱模式关闭时配置了沙箱 Docker 设置、当 `gateway.nodes.denyCommands` 使用无效的模式类/未知条目（仅精确节点命令名匹配，而非 shell 文本过滤）、当 `gateway.nodes.allowCommands` 显式启用了危险的节点命令、当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖、当开放群组在没有沙箱/工作区防护的情况下暴露运行时/文件系统工具，以及当已安装的扩展插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，则存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用没有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 网络时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间连接）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签（例如迁移前缺少 `openclaw.browserConfigEpoch` 的容器）时，它也会发出警告，并推荐 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖于可变的名称/电子邮件/标签而非稳定的 ID（Discord、Slack、Google Chat、MS Teams、Mattermost、IRC 适用范围）时，它会发出警告。
当 `gateway.auth.mode="none"` 导致 Gateway(网关) HTTP API 在没有共享密钥（`/tools/invoke` 加上任何启用的 `/v1/*` 端点）的情况下可访问时，它会发出警告。
前缀为 `dangerous`/`dangerously` 的设置是明确的紧急操作员覆盖；仅启用其中一项本身并不构成安全漏洞报告。
有关完整的不安全参数清单，请参阅 [安全性](/zh/gateway/security) 中的“不安全或危险标志摘要”部分。

SecretRef 行为：

- `security audit` 会以只读模式解析其目标路径支持的 SecretRefs。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续进行并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅针对该命令调用覆盖深度探测（deep-probe）身份验证；它们不会重写配置或 SecretRef 映射。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果结合使用 `--fix` 和 `--json`，输出将同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 会更改什么

`--fix` 应用安全、确定性的补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持渠道中的账户变体）
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）

`--fix` **不会**：

- 轮换令牌/密码/API 密钥
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改网关绑定/身份验证/网络暴露选择
- 移除或重写插件/技能

import zh from "/components/footer/zh.mdx";

<zh />
