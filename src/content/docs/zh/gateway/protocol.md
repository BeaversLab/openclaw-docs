---
summary: "Gateway(网关)Gateway(网关) WebSocket 协议：握手、帧、版本控制"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Gateway(网关)Gateway(网关) 协议"
---

Gateway(网关) WS 协议是 OpenClaw 的**单一控制平面 + 节点传输**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）均通过 WebSocket 连接，并在握手时声明其 **role** + **scope**。

## 传输

- WebSocket，带有 JSON 载荷的文本帧。
- 第一帧**必须**是一个 `connect` 请求。
- 连接前的帧上限为 64 KiB。成功握手后，客户端应遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes` 限制。如果启用了诊断功能，超大的入站帧和缓慢的出站缓冲区会在 Gateway 关闭或丢弃受影响的帧之前发出 `payload.large` 事件。这些事件包含大小、限制、表面和安全原因代码。它们不包含消息正文、附件内容、原始帧正文、令牌、Cookie 或机密值。

## 握手 (连接)

Gateway(网关) 网关 → 客户端 (连接前挑战)：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → Gateway(网关) 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway(网关) 网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 4,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

当 Gateway(网关) 仍在完成启动 Sidecar 时，Gateway(网关)`connect` 请求可能会返回一个可重试的 `UNAVAILABLE` 错误，其中 `details.reason` 设置为 `"startup-sidecars"` 和 `retryAfterMs`。客户端应在其总体连接预算内重试该响应，而不是将其作为最终的握手失败呈现。

`server`、`features`、`snapshot` 和 `policy` 都是架构（`src/gateway/protocol/schema/frames.ts`）所必需的。`auth` 也是必需的，用于报告协商的角色/范围。`pluginSurfaceUrls` 是可选的，用于将插件表面名称（例如 `canvas`）映射到有作用域的托管 URL。

有作用域的插件表面 URL 可能会过期。节点可以调用 `node.pluginSurface.refresh` 并附带 `{ "surface": "canvas" }`，以接收 `pluginSurfaceUrls`Canvas 中的新条目。实验性的 Canvas 插件重构不支持已弃用的 `canvasHostUrl`、`canvasCapability` 或 `node.canvas.capability.refresh` 兼容性路径；当前的本机客户端和 Gateway 必须使用插件表面。

当未颁发设备令牌时，`hello-ok.auth` 会报告协商的权限但不包含令牌字段：

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

受信任的同一进程后端客户端（`client.id: "gateway-client"`、
`client.mode: "backend"`）在使用共享网关令牌/密码进行身份验证时，可以在直接回环连接上省略 `device`。此路径保留用于内部控制平面 RPC，并防止过时的 CLI/设备配对基线阻塞本地后端工作（例如子代理会话更新）。远程客户端、浏览器源客户端、节点客户端以及显式的设备令牌/设备身份客户端仍使用正常的配对和范围升级检查。

当颁发设备令牌时，`hello-ok` 还包括：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的引导切换期间，`hello-ok.auth` 可能还会在 `deviceTokens` 中包含额外的有界角色条目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

对于内置的节点/操作员引导流程，主节点令牌保持 `scopes: []`，任何传递的操作员令牌保持受限于引导操作员允许列表（`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`）。引导范围检查保持角色前缀：操作员条目仅满足操作员请求，非操作员角色仍需要在其自身角色前缀下的范围。

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

具有副作用的方法需要**幂等性键**（请参阅架构）。

## 角色 + 范围

有关完整的操作员范围模型、批准时检查和共享密钥语义，请参阅[操作员范围](/zh/gateway/operator-scopes)。

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能主机（摄像头/屏幕/画布/system.run）。

### 范围（操作员）

常用范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` 与 `includeSecrets: true` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

插件注册的 Gateway RPC 方法可以请求其自己的操作员范围，但
保留的核心管理员前缀（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终解析为 `operator.admin`。

方法范围只是第一道关卡。通过 `chat.send` 访问的某些斜杠命令
会在其上应用更严格的命令级检查。例如，持久化
`/config set` 和 `/config unset` 的写入需要 `operator.admin`。

`node.pair.approve` 在基础方法范围之上还有一个额外的
审批时范围检查：

- 无命令请求：`operator.pairing`
- 包含非执行节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：
  `operator.pairing` + `operator.admin`

### 能力/命令/权限（节点）

节点在连接时声明能力声明：

- `caps`：高级能力类别，例如 `camera`、`canvas`、`screen`、
  `location`、`voice` 和 `talk`。
