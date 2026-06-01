---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）实现原生 iMessage 支持，包含用于回复、轻触回应、特效、附件和群组管理的私有 API 操作。当主机要求符合时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 OpenClawiMessage`imsg`macOSGateway(网关)LinuxWindows。如果您的 Gateway(网关) 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg`Gateway(网关) 的 SSH 包装器。

**Gateway(网关) 停机期间的追赶是可选的。** 启用后（`channels.imessage.catchup.enabled: true`），Gateway(网关) 会在下次启动时重放它离线期间（崩溃、重启、Mac 休眠）落入 `chat.db` 的入站消息。默认禁用 —— 请参阅 [Catching up after gateway downtime](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>
  BlueBubbles 支持已被移除。请将 BlueBubbles`channels.bluebubbles` 配置迁移到 `channels.imessage`OpenClawiMessage；OpenClaw 仅通过 `imsg`BlueBubblesiMessage 支持 iMessage。请参阅 [BlueBubbles removal and the imsg iMessage path](/zh/announcements/bluebubbles-imessageBlueBubbles) 了解简短公告，或参阅 [Coming from BlueBubbles](/zh/channels/imessage-from-bluebubbles) 查看完整的迁移表。
</Warning>

状态：原生外部 CLI 集成。Gateway(网关) 会生成 CLIGateway(网关)`imsg rpc`RPC 并通过 stdio 上的 JSON-RPC 进行通信（无单独的守护进程/端口）。高级操作需要 `imsg launch`API 以及成功的私有 API 探测。

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
    OpenClaw 仅需要一个兼容 stdio 的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的包装脚本。

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

    如果未设置 `remoteHost`OpenClaw，OpenClaw 会尝试通过解析 SSH 包装脚本来自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`OpenClaw（不能有空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密检查，因此中继主机密必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

<Warning>
任何放在 `imsg`RPCOpenClawRPC 之前的 `cliPath` 包装器或 SSH 代理都必须表现得像一个用于长生命周期 JSON-RPC 的透明 stdio 管道。OpenClaw 在该渠道的生命周期内，通过包装器的 stdin/stdout 交换小型的以换行符分隔的 JSON-RPC 消息：

- 一旦有字节可用，立即转发每个 stdin 块/行 —— 不要等待 EOF。
- 及时反向转发每个 stdout 块/行。
- 保留换行符。
- 避免固定的阻塞读取（`read(4096)`、`cat | buffer`、默认 shell `read`RPCiMessage），这可能会导致小帧饿死。
- 将 stderr 与 JSON-RPC stdout 流分开。

