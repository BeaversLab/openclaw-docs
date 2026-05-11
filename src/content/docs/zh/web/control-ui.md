---
summary: "基于浏览器的 Gateway(网关) 控制界面（聊天、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制界面"
sidebarTitle: "控制界面"
---

控制界面是由 Gateway(网关) 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认值： `http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway(网关) 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway(网关) 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) （或 [http://localhost:18789/](http://localhost:18789/)）

如果页面加载失败，请先启动 Gateway(网关)： `openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时 Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的 trusted-proxy 身份标头

仪表板设置面板会保留当前浏览器标签会话和所选网关 URL 的令牌；密码不会被持久化。新手引导通常会在首次连接时为共享密钥身份验证生成网关令牌，但当 `gateway.auth.mode` 为 `"password"` 时，密码验证也有效。

## 设备配对（首次连接）

当您从新的浏览器或设备连接到控制界面时，Gateway(网关) 通常需要**一次性配对批准**。这是一项防止未经授权访问的安全措施。

**您将看到：** "disconnected (1008): pairing required"

<Steps>
  <Step title="列出待处理的请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="通过请求 ID 批准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果浏览器重试配对时身份验证详细信息（角色/范围/公钥）发生变化，则先前的待处理请求将被取代，并创建一个新的 `requestId`。请在批准之前重新运行 `openclaw devices list`。

如果浏览器已配对，并且您将其从读取访问权限更改为写入/管理员访问权限，则此操作将被视为批准升级，而不是静默重新连接。OpenClaw 会保持旧批准处于活动状态，阻止更广泛的重新连接，并要求您明确批准新的范围集。

一旦获得批准，设备将被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。有关令轮换和撤销，请参阅 [设备 CLI](/zh/cli/devices)。

<Note>
  - 直接的 local loopback 浏览器连接 (`127.0.0.1` / `localhost`) 会自动批准。 - 当 `gateway.auth.allowTailscale: true` 验证通过、Tailscale 身份验证确认，且浏览器出示其设备身份时，Tailscale Serve 可以跳过 Control UI 操作员会话的配对往返过程。 - 直接的 Tailnet 绑定、LAN 浏览器连接以及没有设备身份的浏览器配置文件仍需要明确批准。 - 每个浏览器配置文件会生成唯一的设备
  ID，因此切换浏览器或清除浏览器数据将需要重新配对。
</Note>

## 个人身份（浏览器本地）

Control UI 支持附加到传出消息的每个浏览器个人身份（显示名称和头像），以便在共享会话中进行归属。它驻留在浏览器存储中，范围限定于当前浏览器配置文件，并且除了您实际发送的消息上的正常转录作者元数据外，不会同步到其他设备或在服务器端持久化。清除站点数据或切换浏览器会将其重置为空。

同样的浏览器本地模式也适用于助手头像覆盖。上传的助手头像仅在本地浏览器上覆盖网关解析的身份，永远不会通过 `config.patch` 往返。共享的 `ui.assistant.avatar` 配置字段仍然可供直接写入该字段的非 UI 客户端使用（例如脚本化网关或自定义仪表板）。

## 运行时配置端点

Control UI 从 `/__openclaw/control-ui-config.json` 获取其运行时设置。该端点受到与 HTTP 表面其余部分相同的网关身份验证保护：未经身份验证的浏览器无法获取它，成功获取需要有效的网关令牌/密码、Tailscale Serve 身份或受信任代理身份。

## 语言支持

Control UI 可以在首次加载时根据您的浏览器区域设置进行本地化。如需稍后覆盖，请打开 **Overview -> Gateway Access -> Language**。区域设置选择器位于 Gateway Access 卡片中，而不在 Appearance 下。

