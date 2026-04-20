---
summary: "运行具有 Shell 访问权限的 AI 网关时的安全注意事项和威胁模型"
read_when:
  - Adding features that widen access or automation
title: "安全"
---

# 安全

<Warning>**个人助手信任模型：** 本指南假设每个 Gateway(网关) 有一个可信操作员边界（单用户/个人助手模型）。 OpenClaw **不是** 针对多个对抗性用户共享一个代理/Gateway(网关) 的敌对多租户安全边界。 如果您需要混合信任或对抗性用户操作，请拆分信任边界（独立的 Gateway(网关) + 凭证，理想情况下是独立的操作系统用户/主机）。</Warning>

**本页内容：**[信任模型](#scope-first-personal-assistant-security-model) | [快速审计](#quick-check-openclaw-security-audit) | [加固基线](#hardened-baseline-in-60-seconds) | [私信访问模型](#dm-access-model-pairing-allowlist-open-disabled) | [配置加固](#configuration-hardening-examples) | [事件响应](#incident-response)

## 范围优先：个人助手安全模型

OpenClaw 安全指南假设采用 **个人助手** 部署模式：一个可信操作员边界，潜在有多个代理。

- 支持的安全姿态：每个 Gateway(网关) 一个用户/信任边界（建议每个边界使用一个操作系统用户/主机/VPS）。
- 不支持的安全边界：由互不信任或对抗性用户共享的一个 Gateway(网关)/代理。
- 如果需要对抗性用户隔离，请按信任边界拆分（独立的 Gateway(网关) + 凭证，理想情况下是独立的操作系统用户/主机）。
- 如果多个不受信任的用户可以向一个启用工具的代理发送消息，请将他们视为为该代理共享相同的委托工具权限。

本页面解释 **在该模型内** 的加固方法。它不声明在一个共享 Gateway(网关) 上实现敌对多租户隔离。

## 快速检查：`openclaw security audit`

另请参阅：[形式化验证（安全模型）](/zh/security/formal-verification)

定期运行此操作（特别是在更改配置或暴露网络表面之后）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 有意保持狭窄：它将常见的开放组策略翻转为允许列表，恢复 `logging.redactSensitive: "tools"`，收紧状态/配置/包含文件的权限，并且在 Windows 上运行时使用 Windows ACL 重置而不是 POSIX `chmod`。

它会标记常见的隐患（Gateway(网关) 认证暴露、浏览器控制暴露、提升的允许列表、文件系统权限、宽松的执行批准以及开放渠道工具暴露）。

OpenClaw 既是产品也是实验：您正在将前沿模型的行为连接到真实的消息传递表面和真实的工具。**没有“绝对安全”的设置。** 目标是要审慎对待：

- 谁可以与您的机器人对话
- 允许机器人在哪里操作
- 机器人可以接触什么

从仍然有效的最小访问权限开始，然后在您获得信心时扩大权限。

### 部署和主机信任

OpenClaw 假定主机和配置边界是受信任的：

- 如果某人可以修改 Gateway(网关) 主机状态/配置（`~/.openclaw`，包括 `openclaw.json`），请将其视为受信任的操作员。
- 为一个 Gateway(网关) 运行多个互不信任/对抗性的操作员**不是推荐的设置**。
- 对于混合信任团队，请使用单独的网关（或至少单独的操作系统用户/主机）拆分信任边界。
- 推荐的默认值：每台机器/主机（或 VPS）一个用户，该用户一个网关，该网关中一个或多个代理。
- 在一个 Gateway(网关) 实例内，经过身份验证的操作员访问是受信任的控制平面角色，而不是每用户租户角色。
- 会话标识符（`sessionKey`、会话 ID、标签）是路由选择器，而非授权令牌。
- 如果多个人可以向一个启用了工具的代理发送消息，他们每个人都可以控制同一套权限。每用户会话/内存隔离有助于保护隐私，但并不能将共享代理转换为每用户主机授权。

### 共享 Slack 工作区：真实风险

如果“Slack 里的每个人都可以给机器人发送消息”，核心风险在于委托的工具权限：

- 任何允许的发送者都可以在代理策略范围内诱导工具调用（`exec`、浏览器、网络/文件工具）；
- 来自一个发送者的提示词/内容注入可能导致影响共享状态、设备或输出的操作；
- 如果一个共享代理拥有敏感凭据/文件，任何被允许的发送者都可能通过工具使用驱动数据外泄。

针对团队工作流，请使用具有最少工具的独立代理/网关；保持个人数据代理的私密性。

### 公司共享代理：可接受的模式

当使用该代理的每个人都处于同一信任边界内（例如一个公司团队），并且该代理严格限定于业务范围时，这是可以接受的。

- 在专用机器/虚拟机/容器上运行它；
- 为该运行时使用专用的操作系统用户 + 专用浏览器/配置文件/账户；
- 不要将该运行时登录到个人 Apple/Google 账户或个人密码管理器/浏览器配置文件中。

如果在同一运行时混合使用个人和公司身份，您将消除这种隔离，并增加个人数据暴露的风险。

## Gateway(网关) 和节点信任概念

将 Gateway(网关) 和节点视为具有不同角色的操作员信任域：

- **Gateway(网关)** 是控制平面和策略表面（`gateway.auth`、工具策略、路由）。
- **节点** 是与该 Gateway(网关) 配对的远程执行面（命令、设备操作、主机本地功能）。
- 通过 Gateway(网关) 身份验证的调用者在 Gateway(网关) 范围内受信任。配对后，节点操作是该节点上受信任的操作员操作。
- `sessionKey` 是路由/上下文选择，而非每用户身份验证。
- 执行批准（允许列表 + 询问）是针对操作员意图的护栏，而非针对敌意多租户隔离。
- 对于受信任的单操作员设置，OpenClaw 的产品默认设置是允许在 `gateway`/`node` 上进行主机执行而无需批准提示（`security="full"`，除非您收紧它，否则为 `ask="off"`）。该默认设置是有意的用户体验，其本身并非漏洞。
- 执行批准绑定精确的请求上下文和尽力而为的直接本地文件操作数；它们不会在语义上为每个运行时/解释器加载器路径建模。请使用沙箱隔离和主机隔离来实现强边界。

如果您需要针对敌对用户的隔离，请按操作系统用户/主机拆分信任边界，并运行独立的网关。

## 信任边界矩阵

在分流风险时，请以此作为快速模型：

| 边界或控制                                           | 含义                           | 常见误读                                             |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `gateway.auth` （令牌/密码/受信任代理/设备身份验证） | 向网关 API 验证调用者身份      | “需要在每一帧上都有每条消息的签名才能保证安全”       |
| `sessionKey`                                         | 用于上下文/会话选择的路由键    | “会话密钥是用户认证边界”                             |
| 提示/内容护栏                                        | 降低模型滥用风险               | “仅凭提示注入就能证明认证被绕过”                     |
| `canvas.eval` / 浏览器评估                           | 启用时的有意操作员能力         | “在此信任模型中，任何 JS eval 原语自动成为漏洞”      |
| 本地 TUI `!` Shell                                   | 操作员明确触发的本地执行       | “本地 Shell 便捷命令是远程注入”                      |
| 节点配对和节点命令                                   | 配对设备上的操作员级别远程执行 | “默认情况下，远程设备控制应被视为不受信任的用户访问” |

## 设计上并非漏洞

这些模式经常被报告，除非显示出真正的边界绕过，否则通常作为不予操作处理：

- 仅涉及提示注入且未绕过策略/认证/沙箱的攻击链。
- 假定在一个共享主机/配置上进行敌对多租户操作的声明。
- 在共享网关设置中，将正常的操作员读取路径访问（例如 `sessions.list`/`sessions.preview`/`chat.history`）归类为 IDOR 的声明。
- 仅限本地主机的部署发现（例如仅限环回的网关上的 HSTS）。
- Discord 入站 webhook 签名发现，针对本仓库中不存在的入站路径。
- 将节点配对元数据视为 `system.run` 的隐藏的第二层每命令批准层的报告，而实际的执行边界仍然是网关的全局节点命令策略加上节点自己的执行批准。
- “缺少每用户授权”的发现将 `sessionKey` 视为身份验证令牌。

## 研究人员预检清单

在提交 GHSA 之前，请验证以下所有内容：

1. 在最新的 `main` 或最新版本上仍可复现。
2. 报告包含确切的代码路径（`file`、函数、行范围）和测试过的版本/提交。
3. 影响跨越了记录在案的信任边界（而不仅仅是提示注入）。
4. 声明未列在[范围之外](https://github.com/openclaw/openclaw/blob/main/SECURITY.md#out-of-scope)中。
5. 已检查现有公告以避免重复（适用时重用规范的 GHSA）。
6. 部署假设是明确的（回环/本地 vs 暴露，受信任 vs 不受信任的操作员）。

## 60 秒内完成加固基线

首先使用此基线，然后针对受信任的代理有选择地重新启用工具：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    auth: { mode: "token", token: "replace-with-long-random-token" },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
  channels: {
    whatsapp: { dmPolicy: "pairing", groups: { "*": { requireMention: true } } },
  },
}
```

这将使 Gateway(网关)保持仅限本地，隔离私信，并默认禁用控制平面/运行时工具。

## 共享收件箱快速规则

如果不止一个人可以私信你的机器人：

- 设置 `session.dmScope: "per-channel-peer"`（对于多账户渠道设置为 `"per-account-channel-peer"`）。
- 保留 `dmPolicy: "pairing"` 或严格的允许列表。
- 切勿将共享私信与广泛的工具访问权限结合使用。
- 这加强了协作/共享收件箱的安全性，但并非设计为当用户共享主机/配置写入权限时的敌意共同租户隔离。

## 上下文可见性模型

OpenClaw 区分了两个概念：

- **触发授权**：谁可以触发代理（`dmPolicy`、`groupPolicy`、允许列表、提及门控）。
- **上下文可见性**：将哪些补充上下文注入到模型输入中（回复正文、引用文本、线程历史记录、转发的元数据）。

允许列表对触发和命令授权进行门控。`contextVisibility` 设置控制如何过滤补充上下文（引用回复、主题根、获取的历史记录）：

- `contextVisibility: "all"`（默认）保持接收到的补充上下文。
- `contextVisibility: "allowlist"` 将补充上下文过滤为活动允许列表检查所允许的发件人。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍保留一条显式的引用回复。

为每个渠道或每个房间/对话设置 `contextVisibility`。有关设置详细信息，请参阅[群聊](/zh/channels/groups#context-visibility-and-allowlists)。

咨询性分流指导：

- 仅显示“模型可以看到来自非允许列表发件人的引用或历史文本”的声明是可以通过 `contextVisibility` 解决的加固发现，本身并不是身份验证或沙箱边界绕过。
- 要产生安全影响，报告仍需展示已证实的信任边界绕过（如身份验证、策略、沙箱、批准或其他已记录的边界）。

## 审计检查的内容（高层级）

- **入站访问**（私信策略、群组策略、允许列表）：陌生人是否可以触发机器人？
- **工具爆炸半径**（提升权限的工具 + 开放房间）：提示注入是否会转变为 Shell/文件/网络操作？
- **执行批准漂移**（`security=full`、`autoAllowSkills`、没有 `strictInlineEval` 的解释器允许列表）：主机执行护栏是否仍在按您的预期运作？
  - `security="full"` 是一个广泛的姿态警告，而不是存在错误的证明。它是受信任的个人助理设置的首选默认值；仅当您的威胁模型需要批准或允许列表护栏时才收紧它。
- **网络暴露**（Gateway(网关) 绑定/身份验证、Tailscale Serve/Funnel、弱/短身份验证令牌）。
- **浏览器控制暴露**（远程节点、中继端口、远程 CDP 端点）。
- **本地磁盘卫生**（权限、符号链接、配置包含、“同步文件夹”路径）。
- **插件**（扩展程序在没有显式允许列表的情况下存在）。
- **策略偏差/配置错误**（配置了沙箱 docker 设置但未开启沙箱模式；`gateway.nodes.denyCommands` 模式无效，因为匹配仅针对精确的命令名称（例如 `system.run`）且不检查 shell 文本；危险的 `gateway.nodes.allowCommands` 条目；每个代理的配置文件覆盖了全局 `tools.profile="minimal"`；在宽松的工具策略下可访问的扩展插件工具）。
- **运行时期望偏差**（例如，假设隐式 exec 仍然意味着 `sandbox`，而 `tools.exec.host` 现在默认为 `auto`，或者在沙箱模式关闭时显式设置 `tools.exec.host="sandbox"`）。
- **模型卫生**（当配置的模型看起来过时时发出警告；不是硬性阻止）。

如果您运行 `--deep`，OpenClaw 也会尝试尽力进行实时的 Gateway(网关) 探测。

## 凭据存储映射

在审核访问权限或决定备份内容时请使用此表：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord bot token**: config/env 或 SecretRef（env/file/exec 提供程序）
- **Slack tokens**：config/env (`channels.slack.*`)
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型身份验证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **基于文件的机密负载（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`

## 安全审核清单

当审核输出结果时，请将其视为优先顺序：

1. **任何“开放”状态 + 已启用工具**：首先锁定私信/群组（配对/允许列表），然后收紧工具策略/沙箱隔离。
2. **公共网络暴露**（LAN 绑定、Funnel、缺少身份验证）：立即修复。
3. **浏览器控制远程暴露**：将其视为操作员访问权限（仅限 tailnet、有意配对节点、避免公共暴露）。
4. **权限**：确保 state/config/credentials/auth 不是组/全局可读的。
5. **插件/扩展**：仅加载您明确信任的内容。
6. **模型选择**：对于任何使用工具的机器人，首选现代的、经过指令强化的模型。

## 安全审计术语表

高信噪比的 `checkId` 值，您最可能在真实部署中看到（非详尽列表）：

| `checkId`                                                     | 严重性        | 重要性                                                                         | 主要修复键/路径                                                                                   | 自动修复 |
| ------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------- |
| `fs.state_dir.perms_world_writable`                           | 严重          | 其他用户/进程可以修改完整的 OpenClaw 状态                                      | `~/.openclaw` 上的文件系统权限                                                                    | yes      |
| `fs.state_dir.perms_group_writable`                           | warn          | 组用户可以修改完整的 OpenClaw 状态                                             | `~/.openclaw` 上的文件系统权限                                                                    | yes      |
| `fs.state_dir.perms_readable`                                 | warn          | 状态目录可被他人读取                                                           | `~/.openclaw` 上的文件系统权限                                                                    | yes      |
| `fs.state_dir.symlink`                                        | warn          | 状态目录目标成为另一个信任边界                                                 | 状态目录文件系统布局                                                                              | 否       |
| `fs.config.perms_writable`                                    | critical      | 他人可以更改身份验证/工具策略/配置                                             | `~/.openclaw/openclaw.json` 上的文件系统权限                                                      | yes      |
| `fs.config.symlink`                                           | warn          | 配置目标成为另一个信任边界                                                     | 配置文件文件系统布局                                                                              | 否       |
| `fs.config.perms_group_readable`                              | warn          | 组用户可以读取配置令牌/设置                                                    | 配置文件上的文件系统权限                                                                          | yes      |
| `fs.config.perms_world_readable`                              | critical      | 配置可能泄露令牌/设置                                                          | 配置文件上的文件系统权限                                                                          | yes      |
| `fs.config_include.perms_writable`                            | critical      | 配置包含文件可被他人修改                                                       | 从 `openclaw.json` 引用的 include-file 权限                                                       | yes      |
| `fs.config_include.perms_group_readable`                      | warn          | 组用户可以读取包含的机密/设置                                                  | 从 `openclaw.json` 引用的 include-file 权限                                                       | yes      |
| `fs.config_include.perms_world_readable`                      | critical      | 包含的机密/设置可被任何人读取                                                  | include-file perms 引用自 `openclaw.json`                                                         | yes      |
| `fs.auth_profiles.perms_writable`                             | critical      | 他人可以注入或替换存储的模型凭据                                               | `agents/<agentId>/agent/auth-profiles.json` 权限                                                  | yes      |
| `fs.auth_profiles.perms_readable`                             | warn          | 他人可以读取 API 密钥和 OAuth 令牌                                             | `agents/<agentId>/agent/auth-profiles.json` 权限                                                  | yes      |
| `fs.credentials_dir.perms_writable`                           | critical      | 他人可以修改渠道配对/凭据状态                                                  | `~/.openclaw/credentials` 上的文件系统权限                                                        | 是       |
| `fs.credentials_dir.perms_readable`                           | warn          | 其他人可以读取渠道凭证状态                                                     | `~/.openclaw/credentials` 上的文件系统权限                                                        | 是       |
| `fs.sessions_store.perms_readable`                            | warn          | 其他人可以读取会话记录/元数据                                                  | 会话存储权限                                                                                      | 是       |
| `fs.log_file.perms_readable`                                  | 警告          | 其他人可以读取已编辑但仍敏感的日志                                             | 网关日志文件权限                                                                                  | 是       |
| `fs.synced_dir`                                               | 警告          | iCloud/Dropbox/Drive 中的状态/配置会扩大令牌/记录的暴露范围                    | 将配置/状态移出同步文件夹                                                                         | no       |
| `gateway.bind_no_auth`                                        | 严重          | 没有共享密钥的远程绑定                                                         | `gateway.bind`， `gateway.auth.*`                                                                 | no       |
| `gateway.loopback_no_auth`                                    | 严重          | 反向代理的回环可能变为未经身份验证                                             | `gateway.auth.*`，代理设置                                                                        | 否       |
| `gateway.trusted_proxies_missing`                             | warn          | 存在反向代理标头但不受信任                                                     | `gateway.trustedProxies`                                                                          | no       |
| `gateway.http.no_auth`                                        | 警告/严重     | Gateway(网关) HTTP APIs 可通过 `auth.mode="none"` 访问                         | `gateway.auth.mode`， `gateway.http.endpoints.*`                                                  | no       |
| `gateway.http.session_key_override_enabled`                   | 信息          | HTTP API 调用者可以覆盖 `sessionKey`                                           | `gateway.http.allowSessionKeyOverride`                                                            | no       |
| `gateway.tools_invoke_http.dangerous_allow`                   | 警告/严重     | 通过 HTTP API 重新启用危险工具                                                 | `gateway.tools.allow`                                                                             | no       |
| `gateway.nodes.allow_commands_dangerous`                      | warn/critical | 启用高影响的节点命令（相机/屏幕/联系人/日历/SMS）                              | `gateway.nodes.allowCommands`                                                                     | no       |
| `gateway.nodes.deny_commands_ineffective`                     | warn          | 类似模式的拒绝条目与 shell 文本或组不匹配                                      | `gateway.nodes.denyCommands`                                                                      | no       |
| `gateway.tailscale_funnel`                                    | 严重          | 公共互联网暴露                                                                 | `gateway.tailscale.mode`                                                                          | no       |
| `gateway.tailscale_serve`                                     | 信息          | 通过 Serve 启用了 Tailnet 暴露                                                 | `gateway.tailscale.mode`                                                                          | no       |
| `gateway.control_ui.allowed_origins_required`                 | 严重          | 非回环控制 UI 没有明确的浏览器源允许列表                                       | `gateway.controlUi.allowedOrigins`                                                                | no       |
| `gateway.control_ui.allowed_origins_wildcard`                 | 警告/严重     | `allowedOrigins=["*"]` 禁用浏览器源列入白名单                                  | `gateway.controlUi.allowedOrigins`                                                                | no       |
| `gateway.control_ui.host_header_origin_fallback`              | warn/critical | 启用 Host 头部源回退（DNS 重新绑定硬化降级）                                   | `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`                                      | no       |
| `gateway.control_ui.insecure_auth`                            | warn          | 启用了不安全身份验证兼容性切换开关                                             | `gateway.controlUi.allowInsecureAuth`                                                             | 否       |
| `gateway.control_ui.device_auth_disabled`                     | critical      | 禁用设备身份检查                                                               | `gateway.controlUi.dangerouslyDisableDeviceAuth`                                                  | 否       |
| `gateway.real_ip_fallback_enabled`                            | warn/critical | 信任 `X-Real-IP` 回退可能通过代理错误配置启用源 IP 欺骗                        | `gateway.allowRealIpFallback`， `gateway.trustedProxies`                                          | 否       |
| `gateway.token_too_short`                                     | 警告          | 短共享令牌更容易被暴力破解                                                     | `gateway.auth.token`                                                                              | 否       |
| `gateway.auth_no_rate_limit`                                  | 警告          | 公开未进行速率限制的身份验证会增加暴力破解风险                                 | `gateway.auth.rateLimit`                                                                          | 否       |
| `gateway.trusted_proxy_auth`                                  | critical      | 代理身份现在变为身份验证边界                                                   | `gateway.auth.mode="trusted-proxy"`                                                               | 否       |
| `gateway.trusted_proxy_no_proxies`                            | critical      | 在没有受信任代理 IP 的情况下使用受信任代理身份验证是不安全的                   | `gateway.trustedProxies`                                                                          | no       |
| `gateway.trusted_proxy_no_user_header`                        | critical      | 受信任代理身份验证无法安全解析用户身份                                         | `gateway.auth.trustedProxy.userHeader`                                                            | no       |
| `gateway.trusted_proxy_no_allowlist`                          | warn          | 受信任代理身份验证接受任何经过身份验证的上游用户                               | `gateway.auth.trustedProxy.allowUsers`                                                            | no       |
| `gateway.probe_auth_secretref_unavailable`                    | warn          | 深度探针无法解析此命令路径中的身份验证 SecretRefs                              | deep-probe auth source / SecretRef availability                                                   | no       |
| `gateway.probe_failed`                                        | warn/critical | 实时 Gateway(网关) 探针失败                                                    | gateway reachability/auth                                                                         | no       |
| `discovery.mdns_full_mode`                                    | warn/critical | mDNS 完整模式在本地网络上通告 `cliPath`/`sshPort` 元数据                       | `discovery.mdns.mode`，`gateway.bind`                                                             | no       |
| `config.insecure_or_dangerous_flags`                          | warn          | 是否启用了任何不安全/危险的调试标志                                            | 多个键（请参阅发现详情）                                                                          | no       |
| `config.secrets.gateway_password_in_config`                   | warn          | Gateway(网关) 密码直接存储在配置中                                             | `gateway.auth.password`                                                                           | no       |
| `config.secrets.hooks_token_in_config`                        | warn          | Hook bearer token 直接存储在配置中                                             | `hooks.token`                                                                                     | 否       |
| `hooks.token_reuse_gateway_token`                             | 严重          | Hook 入口令牌也可解锁 Gateway(网关) 身份验证                                   | `hooks.token`，`gateway.auth.token`                                                               | 否       |
| `hooks.token_too_short`                                       | 警告          | 更容易对 Hook 入口进行暴力破解                                                 | `hooks.token`                                                                                     | 否       |
| `hooks.default_session_key_unset`                             | 警告          | Hook agent 运行时分散到生成的按请求会话中                                      | `hooks.defaultSessionKey`                                                                         | 否       |
| `hooks.allowed_agent_ids_unrestricted`                        | 警告/严重     | 经过身份验证的 Hook 调用者可以路由到任何已配置的 agent                         | `hooks.allowedAgentIds`                                                                           | 否       |
| `hooks.request_session_key_enabled`                           | 警告/严重     | 外部调用者可以选择 sessionKey                                                  | `hooks.allowRequestSessionKey`                                                                    | 否       |
| `hooks.request_session_key_prefixes_missing`                  | 警告/严重     | 对外部会话密钥的形式没有限制                                                   | `hooks.allowedSessionKeyPrefixes`                                                                 | 否       |
| `hooks.path_root`                                             | 严重          | Hook 路径为 `/`，这使得入口更容易发生冲突或错误路由                            | `hooks.path`                                                                                      | 否       |
| `hooks.installs_unpinned_npm_specs`                           | 警告          | Hook 安装记录未固定到不可变的 npm 规范                                         | hook 安装元数据                                                                                   | 否       |
| `hooks.installs_missing_integrity`                            | 警告          | Hook 安装记录缺少完整性元数据                                                  | hook 安装元数据                                                                                   | 否       |
| `hooks.installs_version_drift`                                | 警告          | Hook 安装记录与已安装的包不一致                                                | hook 安装元数据                                                                                   | 否       |
| `logging.redact_off`                                          | 警告          | 敏感值泄露到日志/状态                                                          | `logging.redactSensitive`                                                                         | 是       |
| `browser.control_invalid_config`                              | 警告          | 浏览器控制配置在运行时之前无效                                                 | `browser.*`                                                                                       | 否       |
| `browser.control_no_auth`                                     | 严重          | 浏览器控制暴露在无令牌/密码身份验证的情况下                                    | `gateway.auth.*`                                                                                  | 否       |
| `browser.remote_cdp_http`                                     | 警告          | 通过普通 HTTP 进行远程 CDP 缺乏传输加密                                        | 浏览器配置文件 `cdpUrl`                                                                           | 否       |
| `browser.remote_cdp_private_host`                             | 警告          | 远程 CDP 以私有/内部主机为目标                                                 | 浏览器配置文件 `cdpUrl`，`browser.ssrfPolicy.*`                                                   | 否       |
| `sandbox.docker_config_mode_off`                              | 警告          | 沙箱 Docker 配置存在但未激活                                                   | `agents.*.sandbox.mode`                                                                           | no       |
| `sandbox.bind_mount_non_absolute`                             | warn          | 相对绑定挂载可能会不可预测地解析                                               | `agents.*.sandbox.docker.binds[]`                                                                 | no       |
| `sandbox.dangerous_bind_mount`                                | critical      | 沙箱绑定挂载目标指向了被阻止的系统、凭证或 Docker 套接字路径                   | `agents.*.sandbox.docker.binds[]`                                                                 | no       |
| `sandbox.dangerous_network_mode`                              | critical      | 沙箱 Docker 网络使用 `host` 或 `container:*` 命名空间加入模式                  | `agents.*.sandbox.docker.network`                                                                 | no       |
| `sandbox.dangerous_seccomp_profile`                           | critical      | 沙箱 seccomp 配置文件削弱了容器隔离                                            | `agents.*.sandbox.docker.securityOpt`                                                             | no       |
| `sandbox.dangerous_apparmor_profile`                          | critical      | 沙箱 AppArmor 配置文件削弱了容器隔离                                           | `agents.*.sandbox.docker.securityOpt`                                                             | no       |
| `sandbox.browser_cdp_bridge_unrestricted`                     | warn          | 沙箱浏览器桥接暴露在外，且未限制源范围                                         | `sandbox.browser.cdpSourceRange`                                                                  | no       |
| `sandbox.browser_container.non_loopback_publish`              | critical      | 现有的浏览器容器在非回环接口上发布了 CDP                                       | browser sandbox container publish config                                                          | no       |
| `sandbox.browser_container.hash_label_missing`                | warn          | 现有的浏览器容器早于当前的 config-hash 标签                                    | `openclaw sandbox recreate --browser --all`                                                       | no       |
| `sandbox.browser_container.hash_epoch_stale`                  | warn          | 现有的浏览器容器早于当前的浏览器配置纪元                                       | `openclaw sandbox recreate --browser --all`                                                       | no       |
| `tools.exec.host_sandbox_no_sandbox_defaults`                 | warn          | 当沙箱关闭时，`exec host=sandbox` 故障关闭                                     | `tools.exec.host`，`agents.defaults.sandbox.mode`                                                 | no       |
| `tools.exec.host_sandbox_no_sandbox_agents`                   | warn          | 当沙箱关闭时，每个代理 `exec host=sandbox` 故障关闭                            | `agents.list[].tools.exec.host`，`agents.list[].sandbox.mode`                                     | no       |
| `tools.exec.security_full_configured`                         | warn/critical | 主机执行正在使用 `security="full"` 运行                                        | `tools.exec.security`，`agents.list[].tools.exec.security`                                        | no       |
| `tools.exec.auto_allow_skills_enabled`                        | warn          | 执行审批隐式信任技能箱                                                         | `~/.openclaw/exec-approvals.json`                                                                 | no       |
| `tools.exec.allowlist_interpreter_without_strict_inline_eval` | warn          | 解释器允许列表允许在不强制重新批准的情况下进行内联评估                         | `tools.exec.strictInlineEval`，`agents.list[].tools.exec.strictInlineEval`，执行批准白名单        | no       |
| `tools.exec.safe_bins_interpreter_unprofiled`                 | warn          | `safeBins` 中的解释器/运行时二进制文件在没有显式配置文件的情况下扩大了执行风险 | `tools.exec.safeBins`，`tools.exec.safeBinProfiles`，`agents.list[].tools.exec.*`                 | no       |
| `tools.exec.safe_bins_broad_behavior`                         | warn          | `safeBins` 中的广泛行为工具削弱了低风险 stdin 过滤信任模型                     | `tools.exec.safeBins`，`agents.list[].tools.exec.safeBins`                                        | no       |
| `tools.exec.safe_bin_trusted_dirs_risky`                      | warn          | `safeBinTrustedDirs` 包含可变或危险目录                                        | `tools.exec.safeBinTrustedDirs`，`agents.list[].tools.exec.safeBinTrustedDirs`                    | no       |
| `skills.workspace.symlink_escape`                             | warn          | 工作区 `skills/**/SKILL.md` 解析到工作区根目录之外（符号链接链漂移）           | 工作区 `skills/**` 文件系统状态                                                                   | no       |
| `plugins.extensions_no_allowlist`                             | warn          | 在没有显式插件允许列表的情况下安装了扩展                                       | `plugins.allowlist`                                                                               | no       |
| `plugins.installs_unpinned_npm_specs`                         | warn          | 插件安装记录未固定到不可变的 npm 规范                                          | 插件安装元数据                                                                                    | no       |
| `plugins.installs_missing_integrity`                          | warn          | 插件安装记录缺少完整性元数据                                                   | 插件安装元数据                                                                                    | no       |
| `plugins.installs_version_drift`                              | warn          | 插件安装记录与已安装的包不一致                                                 | 插件安装元数据                                                                                    | no       |
| `plugins.code_safety`                                         | warn/critical | 插件代码扫描发现可疑或危险模式                                                 | 插件代码 / 安装来源                                                                               | no       |
| `plugins.code_safety.entry_path`                              | warn          | 插件入口路径指向隐藏或 `node_modules` 位置                                     | 插件清单 `entry`                                                                                  | no       |
| `plugins.code_safety.entry_escape`                            | critical      | 插件入口逃出了插件目录                                                         | 插件清单 `entry`                                                                                  | no       |
| `plugins.code_safety.scan_failed`                             | warn          | 插件代码扫描无法完成                                                           | 插件扩展路径 / 扫描环境                                                                           | no       |
| `skills.code_safety`                                          | warn/critical | Skill installer metadata/code contains suspicious or dangerous patterns        | skill install source                                                                              | no       |
| `skills.code_safety.scan_failed`                              | warn          | Skill code scan could not complete                                             | skill scan environment                                                                            | no       |
| `security.exposure.open_channels_with_exec`                   | warn/critical | Shared/public rooms can reach exec-enabled agents                              | `channels.*.dmPolicy`, `channels.*.groupPolicy`, `tools.exec.*`, `agents.list[].tools.exec.*`     | no       |
| `security.exposure.open_groups_with_elevated`                 | critical      | Open groups + elevated tools create high-impact prompt-injection paths         | `channels.*.groupPolicy`, `tools.elevated.*`                                                      | no       |
| `security.exposure.open_groups_with_runtime_or_fs`            | critical/warn | Open groups can reach command/file tools without sandbox/workspace guards      | `channels.*.groupPolicy`, `tools.profile/deny`, `tools.fs.workspaceOnly`, `agents.*.sandbox.mode` | no       |
| `security.trust_model.multi_user_heuristic`                   | warn          | Config looks multi-user while gateway trust 模型 is personal-assistant         | 分割信任边界，或共享用户加固 (`sandbox.mode`, 工具拒绝/工作区范围界定)                            | no       |
| `tools.profile_minimal_overridden`                            | warn          | Agent overrides bypass global minimal profile                                  | `agents.list[].tools.profile`                                                                     | no       |
| `plugins.tools_reachable_permissive_policy`                   | warn          | Extension tools reachable in permissive contexts                               | `tools.profile` + 工具允许/拒绝                                                                   | no       |
| `models.legacy`                                               | warn          | Legacy 模型 families are still configured                                      | 模型 selection                                                                                    | no       |
| `models.weak_tier`                                            | warn          | Configured models are below current recommended tiers                          | 模型 selection                                                                                    | no       |
| `models.small_params`                                         | critical/info | Small models + unsafe 工具 surfaces raise injection risk                       | 模型 choice + sandbox/工具 policy                                                                 | no       |
| `summary.attack_surface`                                      | info          | Roll-up summary of auth, 渠道, 工具, and exposure posture                      | multiple keys (see finding detail)                                                                | no       |

## 通过 HTTP 控制的 UI

控制 UI 需要一个 **安全上下文**（HTTPS 或 localhost）来生成设备
标识。`gateway.controlUi.allowInsecureAuth` 是一个本地兼容性切换开关：

- 在 localhost 上，当页面通过非安全的 HTTP 加载时，它允许在没有设备身份的情况下进行控制 UI 身份验证。
- 它不会绕过配对检查。
- 它不会放宽远程（非本地主机）设备身份要求。

首选 HTTPS（Tailscale Serve）或在 `127.0.0.1` 上打开 UI。

仅限紧急情况，`gateway.controlUi.dangerouslyDisableDeviceAuth`
会完全禁用设备标识检查。这是一种严重的安全降级；
请保持关闭，除非您正在积极调试并能快速回滚。

与这些危险标志分开，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在没有设备标识的情况下允许 **operator** 控制 UI 会话。这是一种
有意的身份验证模式行为，而不是 `allowInsecureAuth` 快捷方式，并且它仍然
不适用于节点角色的控制 UI 会话。

启用此设置时，`openclaw security audit` 会发出警告。

## 不安全或危险的标志摘要

当启用已知的不安全/危险调试开关时，`openclaw security audit` 包括 `config.insecure_or_dangerous_flags`。该检查目前汇总：

- `gateway.controlUi.allowInsecureAuth=true`
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
- `hooks.gmail.allowUnsafeExternalContent=true`
- `hooks.mappings[<index>].allowUnsafeExternalContent=true`
- `tools.exec.applyPatch.workspaceOnly=false`
- `plugins.entries.acpx.config.permissionMode=approve-all`

在 OpenClaw 配置架构中定义的完整 `dangerous*` / `dangerously*` 配置键：

- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
- `gateway.controlUi.dangerouslyDisableDeviceAuth`
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `channels.discord.dangerouslyAllowNameMatching`
- `channels.discord.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.slack.dangerouslyAllowNameMatching`
- `channels.slack.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.googlechat.dangerouslyAllowNameMatching`
- `channels.googlechat.accounts.<accountId>.dangerouslyAllowNameMatching`
- `channels.msteams.dangerouslyAllowNameMatching`
- `channels.synology-chat.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.synology-chat.accounts.<accountId>.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.synology-chat.dangerouslyAllowInheritedWebhookPath` (extension 渠道)
- `channels.zalouser.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.zalouser.accounts.<accountId>.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.irc.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.irc.accounts.<accountId>.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.mattermost.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.mattermost.accounts.<accountId>.dangerouslyAllowNameMatching` (extension 渠道)
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`
- `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`
- `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowReservedContainerTargets`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowExternalBindSources`
- `agents.list[<index>].sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

## 反向代理配置

如果您在反向代理（nginx、Caddy、Traefik 等）之后运行 Gateway(网关)，请配置 `gateway.trustedProxies` 以正确处理转发的客户端 IP。

当 Gateway(网关) 检测到来自 `trustedProxies` 中**未**包含的地址的代理标头时，它将**不会**将这些连接视为本地客户端。如果禁用了网关身份验证，这些连接将被拒绝。这可以防止身份验证绕过，否则代理连接似乎来自本地主机并自动获得信任。

`gateway.trustedProxies` 也会用于 `gateway.auth.mode: "trusted-proxy"`，但该身份验证模式更为严格：

- trusted-proxy 身份验证**在回环源代理上失败时默认关闭（fail closed）**
- 同主机回环反向代理仍可使用 `gateway.trustedProxies` 进行本地客户端检测和转发 IP 处理
- 对于同主机回环反向代理，请使用令牌/密码身份验证，而不是 `gateway.auth.mode: "trusted-proxy"`

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # reverse proxy IP
  # Optional. Default false.
  # Only enable if your proxy cannot provide X-Forwarded-For.
  allowRealIpFallback: false
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

当配置 `trustedProxies` 时，Gateway(网关) 使用 `X-Forwarded-For` 来确定客户端 IP。默认情况下会忽略 `X-Real-IP`，除非显式设置了 `gateway.allowRealIpFallback: true`。

良好的反向代理行为（覆盖传入的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行为（追加/保留不受信任的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和源站说明

- OpenClaw 网关优先考虑本地/回环。如果您在反向代理处终止 TLS，请在那里针对面向代理的 HTTPS 域设置 HSTS。
- 如果 Gateway(网关) 本身终止 HTTPS，您可以设置 `gateway.http.securityHeaders.strictTransportSecurity` 以从 OpenClaw 响应中发出 HSTS 标头。
- 详细的部署指南请参阅[受信任代理认证](/zh/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 对于非回环控制 UI 部署，默认情况下需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一种显式允许所有浏览器源的策略，而非强化默认设置。在严格控制的本地测试之外请避免使用它。
- 即使启用了常规回环豁免，回环上的浏览器源身份验证失败仍会受到速率限制，但锁定键是按标准化的 `Origin` 值进行作用域划分的，而不是使用一个共享的 localhost 桶。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 头源回退模式；请将其视为一种危险的操作员选定策略。
- 请将 DNS 重绑定和代理主机头行为视为部署强化关注点；保持 `trustedProxies` 严格，并避免将 Gateway(网关) 直接暴露给公共互联网。

## 本地会话日志存储在磁盘上

OpenClaw 在磁盘上的 `~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下存储会话记录。
这对于会话连续性和（可选的）会话记忆索引是必需的，但这同时也意味着
**任何拥有文件系统访问权限的进程/用户都可以读取这些日志**。请将磁盘访问视为信任
边界，并锁定 `~/.openclaw` 上的权限（请参阅下面的审计部分）。如果您需要
代理之间更强的隔离，请在不同的操作系统用户或不同的主机下运行它们。

## 节点执行 (system.run)

如果 macOS 节点已配对，Gateway(网关) 可以在该节点上调用 `system.run`。这是 Mac 上的 **远程代码执行**：

- 需要节点配对（审批 + 令牌）。
- Gateway(网关) 节点配对不是逐命令审批的表面。它建立节点身份/信任和令牌颁发。
- Gateway(网关) 通过 `gateway.nodes.allowCommands` / `denyCommands` 应用粗粒度的全局节点命令策略。
- 在 Mac 上通过 **Settings → Exec approvals**（安全 + 询问 + 允许列表）进行控制。
- 每个节点的 `system.run` 策略是该节点自己的执行批准文件 (`exec.approvals.node.*`)，它可以比 Gateway 的全局命令 ID 策略更严格或更宽松。
- 使用 `security="full"` 和 `ask="off"` 运行的节点遵循默认的受信任操作员模型。除非您的部署明确要求更严格的批准或允许列表立场，否则请将其视为预期行为。
- 批准模式绑定确切的请求上下文，并在可能的情况下绑定一个具体的本地脚本/文件操作数。如果 OpenClaw 无法为解释器/运行时命令确切识别出一个直接本地文件，那么将拒绝基于批准的执行，而不是承诺完整的语义覆盖。
- 对于 `host=node`，基于批准的运行还会存储一个规范的准备好的 `systemRunPlan`；稍后批准的转发重用该存储的计划，并且在创建批准请求后，Gateway 验证会拒绝调用者对 command/cwd/会话 上下文的编辑。
- 如果您不希望远程执行，请将 security 设置为 **deny** 并移除该 Mac 的节点配对。

这种区分对于分类排查很重要：

- 一个重新连接的配对节点如果通告了不同的命令列表，这本身并不是漏洞，前提是 Gateway(网关) 全局策略和节点的本地执行批准仍然强制执行实际的执行边界。
- 那些将节点配对元数据视为第二个隐藏的每命令批准层的报告，通常是策略/UX 的混淆，而非绕过了安全边界。

## 动态 Skills（watcher / 远程节点）

OpenClaw 可以在会话中途刷新 Skills 列表：

- **Skills watcher**：对 `SKILL.md` 的更改可以在下一次代理轮次更新 Skills 快照。
- **Remote nodes**：连接 macOS 节点可以使仅限 macOS 的 Skills 有资格被使用（基于 bin 探测）。

将 Skills 文件夹视为 **受信任的代码** 并限制谁可以修改它们。

## 威胁模型

您的 AI 助手可以：

- 执行任意的 shell 命令
- 读/写文件
- 访问网络服务
- 向任何人发送消息（如果您授予其 WhatsApp 访问权限）

给您发消息的人可以：

- 试图诱骗您的 AI 做坏事
- 通过社会工程学手段获取您的数据访问权
- 探测基础设施细节

## 核心概念：先访问控制，后智能

这里的大多数失败并非花哨的漏洞利用——它们只是“有人给机器人发了消息，然后机器人照做了”。

OpenClaw 的立场：

- **身份优先**：决定谁可以与机器人对话（私信 配对 / 允许列表 / 显式“开放”）。
- **范围其次**：决定允许机器人在哪里行动（群组允许列表 + 提及门控、工具、沙箱隔离、设备权限）。
- **模型最后**：假设模型可以被操纵；进行设计使得操纵的影响范围有限。

## 命令授权模型

斜杠命令和指令仅对**授权发送者**有效。授权源自
渠道允许列表/配对以及 `commands.useAccessGroups`（请参阅[配置](/zh/gateway/configuration)
和[斜杠命令](/zh/tools/slash-commands)）。如果渠道允许列表为空或包含 `"*"`，
则该渠道的命令实际上处于开放状态。

`/exec` 是仅限会话的便捷工具，供授权操作员使用。它**不会**写入配置或更改其他会话。

## 控制平面工具风险

两个内置工具可以进行持久性的控制平面更改：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 检查配置，并可以使用 `config.apply`、`config.patch` 和 `update.run` 进行持久性更改。
- `cron` 可以创建在原始聊天/任务结束后继续运行的预定作业。

仅限所有者的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` 或 `tools.exec.security`；传统的 `tools.bash.*` 别名在写入之前会被规范化为相同的受保护执行路径。

对于任何处理不受信任内容的代理/界面，默认拒绝以下内容：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 仅阻止重启操作。它不会禁用 `gateway` 配置/更新操作。

## 插件/扩展

插件与 Gateway(网关) **在进程中**一起运行。请将它们视为受信任的代码：

- 仅从您信任的来源安装插件。
- 首选显式的 `plugins.allow` 允许列表。
- 在启用之前检查插件配置。
- 插件更改后重启 Gateway(网关)。
- 如果您安装或更新插件（`openclaw plugins install <package>`，`openclaw plugins update <id>`），请将其视为运行不受信任的代码：
  - 安装路径是活动插件安装根目录下的每个插件目录。
  - OpenClaw 在安装/更新之前运行内置的危险代码扫描。`critical` 发现结果默认会阻止。
  - OpenClaw 使用 `npm pack`，然后在该目录中运行 `npm install --omit=dev`（npm 生命周期脚本可以在安装期间执行代码）。
  - 首选固定的确切版本（`@scope/pkg@1.2.3`），并在启用之前检查磁盘上解压后的代码。
  - `--dangerously-force-unsafe-install` 仅针对插件安装/更新流程中内置扫描的误报采取应急措施。它不会绕过插件 `before_install` 钩子策略阻止，也不会绕过扫描失败。
  - Gateway(网关) 支持的技能依赖项安装遵循相同的危险/可疑拆分：内置 `critical` 发现结果会阻止，除非调用方显式设置了 `dangerouslyForceUnsafeInstall`，而可疑发现仍然仅发出警告。`openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

详情：[插件](/zh/tools/plugin)

<a id="dm-access-model-pairing-allowlist-open-disabled"></a>

## 私信 访问模型（配对 / 允许列表 / 开放 / 禁用）

所有当前支持 私信 的渠道都支持 私信 策略（`dmPolicy` 或 `*.dm.policy`），该策略在处理消息**之前**对入站 私信 进行拦截：

- `pairing`（默认）：未知发件人会收到一个简短的配对代码，并且机器人会忽略他们的消息，直到获得批准。代码在 1 小时后过期；重复的 DM 在创建新请求之前不会重新发送代码。默认情况下，待处理请求的上限为**每个渠道 3 个**。
- `allowlist`：未知发件人被阻止（无配对握手）。
- `open`：允许任何人发送 私信（公开）。**要求**渠道允许列表包含 `"*"`（显式选择加入）。
- `disabled`: 完全忽略传入的私信。

通过 CLI 批准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

详情及磁盘文件：[配对](/zh/channels/pairing)

## 私信 会话隔离（多用户模式）

默认情况下，OpenClaw 将**所有私信**路由到主**会话**中，以便您的助手在设备和渠道之间保持连续性。如果**多个人**可以私信机器人（开放私信或多人员允许列表），请考虑隔离私信会话：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

这可以防止跨用户上下文泄漏，同时保持群聊隔离。

这是一个消息上下文边界，而不是主机管理员边界。如果用户互为对手并共享同一个 Gateway(网关) 主机/配置，请改为为每个信任边界运行单独的网关。

### 安全私信模式（推荐）

将上述片段视为**安全私信模式**：

- 默认值：`session.dmScope: "main"`（所有私信共享一个会话以保持连续性）。
- 本地 CLI 新手引导默认值：未设置时写入 `session.dmScope: "per-channel-peer"`（保留现有的显式值）。
- 安全私信模式：`session.dmScope: "per-channel-peer"`（每个渠道+发件人组合获得一个隔离的私信上下文）。
- 跨渠道对等隔离：`session.dmScope: "per-peer"`（每个发件人在所有相同类型的渠道中获得一个会话）。

如果您在同一渠道上运行多个帐户，请改用 `per-account-channel-peer`。如果同一个人通过多个渠道联系您，请使用 `session.identityLinks` 将这些私信会话合并为一个规范身份。请参阅[会话管理](/zh/concepts/session)和[配置](/zh/gateway/configuration)。

## 允许列表（私信 + 群组）- 术语

OpenClaw 有两个单独的“谁可以触发我？”层：

- **私信允许列表** (`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`; 旧版: `channels.discord.dm.allowFrom`, `channels.slack.dm.allowFrom`)：允许谁通过私信与机器人对话。
  - 当 `dmPolicy="pairing"` 时，批准内容将写入 `~/.openclaw/credentials/` 下的账户范围配对允许列表存储（默认账户为 `<channel>-allowFrom.json`，非默认账户为 `<channel>-<accountId>-allowFrom.json`），并与配置允许列表合并。
- **群组允许列表**（特定于渠道）：机器人将完全接受来自哪些群组/频道/公会的消息。
  - 常见模式：
    - `channels.whatsapp.groups`，`channels.telegram.groups`，`channels.imessage.groups`：每个群组的默认设置，例如 `requireMention`；设置后，它也充当群组允许列表（包括 `"*"` 以保持全部允许的行为）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制谁可以在群组会话中触发机器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：每个表面的允许列表 + 提及默认值。
  - 群组检查按此顺序运行：首先是 `groupPolicy`/群组允许列表，其次是提及/回复激活。
  - 回复机器人消息（隐式提及）并**不会**绕过发送方允许列表，如 `groupAllowFrom`。
  - **安全提示：** 将 `dmPolicy="open"` 和 `groupPolicy="open"` 视为最后手段的设置。应该很少使用它们；除非你完全信任房间的每个成员，否则首选配对 + 允许列表。

详情：[配置](/zh/gateway/configuration)和[组](/zh/channels/groups)

## 提示词注入（它是什么，为什么重要）

提示词注入是指攻击者精心制作一条消息，操纵模型执行不安全的操作（“忽略你的指令”、“转储你的文件系统”、“点击此链接并运行命令”等）。

即使有强大的系统提示词，**提示词注入问题仍未解决**。系统提示词护栏只是软性指导；硬性执行来自工具策略、执行批准、沙箱隔离和渠道允许列表（并且操作员可以设计禁用这些措施）。在实践中有效的做法包括：

- 保持传入的私信锁定（配对/允许列表）。
- 首选群组中的提及限制；避免在公共房间中使用“始终开启”的机器人。
- 默认将链接、附件和粘贴的指令视为敌对内容。
- 在沙箱中运行敏感的工具执行；将机密信息保留在代理可访问的文件系统之外。
- 注意：沙箱隔离是可选的。如果关闭沙箱模式，隐式的 `host=auto` 将解析为网关主机。显式的 `host=sandbox` 仍将失败关闭（fails closed），因为没有可用的沙箱运行时。如果您希望在配置中明确体现该行为，请设置 `host=gateway`。
- 将高风险工具（`exec`、`browser`、`web_fetch`、`web_search`）限制在受信任的代理或显式允许列表中。
- 如果您将解释器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`）加入允许列表，请启用 `tools.exec.strictInlineEval`，以便内联评估表单仍需要显式批准。
- **模型选择很重要：** 较旧/较小/遗留的模型在对抗提示注入和工具滥用方面明显不够稳健。对于启用工具的代理，请使用可用的最强、最新一代且经过指令强化的模型。

应视为不可信的危险信号：

- “阅读此文件/URL 并完全按照它说的做。”
- “忽略你的系统提示或安全规则。”
- “揭示你的隐藏指令或工具输出。”
- “粘贴 ~/.openclaw 或你的日志的完整内容。”

## 不安全的外部内容绕过标志

OpenClaw 包含显式的绕过标志，用于禁用外部内容安全包装：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 负载字段 `allowUnsafeExternalContent`

指导原则：

- 在生产环境中保持这些标志未设置或设置为 false。
- 仅针对范围狭窄的调试临时启用。
- 如果启用，请隔离该代理（沙箱 + 最少工具 + 专用会话命名空间）。

Hook 风险说明：

- Hook 负载是不可信内容，即使交付来自您控制的系统（邮件/文档/Web 内容可能携带提示注入）。
- 模型层级较弱会增加此风险。对于由 Hook 驱动的自动化，建议使用强大的现代模型层级，并保持工具策略严格（`tools.profile: "messaging"` 或更严格），并尽可能进行沙箱隔离。

### 提示注入并不需要公开的私信（私信）

即使**只有您**可以向机器人发送消息，提示词注入仍然可能通过机器人读取的任何**不受信任的内容**（网络搜索/获取结果、浏览器页面、电子邮件、文档、附件、粘贴的日志/代码）发生。换句话说：发送者不是唯一的威胁面；**内容本身**也可能携带对抗性指令。

当启用工具时，典型的风险是窃取上下文或触发工具调用。通过以下方式减小爆炸半径：

- 使用只读或禁用工具的**读取代理（reader agent）**来汇总不受信任的内容，然后将摘要传递给您的主体代理。
- 对于启用工具的代理，除非必要，否则保持 `web_search` / `web_fetch` / `browser` 关闭。
- 对于 OpenResponses URL 输入（`input_file` / `input_image`），请设置严格的 `gateway.http.endpoints.responses.files.urlAllowlist` 和 `gateway.http.endpoints.responses.images.urlAllowlist`，并保持 `maxUrlParts` 较低。空的允许列表被视为未设置；如果您想完全禁用 URL 获取，请使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 对于 OpenResponses 文件输入，解码后的 `input_file` 文本仍然作为**不受信任的外部内容**注入。不要仅仅因为 Gateway(网关) 在本地解码了它就依赖文件文本是可信的。注入的块仍然带有显式的 `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 边界标记以及 `Source: External` 元数据，即使此路径省略了更长的 `SECURITY NOTICE:` 横幅。
- 当媒体理解从附加文档中提取文本并将该文本附加到媒体提示之前，会应用相同的基于标记的包装。
- 为任何接触不受信任输入的代理启用沙箱隔离和严格的工具允许列表。
- 将机密信息排除在提示词之外；通过网关主机上的 env/config 传递它们。

### 模型强度（安全提示）

针对提示词注入的抵抗力在不同模型层级中并**不**统一。较小/较便宜的模型通常更容易受到工具滥用和指令劫持的影响，特别是在对抗性提示词下。

<Warning>对于启用了工具的代理或读取不受信任内容的代理，使用较旧/较小的模型时，提示注入风险通常过高。不要在弱模型层级上运行这些工作负载。</Warning>

建议：

- **使用最新一代、最高层级的模型**用于任何可以运行工具或访问文件/网络的机器人。
- **不要为启用了工具的代理或不受信任的收件箱使用较旧/较弱/较小的层级**；提示注入风险过高。
- 如果必须使用较小的模型，请**减小爆炸半径**（只读工具、强沙箱隔离、最小的文件系统访问权限、严格的允许列表）。
- 运行小模型时，**为所有会话启用沙箱隔离**并**禁用 web_search/web_fetch/browser**，除非输入受到严格控制。
- 对于仅聊天、输入受信任且没有工具的个人助手，通常可以使用较小的模型。

<a id="reasoning-verbose-output-in-groups"></a>

## 群组中的推理与详细输出

`/reasoning`、`/verbose` 和 `/trace` 可能会暴露内部推理、工具
输出或插件诊断信息，而这些内容
并非意在公开给公开渠道。在群组设置中，将它们视为**仅限调试**
并在未明确需要时将其关闭。

指导原则：

- 在公共房间中禁用 `/reasoning`、`/verbose` 和 `/trace`。
- 如果启用它们，请仅在受信任的 DM 或严格控制的房间中进行。
- 请记住：详细和跟踪输出可能包含工具参数、URL、插件诊断信息以及模型看到的数据。

## 配置加固（示例）

### 0) 文件权限

在 Gateway 主机上保持配置和状态私密：

- `~/.openclaw/openclaw.json`: `600` (仅用户读写)
- `~/.openclaw`: `700` (仅用户)

`openclaw doctor` 可以发出警告并提供收紧这些权限的选项。

### 0.4) 网络暴露（绑定 + 端口 + 防火墙）

Gateway(网关) 在单个端口上多路复用 **WebSocket + HTTP**：

- 默认值：`18789`
- 配置/标志/环境变量：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`

此 HTTP 表面包括控制 UI 和 canvas 主机：

- 控制 UI (SPA 资源) (默认基础路径 `/`)
- Canvas 主机：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；将其视为不受信任的内容)

如果您在普通浏览器中加载 Canvas 内容，请像对待任何其他不受信任的网页一样对待它：

- 不要将 Canvas 主机暴露给不受信任的网络/用户。
- 除非您完全了解其含义，否则不要让 Canvas 内容与特权 Web 表面共享同一源。

绑定模式控制 Gateway(网关) 的监听位置：

- `gateway.bind: "loopback"` (默认值)：仅本地客户端可以连接。
- 非环回绑定 (`"lan"`、`"tailnet"`、`"custom"`) 会扩大攻击面。仅在使用网关身份验证 (共享令牌/密码或正确配置的非环回受信任代理) 和真实的防火墙时才使用它们。

经验法则：

- 优先使用 Tailscale Serve 而不是 LAN 绑定（Serve 将 Gateway(网关) 保持在环回上，并由 Tailscale 处理访问）。
- 如果必须绑定到 LAN，请使用防火墙将端口限制在严格的源 IP 白名单内；不要广泛进行端口转发。
- 切勿在 `0.0.0.0` 上不经身份验证暴露 Gateway(网关)。

### 0.4.1) Docker 端口发布 + UFW (`DOCKER-USER`)

如果您在 VPS 上使用 Docker 运行 OpenClaw，请记住已发布的容器端口
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是通过 Docker 的转发
链路进行路由的，而不仅仅是主机 `INPUT` 规则。

为了使 Docker 流量与您的防火墙策略保持一致，请在
`DOCKER-USER` 中强制执行规则 (此链在 Docker 自身的接受规则之前进行评估)。
在许多现代发行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
并且仍将这些规则应用于 nftables 后端。

最小白名单示例 (IPv4)：

```bash
# /etc/ufw/after.rules (append as its own *filter section)
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 具有单独的表。如果启用了 Docker IPv6，请在 `/etc/ufw/after6.rules` 中添加匹配的策略。

避免在文档代码片段中对接口名称 (如 `eth0`) 进行硬编码。接口名称
因 VPS 镜像而异 (`ens3`、`enp*` 等)，不匹配可能会意外
跳过您的拒绝规则。

重新加载后的快速验证：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

预期开放的外部端口应仅限于您有意暴露的端口（对于大多数设置：SSH + 您的反向代理端口）。

### 0.4.2) mDNS/Bonjour 发现（信息泄露）

Gateway(网关) 通过 mDNS（端口 5353 上的 `_openclaw-gw._tcp`）广播其存在，以便进行本地设备发现。在完整模式下，这包括可能暴露操作细节的 TXT 记录：

- `cliPath`：CLI 二进制文件的完整文件系统路径（揭示用户名和安装位置）
- `sshPort`：通告主机上 SSH 的可用性
- `displayName`，`lanHost`：主机名信息

**操作安全考虑：** 广播基础设施细节使得本地网络上的任何人更容易进行侦察。即使是文件系统路径和 SSH 可用性等“无害”信息，也能帮助攻击者绘制您的环境图。

**建议：**

1. **最小模式**（默认，建议用于暴露的网关）：在 mDNS 广播中省略敏感字段：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

2. **完全禁用**（如果您不需要本地设备发现）：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

3. **完整模式**（选择加入）：在 TXT 记录中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

4. **环境变量**（替代方法）：设置 `OPENCLAW_DISABLE_BONJOUR=1` 以在不更改配置的情况下禁用 mDNS。

在最小模式下，Gateway(网关) 仍然广播足够的信息以进行设备发现（`role`，`gatewayPort`，`transport`），但会省略 `cliPath` 和 `sshPort`。需要 CLI 路径信息的应用可以通过经过身份验证的 WebSocket 连接来获取它。

### 0.5) 锁定 Gateway(网关) WebSocket（本地认证）

Gateway(网关) 认证**默认是必需的**。如果未配置有效的网关认证路径，
Gateway(网关) 将拒绝 WebSocket 连接（故障关闭/失效保护）。

新手引导默认会生成一个令牌（即使对于环回接口），因此
本地客户端必须进行身份验证。

设置一个令牌，以便**所有** WS 客户端都必须进行身份验证：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以为您生成一个：`openclaw doctor --generate-gateway-token`。

注意：`gateway.remote.token` / `.password` 是客户端凭据源。它们本身**不**保护本地 WS 访问。
仅当未设置 `gateway.auth.*` 时，本地调用路径才能将 `gateway.remote.*` 作为后备。
如果 `gateway.auth.token` / `gateway.auth.password` 是通过 SecretRef 显式配置的且未解析，解析将以失败关闭（无远程后备屏蔽）。
可选：在使用 `wss://` 时，使用 `gateway.remote.tlsFingerprint` 固定远程 TLS。
纯文本 `ws://` 默认仅限环回。对于受信任的私有网络路径，在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为应急手段。

本地设备配对：

- 直接本地回环连接的设备配对会自动批准，以保持同主机客户端的流畅。
- OpenClaw 还有一个狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流程。
- Tailnet 和 LAN 连接（包括同主机 tailnet 绑定）在配对时被视为远程连接，仍需批准。

认证模式：

- `gateway.auth.mode: "token"`：共享不记名令牌（推荐用于大多数设置）。
- `gateway.auth.mode: "password"`：密码身份验证（首选通过 env 设置：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任一个支持身份识别的反向代理来对用户进行身份验证并通过请求头传递身份（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。

轮换清单（令牌/密码）：

1. 生成/设置一个新的密钥（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重启 Gateway(网关)（如果 macOS 应用监管 Gateway(网关)，则重启该应用）。
3. 更新任何远程客户端（调用 Gateway(网关) 的机器上的 `gateway.remote.token` / `.password`）。
4. 验证您无法再使用旧凭证进行连接。

### 0.6) Tailscale Serve 身份标头

当 `gateway.auth.allowTailscale` 为 `true` 时（Serve 的默认设置），OpenClaw
接受 Tailscale Serve 身份请求头（`tailscale-user-login`）用于控制
UI/WebSocket 身份验证。OpenClaw 通过本地 Tailscale 守护进程（`tailscale whois`）
解析 `x-forwarded-for` 地址并将其与请求头匹配来验证身份。这仅针对命中回环
地址且包含由 Tailscale 注入的
`x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 的请求触发。
对于此异步身份检查路径，针对同一 `{scope, ip}` 的失败尝试
会在限制器记录失败之前被序列化。因此，来自一个 Serve 客户端的并发错误重试
可以立即锁定第二次尝试，而不是作为两个普通的不匹配请求竞相通过。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身份请求头身份验证。它们仍然遵循网关配置的
HTTP 身份验证模式。

重要边界说明：

- Gateway(网关) HTTP 持有者身份验证实际上是全有或全无的操作员访问权限。
- 将可以调用 `/v1/chat/completions`、`/v1/responses` 或 `/api/channels/*` 的凭据视为该网关的完全访问操作员密钥。
- 在 OpenAI 兼容的 HTTP 表面上，共享密钥承载者身份验证会恢复完整的默认操作员范围（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）和 Agent 轮次的拥有者语义；较窄的 `x-openclaw-scopes` 值不会缩减该共享密钥路径。
- HTTP 上的每请求范围语义仅在请求来自携带身份的模式（例如可信代理认证或私有入口上的 `gateway.auth.mode="none"`）时适用。
- 在这些携带身份的模式中，省略 `x-openclaw-scopes` 会回退到正常的操作员默认范围集；当您想要更窄的范围集时，请显式发送该头部。
- `/tools/invoke` 遵循相同的共享密钥规则：在该模式下，令牌/密码持有者认证也被视为完整的操作员访问权限，而携带身份的模式仍然遵守声明的范围。
- 请勿与不受信任的调用者共享这些凭据；建议每个信任边界使用单独的 Gateway（网关）。

**信任假设：** 无令牌 Serve 认证假设网关主机是受信任的。
不要将其视为针对同主机恶意进程的保护。如果不受信任的
本地代码可能在网关主机上运行，请禁用 `gateway.auth.allowTailscale`
并要求使用 `gateway.auth.mode: "token"` 或
`"password"` 进行显式共享密钥认证。

**安全规则：** 不要从您自己的反向代理转发这些头部。如果您
在网关之前终止 TLS 或进行代理，请禁用
`gateway.auth.allowTailscale` 并使用共享密钥认证（`gateway.auth.mode:
"token"` or `"password"`）或 [可信代理认证](/zh/gateway/trusted-proxy-auth)
代替。

受信任的代理：

- 如果您在 Gateway(网关) 之前终止 TLS，请将 `gateway.trustedProxies` 设置为您的代理 IP。
- OpenClaw 将信任来自这些 IP 的 `x-forwarded-for`（或 `x-real-ip`）以确定用于本地配对检查和 HTTP 认证/本地检查的客户端 IP。
- 确保您的代理**覆盖** `x-forwarded-for` 并阻止对 Gateway(网关) 端口的直接访问。

请参阅 [Tailscale](/zh/gateway/tailscale) 和 [Web 概述](/zh/web)。

### 0.6.1) 通过节点主机进行浏览器控制（推荐）

如果您的 Gateway(网关) 是远程的，但浏览器在另一台机器上运行，请在浏览器机器上运行一个**节点主机**
并让 Gateway(网关) 代理浏览器操作（请参阅 [浏览器工具](/zh/tools/browser)）。
请将节点配对视为管理员访问权限。

推荐模式：

- 将 Gateway(网关)（网关）和节点主机保持在同一个 tailnet（Tailscale）上。
- 有意地配对节点；如果不需要，请禁用浏览器代理路由。

避免：

- 通过 LAN 或公共 Internet 暴露中继/控制端口。
- 用于浏览器控制端点的 Tailscale Funnel（公开暴露）。

### 0.7) 磁盘上的密钥（敏感数据）

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何内容都可能包含机密或私人数据：

- `openclaw.json`：配置可能包含令牌（网关、远程网关）、提供商设置和允许列表。
- `credentials/**`：渠道凭据（例如：WhatsApp 凭据）、配对允许列表、旧版 OAuth 导入。
- `agents/<agentId>/agent/auth-profiles.json`：API 密钥、令牌配置文件、OAuth 令牌，以及可选的 `keyRef`/`tokenRef`。
- `secrets.json`（可选）：由 `file` SecretRef 提供商（`secrets.providers`）使用的基于文件的机密有效负载。
- `agents/<agentId>/agent/auth.json`：旧版兼容性文件。发现时会清除静态 `api_key` 条目。
- `agents/<agentId>/sessions/**`：会话脚本（`*.jsonl`）+ 路由元数据（`sessions.json`），其中可能包含私有消息和工具输出。
- 捆绑的插件包：已安装的插件（及其 `node_modules/`）。
- `sandboxes/**`：工具沙箱工作区；可能会累积您在沙箱内读/写的文件副本。

加固提示：

- 保持权限严格（目录使用 `700`，文件使用 `600`）。
- 在网关主机上使用全盘加密。
- 如果主机是共享的，建议为 Gateway(网关) 使用专用的操作系统用户帐户。

### 0.8) 日志 + 记录（编辑 + 保留）

即使访问控制正确，日志和记录也可能泄露敏感信息：

- Gateway(网关) 日志可能包含工具摘要、错误和 URL。
- 会话记录可能包含粘贴的机密、文件内容、命令输出和链接。

建议：

- 保持工具摘要编辑开启（`logging.redactSensitive: "tools"`；默认设置）。
- 通过 `logging.redactPatterns` 为您的环境添加自定义模式（令牌、主机名、内部 URL）。
- 共享诊断信息时，首选 `openclaw status --all`（可粘贴，已编辑机密信息）而非原始日志。
- 如果您不需要长期保留，请清理旧的会话记录和日志文件。

详情：[日志记录](/zh/gateway/logging)

### 1) 私信：默认配对

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 2) 群组：随处要求提及

```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "groupChat": { "mentionPatterns": ["@openclaw", "@mybot"] }
      }
    ]
  }
}
```

在群聊中，仅在明确被提及时才响应。

### 3) 独立号码 (WhatsApp, Signal, Telegram)

对于基于电话号码的频道，请考虑在与个人号码不同的号码上运行 AI：

- 个人号码：您的对话保持私密
- 机器人号码：AI 处理这些消息，并具有适当的边界

### 4) 只读模式（通过沙箱 + 工具）

您可以通过以下组合构建只读配置文件：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（或者对于无工作区访问权限使用 `"none"`）
- 阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允许/拒绝列表。

额外的加固选项：

- `tools.exec.applyPatch.workspaceOnly: true` (默认)：确保 `apply_patch` 即使在关闭沙箱隔离的情况下也无法在工作区目录之外进行写入/删除操作。仅当您有意希望 `apply_patch` 接触工作区之外的文件时，才设置为 `false`。
- `tools.fs.workspaceOnly: true` (可选)：将 `read`/`write`/`edit`/`apply_patch` 路径和原生提示词镜像自动加载路径限制在工作区目录内（如果您当前允许绝对路径且希望设置单一防护栏，这非常有用）。
- 保持文件系统根目录狭窄：避免为代理工作区/沙箱工作区设置像您的主目录这样宽泛的根目录。宽泛的根目录可能会将敏感的本地文件（例如 `~/.openclaw` 下的 state/config）暴露给文件系统工具。

### 5) 安全基线（复制/粘贴）

一种“安全默认”配置，可以保持 Gateway(网关) 私有，要求私信配对，并避免始终开启的群组机器人：

```json5
{
  gateway: {
    mode: "local",
    bind: "loopback",
    port: 18789,
    auth: { mode: "token", token: "your-long-random-token" },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

如果您也希望“默认更安全”的工具执行，请为任何非所有者智能体添加沙箱 + 拒绝危险工具（下面的“Per-agent access profiles”中有示例）。

聊天驱动代理轮次的内置基线：非所有者发送者无法使用 `cron` 或 `gateway` 工具。

## 沙箱隔离（推荐）

专用文档：[沙箱隔离](/zh/gateway/sandboxing)

两种互补的方法：

- **在 Gateway(网关) 中运行完整的 Docker** (容器边界)：[Docker](/zh/install/docker)
- **工具沙箱** (`agents.defaults.sandbox`，主机 Gateway + Docker-隔离工具)：[沙箱隔离](/zh/gateway/sandboxing)

注意：为了防止跨代理访问，请将 `agents.defaults.sandbox.scope` 保持在 `"agent"` (默认) 或设置为 `"session"` 以实现更严格的每个会话隔离。`scope: "shared"` 使用单个容器/工作区。

同时考虑沙箱内的代理工作区访问权限：

- `agents.defaults.sandbox.workspaceAccess: "none"` (默认) 将代理工作区设为禁止访问；工具针对 `~/.openclaw/sandboxes` 下的沙箱工作区运行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 在 `/agent` 以只读方式挂载代理工作区 (禁用 `write`/`edit`/`apply_patch`)
- `agents.defaults.sandbox.workspaceAccess: "rw"` 在 `/workspace` 以读/写方式挂载代理工作区
- 额外的 `sandbox.docker.binds` 会针对规范化和标准化的源路径进行验证。如果父目录符号链接技巧和规范主目录别名解析到被阻止的根目录（例如 `/etc`、`/var/run` 或 OS 主目录下的凭据目录），它们仍然会以失败关闭。

重要提示：`tools.elevated` 是全局基准逃生舱口，用于在沙箱之外运行 exec。有效主机默认为 `gateway`，或者当 exec 目标配置为 `node` 时为 `node`。请严格控制 `tools.elevated.allowFrom`，不要为陌生人启用它。您可以通过 `agents.list[].tools.elevated` 进一步限制每个代理的提权。请参阅[提权模式](/zh/tools/elevated)。

### 子代理委托防护栏

如果您允许会话工具，请将委托的子代理运行视为另一个边界决策：

- 拒绝 `sessions_spawn`，除非代理确实需要委派。
- 请将 `agents.defaults.subagents.allowAgents` 以及任何针对每个代理的 `agents.list[].subagents.allowAgents` 覆盖设置限制为已知安全的目标代理。
- 对于任何必须保持沙箱隔离的工作流，请使用 `sandbox: "require"` 调用 `sessions_spawn`（默认为 `inherit`）。
- 如果目标子运行时未处于沙箱隔离状态，`sandbox: "require"` 将快速失败。

## 浏览器控制风险

启用浏览器控制赋予了模型驱动真实浏览器的权限。
如果该浏览器配置文件中已包含已登录的会话，模型将能够
访问这些账户和数据。请将浏览器配置文件视为 **敏感状态**：

- 最好为代理使用专用配置文件（默认的 `openclaw` 配置文件）。
- 避免将 Agent 指向您个人的日常使用配置文件。
- 对于已沙箱隔离的 Agent，除非您信任它们，否则保持禁用主机浏览器控制。
- 独立的环回浏览器控制 API 仅支持共享密钥身份验证
  （Gateway token bearer auth 或 Gateway 密码）。它不使用
  trusted-proxy 或 Tailscale Serve 身份标头。
- 将浏览器下载内容视为不受信任的输入；优先使用隔离的下载目录。
- 如果可能，请在 Agent 配置文件中禁用浏览器同步/密码管理器（以减少爆炸半径）。
- 对于远程 Gateway，应假设“浏览器控制”等同于“操作员访问”，即可以访问该配置文件所能触及的任何内容。
- 保持 Gateway(网关) 和节点主机仅限 tailnet 访问；避免将浏览器控制端口暴露给局域网或公共互联网。
- 如果不需要，请禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP 现有会话模式并 **不** “更安全”；它可以在该主机 Chrome 配置文件所能触及的任何地方冒充您。

### 浏览器 SSRF 策略（默认严格）

OpenClaw 的浏览器导航策略默认为严格模式：私有/内部目标保持阻止状态，除非您明确选择加入。

- 默认值：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此浏览器导航会阻止私有/内部/特殊用途的目标。
- 旧版别名：`browser.ssrfPolicy.allowPrivateNetwork` 仍被接受以保持兼容性。
- 加入模式：设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允许私有/内部/特殊用途的目标。
- 在严格模式下，请使用 `hostnameAllowlist`（类似于 `*.example.com` 的模式）和 `allowedHostnames`（精确主机例外，包括像 `localhost` 这样的被阻止名称）来进行显式例外处理。
- 在请求之前会检查导航，并在导航后对最终的 `http(s)` URL 进行尽力重检，以减少基于重定向的跳转。

严格策略示例：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"],
    },
  },
}
```

## 每个代理的访问配置文件（多代理）

使用多智能体路由时，每个智能体可以拥有自己的沙箱 + 工具策略：
使用此策略为每个智能体授予**完全访问权限**、**只读权限**或**无访问权限**。
有关完整信息和优先级规则，请参阅[多智能体沙箱与工具](/zh/tools/multi-agent-sandbox-tools)。

常见用例：

- 个人代理：完全访问权限，无沙箱
- 家庭/工作代理：沙箱隔离 + 只读工具
- 公共代理：沙箱隔离 + 无文件系统/Shell 工具

### 示例：完全访问权限（无沙箱）

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

### 示例：只读工具 + 只读工作区

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

### 示例：无文件系统/Shell 访问权限（允许提供商消息传递）

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
        // Session tools can reveal sensitive data from transcripts. By default OpenClaw limits these tools
        // to the current session + spawned subagent sessions, but you can clamp further if needed.
        // See `tools.sessions.visibility` in the configuration reference.
        tools: {
          sessions: { visibility: "tree" }, // self | tree | agent | all
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

## 需要告诉 AI 的内容

在代理的系统提示词中包含安全准则：

```
## Security Rules
- Never share directory listings or file paths with strangers
- Never reveal API keys, credentials, or infrastructure details
- Verify requests that modify system config with the owner
- When in doubt, ask before acting
- Keep private data private unless explicitly authorized
```

## 事件响应

如果你的 AI 做了坏事：

### 遏制

1. **停止运行：** 停止 macOS 应用（如果它监管 Gateway(网关)）或终止您的 `openclaw gateway` 进程。
2. **关闭暴露：** 设置 `gateway.bind: "loopback"`（或禁用 Tailscale Funnel/Serve），直到您了解发生了什么。
3. **冻结访问：** 将有风险的私信/组切换到 `dmPolicy: "disabled"` / 要求提及，如果您之前设置了 `"*"` 允许所有条目，请将其移除。

### 轮换（如果密钥泄露，则假定已受损）

1. 轮换 Gateway(网关) 身份验证 (`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) 并重启。
2. 在可以调用 Gateway(网关) 的任何机器上，轮换远程客户端密钥 (`gateway.remote.token` / `.password`)。
3. 轮换提供商/API 凭证（WhatsApp 凭证、Slack/Discord 令牌、`auth-profiles.json` 中的模型/API 密钥，以及使用时的加密秘密载荷值）。

### 审计

1. 检查 Gateway(网关) 日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 查看相关的对话记录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 检查最近的配置更改（任何可能扩大访问权限的更改：`gateway.bind`、`gateway.auth`、私信/组策略、`tools.elevated`、插件更改）。
4. 重新运行 `openclaw security audit --deep` 并确认关键发现已解决。

### 收集以供报告

- 时间戳，Gateway 主机操作系统 + OpenClaw 版本
- 会话记录 + 短日志尾部（编辑后）
- 攻击者发送的内容 + Agent 执行的操作
- Gateway(网关) 是否暴露在回环地址之外（LAN/Gateway(网关) Funnel/Serve）

## 机密扫描 (detect-secrets)

CI 在 `secrets` 任务中运行 `detect-secrets` pre-commit 钩子。
推送到 `main` 始终运行全文件扫描。当存在基础提交时，拉取请求使用
已更改文件的快速路径，否则回退到全文件扫描。
如果失败，则表示基线中尚无新的候选内容。

### 如果 CI 失败

1. 本地复现：

   ```bash
   pre-commit run --all-files detect-secrets
   ```

2. 了解工具：
   - pre-commit 中的 `detect-secrets` 使用存储库的
     基线和排除项运行 `detect-secrets-hook`。
   - `detect-secrets audit` 打开一个交互式审查，将每个基线项标记为真实或误报。
3. 对于真实的机密：轮换/删除它们，然后重新运行扫描以更新基线。
4. 对于误报：运行交互式审查并将它们标记为 false：

   ```bash
   detect-secrets audit .secrets.baseline
   ```

5. 如果需要新的排除项，请将其添加到 `.detect-secrets.cfg`，并使用匹配的 `--exclude-files` / `--exclude-lines` 标志重新生成基线（配置文件仅供参考；detect-secrets 不会自动读取它）。

一旦更新后的 `.secrets.baseline` 反映了预期状态，请提交它。

## 报告安全问题

在 OpenClaw 中发现了漏洞？请负责任地报告：

1. 电子邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修复之前不要公开发布
3. 我们会致谢你（除非你选择匿名）
