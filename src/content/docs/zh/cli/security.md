---
summary: "`openclaw security`CLICLI参考 (审计并修复常见的安全隐患)"
read_when:
  - You want to run a quick security audit on config/state
  - You want to apply safe "fix" suggestions (permissions, tighten defaults)
title: "安全性"
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

普通的 `security audit` 保持在冷配置/文件系统/只读路径上。它默认不发现插件运行时安全收集器，因此例行审计不会加载每个已安装的插件运行时。使用 `--deep`Gateway(网关) 以包含尽最大努力的实时 Gateway(网关) 探针和插件拥有的安全审计收集器；显式的内部调用者当它们已经具有适当的运行时范围时，也可以选择加入这些插件拥有的收集器。

当多个私信发送者共享主会话时，审计会发出警告，并建议针对共享收件箱使用**安全私信模式**：`session.dmScope="per-channel-peer"`（对于多账号频道，使用 `per-account-channel-peer`Gateway(网关)）。
这是为了加强协作/共享收件箱的安全性。由互不信任或敌对的操作员共享单个 Gateway(网关) 并不是推荐的设置；请使用单独的网关（或单独的操作系统用户/主机）来分隔信任边界。
当配置暗示可能存在共享用户入站（例如开放私信/群组策略、配置的群组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`OpenClaw，并提醒您 OpenClaw 默认采用个人助手信任模型。
对于有意的共享用户设置，审计建议对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并将个人/私人身份或凭证排除在该运行时之外。
当在未进行沙箱隔离且启用了 Web/浏览器工具的情况下使用小型模型（`<=300B`）时，它也会发出警告。
对于 Webhook 入站，它在以下情况下发出警告：

- `hooks.token`Gateway(网关) 重用了活动的 Gateway(网关) 共享密钥身份验证值（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）
- `hooks.token` 过短
- `hooks.path="/"`
- `hooks.defaultSessionKey` 未设置
- `hooks.allowedAgentIds` 不受限制
- 请求 `sessionKey` 覆盖已启用
- 在未启用 `hooks.allowedSessionKeyPrefixes` 的情况下启用了覆盖

如果 Gateway(网关) 密码身份验证仅在启动时提供，请将相同的值传递给 Gateway(网关)`openclaw security audit --auth password --password <password>`，以便审计可以对照 `hooks.token`Gateway(网关) 进行检查。
出于兼容性考虑，重用密码模式是审计发现的问题；请轮换其中一个密钥，而不是期望 Gateway(网关) 启动拒绝该配置。

当沙盒模式关闭时配置了沙盒 Docker 设置，当 `gateway.nodes.denyCommands` 使用无效的模式类/未知条目（仅限精确节点命令名称匹配，而非 shell 文本过滤），当 `gateway.nodes.allowCommands` 显式启用了危险的节点命令，当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时，当禁用了写入/编辑工具但 `exec` 在没有约束性沙盒文件系统边界的情况下仍然可用时，当开放组在没有沙盒/工作区保护的情况下暴露运行时/文件系统工具时，以及当已安装的插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，则存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙盒浏览器在没有 `sandbox.browser.cdpSourceRange` 的情况下使用 Docker `bridge` 网络时，它也会发出警告。
它还会标记危险的沙盒 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙盒浏览器 Docker 容器缺少/过期的哈希标签时，它也会发出警告（例如迁移前容器缺少 `openclaw.browserConfigEpoch`）并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖于可变的名称/电子邮件/标签而非稳定的 ID 时（如适用，包括 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 范围），它会发出警告。
当 `gateway.auth.mode="none"` 使 Gateway(网关) HTTP API 在没有共享密钥的情况下可访问时（`/tools/invoke` 加上任何已启用的 `/v1/*` 端点），它会发出警告。
以 `dangerous`/`dangerously` 为前缀的设置是显式的紧急操作员覆盖；单独启用其中一个本身并不代表安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/zh/gateway/security) 中的“Insecure or dangerous flags summary”部分。

可以使用 `security.audit.suppressions` 接受有意的持续发现。
每个抑制项匹配一个确切的 `checkId`，并且可以使用
`titleIncludes` 和/或 `detailIncludes` 不区分大小写的子字符串进行缩小范围：

```json
{
  "security": {
    "audit": {
      "suppressions": [
        {
          "checkId": "plugins.tools_reachable_permissive_policy",
          "detailIncludes": "Enabled extension plugins: gbrain",
          "reason": "trusted local operator plugin"
        }
      ]
    }
  }
}
```

被抑制的发现项将从活动的 `summary` 和 `findings` 列表中移除。
JSON 输出将它们保留在 `suppressedFindings` 下以供审核。
当配置了抑制项时，活动输出还会保留一个无法抑制的
`security.audit.suppressions.active` 信息发现，以便读者可以知道审核
已被过滤。危险的配置标志每个发现项发出一个标志，因此
接受一个危险标志不会隐藏共享同一 `config.insecure_or_dangerous_flags` checkId 的其他已启用标志。
由于抑制项可能会隐藏持续存在的风险，因此通过 agent-run shell 命令
添加或删除它们需要执行批准，除非 exec 已经使用
`security="full"` 和 `ask="off"` 运行以进行受信任的本地自动化。

SecretRef 行为：

- `security audit` 以只读模式为其目标路径解析受支持的 SecretRef。
- 如果 SecretRef 在当前命令路径中不可用，审核将继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测身份验证；它们不会重写配置或 SecretRef 映射。

## JSON 输出

使用 `--json` 进行 CI/策略检查：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果结合 `--fix` 和 `--json`，输出将同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 会更改什么

`--fix` 应用安全的、确定性的修复措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持渠道中的账户变体）
- 当 WhatsApp 群组策略切换到 WhatsApp`allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从存储的 `allowFrom` 文件中为 `groupAllowFrom` 做种子
- 将 `"off"` 中的 `logging.redactSensitive` 设置为 `"tools"`
- 收紧状态/配置及常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 同时收紧 `openclaw.json` 中引用的配置包含文件
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls`Windows 重置

`--fix` **不** 会：

- 轮换令牌/密码/API 密钥
- 禁用工具 (`gateway`, `cron`, `exec`, 等)
- 更改网关绑定/认证/网络暴露选择
- 移除或重写插件/技能

## 相关

- [CLI 参考](CLI/en/cli)
- [安全审计](/zh/gateway/security)
