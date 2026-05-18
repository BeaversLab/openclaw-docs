---
summary: "运行具有 Shell 访问权限的 AI 网关的安全考虑和威胁模型"
read_when:
  - Adding features that widen access or automation
title: "安全"
---

<Warning>**个人助手信任模型。** 本指南假设每个 Gateway(网关) 有一个可信 操作员边界（单用户、个人助手模型）。 OpenClaw **不是** 多个对抗性用户共享一个代理或网关的 敌对多租户安全边界。如果您需要混合信任或 对抗性用户操作，请拆分信任边界（单独的 Gateway(网关) + 凭据，理想情况下是单独的操作系统用户或主机）。</Warning>

## 范围优先：个人助手安全模型

OpenClaw 安全指南假设采用 **个人助手** 部署：一个可信的操作员边界，可能有多个代理。

- 支持的安全姿态：每个 Gateway(网关) 一个用户/信任边界（最好每个边界一个操作系统用户/主机/VPS）。
- 不支持的安全边界：由互不信任或对抗性用户使用的一个共享 Gateway(网关)/代理。
- 如果需要对抗性用户隔离，请按信任边界拆分（单独的 Gateway(网关) + 凭据，理想情况下是单独的操作系统用户/主机）。
- 如果多个不受信任的用户可以向一个启用了工具的代理发送消息，请将他们视为共享该代理的相同委托工具权限。

本页面解释了在该模型**内部**的加固。它并不声称在一个共享 Gateway(网关) 上实现敌对多租户隔离。

## 快速检查：`openclaw security audit`

另请参阅：[形式化验证（安全模型）](/zh/security/formal-verification)

