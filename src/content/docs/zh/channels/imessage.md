---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）提供原生 iMessage 支持，包含用于回复、点击反馈、特效、附件和群组管理的私有 API 操作。当满足主机要求时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 OpenClawiMessage`imsg`macOSGateway(网关)LinuxWindows。如果您的 Gateway 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg`Gateway(网关) 的 SSH 封装程序。

**Gateway-downtime catchup 是可选的。** 启用后（`channels.imessage.catchup.enabled: true`），网关会在下次启动时重放其离线期间（崩溃、重启、Mac 休眠）存入 `chat.db` 的入站消息。默认禁用 — 请参阅 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>
  已移除 BlueBubbles 支持。请将 BlueBubbles`channels.bluebubbles` 配置迁移到 `channels.imessage`OpenClawiMessage；OpenClaw 仅通过 `imsg`BlueBubblesiMessage 支持 iMessage。请从 [BlueBubbles removal and the imsg iMessage path](/zh/announcements/bluebubbles-imessageBlueBubbles) 开始查看简短公告，或从 [Coming from BlueBubbles](/zh/channels/imessage-from-bluebubbles) 开始查看完整的迁移表。
</Warning>

状态：原生外部 CLI 集成。Gateway 生成 CLIGateway(网关)`imsg rpc`RPC 并通过 stdio 上的 JSON-RPC 进行通信（无单独的守护进程/端口）。高级操作需要 `imsg launch`API 和成功的私有 API 探测。

<CardGroup cols={3}>
  <Card title="Private API actions" icon="wand-sparkles" href="#private-api-actions">
    回复、轻触反馈、特效、附件和群组管理。
  </Card>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    iMessage 私信默认为配对模式。
  </Card>
  <Card title="Remote Mac" icon="terminal" href="#remote-mac-over-ssh">
    当 Gateway(网关) 未在运行信息应用程序的 Mac 上运行时，请使用 SSH 封装器。
  </Card>
  <Card title="Configuration reference" icon="settings" href="/zh/gateway/config-channels#imessage">
    完整的 iMessage 字段参考。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Local Mac (fast path)">
    <Steps>
      <Step title="Install and verify imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
imsg launch
openclaw channels status --probe
```

      </Step>

      <Step title="Configure OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/user/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approve first 私信 pairing (default dmPolicy)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        配对请求将在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="通过 SSH 连接远程 Mac"OpenClaw>
    OpenClaw 仅需要兼容 stdio 的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    启用附件时的推荐配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`OpenClaw，OpenClaw 将尝试通过解析 SSH 包装脚本来自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`OpenClaw（无空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

<Warning>
放在 `imsg`RPCOpenClawRPC 前的任何 `cliPath` 包装器或 SSH 代理都必须像透明的 stdio 管道一样，用于长生命周期的 JSON-RPC。OpenClaw 在该渠道的生命周期内，通过包装器的 stdin/stdout 交换小型的换行符分隔的 JSON-RPC 消息：

- 一旦有字节可用，就立即转发每个 stdin 块/行——不要等待 EOF。
- 及时反向转发每个 stdout 块/行。
- 保留换行符。
- 避免可能饿死小帧的固定大小阻塞读取（`read(4096)`、`cat | buffer`、默认 shell `read`RPCiMessage）。
- 将 stderr 与 JSON-RPC stdout 流分开。

