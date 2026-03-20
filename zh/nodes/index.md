---
summary: "节点：配对、功能、权限，以及用于画布/摄像头/屏幕/设备/通知/系统的 CLI 助手"
read_when:
  - 将 iOS/Android 节点配对至网关
  - 使用节点画布/摄像头作为 Agent 上下文
  - 添加新的节点命令或 CLI 助手
title: "节点"
---

# 节点

A **node** is a companion device (macOS/iOS/Android/headless) that connects to the Gateway(网关) **WebSocket** (same port as operators) with `role: "node"` and exposes a command surface (e.g. `canvas.*`, `camera.*`, `device.*`, `notifications.*`, `system.*`) via `node.invoke`. Protocol details: [Gateway(网关) protocol](/zh/gateway/protocol).

Legacy transport: [Bridge protocol](/zh/gateway/bridge-protocol) (TCP JSONL; deprecated/removed for current nodes).

macOS can also run in **node mode**: the menubar app connects to the Gateway(网关)’s WS server and exposes its local canvas/camera commands as a node (so `openclaw nodes …` works against this Mac).

Notes:

- Nodes are **peripherals**, not gateways. They don’t run the gateway service.
- Telegram/WhatsApp/etc. messages land on the **gateway**, not on nodes.
- Troubleshooting runbook: [/nodes/故障排除](/zh/nodes/troubleshooting)

## 配对 + 状态

**WS nodes use device pairing.** Nodes present a device identity during `connect`; the Gateway(网关)
creates a device pairing request for `role: node`. Approve via the devices CLI (or UI).

Quick CLI:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

Notes:

- `nodes status` marks a node as **paired** when its device pairing role includes `node`.
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) is a separate gateway-owned
  node pairing store; it does **not** gate the WS `connect` handshake.

## 远程节点主机 (system.run)

Use a **node host** when your Gateway(网关) runs on one machine and you want commands
to execute on another. The 模型 still talks to the **gateway**; the gateway
forwards `exec` calls to the **node host** when `host=node` is selected.

### 什么运行在哪里

- **Gateway(网关) host**：接收消息，运行模型，路由工具调用。
- **Node host**：在节点机器上执行 `system.run`/`system.which`。
- **Approvals**（审批）：通过 `~/.openclaw/exec-approvals.json` 在节点主机上强制执行。

审批说明：

- 基于审批的节点运行绑定确切的请求上下文。
- 对于直接的 shell/runtime 文件执行，OpenClaw 也会尽力绑定一个具体的本地文件操作数，如果该文件在执行前发生变化，则拒绝运行。
- 如果 OpenClaw 无法为解释器/runtime 命令确切识别一个具体的本地文件，将拒绝基于审批的执行，而不是假装完全覆盖 runtime。使用沙箱隔离、独立主机或明确的受信任允许列表/完整工作流以获得更广泛的解释器语义。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道的远程 Gateway（回环绑定）

如果 Gateway 绑定到回环地址（`gateway.bind=loopback`，本地模式下的默认值），远程节点主机将无法直接连接。请创建 SSH 隧道并将节点主机指向隧道的本地端。

示例（节点主机 -> 网关主机）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

注意事项：

