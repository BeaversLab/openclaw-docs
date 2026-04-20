---
summary: "基于浏览器的 Gateway(网关) 控制界面（聊天、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制界面"
---

# 控制界面（浏览器）

控制界面是由 Gateway(网关) 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认值：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway(网关) 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway(网关) 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/））

如果页面加载失败，请先启动 Gateway(网关)：`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时，Tailscale Serve 身份标头
- 当 `gateway.auth.mode: "trusted-proxy"` 时，trusted-proxy 身份标头

仪表板设置面板会为当前浏览器标签页会话和选定的 Gateway URL 保存令牌；
密码不会持久保存。新手引导通常会在首次连接时为共享密钥身份验证生成
Gateway 令牌，但当 `gateway.auth.mode` 为 `"password"` 时，
密码身份验证也可以使用。

## 设备配对（首次连接）

当您从新的浏览器或设备连接到控制界面时，Gateway(网关)
需要**一次性配对批准**——即使您与 `gateway.auth.allowTailscale: true` 位于同一个 Tailnet 上。
这是为了防止未经授权的访问的安全措施。

**您将看到：** "disconnected (1008): pairing required"

**要批准设备：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果浏览器使用更改的身份验证详细信息（角色/作用域/公钥）
重试配对，之前的待处理请求将被取代，并创建一个新的 `requestId`。
请在批准之前重新运行 `openclaw devices list`。

一旦获得批准，设备将被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，
否则不需要重新批准。有关令牌轮换和撤销，请参阅
[设备 CLI](/zh/cli/devices)。

**注意：**

- 直接的本地回环浏览器连接（`127.0.0.1` / `localhost`）
  会自动获得批准。
- Tailnet 和 LAN 浏览器连接仍然需要显式批准，即使当
  它们来自同一台机器时也是如此。
- 每个浏览器配置文件都会生成一个唯一的设备 ID，因此切换浏览器或
  清除浏览器数据将需要重新配对。

## 语言支持

控制 UI 可以在首次加载时根据您的浏览器区域设置进行本地化。
要稍后覆盖它，请打开 **Overview -> Gateway(网关) Access -> Language**。
区域选择器位于 Gateway(网关) Access 卡片中，而不是在 Appearance 下。

- 支持的语言环境：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- 非英语翻译将在浏览器中延迟加载。
- 选定的语言环境保存在浏览器存储中，并在下次访问时重复使用。
- 缺失的翻译键将回退到英语。

## 目前可以做什么

- 通过 Gateway(网关) WS 与模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中流式传输工具调用 + 实时工具输出卡片（代理事件）
- 渠道：内置以及捆绑/外部插件渠道的状态、二维码登录和每个渠道的配置 (`channels.status`, `web.login.*`, `config.patch`)
- 实例：在线列表 + 刷新 (`system-presence`)
- 会话：列表 + 每个会话的模型/思考/快速/详细/跟踪/推理覆盖设置 (`sessions.list`, `sessions.patch`)
- Dreams：做梦状态、启用/禁用切换以及梦境日记阅读器 (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史记录 (`cron.*`)
- Skills：状态、启用/禁用、安装、API 密钥更新 (`skills.*`)
- 节点：列表 + 能力 (`node.list`)
- 执行批准：编辑网关或节点允许列表 + 查询 `exec host=gateway/node` 的策略 (`exec.approvals.*`)
- 配置：查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 配置：应用 + 带验证的重启 (`config.apply`) 并唤醒最后一个活动会话
- 配置写入包含基础哈希保护，以防止覆盖并发编辑
- 配置写入 (`config.set`/`config.apply`/`config.patch`) 还会对提交的配置负载中的引用进行活动 SecretRef 解析的预检；未解决的活动提交引用在写入前会被拒绝
- 配置架构 + 表单渲染（`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`，匹配的 UI 提示、直接子项摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及在可用时的插件 + 渠道架构）；仅当快照具有安全的原始往返过程时，才可使用原始 JSON 编辑器
- 如果快照无法安全地往返原始文本，控制 UI 将强制使用表单模式并为该快照禁用原始模式
- 结构化的 SecretRef 对象值在表单文本输入中呈现为只读状态，以防止意外的对象到字符串损坏
- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用（`status`，`health`，`models.list`）
- 日志：网关文件日志的实时跟踪，带有过滤/导出功能（`logs.tail`）
- 更新：运行包/git 更新 + 重启（`update.run`）并附带重启报告

Cron 任务面板注意事项：

- 对于隔离任务，交付默认为公告摘要。如果您希望仅内部运行，可以切换为无。
- 选择公告时，将出现渠道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"` 并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
- 对于主会话任务，可以使用 webhook 和无交付模式。
- 高级编辑控制包括运行后删除、清除代理覆盖、Cron 精确/交错选项、
  代理模型/思考覆盖，以及尽力而为的交付切换。
- 表单验证与字段级错误内联显示；无效值将禁用保存按钮，直至修复。
- 设置 `cron.webhookToken` 以发送专用的 bearer 令牌，如果省略，则发送的 webhook 不包含 auth 标头。
- 已弃用的回退机制：具有 `notify: true` 的存储旧版作业在迁移之前仍可使用 `cron.webhook`。

## 聊天行为

