---
summary: "基于浏览器的 Gateway(网关) 网关 控制 UI（聊天、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制 UI"
---

# 控制界面（浏览器）

控制界面是由 Gateway(网关) 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认值：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway(网关) 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway(网关) 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果页面加载失败，请先启动 Gateway(网关) 网关：`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  仪表板设置面板会为当前浏览器标签页会话和所选的网关 URL 保留一个令牌；密码不会被持久保存。
  新手引导默认会生成一个网关令牌，因此在首次连接时请将其粘贴到此处。

## 设备配对（首次连接）

当您从新浏览器或设备连接到控制 UI 时，Gateway(网关)需要**一次性配对批准**——即使您在同一个具有 `gateway.auth.allowTailscale: true` 的 Tailnet 上。这是一项防止未经授权访问的安全措施。

**您将看到：** “disconnected (1008): pairing required”

**要批准设备：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

如果浏览器重试配对，且身份验证详细信息（角色/范围/公钥）发生变化，则之前的待处理请求将被取代，并创建一个新的 `requestId`。在批准之前，请重新运行 `openclaw devices list`。

批准后，设备会被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则无需重新批准。有关令牌轮换和撤销，请参阅 [设备 CLI](/en/cli/devices)。

**注意：**

- 本地连接（`127.0.0.1`）会自动批准。
- 远程连接（LAN、Tailnet 等）需要明确批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

## 语言支持

控制 UI 可以在首次加载时根据您的浏览器区域设置进行本地化，您稍后也可以通过访问卡中的语言选择器进行更改。

- 支持的区域设置：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英语翻译在浏览器中延迟加载。
- 所选区域设置保存在浏览器存储中，并在未来的访问中重复使用。
- 缺少的翻译键将回退到英语。

## 目前它可以做什么

- 通过 Gateway(网关) WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式传输工具调用 + 实时工具输出卡片（代理事件）
- 渠道：WhatsApp/Telegram/Discord/Slack + 插件渠道（Mattermost 等）状态 + QR 登录 + 每个渠道的配置（`channels.status`、`web.login.*`、`config.patch`）
- 实例：在线列表 + 刷新（`system-presence`）
- 会话：列表 + 每个会话的思维/快速/详细/推理覆盖设置（`sessions.list`、`sessions.patch`）
- Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史记录（`cron.*`）
- Skills：状态、启用/禁用、安装、API 密钥更新 (`skills.*`)
- 节点：列表 + 权限 (`node.list`)
- 执行批准：编辑网关或节点允许列表 + 请求 `exec host=gateway/node` 的策略 (`exec.approvals.*`)
- 配置：查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 配置：应用 + 带验证的重启 (`config.apply`) 并唤醒上次活动会话
- 配置写入包含一个 base-hash 保护，以防止覆盖并发编辑
- 配置写入 (`config.set`/`config.apply`/`config.patch`) 也会对提交的配置负载中的引用进行活跃 SecretRef 解析的预检；未解析的已提交活跃引用会在写入前被拒绝
- 配置架构 + 表单渲染 (`config.schema`，包括插件 + 渠道架构)；仅当快照具有安全的原始往返时，原始 JSON 编辑器才可用
- 如果快照无法安全地往返原始文本，控制 UI 将强制使用表单模式并为该快照禁用原始模式
- 结构化的 SecretRef 对象值在表单文本输入中呈现为只读，以防止意外的对象到字符串损坏
- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用 (`status`, `health`, `models.list`)
- 日志：网关文件日志的实时跟踪，带有过滤/导出功能 (`logs.tail`)
- 更新：运行包/ git 更新 + 重启 (`update.run`) 并生成重启报告

Cron 任务面板说明：

- 对于隔离任务，传递默认为公告摘要。如果您只想在内部运行，可以切换为无。
- 选择公告时，会出现渠道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
- 对于主会话任务，提供 webhook 和无传递模式。
- 高级编辑控件包括运行后删除、清除代理覆盖、Cron 精确/交错选项、代理模型/思考覆盖以及尽力传递切换开关。
- 表单验证是内联的，带有字段级错误；无效值将禁用保存按钮，直到修复为止。
- 设置 `cron.webhookToken` 以发送专用不记名令牌，如果省略，则 Webhook 在没有身份验证头的情况下发送。
- 已弃用的回退：存储的带有 `notify: true` 的旧版任务在迁移之前仍可使用 `cron.webhook`。

## 聊天行为

- `chat.send` 是**非阻塞**的：它立即通过 `{ runId, status: "started" }` 确认，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送时，在运行期间返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.history` 响应受大小限制以确保 UI 安全。当会话记录条目过大时，Gateway(网关) 可能会截断长文本字段，省略繁重的元数据块，并用占位符（`[chat.history omitted: message too large]`）替换过大的消息。
- `chat.inject` 向会话记录添加助手备注，并广播 `chat` 事件以进行仅 UI 更新（不运行 agent，不通过渠道传递）。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 输入 `/stop`（或独立的终止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行
- 中止部分保留：
  - 当运行被中止时，部分助手文本仍可在 UI 中显示
  - 当存在缓冲输出时，Gateway(网关) 会将被中止的部分助手文本持久化到会话记录历史中
  - 持久化的条目包含中止元数据，以便会话记录使用者可以将中止的部分与正常完成的输出区分开来

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