如果包装器将 stdin 缓冲直到填满一个大块，则会产生看起来像 iMessage 故障的症状 —— `imsg rpc timeout (chats.list)` 或渠道反复重启 —— 即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`OpenClaw（上文）是安全的，因为它转发 OpenClaw 的 `cliPath` 参数，如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 这样的管道则不行 —— 行缓冲工具仍然可能保留帧；如果必须进行过滤，请在每个阶段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 运行 `imsg` 的 Mac 上的 Messages 必须已登录。
- 运行 OpenClaw/OpenClaw`imsg` 的进程上下文需要“完全磁盘访问权限”（用于访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。
- 对于高级操作（反应 / 编辑 / 撤销 / 串联回复 / 特效 / 群组操作），必须禁用系统完整性保护（System Integrity Protection）—— 请参阅下方的 [启用 imsg 私有 API](API#enabling-the-imsg-private-api)。没有它也可以进行基本的文本和媒体发送/接收。

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

- **基本模式**（默认，无需更改 SIP）：通过 `send` 发送出站文本和媒体，入站监视/历史记录，聊天列表。这是通过全新的 `brew install steipete/tap/imsg`macOS 加上上述标准 macOS 权限即可获得的现成功能。
- **私有 API 模式**：API`imsg` 将辅助 dylib 注入 `Messages.app` 以调用内部 `IMCore` 函数。这正是解锁 `react`、`edit`、`unsend`、`reply`（串联）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及正在输入指示器和已读回执的方式。

要实现此渠道页面所述的高级操作界面，您需要私有 API 模式。API`imsg` README 明确说明了这一要求：

> 高级功能（如 `read`、`typing`、`launch`、桥接支持的高级发送、消息变体和聊天管理）是可选的。它们要求禁用 SIP 并将辅助 dylib 注入 `Messages.app`。`imsg launch` 在启用 SIP 时拒绝注入。

辅助注入技术使用 `imsg`BlueBubblesOpenClawiMessage 自带的 dylib 来访问 Messages 私有 API。在 OpenClaw iMessage 路径中没有第三方服务器或 BlueBubbles 运行时。

<Warning>
**禁用 SIP 是一个真正的安全权衡。** SIP 是 macOS 防止运行修改后的系统代码的核心保护措施之一；在系统范围内关闭它会开辟额外的攻击面和副作用。值得注意的是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在 Mac 上安装和运行 iOS 应用的能力**。

请将此视为深思熟虑的操作选择，而不是默认选项。如果您的威胁模型无法容忍 SIP 被关闭，捆绑的 iMessage 将仅限于基本模式——仅支持文本和媒体发送/接收，没有反应 / 编辑 / 撤销 / 特效 / 群组操作。

</Warning>

### 设置

1. **在运行 Messages.app 的 Mac 上安装（或升级） `imsg`：**

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 输出会报告 `bridge_version`、`rpc_methods` 和每个方法的 `selectors`，以便您在开始之前了解当前构建支持的内容。

2. **禁用系统完整性保护（System Integrity Protection）。** 这取决于 macOS 版本，因为底层的 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 通过终端禁用库验证，重启进入恢复模式，运行 macOS`csrutil disable`，然后重启。
   - **macOS 11+ (Big Sur 及更高版本)，Intel：** 恢复模式（或网络恢复），macOS`csrutil disable`，重启。
   - **macOS 11+，Apple Silicon：** 使用电源键启动序列进入恢复模式；在最近的 macOS 版本中，点击“继续”时按住 **Left Shift** 键，然后 macOSmacOS`csrutil disable`。虚拟机设置遵循单独的流程 — 请先拍摄 VM 快照。
   - **macOS 26 / Tahoe：** 库验证策略和 macOS`imagent` 私有授权检查已进一步收紧；`imsg` 可能需要更新的构建才能跟上。如果在 macOS 主要升级后，`imsg launch` 注入或特定的 `selectors`macOS 开始返回 false，请在假设 SIP 步骤成功之前检查 `imsg` 的发布说明。

   请遵循 Apple 为您的 Mac 提供的恢复模式流程，在运行 `imsg launch` 之前禁用 SIP。

3. **注入辅助程序。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍处于启用状态时，`imsg launch` 将拒绝注入，因此这也可以作为已执行第 2 步的确认。

4. **从 OpenClaw 验证网桥：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 iMessage`works`，而 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true`macOSOpenClaw 以及您的 macOS 版本所暴露的任何编辑 / 输入 / 已读选择器。`actions.ts` 中的 OpenClaw 插件按方法过滤（gating）仅通告其基础选择器为 `true` 的操作，因此您在代理工具列表中看到的操作面反映了该网桥在此主机上实际能执行的操作。

如果 `openclaw channels status --probe` 报告渠道为 `works`iMessage，但特定操作在分派时抛出“iMessage `<action>`API 需要 imsg private API 网桥”，请再次运行 `imsg launch` —— 辅助工具可能会失效（Messages.app 重启、系统更新等），并且缓存的 `available: true` 状态会继续通告操作，直到下一次探测刷新。

### 当您无法禁用 SIP 时

如果对于您的威胁模型而言，禁用 SIP 是不可接受的：