定期运行此检查（尤其是在更改配置或暴露网络表面之后）：

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --fix
openclaw security audit --json
```

`security audit --fix` 故意保持狭窄：它将常见的开放组策略翻转为允许列表，恢复 `logging.redactSensitive: "tools"`，收紧状态/配置/包含文件的权限，并且在 Windows 上运行时，使用 Windows ACL 重置而不是 POSIX `chmod`。

它会标记常见的常见陷阱（Gateway(网关) 身份验证暴露、浏览器控制暴露、提升的允许列表、文件系统权限、宽松的执行批准以及开放渠道工具暴露）。

OpenClaw 既是产品也是实验：你正在将前沿模型行为连接到真实的消息界面和真实的工具中。**不存在“完美安全”的设置。** 目标是有意地做到：

- 谁可以与您的机器人对话
- 允许机器人在何处执行操作
- 机器人可以触及什么

从仍然有效的最小权限开始，然后在您建立信心后扩大权限。

### 部署和主机信任

OpenClaw 假定主机和配置边界是受信任的：

- 如果某人可以修改 Gateway(网关) 主机状态/配置（`~/.openclaw`，包括 `openclaw.json`），则将其视为受信任的操作员。
- 为多个互不信任/对立的操作员运行一个 Gateway(网关) **不是推荐的设置**。
- 对于混合信任团队，请使用独立的网关（或至少独立的操作系统用户/主机）划分信任边界。
- 推荐的默认设置：每台机器/主机（或 VPS）一个用户，该用户一个网关，以及该网关中一个或多个代理。
- 在一个 Gateway(网关) 实例内，经过身份验证的操作员访问是受信任的控制平面角色，而不是每用户租户角色。
- 会话标识符（`sessionKey`、会话 ID、标签）是路由选择器，而非授权令牌。
- 如果几个人可以向一个启用了工具的代理发送消息，他们每个人都可以控制相同的权限集。每用户会话/内存隔离有助于保护隐私，但不会将共享代理转换为每用户主机授权。

### 安全文件操作

OpenClaw 使用 `@openclaw/fs-safe` 进行根边界文件访问、原子写入、归档提取、临时工作区和秘密文件辅助。OpenClaw 默认将 fs-safe 的可选 POSIX Python 辅助功能设置为**关闭**；仅当你想要额外的 fd 相对变异加固并且可以支持 Python 运行时时，才设置 `OPENCLAW_FS_SAFE_PYTHON_MODE=auto` 或 `require`。

详情：[安全文件操作](/zh/gateway/security/secure-file-operations)。

### 共享 Slack 工作区：真实风险

如果“Slack 中的每个人都可以向该机器人发送消息”，核心风险在于委托的工具权限：

- 任何允许的发送者都可以在代理策略内诱发工具调用（`exec`、浏览器、网络/文件工具）；
- 来自一个发送者的提示/内容注入可能导致影响共享状态、设备或输出的操作；
- 如果一个共享代理拥有敏感的凭据/文件，任何允许的发送者都可能通过工具使用来驱动数据外泄。

为团队工作流使用具有最少工具的独立代理/Gateway(网关)；将包含个人数据的代理保持私密。

### 公司共享代理：可接受的模式

当使用该代理的所有人都处于同一信任边界内（例如一个公司团队）并且该代理严格限于业务范围时，这是可接受的。

- 在专用机器/VM/容器上运行它；
- 为该运行时使用专用的操作系统用户 + 专用的浏览器/配置文件/账户；
- 不要将该运行时登录到个人 Apple/Google 账户或个人密码管理器/浏览器配置文件中。

如果你在同一运行时上混合使用个人和公司身份，你就打破了这种隔离，并增加了个人数据暴露的风险。

## Gateway(网关) 和节点信任概念

将 Gateway(网关) 和节点视为具有不同角色的一个操作员信任域：

- **Gateway(网关)** 是控制平面和策略表面（`gateway.auth`、工具策略、路由）。
- **Node（节点）** 是与该 Gateway(网关) 配对的远程执行表面（命令、设备操作、主机本地功能）。
- 经过 Gateway(网关) 身份验证的调用者在 Gateway(网关) 范围内受信任。配对后，节点操作是该节点上受信任的操作员操作。
- 操作员范围级别和审批时检查在 [操作员范围](/zh/gateway/operator-scopes) 中进行了总结。
- 使用共享 Gateway(网关) 令牌/密码进行身份验证的直接回环后端客户端可以在不提供用户设备身份的情况下进行内部控制平面 RPC 调用。这不是远程或浏览器配对的绕过：网络客户端、节点客户端、设备令牌客户端和显式设备身份仍需经过配对和范围升级强制执行。
- `sessionKey` 是路由/上下文选择，而非每用户身份验证。
- 执行批准（允许列表 + 询问）是针对操作员意图的护栏，而非针对恶意多租户隔离。
- 对于受信任的单操作员设置，OpenClaw 的产品默认允许在 OpenClaw`gateway`/`node` 上进行主机执行，而无需批准提示（`security="full"`，`ask="off"`，除非您收紧设置）。该默认设置是有意的用户体验设计，本身并非漏洞。
- 执行批准绑定确切的请求上下文和尽力而为的直接本地文件操作数；它们在语义上不模型化每个运行时/解释器加载器路径。请使用沙箱隔离和主机隔离来实现强边界。

如果您需要隔离恶意用户，请按操作系统用户/主机拆分信任边界，并运行独立的网关。

## 信任边界矩阵

在分流风险时，请以此作为快速模型：

| 边界或控制                                          | 含义                             | 常见误解                                             |
| --------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `gateway.auth`（令牌/密码/受信任代理/设备身份验证） | 向网关 API 验证调用者身份        | “需要在每个帧上都有每条消息的签名才能安全”           |
| `sessionKey`                                        | 用于上下文/会话选择的路由键      | “会话密钥是用户身份验证边界”                         |
| 提示/内容护栏                                       | 降低模型滥用风险                 | “仅凭提示注入就能证明身份验证被绕过”                 |
| `canvas.eval` / 浏览器求值                          | 启用时有意的操作员能力           | “在此信任模型中，任何 JS 求值原语自动构成漏洞”       |
| 本地 TUI TUI`!` shell                               | 操作员显式触发的本地执行         | “本地 shell 便利命令是远程注入”                      |
| 节点配对和节点命令                                  | 配对设备上的操作员级远程执行     | “默认情况下，远程设备控制应被视为不受信任的用户访问” |
| `gateway.nodes.pairing.autoApproveCidrs`            | 可选加入的受信任网络节点注册策略 | “默认禁用的允许列表是自动配对漏洞”                   |

## 设计上并非漏洞

<Accordion title="不在范围内的常见发现">

这些模式经常被报告，除非证明了真正的边界绕过，否则通常会被作为无需操作关闭：

- 仅提示词注入的链，且没有策略、身份验证或沙箱绕过。
- 假设在一个共享主机或配置上进行敌对多租户操作的声明。
- 在共享 Gateway(网关) 设置中，将正常的操作员读取路径访问（例如
  `sessions.list` / `sessions.preview` / `chat.history`Discord）归类为 IDOR 的声明。
- 仅限本地主机的部署发现（例如，仅限环回的 Gateway(网关) 上的 HSTS）。
- 针对此仓库中不存在的入站路径的 Discord 入站 Webhook 签名发现。
- 将节点配对元数据视为 `system.run` 的隐藏的第二层每命令批准层的报告，而实际的执行边界仍然是
  Gateway(网关) 的全局节点命令策略加上节点自己的执行
  批准。
- 将配置的 `gateway.nodes.pairing.autoApproveCidrs` 视为漏洞本身的报告。此设置默认禁用，需要
  明确的 CIDR/IP 条目，仅适用于没有请求范围的首次 `role: node`WebChat 配对，并且不会自动批准操作员/浏览器/Control UI、
  WebChat、角色升级、范围升级、元数据更改、公钥更改
  或同一主机环回受信任代理头路径，除非明确启用了环回受信任代理身份验证。
- “缺少每用户授权”发现，即将 `sessionKey` 视为身份验证令牌。

</Accordion>

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

这使 Gateway(网关) 保持仅本地访问，隔离私信，并默认禁用控制平面/运行时工具。

## 共享收件箱快速规则

如果不止一个人可以给您的机器人发私信：

- 设置 `session.dmScope: "per-channel-peer"` （对于多账户频道，则设置 `"per-account-channel-peer"`）。
- 保留 `dmPolicy: "pairing"` 或严格的允许列表。
- 切勿将共享私信与广泛的工具访问权限结合使用。
- 这加强了协作/共享收件箱的安全性，但当用户共享主机/配置写入访问权限时，并非旨在作为敌对的多租户隔离机制。

## 上下文可见性模型

OpenClaw 区分了两个概念：

- **触发授权**：谁可以触发代理（`dmPolicy`、`groupPolicy`、允许列表、提及门控）。
- **上下文可见性**：哪些补充上下文被注入到模型输入中（回复正文、引用文本、对话历史、转发元数据）。

允许列表对触发器和命令授权进行门控。`contextVisibility` 设置控制如何过滤补充上下文（引用回复、对话根节点、获取的历史记录）：

- `contextVisibility: "all"`（默认）保留接收到的补充上下文。
- `contextVisibility: "allowlist"` 将补充上下文过滤为仅包含活动允许列表检查所允许的发件人。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍保留一条显式的引用回复。

针对每个渠道或每个房间/对话设置 `contextVisibility`。有关设置详细信息，请参阅 [群组聊天](/zh/channels/groups#context-visibility-and-allowlists)。

建议性分类指导：

- 仅显示“模型可以看到来自非允许列表发件人的引用或历史文本”的声明是可以通过 `contextVisibility` 解决的加固发现，其本身并非身份验证或沙盒边界绕过。
- 要产生影响安全，报告仍需要证明存在信任边界绕过（身份验证、策略、沙盒、批准或其他记录在案的边界）。

## 审计检查内容（高层级）

- **入站访问**（私信策略、群组策略、允许列表）：陌生人可以触发机器人吗？
- **工具爆炸半径**（提升的工具 + 开放房间）：提示注入是否会转变为 shell/文件/网络操作？
- **Exec 文件系统漂移**：当 `exec`/`process` 在没有沙盒文件系统约束的情况下仍然可用时，是否拒绝了可变文件系统工具？
- **Exec 审批漂移**（`security=full`、`autoAllowSkills`、没有 `strictInlineEval` 的解释器允许列表）：主机执行防护措施是否仍在按您的预期工作？
  - `security="full"` 是一个广泛的姿态警告，并非证明存在漏洞。它是受信任的个人助理设置的首选默认值；仅当你的威胁模型需要审批或允许名单防护栏时才收紧它。
- **网络暴露** (Gateway(网关) 绑定/身份验证、Tailscale Serve/Funnel、弱/短身份验证令牌)。
- **浏览器控制暴露** (远程节点、中继端口、远程 CDP 端点)。
- **本地磁盘卫生** (权限、符号链接、配置包含、“同步文件夹”路径)。
- **插件** (插件在没有明确允许名单的情况下加载)。
- **策略漂移/配置错误** (配置了沙箱 docker 设置但沙箱模式关闭；无效的 `gateway.nodes.denyCommands` 模式，因为匹配仅限精确命令名称 (例如 `system.run`) 并且不检查 shell 文本；危险的 `gateway.nodes.allowCommands` 条目；全局 `tools.profile="minimal"` 被每个代理的配置文件覆盖；在宽松的工具策略下可访问插件拥有的工具)。
- **运行时期望漂移** (例如，假设隐式 exec 仍然意味着 `sandbox`，而 `tools.exec.host` 现在默认为 `auto`，或者在沙箱模式关闭时显式设置 `tools.exec.host="sandbox"`)。
- **模型卫生** (当配置的模型看起来是旧版本时发出警告；不是硬性阻止)。

如果你运行 `--deep`，OpenClaw 也会尝试尽力而为的实时 Gateway(网关) 探测。

## 凭据存储映射

在审计访问或决定要备份的内容时使用此映射：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile` (仅限常规文件；拒绝符号链接)
- **Discord bot token**：config/env 或 SecretRef (env/file/exec 提供程序)
- **Slack tokens**：config/env (`channels.slack.*`)
- **配对允许名单**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (默认账户)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非默认账户)
- **模型身份验证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Codex 运行时状态**：`~/.openclaw/agents/<agentId>/agent/codex-home/`
- **文件支持的密钥载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`

## 安全审计检查清单

当审计输出发现结果时，请按以下优先级顺序处理：

1. **任何“开放”+ 启用了工具**：首先锁定 Telegram/群组（配对/允许列表），然后收紧工具策略/Discord。
2. **公开网络暴露**（LAN 绑定、Funnel、缺少身份验证）：立即修复。
3. **浏览器控制远程暴露**：将其视为操作员访问（仅限 tailnet、有意配对节点、避免公开暴露）。
4. **权限**：确保状态/配置/凭据/身份验证对组/全局用户不可读。
5. **插件**：仅加载您明确信任的内容。
6. **模型选择**：对于任何带有工具的机器人，首选经过指令强化的现代模型。

## 安全审计术语表

每个审计发现都由结构化的 `checkId` 键控（例如
`gateway.bind_no_auth` 或 `tools.exec.security_full_configured`）。常见的
关键严重性类别：

- `fs.*` - 状态、配置、凭据和身份验证配置文件的文件系统权限。
- `gateway.*` - 绑定模式、身份验证、Tailscale、控制 UI、受信任代理设置。
- `hooks.*`、`browser.*`、`sandbox.*`、`tools.exec.*` - 针对每个表面的强化。
- `plugins.*`、`skills.*` - 插件/技能供应链和扫描发现。
- `security.exposure.*` - 跨领域检查，涉及访问策略与工具破坏半径的交汇点。

请参阅 [安全审计检查](/zh/gateway/security/audit-checks) 以获取包含严重性级别、修复密钥和自动修复支持的完整目录。

## 通过 HTTP 使用控制 UI

控制 UI 需要**安全上下文**（HTTPS 或 localhost）来生成设备
标识。`gateway.controlUi.allowInsecureAuth` 是一个本地兼容性切换开关：

- 在 localhost 上，当页面通过非安全的 HTTP 加载时，它允许在没有设备标识的情况下进行控制 UI 身份验证。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备标识的要求。

首选 HTTPS (Tailscale Serve) 或在 `127.0.0.1` 上打开 UI。

仅限紧急情况，`gateway.controlUi.dangerouslyDisableDeviceAuth`
会完全禁用设备身份检查。这是一个严重的安全降级；
请保持关闭，除非您正在积极调试且能快速回退。

与那些危险的标志分开来看，成功的 `gateway.auth.mode: "trusted-proxy"`
可以在没有设备身份的情况下允许 **operator**（操作员）控制 UI 会话。这是
一种有意的身份验证模式行为，而不是 `allowInsecureAuth` 的快捷方式，且它仍然
不适用于节点角色的控制 UI 会话。

`openclaw security audit` 会在启用此设置时发出警告。

## 不安全或危险的标志摘要

当启用已知的不安全/危险调试开关时，`openclaw security audit` 会引发 `config.insecure_or_dangerous_flags`。请确保在生产环境中不要设置这些开关。每个启用的标志都会作为单独的发现进行报告。如果配置了审计抑制，即使匹配的发现移至 `suppressedFindings`，`security.audit.suppressions.active` 仍将保留在活动审计输出中。

<AccordionGroup>
  <Accordion title="当前审计跟踪的标志">
    - `gateway.controlUi.allowInsecureAuth=true`
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`
    - `security.audit.suppressions configured (<count>)`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`

  </Accordion>

  <Accordion title="All `dangerous*` / `dangerously*` keys in the config schema">
    Control UI and browser:

    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    Channel name-matching (bundled and plugin channels; also available per
    `accounts.<accountId>` where applicable):

    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.synology-chat.dangerouslyAllowNameMatching` (plugin 渠道)
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath` (plugin 渠道)
    - `channels.zalouser.dangerouslyAllowNameMatching` (plugin 渠道)
    - `channels.irc.dangerouslyAllowNameMatching` (plugin 渠道)
    - `channels.mattermost.dangerouslyAllowNameMatching` (plugin 渠道)

    Network exposure:

    - `channels.telegram.network.dangerouslyAllowPrivateNetwork` (also per account)

    沙箱 Docker (defaults + per-agent):

    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>

## 反向代理配置

If you run the Gateway(网关) behind a reverse proxy (nginx, Caddy, Traefik, etc.), configure
`gateway.trustedProxies` for proper forwarded-client IP handling.

When the Gateway(网关) detects proxy headers from an address that is **not** in `trustedProxies`, it will **not** treat connections as local clients. If gateway auth is disabled, those connections are rejected. This prevents authentication bypass where proxied connections would otherwise appear to come from localhost and receive automatic trust.

`gateway.trustedProxies` also feeds `gateway.auth.mode: "trusted-proxy"`, but that auth mode is stricter:

- trusted-proxy auth **默认对回环源代理实施故障关闭**
- same-host loopback reverse proxies can use `gateway.trustedProxies` for local-client detection and forwarded IP handling
- same-host loopback reverse proxies can satisfy `gateway.auth.mode: "trusted-proxy"` only when `gateway.auth.trustedProxy.allowLoopback = true`; otherwise use token/password auth

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

当配置了 `trustedProxies`Gateway(网关) 时，Gateway(网关) 使用 `X-Forwarded-For` 来确定客户端 IP。默认情况下会忽略 `X-Real-IP`，除非显式设置了 `gateway.allowRealIpFallback: true`。

受信任的代理标头不会使节点设备配对自动受信任。
`gateway.nodes.pairing.autoApproveCidrs` 是一项单独的、默认禁用的
操作员策略。即使在启用时，回环源受信任代理标头路径
也会被排除在节点自动批准之外，因为本地调用方可以伪造那些
标头，包括在显式启用回环受信任代理身份验证时。

良好的反向代理行为（覆盖传入的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
```

