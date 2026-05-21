---
summary: "iMessageRPCAPIOpenClawiMessage通过 imsg（基于 stdio 的 JSON-RPC）实现原生 iMessage 支持，包含用于回复、轻触回应、特效、附件和群组管理的私有 API 操作。当主机要求符合时，这是新的 OpenClaw iMessage 设置的首选方案。"
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
对于 OpenClaw iMessage 部署，请在已登录的 macOS Messages 主机上使用 OpenClawiMessage`imsg`macOSGateway(网关)LinuxWindows。如果您的 Gateway(网关) 运行在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 指向一个在 Mac 上运行 `imsg`Gateway(网关) 的 SSH 包装器。

**Gateway(网关)停机期间的消息追回是可选的。** 启用后 (`channels.imessage.catchup.enabled: true`)，gateway 会在下次启动时重放其在离线期间（崩溃、重启、Mac 休眠）到达 `chat.db` 的入站消息。默认禁用 — 请参阅 [Gateway(网关)停机后的追回](#catching-up-after-gateway-downtime)。解决了 [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649)。

</Note>

<Warning>BlueBubbles 支持已被移除。请将 BlueBubbles`channels.bluebubbles` 配置迁移到 `channels.imessage`OpenClawiMessage；OpenClaw 仅通过 `imsg`BlueBubblesiMessage 支持 iMessage。请从 [BlueBubbles 移除和 imsg iMessage 路径](/zh/announcements/bluebubbles-imessageBlueBubbles) 开始查看简短公告，或参阅 [从 BlueBubbles 迁移](/zh/channels/imessage-from-bluebubbles) 查看完整的迁移对照表。</Warning>

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

  <Tab title="通过 SSH 连接远程 Mac">
    OpenClaw 仅需要兼容 stdio 的 `cliPath`，因此您可以将 `cliPath` 指向一个通过 SSH 连接到远程 Mac 并运行 `imsg` 的封装脚本。

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

    如果未设置 `remoteHost`，OpenClaw 将尝试通过解析 SSH 封装脚本来自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`（无空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥检查，因此中继主机密钥必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行验证。

<Warning>
您置于 `imsg` 之前的任何 `cliPath` 封装器或 SSH 代理，其行为必须像一个透明的 stdio 管道，用于长生命周期的 JSON-RPC。在渠道的生命周期内，OpenClaw 通过封装器的 stdin/stdout 交换小型的、以换行符分隔的 JSON-RPC 消息：

- 一旦字节可用，立即转发每个 stdin 块/行 —— 不要等待 EOF。
- 及时反向转发每个 stdout 块/行。
- 保留换行符。
- 避免固定大小的阻塞读取（`read(4096)`、`cat | buffer`、默认 shell `read`），这可能会饿死小帧。
- 将 stderr 与 JSON-RPC stdout 流分开。

如果封装器将 stdin 缓冲直到填满大块，将会产生类似于 iMessage 故障的症状 —— `imsg rpc timeout (chats.list)` 或渠道反复重启 —— 即使 `imsg rpc` 本身是健康的。`ssh -T host imsg "$@"`（上文）是安全的，因为它转发 OpenClaw 的 `cliPath` 参数，例如 `rpc` 和 `--db`。像 `ssh host imsg | grep -v '^DEBUG'` 这样的管道是危险的 —— 行缓冲工具仍然可能持有帧；如果您必须进行过滤，请在每个阶段使用 `stdbuf -oL -eL`。

</Warning>

  </Tab>
</Tabs>

## 要求和权限 (macOS)

- 运行 `imsg` 的 Mac 上的 Messages 必须已登录。
- 运行 OpenClaw/`imsg` 的进程上下文需要“完全磁盘访问权限”（访问 Messages 数据库）。
- 需要“自动化”权限才能通过 Messages.app 发送消息。
- 对于高级操作（反应 / 编辑 / 撤销 / 串联回复 / 特效 / 群组操作），必须禁用系统完整性保护 —— 请参阅下方的 [启用 imsg 私有 API](#enabling-the-imsg-private-api)。基本的文本和媒体收发无需此操作。

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

- **基础模式**（默认，无需更改 SIP）：通过 `send` 发送出站文本和媒体，入站监视/历史记录，聊天列表。这是全新的 `brew install steipete/tap/imsg` 加上上述标准 macOS 权限即可获得的现成功能。
- **私有 API 模式**：`imsg` 将辅助 dylib 注入 `Messages.app` 以调用内部 `IMCore` 函数。这正是解锁 `react`、`edit`、`unsend`、`reply`（串联回复）、`sendWithEffect`、`renameGroup`、`setGroupIcon`、`addParticipant`、`removeParticipant`、`leaveGroup`，以及正在输入指示器和已读回执的方式。

要使用本渠道页面所述的高级操作功能，您需要私有 API 模式。`imsg` README 中明确说明了这一要求：

> `read`、`typing`、`launch`、网桥支持的高级发送、消息变更和聊天管理等高级功能是可选的。它们需要禁用 SIP 并将辅助 dylib 注入 `Messages.app`。`imsg launch` 在启用 SIP 时拒绝注入。

Helper-injection 技术使用 `imsg` 自带的 dylib 来访问 Messages 私有 API。在 BlueBubbles OpenClaw 路径中不存在第三方服务器或 iMessage 运行时。

<Warning>
**禁用 SIP 是一个真正的安全权衡。** SIP 是 macOS 防止运行修改后的系统代码的核心保护措施之一；在系统范围内关闭它会开辟额外的攻击面和副作用。值得注意的是，**在 Apple Silicon Mac 上禁用 SIP 也会禁用在 Mac 上安装和运行 iOS 应用的能力**。

请将此视为深思熟虑的操作选择，而不是默认选项。如果您的威胁模型无法容忍 SIP 被关闭，捆绑的 iMessage 将仅限于基本模式——仅支持文本和媒体发送/接收，没有反应 / 编辑 / 撤销 / 特效 / 群组操作。

</Warning>

### 设置

1. 在运行 Messages.app 的 Mac 上 **安装（或升级） `imsg`**：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   `imsg status --json` 输出报告 `bridge_version`、`rpc_methods` 和每个方法的 `selectors`，以便您在开始之前了解当前构建支持的内容。

2. **禁用系统完整性保护（System Integrity Protection）。** 这取决于 macOS 版本，因为底层的 Apple 要求取决于操作系统和硬件：
   - **macOS 10.13–10.15 (Sierra–Catalina)：** 通过终端禁用库验证，重启进入恢复模式，运行 `csrutil disable`，然后重启。
   - **macOS 11+ (Big Sur 及更高版本)，Intel：** 恢复模式（或网络恢复），`csrutil disable`，重启。
   - **macOS 11+，Apple Silicon：** 按电源键启动序列进入恢复；在最近的 macOS 版本中，点击“继续”时按住 **Left Shift** 键，然后 `csrutil disable`。虚拟机设置遵循单独的流程 — 请先拍摄 VM 快照。
   - **macOS 26 / Tahoe：** 库验证策略和 `imagent` 私有权限检查已进一步收紧；`imsg` 可能需要更新的构建以跟上。如果在 macOS 主要升级后，`imsg launch` 注入或特定的 `selectors` 开始返回 false，请在假定 SIP 步骤成功之前检查 `imsg` 的发行说明。

   按照 Apple 针对 Mac 的恢复模式流程，在运行 `imsg launch` 之前禁用 SIP。

3. **注入辅助程序。** 在 SIP 已禁用且 Messages.app 已登录的情况下：

   ```bash
   imsg launch
   ```

   当 SIP 仍处于启用状态时，`imsg launch` 将拒绝注入，因此这也可作为确认步骤 2 已完成的双重检查。

4. **从 OpenClaw 验证网桥：**

   ```bash
   openclaw channels status --probe
   ```

   iMessage 条目应报告 iMessage`works`，并且 `imsg status --json | jq '.selectors'` 应显示 `retractMessagePart: true`macOSOpenClaw 以及您的 macOS 版本所暴露的任何编辑/输入/已读选择器。`actions.ts` 中的 OpenClaw 插件每方法过滤仅广告基础选择器为 `true` 的操作，因此您在代理工具列表中看到的操作界面反映了该桥接在此主机上实际可执行的操作。

如果 `openclaw channels status --probe` 将渠道报告为 `works`iMessage，但特定操作在调度时抛出“iMessage `<action>`API 需要 imsg 私有 API 桥接”错误，请再次运行 `imsg launch` —— 辅助进程可能会失效（Messages.app 重启、操作系统更新等），并且缓存的 `available: true` 状态将继续广告操作，直到下次探测刷新。

### 当您无法禁用 SIP 时

如果对于您的威胁模型而言，禁用 SIP 是不可接受的：

- `imsg` 回退到基本模式 —— 文本 + 媒体 + 仅接收。
- OpenClaw 插件仍然广告文本/媒体发送和入站监控；它只是在操作界面中隐藏了 OpenClaw`react`、`edit`、`unsend`、`reply`、`sendWithEffect` 和群组操作（根据每方法功能过滤）。
- 您可以在一台独立的非 Apple Silicon Mac（或专用机器人 Mac）上关闭 SIP 以运行 iMessage 工作负载，同时在您的主设备上保持 SIP 启用。请参阅下方的 [专用机器人 macOS 用户（独立的 iMessage 身份）](iMessagemacOSiMessage#deployment-patterns)。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing` （默认）
    - `allowlist`
    - `open` （要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须识别发送者：句柄或静态发送者访问组（`accessGroup:<name>`）。对于聊天目标（如 %%PH:INLINE_CODE:212:7f2194b%%、`chat_guid:*` 或 `chat_identifier:*`），请使用 `channels.imessage.groupAllowFrom``chat_id:*`；对于数字 `chat_id` 注册表键，请使用 `channels.imessage.groups`。

  </Tab>

  <Tab title="组策略和提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置时的默认值）
    - `open`
    - `disabled`

    群组发件人白名单：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发件人访问组（`accessGroup:<name>`）。

    运行时回退：如果 `groupAllowFrom`iMessage 未设置，iMessage 群组发件人检查将使用 `allowFrom`；当私信和群组准入规则不同时，请设置 `groupAllowFrom`。
    运行时注意：如果 `channels.imessage` 完全缺失，运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    群组路由有**两个**连续运行的白名单关卡，且两者都必须通过：

    1. **发件人/聊天目标白名单**（`channels.imessage.groupAllowFrom`）— handle、`chat_guid`、`chat_identifier` 或 `chat_id`。
    2. **群组注册表**（`channels.imessage.groups`）— 在 `groupPolicy: "allowlist"` 模式下，此关卡要求有一个 `groups: { "*": { ... } }` 通配符条目（设置 `allowAll = true`），或者在 `groups` 下有明确的每个 `chat_id` 的条目。

    如果关卡 2 中没有任何内容，每条群组消息都将被丢弃。插件在默认日志级别会发出两个 `warn` 级别的信号：

    - 启动时每个账号一次：`imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - 运行时每个 `chat_id` 一次：`imessage: dropping group message from chat_id=<id> ...`

    私信（私信）将继续工作，因为它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下保持群组消息畅通的最低配置：

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

    如果这些 `warn` 行出现在网关日志中，说明关卡 2 正在拦截消息 — 请添加 `groups`iMessage 块。
    </Warning>

    群组的提及 gating：

    - iMessage 没有原生的提及元数据
    - 提及检测使用正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 如果没有配置模式，则无法强制执行提及 gating

    来自授权发件人的控制命令可以在群组中绕过提及 gating。

    每个群组的 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目接受一个可选的 `systemPrompt` 字符串。该值会在处理该群组消息的每一轮对话中注入到 Agent 的系统提示词中。解析逻辑镜像了 `channels.whatsapp.groups` 使用的每群组提示词解析逻辑：

    1. **特定群组的系统提示词**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，且不会向该群组应用任何系统提示词。
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

    每群组提示词仅适用于群组消息 — 此渠道中的私信不受影响。

  </Tab>

  <Tab title="会话和确定性回复">
    - 私信使用直接路由；群组使用群组路由。
    - 使用默认 `session.dmScope=main`iMessage 时，iMessage 私信会合并到 Agent 主会话中。
    - 群组会话是隔离的 (`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage)。
    - 回复使用原始渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    某些多参与者 iMessage 线程可能带有 `is_group=false` 到达。
    如果该 `chat_id` 在 `channels.imessage.groups`OpenClaw 下被显式配置，OpenClaw 将其视为群组流量（群组准入 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作员流程：

