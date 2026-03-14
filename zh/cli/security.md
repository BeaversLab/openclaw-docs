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

- 安全指南：[安全性](/zh/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

当多个私信发送者共享主会话时，审核会发出警告，并建议使用 **安全私信模式**：针对共享收件箱，使用 `session.dmScope="per-channel-peer"`（或多账号渠道使用 `per-account-channel-peer`）。
这是为了加强协作/共享收件箱的安全性。由互不信任/敌对的操作者共享单个 Gateway(网关) 网关不是推荐的设置；应使用独立的网关（或独立的操作系统用户/主机）来划分信任边界。
当配置表明可能存在共享用户入口（例如开放私信/群组策略、配置的群组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认采用个人助手信任模型。
对于有意的共享用户设置，审核建议是对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并确保该运行时中不包含个人/私有身份或凭据。
当小型模型（`<=300B`）在没有沙箱隔离的情况下使用，并且启用了 Web/浏览器工具时，它也会发出警告。
对于 Webhook 入口，当 `hooks.defaultSessionKey` 未设置、请求 `sessionKey` 覆盖已启用，以及在没有 `hooks.allowedSessionKeyPrefixes` 的情况下启用覆盖时，它会发出警告。
当在沙箱模式关闭的情况下配置了 Docker 沙箱设置时，当 `gateway.nodes.denyCommands` 使用无效的类似模式/未知条目（仅精确匹配节点命令名称，而不是 Shell 文本过滤）时，当 `gateway.nodes.allowCommands` 显式启用危险的节点命令时，当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时，当开放组在没有沙箱/工作区保护的情况下暴露运行时/文件系统工具时，以及当已安装的扩展插件工具可能在宽松工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置不当，存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用 Docker `bridge` 网络而没有 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签（例如迁移前容器缺少 `openclaw.browserConfigEpoch`）时，它也会发出警告，并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而不是稳定的 ID（Discord、Slack、Google Chat、MS Teams、Mattermost、适用的 IRC 范围）时，它会发出警告。
当 `gateway.auth.mode="none"` 导致 Gateway(网关) 网关 HTTP API 在没有共享密钥（`/tools/invoke` 加上任何启用的 `/v1/*` 端点）的情况下可访问时，它会发出警告。
前缀为 `dangerous`/`dangerously` 的设置是明确的应急操作员覆盖；仅启用其中一个本身并不构成安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/zh/gateway/security) 中的“Insecure or dangerous flags summary”部分。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果结合使用 `--fix` 和 `--json`，输出将包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 的更改内容

`--fix` 应用安全的、确定性的补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括受支持渠道中的帐户变体）
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置文件和常见敏感文件（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）的权限

`--fix` **不会**：

- 轮换令牌/密码/API 密钥
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改网关绑定/身份验证/网络暴露选项
- 删除或重写插件/技能

import zh from '/components/footer/zh.mdx';

<zh />
