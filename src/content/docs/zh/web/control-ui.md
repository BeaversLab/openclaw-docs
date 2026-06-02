---
summary: "Gateway(网关)基于浏览器的 Gateway(网关) 控制界面（聊天、活动、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Control UI"
sidebarTitle: "Control UI"
---

控制界面是由 Gateway(网关) 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway(网关) 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway(网关) 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果页面加载失败，请先启动 Gateway：Gateway(网关)`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 Tailscale`gateway.auth.allowTailscale: true` 时的 Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时的 trusted-proxy 身份标头

仪表板设置面板会为当前浏览器标签页会话和选定的 Gateway URL 保留一个令牌；密码不会被持久化。新手引导通常会在首次连接时为共享密钥身份验证生成一个网关令牌，但当 `gateway.auth.mode` 为 `"password"` 时，密码身份验证也可以工作。

## 设备配对（首次连接）

当您从新的浏览器或设备连接到控制界面时，Gateway(网关) 通常需要**一次性配对批准**。这是一项防止未经授权访问的安全措施。

**您将看到：** "disconnected (1008): pairing required"

<Steps>
  <Step title="列出待处理请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="按请求 ID 批准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果浏览器使用更改的身份验证详细信息（角色/作用域/公钥）重试配对，之前的待处理请求将被取代，并创建一个新的 `requestId`。在批准之前重新运行 `openclaw devices list`。

如果浏览器已配对，并且您将其从读取访问权限更改为写入/管理员访问权限，则此操作将被视为批准升级，而不是静默重新连接。OpenClaw 会保持旧批准处于活动状态，阻止更广泛的重新连接，并要求您明确批准新的范围集。

一旦获得批准，该设备会被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。有关令轮换和撤销的信息，请参阅 [设备 CLI](/zh/cli/devices)。

通过 `openclaw_gateway` 适配器连接的 Paperclip 代理使用相同的首次运行批准流程。在初始连接尝试后，运行 `openclaw devices approve --latest` 以预览待处理的请求，然后重新运行打印的 `openclaw devices approve <requestId>` 命令以批准它。对于远程网关，传递显式的 `--url` 和 `--token` 值。为了在重启之间保持批准稳定，请在 Paperclip 中配置持久的 `adapterConfig.devicePrivateKeyPem`，而不是让它每次运行时生成一个新的临时设备身份。

<Note>
- 直接本地回环浏览器连接（`127.0.0.1` / `localhost`）会自动获得批准。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过且浏览器出示其设备身份时，Tailscale Serve 可以跳过 Control UI 操作员会话的配对往返过程。
- 直接 Tailnet 绑定、LAN 浏览器连接以及没有设备身份的浏览器配置文件仍需要显式批准。
- 每个浏览器配置文件都会生成一个唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

</Note>

## 个人身份（浏览器本地）

Control UI 支持附加到传出消息的每个浏览器的个人身份（显示名称和头像），以便在共享会话中进行归属。它存在于浏览器存储中，范围限定于当前浏览器配置文件，除了您实际发送的消息上的正常记录作者身份元数据外，不会同步到其他设备或持久保存在服务器端。清除站点数据或切换浏览器会将其重置为空。

相同的浏览器本地模式也适用于助手头像覆盖。上传的助手头像仅在本地浏览器中覆盖 Gateway 解析的身份，绝不会通过 `config.patch` 进行来回传输。共享的 `ui.assistant.avatar` 配置字段仍然可供直接写入该字段的非 UI 客户端使用（例如脚本化 Gateway 或自定义仪表板）。

## 运行时配置端点

控制 UI 从 `/__openclaw/control-ui-config.json` 获取其运行时设置。该端点与 HTTP 表面的其余部分一样，受相同的 Gateway 身份验证保护：未经身份验证的浏览器无法获取它，成功获取需要已有效的 Gateway 令牌/密码、Tailscale Serve 身份或受信任代理身份。

## 语言支持

控制 UI 可以在首次加载时根据您的浏览器区域设置进行本地化。若要在之后覆盖它，请打开 **Overview -> Gateway(网关) Access -> Language**。区域设置选择器位于 Gateway(网关) Access 卡片中，而不是在 Appearance 下。

- 支持的区域设置：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`ar`、`it`、`tr`、`uk`、`id`、`pl`、`th`、`vi`、`nl`、`fa`
- 非英语翻译在浏览器中延迟加载。
- 所选的区域设置保存在浏览器存储中，并在下次访问时重复使用。
- 缺失的翻译键将回退到英语。

文档翻译针对相同的非英语语言环境集生成，但文档网站内置的 Mintlify 语言选择器仅限于 Mintlify 接受的语言环境代码。泰语 (`th`) 和波斯语 (`fa`) 文档仍在发布仓库中生成；它们可能不会出现在该选择器中，直到 Mintlify 支持这些代码。

## 外观主题

外观面板保留了内置的 Claw、Knot 和 Dash 主题，以及一个浏览器本地的 tweakcn 导入槽。要导入主题，请打开 [tweakcn 编辑器](https://tweakcn.com/editor/theme)，选择或创建一个主题，点击 **Share**，然后将复制的主题链接粘贴到外观中。导入器还接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、像 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 这样的编辑器 URL、相对 `/themes/<id>` 路径、原始主题 ID 以及默认主题名称（例如 `amethyst-haze`）。

外观还包括一个浏览器本地的文本大小设置。该设置与 Control UI 的其余首选项存储在一起，适用于聊天文本、编辑器文本、工具卡片和聊天侧边栏，并保持文本输入至少为 16px，以便移动端 Safari 在聚焦时不会自动缩放。

导入的主题仅存储在当前的浏览器配置文件中。它们不会写入网关配置，也不会跨设备同步。替换导入的主题会更新一个本地插槽；清除它将活动主题切换回 Claw（如果之前选择了导入的主题）。

## 它能做什么（今天）

<AccordionGroup>
  <Accordion title="聊天与对话"Gateway(网关)>
    - 通过 Gateway(网关) WS 与模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`OpenAIGateway(网关))。
    - 聊天历史刷新请求一个有界的近期窗口，并带有单条消息文本上限，这样大型会话不会强迫浏览器在聊天可用之前渲染完整的记录负载。
    - 通过浏览器实时会话进行对话。OpenAI 使用直接 WebRTC，Google Live 通过 WebSocket 使用受限的一次性浏览器令牌，仅后端实时语音插件使用 Gateway(网关) 中继传输。客户端拥有的提供商会话以 `talk.client.create`Gateway(网关) 开始；Gateway(网关) 中继会话以 `talk.session.create`Gateway(网关) 开始。中继将提供商凭证保留在 Gateway(网关) 上，同时浏览器通过 `talk.session.appendAudio` 流式传输麦克风 PCM，通过 `talk.client.toolCall`Gateway(网关)OpenClaw 转发 `openclaw_agent_consult` 提供商工具调用，以便进行 Gateway(网关) 策略处理以及由更大的配置 OpenClaw 模型处理，并通过 `talk.client.steer` 或 `talk.session.steer` 路由活动运行的语音引导。
    - 在聊天中流式传输工具调用 + 实时工具输出卡片 (代理事件)。
    - 活动选项卡，包含来自现有 `session.tool` / 工具事件传递的实时工具活动的浏览器本地、优先编辑摘要。

  </Accordion>
  <Accordion title="渠道、实例、会话、梦境">
    - 渠道：内置以及捆绑/外部插件渠道的状态、二维码登录和单渠道配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 渠道探测刷新会在缓慢的提供商检查完成时保持之前的快照可见，并且当探测或审计超过其 UI 预算时，会对部分快照进行标记。
    - 实例：在线列表 + 刷新（`system-presence`）。
    - 会话：默认列出已配置代理的会话，从过时的未配置代理会话密钥回退，并应用每个会话的模型/思考/快速/详细/跟踪/推理覆盖（`sessions.list`、`sessions.patch`）。
    - 梦境：梦境状态、启用/禁用开关和梦境日记阅读器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。

  </Accordion>
  <Accordion title="Cron、Skills、节点、执行批准">
    - Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史（`cron.*`API）。
    - Skills：状态、启用/禁用、安装、API 密钥更新（`skills.*`）。
    - 节点：列表 + 权限（`node.list`）。
    - 执行批准：编辑网关或节点允许列表 + 针对 `exec host=gateway/node` 询问策略（`exec.approvals.*`）。

  </Accordion>
  <Accordion title="Config">
    - 查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)。
    - 应用 + 使用验证 (`config.apply`) 重启并唤醒上一个活动会话。
    - 写入包含 base-hash 保护，以防止覆盖并发编辑。
    - 写入 (`config.set`/`config.apply`/`config.patch`) 会对提交的配置负载中的引用进行活动 SecretRef 预检解析；未解析的活动已提交引用将在写入前被拒绝。
    - 表单保存会丢弃无法从已保存配置中还原的过时脱敏占位符，同时保留仍映射到已保存密钥的脱敏值。
    - 模式 + 表单渲染 (`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`、匹配的 UI 提示、直接子级摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及插件 + 渠道模式（如果可用））；仅当快照可以安全地进行原始往返时，原始 JSON 编辑器才可用。
    - 如果快照无法安全地进行原始文本往返，Control UI 将强制使用表单模式，并禁用该快照的原始模式。
    - 原始 JSON 编辑器的“重置为已保存”会保留原始创作形状（格式、注释、`$include` 布局），而不是重新渲染扁平化的快照，因此当快照可以安全地进行原始往返时，外部编辑会在重置后保留。
    - 结构化的 SecretRef 对象值在表单文本输入中呈现为只读，以防止意外地将对象转换为字符串。

  </Accordion>
  <Accordion title="调试、日志、更新"RPC>
    - Debug：状态/健康状况/模型快照 + 事件日志 + 手动RPC调用 (`status`, `health`, `models.list`RPC)。
    - 事件日志包括 Control UI 刷新/RPC 计时、慢速聊天/配置渲染计时，以及当浏览器暴露这些 PerformanceObserver 条目类型时，针对长动画帧或长任务的浏览器响应性条目。
    - Logs：Gateway 文件日志的实时跟踪，带有筛选/导出功能 (`logs.tail`)。
    - Update：运行软件包/git 更新 + 重启 (`update.run`)，并附带重启报告，然后在重新连接后轮询 `update.status` 以验证正在运行的 Gateway 版本。

  </Accordion>
  <Accordion title="Cron 作业面板说明">
    - 对于隔离作业，交付默认为公告摘要。如果您希望仅在内部运行，可以切换为 none。
    - 选择公告时，会出现频道/目标字段。
    - Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
    - 对于主会话作业，可使用 webhook 和 none 交付模式。
    - 高级编辑控件包括运行后删除、清除代理覆盖、Cron 精确/交错选项、代理模型/思维覆盖，以及尽力而为交付切换。
    - 表单验证是内联的，具有字段级错误；无效值将禁用保存按钮，直到修复为止。
    - 设置 `cron.webhookToken` 以发送专用的 bearer token，如果省略，则不发送带有身份验证标头的 webhook。
    - 已弃用的后备：存储的具有 `notify: true` 的旧版作业在迁移之前仍可使用 `cron.webhook`。

  </Accordion>
</AccordionGroup>

## Activity 选项卡

Activity 选项卡是一个用于实时工具活动的临时浏览器本地观察者。它源自为聊天工具卡片提供动力的同一 Gateway Gateway(网关)`session.tool`Gateway(网关) / 工具事件流；它不添加另一个 Gateway 事件系列、端点、持久活动存储、指标源或外部观察者流。

活动条目仅保留经过清理的摘要和经过编辑、截断的输出预览。工具参数值不会存储在活动状态中；UI 会显示参数已隐藏，并仅记录参数字段数量。内存中的列表跟随当前浏览器标签页，在 Control UI 内导航时保持，但在页面重新加载、会话切换或点击 **Clear**（清除）时重置。

## 聊天行为

<AccordionGroup>
  <Accordion title="发送与历史记录语义">
    - `chat.send` 是 **非阻塞** 的：它立即以 `{ runId, status: "started" }` 确认，响应通过 `chat` 事件流式传输。
    - 聊天上传支持图片和非视频文件。图片保留本地图片路径；其他文件作为托管媒体存储，并在历史记录中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，运行期间返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - 为确保 UI 安全，`chat.history` 响应的大小受到限制。当对话记录条目过大时，Gateway(网关) 可能会截断长文本字段，省略繁重的元数据块，并使用占位符（`[chat.history omitted: message too large]`）替换超大的消息。
    - 当可见的助手消息在 `chat.history` 中被截断时，侧边阅读器可以通过 `chat.message.get` 按 `sessionKey`、需要时激活的 `agentId` 以及对话记录 `messageId` 按需获取完整的显示规范化对话记录条目。如果 Gateway(网关) 仍无法返回更多内容，阅读器将显示明确的不可用状态，而不是静默重复截断的预览。
    - 助手/生成的图片作为托管媒体引用持久化，并通过经过身份验证的 Gateway(网关) 媒体 URL 返回，因此重新加载不依赖于原始 base64 图片负载保留在聊天历史记录响应中。
    - 在渲染 `chat.history` 时，Control UI 会从可见助手文本中剥离仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及截断的工具调用块）和泄露的 ASCII/全角模型控制令牌，并省略其整个可见文本仅为精确的无声令牌 `NO_REPLY` / `no_reply` 或心跳确认令牌 `HEARTBEAT_OK` 的助手条目。
    - 在活动发送和最终历史记录刷新期间，如果 `chat.history` 短暂返回旧快照，聊天视图将保持本地乐观用户/助手消息可见；一旦 Gateway(网关) 历史记录同步，标准对话记录将替换这些本地消息。
    - 实时 `chat` 事件表示传递状态，而 `chat.history` 是从持久化会话对话记录重建的。工具结束事件后，Control UI 重新加载历史记录并仅合并一小部分乐观尾部；对话记录边界在 [WebChat](/zh/web/webchat) 中有记录。
    - `chat.inject` 将助手注释附加到会话对话记录，并广播 `chat` 事件以进行仅 UI 更新（不运行代理，不进行渠道传递）。
    - 聊天标题在会话选择器之前显示代理过滤器，并且会话选择器的范围由选定的代理确定。切换代理仅显示与该代理关联的会话，并且在尚未保存的仪表板会话时回退到该代理的主会话。
    - 在桌面宽度上，聊天控件保持在一紧凑行中，并在向下滚动对话记录时折叠；向上滚动、返回顶部或到达底部会恢复控件。
    - 连续重复的纯文本消息呈现为一个带有计数徽章的气泡。包含图片、附件、工具输出或画布预览的消息保持展开。
    - 聊天标题模型和思考选择器通过 `sessions.patch` 立即修补活动会话；它们是持久化的会话覆盖，而非仅限单次发送的选项。
    - 如果在针对同一会话的模型选择器更改仍在保存时发送消息，编写器将在调用 `chat.send` 之前等待该会话修补完成，以便发送使用所选模型。
    - 在 Control UI 中输入 `/new` 会创建并切换到与新聊天相同的全新仪表板会话，除非配置了 `session.dmScope: "main"` 且当前父级是代理的主会话；在这种情况下，它会重置主会话。输入 `/reset` 会保留 Gateway(网关) 对当前会话的显式原地重置。
    - 聊天模型选择器请求 Gateway(网关) 的已配置模型视图。如果存在 `agents.defaults.models`，该允许列表驱动选择器，包括使提供商范围目录保持动态的 `provider/*` 条目。否则，选择器显示显式 `models.providers.*.models` 条目以及具有可用身份验证的提供商。完整目录通过带有 `view: "all"` 的调试 `models.list` RPC 保持可用。
    - 当新的 Gateway(网关) 会话使用报告包含当前上下文令牌时，聊天编写器区域显示紧凑的上下文使用指示器。它在高上下文压力下切换到警告样式，并在建议的压缩级别显示运行正常会话压缩路径的紧凑按钮。过时的令牌快照将被隐藏，直到 Gateway(网关) 再次报告新的使用情况。

  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Talk mode uses a registered realtime voice 提供商. Configure OpenAI with `talk.realtime.provider: "openai"` plus either `talk.realtime.providers.openai.apiKey`, `OPENAI_API_KEY`, or an `openai` OAuth profile; configure Google with `talk.realtime.provider: "google"` plus `talk.realtime.providers.google.apiKey`. For hosted GPT realtime models, OpenClaw prefers the `openai` OAuth profile before `OPENAI_API_KEY`; an explicit OpenAI realtime `apiKey` remains the advanced override. The browser never receives a standard 提供商 API key. OpenAI receives an ephemeral Realtime client secret for WebRTC. Google Live receives a one-use constrained Live API auth token for a browser WebSocket 会话, with instructions and 工具 declarations locked into the token by the Gateway(网关). Providers that only expose a backend realtime bridge run through the Gateway(网关) relay transport, so credentials and vendor sockets stay server-side while browser audio moves through authenticated Gateway(网关) RPCs. The Realtime 会话 prompt is assembled by the Gateway(网关); `talk.client.create` does not accept caller-provided instruction overrides.

    The Chat composer includes a Talk options button next to the Talk start/stop button. The options apply to the next Talk 会话 and can override 提供商, transport, 模型, voice, reasoning effort, VAD threshold, silence duration, and prefix padding. When an option is blank, the Gateway(网关) uses configured defaults where available or the 提供商 default. Selecting Gateway(网关) relay forces the backend relay path; selecting WebRTC keeps the 会话 client-owned and fails instead of silently falling back to relay if the 提供商 cannot create a browser 会话.

    In the Chat composer, the Talk control is the waves button next to the microphone dictation button. When Talk starts, the composer status row shows `Connecting Talk...`, then `Talk live` while audio is connected, or `Asking OpenClaw...` while a realtime 工具 call is consulting the configured larger 模型 through `talk.client.toolCall`.

    Maintainer live smoke: `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` verifies the OpenAI backend WebSocket bridge, OpenAI browser WebRTC SDP exchange, Google Live constrained-token browser WebSocket setup, and the Gateway(网关) relay browser adapter with fake microphone media. The command prints 提供商 status only and does not log secrets.

  </Accordion>
  <Accordion title="Stop and abort">
    - 点击 **Stop**（调用 `chat.abort`）。
    - 当运行处于活动状态时，正常的后续追问会排队。点击排队消息上的 **Steer** 以将该追问注入到当前运行的轮次中。
    - 输入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以中止带外操作。
    - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行。

  </Accordion>
  <Accordion title="中止部分保留">
    - 当运行被中止时，UI 中仍可显示部分助手文本。
    - 当存在缓冲输出时，Gateway(网关) 将中止的部分助手文本持久化到对话记录历史中。
    - 持久化的条目包含中止元数据，以便对话记录使用者可以将中止部分与正常完成输出区分开来。

  </Accordion>
</AccordionGroup>

## PWA 安装和 Web 推送

Control UI 随附了一个 `manifest.webmanifest`Gateway(网关) 和一个 service worker，因此现代浏览器可以将其作为独立的 PWA 安装。Web Push 允许 Gateway 即使在标签页或浏览器窗口未打开的情况下，也能通过通知唤醒已安装的 PWA。

如果在 OpenClaw 更新后页面立即显示 **Protocol mismatch**，请先使用 OpenClaw`openclaw dashboard`Gateway(网关) 重新打开控制面板并对页面进行硬刷新。如果仍然失败，请清除控制面板源站点的站点数据或在隐私浏览窗口中测试；旧的标签页或浏览器 service worker 缓存可能会继续运行更新前的 Control UI 包，从而与较新的 Gateway 产生冲突。

| 表面层                                                      | 功能                                               |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `ui/public/manifest.webmanifest`                            | PWA 清单。一旦可访问，浏览器会提供“安装应用”选项。 |
| `ui/public/sw.js`                                           | 用于处理 `push` 事件和通知点击的 Service worker。  |
| `push/vapid-keys.json`OpenClaw （位于 OpenClaw 状态目录下） | 用于签名 Web Push 负载的自动生成的 VAPID 密钥对。  |
| `push/web-push-subscriptions.json`                          | 持久化的浏览器订阅端点。                           |

当您想要固定密钥（用于多主机部署、密钥轮换或测试）时，可以通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` （默认为 `https://openclaw.ai`）

Control UI 使用这些范围受限的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` — 获取活动的 VAPID 公钥。
- `push.web.subscribe` — 注册一个 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已注册的端点。
- `push.web.test` — 向调用者的订阅发送测试通知。

<Note>Web Push 独立于 iOS APNS 中继路径（有关支持中继的推送，请参阅[配置](iOS/en/gateway/configuration))以及现有的 `push.test` 方法，这些方法旨在实现本机移动端配对。</Note>

## 托管嵌入

Assistant 消息可以使用 `[embed ...]` 简码内嵌托管 Web 内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">禁止在托管嵌入中执行脚本。</Tab>
  <Tab title="scripts (default)">允许交互式嵌入，同时保持源隔离；这是默认设置，通常对于独立的浏览器游戏/小组件来说已经足够。</Tab>
  <Tab title="trusted">对于有意需要更强权限的同站点文档，在 `allow-scripts` 之上添加 `allow-same-origin`。</Tab>
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

<Warning>仅当嵌入的文档真正需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，`scripts` 是更安全的选择。</Warning>

绝对外部 `http(s)` 嵌入 URL 默认保持阻止状态。如果您有意希望 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## 聊天消息宽度

分组聊天消息使用可读的默认最大宽度。宽显示器部署可以通过设置 `gateway.controlUi.chatMessageMaxWidth` 来覆盖它，而无需修改打包的 CSS：

```json5
{
  gateway: {
    controlUi: {
      chatMessageMaxWidth: "min(1280px, 82%)",
    },
  },
}
```

该值在到达浏览器之前会经过验证。支持的值包括普通长度和百分比，例如 `960px` 或 `82%`，以及受约束的 `min(...)`、`max(...)`、`clamp(...)`、`calc(...)` 和 `fit-content(...)` 宽度表达式。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="Tailscale集成 Tailscale Serve（推荐）"Gateway(网关)Tailscale>
    将 Gateway(网关) 保持在环回地址上，并让 Tailscale Serve 通过 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开：

    - `https://<magicdns>/` （或您配置的 `gateway.controlUi.basePath`Tailscale）

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true`OpenClaw 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行身份验证。OpenClaw 通过 `tailscale whois`Tailscale 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求使用 Tailscale 的 `x-forwarded-*` 标头命中环回地址时才接受这些请求。对于具有浏览器设备身份的 Control UI 操作员会话，此验证过的 Serve 路径还会跳过设备配对往返；无设备浏览器和节点角色连接仍然遵循正常的设备检查。如果您希望即使对于 Serve 流量也要求显式共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，相同客户端 IP 和身份验证范围的失败身份验证尝试会在速率限制写入之前进行序列化。因此，来自同一浏览器的并发错误重试可能会在第二个请求上显示 `retry later`，而不是两个普通的不匹配请求并行竞争。

    <Warning>
    无令牌 Serve 身份验证假定网关主机是受信任的。如果该主机上可能运行不受信任的本地代码，请要求令牌/密码身份验证。
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

如果您通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`OpenClaw）打开仪表板，浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，OpenClaw 会**阻止**没有设备身份的 Control UI 连接。

文档记录的例外情况：

- 仅限 localhost 的不安全 HTTP 与 `gateway.controlUi.allowInsecureAuth=true` 的兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行操作员 Control UI 身份验证
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建议的修复方法：** 使用 HTTPS (Tailscale Serve) 或在本地打开 UI：

- `https://<magicdns>/` (服务)
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

    - 它允许 localhost Control UI 会话在不安全 HTTP 上下文中没有设备身份的情况下继续进行。
    - 它不会绕过配对检查。
    - 它不会放宽远程（非 localhost）设备身份的要求。

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
    `dangerouslyDisableDeviceAuth` 禁用 Control UI 设备身份检查，是一种严重的安全降级。紧急使用后请快速恢复。
    </Warning>

  </Accordion>
  <Accordion title="受信任代理说明">
    - 成功的受信任代理身份验证可以允许没有设备身份的**操作员** Control UI 会话进入。
    - 这**不**适用于节点角色 Control UI 会话。
    - 同主机环回反向代理仍不能满足受信任代理身份验证；请参阅[受信任代理身份验证](/zh/gateway/trusted-proxy-auth)。

  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指南，请参阅 [Tailscale](Tailscale/en/gateway/tailscale)。

## 内容安全策略

Control UI 附带严格的 `img-src` 策略：仅允许**同源**资源、`data:` URL 和本地生成的 `blob:` URL。浏览器会拒绝远程 `http(s)` 和协议相对图像 URL，并且不会发起网络获取请求。

这在实践中意味着：

- 在相对路径下提供的头像和图像（例如 `/avatars/<id>`）仍然会渲染，包括 UI 获取并转换为本地 `blob:` URL 的经过身份验证的头像路由。
- 内联 `data:image/...` URL 仍然会渲染（对于协议内有效负载很有用）。
- 由 Control UI 创建的本地 `blob:` URL 仍然会渲染。
- 由渠道元数据发出的远程头像 URL 会在 Control UI 的头像辅助程序中被剥离，并替换为内置的徽标/徽章，因此受损或恶意的渠道无法强制操作员浏览器进行任意的远程图像获取。

您无需更改任何内容即可获得此行为 — 它始终开启且不可配置。

## 头像路由身份验证

当配置网关身份验证时，Control UI 头像端点需要与 API 的其余部分相同的网关令牌：

- `GET /avatar/<agentId>` 仅向经过身份验证的调用者返回头像图像。`GET /avatar/<agentId>?meta=1` 在相同规则下返回头像元数据。
- 对任一路由的未经身份验证的请求都会被拒绝（与同级 assistant-media 路由匹配）。这可以防止头像路由在其他受保护的主机上泄露代理身份。
- Control UI 本身在获取头像时将网关令牌作为不记名标头转发，并使用经过身份验证的 blob URL，以便图像仍然在仪表板中渲染。

如果您禁用网关身份验证（在共享主机上不推荐），头像路由也将变为未经身份验证，与网关的其余部分保持一致。

## Assistant 媒体路由身份验证

当配置网关身份验证时，assistant 本地媒体预览使用两步路由：

- `GET /__openclaw__/assistant-media?meta=1&source=<path>` 需要标准的 Control UI 操作员身份验证。浏览器在检查可用性时会将 Gateway 令牌作为不记名标头发送。
- 成功的元数据响应包含一个短期有效的 `mediaTicket`，其范围限定于该确切源路径。
- 浏览器渲染的图像、音频、视频和文档 URL 使用 `mediaTicket=<ticket>` 而不是活动的 Gateway 令牌或密码。票据很快就会过期，并且无法授权不同的源。

这保持了正常的媒体渲染与浏览器原生媒体元素的兼容性，同时不会将可重用的 Gateway 凭证放入可见的媒体 URL 中。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build
```

可选的绝对基础路径（当您想要固定的资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（单独的开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向您的 Gateway(网关) WS URL（例如 `ws://127.0.0.1:18789`）。

## 空白的 Control UI 页面

如果浏览器加载了空白仪表板，且 DevTools 未显示有用的错误，则可能是扩展程序或早期内容脚本阻止了 JavaScript 模块应用程序的执行。静态页面包含一个纯 HTML 恢复面板，当 `<openclaw-app>` 在启动后未注册时，该面板会出现。

在更改浏览器环境后，请使用面板中的 **Try again** (重试) 操作，或在执行这些检查后手动重新加载：

- 禁用注入到所有页面的扩展程序，尤其是具有 `<all_urls>` 内容脚本的扩展程序。
- 尝试使用隐私窗口、干净的浏览器配置文件或其他浏览器。
- 保持 Gateway(网关) 运行，并在更改浏览器后验证相同的仪表板 URL。

## 调试/测试：开发服务器 + 远程 Gateway(网关)

Control UI 是静态文件；WebSocket 目标是可配置的，并且可以与 HTTP 源不同。当您在本地使用 Vite 开发服务器但 Gateway(网关) 在其他地方运行时，这非常方便。

<Steps>
  <Step title="启动 UI 开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 打开">
    ```text
    http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
    ```

    可选的一次性身份验证（如果需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
    - 如果您通过 `gatewayUrl` 传递完整的 `ws://` 或 `wss://` 端点，请对 `gatewayUrl` 值进行 URL 编码，以便浏览器正确解析查询字符串。
    - `token` 应尽可能通过 URL 片段 (`#token=...`) 传递。片段不会发送到服务器，从而避免了请求日志和 Referer 泄露。出于兼容性原因，传统的 `?token=` 查询参数仍会被导入一次，但仅作为后备，并在启动后立即被剥离。
    - `password` 仅保存在内存中。
    - 当设置 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。请显式提供 `token`（或 `password`）。缺少显式凭据则视为错误。
    - 当 Gateway(网关) 位于 TLS（Tailscale Serve、HTTPS 代理等）之后时，请使用 `wss://`。
    - `gatewayUrl` 仅在顶级窗口（非嵌入式）中被接受，以防止点击劫持。
    - 公共非环回 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整源站）。来自环回地址、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet 加载无需启用 Host-header 后备即可被接受。
    - Gateway(网关) 启动时可能会根据有效的运行时绑定地址和端口生成本地源站（如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`），但远程浏览器源站仍需显式条目。
    - 不要使用 `gateway.controlUi.allowedOrigins: ["*"]`，除非是严格控制下的本地测试。这意味着允许任何浏览器源站，而不是“匹配我使用的任何主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host-header 源站后备模式，但这是一种危险的安全模式。

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
- [TUI](TUI/en/web/tui) — 终端用户界面
- [WebChat](WebChat/en/web/webchat) — 基于浏览器的聊天界面