- 在私信或允许的群组聊天中运行 `/acp spawn codex --bind here`。
- 该同一 iMessage 会话中的后续消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会原地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

支持通过顶级 `bindings[]` 条目配置持久绑定，包含 `type: "acp"` 和 `match.channel: "imessage"`。

`match.peer.id` 可以使用：

- 标准化私信标识符，例如 `+15555550123` 或 `user@example.com`
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
  <Accordion title="macOSiMessage专用的机器人 macOS 用户（独立的 iMessage 身份）"macOSmacOS>
    使用专用的 Apple ID 和 macOS 用户，以便将机器人流量与您的个人“信息”配置文件隔离开来。

    典型流程：

    1. 创建/登录专用的 macOS 用户。
    2. 在该用户中使用机器人 Apple ID 登录“信息”。
    3. 在该用户中安装 `imsg`OpenClaw。
    4. 创建 SSH 包装器，以便 OpenClaw 可以在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该机器人用户会话中进行 GUI 批准（自动化 + 完全磁盘访问权限）。

  </Accordion>

  <Accordion title="Tailscale通过 Tailscale 连接远程 Mac（示例）"LinuxiMessage>
    常见拓扑结构：

    - Gateway 运行在 Linux/VM 上
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

    使用 SSH 密钥，使 SSH 和 SCP 均为非交互式。
    确保首先信任主机密钥（例如 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="多账户模式"iMessage>
    iMessage 支持在 `channels.imessage.accounts` 下进行按账户配置。

    每个账户都可以覆盖字段，例如 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、历史记录设置和附件根目录允许列表。

  </Accordion>