如果包装器将 stdin 缓冲直到填满一个大块，将会产生类似于 iMessage 中断的症状——`imsg rpc timeout (chats.list)` 或渠道反复重启——即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`OpenClaw（上面）是安全的，因为它转发 OpenClaw 的 `cliPath` 参数，如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 这样的管道是不安全的——行缓冲工具仍然可能持有帧；如果必须进行过滤，请在每个阶段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 在运行 `imsg` 的 Mac 上必须登录 Messages。
- 运行 OpenClaw/OpenClaw`imsg` 的进程上下文需要完全磁盘访问权限（用于访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。
- 对于高级操作（反应 / 编辑 / 撤销 / 话题回复 / 特效 / 群组操作），必须禁用系统完整性保护 — 请参阅下方的[启用 imsg 私有 API](API#enabling-the-imsg-private-api)。基本的文本和媒体收发无需此操作。

<Tip>
权限是按进程上下文授予的。如果网关以无头模式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

<Accordion title="SSH 包装器发送失败并出现 AppleEvents -1743">
  远程 SSH 设置可以读取聊天记录、传递 `channels status --probe` 并处理传入消息，但出站发送仍可能因 AppleEvents 授权错误而失败：

```text
Not authorized to send Apple events to Messages. (-1743)
```

检查已登录 Mac 用户的 TCC 数据库或系统设置 > 隐私与安全性 > 自动化。如果自动化条目是针对 `/usr/libexec/sshd-keygen-wrapper` 而不是 `imsg`macOS 或本地 shell 进程记录的，则 macOS 可能不会为该 SSH 服务器端客户端显示可用的 Messages 开关：

```text
kTCCServiceAppleEvents | /usr/libexec/sshd-keygen-wrapper | auth_value=0 | com.apple.MobileSMS
```

在此状态下，重复 `tccutil reset AppleEvents` 或通过相同的 SSH 包装器重新运行 `imsg send` 可能会一直失败，因为需要 Messages 自动化的进程上下文是 SSH 包装器，而不是 UI 可以授权的应用程序。

请改用受支持的 `imsg`Gateway(网关) 进程上下文之一：

- 在已登录 Messages 用户的本地会话中运行 Gateway(网关)，或者至少运行 `imsg`Gateway(网关) 网桥。
- 在授予完全磁盘访问权限和自动化权限后，使用该用户的 LaunchAgent 启动 Gateway(网关)。
- 如果保留双用户 SSH 拓扑结构，请在启用渠道之前，通过确切的包装器验证真实的出站 `imsg send` 是否成功。如果无法授予自动化权限，请重新配置为单用户 `imsg` 设置，而不是依赖 SSH 包装器进行发送。

</Accordion>

## 启用 imsg 私有 API

`imsg` 提供两种操作模式：

- **基础模式**（默认，无需更改 SIP）：通过 `send` 发送出站文本和媒体，入站监视/历史记录，聊天列表。这是全新的 `brew install steipete/tap/imsg` 加上上述标准 macOS 权限后开箱即用的功能。
- **私有 API 模式**：`imsg` 将辅助 dylib 注入到 `Messages.app` 中，以调用内部 `IMCore` 函数。这解锁了 `react`、`edit`、`unsend`、`reply`（线程化）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及正在输入指示器和已读回执。

要使用此渠道页面记录的高级操作界面，您需要私有 API 模式。`imsg` README 对此要求有明确说明：

> 高级功能（如 `read`、`typing`、`launch`、网桥支持的高级发送、消息变更和聊天管理）是可选的。它们需要禁用 SIP 并将辅助 dylib 注入到 `Messages.app` 中。当启用 SIP 时，`imsg launch` 将拒绝注入。

辅助注入技术使用 `imsg` 自带的 dylib 来访问 Messages 私有 BlueBubbles。在 OpenClaw iMessage 路径中不存在第三方服务器或 iMessage 运行时。

<Warning>
**禁用 SIP 是一个真正的安全权衡。** SIP 是 macOS 抵御运行修改后的系统代码的核心保护之一；在系统范围内关闭它会打开额外的攻击面和副作用。值得注意的是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在 Mac 上安装和运行 iOS 应用的能力**。

请将此视为经过深思熟虑的操作选择，而不是默认选项。如果您的威胁模型无法容忍 SIP 被关闭，捆绑的 iMessage 将仅限于基本模式 —— 仅发送/接收文本和媒体，不支持反应 / 编辑 / 撤销 / 特效 / 群组操作。

</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级） `imsg`：**

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 输出报告 `bridge_version`、`rpc_methods` 以及每个方法的 `selectors`，以便您在开始之前了解当前构建支持的功能。

2. **禁用系统完整性保护。** 这因 macOS 版本而异，因为底层的 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 通过终端禁用库验证，重启进入恢复模式，运行 `csrutil disable`，然后重新启动。
   - **macOS 11+ (Big Sur 及更高版本)，Intel：** 恢复模式（或互联网恢复），`csrutil disable`，重新启动。
   - **macOS 11+，Apple Silicon：** 使用电源按钮启动序列进入恢复模式；在最近的 macOS 版本中，点击继续时按住 **Left Shift** 键，然后 `csrutil disable`。虚拟机设置遵循单独的流程 —— 请先拍摄 VM 快照。
   - **macOS 26 / Tahoe：** 库验证策略和 `imagent` 私有权限检查已进一步收紧；`imsg` 可能需要更新的构建以保持同步。如果在 macOS 主要升级后，`imsg launch` 注入或特定的 `selectors` 开始返回 false，请在假定 SIP 步骤成功之前检查 `imsg` 的发行说明。

   在运行 `imsg launch` 之前，请按照 Apple 的恢复模式流程为您的 Mac 禁用 SIP。

3. **注入辅助程序。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍处于启用状态时，`imsg launch` 会拒绝注入，因此这也可以作为第 2 步已执行的确认。

4. **从 OpenClaw 验证网桥：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 `works`，并且 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true` 加上您的 macOS 构建所公开的任何编辑 / 输入 / 已读选择器。`actions.ts` 中的 OpenClaw 插件按方法进行控制，仅通告其底层选择器为 `true` 的操作，因此您在代理工具列表中看到的操作界面反映了网桥在此主机上实际可以执行的操作。