- `imsg` 将回退到基本模式 —— 仅支持文本 + 媒体 + 接收。
- OpenClaw 插件仍然通告文本/媒体发送和入站监控；它只是从操作面中隐藏了 OpenClaw`react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和组操作（根据按方法功能过滤）。
- 您可以在一台独立的非 Apple Silicon Mac（或专用机器人 Mac）上关闭 SIP 以运行 iMessage 工作负载，同时在您的主设备上保持 SIP 开启。请参阅下方的 [Dedicated bot macOS user (separate iMessage identity)](iMessagemacOSiMessage#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信政策">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing` （默认）
    - `allowlist`
    - `open` （要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须标识发送者：句柄或静态发送者访问组（`accessGroup:<name>`）。对 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*` 等聊天目标使用 `channels.imessage.groupAllowFrom`；对数字 `chat_id` 注册表项使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发送方白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送方访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`iMessage，iMessage 组发送方检查将使用 `allowFrom`；当私信和组准入规则不同时，请设置 `groupAllowFrom`。
    运行时注意：如果完全缺少 `channels.imessage`，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有 **两个** 串行运行的白名单关卡，两者都必须通过：

    1. **发送方 / 聊天目标白名单**（`channels.imessage.groupAllowFrom`）— handle、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）— 启用 `groupPolicy: "allowlist"` 后，此关卡需要一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者在 `groups` 下有一个明确的 per-`chat_id` 条目。

    如果关卡 2 中没有任何内容，每条群组消息都将被丢弃。插件在默认日志级别发出两个 `warn` 级别的信号：

    - 启动时每个账号一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信可以继续工作，因为它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组消息流动的最小配置：

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

    如果这些 `warn` 行出现在网关日志中，说明关卡 2 正在丢弃消息 — 请添加 `groups`iMessage 块。
    </Warning>

    群组的提及限制：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及限制

    来自授权发送方的控制命令可以在群组中绕过提及限制。

    每个群组的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组消息的每一轮对话中注入到 Agent 的系统提示词中。解析过程镜像了 `channels.whatsapp.groups` 使用的每群组提示词解析逻辑：

    1. **特定群组的系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目 **并且** 定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则抑制通配符且不对该群组应用系统提示词。
    2. **群组通配符系统提示词**（`groups["*"].systemPrompt`）：当映射中完全不存在特定群组条目时，或者条目存在但未定义 `systemPrompt` 键时使用。

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

    每群组提示词仅适用于群组消息 — 此渠道中的直接消息不受影响。

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`iMessage，iMessage 私信会合并到代理主会话中。
    - 群组会话是隔离的（`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage）。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    一些多参与者的 iMessage 线程可能会附带 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被明确配置，OpenClaw 会将其视为群组流量（群组过滤 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群聊中运行 `/acp spawn codex --bind here`。
- 该同一 iMessage 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 在原位重置相同的绑定 ACP 会话。
- `/acp close` 关闭 ACP 会话并移除绑定。

通过具有 `type: "acp"` 和 `match.channel: "imessage"` 的顶级 `bindings[]` 条目，支持配置的持久绑定。

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
    2. 在该用户中使用机器人 Apple ID 登录信息。
    3. 在该用户中安装 `imsg`OpenClaw。
    4. 创建 SSH 封装程序，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该机器人用户会话中进行 GUI 批准（自动化 + 完全磁盘访问）。

  </Accordion>

  <Accordion title="Tailscale通过 Tailscale 远程连接 Mac（示例）"LinuxiMessage>
    常见拓扑：

    - 网关运行在 Linux/VM 上
    - iMessage + `imsg` 运行在您的 tailnet 中的 Mac 上
    - `cliPath` 封装程序使用 SSH 运行 `imsg`
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

  <Accordion title="私信历史">
    设置 `channels.imessage.dmHistoryLimit` 以使用该对话最近解码的 `imsg` 历史记录来为新的私信会话提供种子。使用 `channels.imessage.dms["<sender>"].historyLimit` 进行针对每个发送者的覆盖设置，包括 `0`iMessage 以禁用某个发送者的历史记录。

    iMessage 私信历史记录是根据需要从 `imsg` 获取的。保留 `dmHistoryLimit` 未设置状态将禁用全局私信历史记录种子，但一个正数的针对每个发送者的 `channels.imessage.dms["<sender>"].historyLimit` 仍然会为该发送者启用种子。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取默认为**关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发给代理。如果禁用此功能，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能根本不会产生任何 `Inbound message` 日志行。
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
      - `newline` (优先按段落拆分)

  </Accordion>

  <Accordion title="Addressing formats">
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

## 私有 API 动作