</AccordionGroup>

## 媒体、分块和投递目标

<AccordionGroup>
  <Accordion title="附件和媒体">
    - 入站附件摄取默认**关闭** — 设置 `channels.imessage.includeAttachments: true` 以将照片、语音备忘录、视频和其他附件转发给代理。如果禁用此功能，仅包含附件的 iMessage 将在到达代理之前被丢弃，并且可能根本不会产生 `Inbound message` 日志行。
    - 当设置 `remoteHost` 时，可以通过 SCP 获取远程附件路径
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

  <Accordion title="寻址格式">
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

当 `imsg launch` 正在运行且 `openclaw channels status --probe` 报告 `privateApi.available: true`iMessage 时，消息工具除了普通文本发送外，还可以使用 iMessage 原生操作。

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
  <Accordion title="可用操作">
    - **react**: 添加/移除 iMessage 点赞（`messageId`、`emoji`、`remove`）。支持的点赞类型包括爱心、喜欢、不喜欢、大笑、强调和疑问。
    - **reply**: 发送对现有消息的 threaded reply（`messageId`、`text` 或 `message`，加上 `chatGuid`、`chatId`、`chatIdentifier` 或 `to`）。
    - **sendWithEffect**: 发送带有 iMessage 特效的文本（`text` 或 `message`、`effect` 或 `effectId`）。
    - **edit**: 在支持的 macOS/private API 版本上编辑已发送的消息（`messageId`、`text` 或 `newText`）。
    - **unsend**: 在支持的 macOS/private API 版本上撤回已发送的消息（`messageId`）。
    - **upload-file**: 发送媒体/文件（`buffer` 为 base64 或一个 hydrated `media`/`path`/`filePath`、`filename`、可选 `asVoice`）。旧别名：`sendAttachment`。
    - **renameGroup**、**setGroupIcon**、**addParticipant**、**removeParticipant**、**leaveGroup**：当当前目标是群组对话时，管理群组聊天。

  </Accordion>

  <Accordion title="消息 ID">
    入站 iMessage 上下文在可用时包含短 `MessageSid` 值和完整的消息 GUID。短 ID 的作用域是最近的内存回复缓存，并在使用前针对当前聊天进行检查。如果短 ID 已过期或属于另一个聊天，请使用完整的 `MessageSidFull` 重试。

  </Accordion>

  <Accordion title="Capability detection"OpenClawAPI>
    OpenClaw 仅在缓存探测状态显示桥接不可用时隐藏私有 API 操作。如果状态未知，操作保持可见并惰性调度探测，以便第一个操作能在 `imsg launch` 后成功，而无需单独手动刷新状态。

  </Accordion>

  <Accordion title="Read receipts and typing"API>
    当私有 API 桥接启动时，接受的入站聊天会在调度前标记为已读，并且在代理生成期间向发送者显示输入气泡。可以使用以下方式禁用已读标记：

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    早于每方法能力列表的旧版 `imsg`OpenClaw 构建版本将静默关闭输入/已读功能；OpenClaw 会在每次重启时记录一次性警告，以便对缺失的回执进行溯源。

  </Accordion>

  <Accordion title="Inbound tapbacks"OpenClawiMessage>
    OpenClaw 订阅 iMessage 点回（tapbacks），并将接受的反应作为系统事件而非普通消息文本进行路由，因此用户的点回不会触发普通的回复循环。

    通知模式由 `channels.imessage.reactionNotifications` 控制：

    - `"own"`（默认）：仅当用户对机器人发送的消息做出反应时通知。
    - `"all"`：对来自授权发送者的所有入站点回进行通知。
    - `"off"`：忽略入站点回。

    每个账户的覆盖设置使用 `channels.imessage.accounts.<id>.reactionNotifications`。

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许由渠道发起的配置写入（用于 iMessage`/config set|unset` 当 `commands.config: true` 时）。

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