- 支持的区域设置：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`、`th`
- 非英语翻译将在浏览器中延迟加载。
- 选定的区域设置将保存在浏览器存储中，并在下次访问时重复使用。
- 缺失的翻译键将回退到英语。

## 外观主题

“外观”面板保留了内置的 Claw、Knot 和 Dash 主题，外加一个浏览器本地的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn themes](https://tweakcn.com/themes)，选择或创建一个主题，点击 **Share**，然后将复制的主题链接粘贴到“外观”中。导入器还接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似于 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对 `/themes/<id>` 路径、原始主题 ID 以及诸如 `amethyst-haze` 之类的默认主题名称。

导入的主题仅存储在当前的浏览器配置文件中。它们不会写入网关配置，也不会跨设备同步。替换导入的主题会更新那一个本地槽位；如果选中了导入的主题，清除它将把活动主题切换回 Claw。

## （目前）它能做什么

<AccordionGroup>
  <Accordion title="Chat and Talk">
    - 通过 Gateway(网关) WS 与模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)。 - 通过浏览器实时会话进行对话。OpenAI 使用直接 WebRTC，Google Live 使用通过 WebSocket 的受限一次性浏览器令牌，而仅后端实时语音插件使用 Gateway(网关) 中继传输。中继将提供商凭证保留在 Gateway(网关) 上，同时浏览器通过 `talk.realtime.relay*` RPC 传输麦克风 PCM，并通过 `chat.send` 发回
    `openclaw_agent_consult` 工具调用，以便为配置的较大 OpenClaw 模型服务。 - 在聊天中流式传输工具调用 + 实时工具输出卡片（代理事件）。
  </Accordion>
  <Accordion title="Channels, instances, sessions, dreams">
    - 渠道：内置 plus 捆绑/外部插件渠道状态、二维码登录和每个渠道的配置 (`channels.status`, `web.login.*`, `config.patch`)。 - 实例：在场列表 + 刷新 (`system-presence`)。 - 会话：列表 + 每个会话的模型/思考/快速/详细/跟踪/推理覆盖 (`sessions.list`, `sessions.patch`)。 - 梦境：梦境状态、启用/禁用切换和梦境日记阅读器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)。
  </Accordion>
  <Accordion title="Cron, skills, nodes, exec approvals">- Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史记录 (`cron.*`)。 - Skills：状态、启用/禁用、安装、API 密钥更新 (`skills.*`)。 - 节点：列表 + 功能 (`node.list`)。 - 执行批准：编辑 Gateway(网关) 或节点允许列表 + 询问 `exec host=gateway/node` 的策略 (`exec.approvals.*`)。</Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。 - 应用并通过验证 (`config.apply`) 重启，然后唤醒最后一个活跃会话。 - 写入包含一个基础哈希保护，以防止覆盖并发编辑。 - 写入 (`config.set`/`config.apply`/`config.patch`) 会对提交的配置负载中的引用进行活跃 SecretRef 解析预检；未解析的已提交活跃引用会在写入前被拒绝。 - Schema + 表单渲染 (`config.schema` /
    `config.schema.lookup`，包括字段 `title` / `description`，匹配的 UI 提示，直接子级摘要，嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用的插件 + 渠道 schemas)；仅当快照能够安全地进行原始往返时，才可使用原始 JSON 编辑器。 - 如果快照无法安全地往返原始文本，Control UI 将强制使用表单模式，并禁用该快照的原始模式。 - 原始 JSON 编辑器的“重置为已保存”会保留原始创建的形状（格式、注释、`$include`
    布局），而不是重新渲染展平的快照，因此当快照可以安全往返时，外部编辑在重置后依然保留。 - 结构化的 SecretRef 对象值在表单文本输入中呈现为只读，以防止意外的对象到字符串损坏。
  </Accordion>
  <Accordion title="调试、日志、更新">- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用 (`status`, `health`, `models.list`)。 - 日志：网关文件日志的实时跟踪，带有过滤/导出 (`logs.tail`) 功能。 - 更新：运行包/git 更新 + 重启 (`update.run`) 并生成重启报告，然后重新连接后轮询 `update.status` 以验证运行的网关版本。</Accordion>
  <Accordion title="Cron jobs panel notes">
    - 对于隔离作业，传递方式默认为公告摘要。如果只想在内部运行，可以切换为 none。 - 当选择公告时，会出现频道/目标字段。 - Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。 - 对于主会话作业，可以使用 webhook 和 none 传递模式。 - 高级编辑控件包括运行后删除、清除代理覆盖、cron 精确/交错选项、代理模型/思维覆盖以及尽力而为传递切换。 -
    表单验证是内联的，显示字段级错误；无效的值将禁用保存按钮，直到修复为止。 - 设置 `cron.webhookToken` 以发送专用 bearer 令牌，如果省略，则 webhook 在没有 auth 标头的情况下发送。 - 已弃用的后备：存储的具有 `notify: true` 的旧作业在迁移之前仍可使用 `cron.webhook`。
  </Accordion>
</AccordionGroup>

## 聊天行为

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` 是 **非阻塞** 的：它立即以 `{ runId, status: "started" }` 确认，响应通过 `chat` 事件流式传输。
    - 聊天上传接受图片和非视频文件。图片保留本地图片路径；其他文件作为托管媒体存储并在历史记录中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送，运行时返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - 为了 UI 安全，`chat.history` 响应的大小是受限的。当记录条目过大时，Gateway(网关) 可能会截断长文本字段，省略繁重的元数据块，并使用占位符 (`[chat.history omitted: message too large]`) 替换超大的消息。
    - 助手/生成的图片作为托管媒体引用持久化，并通过经过身份验证的 Gateway(网关) 媒体 URL 返回，因此重新加载不依赖于保留原始 base64 图片负载的聊天历史响应。
    - `chat.history` 还会从可见的助手文本中剥离仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块），以及泄露的 ASCII/全角模型控制令牌，并省略其整个可见文本仅是精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
    - 在活动发送期间和最终历史记录刷新时，如果 `chat.history` 短暂返回较旧的快照，聊天视图会保持本地乐观的用户/助手消息可见；一旦 Gateway(网关) 历史记录赶上，规范记录将替换这些本地消息。
    - `chat.inject` 将助手注释附加到会话记录，并广播 `chat` 事件以进行仅 UI 更新（不运行 agent，不通过 %%PH:GLOSSARY:渠道%% 投递）。
    - 聊天标题的模型和思维选择器通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖，而不是仅限单轮的发送选项。
    - 当新的 Gateway(网关) 会话使用报告显示高上下文压力时，聊天编辑区域会显示上下文通知，并在建议的压缩级别显示一个运行正常会话压缩路径的压缩按钮。过时的令牌快照将被隐藏，直到 Gateway(网关) 再次报告新的使用情况。
  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice 提供商. Configure OpenAI with `talk.provider: "openai"` plus `talk.providers.openai.apiKey`, or configure Google with `talk.provider: "google"` plus `talk.providers.google.apiKey`; Voice Call realtime 提供商 config can still be reused as the fallback. The browser never receives a standard 提供商 API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket 会话, with instructions and 工具 declarations locked into the token by the Gateway(网关). Providers that only expose a backend realtime bridge run through the Gateway(网关) relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway(网关) RPCs. The Realtime 会话 prompt is assembled by the Gateway(网关); `talk.realtime.session` does not accept caller-provided instruction overrides.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime 工具 call is consulting the configured larger 模型 through `chat.send`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway(网关) relay browser adapter with fake microphone media. The command prints 提供商 status only and does not log secrets.

  </Accordion>
  <Accordion title="停止和中止">
    - 点击 **Stop**（调用 `chat.abort`）。
    - 当运行处于活动状态时，普通的后续追问会排队。点击排队消息上的 **Steer** 以将该追问注入到正在运行的轮次中。
    - 输入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以进行带外中止。
    - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行。
  </Accordion>
  <Accordion title="中止部分保留">
    - 当运行中止时，部分助手文本仍可显示在 UI 中。
    - 当存在缓冲输出时，Gateway 会将被中止的部分助手文本持久化到记录历史中。
    - 持久化的条目包含中止元数据，以便记录使用者能够区分中止的部分与正常的完成输出。
  </Accordion>