如果 `openclaw channels status --probe` 将渠道报告为 `works`，但特定操作在调度时抛出“iMessage `<action>` 需要 imsg 私有 API 网桥”，请再次运行 `imsg launch` —— 辅助程序可能会失效（Messages.app 重启、OS 更新等），并且缓存的 `available: true` 状态将继续通告操作，直到下一次探针刷新。

### 当您无法禁用 SIP 时

如果禁用 SIP 对您的威胁模型不可接受：

- `imsg` 将回退到基本模式 —— 仅支持文本 + 媒体 + 接收。
- OpenClaw 插件仍然通告文本/媒体发送和入站监控；它只是根据每个方法的能力门控，从操作界面中隐藏了 `react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作。
- 您可以运行一台独立的非 Apple Silicon Mac（或专用的机器人 Mac）并关闭 SIP 以处理 iMessage 工作负载，同时在您的主设备上保持 SIP 开启。请参阅下方的[专用机器人 macOS 用户（独立的 iMessage 身份）](#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制直接消息：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须标识发送者：句柄或静态发送者访问组 (`accessGroup:<name>`)。对于 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 等聊天目标，请使用 `channels.imessage.groupAllowFrom`；对于数字 `chat_id` 注册表项，请使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送者白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送者访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送者检查将使用 `allowFrom`；当  和群组准入策略不同时，请设置 `groupAllowFrom`。
    运行时说明：如果完全缺少 `channels.imessage`，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有 **两个** 连续运行的白名单关卡，两个都必须通过：

    1. **发送者 / 聊天目标白名单**（`channels.imessage.groupAllowFrom`）——句柄、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）——使用 `groupPolicy: "allowlist"` 时，此关卡需要一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者在 `groups` 下有一个针对每个 `chat_id` 的显式条目。

    如果关卡 2 中没有任何内容，每条群组消息都会被丢弃。插件在默认日志级别发出两个 `warn` 级别信号：

    - 启动时每个帐户一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    iMessage 继续工作，因为它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组消息流转的最低配置：

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    如果网关日志中出现那些 `warn` 行，说明关卡 2 正在丢弃消息——请添加 `groups` 块。
    </Warning>

    群组的提及限制：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及限制

    来自授权发送者的控制命令可以在群组中绕过提及限制。

    每个群组的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组中消息的每一轮注入到 Agent 的系统提示词中。解析逻辑镜像了 `channels.whatsapp.groups` 使用的每个群组的提示词解析：

    1. **特定群组的系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目 **并且** 定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，并且不向该群组应用系统提示词。
    2. **群组通配符系统提示词**（`groups["*"].systemPrompt`）：当映射中完全不存在特定群组条目时，或者当条目存在但未定义 `systemPrompt` 键时使用。

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    每个群组的提示词仅适用于群组消息——此渠道中的直接消息不受影响。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`iMessage 时，iMessage 私信会合并到代理主会话中。
    - 群组会话是隔离的（`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage）。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    某些多参与者的 iMessage 线程可能会带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被显式配置，OpenClaw 会将其视为群组流量（群组筛选 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

传统的 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 同一 iMessage 会话中的未来消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

支持通过包含 `type: "acp"` 和 `match.channel: "imessage"` 的顶级 `bindings[]` 条目来配置持久绑定。

`match.peer.id` 可以使用：

- 标准化的私信句柄，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`（推荐用于稳定的群组绑定）
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

