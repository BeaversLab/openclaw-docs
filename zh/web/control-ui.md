---
summary: "基于浏览器的网关控制 UI（聊天、节点、配置）"
read_when:
  - "你想通过浏览器操作网关"
  - "你想要无需 SSH 隧道的 Tailnet 访问"
title: "控制 UI"
---

# 控制 UI（浏览器）

控制 UI 是一个由网关提供的小型 **Vite + Lit** 单页应用：

- 默认地址：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口**直接与网关 WebSocket 通信**。

## 快速打开（本地）

如果网关运行在同一台计算机上，打开：

- http://127.0.0.1:18789/（或 http://localhost:18789/）

如果页面无法加载，请先启动网关：`openclaw gateway`。

身份验证在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  仪表板设置面板允许你存储令牌；密码不会被持久化。
  入门向导默认生成网关令牌，因此在首次连接时将其粘贴到此处。

## 设备配对（首次连接）

当你从新浏览器或设备连接到控制 UI 时，网关需要**一次性配对批准**——即使你在同一个 Tailnet 上且设置了 `gateway.auth.allowTailscale: true`。这是防止未授权访问的安全措施。

**你将看到：**"disconnected (1008): pairing required"

**批准设备：**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

批准后，设备将被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要重新批准。有关令牌轮换和撤销，请参阅[设备 CLI](/zh/cli/devices)。

**注意事项：**

- 本地连接（`127.0.0.1`）会自动批准。
- 远程连接（LAN、Tailnet 等）需要明确批准。
- 每个浏览器配置文件生成唯一的设备 ID，因此切换浏览器或清除浏览器数据将需要重新配对。

## 功能概述（当前版本）

- 通过网关 WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式传输工具调用 + 实时工具输出卡片（代理事件）
- 渠道：WhatsApp/Telegram/Discord/Slack + 插件渠道（Mattermost 等）状态 + QR 登录 + 每渠道配置（`channels.status`、`web.login.*`、`config.patch`）
- 实例：状态列表 + 刷新（`system-presence`）
- 会话：列表 + 每会话思考/详细覆盖（`sessions.list`、`sessions.patch`）
- 定时任务：列表/添加/运行/启用/禁用 + 运行历史（`cron.*`）
- 技能：状态、启用/禁用、安装、API 密钥更新（`skills.*`）
- 节点：列表 + 能力（`node.list`）
- 执行批准：编辑网关或节点允许列表 + 询问 `exec host=gateway/node` 的策略（`exec.approvals.*`）
- 配置：查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）
- 配置：应用 + 重启并验证（`config.apply`）并唤醒最后一个活动会话
- 配置写入包括 base-hash 保护，以防止覆盖并发编辑
- 配置架构 + 表单渲染（`config.schema`，包括插件 + 渠道架构）；原始 JSON 编辑器仍然可用
- 调试：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）
- 日志：网关文件日志的实时跟踪，带过滤/导出（`logs.tail`）
- 更新：运行包/git 更新 + 重启（`update.run`）并生成重启报告

定时任务面板注意事项：

- 对于隔离任务，传递默认为公告摘要。如果你只想内部运行，可以切换为无。
- 当选择公告时，渠道/目标字段会出现。

## 聊天行为

- `chat.send` 是**非阻塞的**：它立即确认 `{ runId, status: "started" }`，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送在运行时返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.inject` 将助手注释附加到会话记录并广播 `chat` 事件以仅更新 UI（无代理运行，无渠道传递）。
- 停止：
  - 点击**停止**（调用 `chat.abort`）
  - 输入 `/stop`（或 `stop|esc|abort|wait|exit|interrupt`）以带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）以中止该会话的所有活动运行

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

将网关保持在环回上，让 Tailscale Serve 使用 HTTPS 代理它：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Serve 请求可以通过 Tailscale 身份标头（`tailscale-user-login`）进行身份验证。OpenClaw 通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并将其与标头匹配来验证身份，并且仅当请求使用 Tailscale 的 `x-forwarded-*` 标头命中环回时才接受这些。如果你希望即使对于 Serve 流量也要求令牌/密码，请设置 `gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。

### 绑定到 tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

将令牌粘贴到 UI 设置中（作为 `connect.params.auth.token` 发送）。

## 不安全的 HTTP

如果你通过纯 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表板，浏览器将在**非安全上下文**中运行并阻止 WebCrypto。默认情况下，OpenClaw **阻止**没有设备身份的控制 UI 连接。

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

这会禁用控制 UI 的设备身份 + 配对（即使在 HTTPS 上）。仅在你信任网络时使用。

有关 HTTPS 设置指导，请参阅[Tailscale](/zh/gateway/tailscale)。

## 构建 UI

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选的绝对基础（当你想要固定的资产 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

对于本地开发（独立的开发服务器）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向你的网关 WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程网关

控制 UI 是静态文件；WebSocket 目标是可配置的，可以与 HTTP 源不同。当你想要本地 Vite 开发服务器但网关在其他地方运行时，这很方便。

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

- `gatewayUrl` 在加载后存储在 localStorage 中并从 URL 中删除。
- `token` 存储在 localStorage 中；`password` 仅保留在内存中。
- 设置 `gatewayUrl` 后，UI 不会回退到配置或环境凭据。显式提供 `token`（或 `password`）。缺少显式凭据是一个错误。
- 当网关位于 TLS（Tailscale Serve、HTTPS 代理等）后面时，使用 `wss://`。
- `gatewayUrl` 仅在顶级窗口中接受（不嵌入），以防止点击劫持。
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

远程访问设置详细信息：[远程访问](/zh/gateway/remote)。
