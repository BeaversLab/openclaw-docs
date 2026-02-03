---
title: "控制界面"
summary: "Gateway 的浏览器控制 UI（聊天、节点、配置）"
read_when:
  - 你希望通过浏览器操作 Gateway
  - 你希望无需 SSH 隧道的 Tailnet 访问
---

# Control UI（浏览器）

Control UI 是 Gateway 提供的 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（如 `/openclaw`）

它 **直接连接** 到同端口的 Gateway WebSocket。

## 快速打开（本地）

若 Gateway 在同一台电脑上运行，打开：

- http://127.0.0.1:18789/（或 http://localhost:18789/）

若页面加载失败，请先启动 Gateway：`openclaw gateway`。

认证在 WebSocket 握手中提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  仪表盘设置面板可存储 token；密码不持久化。
  Onboarding 向导默认生成 gateway token，请在首次连接时粘贴。

## 设备配对（首次连接）

当你从新浏览器或设备连接到 Control UI 时，Gateway
需要 **一次性配对批准** —— 即使你在同一 Tailnet 上
且设置了 `gateway.auth.allowTailscale: true`。这是一项安全措施，防止未授权访问。

**你会看到：** "disconnected (1008): pairing required"

**要批准设备：**

```bash
# 列出待处理请求
openclaw devices list

# 通过请求 ID 批准
openclaw devices approve <requestId>
```

一旦批准，设备将被记住，除非你使用
`openclaw devices revoke --device <id> --role <role>` 撤销，
否则无需重新批准。参见 [Devices CLI](/zh/cli/devices)
了解 token 轮换与撤销。

**说明：**

- 本地连接（`127.0.0.1`）自动批准。
- 远程连接（LAN、Tailnet 等）需要显式批准。
- 每个浏览器配置文件生成唯一设备 ID，因此切换浏览器或
  清除浏览器数据需要重新配对。

## 目前可做什么

- 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式展示工具调用与实时工具输出卡片（agent events）
- Channels：WhatsApp/Telegram/Discord/Slack + 插件渠道（Mattermost 等）状态 + 二维码登录 + 每渠道配置（`channels.status`、`web.login.*`、`config.patch`）
- Instances：presence 列表 + 刷新（`system-presence`）
- Sessions：列表 + 每会话 thinking/verbose 覆盖（`sessions.list`、`sessions.patch`）
- Cron：列表/新增/运行/启用/禁用 + 运行历史（`cron.*`）
- Skills：状态、启用/禁用、安装、API key 更新（`skills.*`）
- Nodes：列表 + 能力（`node.list`）
- Exec approvals：编辑 gateway 或 node allowlist + `exec host=gateway/node` 的 ask 策略（`exec.approvals.*`）
- Config：查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）
- Config：校验后应用 + 重启（`config.apply`）并唤醒最后活跃会话
- Config 写入包含 base-hash 保护，防止并发编辑覆盖
- Config schema + 表单渲染（`config.schema`，包括插件 + 渠道 schema）；仍保留 Raw JSON 编辑器
- Debug：状态/健康/模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）
- Logs：网关文件日志的实时 tail，支持过滤/导出（`logs.tail`）
- Update：运行包/仓库更新 + 重启（`update.run`），并给出重启报告

## 聊天行为

- `chat.send` 为 **非阻塞**：立即回 ACK `{ runId, status: "started" }`，响应通过 `chat` 事件流式返回。
- 使用相同 `idempotencyKey` 重发：运行中返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.inject` 向会话转录追加一条助手备注，并广播 `chat` 事件用于 UI 更新（不触发 agent 运行，也不投递到频道）。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 输入 `/stop`（或 `stop|esc|abort|wait|exit|interrupt`）进行带外中止
  - `chat.abort` 支持 `{ sessionKey }`（不带 `runId`）以中止该会话所有运行

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（推荐）

保持 Gateway 在回环，并用 Tailscale Serve 以 HTTPS 代理：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true`，Serve 请求可通过 Tailscale 身份头（`tailscale-user-login`）认证。OpenClaw 会通过 `tailscale whois` 校验 `x-forwarded-for` 地址并匹配该头，仅当请求命中回环且带 Tailscale `x-forwarded-*` 头时接受。若希望即便在 Serve 流量中也强制 token/password，设置 `gateway.auth.allowTailscale: false`（或强制 `gateway.auth.mode: "password"`）。

### 绑定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

将 token 粘贴到 UI 设置中（以 `connect.params.auth.token` 发送）。

## 不安全 HTTP

如果通过明文 HTTP 打开仪表盘（`http://<lan-ip>` 或 `http://<tailscale-ip>`），浏览器会处于 **非安全上下文** 并阻止 WebCrypto。默认情况下，OpenClaw **拒绝** 无设备身份的 Control UI 连接。

**推荐修复：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在 gateway 主机上）

**降级示例（HTTP 上仅 token）：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

这会禁用 Control UI 的设备身份 + 配对（即便在 HTTPS 上）。仅在信任网络时使用。

HTTPS 设置见 [Tailscale](/zh/gateway/tailscale)。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。构建命令：

```bash
pnpm ui:build # auto-installs UI deps on first run
```

可选绝对 base（当你需要固定资源 URL）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（独立 dev server）：

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

然后将 UI 指向 Gateway WS URL（如 `ws://127.0.0.1:18789`）。

## 调试/测试：dev server + 远程 Gateway

Control UI 是静态文件；WebSocket 目标可配置，且可与 HTTP 来源不同。当你希望本地 Vite dev server，但 Gateway 在远端时很有用。

1. 启动 UI dev server：`pnpm ui:dev`
2. 打开 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选一次性认证（如需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789&token=<gateway-token>
```

说明：

- `gatewayUrl` 加载后存入 localStorage，并从 URL 中移除。
- `token` 存入 localStorage；`password` 仅保存在内存中。
- 当 Gateway 在 TLS 后（Tailscale Serve、HTTPS 代理等）时使用 `wss://`。

远程访问设置细节：见 [Remote access](/zh/gateway/remote)。