</AccordionGroup>

## PWA 安装和网络推送

Control UI 附带 `manifest.webmanifest` 和一个 Service Worker，因此现代浏览器可以将其作为独立的 PWA 安装。Web Push 允许 Gateway 在标签页或浏览器窗口未打开时通过通知唤醒已安装的 PWA。

| 表面                                               | 功能                                                           |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                   | PWA manifest。一旦浏览器可访问该文件，便会提供“安装应用”选项。 |
| `ui/public/sw.js`                                  | 处理 `push` 事件和通知点击的 Service Worker。                  |
| `push/vapid-keys.json`（位于 OpenClaw 状态目录下） | 用于签署 Web Push 负载的自动生成的 VAPID 密钥对。              |
| `push/web-push-subscriptions.json`                 | 持久化的浏览器订阅端点。                                       |

当您想要固定密钥时（用于多主机部署、密钥轮换或测试），可以通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（默认为 `mailto:openclaw@localhost`）

Control UI 使用这些具有作用域限制的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` — 获取当前有效的 VAPID 公钥。
- `push.web.subscribe` — 注册一个 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已注册的端点。
- `push.web.test` — 向调用者的订阅发送测试通知。

<Note>Web Push 独立于 iOS APNS 中继路径（请参阅 [Configuration](/zh/gateway/configuration) 了解基于中继的推送）以及现有的 `push.test` 方法，后两者针对的是原生移动设备配对。</Note>

## 托管嵌入

Assistant 消息可以使用 `[embed ...]` 简码内联渲染托管 Web 内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">禁止在托管嵌入中执行脚本。</Tab>
  <Tab title="scripts (default)">允许交互式嵌入，同时保持源隔离；这是默认设置，通常足以满足自包含的浏览器游戏/小部件的需求。</Tab>
  <Tab title="trusted">在 `allow-scripts` 之上添加 `allow-same-origin`，用于故意需要更强权限的同站点文档。</Tab>
</Tabs>

示例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>仅当嵌入文档确实需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，`scripts` 是更安全的选择。</Warning>

绝对外部 `http(s)` 嵌入 URL 默认保持阻止状态。如果您故意希望 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="集成 Tailscale Serve（首选）">
    将 Gateway(网关) 保留在环回地址上，并让 Tailscale Serve 使用 HTTPS 进行代理：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开：

    - `https://<magicdns>/` （或您配置的 `gateway.controlUi.basePath`）

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行身份验证。OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求通过带有 Tailscale 的 `x-forwarded-*` 标头的环回地址时才接受这些请求。对于具有浏览器设备身份的 Control UI 操作员会话，此经过验证的 Serve 路径还会跳过设备配对往返过程；无设备浏览器和节点角色连接仍遵循正常的设备检查。如果您想即使对于 Serve 流量也要求显式共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，在写入速率限制之前，来自同一客户端 IP 和身份验证范围的失败身份验证尝试会被序列化。因此，来自同一浏览器的并发错误重试可能会在第二个请求上显示 `retry later`，而不是两个简单的并行不匹配竞争。

    <Warning>
    无令牌 Serve 身份验证假定网关主机是受信任的。如果不受信任的本地代码可能在该主机上运行，请要求令牌/密码身份验证。
    </Warning>

  </Tab>
  <Tab title="绑定到 tailnet + 令牌">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然后打开：

    - `http://<tailscale-ip>:18789/` （或您配置的 `gateway.controlUi.basePath`）

    将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果您通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板，浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，OpenClaw 会阻止没有设备身份的控制 UI 连接。

