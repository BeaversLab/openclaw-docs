---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）实现原生 iMessage 支持，包含用于回复、轻触回应、特效、附件和群组管理的私有 API 操作。当主机要求符合时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS 消息主机上使用 `imsg`。如果您的 Gateway(网关) 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg` 的 SSH 包装器。

**Gateway(网关) 停机追赶是可选的。** 当启用时（`channels.imessage.catchup.enabled: true`），网关会在下次启动时重放其离线期间（崩溃、重启、Mac 睡眠）落入 `chat.db` 的入站消息。默认禁用 — 请参阅 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支持已被移除。请将 `channels.bluebubbles` 配置迁移到 `channels.imessage`；OpenClaw 仅通过 `imsg` 支持 iMessage。请从 [BlueBubbles removal and the imsg iMessage path](/zh/announcements/bluebubbles-imessage) 开始查看简短公告，或参阅 [Coming from BlueBubbles](/zh/channels/imessage-from-bluebubbles) 查看完整的迁移表。</Warning>

状态：原生外部 CLI 集成。Gateway(网关) 生成 `imsg rpc` 并通过 stdio 上的 JSON-RPC 进行通信（无单独的守护进程/端口）。高级操作需要 `imsg launch` 和成功的私有 API 探测。

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

  <Tab title="通过 SSH 连接远程 Mac"OpenClaw>
    OpenClaw 仅需要一个与 stdio 兼容的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

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
    `remoteHost` 必须是 `host` 或 `user@host`OpenClaw（没有空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 运行 `imsg` 的 Mac 上的 Messages 必须已登录。
- 运行 OpenClaw/OpenClaw`imsg` 的进程上下文需要“完全磁盘访问权限”（访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。
- 对于高级操作（回应 / 编辑 / 撤销 / 串联回复 / 特效 / 群组操作），必须禁用系统完整性保护 — 请参阅下方的 [启用 imsg 私有 API](API#enabling-the-imsg-private-api)。基本的文本和媒体发送/接收无需它即可工作。

<Tip>
权限是按进程上下文授予的。如果网关以无头模式运行（LaunchAgent/SSH），请在同一上下文中运行一次交互式命令以触发提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 启用 imsg 私有 API

`imsg` 提供两种操作模式：

- **基础模式**（默认，无需更改 SIP）：通过 `send` 发送出站文本和媒体、入站监视/历史记录、聊天列表。这是您开箱即用从全新的 `brew install steipete/tap/imsg`macOS 加上上述标准 macOS 权限所能获得的功能。
- **Private API 模式**：API`imsg` 将辅助 dylib 注入 `Messages.app` 以调用内部 `IMCore` 函数。这解锁了 `react`、`edit`、`unsend`、`reply`（线程化）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及正在输入指示器和已读回执。

要使用此渠道页面文档中所述的高级操作界面，您需要启用 Private API 模式。API`imsg` README 明确说明了这一要求：

> `read`、`typing`、`launch`、桥接支持的富发送、消息变更和聊天管理等高级功能是可选的。它们需要禁用 SIP 并将辅助 dylib 注入 `Messages.app`。`imsg launch` 在启用 SIP 时拒绝注入。

辅助注入技术使用 `imsg`BlueBubblesOpenClawiMessage 自带的 dylib 来访问 Messages Private API。在 OpenClaw iMessage 路径中没有第三方服务器或 BlueBubbles 运行时。

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

   `imsg status --json` 输出会报告 `bridge_version`、`rpc_methods` 和每个方法的 `selectors`，以便您在开始之前可以看到当前构建支持的内容。

2. **禁用系统完整性保护（System Integrity Protection）。** 这取决于 macOS 版本，因为底层的 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 通过终端禁用 Library Validation，重启进入恢复模式，运行 macOS`csrutil disable`，然后重启。
   - **macOS 11+ (Big Sur 及更高版本)，Intel：** 恢复模式（或网络恢复），macOS`csrutil disable`，然后重启。
   - **macOS 11+、Apple 芯片：** 按住电源键启动进入恢复模式；在最近的 macOS 版本中，点击“继续”时按住 **Left Shift** 键，然后 macOSmacOS`csrutil disable`。虚拟机设置遵循单独的流程 — 请先拍摄 VM 快照。
   - **macOS 26 / Tahoe：** 库验证策略和 macOS`imagent` 私有权限检查已进一步收紧；`imsg` 可能需要更新的构建版本以保持同步。如果在 macOS 主要升级后，`imsg launch` 注入或特定的 `selectors`macOS 开始返回 false，请在假定 SIP 步骤成功之前检查 `imsg` 的发布说明。

   按照 Apple 的恢复模式流程为您的 Mac 禁用 SIP，然后再运行 `imsg launch`。

3. **注入辅助程序。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍处于启用状态时，`imsg launch` 将拒绝注入，因此这也作为确认步骤 2 已完成的手段。

4. **从 OpenClaw 验证网桥：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 iMessage`works`，并且 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true`macOSOpenClaw 以及您的 macOS 版本暴露的任何编辑/输入/已读选择器。OpenClaw 插件在 `actions.ts` 中的按方法过滤仅通告其底层选择器为 `true` 的操作，因此您在代理工具列表中看到的操作面反映了桥接在此主机上实际可以执行的操作。

