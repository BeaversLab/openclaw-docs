---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）实现原生 iMessage 支持，包含用于回复、轻触回应、特效、附件和群组管理的私有 API 操作。当主机要求符合时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 OpenClawiMessage`imsg`macOSGateway(网关)LinuxWindows。如果您的 Gateway(网关) 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg`Gateway(网关) 的 SSH 封装程序。

**Gateway(网关) 停机期间的追赶是可选的。** 启用后（`channels.imessage.catchup.enabled: true`），网关会在下次启动时重放其离线期间（崩溃、重启、Mac 休眠）到达 `chat.db` 的入站消息。默认禁用 — 请参阅 [Gateway(网关) 停机后的消息追赶](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支持已被移除。请将 BlueBubbles`channels.bluebubbles` 配置迁移到 `channels.imessage`OpenClawiMessage；OpenClaw 仅通过 `imsg` 支持 iMessage。</Warning>

状态：原生外部 CLI 集成。Gateway(网关) 生成 CLIGateway(网关)`imsg rpc`RPC 并通过 stdio 上的 JSON-RPC 进行通信（无单独的守护进程/端口）。高级操作需要 `imsg launch`API 以及成功的私有 API 探测。

<CardGroup cols={3}>
  <Card title="Private API actions" icon="wand-sparkles" href="#private-api-actions">
    回复、点回、特效、附件和群组管理。
  </Card>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    iMessage 私信默认为配对模式。
  </Card>
  <Card title="Remote Mac" icon="terminal" href="#remote-mac-over-ssh">
    当 Gateway(网关) 未运行在信息 Mac 上时，请使用 SSH 封装程序。
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

  <Tab title="Remote Mac over SSH"OpenClaw>
    OpenClaw 只需要兼容 stdio 的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

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

    如果未设置 `remoteHost`OpenClaw，OpenClaw 会尝试通过解析 SSH 包装脚本自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`OpenClaw（无空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 必须在运行 `imsg` 的 Mac 上登录 Messages。
