---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）实现原生 iMessage 支持，包含用于回复、轻触回应、特效、附件和群组管理的私有 API 操作。当主机要求符合时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 `imsg`。如果您的 Gateway(网关) 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg` 的 SSH 封装器。

**Gateway(网关) 停机期间的追赶是可选的。** 启用后 (`channels.imessage.catchup.enabled: true`)，网关会在下次启动时重放其在离线期间（崩溃、重启、Mac 休眠）到达 `chat.db` 的入站消息。默认禁用 — 请参阅 [网关停机后的追赶](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>已移除对 BlueBubbles 的支持。请将 `channels.bluebubbles` 配置迁移到 `channels.imessage`；OpenClaw 仅通过 `imsg` 支持 iMessage。请先阅读 [BlueBubbles 移除与 imsg iMessage 路径](/zh/announcements/bluebubbles-imessage) 了解简短公告，或阅读 [从 BlueBubbles 迁移](/zh/channels/imessage-from-bluebubbles) 查看完整的迁移对照表。</Warning>

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
- 对于高级操作（反应 / 编辑 / 撤销 / 串接回复 / 特效 / 群组操作），必须禁用系统完整性保护 (System Integrity Protection) — 请参阅下方的 [启用 imsg 专用 API](#enabling-the-imsg-private-api)。基本的文本和媒体发送/接收无需禁用即可工作。

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
- 您可以运行一台单独的非 Apple Silicon Mac（或专用的机器人 Mac），关闭 SIP 以处理 iMessage 工作负载，同时在您的主设备上保持 SIP 开启。请参阅下方的 [专用机器人 macOS 用户（独立的 iMessage 身份）](#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须标识发送者：句柄或静态发送者访问组（`accessGroup:<name>`）。对 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 等聊天目标使用 `channels.imessage.groupAllowFrom`；对数字 `chat_id` 注册表项键使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送方白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送方访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送方检查将使用 `allowFrom`；当私信和群组准入规则不同时，请设置 `groupAllowFrom`。
    运行时注意：如果完全缺少 `channels.imessage`，运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有**两个**串行运行的白名单关卡，两者都必须通过：

    1. **发送方 / 聊天目标白名单**（`channels.imessage.groupAllowFrom`）——句柄、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）——对于 `groupPolicy: "allowlist"`，此关卡需要一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者在 `groups` 下有一个明确的 `chat_id` 条目。

    如果关卡 2 中没有任何内容，每条群组消息都将被丢弃。插件在默认日志级别发出两个 `warn` 级别的信号：

    - 启动时每个账户一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信继续工作，因为它们采用不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组畅通的最低配置：

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

    群组的提及控制：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及控制

    来自授权发送方的控制命令可以在群组中绕过提及控制。

    每个群组的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组中消息的每一轮时注入到代理的系统提示词中。解析逻辑镜像了 `channels.whatsapp.groups` 使用的每个群组提示词解析：

    1. **群组特定系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，并且该群组不应用系统提示词。
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

    每个群组的提示词仅适用于群组消息——此渠道中的直接消息不受影响。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`iMessage，iMessage 私信会合并到代理主会话中。
    - 群组会话是隔离的 (`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage)。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组的会话行为：

    一些多参与者的 iMessage 会话可能带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被显式配置，OpenClaw 会将其视为群组流量（群组筛选 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群组聊天中运行 `/acp spawn codex --bind here`。
- 该同一 iMessage 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

支持通过顶层 `bindings[]` 条目配置持久绑定，其中包含 `type: "acp"` 和 `match.channel: "imessage"`。

`match.peer.id` 可以使用：

- 标准化私信句柄，例如 `+15555550123` 或 `user@example.com`
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
    使用专用的 Apple ID 和 macOS 用户，以便将 bot 流量与您的个人 Messages 个人资料隔离。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户中使用 bot 的 Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`OpenClaw。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该 bot 用户会话中进行 GUI 批准（自动化 + 完全磁盘访问）。

  </Accordion>

  <Accordion title="Tailscale通过 Tailscale 远程连接 Mac（示例）"LinuxiMessage>
    常见拓扑结构：

    - gateway 运行在 Linux/VM 上
    - iMessage + `imsg` 运行在您 tailnet 中的 Mac 上
    - `cliPath` 包装器使用 SSH 运行 `imsg`
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
    iMessage 支持 `channels.imessage.accounts` 下的按账户配置。

    每个账户都可以覆盖字段，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根允许列表。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取功能**默认关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发给代理。如果禁用此功能，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能根本不会产生 `Inbound message` 日志行。
    - 当设置 `remoteHost` 时，可以通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格的主机密检查（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）

  </Accordion>

  <Accordion title="出站分块">
    - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.chunkMode`
      - `length`（默认）
      - `newline`（段落优先拆分）

  </Accordion>

  <Accordion title="寻址格式">
    首选的显式目标：

    - `chat_id:123`（建议用于稳定路由）
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

当 `imsg launch` 正在运行且 `openclaw channels status --probe` 报告 `privateApi.available: true`iMessage 时，消息工具可以使用 iMessage 原生操作以及普通文本发送。

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
    - **react**: 添加/移除 iMessage 点赞/轻触回应（`messageId`、`emoji`、`remove`）。支持的轻触回应映射为爱心、点赞、不喜欢、大笑、强调和疑问。
    - **reply**: 对现有消息发送线程回复（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`iMessage）。
    - **sendWithEffect**: 发送带有 iMessage 特效的文本（`text` 或 `message`、`effect` 或 `effectId`macOSAPI）。
    - **edit**: 在支持的 macOS/专用 API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`macOSAPI）。
    - **unsend**: 在支持的 macOS/专用 API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**: 发送媒体/文件（`buffer` 为 base64 或已水合的 `media`/`path`/`filePath`、`filename`、可选的 `asVoice`）。旧版别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**: 当当前目标是群组对话时，管理群组聊天。

  </Accordion>

  <Accordion title="消息 ID"iMessage>
    入站 iMessage 上下文在可用时包含短 `MessageSid` 值和完整的消息 GUID。短 ID 的作用域是最近的内存中回复缓存，并在使用前根据当前聊天进行检查。如果短 ID 已过期或属于其他聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection"OpenClawAPI>
    OpenClaw 仅当缓存探测状态显示桥接不可用时，才会隐藏私有 API 操作。如果状态未知，操作仍然可见，并延迟调度探测，以便第一个操作可以在 `imsg launch` 之后成功，而无需单独的手动状态刷新。

  </Accordion>

  <Accordion title="Read receipts and typing"API>
    当私有 API 桥接启用时，接受的入站聊天会在调度前被标记为已读，并且在代理生成内容时向发送者显示正在输入气泡。可以通过以下方式禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法功能列表的旧版 `imsg`OpenClaw 构建版本将静默阻断正在输入/已读功能；OpenClaw 会在每次重启时记录一次性警告，以便将丢失的回执归因于此。

  </Accordion>

  <Accordion title="Inbound tapbacks"OpenClawiMessage>
    OpenClaw 订阅 iMessage 点回（tapbacks），并将接受的反应作为系统事件而非普通消息文本进行路由，因此用户点回不会触发普通的回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅当用户对机器人发送的消息做出反应时通知。
    - `"all"`：通知来自授权发送者的所有入站点回。
    - `"off"`：忽略入站点回。

    每个账户的覆盖设置使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许渠道发起的配置写入（用于 iMessage`/config set|unset` 在 `commands.config: true` 时）。

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

当用户同时输入命令和 URL 时（例如 `Dump https://example.com/article`），Apple 的“信息”应用会将发送内容拆分为 **两个单独的 `chat.db` 行**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中包含 OG 预览图片作为附件。

在大多数设置中，这两行数据到达 OpenClaw 的时间间隔约为 0.8-2.0 秒。如果没有合并，代理会在第一轮单独收到命令，回复（通常是“发送 URL 给我”），然后在第二轮才看到 URL —— 此时命令上下文已经丢失。这是 Apple 的发送管道，而不是 OpenClaw 或 `imsg` 引入的任何机制造成的。

`channels.imessage.coalesceSameSenderDms` 将私信设为将连续的同一发送者行合并到单个代理轮次中。群聊继续按消息分派，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况启用：

    - 你发布的技能期望 `command + payload` 出现在一条消息中（转储、粘贴、保存、队列等）。
    - 你的用户在命令旁粘贴 URL、图片或长内容。
    - 你可以接受增加的私信轮次延迟（见下文）。

    在以下情况保持禁用：

    - 你需要针对单字私信触发器的最小命令延迟。
    - 你的所有流程都是没有后续负载的一次性命令。

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

    开启该标志且未指定明确的 `messages.inbound.byChannel.imessage` 时，去抖动窗口将扩大至 **2500 ms**（旧版默认值为 0 ms —— 即无去抖动）。需要更宽的窗口，是因为 Apple 的拆分发送节奏（0.8-2.0 s）无法适应更紧凑的默认值。

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
    - **私信消息增加了延迟。** 开启该标志后，每条私信（包括独立的控制命令和单条文本的后续跟进）在发送前最多等待去抖动窗口的时间，以防有负载数据行到达。群聊消息保持即时发送。
    - **合并输出是有界的。** 合并后的文本上限为 4000 个字符，并带有显式的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留最早和最新的）。每个源 GUID 都会在 `coalescedMessageGuids` 中跟踪，用于下游遥测。
    - **仅限私信。** 群聊消息仍按单条消息发送，以便当多人正在输入时，机器人保持响应。
    - **按渠道选择性启用。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置了 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景及 Agent 看到的内容

| 用户输入                                          | `chat.db` 产生         | 标志关闭（默认）                        | 标志开启 + 2500 毫秒窗口                                |
| ------------------------------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 行，间隔约 1 秒      | 两次 Agent 回合：先是“Dump”，然后是 URL | 一轮：合并的文本 `Dump https://example.com`             |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 行                   | 两次回合（合并时丢弃附件）              | 一次回合：文本 + 图片保留                               |
| `/status`（独立命令）                             | 1 行                   | 即时发送                                | **最多等待窗口期，然后发送**                            |
| 单独粘贴 URL                                      | 1 行                   | 即时发送                                | 即时发送（桶中仅有一条）                                |
| 文本 + URL 作为两条刻意分开的消息发送，间隔数分钟 | 2 行，超出窗口期       | 两次回合                                | 两次回合（窗口期在两者之间过期）                        |
| 快速连发（窗口期内超过 10 条小私信）              | N 行                   | N 次回合                                | 一次回合，输出受限（保留最早和最新，应用文本/附件上限） |
| 两人在群聊中输入                                  | 来自 M 个发送者的 N 行 | M+ 次回合（每个发送者桶一次）           | M+ 次回合 — 群聊不会合并                                |

## 网关停机后的追赶

当网关处于离线状态（崩溃、重启、Mac 休眠、机器关机）时，一旦网关重新上线，`imsg watch` 会从当前的 `chat.db` 状态恢复 —— 默认情况下，在离线期间到达的任何消息都不会被看到。Catchup（追平）功能会在下次启动时重放这些消息，以确保代理不会静默地错过入站流量。

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

每次 `monitorIMessageProvider` 启动时运行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时发送循环。Catchup 本身使用 `chats.list` + 针对每个聊天的 `messages.history`，通过 使用的同一 JSON-RPC`imsg watch` 客户端进行操作。在 Catchup 过程中到达的任何消息都会正常通过实时发送流程；现有的入站去重缓存会吸收与重放行的任何重叠部分。

每个重播的行都会通过实时分发路径（`evaluateIMessageInbound` + `dispatchInboundMessage`）进行处理，因此允许列表、群组策略、去抖动器、回显缓存和已读回执在重播消息和实时消息上的行为完全一致。

### 游标和重试语义

Catchup 会在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json`OpenClaw 处为每个账户保留一个游标（OpenClaw 状态目录默认为 `~/.openclaw`，可通过 `OPENCLAW_STATE_DIR` 覆盖）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 游标在每次成功分发时前进，并在某行的分发引发错误时保持不变 —— 下次启动时会从保持的游标重试同一行。
- 在对同一个 `guid` 连续抛出 `maxFailureRetries` 次异常后，catchup 会记录一条 `warn` 并强制推进游标，使其跳过卡住的消息，以便后续启动时能够继续进行。
- 在后续运行中，已放弃的 guid 会被跳过（不尝试分发），并在运行摘要中计入 `skippedGivenUp`。

### 操作员可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行意味着单次启动未能处理完整个积压工作。如果您的缺口定期超过默认的 50 行传递限制，请调高 `perRunLimit`（最大 500）。

### 何时将其保持关闭

- Gateway(网关) 持续运行并带有看门狗自动重启功能，且间隔始终小于几秒 —— 默认的关闭状态即可。
- 私信量很低，且遗漏的消息不会改变代理行为 —— `firstRunLookbackMinutes` 初始窗口可能会在首次启用时分发令人惊讶的旧上下文。

当您开启 catchup 时，第一次没有游标的启动只会回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口 —— 这避免了重播启用前的长历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="RPCimsg not found or RPC unsupported"RPC>
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```RPC

    如果探测报告 RPC 不支持，请更新 `imsg`API。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch`macOSGateway(网关)macOS 并再次探测。如果 Gateway 未运行在 macOS 上，请使用上面的 Remote Mac over SSH 设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关)macOSGateway(网关) 未在 macOS 上运行">
    默认的 `cliPath: "imsg"`LinuxWindows 必须在登录了 Messages 的 Mac 上运行。在 Linux 或 Windows 上，将 `channels.imessage.cliPath` 设置为一个通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的包装脚本。

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
    - 从 Gateway(网关) 主机进行的 SSH/SCP 密钥身份验证
    - Gateway(网关) 主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOSmacOS 权限提示被遗漏">
    在相同的用户/会话上下文中，以交互式 GUI 终端重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    确认授予运行 OpenClaw/`imsg` 的进程上下文完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对 (Pairing)](/en/channels/pairing)

## 相关内容

- [频道概览 (Channels Overview)](/en/channels) — 所有支持的频道
- [移除 BlueBubbles 与 imsg iMessage 路径](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — 公告和迁移摘要
- [从 BlueBubbles 迁移](BlueBubbles/en/channels/imessage-from-bluebubbles) — 配置转换表和分步切换指南
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及控制
- [通道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