- `chat.send` 是**非阻塞**的：它会立即使用 `{ runId, status: "started" }` 进行确认，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送，在运行时返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- 出于 UI 安全考虑，`chat.history` 响应的大小受到限制。当对话记录条目过大时，Gateway(网关) 可能会截断长文本字段，省略繁重的元数据块，并使用占位符（`[chat.history omitted: message too large]`）替换过大的消息。
- `chat.history` 也会从可见的助手文本中剥离仅显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌，并省略其整个可见文本仅为精确静默令牌 `NO_REPLY` / `no_reply` 的助手条目。
- `chat.inject` 将助手备注追加到会话记录中，并广播 `chat` 事件以进行仅 UI 更新（无代理运行，无渠道交付）。
- 聊天标题中的模型和思维选择器会通过 `sessions.patch` 立即修补活动会话；它们是持久的会话覆盖，而非仅限单次轮次的发送选项。
- 停止：
  - 点击 **Stop**（停止）（调用 `chat.abort`）
  - 输入 `/stop`（或独立的终止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无需 `runId`）以中止该会话的所有活动运行
- 中止部分保留：
  - 当运行中止时，部分助手文本仍可在 UI 中显示
  - 当存在缓冲输出时，Gateway(网关) 会将中止的部分助手文本持久化到转录历史中
  - 持久化的条目包含中止元数据，以便转录使用者能够区分中止的部分输出和正常完成输出

## 托管嵌入

助手消息可以使用 `[embed ...]` 短代码内联渲染托管 Web 内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

- `strict`：禁用托管嵌入内的脚本执行
- `scripts`：在保持源隔离的同时允许交互式嵌入；这是
  默认设置，通常足以满足自包含的浏览器游戏/小部件的需求
- `trusted`：在 `allow-scripts` 的基础上为
  故意需要更强权限的同站点文档添加 `allow-same-origin`

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

仅当嵌入的文档确实需要同源行为时才使用 `trusted`。对于大多数代理生成的游戏和交互式画布，`scripts` 是更安全的选择。

绝对外部 `http(s)` 嵌入 URL 默认保持阻止状态。如果您有意让 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 访问（推荐）

### 集成的 Tailscale Serve（首选）

将 Gateway(网关) 保持在环回地址上，并让 Tailscale Serve 使用 HTTPS 为其提供代理：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/` （或您配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行身份验证。OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求通过 Tailscale 的 `x-forwarded-*` 标头到达环回地址时才接受这些请求。如果您想即使是 Serve 流量也要求显式的共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。
对于该异步 Serve 身份验证路径，来自同一客户端 IP 和身份验证范围的失败身份验证尝试会在速率限制写入之前进行序列化。因此，来自同一浏览器的并发错误重试可能会在第二次请求时显示 `retry later`，而不是两个普通的并行不匹配错误。
无令牌 Serve 身份验证假设网关主机是受信任的。如果不受信任的本地代码可能在该主机上运行，请要求令牌/密码身份验证。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/` （或您配置的 `gateway.controlUi.basePath`）

将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

## 不安全的 HTTP

如果您通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板，
浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，
OpenClaw **阻止**没有设备身份的 Control UI 连接。

记录的例外情况：

- 仅限 localhost 的不安全 HTTP 与 `gateway.controlUi.allowInsecureAuth=true` 的兼容性
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行操作员 Control UI 身份验证
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**建议修复方法：** 使用 HTTPS (Tailscale Serve) 或在本地打开 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (在网关主机上)

**不安全身份验证切换行为：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 仅是一个本地兼容性切换：

- 它允许 localhost Control UI 会话在非安全 HTTP 上下文中
  无需设备身份即可继续。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

**仅限紧急情况：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 禁用 Control UI 设备身份检查，这是一种
严重的安全降级。紧急使用后请快速还原。

受信任代理说明：

- 成功的受信任代理身份验证可以在没有
  设备身份的情况下允许**操作员** Control UI 会话
- 这**不**适用于节点角色 Control UI 会话
- 同主机环回反向代理仍不满足受信任代理身份验证；请参阅
  [受信任代理身份验证](/zh/gateway/trusted-proxy-auth)

有关 HTTPS 设置指南，请参阅 [Tailscale](/zh/gateway/tailscale)。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选的绝对基路径（当您需要固定的资产 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（单独的开发服务器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向您的 Gateway(网关) WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway(网关)

Control UI 是静态文件；WebSocket 目标是可配置的，可以
与 HTTP 源不同。当您想在本地使用 Vite 开发服务器
但 Gateway(网关) 运行在其他地方时，这非常方便。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开类似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性身份验证（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

说明：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- 应尽可能通过 URL 片段（`#token=...`）传递 `token`。片段不会发送到服务器，从而避免了请求日志和 Referer 泄露。传统的 `?token=` 查询参数仍会为了兼容性导入一次，但仅作为后备，并在引导后立即被剥离。
- `password` 仅保存在内存中。
- 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。
  请显式提供 `token`（或 `password`）。缺少显式凭据是一个错误。
- 当 Gateway(网关) 位于 TLS（Tailscale Serve、HTTPS 代理等）之后时，请使用 `wss://`。
- 为防止点击劫持，`gatewayUrl` 仅在顶级窗口（非嵌入式）中被接受。
- 非环回 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整源）。这包括远程开发设置。
- 除严格控制的本​​地测试外，请勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。这意味着允许任何浏览器源，而不是“匹配我正在使用的任何主机”。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host 头源回退模式，但这是一种危险的安全模式。

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

- [Dashboard](/zh/web/dashboard) — gateway dashboard
- [WebChat](/zh/web/webchat) — browser-based chat interface
- [TUI](/zh/web/tui) — terminal user interface
- [Health Checks](/zh/gateway/health) — gateway health monitoring