将 Gateway(网关) 保留在环回地址上，并让 Tailscale Serve 使用 HTTPS 为其代理：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份标头
(`tailscale-user-login`) 进行身份验证。OpenClaw
通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求通过 Tailscale 的 `x-forwarded-*` 标头到达环回地址时才接受这些请求。如果您希望即使是 Serve 流量也要求令牌/密码，请设置
`gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。
无令牌 Serve 身份验证假设网关主机是受信任的。如果该主机上可能运行不受信任的本地代码，请要求令牌/密码身份验证。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

将令牌粘贴到 UI 设置中（作为 `connect.params.auth.token` 发送）。

## 不安全的 HTTP

如果您通过纯 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 打开仪表盘，
浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，
OpenClaw **阻止**没有设备身份的 Control UI 连接。

**建议的修复方法：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/`（在网关主机上）

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

`allowInsecureAuth` 仅是一个本地兼容性切换开关：

- 它允许本地主机 Control UI 会话在非安全 HTTP 上下文中无需设备身份即可继续。
- 它不会绕过配对检查。
- 它不会放宽远程（非本地主机）设备身份要求。

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
严重的安全降级。紧急使用后请迅速恢复。

有关 HTTPS 设置指南，请参阅 [Tailscale](/en/gateway/tailscale)。

## 构建 UI

Gateway(网关) 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选的绝对基址（当您希望使用固定的资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（独立的开发服务器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向您的 Gateway(网关) WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway(网关)

控制 UI 由静态文件组成；WebSocket 目标是可配置的，并且可以与 HTTP 源不同。当您需要在本地使用 Vite 开发服务器但 Gateway(网关) 运行在其他地方时，这非常方便。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开类似这样的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性身份验证（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

注意事项：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- 应尽可能通过 URL 片段 (`#token=...`) 传递 `token`。片段不会发送到服务器，从而避免了请求日志和 Referer 泄露。出于兼容性原因，旧的 `?token=` 查询参数仍会被导入一次，但这仅作为后备方案，并在启动后立即被剥离。
- `password` 仅保存在内存中。
- 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。
  请显式提供 `token`（或 `password`）。缺少显式凭据将被视为错误。
- 当 Gateway(网关) 位于 TLS（Tailscale Serve、HTTPS 代理等）后面时，请使用 `wss://`。
- 为防止点击劫持，仅在顶层窗口（而非嵌入式）中接受 `gatewayUrl`。
- 非环回控制 UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`
  （完整的源）。这包括远程开发设置。
- 除严格受控的
  本地测试外，请勿使用 `gateway.controlUi.allowedOrigins: ["*"]`。这意味着允许任何浏览器源，而不是“匹配我正在使用的任何主机”。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用
  Host-header 源回退模式，但这是一种危险的安全模式。

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

远程访问设置详情：[Remote access](/en/gateway/remote)。

## 相关

- [Dashboard](/en/web/dashboard) — 网关仪表板
- [WebChat](/en/web/webchat) — 基于浏览器的聊天界面
- [TUI](/en/web/tui) — 终端用户界面
- [Health Checks](/en/gateway/health) — 网关健康监控