当 `imsg launch` 正在运行且 `openclaw channels status --probe` 报告 `privateApi.available: true` 时，消息工具除了可以发送普通文本外，还可以使用 iMessage 原生动作。

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
    - **react**: 添加/移除 iMessage 点赞回复（`messageId`，`emoji`，`remove`）。支持的点赞回复映射为爱、喜欢、不喜欢、大笑、强调和疑问。
    - **reply**: 对现有消息发送串联回复（`messageId`，`text` 或 `message`，加上 `chatGuid`，`chatId`，`chatIdentifier` 或 `to`iMessage）。
    - **sendWithEffect**: 发送带有 iMessage 特效的文本（`text` 或 `message`，`effect` 或 `effectId`macOSAPI）。
    - **edit**: 在支持的 macOS/私有 API 版本上编辑已发送的消息（`messageId`，`text` 或 `newText`macOSAPI）。
    - **unsend**: 在支持的 macOS/私有 API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**: 发送媒体/文件（`buffer` 作为 base64 或一个填充了内容的 `media`/`path`/`filePath`，`filename`，可选的 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**，**setGroupIcon**，**addParticipant**，**removeParticipant**，**leaveGroup**：当当前目标是群组对话时，管理群组聊天。

  </Accordion>

  <Accordion title="Message IDs"iMessage>
    传入的 iMessage 上下文在可用时包含简短的 `MessageSid` 值和完整的消息 GUID。简短 ID 的范围限定于最近的内存回复缓存，并在使用前根据当前聊天进行检查。如果简短 ID 已过期或属于另一个聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection"OpenClawAPI>
    OpenClaw 仅在缓存探测状态显示桥接不可用时才隐藏私有 API 操作。如果状态未知，操作将保持可见并延迟调度探测，以便首次操作在 `imsg launch` 后即可成功，而无需单独的手动状态刷新。

  </Accordion>

  <Accordion title="Read receipts and typing"API>
    当私有 API 桥接启用时，接受的入站聊天会在调度前被标记为已读，并且在代理生成期间会向发送者显示正在输入气泡。使用以下命令禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于按方法功能列表的较旧 `imsg`OpenClaw 构建版本将静默关闭正在输入/已读功能；OpenClaw 会在每次重启时记录一次警告，以便归因缺失的回执。

  </Accordion>

  <Accordion title="Inbound tapbacks"OpenClawiMessage>
    OpenClaw 订阅 iMessage 点回，并将接受的反应作为系统事件而非普通消息文本进行路由，因此用户点回不会触发普通的回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅当用户对机器人发送的消息做出反应时通知。
    - `"all"`：对来自授权发送者的所有入站点回进行通知。
    - `"off"`：忽略入站点回。

    每个账户的覆盖设置使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>

  <Accordion title="批准反应 (👍 / 👎)">
    当 `approvals.exec.enabled` 或 `approvals.plugin.enabled` 为 true 且请求路由到 iMessage 时，网关会原生地发送批准提示，并接受轻点回应（tapback）来批准该请求：

    - `👍`（赞轻点回应）→ `allow-once`
    - `👎`（踩轻点回应）→ `deny`
    - `allow-always` 仍作为手动后备选项：将 `/approve <id> allow-always` 作为常规回复发送。

    反应处理要求进行反应的用户必须是显式批准者。批准者列表从 `channels.imessage.allowFrom`（或 `channels.imessage.accounts.<id>.allowFrom`）中读取；请添加用户的 E.164 格式电话号码或其 Apple ID 电子邮箱。通配符条目 `"*"` 有效，但允许任何发送者进行批准。反应快捷方式有意绕过 `reactionNotifications`、`dmPolicy` 和 `groupAllowFrom`，因为对于批准决策而言，显式批准者白名单是唯一重要的关卡。

    **本次发布的行为变更：** 当 `channels.imessage.allowFrom` 非空时，`/approve <id> <decision>` 文本命令现在将根据该批准者列表进行授权（而非更广泛的私信白名单）。被私信白名单允许但不在 `allowFrom` 中的发送者将收到明确的拒绝。若要保持以前的行为，请将每一位应能通过 `/approve`（以及通过反应）进行批准的操作员添加到 `allowFrom` 中。当 `allowFrom` 为空时，旧的“同聊后备”模式仍然有效，且 `/approve` 继续授权私信白名单允许的任何人。

    操作员说明：
    - 反应绑定既存储在内存中（TTL 与批准过期时间匹配），也存储在网关的持久化键值存储中，因此即使在网关重启后不久收到的轻点回应仍能解决批准请求。
    - 跨设备 `is_from_me=true` 轻点回应（操作员在配对的 Apple 设备上自己的反应）会被有意忽略，以防止机器人自我批准。
    - 旧式文本风格轻点回应（来自非常旧的 Apple 客户端的 `Liked "…"` 纯文本）无法解决批准请求，因为它们不包含消息 GUID；反应解决需要当前 macOS / iOS 客户端发出的结构化轻点回应元数据。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许渠道发起的配置写入（用于 iMessage`/config set|unset` 当 `commands.config: true` 时）。

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

