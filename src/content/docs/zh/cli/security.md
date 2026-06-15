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

当多个私信发送者共享主会话时，审计会发出警告并推荐**安全私信模式**：对于共享收件箱，使用 `session.dmScope="per-channel-peer"`（对于多账号通道使用 `per-account-channel-peer`Gateway(网关)）。
这是为了强化协作/共享收件箱的安全性。不建议在互不信任或具有敌意的操作者之间共享单个 Gateway(网关)；请使用单独的网关（或单独的操作系统用户/主机）来划分信任边界。
当配置暗示可能存在共享用户入口时（例如开放私信/群组策略、已配置的群组目标或通配符发送者规则），它还会发出 `security.trust_model.multi_user_heuristic`OpenClaw，并提醒您 OpenClaw 默认采用的是个人助手信任模型。
对于有意的共享用户设置，审计指导是沙箱隔离所有会话，将文件系统访问限制在工作区范围内，并确保该运行时环境不包含个人/私人身份或凭据。
当在没有沙箱隔离且启用了 Web/浏览器工具的情况下使用小模型（`<=300B`）时，它也会发出警告。
对于 Webhook 入口，启动日志会记录一条非致命的安全警告，审计会标记 `hooks.token`Gateway(网关) 重用活动 Gateway(网关) 共享密钥认证值的情况，包括 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 和 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。此外，它还会在以下情况发出警告：

- `hooks.token` 过短
- `hooks.path="/"`
- `hooks.defaultSessionKey` 未设置
- `hooks.allowedAgentIds` 不受限制
- 请求 `sessionKey` 覆盖已启用
- 在没有 `hooks.allowedSessionKeyPrefixes` 的情况下启用了覆盖功能

如果 Gateway(网关) 密码认证仅在启动时提供，请将相同的值传递给 Gateway(网关)`openclaw security audit --auth password --password <password>`，以便审计可以对照 `hooks.token` 进行检查。
运行 `openclaw doctor --fix` 以轮换持久化的重复使用的 `hooks.token`，然后更新外部 hook 发送者以使用新的 hook 令牌。

当沙箱模式关闭但配置了沙箱 Docker 设置时，当 `gateway.nodes.denyCommands` 使用无效的类似模式/未知条目（仅精确匹配节点命令名称，而非 shell 文本过滤）时，当 `gateway.nodes.allowCommands` 显式启用危险的节点命令时，当全局 `tools.profile="minimal"` 被代理工具配置文件覆盖时，当禁用写入/编辑工具但 `exec` 仍在没有约束性沙箱文件系统边界的情况下可用时，当开放组暴露运行时/文件系统工具而没有沙箱/工作区保护时，以及当安装的插件工具可能在宽松的工具策略下被访问时，它也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，则存在标头欺骗风险）和 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用没有 `sandbox.browser.cdpSourceRange` 的 Docker `bridge` 网络时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
当现有的沙箱浏览器 Docker 容器缺少/过时的哈希标签（例如，迁移前的容器缺少 `openclaw.browserConfigEpoch`）时，它也会发出警告并建议 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件/钩子安装记录未被锁定、缺少完整性元数据或与当前安装的软件包版本不一致时，它也会发出警告。
当渠道允许列表依赖可变的名称/电子邮件/标签而不是稳定的 ID 时，它会发出警告（适用于 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 的范围）。
当 `gateway.auth.mode="none"` 使 Gateway(网关) HTTP API 在没有共享密钥（`/tools/invoke` 加上任何启用的 `/v1/*` 端点）的情况下可访问时，它会发出警告。
前缀为 `dangerous`/`dangerously` 的设置是明确的紧急操作员覆盖；启用其一本身并不构成安全漏洞报告。
有关完整的危险参数清单，请参阅 [Security](/zh/gateway/security) 中的“不安全或危险标志摘要”部分。

可以使用 `security.audit.suppressions` 接受故意的长期发现。每个抑制匹配精确的 `checkId`，并可以使用不区分大小写的 `titleIncludes` 和/或 `detailIncludes` 子字符串进行缩小范围：

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

被抑制的发现将从活动的 `summary` 和 `findings` 列表中移除。JSON 输出将它们保留在 `suppressedFindings` 下以供审计。配置了抑制时，活动输出还会保留一个无法抑制的 `security.audit.suppressions.active` 信息发现，以便读者可以判断审计已被过滤。危险的配置标志每个发现发出一个标志，因此接受一个危险的标志不会隐藏共享相同 `config.insecure_or_dangerous_flags` checkId 的其他已启用标志。由于抑制可能会隐藏持续存在的风险，因此通过 agent-run shell 命令添加或删除它们需要执行批准，除非执行已经在使用 `security="full"` 和 `ask="off"` 运行，以用于受信任的本地自动化。

SecretRef 行为：

- `security audit` 以只读模式解析其目标路径支持的 SecretRefs。
- 如果 SecretRef 在当前命令路径中不可用，审计将继续并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该命令调用的深度探测身份验证；它们不会重写配置或 SecretRef 映射。

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

## `--fix` 更改的内容

`--fix` 应用安全的确定性补救措施：

- 将常见的 `groupPolicy="open"` 翻转为 `groupPolicy="allowlist"`（包括支持的渠道中的账户变体）
- 当 WhatsApp 群组策略翻转为 `allowlist` 时，如果该列表存在且配置尚未定义 `allowFrom`，则从存储的 `allowFrom` 文件中为 `groupAllowFrom` 播种
- 将 `"off"` 中的 `logging.redactSensitive` 设置为 `"tools"`
- 收紧状态/配置和常见敏感文件的权限
  (`credentials/*.json`, `auth-profiles.json`, `sessions.json`, 会话
  `*.jsonl`)
- 同时收紧从 `openclaw.json` 引用的配置包含文件的权限
- 在 POSIX 主机上使用 `chmod`，并在 Windows 上进行 `icacls` 重置

`--fix` **不**会：

- 轮换令牌/密码/API 密钥
- 禁用工具 (`gateway`, `cron`, `exec`, 等)
- 更改网关绑定/认证/网络暴露选项
- 删除或重写插件/技能

## 相关

- [CLI 参考](/zh/cli)
- [安全审计](/zh/gateway/security)