- `openclaw node run` 支持令牌或密码认证。
- 首选环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置回退是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机会特意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，根据远程优先级规则，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果配置了活动的本地 `gateway.auth.*` SecretRefs 但未解析，节点主机认证将以失败关闭。
- 节点主机认证解析会特意忽略旧的 `CLAWDBOT_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配对 + 命名

在网关主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

命名选项：

- 在 `openclaw node run` / `openclaw node install` 上的 `--display-name`（持久化在节点的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（网关覆盖）。

### 将命令列入允许列表

执行审批是**针对每个节点主机**的。请从网关添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批位于节点主机上的 `~/.openclaw/exec-approvals.json`。

### 将 exec 指向节点

配置默认值（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或按会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何带有 `host=node` 的 `exec` 调用都会在节点主机上运行（取决于节点允许列表/审批）。

相关：

- [节点主机 CLI](/zh/cli/node)
- [Exec 工具](/zh/tools/exec)
- [Exec 审批](/zh/tools/exec-approvals)

## 调用命令

底层（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

存在用于常见的“向代理提供媒体附件”工作流的高级助手。

## 屏幕截图（Canvas 快照）

如果节点正在显示 Canvas (WebView)，`canvas.snapshot` 将返回 `{ format, base64 }`。

CLI 助手（写入临时文件并打印 `MEDIA:<path>`）：

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

说明：

- `canvas present` 接受 URL 或本地文件路径 (`--target`)，以及用于定位的可选 `--x/--y/--width/--height`。
- `canvas eval` 接受内联 JS (`--js`) 或位置参数。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

说明：

- 仅支持 A2UI v0.8 JSONL（拒绝 v0.9/createSurface）。

## 照片 + 视频（节点摄像头）

照片 (`jpg`)：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段 (`mp4`)：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

说明：

- 节点必须处于**前台**才能使用 `canvas.*` 和 `camera.*`（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持续时间会受到限制（目前为 `<= 60s`），以避免过大的 base64 负载。
- Android 会在可能时提示授予 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝的权限将导致失败并返回 `*_PERMISSION_REQUIRED`。

## 屏幕录制（节点）

支持的节点公开 `screen.record` (mp4)。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

说明：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制会被限制为 `<= 60s`。
- `--no-audio` 在支持的平台上禁用麦克风捕获。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择显示器。

## 位置 (节点)

当在设置中启用位置时，节点会暴露 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

备注：

- 位置默认**关闭**。
- “始终”需要系统权限；后台获取为尽力而为。
- 响应包含经纬度、精度（米）和时间戳。

## 短信 (Android 节点)

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以暴露 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

备注：

- 必须在 Android 设备上接受权限提示，才会通告此功能。
- 不支持电话功能的纯 Wi-Fi 设备将不会通告 `sms.send`。

## Android 设备 + 个人数据命令

当启用相应功能时，Android 节点可以通告额外的命令系列。

可用系列：

- `device.status`、`device.info`、`device.permissions`、`device.health`
- `notifications.list`、`notifications.actions`
- `photos.latest`
- `contacts.search`、`contacts.add`
- `calendar.events`、`calendar.add`
- `callLog.search`
- `motion.activity`、`motion.pedometer`

调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

备注：

- 运动命令受可用传感器的能力限制。

## 系统命令 (节点主机 / mac 节点)

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

备注：

- `system.run` 在有效负载中返回 stdout/stderr/退出代码。
- `system.notify` 遵守 macOS 应用上的通知权限状态。
- 无法识别的节点 `platform` / `deviceFamily` 元数据使用保守的默认允许列表，其中排除了 `system.run` 和 `system.which`。如果您有意针对未知平台使用这些命令，请通过 `gateway.nodes.allowCommands` 明确添加它们。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 Shell 封装器（`bash|sh|zsh ... -c/-lc`），请求范围内的 `--env` 值将缩减为明确的允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在允许列表模式下，对于始终允许的决策，已知的分发封装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径而非封装器路径。如果解包不安全，则不会自动保留允许列表条目。
- 在允许列表模式下，对于 Windows 节点主机，通过 `cmd.exe /c` 运行 Shell 封装器需要批准（仅允许列表条目不会自动允许封装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖，并移除危险的启动/Shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果您需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装在标准位置），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用（设置 → 批准执行）中的执行批准控制。
  Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受执行批准（`~/.openclaw/exec-approvals.json`）的控制。

## 执行节点绑定

当有多个节点可用时，您可以将执行绑定到特定节点。
这会为 `exec host=node` 设置默认节点（并且可以针对每个代理进行覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

每个代理的覆盖：

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

节点可以在 `node.list` / `node.describe` 中包含一个 `permissions` 映射，以权限名称为键（例如 `screenRecording`、`accessibility`），值为布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

OpenClaw 可以运行连接到 Gateway(网关)
WebSocket 并公开 `system.run` / `system.which` 的**无头节点主机**（无 UI）。这在 Linux/Windows
上或用于在服务器旁边运行最小化节点时很有用。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意事项：

- 仍然需要配对（Gateway(网关) 将显示设备配对提示）。
- 节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。
- 执行批准通过 `~/.openclaw/exec-approvals.json`
  在本地强制执行（请参阅[执行批准](/zh/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 以通过配套应用执行主机路由 `system.run`；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求应用主机，并在其不可用时失效关闭。
- 当 Gateway(网关) WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway(网关) WS 服务器（因此 `openclaw nodes …` 可以针对此 Mac 工作）。
- 在远程模式下，应用为 Gateway(网关) 端口打开 SSH 隧道并连接到 `localhost`。

import zh from "/components/footer/zh.mdx";

<zh />