如果 `openclaw channels status --probe` 将渠道报告为 `works`iMessage，但特定操作在调度时抛出“iMessage `<action>`API 需要 imsg private API 桥接”，请再次运行 `imsg launch` — 辅助程序可能会失效（Messages.app 重启、操作系统更新等），并且缓存的 `available: true` 状态将一直通告操作，直到下一次探测刷新。

### 当您无法禁用 SIP 时

如果对于您的威胁模型而言，禁用 SIP 是不可接受的：

- `imsg` 将回退到基本模式 — 仅支持文本 + 媒体 + 接收。
- OpenClaw 插件仍然通告文本/媒体发送和入站监控；它只是根据每个方法的能力门控，从操作界面中隐藏了 OpenClaw`react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作。
- 您可以运行一台单独的非 Apple Silicon Mac（或专用的机器人 Mac）并关闭 SIP 以处理 iMessage 工作负载，同时在您的主设备上保持 SIP 启用。请参阅下方的[专用机器人 macOS 用户（单独的 iMessage 身份）](iMessagemacOSiMessage#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制直接消息：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目可以是句柄、静态发件人访问组（`accessGroup:<name>`）或聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="Group policy + mentions">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送者白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送者访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`iMessage，iMessage 群组发送者检查会在可用时回退到 `allowFrom`。
    运行时注意：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有**两个**背靠背运行的白名单门控，并且两者都必须通过：

    1. **发送者 / 聊天目标白名单**（`channels.imessage.groupAllowFrom`）— handle、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）— 使用 `groupPolicy: "allowlist"` 时，此门控需要一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者在 `groups` 下有明确的每个 `chat_id` 的条目。

    如果门控 2 中没有任何内容，则每条群组消息都会被丢弃。插件在默认日志级别发出两个 `warn` 级别的信号：

    - 启动时每个账户一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信（私信）继续工作，因为它们采用不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组流转的最低配置：

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

    如果网关日志中出现那些 `warn` 行，说明门控 2 正在丢弃消息 — 请添加 `groups`iMessage 块。
    </Warning>

    群组的提及门控：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及门控

    来自授权发送者的控制命令可以在群组中绕过提及门控。

    每个群组的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组中消息的每一轮中被注入到 Agent 的系统提示词中。解析逻辑镜像了 `channels.whatsapp.groups` 使用的每个群组提示词解析：

    1. **特定群组系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，并且不向该群组应用系统提示词。
    2. **群组通配符系统提示词**（`groups["*"].systemPrompt`）：当映射中完全不存在特定群组条目，或者存在但未定义 `systemPrompt` 键时使用。

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

    每个群组的提示词仅适用于群组消息 — 此渠道中的直接消息不受影响。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`iMessage，iMessage 私信会合并到代理主会话中。
    - 群组会话是隔离的（`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage）。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    一些多参与者 iMessage 线程可能带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被显式配置，OpenClaw 会将其视为群组流量（群组 gating + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 该同一 iMessage 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会原地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

