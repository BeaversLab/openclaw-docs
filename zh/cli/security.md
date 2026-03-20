---
summary: "CLI 参考，用于 `openclaw security`（审核并修复常见的安全隐患）"
read_when:
  - 您希望对配置/状态进行快速的安全审核
  - 您希望应用安全的“修复”建议（chmod、收紧默认设置）
title: "security"
---

# `openclaw security`

安全工具（审核 + 可选修复）。

相关：

- 安全指南：[Security](/zh/gateway/security)

## 审核

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

当多个私信发送者共享主会话时，审核会发出警告并建议使用**安全私信模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"`（对于多账号渠道使用 `per-account-channel-peer`）。
这用于协作/共享收件箱加固。由互不信任/敌对的操作员共享单个 Gateway(网关) 并不是推荐的设置；请使用单独的网关（或单独的操作系统用户/主机）来划分信任边界。
当配置暗示可能存在共享用户入口时（例如开放的私信/群组策略、已配置的群组目标或通配符发送者规则），它还会发出 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认情况下是个人助手信任模型。
对于有意的共享用户设置，审核建议对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并避免在该运行时中包含个人/私有身份或凭据。
当小型模型（`<=300B`）在未进行沙箱隔离且启用了 Web/浏览器工具的情况下使用时，它也会发出警告。
对于 Webhook 入口，当 `hooks.token` 重用 Gateway(网关) 令牌、`hooks.defaultSessionKey` 未设置、`hooks.allowedAgentIds` 不受限制、启用了请求 `sessionKey` 覆盖以及在没有 `hooks.allowedSessionKeyPrefixes` 的情况下启用覆盖时，它都会发出警告。
它还在沙箱模式关闭时配置了沙箱 Docker 设置时发出警告，当 `gateway.nodes.denyCommands` 使用无效的类似模式/未知条目（仅限精确的节点命令名匹配，而非 Shell 文本过滤）时，当 `gateway.nodes.allowCommands` 显式启用危险的节点命令时，当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时，当开放群组暴露运行时/文件系统工具而没有沙箱/工作区防护时，以及当已安装的扩展插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，则存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄漏元数据）。
当沙箱浏览器使用 Docker `bridge` 网络而没有 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签时（例如迁移前缺少 `openclaw.browserConfigEpoch` 的容器），它也会发出警告，并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而不是稳定的 ID 时，它会发出警告（适用于 Discord、Slack、Google Chat、MS Teams、Mattermost、IRC 范围）。
当 `gateway.auth.mode="none"` 导致 Gateway(网关) HTTP API 在没有共享机密的情况下可访问时，它会发出警告（`/tools/invoke` 加上任何启用的 `/v1/*` 端点）。
前缀为 `dangerous`/`dangerously` 的设置是显式的紧急操作员覆盖；仅启用其中一个本身并不代表存在安全漏洞报告。
有关完整的不安全参数清单，请参阅 [Security](/zh/gateway/security) 中的“Insecure or dangerous flags summary”部分。

SecretRef 行为：

- `security audit` 在只读模式下为指定路径解析受支持的 SecretRefs。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测认证；它们不会重写配置或 SecretRef 映射。

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

## `--fix` 更改的内容

`--fix` 应用安全、确定的补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持渠道中的账户变体）
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限（`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话 `*.jsonl`）

`--fix` **不** 会：

- 轮换令牌/密码/API 密钥
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改网关绑定/认证/网络暴露选项
- 移除或重写插件/技能

import en from "/components/footer/en.mdx";

<en />