记录的例外情况：

- 仅限 localhost 的不安全 HTTP 与 `gateway.controlUi.allowInsecureAuth=true` 的兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行操作员控制 UI 身份验证
- 紧急情况 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建议的修复方法：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在网关主机上)

<AccordionGroup>
  <Accordion title="不安全身份验证切换行为">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 仅是一个本地兼容性切换开关：

    - 它允许 localhost 控制 UI 会话在不安全的 HTTP 上下文中无需设备身份即可继续。
    - 它不会绕过配对检查。
    - 它不会放宽远程（非 localhost）设备身份要求。

  </Accordion>
  <Accordion title="仅限紧急情况">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` 会禁用控制 UI 设备身份检查，这是一个严重的安全降级。紧急使用后请尽快恢复。
    </Warning>

  </Accordion>
  <Accordion title="受信任代理说明">
    - 成功的受信任代理身份验证可以允许**操作员**控制 UI 会话在没有设备身份的情况下进入。
    - 这并**不**适用于节点角色控制 UI 会话。
    - 同主机环回反向代理仍然不能满足受信任代理身份验证；请参阅 [Trusted proxy auth](/zh/gateway/trusted-proxy-auth)。
  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参阅 [Tailscale](/zh/gateway/tailscale)。

## 内容安全策略

Control UI 附带严格的 `img-src` 策略：仅允许 **同源** (same-origin) 资产、`data:` URL 和本地生成的 `blob:` URL。浏览器会拒绝远程 `http(s)` 和协议相对的图片 URL，并且不会发起网络获取请求。

实际意味着：

- 在相对路径下提供的头像和图片（例如 `/avatars/<id>`）仍然会渲染，包括 UI 获取并转换为本地 `blob:` URL 的经过身份验证的头像路由。
- 内联 `data:image/...` URL 仍然会渲染（对于协议内负载很有用）。
- 由 Control UI 创建的本地 `blob:` URL 仍然会渲染。
- 由渠道元数据发出的远程头像 URL 会在 Control UI 的头像辅助器中被剥离，并替换为内置的徽标/徽章，因此受损或恶意的渠道无法强制从操作员浏览器中获取任意远程图片。

您无需更改任何内容即可获得此行为——它始终处于启用状态且不可配置。

## 头像路由身份验证

配置网关身份验证时，Control UI 头像端点需要与 API 其余部分相同的网关令牌：

- `GET /avatar/<agentId>` 仅向经过身份验证的调用者返回头像图片。`GET /avatar/<agentId>?meta=1` 在同一规则下返回头像元数据。
- 对任一路由的未经验证的请求都会被拒绝（与同级 assistant-media 路由匹配）。这可以防止头像路由在其他受保护的主机上泄露代理身份。
- Control UI 本身在获取头像时会将网关令牌作为不记名标头转发，并使用经过身份验证的 blob URL，以便图片仍然在仪表板中渲染。

如果您禁用网关身份验证（在共享主机上不推荐），头像路由也将变为未经验证，与网关的其余部分保持一致。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build
```