有关共享 ACP 绑定行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 部署模式

<AccordionGroup>
  <Accordion title="macOSiMessage专用机器人 macOS 用户（独立的 iMessage 身份）"macOSmacOS>
    使用专用的 Apple ID 和 macOS 用户，以便将机器人流量与您的个人信息资料隔离开来。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户中使用机器人 Apple ID 登录“信息”。
    3. 在该用户中安装 `imsg`OpenClaw。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在机器人用户会话中进行 GUI 批准（自动化 + 完全磁盘访问权限）。

  </Accordion>

  <Accordion title="Tailscale通过 Tailscale 远程连接 Mac（示例）"LinuxiMessage>
    常见拓扑结构：

    - gateway 运行在 Linux/VM 上
    - iMessage + `imsg` 运行在您的 tailnet 中的 Mac 上
    - `cliPath` 包装器使用 SSH 来运行 `imsg`
    - `remoteHost` 启用 SCP 附件获取

    示例：

    ```json5
    {
      channels: {
        imessage: {
          enabled: true,
          cliPath: "~/.openclaw/scripts/imsg-ssh",
          remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
          includeAttachments: true,
          dbPath: "/Users/bot/Library/Messages/chat.db",
        },
      },
    }
    ```

    ```bash
    #!/usr/bin/env bash
    exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
    ```

    使用 SSH 密钥，以便 SSH 和 SCP 都是非交互式的。
    确保首先信任主机密钥（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="多账户模式"iMessage>
    iMessage 支持在 `channels.imessage.accounts` 下进行按账户配置。

    每个账户都可以覆盖诸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根允许列表等字段。

  </Accordion>

  <Accordion title="Direct-message history">
    设置 `channels.imessage.dmHistoryLimit` 以使用该对话最近的已解码 `imsg` 历史记录来初始化新的私信会话。使用 `channels.imessage.dms["<sender>"].historyLimit` 进行每个发送者的覆盖设置，包括 `0` 以禁用某个发送者的历史记录。

    iMessage 私信历史记录会根据需要从 `imsg` 获取。如果不设置 `dmHistoryLimit`，将禁用全局私信历史记录初始化，但如果为特定发送者设置了正值的 `channels.imessage.dms["<sender>"].historyLimit`，则仍会为该发送者启用历史记录初始化。

  </Accordion>
</AccordionGroup>

## 媒体、分块和传递目标

