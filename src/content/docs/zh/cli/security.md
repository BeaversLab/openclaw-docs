---
summary: "用于 `openclaw security`（审计和修复常见安全隐患）的 CLI 参考"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "Security"
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

普通的 `security audit` 停留在冷配置/文件系统/只读路径上。它默认不发现插件运行时安全收集器，因此常规审计不会加载每个已安装的插件运行时。使用 `--deep` 可以包括尽力而为的实时 Gateway(网关) 探测和插件拥有的安全审计收集器；显式的内部调用者在已经具有适当运行时范围时，也可以选择加入这些插件拥有的收集器。

当多个私信发送者共享主会话时，审计会发出警告并推荐 **secure 私信 mode**：`session.dmScope="per-channel-peer"`（对于多账户渠道为 `per-account-channel-peer`Gateway(网关)），用于共享收件箱。
这是为了协作/共享收件箱的加固。由互不信任/对抗的操作员共享单个 Gateway(网关) 不是推荐的设置；请使用独立的网关（或独立的操作系统用户/主机）来划分信任边界。
当配置暗示可能存在共享用户入口（例如开放式私信/群组策略、已配置的群组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`OpenClaw，并提醒您 OpenClaw 默认采用个人助手信任模型。
对于有意的共享用户设置，审计建议对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并确保该运行时中不包含个人/私有身份或凭据。
当小型模型（`<=300B`）在未启用沙箱隔离且启用了 Web/浏览器工具的情况下使用时，它也会发出警告。
对于 Webhook 入口，当 `hooks.token`Gateway(网关) 重用 Gateway(网关) 令牌、`hooks.token` 过短、`hooks.path="/"`、`hooks.defaultSessionKey` 未设置、`hooks.allowedAgentIds` 不受限制、启用了请求 `sessionKey` 覆盖，以及在未启用 `hooks.allowedSessionKeyPrefixes`Docker 的情况下启用覆盖时，它会发出警告。
当沙箱模式关闭时配置了 Docker 沙箱设置、`gateway.nodes.denyCommands` 使用无效的模式类/未知条目（仅限精确的节点命令名称匹配，而非 Shell 文本过滤）、`gateway.nodes.allowCommands` 显式启用了危险的节点命令、全局 `tools.profile="minimal"` 被代理工具配置文件覆盖、禁用了写入/编辑工具但 `exec` 在没有限制性沙箱文件系统边界的情况下仍然可用、开放群组在没有沙箱/工作区守卫的情况下暴露了运行时/文件系统工具，以及已安装的插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在标头欺骗风险）和 `discovery.mdns.mode="full"`Docker（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用 Docker `bridge` 网络但没有 `sandbox.browser.cdpSourceRange`Docker 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*`Docker 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过期的哈希标签（例如迁移前容器缺少 `openclaw.browserConfigEpoch`）时，它也会发出警告，并建议 `openclaw sandbox recreate --browser --all`npmDiscordSlackGoogle ChatMicrosoft TeamsMattermost。
当基于 npm 的插件/挂钩安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而非稳定的 ID（Discord、Slack、Google Chat、Microsoft Teams、Mattermost，以及适用的 IRC 范围）时，它会发出警告。
当 `gateway.auth.mode="none"`Gateway(网关) 导致 Gateway(网关) HTTP API 在没有共享密钥（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点）的情况下可访问时，它会发出警告。
带有 `dangerous`/`dangerously` 前缀的设置是明确的紧急操作员覆盖；仅启用其中一个本身并不构成安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/zh/gateway/security) 中的“Insecure or dangerous flags summary”部分。

SecretRef 行为：

- `security audit` 会以只读模式解析其目标路径中支持的 SecretRef。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续进行并报告 `secretDiagnostics`（而不是崩溃）。
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

## `--fix` 会更改什么

`--fix` 应用安全、确定性的补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持渠道中的账户变体）
- 当 WhatsApp 组策略翻转为 `allowlist` 时，如果该列表存在且配置尚未
  定义 `allowFrom`，则从存储的 `allowFrom` 文件中播种 `groupAllowFrom`
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 同时收紧从 `openclaw.json` 引用的配置包含文件的权限
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 轮换令牌/密码/API 密钥
- 禁用工具 (`gateway`, `cron`, `exec` 等)
- 更改网关绑定/认证/网络暴露选择
- 删除或重写插件/技能

## 相关

- [CLI 参考](/zh/cli)
- [安全审计](/zh/gateway/security)
