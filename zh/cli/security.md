---
summary: "`openclaw security` 的 CLI 参考（审计并修复常见的安全隐患）"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (chmod, tighten defaults)
title: "security"
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关：

- 安全指南：[Security](/zh/en/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

当多个 DM 发送者共享主会话时，审计会发出警告并推荐 **安全 DM 模式**：`session.dmScope="per-channel-peer"`（或多账号渠道使用 `per-account-channel-peer`）用于共享收件箱。
这是为了协作/共享收件箱的加固。由互不信任/对抗的操作员共享单个网关并非推荐的设置；请使用单独的网关（或单独的操作系统用户/主机）来分离信任边界。
当配置暗示可能存在共享用户入口时（例如开放的 DM/群组策略、已配置的群组目标或通配符发送者规则），它还会发出 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认采用个人助手信任模型。
对于有意的共享用户设置，审计建议是对所有会话进行沙盒隔离，将文件系统访问限制在工作区范围内，并将个人/私有身份或凭证与该运行环境隔离。
当小模型（`<=300B`）在未启用沙盒的情况下使用并启用了 Web/浏览器工具时，它也会发出警告。
对于 Webhook 入口，当未设置 `hooks.defaultSessionKey`、启用了请求 `sessionKey` 覆盖以及在没有 `hooks.allowedSessionKeyPrefixes` 的情况下启用覆盖时，它会发出警告。
当配置了沙盒 Docker 设置但沙盒模式关闭时，当 `gateway.nodes.denyCommands` 使用无效的模式类/未知条目（仅精确匹配节点命令名称，而非 shell 文本过滤），当 `gateway.nodes.allowCommands` 显式启用危险的节点命令，当全局 `tools.profile="minimal"` 被 Agent 工具配置文件覆盖，当开放群组在没有沙盒/工作区保护的情况下暴露运行时/文件系统工具，以及已安装的扩展插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置不当，存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙盒浏览器使用没有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 网络时，它也会发出警告。
它还会标记危险的沙盒 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙盒浏览器 Docker 容器缺少/过时的哈希标签时（例如迁移前缺少 `openclaw.browserConfigEpoch` 的容器），它也会发出警告并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖于可变的名称/电子邮件/标签而非稳定的 ID 时，它会发出警告（适用于 Discord、Slack、Google Chat、MS Teams、Mattermost、IRC 的作用域）。
当 `gateway.auth.mode="none"` 导致网关 HTTP API 在没有共享密钥的情况下可访问时（`/tools/invoke` 加上任何启用的 `/v1/*` 端点），它会发出警告。
前缀为 `dangerous`/`dangerously` 的设置是明确的紧急操作员覆盖；仅启用其中一个本身并不构成安全漏洞报告。
有关完整的危险参数清单，请参阅 [安全](/zh/en/gateway/security) 中的“不安全或危险标志摘要”部分。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果 `--fix` 和 `--json` 结合使用，输出将包括修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 更改了什么

`--fix` 应用安全、确定的修复措施：

- 将常见的 `groupPolicy="open"` 切换为 `groupPolicy="allowlist"`（包括受支持渠道中的账户变体）
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）

`--fix` **不**包括：

- 轮换令牌/密码/API 密钥
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改网关绑定/身份验证/网络暴露选项
- 删除或重写插件/技能