<AccordionGroup>
  <Accordion title="Attachments and media">
    - 接收附件摄入功能**默认关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发给代理。如果禁用此功能，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能根本不会产生 `Inbound message` 日志行。
    - 当设置了 `remoteHost` 时，可以通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots` (本地)
      - `channels.imessage.remoteAttachmentRoots` (远程 SCP 模式)
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密检查 (`StrictHostKeyChecking=yes`)
    - 发出媒体大小使用 `channels.imessage.mediaMaxMb` (默认 16 MB)

  </Accordion>

  <Accordion title="Outbound chunking">
    - 文本分块限制：`channels.imessage.textChunkLimit` (默认 4000)
    - 分块模式：`channels.imessage.chunkMode`
      - `length` (默认)
      - `newline` (段落优先分割)

  </Accordion>

  <Accordion title="Addressing formats">
    首选显式目标：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支持句柄目标：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## Private API actions

When `imsg launch` is running and `openclaw channels status --probe` reports `privateApi.available: true`, the message 工具 can use iMessage-native actions in addition to normal text sends.

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可用操作"iMessage>
    - **react**：添加/移除 iMessage 点赞反馈（`messageId`、`emoji`、`remove`）。支持的点赞反馈包括爱心、喜欢、不喜欢、大笑、强调和疑问。
    - **reply**：对现有消息发送 threaded 回复（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`iMessage）。
    - **sendWithEffect**：发送带有 iMessage 特效的文本（`text` 或 `message`、`effect` 或 `effectId`macOSAPI）。
    - **edit**：在支持的 macOS/私有 API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`macOSAPI）。
    - **unsend**：在支持的 macOS/私有 API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**：发送媒体/文件（`buffer` 为 base64 或一个水合的 `media`/`path`/`filePath`、`filename`，可选 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组对话时，管理群组聊天。

  </Accordion>

  <Accordion title="消息 ID"iMessage>
    入站 iMessage 上下文在可用时包含短 `MessageSid` 值和完整的消息 GUID。短 ID 的作用域是最近的 SQLite 支持的回复缓存，并在使用前根据当前聊天进行检查。如果短 ID 已过期或属于其他聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection">
    OpenClaw 仅在缓存探测状态显示桥接不可用时隐藏私有 API 操作。如果状态未知，操作保持可见并延迟调度探测，以便第一个操作可以在 `imsg launch` 之后成功，而无需单独的手动状态刷新。

  </Accordion>

  <Accordion title="Read receipts and typing">
    当私有 API 桥接正常运行时，接受的入站聊天会在调度前标记为已读，并且在代理生成回复时会向发送者显示输入气泡。使用以下命令禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法功能列表的旧版 `imsg` 构建版本将静默关闭输入/已读功能；OpenClaw 会在每次重启时记录一次性警告，以便追溯缺失的回执。

  </Accordion>

  <Accordion title="Inbound tapbacks">
    OpenClaw 订阅 iMessage 点回（tapbacks），并将接受的反应作为系统事件而不是普通消息文本进行路由，因此用户点回不会触发普通的回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅当用户对机器人发送的消息做出反应时通知。
    - `"all"`：对来自授权发送者的所有入站点回进行通知。
    - `"off"`：忽略入站点回。

    每个账户的覆盖设置使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="审批反应（👍 / 👎）">
    当 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 为 true 且请求路由到 iMessage 时，网关会原生发送审批提示并接受点回（tapback）来处理它：

    - `👍`（点回“赞”） → `allow-once`
    - `👎`（点回“踩”） → `deny`
    - `allow-always` 仍保留为手动回退方案：将 `/approve <id> allow-always` 作为普通回复发送。

    处理反应要求反应用户的句柄必须是明确的审批者。审批者列表从 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）读取；请添加用户的 E.164 格式电话号码或其 Apple ID 电子邮件。通配符条目 `"*"` 受到支持，但允许任何发送者进行审批。反应快捷键故意绕过 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因为明确的审批者白名单是审批处理中唯一重要的关卡。

    **本版本的行为变更：** 当 `channels.imessage.allowFrom` 非空时，`/approve <id> <decision>` 文本命令现在依据该审批者列表进行授权（而不是更广泛的  白名单）。被  白名单允许但不在 `allowFrom` 中的发送者将收到明确的拒绝。若要保留以前的行为，请将每个应能通过 `/approve`（以及通过反应）进行审批的操作员添加到 `allowFrom` 中。当 `allowFrom` 为空时，传统的“同且回退”仍然有效，且 `/approve` 继续授权任何被  白名单允许的人。

    操作员说明：
    - 反应绑定同时存储在内存中（TTL 与审批过期时间匹配）和网关的持久化键值存储中，因此在网关重启后不久收到的点回仍然能处理审批。
    - 跨设备 `is_from_me=true` 点回（操作员在配对的 Apple 设备上自己的反应）会被故意忽略，以防止机器人自行审批。
    - 传统的文本风格点回（来自非常旧的 Apple 客户端的 `Liked "…"` 纯文本）无法处理审批，因为它们不包含消息 GUID；反应处理需要当前的 macOS / iOS 客户端发出的结构化点回元数据。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许渠道发起的配置写入（当 `commands.config: true` 时用于 iMessage`/config set|unset`）。

禁用：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## 合并拆分发送的私信（一次组合中的命令 + URL）

当用户同时输入命令和 URL 时（例如 `Dump https://example.com/article`），Apple 的“信息”应用会将发送拆分为 **两个单独的 `chat.db` 行**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中包含作为附件的 OG 预览图像。

