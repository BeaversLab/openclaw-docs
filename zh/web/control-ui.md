---
summary: "基于浏览器的 Gateway 网关 控制 UI（聊天、节点、配置）"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "控制 UI"
---

# 控制界面（浏览器）

控制界面是由 Gateway 网关 提供的一个小型 **Vite + Lit** 单页应用：

- 默认值：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与 Gateway 网关 WebSocket 通信**。

## 快速打开（本地）

如果 Gateway 网关 运行在同一台计算机上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (或 [http://localhost:18789/](http://localhost:18789/))

如果页面加载失败，请先启动 Gateway 网关：`openclaw gateway`。

认证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  仪表板设置面板会为当前浏览器标签页会话和所选的 Gateway URL 保存一个令牌；密码不会被持久保存。
  新手引导向导默认会生成一个 Gateway 令牌，因此在首次连接时将其粘贴到此处。

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

一旦获得批准，设备将被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。请参阅 [设备 CLI](/en/cli/devices) 了解令牌轮换和撤销。

**注意：**

- 本地连接（`127.0.0.1`）会自动获得批准。
- 远程连接（LAN、Tailnet 等）需要显式批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器
  或清除浏览器数据将需要重新配对。

## 语言支持

控制 UI 可以在首次加载时根据您的浏览器区域设置进行本地化，您稍后也可以通过访问卡片中的语言选择器进行更改。

- 支持的区域设置：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英语翻译在浏览器中延迟加载。
- 所选的区域设置保存在浏览器存储中，并在下次访问时重复使用。
- 缺失的翻译键将回退到英语。

## 它现在可以做什么

- 通过 Gateway(网关) WS 与模型聊天 (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- 在聊天中流式传输工具调用 + 实时工具输出卡片（Agent 事件）
- 渠道：WhatsApp/Telegram/Discord/Slack + 插件渠道（Mattermost 等）状态 + 二维码登录 + 每个渠道配置 (`channels.status`, `web.login.*`, `config.patch`)
- 实例：在线列表 + 刷新 (`system-presence`)
- 会话：列表 + 每个会话的 thinking/fast/verbose/reasoning 覆盖 (`sessions.list`, `sessions.patch`)
- Cron 作业：列表/添加/编辑/运行/启用/禁用 + 运行历史 (`cron.*`)
- Skills：状态、启用/禁用、安装、API 密钥更新 (`skills.*`)
- 节点：列表 + 能力 (`node.list`)
- 执行审批：编辑网关或节点允许列表 + 针对 `exec host=gateway/node` 询问策略 (`exec.approvals.*`)
- 配置：查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 配置：应用 + 带验证的重启 (`config.apply`) 并唤醒上次活动会话
- 配置写入包含一个 base-hash 保护，以防止覆盖并发编辑
- 配置架构 + 表单渲染 (`config.schema`，包括插件 + 渠道架构)；原始 JSON 编辑器仍然可用
- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用 (`status`, `health`, `models.list`)
- 日志：网关文件日志的实时尾部跟踪，支持过滤/导出 (`logs.tail`)
- 更新：运行包/git 更新 + 重启 (`update.run`) 并附带重启报告

Cron 作业面板说明：

- 对于隔离作业，传递默认为公告摘要。如果您只想在内部运行，可以切换为无。
- 选择公告时会出现渠道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
- 对于主会话任务，提供 Webhook 和无投递模式。
- 高级编辑控件包括运行后删除、清除代理覆盖、Cron 精确/错峰选项、代理模型/思考覆盖以及尽力投递切换开关。
- 表单验证位于行内，显示字段级错误；无效值将禁用保存按钮，直至修复。
- 设置 `cron.webhookToken` 以发送专用不记名令牌；如果省略，则发送不带身份验证标头的 Webhook。
- 已弃用的回退机制：存储的带有 `notify: true` 的传统任务在迁移之前仍可使用 `cron.webhook`。

## 聊天行为

- `chat.send` 是**非阻塞**的：它立即使用 `{ runId, status: "started" }` 进行确认，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送时，如果正在运行则返回 `{ status: "in_flight" }`，完成后则返回 `{ status: "ok" }`。
- `chat.history` 响应的大小受到限制，以确保 UI 安全。当转录条目过大时，Gateway(网关)可能会截断长文本字段，省略繁重的元数据块，并用占位符 (`[chat.history omitted: message too large]`) 替换过大的消息。
- `chat.inject` 会向会话记录追加一条助手注释，并广播 `chat` 事件以进行仅 UI 的更新（不运行代理，不进行渠道投递）。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 输入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以进行带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无需 `runId`）以中止该会话的所有活动运行
- 中止部分保留：
  - 当运行中止时，部分助手文本仍可在 UI 中显示
  - 当存在缓冲输出时，Gateway(网关) 会将中止的部分助手文本保存到转录历史中
  - 持久化的条目包含中止元数据，以便记录使用者可以将中止的部分与正常完成输出区分开来

## Tailnet 访问（推荐）

### 集成的 Tailscale Serve（首选）

将 Gateway(网关) 保留在环回地址上，并让 Tailscale Serve 使用 HTTPS 对其进行代理：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，控制 UI/WebSocket Serve 请求可以通过 Tailscale 身份标头 (`tailscale-user-login`) 进行身份验证。OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求通过 Tailscale 的 `x-forwarded-*` 标头访问环回时才接受这些请求。如果您希望即使是 Serve 流量也要求令牌/密码，请设置 `gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。无令牌 Serve 身份验证假定网关主机是受信任的。如果不受信任的本地代码可能在该主机上运行，请要求令牌/密码身份验证。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

将令牌粘贴到 UI 设置中（作为 `connect.params.auth.token` 发送）。

## 不安全的 HTTP

如果您通过纯 HTTP (`http://<lan-ip>` 或 `http://<tailscale-ip>`) 打开仪表板，
浏览器将在**不安全的上下文**中运行并阻止 WebCrypto。默认情况下，
OpenClaw 会**阻止**没有设备身份的 Control UI 连接。

**推荐的修复方法：** 使用 HTTPS (Tailscale Serve) 或在本地打开 UI：

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

`allowInsecureAuth` 仅是一个本地兼容性切换：

- 它允许本地主机控制 UI 会话在不安全的 HTTP 上下文中继续进行，而无需设备身份。
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

`dangerouslyDisableDeviceAuth` 会禁用控制 UI 设备身份检查，并会导致严重的安全降级。紧急使用后请立即恢复。

请参阅 [Tailscale](/en/gateway/tailscale) 了解 HTTPS 设置指南。

## 构建 UI

Gateway 网关 从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选的绝对基础路径（当您需要固定的资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

对于本地开发（独立的开发服务器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向您的 Gateway 网关 WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway 网关

Control UI 由静态文件组成；WebSocket 目标是可配置的，并且可以与 HTTP 源不同。当您需要在本地使用 Vite 开发服务器但 Gateway 网关 运行在其他地方时，这非常有用。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开一个类似如下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性身份验证（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

说明：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- `token` 从 URL 片段导入，存储在 sessionStorage 中以用于当前浏览器标签页会话和选定的网关 URL，并从 URL 中剥离；它不会存储在 localStorage 中。
- `password` 仅保存在内存中。
- 当设置 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。请显式提供 `token`（或 `password`）。缺少显式凭据则报错。
- 当 Gateway(网关) 位于 TLS 后面（Tailscale Serve、HTTPS 代理等）时，请使用 `wss://`。
- 为防止点击劫持，`gatewayUrl` 仅在顶级窗口（而非嵌入式）中被接受。
- 非环回控制 UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整源）。这包括远程开发设置。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用了 Host-header 源回退模式，但这是一种危险的安全模式。

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

远程访问设置详细信息：[Remote access](/en/gateway/remote)。

import zh from "/components/footer/zh.mdx";

<zh />