不良的反向代理行为（附加/保留不受信任的转发标头）：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## HSTS 和源说明

- OpenClaw gateway 首先考虑本地/环回。如果您在反向代理处终止 TLS，请在面向代理的 HTTPS 域上设置 HSTS。
- 如果网关本身终止 HTTPS，您可以设置 `gateway.http.securityHeaders.strictTransportSecurity`OpenClaw 以从 OpenClaw 响应中发出 HSTS 标头。
- 详细的部署指南请参见 [受信任代理身份验证](/zh/gateway/trusted-proxy-auth#tls-termination-and-hsts)。
- 对于非回环控制 UI 部署，默认情况下需要 `gateway.controlUi.allowedOrigins`。
- `gateway.controlUi.allowedOrigins: ["*"]` 是一项显式允许所有浏览器源的策略，而不是加固的默认设置。避免在严格控制的本地测试之外使用它。
- 即使在启用
  一般回环豁免时，回环上的浏览器源身份验证失败仍然会受到速率限制，但锁定密钥的作用域是
  标准化的 `Origin` 值，而不是一个共享的 localhost 存储桶。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 标头源回退模式；将其视为操作员选择的一项危险策略。
- 将 DNS 重绑定和代理主机标头行为视为部署加固问题；保持 `trustedProxies` 严格，并避免将网关直接暴露给公共互联网。

## 本地会话日志存储在磁盘上

OpenClaw 将会话记录存储在磁盘上的 OpenClaw`~/.openclaw/agents/<agentId>/sessions/*.jsonl` 下。
这是会话连续性和（可选）会话内存索引所必需的，但这也意味着
**任何拥有文件系统访问权限的进程/用户都可以读取这些日志**。将磁盘访问视为信任
边界，并锁定 `~/.openclaw` 的权限（请参阅下面的审计部分）。如果您需要
代理之间更强的隔离，请在单独的操作系统用户或单独的主机下运行它们。

## 节点执行 (system.run)

如果配对了一个 macOS 节点，Gateway 可以在该节点上调用 macOSGateway(网关)`system.run`。这是在 Mac 上的 **远程代码执行**：

- 需要节点配对（批准 + 令牌）。
- Gateway(网关) 节点配对不是针对每条命令的批准界面。它用于建立节点身份/信任和令牌颁发。
- Gateway 通过 Gateway(网关)`gateway.nodes.allowCommands` / `denyCommands` 应用粗粒度的全局节点命令策略。
- 在 Mac 上通过 **Settings → Exec approvals**（安全 + 询问 + 允许列表）进行控制。
- 每个节点的 `system.run` 策略是节点自己的执行批准文件 (`exec.approvals.node.*`)，它可以比 Gateway 的全局命令 ID 策略更严格或更宽松。
- 以 `security="full"` 和 `ask="off"` 运行的节点遵循默认的受信任操作员模型。除非您的部署明确要求更严格的批准或允许列表立场，否则请将其视为预期行为。
- 批准模式绑定确切的请求上下文，并在可能的情况下绑定一个具体的本地脚本/文件操作数。如果 OpenClaw 无法为解释器/运行时命令确切识别出一个直接的本地文件，将拒绝基于批准的执行，而不是承诺完整的语义覆盖。
- 对于 `host=node`，基于批准的运行还会存储规范化的准备 `systemRunPlan`；后续批准的转发会重用该存储的计划，并且 Gateway 验证会拒绝在创建批准请求后调用者对命令/cwd/会话上下文的编辑。
- 如果您不希望远程执行，请将 security 设置为 **deny** 并移除该 Mac 的节点配对。

这种区分对于排查问题很重要：

- 如果 Gateway(网关) 全局策略和节点的本地执行批准仍然强制执行实际的执行边界，那么重新连接的已配对节点通告不同的命令列表本身并不是漏洞。
- 那些将节点配对元数据视为第二个隐藏的每命令批准层的报告，通常是策略/用户体验方面的混淆，而不是安全边界绕过。

## 动态 Skills（监视器 / 远程节点）

OpenClaw 可以在会话中途刷新 Skills 列表：

- **Skills 监视器**：对 `SKILL.md` 的更改可以在下一次代理轮次更新 Skills 快照。
- **远程节点**：连接 macOS 节点可以使仅限 macOS 的 Skills 符合条件（基于 bin 探测）。

将 Skills 文件夹视为 **受信任代码**，并限制谁可以修改它们。

## 威胁模型

您的 AI 助手可以：

- 执行任意 Shell 命令
- 读/写文件
- 访问网络服务
- 向任何人发送消息（如果您授予它 WhatsApp 访问权限）

给您发消息的人可以：

- 试图诱骗您的 AI 做坏事
- 通过社会工程学访问您的数据
- 探测基础设施详细信息

## 核心概念：智能之前的访问控制

这里的失败大多不是复杂的漏洞利用——它们是“有人给机器人发了消息，机器人照做了”。

OpenClaw 的立场：

- **身份优先**：决定谁可以与机器人交谈（私信配对 / 允许列表 / 显式“开放”）。
- **范围其次**：决定允许机器人在哪里行动（群组允许列表 + 提及门控、工具、沙箱隔离、设备权限）。
- **模型最后**：假设模型可以被操纵；进行设计以使操纵的影响范围有限。

## 命令授权模型

斜杠命令和指令仅对 **授权发送者** 有效。授权源自渠道允许列表/配对以及 `commands.useAccessGroups`（请参阅[配置](/zh/gateway/configuration)和[斜杠命令](/zh/tools/slash-commands)）。如果渠道允许列表为空或包含 `"*"`，则该渠道的命令实际上是开放的。

`/exec` 是授权操作员的仅会话便利功能。它 **不会** 写入配置或更改其他会话。

## 控制平面工具风险

有两个内置工具可以进行持久的控制平面更改：

- `gateway` 可以使用 `config.schema.lookup` / `config.get` 检查配置，并可以使用 `config.apply`、`config.patch` 和 `update.run` 进行持久性更改。
- `cron` 可以创建计划作业，这些作业在原始聊天/任务结束后继续运行。

仅限所有者的 `gateway` 运行时工具仍然拒绝重写
`tools.exec.ask` 或 `tools.exec.security`；旧的 `tools.bash.*` 别名在
写入前会被规范化为相同的受保护执行路径。
由代理驱动的 `gateway config.apply` 和 `gateway config.patch` 编辑默认
采取“故障关闭”策略：只有一小部分提示词、模型和提及拦截
路径是代理可调优的。因此，除非被故意添加到允许列表中，
否则新的敏感配置树将受到保护。

对于任何处理不受信任内容的代理/表面，默认拒绝以下操作：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 仅阻止重启操作。它不会禁用 `gateway` 配置/更新操作。

## 插件

插件与 Gateway(网关) **在同一进程**中运行。请将它们视为受信任的代码：

- 仅从您信任的来源安装插件。
- 首选显式的 `plugins.allow` 允许列表。
- 在启用之前检查插件配置。
- 在插件更改后重启 Gateway(网关)。
- 如果您安装或更新插件（`openclaw plugins install <package>`，`openclaw plugins update <id>`），请将其视为运行不受信任的代码：
  - 安装路径是活动插件安装根目录下的各个插件目录。
  - OpenClaw 在安装/更新之前会运行内置的危险代码扫描。默认情况下，OpenClaw`critical` 发现会阻止操作。
  - npm 和 git 插件安装仅在显式安装/更新流程期间运行包管理器依赖项收敛。本地路径和归档文件被视为独立的插件包；OpenClaw 在不运行 npmOpenClaw`npm install` 的情况下复制/引用它们。
  - 首选固定的精确版本（`@scope/pkg@1.2.3`），并在启用之前检查磁盘上解压的代码。
  - `--dangerously-force-unsafe-install` 仅针对插件安装/更新流程中内置扫描的误报情况作为应急手段使用。它不能绕过插件 `before_install` 钩子策略阻止，也不能绕过扫描失败。
  - Gateway 支持的技能依赖项安装遵循相同的危险/可疑划分：内置 Gateway(网关)`critical` 发现会阻止操作，除非调用方显式设置了 `dangerouslyForceUnsafeInstall`，而可疑发现仍然仅发出警告。`openclaw skills install`ClawHub 仍然是单独的 ClawHub 技能下载/安装流程。

详情：[Plugins](/zh/tools/plugin)

## 私信访问模型：配对、允许列表、开放、已禁用

所有当前支持私信的渠道都支持私信策略（`dmPolicy` 或 `*.dm.policy`），该策略会在处理消息**之前**拦截传入的私信：

- `pairing`（默认）：未知发送者会收到一个简短的配对码，机器人在获得批准之前会忽略他们的消息。配对码在 1 小时后过期；在创建新请求之前，重复的私信不会重新发送配对码。默认情况下，待处理的请求限制为每个渠道 **3 个**。
- `allowlist`：阻止未知发送者（无配对握手）。
- `open`：允许任何人发送私信（公开）。**要求**渠道允许列表包含 `"*"`（明确选择加入）。
- `disabled`：完全忽略传入的私信。

通过 CLI 批准：

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

详情 + 磁盘文件：[配对](/zh/channels/pairing)

## 私信会话隔离（多用户模式）

默认情况下，OpenClaw 将**所有私信路由到主会话**，以便您的助手在不同设备和渠道之间保持连续性。如果**多个人**可以向机器人发送私信（开放私信或多人允许列表），请考虑隔离私信会话：

```json5
{
  session: { dmScope: "per-channel-peer" },
}
```

这可以防止跨用户上下文泄漏，同时保持群聊隔离。

这是一个消息上下文边界，而不是主机管理员边界。如果用户相互对立并且共享同一个 Gateway(网关) 主机/配置，请改为为每个信任边界运行单独的网关。

### 安全私信模式（推荐）

将上面的代码片段视为**安全私信模式**：

- 默认：`session.dmScope: "main"`（所有私信共享一个会话以保持连续性）。
- 本地 CLI 新手引导默认值：未设置时写入 CLI`session.dmScope: "per-channel-peer"`（保留现有的显式值）。
- 安全私信模式：`session.dmScope: "per-channel-peer"`（每个渠道+发送者对获得一个独立的私信上下文）。
- 跨渠道对等隔离：`session.dmScope: "per-peer"`（每个发送者在所有相同类型的渠道中共享一个会话）。

如果您在同一渠道上运行多个帐户，请改用 `per-account-channel-peer`。如果同一个人通过多个渠道联系您，请使用 `session.identityLinks` 将这些私信会话合并为一个规范身份。请参阅[会话管理](/zh/concepts/session)和[配置](/zh/gateway/configuration)。

## 私信和群的允许列表

OpenClaw 有两个独立的“谁可以触发我？”层：

- **私信允许列表**（`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；旧版：`channels.discord.dm.allowFrom`, `channels.slack.dm.allowFrom`）：谁被允许通过私信与机器人交谈。
  - 当设置为 `dmPolicy="pairing"` 时，批准内容会写入帐户范围的配对允许列表存储中的 `~/.openclaw/credentials/`（默认帐户为 `<channel>-allowFrom.json`，非默认帐户为 `<channel>-<accountId>-allowFrom.json`），并与配置允许列表合并。
- **组允许列表**（特定于渠道）：机器人将完全接受来自哪些群组/频道/公会的消息。
  - 常见模式：
    - `channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`：每组的默认值，例如 `requireMention`；设置后，它还充当组白名单（包含 `"*"` 以保持允许所有行为）。
    - `groupPolicy="allowlist"` + `groupAllowFrom`：限制谁可以触发组会话 _内部_ 的机器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
    - `channels.discord.guilds` / `channels.slack.channels`：每个表面的白名单 + 提及默认值。
  - 组检查按此顺序运行：首先是 `groupPolicy`/组白名单，其次是提及/回复激活。
  - 回复机器人消息（隐式提及）**不会**绕过像 `groupAllowFrom` 这样的发送者白名单。
  - **安全说明：** 将 `dmPolicy="open"` 和 `groupPolicy="open"` 视为最后手段的设置。它们应该极少使用；除非你完全信任房间的每个成员，否则首选配对 + 白名单。

详情：[配置](/zh/gateway/configuration) 和 [组](/zh/channels/groups)

## 提示注入（它是什么，为什么重要）

提示注入是指攻击者精心设计一条消息，操纵模型执行不安全的操作（“忽略你的指令”、“转储你的文件系统”、“点击此链接并运行命令”等）。

即使有强大的系统提示词，**提示注入问题仍未解决**。系统提示词护栏只是软性指导；硬性执行来自工具策略、执行批准、沙箱隔离和渠道允许列表（并且操作员可以设计禁用这些功能）。在实践中有效的措施包括：

- 保持入站私信锁定（配对/允许列表）。
- 在群组中首选提及限制；避免在公共房间中使用“始终开启”的机器人。
- 默认将链接、附件和粘贴的指令视为敌对内容。
- 在沙箱隔离中运行敏感工具执行；将密钥保持在代理可访问的文件系统之外。
- 注意：沙箱隔离是可选的。如果关闭沙箱模式，隐式 `host=auto` 将解析为网关主机。显式 `host=sandbox` 仍将失败关闭，因为没有可用的沙箱运行时。如果你希望该行为在配置中显式，请设置 `host=gateway`。
- 将高风险工具（`exec`、`browser`、`web_fetch`、`web_search`）限制为受信任的代理或显式白名单。
- 如果你将解释器（`python`、`node`、`ruby`、`perl`、`php`、`lua`、`osascript`）加入白名单，请启用 `tools.exec.strictInlineEval`，以便内联 eval 表单仍然需要显式批准。
- Shell 批准分析也会拒绝 **未加引号的 heredocs** 内部的 POSIX 参数扩展形式（`$VAR`、`$?`、`$$`、`$1`、`$@`、`${…}`），因此白名单中的 heredoc 主体无法作为纯文本绕过白名单审查进行 shell 扩展。对 heredoc 结束符加引号（例如 `<<'EOF'`）以选择字面主体语义；会扩展变量的未加引号 heredoc 将被拒绝。
- **模型选择很重要：** 较旧/较小/遗留模型对提示注入和工具滥用的鲁棒性明显较低。对于启用工具的代理，请使用可用的最强最新一代、经过指令强化的模型。

视为不可信的危险信号：

- “阅读此文件/URL 并完全按照它说的做。”
- “忽略您的系统提示或安全规则。”
- “揭示您的隐藏指令或工具输出。”
- “粘贴 ~/.openclaw 或日志的全部内容。”

## 外部内容特殊令牌清理

OpenClaw 会从包装的外部内容和元数据中剥离常见的自托管 LLM 聊天模板特殊令牌字面量，然后再将其传递给模型。覆盖的标记系列包括 Qwen/ChatML、Llama、Gemma、Mistral、Phi 和 GPT-OSS 角色/轮次令牌。

原因：

- 前置自托管模型的 OpenAI 兼容后端有时会保留用户文本中出现的特殊令牌，而不是将其屏蔽。否则，能够写入入站外部内容（获取的页面、电子邮件正文、文件内容工具输出）的攻击者可能会注入合成的 OpenAI`assistant` 或 `system` 角色边界，并绕过包裹内容的防护栏。
- 清理发生在外部内容包装层，因此它统一应用于获取/读取 Microsoft Teams 和传入 OpenClaw 内容，而不是针对每个提供商。
- 出站模型响应已经有一个单独的清理程序，用于在最终渠道交付边界从用户可见的回复中剥离泄露的 `<tool_call>`、`<function_calls>`、`<system-reminder>`、`<previous_response>` 以及类似的内部运行时脚手架。外部内容清理程序是其入站对应部分。

这不能取代本页上的其他加固措施——`dmPolicy`、白名单、执行批准、沙箱隔离和 `contextVisibility` 仍然执行主要工作。它针对的是转发带有完整特殊令牌的用户文本的自托管堆栈，以此关闭了一个特定的分词器层绕过漏洞。

## 不安全的外部内容绕过标志

OpenClaw 包含明确的绕过标志，用于禁用外部内容安全包装：

- `hooks.mappings[].allowUnsafeExternalContent`
- `hooks.gmail.allowUnsafeExternalContent`
- Cron 载荷字段 `allowUnsafeExternalContent`

指导原则：

- 在生产环境中保持这些标志为未设置/false。
- 仅在进行严格限定的调试时临时启用。
- 如果启用，请隔离该代理（沙箱 + 最少 Microsoft Teams + 专用 CLI 命名空间）。

Hooks 风险说明：

- Hook 负载是不可信内容，即使投递来自你控制的系统（邮件/文档/Web 内容都可能携带提示词注入）。
- 较弱的模型层级会增加此风险。对于由钩子驱动的自动化，首选强大的现代模型层级并保持严格的工具策略（`tools.profile: "messaging"` 或更严格），并在可能的情况下进行沙箱隔离。

### 提示词注入并不需要公开的私信

即使**只有你**可以向机器人发送消息，提示词注入仍可能通过机器人读取的任何**不可信内容**发生（Web 搜索/获取结果、浏览器页面、电子邮件、文档、附件、粘贴的日志/代码）。换句话说：发送者并非唯一的威胁面；**内容本身**也可能携带对抗性指令。

当启用工具时，典型风险是泄露上下文或触发工具调用。通过以下方式减少爆炸半径：

- 使用只读或禁用工具的**阅读代理**来总结不可信内容，然后将总结传递给你的主代理。
- 对于启用了工具的代理，除非需要，否则保持 `web_search` / `web_fetch` / `browser` 关闭。
- 对于 OpenResponses URL 输入（OpenResponses`input_file` / `input_image`），请设置严格的
  `gateway.http.endpoints.responses.files.urlAllowlist` 和
  `gateway.http.endpoints.responses.images.urlAllowlist`，并保持 `maxUrlParts` 较低。
  空白白名单被视为未设置；如果您想完全禁用 URL 获取，请使用 `files.allowUrl: false` / `images.allowUrl: false`。
- 对于 OpenResponses 文件输入，解码后的 OpenResponses`input_file`Gateway(网关) 文本仍作为
  **不受信任的外部内容** 注入。不要仅因为 Gateway(网关) 在本地解码了文件文本就认为其是可信的。注入的块仍然带有显式的
  `<<<EXTERNAL_UNTRUSTED_CONTENT ...>>>` 边界标记以及 `Source: External`
  元数据，尽管此路径省略了较长的 `SECURITY NOTICE:` 横幅。
- 当媒体理解从附加文档中提取文本并将该文本附加到媒体提示之前，会应用相同的基于标记的包装。
- 为任何接触不可信输入的代理启用沙箱隔离和严格的工具允许列表。
- 避免在提示词中包含机密信息；应通过网关主机上的环境变量或配置文件传递它们。

### 自托管 LLM 后端

OpenAI 兼容的自托管后端（如 vLLM、SGLang、TGI、LM Studio
或自定义 Hugging Face 分词器堆栈）在处理聊天模板特殊 token 的方式上可能与托管提供商有所不同。如果后端将字面量字符串
（如 OpenAI`<|im_start|>`、`<|start_header_id|>` 或 `<start_of_turn>`）作为用户内容内的结构性聊天模板 token 进行分词，不受信任的文本可能会尝试在分词器层伪造角色边界。

OpenClaw 会在将包装后的外部内容分发给模型之前，从中剔除常见的模型系列特殊令牌字面量。请保持外部内容包装处于启用状态，并在可用时优先选择能够拆分或转义用户提供内容中的特殊令牌的后端设置。诸如 OpenAI 和 Anthropic 之类的托管提供商已经应用了自己的请求端清理。

### 模型强度（安全说明）

针对提示词注入的抵抗力在不同模型层级之间并**不**一致。较小/较便宜的模型通常更容易受到工具滥用和指令劫持，特别是在对抗性提示词下。

<Warning>对于启用了工具的代理或读取不受信任内容的代理，使用旧版/较小模型时的提示词注入风险通常太高。不要在较弱的模型层级上运行这些工作负载。</Warning>

建议：

- **对于任何可以运行工具或访问文件/网络的机器人，请使用最新一代、最高层级的模型**。
- **对于启用了工具的代理或不受信任的收件箱，不要使用旧版/较弱/较小的层级**；提示词注入风险太高。
- 如果您必须使用较小的模型，请**减少爆炸半径**（只读工具、强沙箱隔离、最小的文件系统访问权限、严格的允许列表）。
- 运行小模型时，**请为所有会话启用沙箱隔离**，并且**除非输入受到严格控制，否则禁用 web_search/web_fetch/browser**。
- 对于具有受信任输入且没有工具的仅聊天个人助手，使用较小的模型通常是可以的。

## 群组中的推理和详细输出

`/reasoning`、`/verbose` 和 `/trace` 可能会暴露不适合公开渠道的内部推理、工具
输出或插件诊断信息。在群组设置中，请将其视为**仅限调试**
使用，除非明确需要，否则保持关闭状态。

指导原则：

- 在公共房间中，请保持 `/reasoning`、`/verbose` 和 `/trace` 处于禁用状态。
- 如果启用它们，请仅在受信任的私信或严格控制的房间中进行。
- 请记住：详细输出和跟踪输出可能包含工具参数、URL、插件诊断信息以及模型看到的数据。

## 配置加固示例

### 文件权限

在 Gateway 主机上保持配置和状态的私密性：

- `~/.openclaw/openclaw.json`： `600`（仅用户读/写）
- `~/.openclaw`： `700`（仅用户）

`openclaw doctor` 可以发出警告并提供收紧这些权限的选项。

### 网络暴露（绑定、端口、防火墙）

Gateway(网关) 在单个端口上多路复用 **WebSocket + HTTP**：

- 默认值： `18789`
- Config/flags/env： `gateway.port`、 `--port`、 `OPENCLAW_GATEWAY_PORT`

此 HTTP 接口包括控制 UI 和 Canvas 主机：

- 控制 UI (SPA 资产) (默认基础路径 `/`)
- Canvas 主机：`/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/` (任意 HTML/JS；将其视为不受信任的内容)

如果您在普通浏览器中加载 Canvas 内容，请像对待任何其他不受信任的网页一样对待它：

- 不要将 Canvas 主机暴露给不受信任的网络/用户。
- 除非您完全了解其影响，否则不要让 Canvas 内容与特权 Web 表面共享同一源。

绑定模式控制 Gateway(网关) 的监听位置：

- `gateway.bind: "loopback"` (默认)：仅本地客户端可以连接。
- 非环回绑定 (`"lan"`、`"tailnet"`、`"custom"`) 会扩大攻击面。仅在配置了 Gateway 身份验证 (共享令牌/密码或正确配置的受信任代理) 和真正的防火墙时才使用它们。

经验法则：

- 首选 Tailscale Serve 而非 LAN 绑定（Serve 将 Gateway(网关) 保留在环回地址上，并由 Tailscale 处理访问）。
- 如果必须绑定到 LAN，请将该端口的防火墙设置为仅允许源 IP 的严格白名单；不要广泛地进行端口转发。
- 切勿在 `0.0.0.0` 上未经验证地暴露 Gateway(网关)。

### 结合 UFW 的 Docker 端口发布

如果您在 VPS 上使用 OpenClaw 运行 Docker，请记住已发布的容器端口
(`-p HOST:CONTAINER` 或 Compose `ports:`) 是通过 Docker 的转发
链路由的，而不仅仅是主机 `INPUT` 规则。

为了使 Docker 流量与您的防火墙策略保持一致，请在
`DOCKER-USER` 中强制执行规则 (此链在 Docker 自己的接受规则之前被评估)。
在许多现代发行版中，`iptables`/`ip6tables` 使用 `iptables-nft` 前端
并且仍然将这些规则应用于 nftables 后端。

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

IPv6 拥有独立的表。如果启用了 Docker IPv6，请在 `/etc/ufw/after6.rules` 中添加匹配的策略。

避免在文档片段中硬编码接口名称，如 `eth0`。接口名称
因 VPS 镜像而异 (`ens3`、`enp*` 等)，不匹配可能会意外
跳过您的拒绝规则。

重新加载后的快速验证：

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

预期的外部端口应仅限于您有意暴露的端口（对于大多数设置：SSH + 您的反向代理端口）。

### mDNS/Bonjour 发现

当启用捆绑的 `bonjour` 插件时，Gateway(网关) 会通过 mDNS (端口 5353 上的 `_openclaw-gw._tcp`) 广播其存在，以便进行本地设备发现。在完整模式下，这包括可能暴露操作细节的 TXT 记录：

- `cliPath`CLI：CLI 二进制文件的完整文件系统路径 (揭示用户名和安装位置)
- `sshPort`: 在主机上通告 SSH 可用性
- `displayName`, `lanHost`: 主机名信息

**操作安全考量：** 广播基础设施详情会让本地网络上的任何人更容易进行侦察。即使是像文件系统路径和 SSH 可用性这样的“无害”信息，也能帮助攻击者绘制你的环境图。

**建议：**

1. **保持 Bonjour 禁用状态，除非需要局域网发现。** Bonjour 在 macOS 主机上自动启动，在其他地方是可选加入；直接使用 Gateway(网关) URL、Tailnet、SSH 或广域 DNS-SD 可以避免本地多播。

2. **最小模式**（启用 Bonjour 时的默认模式，推荐用于暴露的网关）：从 mDNS 广播中省略敏感字段：

   ```json5
   {
     discovery: {
       mdns: { mode: "minimal" },
     },
   }
   ```

3. **禁用 mDNS 模式**，如果你想保持插件启用但抑制本地设备发现：

   ```json5
   {
     discovery: {
       mdns: { mode: "off" },
     },
   }
   ```

4. **完整模式**（可选）：在 TXT 记录中包含 `cliPath` + `sshPort`：

   ```json5
   {
     discovery: {
       mdns: { mode: "full" },
     },
   }
   ```

5. **环境变量**（替代方案）：设置 `OPENCLAW_DISABLE_BONJOUR=1` 以在不更改配置的情况下禁用 mDNS。

当 Bonjour 在最小模式下启用时，Gateway(网关) 会广播足够的信息用于设备发现（`role`、`gatewayPort`、`transport`），但会省略 `cliPath` 和 `sshPort`。需要 CLI 路径信息的应用可以通过经过身份验证的 WebSocket 连接来获取它。

### 锁定 Gateway(网关) WebSocket（本地身份验证）

Gateway(网关) 身份验证**默认是必需的**。如果没有配置有效的网关身份验证路径，Gateway(网关) 将拒绝 WebSocket 连接（故障关闭）。

新手引导默认会生成一个令牌（即使是用于 loopback），因此本地客户端必须进行身份验证。

设置一个令牌，以便**所有** WS 客户端都必须进行身份验证：

```json5
{
  gateway: {
    auth: { mode: "token", token: "your-token" },
  },
}
```

Doctor 可以为您生成一个：`openclaw doctor --generate-gateway-token`。

<Note>`gateway.remote.token` 和 `gateway.remote.password` 是客户端凭据来源。它们**不**单独保护本地 WS 访问。本地调用路径仅在 `gateway.auth.*` 未设置时才能将 `gateway.remote.*` 作为回退。如果 `gateway.auth.token` 或 `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析将以失败告终（无远程回退掩盖）。</Note>
可选：在使用 `wss://` 时，使用 `gateway.remote.tlsFingerprint` 固定远程 TLS。 回环、私有 IP 字面量、`.local` 和 Tailnet `*.ts.net` Gateway URL 接受明文 `ws://`。对于其他受信任的私有 DNS 名称，请 在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为应急手段。 这特意仅限于进程环境，而不是 `openclaw.json` 配置 键。 移动配对和 Android 手动或扫描的 Gateway 路由更严格： 回环接受明文，但私有
LAN、链路本地、`.local` 和 无点主机名必须使用 TLS，除非您明确选择加入受信任的 私有网络明文路径。

本地设备配对：

- 直接本地 loopback 连接的设备配对会自动批准，以保持同主机客户端的流畅。
- OpenClaw 还有一个狭窄的后端/容器本地自连接路径，用于受信任的共享密钥辅助流程。
- Tailnet 和 LAN 连接（包括同主机 tailnet 绑定）在配对时被视为远程连接，仍需要批准。
- 环回请求上的转发标头证据会使环回本地性失效。元数据升级自动批准的范围很窄。有关这两条规则，请参阅 [Gateway(网关) 配对](<Gateway(网关)/en/gateway/pairing>)。

身份验证模式：

- `gateway.auth.mode: "token"`：共享不记名令牌（推荐用于大多数设置）。
- `gateway.auth.mode: "password"`：密码认证（优先通过环境变量设置：`OPENCLAW_GATEWAY_PASSWORD`）。
- `gateway.auth.mode: "trusted-proxy"`：信任一个感知身份的反向代理来对用户进行身份验证并通过标头传递身份（请参阅[可信代理认证](/zh/gateway/trusted-proxy-auth)）。

轮换清单（令牌/密码）：

1. 生成/设置一个新的密钥（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_PASSWORD`）。
2. 重启 Gateway(网关)（或者如果 macOS 应用负责监管 Gateway(网关)，则重启该应用）。
3. 更新任何远程客户端（调用 Gateway(网关) 的计算机上的 `gateway.remote.token` / `.password`Gateway(网关)）。
4. 验证您无法再使用旧凭据进行连接。

### Tailscale Serve 身份标头

当 `gateway.auth.allowTailscale` 为 `true`OpenClawTailscale 时（Serve 的默认值），OpenClaw
接受 Tailscale Serve 身份标头（`tailscale-user-login`OpenClaw）用于控制
UI/WebSocket 身份验证。OpenClaw 通过本地 Tailscale 守护进程（`tailscale whois`）
解析 `x-forwarded-for`Tailscale 地址并将其与标头匹配来验证身份。这仅对命中环回
且包含由 Tailscale 注入的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`Tailscale 的请求触发。
对于此异步身份检查路径，限制器记录失败之前，针对同一 `{scope, ip}`API 的
失败尝试会被序列化。因此，来自一个 Serve 客户端的并发错误重试可以立即锁定第二次尝试，
而不是作为两次普通的不匹配而竞相通过。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`Tailscale）
**不**使用 Tailscale 身份标头认证。它们仍遵循 gateway(网关)
配置的 HTTP 认证模式。

重要边界说明：

- Gateway HTTP bearer auth 实际上是全有或全无的操作员访问权限。
- 将能够调用 `/v1/chat/completions`、`/v1/responses`、插件路由（如 `/api/v1/admin/rpc`）或 `/api/channels/*` 的凭据视为该 Gateway 的完全访问操作员机密。
- 在 OpenAI 兼容的 HTTP 表面上，共享密钥持有者认证会恢复完整的默认操作员范围（OpenAI`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）以及代理轮次的所有者语义；较窄的 `x-openclaw-scopes` 值不会限制该共享密钥路径。
- HTTP 上的每请求范围语义仅在请求来自具有身份的模式（如受信任的代理身份验证）或来自显式的无身份验证私有入口时适用。
- 在这些具有身份的模式中，省略 `x-openclaw-scopes` 将回退到正常的操作员默认范围集；当您需要更窄的范围集时，请显式发送该标头。
- `/tools/invoke` 遵循相同的共享密钥规则：令牌/密码持有者身份验证在此也被视为完全操作员访问，而具有身份的模式仍然遵守声明的范围。
- 请勿与不受信任的调用者共享这些凭据；最好为每个信任边界使用单独的 Gateway(网关)。

**信任假设：** 无令牌 Serve 身份验证假定 Gateway 主机是受信任的。
不要将其视为针对恶意同主机进程的保护措施。如果在 Gateway 主机上可能运行不受信任的
本地代码，请禁用 `gateway.auth.allowTailscale`
并使用 `gateway.auth.mode: "token"` 或
`"password"` 要求显式共享密钥身份验证。

**安全规则：** 不要从您自己的反向代理转发这些标头。如果您
在 Gateway 前端终止 TLS 或进行代理，请禁用
`gateway.auth.allowTailscale` 并改用共享密钥身份验证（`gateway.auth.mode:
"token"` or `"password"`）或 [受信任的代理身份验证](/zh/gateway/trusted-proxy-auth)。

可信代理：

- 如果您在 Gateway 前端终止 TLS，请将 Gateway(网关)`gateway.trustedProxies` 设置为您的代理 IP。
- OpenClaw 将信任来自这些 IP 的 OpenClaw`x-forwarded-for`（或 `x-real-ip`），以确定用于本地配对检查和 HTTP 认证/本地检查的客户端 IP。
- 确保您的代理**覆盖** `x-forwarded-for`Gateway(网关) 并阻止对 Gateway(网关) 端口的直接访问。

请参阅 [Tailscale](Tailscale/en/gateway/tailscale) 和 [Web 概述](/zh/web)。

### 通过节点主机进行浏览器控制（推荐）

如果您的 Gateway(网关) 是远程的，但浏览器在另一台机器上运行，请在浏览器机器上运行一个 **node host**，并让 Gateway(网关) 代理浏览器操作（请参阅 [Browser 工具](<Gateway(网关)Gateway(网关)/en/tools/browser>)）。将节点配对视为管理员访问权限。

推荐模式：

- 将 Gateway(网关) 和节点主机保持在同一个 tailnet (Tailscale) 中。
- 有意配对节点；如果不需要，请禁用浏览器代理路由。

避免：

- 通过局域网或公共互联网暴露中继/控制端口。
- 用于浏览器控制端点的 Tailscale Funnel（公开暴露）。

### 磁盘上的密钥

假设 `~/.openclaw/`（或 `$OPENCLAW_STATE_DIR/`）下的任何内容都可能包含机密或私人数据：

- `openclaw.json`：配置可能包括令牌（gateway、remote gateway）、提供商设置和允许列表。
- `credentials/**`WhatsAppOAuth：渠道凭证（例如：WhatsApp 凭证）、配对允许列表、旧版 OAuth 导入。
- `agents/<agentId>/agent/auth-profiles.json`APIOAuth：API 密钥、令牌配置文件、OAuth 令牌以及可选的 `keyRef`/`tokenRef`。
- `agents/<agentId>/agent/codex-home/**`：每个代理的 Codex 应用服务器帐户、配置、技能、插件、原生线程状态和诊断信息。
- `secrets.json`（可选）：由 `file` SecretRef 提供商使用的文件支持的秘密载荷（`secrets.providers`）。
- `agents/<agentId>/agent/auth.json`：旧版兼容性文件。发现时会清除静态 `api_key` 条目。
- `agents/<agentId>/sessions/**`：会话记录（`*.jsonl`）+ 路由元数据（`sessions.json`），其中可能包含私人消息和工具输出。
- 捆绑的插件包：已安装的插件（及其 `node_modules/`）。
- `sandboxes/**`：工具沙箱工作区；可能会积累您在沙箱内读/写的文件副本。

加固提示：

- 保持权限严格（目录使用 `700`，文件使用 `600`）。
- 在 Gateway 主机上使用全盘加密。
- 如果主机是共享的，建议为 Gateway(网关) 使用专用的操作系统用户账户。

### 工作区 `.env` 文件

OpenClaw 会为代理和工具加载工作区本地的 OpenClaw`.env` 文件，但绝不允许这些文件静默覆盖网关运行时控件。

- 任何以 `OPENCLAW_*` 开头的键都会被阻止来自不受信任的工作区 `.env` 文件。
- Matrix、Mattermost、IRC 和 Synology Chat 的通道端点设置也被阻止通过工作区 MatrixMattermost`.env` 进行覆盖，因此克隆的工作区无法通过本地端点配置重定向捆绑连接器流量。端点环境变量键（例如 `MATRIX_HOMESERVER`、`MATTERMOST_URL`、`IRC_HOST`、`SYNOLOGY_CHAT_INCOMING_URL`）必须来自网关进程环境或 `env.shellEnv`，而不能来自工作区加载的 `.env`。
- 此阻止是故障关闭的：在未来版本中添加的新运行时控制变量不能从已提交或攻击者提供的 `.env` 继承；该键将被忽略，网关将保留自己的值。
- 受信任的进程/操作系统环境变量（网关自己的 shell、launchd/systemd 单元、应用程序包）仍然适用——这仅限制 `.env` 文件加载。

原因：工作区 `.env` 文件通常位于代理代码旁边，可能会被意外提交，或被工具写入。阻止整个 `OPENCLAW_*` 前缀意味着稍后添加新的 `OPENCLAW_*` 标志绝不会退化为从工作区状态进行静默继承。

### 日志和脚本（编辑和保留）

即使访问控制正确，日志和脚本也可能泄露敏感信息：

- Gateway 日志可能包括工具摘要、错误和 URL。
- 会话记录可能包含粘贴的机密信息、文件内容、命令输出和链接。

建议：

- 保持日志和脚本编辑处于开启状态（`logging.redactSensitive: "tools"`；默认）。
- 通过 `logging.redactPatterns` 为您的环境添加自定义模式（令牌、主机名、内部 URL）。
- 在共享诊断信息时，首选 `openclaw status --all`（可粘贴，密钥已编辑）而非原始日志。
- 如果不需要长期保留，请清理旧的会话记录和日志文件。

详情：[Logging](/zh/gateway/logging)

### 私信：默认配对

```json5
{
  channels: { whatsapp: { dmPolicy: "pairing" } },
}
```

### 群组：在所有地方都需要提及

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

在群组聊天中，仅在被明确提及时才响应。

### 独立的号码（WhatsApp，Signal，Telegram）

对于基于电话号码的渠道，请考虑在独立于您个人号码的电话号码上运行您的 AI：

- 个人号码：您的对话保持私密
- 机器人号码：AI 处理这些对话，并受到适当的边界限制

### 只读模式（通过沙箱和工具）

您可以通过组合以下内容构建只读配置文件：

- `agents.defaults.sandbox.workspaceAccess: "ro"`（如果不允许工作区访问，则使用 `"none"`）
- 阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具允许/拒绝列表。

额外的加固选项：

- `tools.exec.applyPatch.workspaceOnly: true`（默认）：确保即使在关闭沙箱隔离的情况下，`apply_patch` 也无法在工作区目录之外进行写入/删除操作。仅当您有意希望 `apply_patch` 接触工作区之外的文件时，才将其设置为 `false`。
- `tools.fs.workspaceOnly: true`（可选）：将 `read`/`write`/`edit`/`apply_patch` 路径和原生提示图像自动加载路径限制在工作区目录内（如果您目前允许绝对路径并想要单一的安全防护，则很有用）。
- 保持文件系统根目录狭窄：避免为代理工作区/沙箱工作区设置像主目录这样宽泛的根目录。宽泛的根目录可能会将敏感的本地文件（例如 `~/.openclaw` 下的状态/配置）暴露给文件系统工具。

### 安全基线（复制/粘贴）

一个“安全默认”配置，它保持 Gateway(网关) 私有，需要私信配对，并避免始终在线的群组机器人：

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

如果您还希望“默认更安全”的工具执行，请为任何非所有者代理添加沙箱 + 拒绝危险工具（下面的“Per-agent access profiles”中的示例）。

聊天驱动代理轮次的内置基线：非所有者发送者无法使用 `cron` 或 `gateway` 工具。

## 沙箱隔离（推荐）

专用文档：[沙箱隔离](/zh/gateway/sandboxing)

两种互补的方法：

- **在 Docker 中运行完整的 Gateway**(容器边界)：[Docker](<Gateway(网关)DockerDocker/en/install/docker>)
- **工具沙箱**（`agents.defaults.sandbox`Docker，主机网关 + 沙箱隔离工具；Docker 是默认后端）：[沙箱隔离](/zh/gateway/sandboxing)

<Note>为了防止跨代理访问，请将 `agents.defaults.sandbox.scope` 设置为 `"agent"`（默认）或 `"session"`，以实现更严格的会话隔离。`scope: "shared"` 使用单个容器或工作区。</Note>

还要考虑沙箱内的代理工作区访问权限：

- `agents.defaults.sandbox.workspaceAccess: "none"`（默认）使代理工作区保持不可访问；工具针对 `~/.openclaw/sandboxes` 下的沙箱工作区运行
- `agents.defaults.sandbox.workspaceAccess: "ro"` 以只读方式在 `/agent` 挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）
- `agents.defaults.sandbox.workspaceAccess: "rw"` 以读/写方式在 `/workspace` 挂载代理工作区
- 额外的 `sandbox.docker.binds` 将根据规范化和规范化的源路径进行验证。如果父级符号链接技巧和规范主目录别名解析到被阻止的根目录（如 `/etc`、`/var/run` 或 OS 主目录下的凭据目录），它们仍然会失败关闭。

<Warning>`tools.elevated` 是在沙箱外部运行 exec 的全局基准逃生舱。默认情况下，有效主机是 `gateway`，或者当 exec 目标配置为 `node` 时为 `node`。请严格控制 `tools.elevated.allowFrom`，不要为陌生人启用它。您可以通过 `agents.list[].tools.elevated` 进一步限制每个代理的提权。请参阅[提权模式](/zh/tools/elevated)。</Warning>

### 子代理委托防护

如果你允许会话工具，请将委托的子代理运行视为另一个边界决策：

- 拒绝 `sessions_spawn`，除非代理确实需要委派。
- 保持 `agents.defaults.subagents.allowAgents` 和任何按代理 `agents.list[].subagents.allowAgents` 覆盖限制为已知安全的目标代理。
- 对于任何必须保持沙箱隔离的工作流，请使用 `sandbox: "require"` 调用 `sessions_spawn`（默认为 `inherit`）。
- 当目标子运行时未沙箱隔离时，`sandbox: "require"` 会快速失败。

## 浏览器控制风险

启用浏览器控制赋予了模型驱动真实浏览器的能力。
如果该浏览器配置文件已包含登录会话，模型可以
访问这些帐户和数据。请将浏览器配置文件视为**敏感状态**：

- 优先为代理使用专用配置文件（默认的 `openclaw` 配置文件）。
- 避免让代理指向你的个人日常驱动配置文件。
- 对于沙箱隔离的代理，除非你信任它们，否则保持主机浏览器控制处于禁用状态。
- 独立的环回浏览器控制 API 仅支持共享密钥身份验证
  (网关令牌持有者身份验证或网关密码)。它不使用
  trusted-proxy 或 Tailscale Serve 身份标头。
- 将浏览器下载视为不受信任的输入；优先使用隔离的下载目录。
- 如果可能，请在代理配置文件中禁用浏览器同步/密码管理器（以减少爆炸半径）。
- 对于远程 Gateway(网关)，假设“浏览器控制”等同于“操作员访问”该配置文件所能触及的任何资源。
- 保持 Gateway(网关) 和节点主机仅限 tailnet 访问；避免将浏览器控制端口暴露给局域网或公共互联网。
- 在不需要时禁用浏览器代理路由 (`gateway.nodes.browser.mode="off"`)。
- Chrome MCP 现有会话模式**并非**“更安全”；它可以在该主机 Chrome 配置文件所能触及的任何地方充当您的身份。

### 浏览器 SSRF 策略（默认严格）

OpenClaw 的浏览器导航策略默认是严格的：私有/内部目标保持阻止状态，除非您明确选择加入。

- 默认：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此浏览器导航会阻止私有/内部/特殊用途的目标。
- 旧版别名：`browser.ssrfPolicy.allowPrivateNetwork` 仍被接受以保持兼容性。
- 选择加入模式：设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true` 以允许私有/内部/特殊用途的目标。
- 在严格模式下，使用 `hostnameAllowlist` (如 `*.example.com` 的模式) 和 `allowedHostnames` (精确主机例外，包括像 `localhost` 这样的被阻止名称) 来设置显式例外。
- 在请求前检查导航，并在导航后尽力重新检查最终的 `http(s)` URL，以减少基于重定向的跳转。

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

## 按代理访问配置文件（多代理）

通过多代理路由，每个代理可以拥有自己的沙箱 + 工具策略：
使用此功能为每个代理提供**完全访问**、**只读**或**无访问**权限。
有关完整详情
和优先级规则，请参阅[多代理沙箱和工具](/zh/tools/multi-agent-sandbox-tools)。

常见用例：

- 个人代理：完全访问权限，无沙箱
- 家庭/工作代理：沙箱隔离+ 只读工具
- 公共代理：沙箱隔离+ 无文件系统/Shell 工具

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

## 事件响应

如果您的 AI 做了坏事：

### 遏制

1. **停止它：** 停止 macOS 应用程序（如果它监管 Gateway(网关)）或终止您的 macOSGateway(网关)`openclaw gateway` 进程。
2. **关闭暴露：** 设置 `gateway.bind: "loopback"`Tailscale (或禁用 Tailscale Funnel/Serve)，直到您了解发生了什么。
3. **冻结访问：** 将有风险的私信/群组切换到 `dmPolicy: "disabled"` / 要求提及，并删除 `"*"` 允许所有的条目（如果您设置了它们）。

### 轮换（如果密钥泄露则假设已受损）

1. 轮换 Gateway(网关) 身份验证 (Gateway(网关)`gateway.auth.token` / `OPENCLAW_GATEWAY_PASSWORD`) 并重启。
2. 在任何可以调用 Gateway(网关) 的机器上轮换远程客户端密钥 (`gateway.remote.token` / `.password`Gateway(网关))。
3. 轮换提供商/API 凭据（WhatsApp 凭据、Slack/Discord 令牌、APIWhatsAppSlackDiscordAPI`auth-profiles.json` 中的模型/API 密钥，以及使用时的加密密钥负载值）。

### 审计

1. 检查 Gateway(网关) 日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`（或 `logging.file`）。
2. 审查相关记录：`~/.openclaw/agents/<agentId>/sessions/*.jsonl`。
3. 审查最近的配置更改（任何可能扩大访问权限的操作：`gateway.bind`、`gateway.auth`、dm/group 策略、`tools.elevated`、插件更改）。
4. 重新运行 `openclaw security audit --deep` 并确认关键发现已解决。

### 收集以生成报告

- 时间戳、Gateway(网关) 主机操作系统 + OpenClaw 版本
- 会话记录 + 简短的日志尾部（编辑后）
- 攻击者发送的内容 + Agent 执行的操作
- Gateway(网关) 是否暴露在回环地址之外（LAN/Tailscale Funnel/Serve）

## 密钥扫描

CI 会在仓库上运行 pre-commit `detect-private-key` 钩子。如果失败，请移除或轮换已提交的密钥材料，然后在本地重现：

```bash
pre-commit run --all-files detect-private-key
```

## 报告安全问题

在 OpenClaw 中发现了漏洞？请负责任地进行报告：

1. 电子邮件：[security@openclaw.ai](mailto:security@openclaw.ai)
2. 在修复之前请勿公开发布
3. 我们会致谢您（除非您希望匿名）