在大多数设置中，这两行到达 OpenClaw 的时间间隔约为 0.8-2.0 秒。如果不进行合并，代理在第 1 轮只收到命令，并做出回复（通常是“发送 URL 给我”），然后在第 2 轮才看到 URL —— 此时命令上下文已经丢失。这是 Apple 的发送流水线造成的，并非 OpenClaw 或 OpenClawOpenClaw`imsg` 引入的问题。

`channels.imessage.coalesceSameSenderDms` 选项使私信将连续的同一发送者行合并为单个代理轮次。群聊继续按消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 您发布的技能期望在一条消息中包含 `command + payload`（转储、粘贴、保存、队列等）。
    - 您的用户将 URL、图片或长内容与命令一起粘贴。
    - 您可以接受增加的私信轮次延迟（见下文）。

    在以下情况下保持禁用：

    - 您需要针对单词私信触发器的最小命令延迟。
    - 您的所有流程都是没有有效负载后续的一次性命令。

  </Tab>
  <Tab title="启用">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    启用该标志且没有显式设置 `messages.inbound.byChannel.imessage` 时，防抖窗口将扩大到 **2500 ms**（旧版默认为 0 ms —— 即无防抖）。需要更宽的窗口，是因为 Apple 0.8-2.0 秒的拆分发送节奏不适合更紧凑的默认值。

    若要自行调整窗口：

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is
            // slow or under memory pressure (observed gap can stretch past 2 s
            // then).
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Trade-offs">
    - **私信消息增加了延迟。** 开启该标志后，每条私信（包括独立的控制命令和单文本后续消息）在分派前都会等待去抖动窗口结束，以防有新的消息载荷行到来。群聊消息保持即时分派。
    - **合并输出有限制。** 合并后的文本上限为 4000 个字符，并带有明确的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留最新和最早）。每个源 GUID 都在 `coalescedMessageGuids` 中跟踪，用于下游遥测。
    - **仅限私信。** 群聊消息回退到逐条分派模式，以确保在多人同时打字时机器人保持响应。
    - **可选，按渠道设置。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置了 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景及代理端所见内容

| 用户发送                                          | `chat.db` 生成         | 标志关闭（默认）                           | 标志开启 + 2500 毫秒窗口                                |
| ------------------------------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 行，间隔约 1 秒      | 代理端两次响应：先回复“Dump”，随后回复 URL | 一次响应：合并后的文本 `Dump https://example.com`       |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 行                   | 两次响应（合并时附件丢失）                 | 一次响应：文本和图片均保留                              |
| `/status`（独立命令）                             | 1 行                   | 即时分派                                   | **等待直至窗口结束，然后分派**                          |
| 仅粘贴 URL                                        | 1 行                   | 即时分派                                   | 即时分派（桶中仅有一个条目）                            |
| 文本 + URL 作为两条刻意分开的消息发送，间隔数分钟 | 2 行，在窗口之外       | 两次响应                                   | 两次响应（窗口在此之间过期）                            |
| 快速涌入（窗口内超过 10 条小型私信）              | N 行                   | N 次响应                                   | 一次响应，输出受限（保留最新和最早，应用文本/附件上限） |
| 两人在群聊中打字                                  | 来自 M 位发送者的 N 行 | M+ 次响应（每个发送者桶各一次）            | M+ 次响应 —— 群聊消息不合并                             |

## 网关停机后的追赶

当网关处于离线状态（崩溃、重启、Mac 休眠、机器关机）时，`imsg watch` 会在网关重新上线后从当前的 `chat.db` 状态恢复——默认情况下，中断期间到达的任何消息都不会被看到。Catchup 会在下次启动时重放这些消息，以便代理不会静默地错过入站流量。

