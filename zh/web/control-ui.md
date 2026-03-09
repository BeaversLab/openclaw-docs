---
summary: "基于浏览器的网关控制界面（聊天、节点、配置）"
read_when:
  - "You want to operate the Gateway from a browser"
  - "You want Tailnet access without SSH tunnels"
title: "控制界面"
---

# 控制界面（浏览器）

控制界面是一个由网关提供的小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它在同一端口上**直接与网关 WebSocket 通信**。

## 快速打开（本地）

如果网关运行在同一台计算机上，打开：

- http://127.0.0.1:18789/ (或 http://localhost:18789/)

如果页面无法加载，请先启动网关：`openclaw gateway`。

身份验证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  仪表板设置面板允许您存储令牌；密码不会被持久化。
  入门向导默认生成网关令牌，因此在首次连接时将其粘贴到此处。

## 设备配对（首次连接）

当您从新浏览器或设备连接到控制界面时，网关需要**一次性配对批准**——即使您在同一个 Tailnet 上使用 `gateway.auth.allowTailscale: true`。这是防止未经授权访问的安全措施。

**您将看到：**"disconnected (1008): pairing required"

**要批准设备：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

一旦获得批准，设备将被记住，除非您使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。请参阅 [Devices CLI](/en/cli/devices) 了解令牌轮换和撤销。

**注意事项：**

- 本地连接（`127.0.0.1`）会自动获得批准。
- 远程连接（LAN、Tailnet 等）需要明确批准。
- 每个浏览器配置文件生成唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

## 它可以做什么（目前）

- 通过网关 WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式传输工具调用 + 实时工具输出卡片（agent 事件）
- 通道：WhatsApp/Telegram/Discord/Slack + 插件通道（Mattermost 等）状态 + QR 登录 + 每通道配置（`channels.status`、`web.login.*`、`config.patch`）
- 实例：在线列表 + 刷新（`system-presence`）
- 会话：列表 + 每会话思考/详细覆盖（`sessions.list`、`sessions.patch`）
- 定时任务：列表/添加/运行/启用/禁用 + 运行历史（`cron.*`）
- 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）
- 节点：列表 + 功能（`node.list`）
- 执行批准：编辑网关或节点允许列表 + 询问 `exec host=gateway/node` 的策略（`exec.approvals.*`）
- 配置：查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）
- 配置：应用 + 通过验证重启（`config.apply`）并唤醒最后一个活动会话
- 配置写入包括基础哈希保护，以防止覆盖并发编辑
- 配置架构 + 表单渲染（`config.schema`，包括插件 + 通道架构）；原始 JSON 编辑器仍然可用
- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）
- 日志：网关文件日志的实时跟踪，带有筛选/导出功能（`logs.tail`）
- 更新：运行包/git 更新 + 重启（`update.run`）并生成重启报告

定时任务面板注意事项：

- 对于隔离任务，传递默认为公告摘要。如果只需要内部运行，可以切换为 none。
- 选择公告时会出现通道/目标字段。

## 聊天行为

- `chat.send` 是**非阻塞的**：它立即使用 `{ runId, status: "started" }` 确认，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送在运行时返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.inject` 将助手注释追加到会话记录，并广播 `chat` 事件以进行仅 UI 更新（不运行 agent，不通道传递）。
- 停止：
  - 点击**停止**（调用 `chat.abort`）
  - 输入 `/stop`（或 `stop|esc|abort|wait|exit|interrupt`）以带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

将网关保持在环回地址上，让 Tailscale Serve 使用 HTTPS 代理它：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行身份验证。OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求使用 Tailscale 的 `x-forwarded-*` 标头命中环回地址时才接受这些请求。如果您想即使对于 Serve 流量也要求令牌/密码，请设置 `gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

将令牌粘贴到 UI 设置中（作为 `connect.params.auth.token` 发送）。

## 不安全的 HTTP

如果您通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板，浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，OpenClaw **阻止**没有设备身份的控制 UI 连接。

**推荐的修复方法：**使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在网关主机上）

**降级示例（仅通过 HTTP 使用令牌）：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

这将禁用控制 UI 的设备身份 + 配对（即使在 HTTPS 上）。仅在您信任网络时使用。

查看 [Tailscale](/en/gateway/tailscale) 了解 HTTPS 配置指南。

## 构建 UI

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选的绝对基础路径（当您需要固定的资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（独立的开发服务器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向您的网关 WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程网关

控制 UI 是静态文件；WebSocket 目标是可配置的，可以与 HTTP 源不同。当您需要本地使用 Vite 开发服务器但网关运行在其他地方时，这非常方便。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开类似以下的 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性身份验证（如果需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789&token=<gateway-token>
```

注意事项：

- `gatewayUrl` 在加载后存储在 localStorage 中，并从 URL 中移除。
- `token` 存储在 localStorage 中；`password` 仅保存在内存中。
- 当设置 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。必须显式提供 `token`（或 `password`）。缺少显式凭据将导致错误。
- 当网关位于 TLS 后面时（Tailscale Serve、HTTPS 代理等），使用 `wss://`。
- `gatewayUrl` 仅在顶层窗口中接受（不可嵌入），以防止点击劫持。
- 对于跨源开发设置（例如 `pnpm ui:dev` 到远程网关），将 UI 源添加到 `gateway.controlUi.allowedOrigins`。

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
