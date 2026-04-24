---
summary: "用于 `openclaw security`（审计和修复常见安全隐患）的 CLI 参考"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe “fix” suggestions (permissions, tighten defaults)
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

当多个私信发送者共享主会话时，审计会发出警告并推荐**安全私信模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"` （对于多账号渠道，使用 `per-account-channel-peer`）。
这是为了加强协作/共享收件箱的安全性。多个互不信任或对立的操作员共享单个 Gateway(网关) 并非推荐的设置；请使用单独的网关（或单独的操作系统用户/主机）来划分信任边界。
当配置暗示可能存在共享用户入口（例如开放的私信/群组策略、配置的群组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`，并提醒您 OpenClaw 默认采用的是个人助手信任模型。
对于有意的共享用户设置，审计建议是对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并确保个人/私密身份或凭证不暴露于该运行时。
当小模型（`<=300B`）在未进行沙箱隔离且启用了 Web/浏览器工具的情况下使用时，它也会发出警告。
对于 Webhook 入口，当 `hooks.token` 重用 Gateway(网关) 令牌、当 `hooks.token` 过短、当 `hooks.path="/"`、当 `hooks.defaultSessionKey` 未设置、当 `hooks.allowedAgentIds` 不受限、当启用了请求 `sessionKey` 覆盖，以及当启用覆盖但没有 `hooks.allowedSessionKeyPrefixes` 时，它会发出警告。
它还会在沙箱模式关闭时配置了沙箱 Docker 设置时发出警告，当 `gateway.nodes.denyCommands` 使用无效的模式类/未知条目（仅精确匹配节点命令名称，而非 Shell 文本过滤）时，当 `gateway.nodes.allowCommands` 显式启用危险的节点命令时，当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时，当开放群组在无沙箱/工作区防护的情况下暴露运行时/文件系统工具时，以及当已安装的插件工具可能在宽松的工具策略下被访问时发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用没有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 网络时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间连接）。
当现有的沙箱浏览器 Docker 容器缺少或过时的哈希标签（例如迁移前容器缺少 `openclaw.browserConfigEpoch`）时，它也会发出警告并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而非稳定的 ID 时，它会发出警告（Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围，如适用）。
当 `gateway.auth.mode="none"` 导致 Discord HTTP API 在没有共享密钥的情况下可访问时（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点），它会发出警告。
带有 `dangerous`/`dangerously` 前缀的设置是明确的应急操作员覆盖；仅启用其中一个本身并不构成安全漏洞报告。
有关完整危险参数清单，请参阅 [安全性](/zh/gateway/security) 中的“不安全或危险标志摘要”部分。

SecretRef 行为：

- `security audit` 在只读模式下解析其目标路径支持的 SecretRefs。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的 deep-probe 身份验证；它们不会重写配置或 SecretRef 映射。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果组合使用 `--fix` 和 `--json`，输出将包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 更改的内容

`--fix` 应用安全的、确定性的补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持渠道中的账户变体）
- 当 WhatsApp 组策略翻转为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从存储的 `allowFrom` 文件中设定 `groupAllowFrom`
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 同时收紧从 `openclaw.json` 引用的配置包含文件的权限
- 在 POSIX 主机上使用 `chmod` 并在 Windows 上使用 `icacls` 重置

`--fix` **不** 会：

- 轮换令牌/密码/API 密钥
- 禁用工具 (`gateway`, `cron`, `exec` 等)
- 更改网关绑定/身份验证/网络暴露选择
- 删除或重写插件/技能