Catchup **默认处于禁用状态**。请针对每个渠道单独启用：

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // master switch (default: false)
      maxAgeMinutes: 120,        // skip rows older than now - 2h (default: 120, clamp 1..720)
      perRunLimit: 50,           // max rows replayed per startup (default: 50, clamp 1..500)
      firstRunLookbackMinutes: 30, // first run with no cursor: look back 30 min (default: 30)
      maxFailureRetries: 10,     // give up on a wedged guid after 10 dispatch failures (default: 10)
    },
  },
}
```

### 运行方式

每次 `monitorIMessageProvider` 启动时运行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时调度循环。Catchup 本身针对 `imsg watch` 使用的同一 JSON-RPC 客户端，使用 `chats.list` 加上每次聊天的 `messages.history`RPC。在 catchup 过程中到达的任何内容都会正常通过实时调度流动；现有的入站去重缓存会吸收与重放行的任何重叠部分。

每个重放的行都会通过实时调度路径（`evaluateIMessageInbound` + `dispatchInboundMessage`）输入，因此允许列表、组策略、防抖器、回显缓存和已读回执在重放消息和实时消息上的行为完全一致。

### 光标和重试语义

Catchup 在 SQLite 插件状态中保存每个账户的光标：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 光标在每次成功调度时前进，并在某行的调度抛出错误时保持——下一次启动会从保持的光标重试同一行。
- 启动 catchup 查询成功后，稍后处理的实时行也会推进同一个光标，以便网关重启不会重放已经实时处理过的消息。实时光标写入不会跳过仍低于 `maxFailureRetries` 的 catchup 失败项。
- 在对同一个 `guid` 连续抛出 `maxFailureRetries` 次错误后，catchup 会记录 `warn` 并强制将光标推进到卡住的消息之后，以便后续启动可以继续进行。
- 在后续运行中，已放弃的 guid 会被跳过（不尝试调度），并在运行摘要中计入 `skippedGivenUp`。
- `openclaw doctor --fix` 将旧的 `<openclawStateDir>/imessage/catchup/*.json` 游标文件导入到 SQLite 插件状态中，并归档旧文件。

### 操作员可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行意味着单次启动未清空全部积压。如果您的间隙定期超出默认的 50 行通过量，请提高 `perRunLimit`（最高 500）。

### 何时将其关闭

- Gateway(网关) 持续运行并带有看门狗自动重启，且间隙总是 < 几秒 — 默认的关闭状态即可。
- 私信量很低，且错过的消息不会改变代理行为 — `firstRunLookbackMinutes` 初始窗口可能会在首次启用时分发令人惊讶的旧上下文。

当您开启追赶功能时，没有游标的首次启动仅回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口 — 这避免了重放启用前的长历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="未找到 imsg 或 RPC 不受支持">
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探测报告 RPC 不受支持，请更新 `imsg`。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch` 并再次探测。如果 Gateway(网关) 未在 macOS 上运行，请使用上述通过 SSH 连接远程 Mac 的设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关) 未在 macOS 上运行">
    默认的 `cliPath: "imsg"` 必须在已登录消息的 Mac 上运行。在 Linux 或 Windows 上，将 `channels.imessage.cliPath` 设置为通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的封装脚本。

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    然后运行：

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="私信被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - 配对批准 (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="群组消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 白名单行为
    - 提及模式配置 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 来自 Gateway 主机的 SSH/SCP 密钥认证
    - Gateway 主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOS错过了macOS权限提示">
    在相同的用户/会话上下文中，在交互式 GUI 终端中重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    确认为运行 OpenClaw/`imsg` 的进程上下文授予了完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对](/en/channels/pairing)

## 相关

- [渠道概览](/en/channels) — 所有支持的渠道
- [BlueBubbles 移除及 imsg iMessage 路径](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — 公告和迁移摘要
- [从 BlueBubbles 转入](BlueBubbles/en/channels/imessage-from-bluebubbles) — 配置转换表和逐步切换
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及限制
- [渠道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