## 合并拆分发送的私信（一个组合中的命令 + URL）

当用户同时输入命令和 URL 时 —— 例如 `Dump https://example.com/article` —— Apple 的“信息”应用会将发送拆分为 **两个单独的 `chat.db` 行**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中 OG 预览图像作为附件。

在大多数设置中，这两行数据到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果不进行合并，代理会在第 1 轮仅收到命令，并回复（通常是“发送 URL 给我”），直到第 2 轮才看到 URL —— 此时命令上下文已经丢失。这是 Apple 的发送管道，而不是 OpenClaw 或 OpenClawOpenClaw`imsg` 引入的。

`channels.imessage.coalesceSameSenderDms` 让私信选择将连续的相同发送者行合并为单个代理轮次。群聊继续按消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    在以下情况下启用：

    - 你部署的技能期望 `command + payload` 在一条消息中（dump、paste、save、queue 等）。
    - 你的用户会在命令旁粘贴 URL、图像或长内容。
    - 你可以接受额外的私信轮次延迟（见下文）。

    在以下情况下保持禁用：

    - 你需要针对单字私信触发器的最小命令延迟。
    - 你的所有流程都是一次性命令，没有后续负载。

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

    开启此标志且没有显式指定 `messages.inbound.byChannel.imessage` 时，去抖动窗口将扩大至 **2500 ms**（旧版默认值为 0 ms —— 即无去抖动）。需要更宽的窗口，是因为 Apple 0.8-2.0 秒的拆分发送节奏无法适应更紧凑的默认设置。

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
    - **私信消息延迟增加。** 开启该标志后，每条私信（包括独立的控制命令和单文本后续回复）在发送前都会等待防抖窗口期，以防有负载行到来。群聊消息保持即时发送。
    - **合并输出受限。** 合并文本上限为 4000 个字符，并带有明确的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留首个和最新的）。每个源 GUID 都会在 `coalescedMessageGuids` 中追踪，用于下游遥测。
    - **仅限私信。** 群聊回退到按消息发送，以便在多人同时输入时机器人保持响应。
    - **按渠道选择加入。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置了 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移至 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景与 Agent 看到的内容

| 用户发送                                          | `chat.db` 产生         | 标志关闭（默认）                              | 标志开启 + 2500 毫秒窗口                         |
| ------------------------------------------------- | ---------------------- | --------------------------------------------- | ------------------------------------------------ |
| `Dump https://example.com`（一次发送）            | 2 行，间隔约 1 秒      | Agent 轮次两次：先是单独的 "Dump"，然后是 URL | 一轮：合并文本 `Dump https://example.com`        |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 行                   | 两轮（合并时附件被丢弃）                      | 一轮：文本和图片均保留                           |
| `/status`（独立命令）                             | 1 行                   | 即时发送                                      | **等待直至窗口结束，然后发送**                   |
| 单独粘贴 URL                                      | 1 行                   | 即时发送                                      | 即时发送（桶中仅有一条）                         |
| 文本 + URL 作为两条刻意分开的消息发送，间隔数分钟 | 2 行，在窗口外         | 两轮                                          | 两轮（窗口在两者之间过期）                       |
| 快速刷屏（窗口内超过 10 条小私信）                | N 行                   | N 轮                                          | 一轮，输出受限（首个 + 最新，应用文本/附件上限） |
| 两人在群聊中输入                                  | 来自 M 个发送者的 N 行 | M+ 轮（每个发送者桶一轮）                     | M+ 轮 —— 群聊不合并                              |