- `commands`：用于调用的命令允许列表。
- `permissions`：细粒度切换（例如 `screen.record`、`camera.capture`）。

Gateway Gateway(网关) 将这些视为 **声明** 并强制执行服务器端允许列表。

## 在线状态

- `system-presence` 返回按设备身份键入的条目。
- Presence 条目包含 `deviceId`、`roles` 和 `scopes`，以便 UI 可以每个设备显示一行，即使它同时作为 **operator** 和 **node** 连接。
- `node.list` 包含可选的 `lastSeenAtMs` 和 `lastSeenReason` 字段。已连接的节点将其当前连接时间报告为 `lastSeenAtMs` 并附带原因 `connect`；配对的节点也可以在受信任节点事件更新其配对元数据时报告持久的后台存在状态。

### 节点后台存活事件

节点可以调用 `node.event` 并使用 `event: "node.presence.alive"` 来记录配对节点在后台唤醒期间是存活的，而无需将其标记为已连接。

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` 是一个封闭枚举：`background`、`silent_push`、`bg_app_refresh`、`significant_location`、`manual` 或 `connect`。未知的触发字符串在持久化之前会被网关规范化为 `background`。该事件仅对经过身份验证的节点设备会话持久化；无设备或未配对的会话返回 `handled: false`。

成功的网关返回一个结构化结果：

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

较旧的网关可能仍会为 `node.event` 返回 `{ "ok": true }`；客户端应将其视为已确认的 RPC，而非持久的 Presence 持久化。

## 广播事件范围限定

服务器推送的 WebSocket 广播事件是按范围限定的，以便配对范围或仅节点的会话不会被动接收会话内容。

- **聊天、代理和工具结果帧**（包括流式 `agent` 事件和工具调用结果）至少需要 `operator.read`。没有 `operator.read` 的会话会完全跳过这些帧。
- **插件定义的 `plugin.*` 广播**根据插件注册方式，被限定为 `operator.write` 或 `operator.admin`。
- **状态和传输事件**（`heartbeat`、`presence`、`tick`、连接/断开连接生命周期等）保持不受限制，以便每个经过身份验证的会话都能观察到传输的健康状况。
- **未知的广播事件系列**在默认情况下受范围限制（失效关闭），除非已注册的处理程序明确放宽了限制。

每个客户端连接都保留自己的每客户端序列号，因此即使不同的客户端看到的事件流具有不同的范围过滤子集，广播也能在该套接字上保持单调顺序。

## 常见 RPC 方法系列

公共 WS 接口比上面的握手/身份验证示例更广泛。这不是生成的转储——`hello-ok.features.methods` 是一个基于 `src/gateway/server-methods-list.ts` 加上已加载的插件/渠道方法导出构建的保守发现列表。将其视为功能发现，而不是 `src/gateway/server-methods/*.ts` 的完整枚举。

<AccordionGroup>
  <Accordion title="系统和身份">
    - `health` 返回缓存或新探测的网关健康快照。
    - `diagnostics.stability` 返回最近的有限诊断稳定性记录器。它保留操作元数据，例如事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称和会话 ID。它不保留聊天文本、webhook 主体、工具输出、原始请求或响应主体、令牌、Cookie 或机密值。需要操作员读取范围。
    - `status` 返回 `/status` 风格的网关摘要；敏感字段仅包含在具有管理员范围的操作员客户端中。
    - `gateway.identity.get` 返回中继和配对流程使用的网关设备身份。
    - `system-presence` 返回已连接的操作员/节点设备的当前存在快照。
    - `system-event` 追加系统事件，并可以更新/广播存在上下文。
    - `last-heartbeat` 返回最新持久化的心跳事件。
    - `set-heartbeats` 切换网关上的心跳处理。

  </Accordion>

  <Accordion title="模型和用法">
    - `models.list` 返回运行时允许的模型目录。传递 `{ "view": "configured" }` 以获取适用于选择器的已配置模型（`agents.defaults.models` 优先，然后是 `models.providers.*.models`），或传递 `{ "view": "all" }` 以获取完整目录。
    - `usage.status` 返回提供商使用情况窗口/剩余配额摘要。
    - `usage.cost` 返回指定日期范围的汇总成本使用摘要。
    - `doctor.memory.status` 返回活动默认代理工作区的向量内存/缓存嵌入就绪状态。仅当调用者明确需要实时嵌入提供商 Ping 时，才传递 `{ "probe": true }` 或 `{ "deep": true }`。
    - `doctor.memory.remHarness` 为远程控制平面客户端返回有界的、只读 REM 预览。它可能包含工作区路径、内存片段、渲染的落地 Markdown 以及深度提升候选项，因此调用者需要 `operator.read`。
    - `sessions.usage` 返回每个会话的使用摘要。
    - `sessions.usage.timeseries` 返回单个会话的时序使用情况。
    - `sessions.usage.logs` 返回单个会话的使用日志条目。

  </Accordion>

  <Accordion title="渠道和登录助手">
    - `channels.status` 返回内置 + 捆绑的渠道/插件状态摘要。
    - `channels.logout` 注销特定的渠道/账户（在该渠道支持注销的情况下）。
    - `web.login.start` 为当前支持二维码的 Web 渠道提供商启动二维码/Web 登录流程。
    - `web.login.wait` 等待该二维码/Web 登录流程完成，并在成功时启动渠道。
    - `push.test`iOS 向已注册的 iOS 节点发送测试 APNs 推送。
    - `voicewake.get` 返回存储的唤醒词触发器。
    - `voicewake.set` 更新唤醒词触发器并广播更改。

  </Accordion>

  <Accordion title="消息与日志">
    - `send`RPC 是用于聊天运行器之外的渠道/账户/线程定向发送的直接出站交付 RPC。
    - `logs.tail` 返回配置的网关文件日志尾部，并带有游标/限制和最大字节控制。

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` 返回用于语音、流式转录和实时语音的只读 Talk 提供商目录。它包括提供商 ID、标签、配置状态、公开的模型/语音 ID、规范模式、传输、大脑策略以及实时音频/能力标志，而不返回提供商机密或更改全局配置。
    - `talk.config` 返回有效的 Talk 配置载荷；`includeSecrets` 需要 `operator.talk.secrets`（或 `operator.admin`）。
    - `talk.session.create`Gateway(网关) 为 `realtime/gateway-relay`、`transcription/gateway-relay` 或 `stt-tts/managed-room` 创建 Gateway 拥有的 Talk 会话。`brain: "direct-tools"` 需要 `operator.admin`。
    - `talk.session.join` 验证托管房间会话令牌，根据需要发出 `session.ready` 或 `session.replaced` 事件，并返回房间/会话元数据以及最近的 Talk 事件，但不包含明文令牌或存储的令牌哈希。
    - `talk.session.appendAudio`Gateway(网关) 将 base64 PCM 输入音频追加到 Gateway 拥有的实时中继和转录会话。
    - `talk.session.startTurn`、`talk.session.endTurn` 和 `talk.session.cancelTurn` 驱动托管房间的轮次生命周期，并在状态清除之前拒绝过时的轮次。
    - `talk.session.cancelOutput`Gateway(网关) 停止助手音频输出，主要用于 Gateway 中继会话中的 VAD 门控插话。
    - `talk.session.submitToolResult`Gateway(网关) 完成 Gateway 拥有的实时中继会话发出的提供商工具调用。当最终结果将紧随其后时，传递 `options: { willContinue: true }` 以获取临时工具输出；或者当工具结果应满足提供商调用而不启动另一个实时助手响应时，传递 `options: { suppressResponse: true }`。
    - `talk.session.close`Gateway(网关) 关闭 Gateway 拥有的中继、转录或托管房间会话，并发出终端 Talk 事件。
    - `talk.mode`WebChat 为 WebChat/Control UI 客户端设置/广播当前的 Talk 模式状态。
    - `talk.client.create` 使用 `webrtc` 或 `provider-websocket`Gateway(网关) 创建客户端拥有的实时提供商会话，同时 Gateway 拥有配置、凭据、指令和工具策略。
    - `talk.client.toolCall`Gateway(网关) 允许客户端拥有的实时传输将提供商工具调用转发到 Gateway 策略。第一个支持的工具是 `openclaw_agent_consult`；客户端在提交特定于提供商的工具结果之前接收运行 ID 并等待正常的聊天生命周期事件。
    - `talk.event` 是用于实时、转录、STT/TTS、托管房间、电话和会议适配器的单一 Talk 事件渠道。
    - `talk.speak` 通过活动的 Talk 语音提供商合成语音。
    - `tts.status` 返回 TTS 启用状态、活动提供商、备用提供商和提供商配置状态。
    - `tts.providers` 返回可见的 TTS 提供商清单。
    - `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
    - `tts.setProvider` 更新首选的 TTS 提供商。
    - `tts.convert` 运行一次性文本到语音转换。

  </Accordion>

  <Accordion title="Secrets, config, update, and wizard">
    - `secrets.reload` 重新解析活动的 SecretRef，并仅在完全成功时交换运行时密钥状态。
    - `secrets.resolve` 解析特定命令/目标集的命令目标密钥分配。
    - `config.get` 返回当前配置快照和哈希值。
    - `config.set` 写入经过验证的配置负载。
    - `config.patch` 合并部分配置更新。
    - `config.apply` 验证并替换完整的配置负载。
    - `config.schema` 返回控制 UI 和 CLI 工具使用的实时配置架构负载：schema（架构）、`uiHints`、版本和生成元数据，包括当运行时可以加载时的插件 + 渠道架构元数据。该架构包含字段 `title` / `description` 元数据，这些元数据派生自 UI 使用的相同标签和帮助文本，包括嵌套对象、通配符、数组项以及 `anyOf` / `oneOf` / `allOf` 组合分支（当存在匹配的字段文档时）。
    - `config.schema.lookup` 返回一个配置路径的路径范围查找负载：标准化路径、浅层架构节点、匹配的提示 + `hintPath`，以及用于 UI/CLI 向下钻取的直接子项摘要。查找架构节点保留面向用户的文档和通用验证字段（`title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、数字/字符串/数组/对象边界，以及如 `additionalProperties`、`deprecated`、`readOnly`、`writeOnly` 等标志）。子项摘要公开 `key`、标准化的 `path`、`type`、`required`、`hasChildren`，以及匹配的 `hint` / `hintPath`。
    - `update.run` 运行网关更新流程，并仅在更新本身成功时安排重启；拥有会话的调用者可以包含 `continuationMessage`，以便启动通过重启继续队列恢复一个后续代理轮次。包管理器更新在包交换后强制执行非延迟、无冷却的更新重启，以便旧的 Gateway(网关) 进程不会继续从替换后的 `dist` 树进行延迟加载。
    - `update.status` 返回最新的缓存更新重启标记，包括可用时重启后的运行版本。
    - `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过 WS RPC 公开新手引导向导。

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` 返回已配置的代理条目，包括有效的模型和运行时元数据。
    - `agents.create`、`agents.update` 和 `agents.delete` 管理代理记录和工作区连接。
    - `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为代理暴露的引导工作区文件。
    - `tasks.list`、`tasks.get` 和 `tasks.cancel` 向 SDK 和操作员客户端暴露 Gateway(网关) 任务账本。
    - `artifacts.list`、`artifacts.get` 和 `artifacts.download` 为显式的 `sessionKey`、`runId` 或 `taskId` 范围暴露源自记录的摘要和下载内容。运行和任务查询在服务端解析所属会话，且仅返回具有匹配来源的记录媒体；不安全或本地 URL 源将返回不支持的下载，而不是在服务端获取。
    - `environments.list` 和 `environments.status` 向 SDK 客户端暴露只读的 Gateway(网关) 本地和节点环境发现。
    - `agent.identity.get` 返回代理或会话的有效助手身份。
    - `agent.wait` 等待运行完成，并在可用时返回最终快照。

  </Accordion>

  <Accordion title="Session control">
    - `sessions.list` 返回当前会话索引，当配置了代理运行时后端时，包括每行 `agentRuntime` 元数据。
    - `sessions.subscribe` 和 `sessions.unsubscribe` 切换当前 WS 客户端的会话更改事件订阅。
    - `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 切换单个会话的转录/消息事件订阅。
    - `sessions.preview` 返回特定会话键的有界转录预览。
    - `sessions.describe` 返回精确会话键的一条 Gateway(网关) 会话记录。
    - `sessions.resolve` 解析或规范化会话目标。
    - `sessions.create` 创建一个新的会话条目。
    - `sessions.send` 向现有会话发送消息。
    - `sessions.steer` 是活动会话的中断和引导变体。
    - `sessions.abort` 中止会话的活跃工作。调用者可以传递 `key` 加上可选的 `runId`，或者对于 Gateway(网关) 可以解析为会话的活跃运行，仅传递 `runId`。
    - `sessions.patch` 更新会话元数据/覆盖，并报告解析的规范模型加上有效的 `agentRuntime`。
    - `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
    - `sessions.get` 返回完整的存储会话记录。
    - 聊天执行仍然使用 `chat.history`、`chat.send`、`chat.abort` 和 `chat.inject`。`chat.history` 针对 UI 客户端进行了显示规范化：内联指令标签从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌被剥离，纯静默令牌助手行（如精确的 `NO_REPLY` / `no_reply`）被省略，过大的行可以用占位符替换。

  </Accordion>

  <Accordion title="设备配对和设备令牌">
    - `device.pair.list` 返回待定和已批准的配对设备。
    - `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理设备配对记录。
    - `device.token.rotate` 在其批准的角色和调用者范围内轮换配对设备令牌。
    - `device.token.revoke` 在其批准的角色和调用者范围内吊销配对设备令牌。

  </Accordion>

  <Accordion title="节点配对、调用和待处理工作">
    - `node.pair.request`、`node.pair.list`、`node.pair.approve`、`node.pair.reject`、`node.pair.remove` 和 `node.pair.verify` 涵盖节点配对和引导验证。
    - `node.list` 和 `node.describe` 返回已知/已连接的节点状态。
    - `node.rename` 更新配对节点标签。
    - `node.invoke` 将命令转发到已连接的节点。
    - `node.invoke.result` 返回调用请求的结果。
    - `node.event` 将节点发起的事件带回网关。
    - `node.pending.pull` 和 `node.pending.ack` 是已连接节点队列 API。
    - `node.pending.enqueue` 和 `node.pending.drain` 管理离线/断开连接节点的持久待处理工作。

  </Accordion>

  <Accordion title="Approval families">
    - `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和 `exec.approval.resolve` 涵盖一次性执行批准请求以及待定批准的查找/重放。
    - `exec.approval.waitDecision` 等待一个待定的执行批准并返回最终决定（或在超时时返回 `null`）。
    - `exec.approvals.get` 和 `exec.approvals.set` 管理网关执行批准策略快照。
    - `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点中继命令管理节点本地执行批准策略。
    - `plugin.approval.request`、`plugin.approval.list`、`plugin.approval.waitDecision` 和 `plugin.approval.resolve` 涵盖插件定义的批准流程。

  </Accordion>

  <Accordion title="Automation, skills, and tools">
    - Automation（自动化）：`wake` 调度立即或下一次心跳唤醒文本注入；`cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、`cron.run` 和 `cron.runs` 管理预定工作。
    - Skills and tools（技能和工具）：`commands.list`、`skills.*`、`tools.catalog`、`tools.effective` 和 `tools.invoke`。

  </Accordion>
</AccordionGroup>

### 常见事件系列

- `chat`：UI 聊天更新，例如 `chat.inject` 以及其他仅限记录的聊天
  事件。
- `session.message` 和 `session.tool`：已订阅会话的
  记录/事件流更新。
- `sessions.changed`：会话索引或元数据已更改。
- `presence`：系统在线状态快照更新。
- `tick`：定期保活 / 存活事件。
- `health`：网关健康快照更新。
- `heartbeat`：心跳事件流更新。
- `cron`：cron 运行/作业变更事件。
- `shutdown`：Gateway 关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点调用请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备生命周期。
- `voicewake.changed`：唤醒词触发配置已更改。
- `exec.approval.requested` / `exec.approval.resolved`：执行批准
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件批准
  生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins` 来获取当前的可执行技能列表
  以进行自动允许检查。

### 任务账本 RPC

操作员客户端可以通过任务账本 RPC 检查和取消 Gateway(网关) 后台任务记录。这些方法返回经过清理的任务摘要，而不是原始
运行时状态。

- `tasks.list` 需要 `operator.read`。
  - 参数：可选的 `status` (`"queued"`、`"running"`、`"completed"`、
    `"failed"`、`"cancelled"` 或 `"timed_out"`) 或这些状态的数组，
    可选的 `agentId`，可选的 `sessionKey`，可选的 `limit` 从 `1` 到
    `500`，以及可选的字符串 `cursor`。
  - 结果：`{ "tasks": TaskSummary[], "nextCursor"?: string }`。
- `tasks.get` 需要 `operator.read`。
  - 参数：`{ "taskId": string }`。
  - 结果：`{ "task": TaskSummary }`。
  - 缺失的任务 ID 将返回 Gateway(网关) 的未找到错误格式。
- `tasks.cancel` 需要 `operator.write`。
  - 参数：`{ "taskId": string, "reason"?: string }`。
  - 结果：
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`。
  - `found` 报告账本是否有匹配的任务。`cancelled`
    报告运行时是否接受或记录了取消操作。

`TaskSummary` 包含 `id`、`status` 以及可选元数据，例如 `kind`、
`runtime`、`title`、`agentId`、`sessionKey`、`childSessionKey`、`ownerKey`、
`runId`、`taskId`、`flowId`、`parentTaskId`、`sourceId`、时间戳、进度、
最终摘要以及经过清理的错误文本。

### Operator helper methods

- 操作员可以调用 `commands.list` (`operator.read`) 来获取代理的
  运行时命令清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - `scope` 控制主要的 `name` 目标哪个界面：
    - `text` 返回不带前缀 `/` 的主要文本命令令牌
    - `native` 和默认 `both` 路径在可用时返回
      提供商感知的原生名称
  - `textAliases` 携带精确的斜杠别名，例如 `/model` 和 `/m`。
  - `nativeName` 携带提供商感知的原生命令名称（如果存在）。
  - `provider` 是可选的，仅影响原生命名和原生插件
    命令的可用性。
  - `includeArgs=false` 会从响应中省略序列化的参数元数据。
- 操作员可以调用 `tools.catalog` (`operator.read`) 来获取代理的
  运行时工具目录。响应包括分组工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：插件所有者，当 `source="plugin"` 时
  - `optional`：插件工具是否可选
- 操作员可以调用 `tools.effective` (`operator.read`) 来获取会话的运行时有效工具清单。
  - `sessionKey` 是必需的。
  - 网关从服务端的会话派生受信任的运行时上下文，而不是接受调用者提供的身份验证或传递上下文。
  - 响应范围限定于会话，并反映了当前活跃对话可立即使用的内容，包括核心、插件和渠道工具。
- 操作员可以调用 `tools.invoke` (`operator.write`) 通过与 `/tools/invoke` 相同的网关策略路径来调用一个可用工具。
  - `name` 是必需的。`args`、`sessionKey`、`agentId`、`confirm` 和 `idempotencyKey` 是可选的。
  - 如果同时存在 `sessionKey` 和 `agentId`，解析出的会话代理必须匹配 `agentId`。
  - 响应是一个面向 SDK 的信封，包含 `ok`、`toolName`、可选的 `output` 和类型化的 `error` 字段。批准或策略拒绝会在负载中返回 `ok:false`，而不是绕过网关工具策略管道。
- 操作员可以调用 `skills.status` (`operator.read`) 来获取代理的可见技能清单。
  - `agentId` 是可选的；省略它以读取默认代理工作区。
  - 响应包括资格、缺失要求、配置检查以及经过清理的安装选项，且不暴露原始机密值。
- 操作员可以调用 `skills.search` 和 `skills.detail` (`operator.read`) 以获取 ClawHub 发现元数据。
- 操作员可以调用 `skills.upload.begin`、`skills.upload.chunk` 和
  `skills.upload.commit` (`operator.admin`) 在安装私有技能归档之前对其进行暂存。这是针对受信任客户端的独立管理员上传路径，而非正常的 ClawHub 技能安装流程，并且默认处于禁用状态，除非启用了 `skills.install.allowUploadedArchives`。
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    创建一个绑定到该 slug 和 force 值的上传任务。
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` 在精确的解码偏移量处追加字节。
  - `skills.upload.commit({ uploadId, sha256? })` 验证最终大小和
    SHA-256。Commit 仅完成上传；它不会安装该技能。
  - 上传的技能归档是包含 `SKILL.md` 根目录的 zip 归档。
    归档的内部目录名称从不选择安装目标。
- 操作员可以以三种模式调用 `skills.install` (`operator.admin`)：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将
    技能文件夹安装到默认 agent 工作区的 `skills/` 目录中。
  - 上传模式：`{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    将已提交的上传安装到默认 agent 工作区的 `skills/<slug>`
    目录中。Slug 和 force 值必须与原始的
    `skills.upload.begin` 请求匹配。除非启用了
    `skills.install.allowUploadedArchives`，否则该模式将被拒绝。此设置不影响
    ClawHub 安装。
  - Gateway(网关) 安装程序模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在网关主机上运行已声明的 `metadata.openclaw.install` 操作。
- 操作员可以以两种模式调用 `skills.update` (`operator.admin`)：
  - ClawHub 模式更新默认 agent 工作区中一个已跟踪的 slug 或所有已跟踪的 ClawHub 安装。
  - 配置模式修补 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

### `models.list` 视图

`models.list` 接受一个可选的 `view` 参数：

- 省略或 `"default"`：当前运行时行为。如果配置了 `agents.defaults.models`，响应为允许的目录，包括 `provider/*`Gateway(网关) 条目的动态发现的模型。否则响应为完整的 Gateway(网关) 目录。
- `"configured"`：选择器大小的行为。如果配置了 `agents.defaults.models`，它仍然优先，包括 `provider/*` 条目的提供商范围发现。如果没有允许列表，响应使用显式的 `models.providers.*.models` 条目，仅当不存在配置的模型行时才回退到完整目录。
- `"all"`Gateway(网关)：完整的 Gateway(网关) 目录，绕过 `agents.defaults.models`。将此用于诊断和发现 UI，而不是普通的模型选择器。

## 执行批准

- 当执行请求需要批准时，网关广播 `exec.approval.requested`。
- 操作员客户端通过调用 `exec.approval.resolve` 进行解析（需要 `operator.approvals` 范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。
- 批准后，转发的 `node.invoke system.run` 调用重用该规范的
  `systemRunPlan` 作为权威的命令/cwd/会话上下文。
- 如果调用者在准备阶段和最终批准的 `system.run` 转发之间更改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网关将拒绝运行，而不是信任更改后的有效负载。

## 代理投递回退

- `agent` 请求可以包含 `deliver=true` 以请求出站投递。
- `bestEffortDeliver=false` 保持严格行为：未解析或仅限内部的交付目标返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 允许在无法解析外部可交付路由时（例如内部/webchat 会话或模糊的多渠道配置）回退到仅会话执行。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/version.ts` 中。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器会拒绝不匹配的情况。
- Schemas + 模型是从 TypeBox 定义生成的：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### 客户端常量

`src/gateway/client.ts` 中的参考客户端使用这些默认值。这些值在协议 v4 中保持稳定，是第三方客户端的预期基准。

| 常量                               | 默认值                                            | 来源                                                                             |
| ---------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                 | `4`                                               | `src/gateway/protocol/version.ts`                                                |
| 请求超时（每个 RPC）               | `30_000` ms                                       | `src/gateway/client.ts` (`requestTimeoutMs`)                                     |
| 预认证 / 连接挑战超时              | `15_000` ms                                       | `src/gateway/handshake-timeouts.ts` (config/env 可以提高配对的服务器/客户端预算) |
| 初始重连退避                       | `1_000` ms                                        | `src/gateway/client.ts` (`backoffMs`)                                            |
| 最大重连退避                       | `30_000` ms                                       | `src/gateway/client.ts` (`scheduleReconnect`)                                    |
| 设备令牌关闭后的快速重试限制       | `250` ms                                          | `src/gateway/client.ts`                                                          |
| `terminate()` 之前的强制停止宽限期 | `250` ms                                          | `FORCE_STOP_TERMINATE_GRACE_MS`                                                  |
| `stopAndWait()` 默认超时           | `1_000` ms                                        | `STOP_AND_WAIT_TIMEOUT_MS`                                                       |
| 默认时钟间隔（`hello-ok` 之前）    | `30_000` ms                                       | `src/gateway/client.ts`                                                          |
| 时钟超时关闭                       | 当静默超过 `tickIntervalMs * 2` 时发送代码 `4000` | `src/gateway/client.ts`                                                          |
| `MAX_PAYLOAD_BYTES`                | `25 * 1024 * 1024` (25 MB)                        | `src/gateway/server-constants.ts`                                                |

服务器在 `hello-ok` 中通告有效的 `policy.tickIntervalMs`、`policy.maxPayload`
和 `policy.maxBufferedBytes`；客户端应遵守这些值，
而不是握手前的默认值。

## Auth

- 共享密钥网关认证使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具体取决于配置的认证模式。
- 承载身份的模式（例如 Tailscale Serve
  (`gateway.auth.allowTailscale: true`) 或非环回
  `gateway.auth.mode: "trusted-proxy"`）通过请求头满足连接认证检查，
  而不是 `connect.params.auth.*`。
- 私有入口 `gateway.auth.mode: "none"` 完全跳过共享密钥连接认证；
  不要在公共/不受信任的入口上公开该模式。
- 配对后，Gateway(网关) 会颁发一个作用于连接
  角色 + 范围的 **device token**。它在 `hello-ok.auth.deviceToken` 中返回，客户端应
  将其持久化以供将来连接使用。
- 客户端在任何
  成功连接后都应持久化主要的 `hello-ok.auth.deviceToken`。
- 使用该 **已存储** 的设备令牌重新连接还应重用为该令牌存储的
  已批准范围集。这保留了已授予的 read/probe/status 访问权限，
  并避免将重新连接静默地缩减为
  更狭窄的隐式仅管理员范围。
- 客户端连接认证组装（位于 `src/gateway/client.ts` 中的
  `selectConnectAuth`）：
  - `auth.password` 是正交的，并且在设置时始终被转发。
  - `auth.token` 按优先顺序填充：首先是显式共享令牌，
    然后是显式 `deviceToken`，接着是存储的每设备令牌（由
    `deviceId` + `role` 键控）。
  - 仅当上述均未解析出
    `auth.token` 时才发送 `auth.bootstrapToken`。共享令牌或任何解析出的设备令牌都会将其抑制。
  - 单次 `AUTH_TOKEN_MISMATCH` 重试时，存储设备令牌的自动提升仅限于**受信任的端点**——
    即环回地址，或具有固定 `tlsFingerprint` 的 `wss://`。没有固定配置的公共 `wss://`
    不符合条件。
- 额外的 `hello-ok.auth.deviceTokens` 条目是引导移交令牌。
  仅当连接在受信任的传输（如 `wss://` 或环回/本地配对）上使用引导身份验证时，才持久化它们。
- 如果客户端提供了**显式**的 `deviceToken` 或显式的 `scopes`，该
  调用者请求的范围集将保持权威性；仅当客户端重用存储的每设备令牌时，才会重用缓存的范围。
- 设备令牌可以通过 `device.token.rotate` 和
  `device.token.revoke` 进行轮换/撤销（需要 `operator.pairing` 范围）。
- `device.token.rotate` 返回轮换元数据。它仅对已使用该设备令牌进行身份验证的同一设备调用回显替换承载令牌，以便仅令牌客户端可以在重新连接之前持久化其替换令牌。共享/管理员轮换不会回显承载令牌。
- 令牌的颁发、轮换和撤销仅限于记录在该设备配对条目中的批准角色集；令牌变更无法扩展或定向到配对批准从未授予的设备角色。
- 对于配对设备令牌会话，除非调用者还具有 `operator.admin`，否则设备管理处于自作用域内：非管理员调用者只能删除/撤销/轮换
  他们**自己**的设备条目。
- `device.token.rotate` 和 `device.token.revoke` 还会根据调用者当前的会话范围检查目标操作员
  令牌范围集。非管理员调用者
  无法轮换或撤销比他们当前持有的更广泛的操作员令牌。
- 身份验证失败包括 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- 针对 `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - 受信任的客户端可能会尝试使用缓存的每设备令牌进行一次有界重试。
  - 如果该重试失败，客户端应停止自动重新连接循环，并提示操作员操作指南。

## 设备身份 + 配对

- 节点应包含源自密钥对指纹的稳定设备身份 (`device.id`)。
- 网关会针对每个设备 + 角色颁发令牌。
- 除非启用了本地自动批准，否则新的设备 ID 需要配对批准。
- 配对自动批准主要针对直接的本地环回连接。
- OpenClaw 还有一条用于受信任共享密钥辅助流程的窄路径后端/容器本地自连接路径。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，需要批准。
- WS 客户端通常在 `connect` 期间包含 `device` 身份（操作员 + 节点）。唯一的无设备操作员例外是显式信任路径：
  - `gateway.controlUi.allowInsecureAuth=true` 用于仅限本地主机的不安全 HTTP 兼容性。
  - 成功的 `gateway.auth.mode: "trusted-proxy"` 操作员控制 UI 身份验证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（紧急情况，严重的安全降级）。
  - 使用共享网关令牌/密码进行身份验证的直连环回 `gateway-client` 后端 RPC。
- 所有连接必须对服务器提供的 `connect.challenge` nonce 进行签名。

### 设备身份验证迁移诊断

对于仍使用预挑战签名行为的旧版客户端，`connect` 现在在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并带有稳定的 `error.details.reason`。

常见的迁移失败：

| 消息                        | details.code                     | details.reason           | 含义                                          |
| --------------------------- | -------------------------------- | ------------------------ | --------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或发送了空白）。 |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用了过时/错误的 nonce 进行签名。      |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                    |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名的时间戳超出了允许的偏差范围。            |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式/规范化失败。                         |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器随机数的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的随机数。
- 首选的签名负载是 `v3`，它除了设备/客户端/角色/范围/令牌/随机数字段外，还绑定了 `platform` 和 `deviceFamily`。
- 出于兼容性考虑，仍接受旧版 `v2` 签名，但在重新连接时，配对设备元数据固定仍然控制着命令策略。

## TLS + 固定 (Pinning)

- WS 连接支持 TLS。
- 客户端可以选择固定网关证书指纹（参见 `gateway.tls` 配置加上 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

该协议暴露了**完整的 Gateway(网关) API**（状态、频道、模型、聊天、代理、会话、节点、审批等）。其确切的表面由 `src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。

## 相关

- [Bridge 协议](/zh/gateway/bridge-protocol)
- [Gateway(网关) 运维手册](/zh/gateway)