当用户同时输入命令和 URL 时——例如 `Dump https://example.com/article` —— Apple 的“信息”应用会将发送拆分为**两个单独的 `chat.db` 行**：

1. 一条文本消息（`"Dump"`）。
2. 一个 URL 预览气泡（`"https://..."`），其中 OG 预览图片作为附件。

在大多数设置中，这两行数据到达 OpenClaw 的时间相隔约 0.8-2.0 秒。如果不合并，代理会在第一轮仅收到指令，然后回复（通常是“发给我 URL”），直到第二轮才看到 URL —— 此时指令上下文已丢失。这是 Apple 的发送管道，而非 OpenClaw 或 `imsg` 引入的机制。

`channels.imessage.coalesceSameSenderDms` 将私信设为合并来自同一发送者的连续行，使其作为单个代理轮次处理。群聊继续按消息分发，以保留多用户轮次结构。

<Tabs>
  <Tab title="何时启用">
    启用条件：

    - 你发布的技能期望在一条消息中包含 `command + payload`（如转储、粘贴、保存、队列等）。
    - 你的用户会随指令粘贴 URL、图片或长内容。
    - 你可以接受增加的私信轮次延迟（见下文）。

    保持禁用条件：

    - 你需要对单字私信触发器实现最低指令延迟。
    - 你的所有流程均为一次性指令，无后续负载。

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

    开启该标志且未显式指定 `messages.inbound.byChannel.imessage` 时，防抖窗口将扩大至 **2500 ms**（旧版默认值为 0 ms —— 即无防抖）。需要更宽的窗口，是因为 Apple 0.8-2.0 秒的分批发送节奏不适合更紧的默认值。

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
    - **私信消息增加了延迟。** 开启该标志后，每条私信（包括独立的控制命令和单文本跟进）在发送前都会等待去抖动窗口，以防有负载数据行到来。群聊消息保持即时发送。
    - **合并输出有限制。** 合并文本上限为 4000 个字符，并带有显式的 `…[truncated]` 标记；附件上限为 20 个；源条目上限为 10 个（超出部分保留最早和最新的）。每个源 GUID 都会记录在 `coalescedMessageGuids` 中，以便下游遥测。
    - **仅限私信。** 群聊消息会退回到按消息发送模式，以便多人在输入时机器人保持响应。
    - **需选择加入，且按渠道配置。** 其他渠道（Telegram、WhatsApp、Slack 等）不受影响。设置了 `channels.bluebubbles.coalesceSameSenderDms` 的旧版 BlueBubbles 配置应将该值迁移到 `channels.imessage.coalesceSameSenderDms`。

  </Tab>