## 网关停机后的追赶

当网关处于离线状态（崩溃、重启、Mac 休眠、机器关机）时，一旦网关重新启动，`imsg watch` 会从当前的 `chat.db` 状态继续运行——默认情况下，在断连期间到达的任何消息都将被忽略。追赶机制会在下次启动时重放这些消息，以免代理静默地错过入站流量。

追赶功能**默认处于禁用状态**。请针对每个渠道单独启用它：

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

在每次 `monitorIMessageProvider` 启动时运行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时分发循环。追赶过程本身使用 `chats.list` + 针对每个聊天的 `messages.history`，通过 `imsg watch` 使用的同一 JSON-RPC 客户端进行操作。在追赶过程中到达的任何消息都会通过正常的实时分发流程；现有的入站去重缓存会吸收与重放行的重叠部分。

每条重放的行都会通过实时分发路径（`evaluateIMessageInbound` + `dispatchInboundMessage`）进行处理，因此允许列表、群组策略、防抖器、回显缓存和已读回执在重放消息和实时消息上的表现完全一致。

### 游标和重试语义

追赶机制在 `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` 处维护每个帐户的游标（OpenClaw 状态目录默认为 `~/.openclaw`，可通过 `OPENCLAW_STATE_DIR` 覆盖）：

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- 每次成功分发后游标都会向前推进，如果某行的分发抛出异常，游标将保持不变——下次启动时会从保持的游标处重试同一行。
- 启动时的追赶查询成功后，后续实时处理的行也会推进同一个游标，这样网关重启就不会重放那些已经实时处理过的消息。实时游标的写入操作不会跳过那些仍低于 `maxFailureRetries` 的追赶失败项。
- 当针对同一个 `guid` 连续抛出 `maxFailureRetries` 次异常后，追赶机制会记录一条 `warn` 并强制将游标推进到卡住的消息之后，以便后续启动能够继续进行。
- 已被放弃的 guid 在后续运行中会被即时跳过（不尝试分发），并计入运行摘要中的 `skippedGivenUp`。

### 操作员可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

`WARN ... capped to perRunLimit` 行意味着单次启动未能排空全部积压。如果您的缺口定期超过默认的 50 行传递量，请提高 `perRunLimit`（最大 500）。

### 何时保持关闭

- Gateway(网关) 通过看门狗自动重启持续运行，且间隔始终 < 几秒 — 保持默认的关闭状态即可。
- 私信量低，且遗漏的消息不会改变 agent 行为 — `firstRunLookbackMinutes` 初始窗口可能会在首次启用时分发令人惊讶的旧上下文。

当您启用 catchup 时，没有游标的首次启动仅回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口 — 这可以避免重放启用前的大量历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="RPC未找到 imsg 或不支持 RPC"RPC>
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```RPC

    如果探测报告不支持 RPC，请更新 `imsg`API。如果私有 API 操作不可用，请在登录的 macOS 用户会话中运行 `imsg launch`macOSGateway(网关)macOS 并再次探测。如果 Gateway 未在 macOS 上运行，请使用上述的通过 SSH 连接远程 Mac 设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关)macOSGateway(网关) 未在 macOS 上运行">
    默认的 `cliPath: "imsg"`LinuxWindows 必须运行在已登录 Messages 的 Mac 上。在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 设置为通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的封装脚本。

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
    - 从 Gateway 主机进行的 SSH/SCP 密钥认证
    - Gateway 主机上的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOSmacOS 权限提示被遗漏">
    在相同的用户/会话上下文中，以交互式 GUI 终端重新运行并批准提示：

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    确认为运行 OpenClaw/`imsg` 的进程上下文授予了完全磁盘访问权限 + 自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考指针

- [配置参考 - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Gateway 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对](/en/channels/pairing)

## 相关

- [渠道概述](/en/channels) — 所有支持的渠道
- [BlueBubbles 移除及 imsg iMessage 路径](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — 公告和迁移摘要
- [从 BlueBubbles 迁移](BlueBubbles/en/channels/imessage-from-bluebubbles) — 配置转换表和逐步切换指南
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及控制
- [渠道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