- 运行 OpenClaw/OpenClaw`imsg` 的进程上下文需要“完全磁盘访问权限”（访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。
- 对于高级操作（回应 / 编辑 / 撤销 / 串联回复 / 特效 / 群组操作），必须禁用系统完整性保护 —— 请参阅下方的[启用 imsg 私有 API](API#enabling-the-imsg-private-api)。无需此功能即可进行基本的文本和媒体发送/接收。

<Tip>
权限是按进程上下文授予的。如果网关以无头模式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 启用 imsg 私有 API

`imsg` 提供两种运行模式：

- **基本模式**（默认，无需更改 SIP）：通过 `send` 发送出站文本和媒体、入站监视/历史记录、聊天列表。这是全新 `brew install steipete/tap/imsg`macOS 开箱即得的功能，加上上述标准 macOS 权限。
- **Private API 模式**：API`imsg` 将一个辅助 dylib 注入到 `Messages.app` 中，以调用内部的 `IMCore` 函数。这正是解锁 `react`、`edit`、`unsend`、`reply`（线程化）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及正在输入指示器和已读回执的方式。

要使用本渠道页面所记录的高级操作功能，您需要启用 Private API 模式。API`imsg` 的 README 中明确说明了这一要求：

> `read`、`typing`、`launch`、网桥支持的高级发送、消息变更和聊天管理等高级功能是可选启用的。它们需要禁用 SIP，并将一个辅助 dylib 注入到 `Messages.app` 中。当启用 SIP 时，`imsg launch` 会拒绝注入。

辅助注入技术使用 `imsg`BlueBubblesOpenClawiMessage 自身的 dylib 来访问 Messages 的私有 API。在 OpenClaw iMessage 路径中，没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用 SIP 是一个真正的安全权衡。** SIP 是 macOS 防止运行修改后的系统代码的核心保护措施之一；在系统范围内关闭它会开辟额外的攻击面和副作用。值得注意的是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在 Mac 上安装和运行 iOS 应用的能力**。

请将此视为深思熟虑的操作选择，而不是默认选项。如果您的威胁模型无法容忍 SIP 被关闭，捆绑的 iMessage 将仅限于基本模式——仅支持文本和媒体发送/接收，没有反应 / 编辑 / 撤销 / 特效 / 群组操作。

</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级） `imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 输出会报告 `bridge_version`、`rpc_methods` 和每个方法的 `selectors`，以便您在开始之前了解当前构建支持的功能。

2. **禁用系统完整性保护（System Integrity Protection）。** 这取决于 macOS 版本，因为底层的 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 通过终端禁用库验证，重启进入恢复模式，运行 `csrutil disable`，然后重启。
   - **macOS 11+ (Big Sur 及更高版本)，Intel：** 恢复模式（或互联网恢复），`csrutil disable`，重启。
   - **macOS 11+，Apple Silicon：** 使用电源按钮启动序列进入恢复模式；在最近的 macOS 版本中，点击继续时按住 **Left Shift** 键，然后运行 `csrutil disable`。虚拟机设置遵循单独的流程 —— 请先拍摄虚拟机快照。
   - **macOS 26 / Tahoe：** 库验证策略和 `imagent` 私有权限检查已进一步收紧；`imsg` 可能需要更新的构建版本才能跟上。如果在 macOS 重大升级后，`imsg launch` 注入或特定的 `selectors` 开始返回 false，请在假定 SIP 步骤成功之前检查 `imsg` 的发行说明。

   按照 Apple 的恢复模式流程为您的 Mac 禁用 SIP，然后再运行 `imsg launch`。

3. **注入辅助程序。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍处于启用状态时，`imsg launch` 将拒绝注入，因此这也确认了步骤 2 已完成。

4. **从 OpenClaw 验证网桥：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 iMessage`works`，而 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true`macOSOpenClaw 以及您的 macOS 版本所暴露的任何编辑/输入/已读选择器。`actions.ts` 中的 OpenClaw 插件按方法筛选机制仅通告基础选择器为 `true` 的操作，因此您在代理工具列表中看到的操作界面反映了该桥接在此主机上实际能执行的操作。

如果 `openclaw channels status --probe` 将渠道报告为 `works`iMessage，但特定操作在分发时抛出“iMessage `<action>`API 需要 imsg private API 桥接”，请再次运行 `imsg launch` —— 辅助程序可能会失效（Messages.app 重启、系统更新等），并且缓存的 `available: true` 状态会继续通告操作，直到下一次探测刷新。

### 当您无法禁用 SIP 时

如果对于您的威胁模型而言，禁用 SIP 是不可接受的：

- `imsg` 将回退到基本模式 —— 仅限文本 + 媒体 + 接收。
- OpenClaw 插件仍会通告文本/媒体发送和入站监控；它只是在操作界面中隐藏了 OpenClaw`react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作（根据按方法的功能筛选）。
- 您可以运行一台单独的非 Apple Silicon Mac（或专用的机器人 Mac）并关闭 SIP 以处理 iMessage 工作负载，同时在主设备上保持 SIP 启用。请参阅下方的[专用机器人 macOS 用户（独立的 iMessage 身份）](iMessagemacOSiMessage#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信政策">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目可以是句柄、静态发送者访问组（`accessGroup:<name>``chat_id:*`）或聊天目标（%%PH:INLINE_CODE:196:7f2194b%%、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理方式：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送者白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送者访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`iMessage，iMessage 群组发送者检查将在可用时回退到 `allowFrom`。
    运行时说明：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有**两个**连续运行的白名单门控，且两者都必须通过：

    1. **发送者 / 聊天目标白名单**（`channels.imessage.groupAllowFrom`）——句柄、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）——使用 `groupPolicy: "allowlist"` 时，此门控需要一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者 `groups` 下的显式按 `chat_id` 条目。

    如果门控 2 中没有任何内容，每条群组消息都会被丢弃。插件会在默认日志级别发出两个 `warn` 级别的信号：

    - 启动时每个账户一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信继续有效，因为它们采用不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组消息流动的最低配置：

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

    如果网关日志中出现那些 `warn` 行，说明门控 2 正在丢弃消息——请添加 `groups`iMessage 块。
    </Warning>

    群组的提及门控：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及门控

    来自授权发送者的控制命令可以在群组中绕过提及门控。

    按群组划分的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组中消息的每一轮对话中注入到代理的系统提示词中。解析逻辑镜像了 `channels.whatsapp.groups` 使用的按群组提示词解析方式：

    1. **群组专用系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，且不对该群组应用系统提示词。
    2. **群组通配符系统提示词**（`groups["*"].systemPrompt`）：当映射中完全缺少特定群组条目，或者该条目存在但未定义 `systemPrompt` 键时使用。

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

    按群组划分的提示词仅适用于群组消息——此渠道中的私信不受影响。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认的 `session.dmScope=main`iMessage，iMessage 私信会折叠到代理主会话中。
    - 群组会话是隔离的 (`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage)。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    一些多参与者 iMessage 线程可能会带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被显式配置，OpenClaw 会将其视为群组流量（群组准入 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群组聊天中运行 `/acp spawn codex --bind here`。
- 该同一 iMessage 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会原地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

支持通过带有 `type: "acp"` 和 `match.channel: "imessage"` 的顶级 `bindings[]` 条目来配置持久绑定。

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

有关共享 ACP 绑定行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。

## 部署模式

<AccordionGroup>
  <Accordion title="macOSiMessage专用 bot macOS 用户（独立的 iMessage 身份）"macOSmacOS>
    使用专用的 Apple ID 和 macOS 用户，以便将 bot 流量与您的个人信息资料隔离开来。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户下使用 bot 的 Apple ID 登录 Messages。
    3. 在该用户下安装 `imsg`OpenClaw。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该 bot 用户会话中进行 GUI 批准（自动化 + 完全磁盘访问权限）。

  </Accordion>

  <Accordion title="Tailscale通过 Tailscale 连接远程 Mac（示例）"LinuxiMessage>
    常见拓扑：

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
    iMessage 支持在 `channels.imessage.accounts` 下进行每个账户的配置。

    每个账户可以覆盖诸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根允许列表等字段。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取功能**默认关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发给代理。如果禁用此功能，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能完全不产生 `Inbound message` 日志行。
    - 当设置了 `remoteHost` 时，可以通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots` (本地)
      - `channels.imessage.remoteAttachmentRoots` (远程 SCP 模式)
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密检查 (`StrictHostKeyChecking=yes`)
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb` (默认 16 MB)

  </Accordion>

  <Accordion title="出站分块">
    - 文本分块限制：`channels.imessage.textChunkLimit` (默认 4000)
    - 分块模式：`channels.imessage.chunkMode`
      - `length` (默认)
      - `newline` (段落优先拆分)

  </Accordion>

  <Accordion title="寻址格式">
    首选的显式目标：

    - `chat_id:123` (推荐用于稳定路由)
    - `chat_guid:...`
    - `chat_identifier:...`

    同时也支持句柄目标：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## 私有 API 操作

当 `imsg launch` 正在运行且 `openclaw channels status --probe` 报告 `privateApi.available: true`iMessage 时，消息工具除了可以发送普通文本外，还可以使用 iMessage 原生操作。

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
  <Accordion title="Available actions"iMessage>
    - **react**：添加/移除 iMessage 点回反应（`messageId`、`emoji`、`remove`）。支持的点回反应映射为爱、喜欢、不喜欢、大笑、强调和疑问。
    - **reply**：发送对现有消息的线程回复（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`iMessage）。
    - **sendWithEffect**：发送带有 iMessage 特效的文本（`text` 或 `message`、`effect` 或 `effectId`macOSAPI）。
    - **edit**：在支持的 macOS/私有 API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`macOSAPI）。
    - **unsend**：在支持的 macOS/私有 API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**：发送媒体/文件（`buffer` 作为 base64 或已水合的 `media`/`path`/`filePath`、`filename`，可选 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组对话时，管理群组聊天。

  </Accordion>

  <Accordion title="Message IDs"iMessage>
    传入的 iMessage 上下文在可用时包含简短的 `MessageSid` 值和完整的消息 GUID。简短 ID 的作用域限于最近的内存回复缓存，并在使用前根据当前聊天进行检查。如果简短 ID 已过期或属于其他聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection"OpenClawAPI>
    仅当缓存探测状态显示桥接不可用时，OpenClaw 才会隐藏私有 API 操作。如果状态未知，操作仍然可见并延迟分发探测，以便第一个操作可以在 `imsg launch` 后成功，而无需单独手动刷新状态。

  </Accordion>

  <Accordion title="Read receipts and typing"API>
    当私有 API 桥接启动时，接受的入站聊天会在分发前标记为已读，并且在代理生成内容时会向发送者显示正在输入气泡。使用以下命令禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法功能列表的旧版 `imsg`OpenClaw 构建将静默关闭正在输入/已读功能；OpenClaw 会在每次重启时记录一次警告，以便归因缺失的回执。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许渠道发起的配置写入（对于 iMessage`/config set|unset` 当 `commands.config: true` 时）。

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

## 合并拆分发送的私信（一条消息中的命令 + URL）

当用户同时输入命令和 URL 时 —— 例如 `Dump https://example.com/article` —— Apple 的“信息”应用会将发送拆分为**两个单独的 `chat.db` 行**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中包含 OG 预览图片作为附件。

在大多数设置中，这两行数据到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果不进行合并，代理会在第一轮单独收到命令，进行回复（通常是“把 URL 发给我”），然后直到第二轮才看到 URL —— 此时命令上下文已经丢失。这是 Apple 的发送管道，而不是 OpenClaw 或 OpenClawOpenClaw`imsg` 引入的任何问题。

`channels.imessage.coalesceSameSenderDms` 使私信选择将连续的相同发送者行合并为单个代理轮次。群聊继续按消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="When to enable">
    何时启用：

    - 您发布的技能期望在一条消息中包含 `command + payload`（转储、粘贴、保存、队列等）。
    - 您的用户会在命令旁边粘贴 URL、图片或长内容。
    - 您可以接受增加的私信 轮次延迟（见下文）。

    何时保持禁用：

    - 您需要对单字私信 触发器实现最小命令延迟。
    - 您的所有流程都是单次命令，且没有后续有效载荷。

  </Tab>
  <Tab title="Enabling">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    开启该标志且未指定显式的 `messages.inbound.byChannel.imessage` 时，去抖动窗口将扩大至 **2500 毫秒**（旧版默认值为 0 毫秒 —— 即无去抖动）。之所以需要更宽的窗口，是因为 Apple 的拆分发送节奏（0.8-2.0 秒）无法适应更紧凑的默认值。

    要自行调整窗口：

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
    - **私信 消息的延迟增加。** 开启该标志后，每条私信（包括独立的控制命令和单文本后续消息）在分派前都会等待去抖动窗口的时间，以防有有效载荷行传来。群聊消息保持即时分派。
    - **合并输出是受限的。** 合并文本上限为 4000 个字符，并带有显式的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留最早和最新的）。每个源 GUID 都会记录在 `coalescedMessageGuids`TelegramWhatsAppSlack 中，以便下游遥测使用。
    - **仅限私信。** 群聊将回退到按消息分派，以便在多人同时打字时保持机器人响应迅速。
    - **可选，按渠道 配置。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景与代理 所见内容

| 用户组合内容                                      | `chat.db` 产生         | 标志关闭（默认）                              | 标志开启 + 2500 毫秒窗口                                  |
| ------------------------------------------------- | ---------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 行，相隔约 1 秒      | 代理 两个轮次：先是“Dump”单独出现，然后是 URL | 代理 一个轮次：合并的文本 `Dump https://example.com`      |
| `Save this 📎image.jpg caption` (附件 + 文本)     | 2 行                   | 两个轮次 (合并时附件丢失)                     | 一个轮次：文本 + 图片已保留                               |
| `/status` (独立命令)                              | 1 行                   | 即时发送                                      | **等待至窗口结束，然后发送**                              |
| 单独粘贴的 URL                                    | 1 行                   | 即时发送                                      | 即时发送 (存储桶中仅有一条条目)                           |
| 文本 + URL 作为两条有意分开的消息发送，相隔数分钟 | 窗口外 2 行            | 两个轮次                                      | 两个轮次 (窗口在它们之间过期)                             |
| 快速涌入 (窗口内超过 10 条小私信)                 | N 行                   | N 个轮次                                      | 一个轮次，受限输出 (第一条 + 最新一条，应用文本/附件上限) |
| 两人在群聊中输入                                  | 来自 M 个发送者的 N 行 | M+ 个轮次 (每个发送者存储桶一个)              | M+ 个轮次 — 群聊不合并                                    |

## 网关停机后追赶

当网关离线 (崩溃、重启、Mac 休眠、机器关机) 时，`imsg watch` 一旦恢复上线就会从当前的 `chat.db` 状态继续 — 默认情况下，在此期间到达的任何消息都永远不会被看到。追赶 (Catchup) 会在下次启动时重放这些消息，以便代理不会静默错过入站流量。

追赶功能**默认禁用**。请按渠道启用：

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

每次 `monitorIMessageProvider` 启动运行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时发送循环。追赶功能本身使用 `chats.list` + 每个聊天 `messages.history`，作用于与 `imsg watch` 使用的同一 JSON-RPC 客户端。在追赶过程中到达的任何内容都会正常通过实时发送流程；现有的入站去重缓存会吸收与重放行的任何重叠。

每条重放行都会通过实时发送路径 (`evaluateIMessageInbound` + `dispatchInboundMessage`) 输送，因此允许列表、群组策略、防抖器、回显缓存和已读回执在重放消息和实时消息上的行为完全一致。

### 游标和重试语义

追赶功能在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 处保留每个账户的游标 (OpenClaw 状态目录默认为 `~/.openclaw`，可通过 `OPENCLAW_STATE_DIR` 覆盖)：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游标在每次成功分发时推进，并在某行分发抛出异常时保持 — 下次启动会从保持的游标重试同一行。
- 在对同一 `guid` 连续 `maxFailureRetries` 次抛出异常后，追记会记录一条 `warn` 并强制推进游标跳过卡住的消息，以便后续启动能够取得进展。
- 已放弃的 guid 会在后续运行中被直接跳过（不尝试分发），并在运行摘要中计入 `skippedGivenUp`。

### 操作员可见的信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行表示单次启动未能排完全部积压。如果您的缺口通常超过默认的 50 行遍历，请提高 `perRunLimit`（最大 500）。

### 何时将其关闭

- Gateway(网关) 持续运行并配有看门狗自动重启，且缺口总是小于几秒 — 默认关闭即可。
- 私信量很低，且遗漏的消息不会改变代理行为 — `firstRunLookbackMinutes` 初始窗口可能在首次启用时分发令人惊讶的旧上下文。

当您开启追记时，首次启动且没有游标时只会回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口 — 这避免了重放启用前的长历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="未找到 imsg 或 RPC 不支持">
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    如果探针报告 RPC 不支持，请更新 `imsg`。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch` 并再次探测。如果 Gateway(网关) 未运行在 macOS 上，请使用上述通过 SSH 的远程 Mac 设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关)macOSGateway(网关) 未在 macOS 上运行">
    默认的 `cliPath: "imsg"`LinuxWindows 必须在已登录 Messages 的 Mac 上运行。在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 设置为通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的包装脚本。

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
    - `channels.imessage.groups` 允许列表行为
    - 提及模式配置 (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - 来自 Gateway(网关) 主机的 SSH/SCP 密钥身份验证
    - Gateway(网关) 主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOSmacOS 权限提示被遗漏">
    在相同的用户/会话上下文中，以交互式 GUI 终端重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    确认运行 OpenClaw/`imsg` 的进程上下文已授予完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对](/en/channels/pairing)

## 相关

- [渠道概览](/en/channels) — 所有支持的渠道
- [从 BlueBubbles 转入](/en/channels/imessage-from-bluebubbles) — 配置转换表和逐步迁移
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及控制
- [频道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