</Tabs>

### 场景及 Agent 看到的内容

| 用户输入                                          | `chat.db` 产生         | 标志关闭（默认）                        | 标志开启 + 2500 毫秒窗口                                |
| ------------------------------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------------- |
| `Dump https://example.com`（一次发送）            | 2 行，间隔约 1 秒      | 两次 Agent 回合：先是“Dump”，然后是 URL | 一轮对话：合并文本 `Dump https://example.com`           |
| `Save this 📎image.jpg caption`（附件 + 文本）    | 2 行                   | 两次回合（合并时丢弃附件）              | 一次回合：文本 + 图片保留                               |
| `/status`（独立命令）                             | 1 行                   | 即时发送                                | **最多等待窗口期，然后发送**                            |
| 单独粘贴 URL                                      | 1 行                   | 即时发送                                | 即时发送（桶中仅有一条）                                |
| 文本 + URL 作为两条刻意分开的消息发送，间隔数分钟 | 2 行，超出窗口期       | 两次回合                                | 两次回合（窗口期在两者之间过期）                        |
| 快速连发（窗口期内超过 10 条小私信）              | N 行                   | N 次回合                                | 一次回合，输出受限（保留最早和最新，应用文本/附件上限） |
| 两人在群聊中输入                                  | 来自 M 个发送者的 N 行 | M+ 次回合（每个发送者桶一次）           | M+ 次回合 — 群聊不会合并                                |