通过包含 `type: "acp"` 和 `match.channel: "imessage"` 的顶级 `bindings[]` 条目支持配置的持久绑定。

`match.peer.id` 可以使用：

- 规范化的私信句柄，例如 `+15555550123` 或 `user@example.com`
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
  <Accordion title="macOSiMessageDedicated bot macOS user (separate iMessage identity)"macOSmacOS>
    使用专用的 Apple ID 和 macOS 用户，以便将机器人流量与您的个人信息资料隔离开来。

    典型流程：

    1. 创建/登录一个专用的 macOS 用户。
    2. 在该用户中使用机器人的 Apple ID 登录信息。
    3. 在该用户中安装 `imsg`OpenClaw。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该机器人用户会话中进行 GUI 批准（自动化 + 完全磁盘访问权限）。

  </Accordion>

  <Accordion title="TailscaleRemote Mac over Tailscale (example)"LinuxiMessage>
    常见拓扑结构：

    - gateway 运行在 Linux/VM 上
    - iMessage + `imsg` 运行在您 tailnet 中的 Mac 上
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

  <Accordion title="Multi-account pattern"iMessage>
    iMessage 支持在 `channels.imessage.accounts` 下进行按账户配置。

    每个账户都可以覆盖诸如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根目录允许列表等字段。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取**默认关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发到代理。如果禁用，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能根本不会产生 `Inbound message` 日志行。
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
      - `newline` (段落优先分割)

  </Accordion>

  <Accordion title="地址格式">
    首选显式目标：

    - `chat_id:123` (推荐用于稳定路由)
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

## 私有 API 操作

当 `imsg launch` 正在运行且 `openclaw channels status --probe` 报告 `privateApi.available: true`iMessage 时，消息工具除了正常的文本发送外，还可以使用 iMessage 原生操作。

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
    - **react**：添加/移除 iMessage 点赞/回应（`messageId`、`emoji`、`remove`）。支持的点赞/回应映射为爱、喜欢、不喜欢、大笑、强调和疑问。
    - **reply**：对现有消息发送 threaded reply（线程回复）（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`iMessage）。
    - **sendWithEffect**：发送带有 iMessage 特效的文本（`text` 或 `message`，`effect` 或 `effectId`macOSAPI）。
    - **edit**：在支持的 macOS/private API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`macOSAPI）。
    - **unsend**：在支持的 macOS/private API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**：发送媒体/文件（`buffer` 作为 base64 或 hydrated `media`/`path`/`filePath`，`filename`，可选 `asVoice`）。旧版别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组对话时管理群组聊天。

  </Accordion>

  <Accordion title="Message IDs"iMessage>
    入站 iMessage 上下文在可用时包含简短的 `MessageSid` 值和完整的消息 GUID。简短 ID 的作用域是最近的内存回复缓存，并在使用前针对当前聊天进行检查。如果简短 ID 已过期或属于另一个聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection"OpenClawAPI>
    OpenClaw 仅在缓存探测状态显示桥接不可用时，才隐藏私有 API 操作。如果状态未知，操作保持可见并延迟分发探测，以便第一个操作可以在 `imsg launch` 之后成功，而无需单独手动刷新状态。

  </Accordion>

  <Accordion title="Read receipts and typing"API>
    当私有 API 桥接运行时，接受的入站聊天在分发前会被标记为已读，并且在代理生成内容时会向发送者显示输入气泡。要禁用已读标记，请使用：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于基于方法的特性列表的旧版 `imsg`OpenClaw 构建版本将静默阻止输入/已读状态；OpenClaw 会在每次重启时记录一次警告，以便追溯缺失的回执。

  </Accordion>

  <Accordion title="Inbound tapbacks"OpenClawiMessage>
    OpenClaw 订阅 iMessage 点回（tapbacks），并将接受的反应作为系统事件而非普通消息文本进行路由，因此用户点回不会触发普通的回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"` (默认)：仅当用户对机器人发送的消息做出反应时通知。
    - `"all"`：通知来自授权发送者的所有入站点回。
    - `"off"`：忽略入站点回。

    每个账户的覆盖设置使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许由渠道发起的配置写入（在 `commands.config: true` 时针对 iMessage`/config set|unset`）。

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

