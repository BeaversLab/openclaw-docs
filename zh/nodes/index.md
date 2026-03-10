---
summary: "Nodes：配对、功能、权限以及用于 canvas/camera/screen/system 的 CLI 辅助工具"
read_when:
  - "Pairing iOS/Android nodes to a gateway"
  - "Using node canvas/camera for agent context"
  - "Adding new node commands or CLI helpers"
title: "Nodes"
---

# Nodes

**节点**是一个配套设备（macOS/iOS/Android/无头），它使用 `role: "node"` 连接到 Gateway **WebSocket**（与操作员相同的端口），并通过 `node.invoke` 暴露命令表面（例如 `canvas.*`、`camera.*`、`system.*`）。协议详情：[Gateway protocol](/zh/gateway/protocol)。

传统传输：[Bridge protocol](/zh/gateway/bridge-protocol)（TCP JSONL；已弃用/已移除当前节点）。

macOS 也可以在**节点模式**下运行：菜单栏应用程序连接到 Gateway 的 WS 服务器，并将其本地 canvas/camera 命令暴露为节点（因此 `openclaw nodes …` 可针对此 Mac 运行）。

注意：

- 节点是**外设**，不是Gateway。它们不运行 gateway 服务。
- Telegram/WhatsApp/etc. 消息落在 **gateway** 上，而不是节点上。

## 配对 + 状态

**WS 节点使用设备配对。**节点在 `connect` 期间呈现设备身份；Gateway
为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

注意：

- `nodes status` 将节点标记为**已配对**，当其设备配对角色包括 `node` 时。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject`）是一个单独的Gateway拥有的
  节点配对存储；它**不**阻止 WS `connect` 握手。

## 远程节点主机 (system.run)

当您的 Gateway 在一台机器上运行并且您希望命令
在另一台机器上执行时，使用**节点主机**。模型仍然与 **gateway** 对话；gateway
在选择 `host=node` 时将 `exec` 调用转发到**节点主机**。

### 什么在哪里运行

- **Gateway 主机**：接收消息、运行模型、路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：通过 `~/.openclaw/exec-approvals.json` 在节点主机上执行。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道的远程 Gateway（环回绑定）

如果 Gateway 绑定到环回（`gateway.bind=loopback`，本地模式下的默认值），
远程节点主机无法直接连接。创建 SSH 隧道并将节点主机指向隧道的本地端。

示例（节点主机 -> gateway 主机）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

注意：

- 令牌是Gateway配置中的 `gateway.auth.token`（在Gateway主机上的 `~/.openclaw/openclaw.json`）。
- `openclaw node run` 读取 `OPENCLAW_GATEWAY_TOKEN` 进行认证。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配对 + 命名

在Gateway主机上：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes list
```

命名选项：

- `--display-name` 在 `openclaw node run` / `openclaw node install` 上（保留在节点的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（Gateway覆盖）。

### 将命令添加到允许列表

执行批准是**每个节点主机**的。从Gateway添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准位于节点主机上的 `~/.openclaw/exec-approvals.json`。

### 将 exec 指向节点

配置默认值（Gateway配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或每个会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置后，任何带有 `host=node` 的 `exec` 调用都在节点主机上运行（取决于节点允许列表/批准）。

相关：

- [Node host CLI](/zh/cli/node)
- [Exec tool](/zh/tools/exec)
- [Exec approvals](/zh/tools/exec-approvals)

## 调用命令

低级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

针对常见的"为代理提供 MEDIA 附件"工作流，存在更高级别的辅助工具。

## 屏幕截图（canvas 快照）

如果节点显示 Canvas (WebView)，`canvas.snapshot` 返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控件

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

注意：

- `canvas present` 接受 URL 或本地文件路径（`--target`），以及用于定位的可选 `--x/--y/--width/--height`。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 被拒绝）。

## 照片 + 视频（节点摄像头）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- 节点必须处于**前台**才能进行 `canvas.*` 和 `camera.*`（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持续时间受到限制（当前 `<= 60s`），以避免过大的 base64 有效负载。
- Android 可能会提示授予 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝的权限会因 `*_PERMISSION_REQUIRED` 而失败。

## 屏幕录制（节点）

节点暴露 `screen.record` (mp4)。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 要求节点应用程序处于前台。
- Android 将在录制前显示系统屏幕捕获提示。
- 屏幕录制限制为 `<= 60s`。
- `--no-audio` 禁用麦克风捕获（在 iOS/Android 上受支持；macOS 使用系统捕获音频）。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择显示器。

## 位置（节点）

当在设置中启用位置时，节点暴露 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- 位置**默认关闭**。
- "始终"需要系统权限；后台获取尽力而为。
- 响应包括 lat/lon、精度（米）和时间戳。

## SMS (Android 节点)

当用户授予 **SMS** 权限并且设备支持电话功能时，Android 节点可以暴露 `sms.send`。

低级调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须在 Android 设备上接受权限提示，才能播发该功能。
- 没有电话功能的仅 Wi-Fi 设备不会播发 `sms.send`。

## 系统命令（节点主机 / mac 节点）

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

注意：

- `system.run` 在有效负载中返回 stdout/stderr/退出代码。
- `system.notify` 遵守 macOS 应用程序上的通知权限状态。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- macOS 节点会丢弃 `PATH` 覆盖；无头节点主机仅当 `PATH` 位于节点主机 PATH 之前时才接受它。
- 在 macOS 节点模式下，`system.run` 由 macOS 应用程序中的执行批准保护（设置 → 执行批准）。
  询问/允许列表/完全的行为与无头节点主机相同；被拒绝的提示返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 由执行批准保护（`~/.openclaw/exec-approvals.json`）。

## Exec 节点绑定

当有多个节点可用时，您可以将 exec 绑定到特定节点。
这将为 `exec host=node` 设置默认节点（并且可以按代理覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

每代理覆盖：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消设置以允许任何节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可能会在 `node.list` / `node.describe` 中包含 `permissions` 映射，以权限名称为键（例如 `screenRecording`、`accessibility`），值为布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

OpenClaw 可以运行**无头节点主机**（无 UI），它连接到 Gateway
WebSocket 并暴露 `system.run` / `system.which`。这对于 Linux/Windows
很有用，或者用于在服务器旁边运行最小节点。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway 将显示节点批准提示）。
- 节点主机将其节点 ID、令牌、显示名称和Gateway连接信息存储在 `~/.openclaw/node.json` 中。
- 执行批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见 [Exec approvals](/zh/tools/exec-approvals)）。
- 在 macOS 上，当可访问时，无头节点主机首选配套应用程序执行主机，如果应用程序不可用，则回退到本地执行。设置 `OPENCLAW_NODE_EXEC_HOST=app` 要求
  应用程序，或设置 `OPENCLAW_NODE_EXEC_FALLBACK=0` 禁用回退。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用程序作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以针对此 Mac 运行）。
- 在远程模式下，应用程序为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