可选的绝对基础（当您需要固定的资产 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（单独的开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向您的 Gateway(网关) WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway(网关)

Control UI 是静态文件；WebSocket 目标是可配置的，并且可以与 HTTP 源不同。当您需要在本地运行 Vite 开发服务器而在其他地方运行 Gateway(网关) 时，这非常方便。

<Steps>
  <Step title="启动 UI 开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 打开">
    ```text
    http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
    ```

    可选的一次性身份验证（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="备注">
    - `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
    - 应尽可能通过 URL 片段（`#token=...`）传递 `token`。片段不会发送到服务器，从而避免了请求日志和 Referer 泄露。传统的 `?token=` 查询参数为了兼容性仍会导入一次，但这仅作为后备手段，并在启动后立即被剥离。
    - `password` 仅保存在内存中。
    - 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。必须显式提供 `token`（或 `password`）。缺少显式凭据是一个错误。
    - 当 Gateway(网关) 位于 TLS（Tailscale Serve、HTTPS 代理等）之后时，请使用 `wss://`。
    - `gatewayUrl` 仅在顶级窗口（而非嵌入式）中被接受，以防止点击劫持。
    - 非环回 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整的源）。这包括远程开发设置。
    - Gateway(网关) 启动可能会从有效的运行时绑定和端口生成本地源（例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`），但远程浏览器源仍需要显式条目。
    - 除严格控制的本地测试外，不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。这意味着允许任何浏览器源，而不是“匹配我正在使用的任何主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host-header 源回退模式，但这是一个危险的安全模式。
  </Accordion>
</AccordionGroup>

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情：[Remote access](/zh/gateway/remote)。

## 相关

- [Dashboard](/zh/web/dashboard) — 网关仪表板
- [Health Checks](/zh/gateway/health) — 网关健康监控
- [TUI](/zh/web/tui) — 终端用户界面
- [WebChat](/zh/web/webchat) — 基于浏览器的聊天界面