## 合并拆分发送的私信（在一个组合中包含命令 + URL）

当用户同时输入命令和 URL 时 —— 例如 `Dump https://example.com/article` —— Apple 的“信息”应用会将发送拆分为 **两条单独的 `chat.db` 记录**：

1. 一条文本消息（`"Dump"`）。
2. 带有 OG 预览图片作为附件的 URL 预览气泡 (`"https://..."`)。

在大多数设置中，这两行内容到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果没有合并，代理会在第 1 轮单独收到命令，进行回复（通常是“发送 URL 给我”），然后才在第 2 轮看到 URL —— 此时命令上下文已经丢失。这是 Apple 的发送流水线造成的，而不是 OpenClaw 或 OpenClawOpenClaw`imsg` 引入的。

`channels.imessage.coalesceSameSenderDms` 将私信设为将连续的同发送者行合并到单个代理轮次。群聊继续按消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 你发布的技能期望 `command + payload` 在一条消息中（转储、粘贴、保存、队列等）。
    - 你的用户会在命令旁粘贴 URL、图片或长内容。
    - 你可以接受增加的私信轮次延迟（见下文）。

    在以下情况下保持禁用：

    - 你需要针对单字私信触发器的最低命令延迟。
    - 你的所有流程都是一次性命令，没有后续内容。

  </Tab>
  <Tab title="启用方法">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    开启该标志且没有显式设置 `messages.inbound.byChannel.imessage` 时，去抖动窗口将扩大到 **2500 ms**（旧版默认为 0 ms —— 不去抖动）。需要更宽的窗口，是因为 Apple 0.8-2.0 秒的拆分发送节奏无法适应更紧凑的默认设置。

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
  <Tab title="权衡">
    - **私信消息延迟增加。** 开启该标志后，每条私信（包括独立控制命令和单文本后续）在发送前最多等待防抖窗口期，以防有负载数据行到来。群聊消息保持即时发送。
    - **合并输出有限制。** 合并文本上限为 4000 个字符，并带有明确的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留最早和最新的）。每个源 GUID 都在 `coalescedMessageGuids` 中跟踪，用于下游遥测。
    - **仅限私信。** 群聊消息回退到逐消息发送，以便在多人输入时保持机器人响应灵敏。
    - **可选，按渠道。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置了 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景及 Agent 看到的内容

| 用户输入                                          | `chat.db` 生成         | 标志关闭（默认）                        | 标志开启 + 2500 毫秒窗口                                |
| ------------------------------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 行，间隔约 1 秒      | 两次 Agent 回合：先是“Dump”，然后是 URL | 一次回合：合并文本 `Dump https://example.com`           |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 行                   | 两次回合（合并时丢弃附件）              | 一次回合：文本 + 图片保留                               |
| `/status`（独立命令）                             | 1 行                   | 即时发送                                | **最多等待窗口期，然后发送**                            |
| 单独粘贴 URL                                      | 1 行                   | 即时发送                                | 即时发送（桶中仅有一条）                                |
| 文本 + URL 作为两条刻意分开的消息发送，间隔数分钟 | 2 行，超出窗口期       | 两次回合                                | 两次回合（窗口期在两者之间过期）                        |
| 快速连发（窗口期内超过 10 条小私信）              | N 行                   | N 次回合                                | 一次回合，输出受限（保留最早和最新，应用文本/附件上限） |
| 两人在群聊中输入                                  | 来自 M 个发送者的 N 行 | M+ 次回合（每个发送者桶一次）           | M+ 次回合 — 群聊不会合并                                |