## 网关停机后的追赶

当网关处于离线状态（崩溃、重启、Mac 休眠、机器关机）时，`imsg watch` 会在网关重新上线后从当前的 `chat.db` 状态恢复 — 默认情况下，离线期间到达的任何消息都将被忽略。追赶功能会在下次启动时重放这些消息，以便代理不会静默地错过入站流量。

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

每次 `monitorIMessageProvider` 启动时运行一次，顺序为 `imsg launch` 就绪 → `watch.subscribe` → `performIMessageCatchup` → 实时发送循环。追赶功能本身针对 `imsg watch` 使用的同一 JSON-RPC 客户端，使用 `chats.list` 加上逐聊 `messages.history`。在追赶过程中到达的任何消息都会正常通过实时发送流程；现有的入站去重缓存会吸收与重放行重叠的部分。

每条重放的行都会通过实时分发路径 (`evaluateIMessageInbound` + `dispatchInboundMessage`) 进行处理，因此允许列表、群组策略、去抖动器、回显缓存和已读回执在重放消息和实时消息上的表现完全一致。

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
- 在对同一个 `guid` 连续抛出 `maxFailureRetries` 次异常后，catchup 会记录一条 `warn` 并强制推进游标跳过卡住的消息，以便后续启动时可以继续处理。
- 在后续运行中，已被放弃的 guid 会被直接跳过（不尝试分发），并在运行摘要中计入 `skippedGivenUp`。

### 操作员可见信号

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

如果出现 `WARN ... capped to perRunLimit` 行，意味着单次启动未能处理完所有积压。如果你的差距定期超过默认的 50 行通过量，请提高 `perRunLimit`（最大 500）。

### 何时将其保持关闭

- Gateway(网关) 持续运行并带有看门狗自动重启功能，且间隔始终小于几秒 —— 默认的关闭状态即可。
- 私信量很低，且遗漏的消息不会改变代理的行为——`firstRunLookbackMinutes` 的初始窗口可能会在首次启用时分发令人惊讶的旧上下文。

当你开启 catchup 时，没有游标的首次启动只会回溯 `firstRunLookbackMinutes`（默认 30 分钟），而不是完整的 `maxAgeMinutes` 窗口——这避免了重放启用前的大量历史消息。

## 故障排除

<AccordionGroup>
  <Accordion title="RPC未找到 imsg 或不支持 RPC"RPC>
    验证二进制文件和 RPC 支持：

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```RPC

    如果探测报告不支持 RPC，请更新 `imsg`API。如果私有 API 操作不可用，请在已登录的 macOS 用户会话中运行 `imsg launch`macOSGateway(网关)macOS 并再次探测。如果 Gateway 不在 macOS 上运行，请使用上述的“通过 SSH 连接远程 Mac”设置，而不是默认的本地 `imsg` 路径。

  </Accordion>

  <Accordion title="Gateway(网关)macOSGateway(网关) 未运行在 macOS 上">
    默认的 `cliPath: "imsg"`LinuxWindows 必须在登录了 Messages 的 Mac 上运行。在 Linux 或 Windows 上，请将 `channels.imessage.cliPath` 设置为一个通过 SSH 连接到该 Mac 并运行 `imsg "$@"` 的包装脚本。

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
    - Gateway 主机的 `~/.ssh/known_hosts` 中存在主机密钥
    - 运行 Messages 的 Mac 上的远程路径可读性

  </Accordion>

  <Accordion title="macOS错过了 macOS 权限提示">
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
- [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>)
- [配对](/en/channels/pairing)

## 相关内容

- [渠道概述](/en/channels) — 所有支持的渠道
- [移除 BlueBubbles 和 imsg iMessage 路径](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — 公告和迁移摘要
- [从 BlueBubbles 迁移](BlueBubbles/en/channels/imessage-from-bluebubbles) — 配置转换表和分步切换
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及限制
- [通道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全性](/en/gateway/security) — 访问模型和加固
