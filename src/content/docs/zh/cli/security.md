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

- 安全指南：[安全性](/zh/gateway/security)

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

当多个私信发送者共享主会话时，审计会发出警告并推荐 **安全私信模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"`（对于多账户渠道使用 `per-account-channel-peer`Gateway(网关)）。
这是为了加强协作/共享收件箱的安全性。由相互不信任或对立的操作员共享单个 Gateway（网关）不是推荐的设置；应使用独立的网关（或独立的操作系统用户/主机）来划分信任边界。
当配置表明可能存在共享用户入站（例如开放私信/组策略、已配置的组目标或通配符发送者规则）时，它还会发出 `security.trust_model.multi_user_heuristic`OpenClaw，并提醒您 OpenClaw 默认是个人助手信任模型。
对于有意的共享用户设置，审计建议是对所有会话进行沙箱隔离，将文件系统访问限制在工作区范围内，并避免在该运行时中使用个人/私有身份或凭据。
当小型模型（`<=300B`）在未进行沙箱隔离且启用了 Web/浏览器工具的情况下使用时，它也会发出警告。
对于 Webhook 入站，当 `hooks.token`Gateway(网关) 重用 Gateway（网关）令牌、当 `hooks.token` 过短、当 `hooks.path="/"`、当 `hooks.defaultSessionKey` 未设置、当 `hooks.allowedAgentIds` 不受限制、当启用了请求 `sessionKey` 覆盖，以及当在未使用 `hooks.allowedSessionKeyPrefixes`Docker 的情况下启用覆盖时，它会发出警告。
当在沙箱模式关闭时配置了沙箱 Docker 设置、当 `gateway.nodes.denyCommands` 使用无效的类似模式/未知条目（仅精确节点命令名称匹配，而非 Shell 文本过滤）、当 `gateway.nodes.allowCommands` 显式启用了危险的节点命令、当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖、当写入/编辑工具被禁用但 `exec` 仍然可用且没有限制性沙箱文件系统边界、当开放组在没有沙箱/工作区保护的情况下暴露运行时/文件系统工具，以及当已安装的插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在标头欺骗风险）和 `discovery.mdns.mode="full"`Docker（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用 Docker `bridge` 网络而没有 `sandbox.browser.cdpSourceRange`Docker 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*`Docker 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签（例如迁移前缺少 `openclaw.browserConfigEpoch` 的容器）时，它也会发出警告，并推荐 `openclaw sandbox recreate --browser --all`npmDiscordSlackGoogle ChatMicrosoft TeamsMattermost。
当基于 npm 的插件/挂钩 安装记录未固定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而不是稳定的 ID（Discord、Slack、Google Chat、Microsoft Teams、Mattermost，以及适用的 IRC 范围）时，它会发出警告。
当 `gateway.auth.mode="none"`Gateway(网关) 导致 Gateway（网关）HTTP API 在没有共享密钥的情况下可访问（`/tools/invoke` 加上任何启用的 `/v1/*` 端点）时，它会发出警告。
以 `dangerous`/`dangerously` 为前缀的设置是显式的应急操作员覆盖；仅启用其中一个本身并不算是安全漏洞报告。
有关完整的危险参数清单，请参阅 [安全性](/zh/gateway/security) 中的“不安全或危险标志汇总”部分。

可以通过 `security.audit.suppressions` 接受有意为之的持续发现。
每个抑制项匹配一个确切的 `checkId`，并且可以通过
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

被抑制的发现会从活跃的 `summary` 和 `findings` 列表中移除。
JSON 输出将它们保留在 `suppressedFindings` 下以便于审计。
当配置了抑制项时，活跃输出也会保留一个不可抑制的
`security.audit.suppressions.active` 信息发现，以便读者可以判断审计
是否经过过滤。危险的配置标志每个发现输出一个标志，因此
接受一个危险标志不会隐藏其他启用的共享相同
`config.insecure_or_dangerous_flags` checkId 的标志。
由于抑制项可能隐藏持续存在的风险，因此通过 agent-run shell 命令
添加或删除它们需要 exec 批准，除非 exec 已经以受信任的
本地自动化的 `security="full"` 和 `ask="off"` 运行。

SecretRef 行为：

- `security audit` 以只读模式为其目标路径解析支持的 SecretRef。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测 (deep-probe) 身份验证；它们不会重写配置或 SecretRef 映射。

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

`--fix` 应用安全的、确定性的修复措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持的渠道中的帐户变体）
- 当 WhatsApp 群组策略切换到 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从存储的 `allowFrom` 文件中播种 `groupAllowFrom`
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 还收紧从 `openclaw.json` 引用的配置包含文件
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置

`--fix` **不会**：

- 轮换令牌/密码/API 密钥
- 禁用工具 (`gateway`, `cron`, `exec`, 等)
- 更改网关绑定/认证/网络暴露选项
- 删除或重写插件/技能

## 相关

- [CLI 参考](/zh/cli)
- [安全审计](/zh/gateway/security)