## 网关停机后的追赶

当网关离线（崩溃、重启、Mac 休眠、机器关机）时，网关恢复后会从当前的 `chat.db` 状态恢复 `imsg watch` —— 默认情况下，在此期间到达的任何消息都不会被看到。追赶功能会在下次启动时重放这些消息，以确保 Agent 不会静默地错过入站流量。

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

每次 `monitorIMessageProvider` 启动时执行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时分发循环。追赶功能本身针对 `imsg watch` 使用的同一 JSON-RPC 客户端使用 `chats.list` + 每个聊天的 `messages.history`。在追赶过程中到达的任何消息都会正常通过实时分发流程；现有的入站去重缓存会吸收与重放行的任何重叠。

每条重放行都会通过实时分发路径（`evaluateIMessageInbound` + `dispatchInboundMessage`）进行馈送，因此允许列表、群组策略、去抖动器、回显缓存和已读回执在重放消息和实时消息上的表现完全一致。

### 游标和重试语义

追赶功能在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 处保持每个帐户的游标（OpenClaw 状态目录默认为 `~/.openclaw`，可通过 `OPENCLAW_STATE_DIR` 覆盖）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游标在每次成功分发时前进，并在某行的分发引发错误时保持不变 —— 下次启动时会从保持的游标重试同一行。
- 在对同一个 `guid` 连续 `maxFailureRetries` 次引发错误后，追赶功能会记录一条 `warn` 并强制将游标前进到卡住的消息之后，以便后续启动能够继续进行。
- 已放弃的 guid 在后续运行中会被立即跳过（不尝试分发），并在运行摘要中计入 `skippedGivenUp`。

### 操作员可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

如果出现 `WARN ... capped to perRunLimit` 行，意味着单次启动没有处理完全部积压。如果您的中断期经常超过默认的 50 行处理量，请提高 `perRunLimit`（最大 500）。

### 何时将其保持关闭

- Gateway(网关) 持续运行并带有看门狗自动重启功能，且间隔始终小于几秒 —— 默认的关闭状态即可。
- 私信量较低，且遗漏的消息不会改变 Agent 的行为 —— `firstRunLookbackMinutes` 初始窗口可能会在首次启用时分发令人意外的旧上下文。

当您开启追忆功能时，首次没有光标启动时只会回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口 —— 这可以避免重放启用前的大量历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="RPC找不到 imsg 或不支持 RPC"RPC>
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```RPC

    如果探测报告不支持 RPC，请更新 `imsg`API。如果私有 API 操作不可用，请在登录的 macOS 用户会话中运行 `imsg launch`macOSGateway(网关)macOS 并再次探测。如果 Gateway(网关) 未在 macOS 上运行，请使用上述通过 SSH 连接远程 Mac 的设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关)macOSGateway(网关) 未在 macOS 上运行">
    默认的 `cliPath: "imsg"`LinuxWindows 必须在登录了 Messages 的 Mac 上运行。在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 设置为通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的包装脚本。

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

  <Accordion title="忽略群组消息">
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
    - 从 Gateway 主机发起的 SSH/SCP 密钥认证
    - Gateway 主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOS错过了 macOS 权限提示">
    在同一用户/会话上下文中以交互式 GUI 终端重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    确认运行 OpenClaw/`imsg` 的进程上下文已授予完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Gateway 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对](/en/channels/pairing)

## 相关内容

- [频道概览](/en/channels) — 所有支持的频道
- [BlueBubbles 移除及 imsg iMessage 路径](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — 公告和迁移摘要
- [从 BlueBubbles 迁移](BlueBubbles/en/channels/imessage-from-bluebubbles) — 配置转换表和逐步切换
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及限制
- [频道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
