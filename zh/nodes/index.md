---
title: "Nodes"
summary: "Nodes：配对、能力、权限，以及 canvas/camera/screen/system 的 CLI helper"
read_when:
  - 将 iOS/Android nodes 配对到 gateway
  - 使用 node 的 canvas/camera 作为 agent 上下文
  - 新增 node 命令或 CLI helper
---

# Nodes

**Node** 是一个伴侣设备（macOS/iOS/Android/headless），通过 Gateway **WebSocket**（与 operators 同端口）以 `role: "node"` 连接，并通过 `node.invoke` 暴露命令面（如 `canvas.*`、`camera.*`、`system.*`）。协议细节见 [Gateway protocol](/zh/gateway/protocol)。

旧传输方式：[桥接 protocol](/zh/gateway/bridge-protocol)（TCP JSONL；已弃用/移除）。

macOS 也可运行在 **node 模式**：菜单栏 app 连接 Gateway 的 WS 服务器，并将本地 canvas/camera 命令作为 node 暴露（因此 `openclaw nodes …` 可对这台 Mac 生效）。

注意：

- Nodes 是**外设**，不是 gateways；不会运行 gateway 服务。
- Telegram/WhatsApp 等消息落在 **gateway** 上，而不是 nodes。

## 配对 + 状态

**WS nodes 使用设备配对。**Nodes 在 `connect` 时提交设备身份；Gateway 为 `role: node` 创建设备配对请求。通过 devices CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

注意：

- `nodes status` 会在其设备配对 role 包含 `node` 时标记为 **paired**。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject`）是独立的 gateway-owned
  node 配对存储；**不**影响 WS `connect` 握手。

## Remote node host（system.run）

当 Gateway 在一台机器上，而你希望命令在另一台机器执行时，使用 **node host**。
模型仍与 **gateway** 对话；当选择 `host=node` 时，gateway 会把 `exec` 转发到 **node host**。

### 谁运行在哪里

- **Gateway host**：接收消息、运行模型、路由工具调用。
- **Node host**：在 node 机器上执行 `system.run`/`system.which`。
- **审批**：在 node host 上通过 `~/.openclaw/exec-approvals.json` 强制。

### 启动 node host（前台）

在 node 机器：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 启动 node host（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配对 + 命名

在 gateway 主机：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes list
```

命名方式：

- 在 `openclaw node run` / `openclaw node install` 上使用 `--display-name`（会持久化到 node 侧 `~/.openclaw/node.json`）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 侧覆盖）。

### Allowlist 命令

Exec approvals 是**按 node host**管理的。可从 gateway 添加 allowlist：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批存放于 node host 的 `~/.openclaw/exec-approvals.json`。

### 指定 exec 指向 node

配置默认值（gateway config）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或按会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置后，任何 `host=node` 的 `exec` 调用都会在 node host 上执行（受 node 的 allowlist/approvals 限制）。

相关：

- [节点 host CLI](/zh/cli/node)
- [Exec tool](/zh/tools/exec)
- [Exec approvals](/zh/tools/exec-approvals)

## 调用命令

低层（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

常见“给 agent MEDIA 附件”的流程有更高层 helper。

## 截图（canvas snapshots）

如果 node 显示 Canvas（WebView），`canvas.snapshot` 返回 `{ format, base64 }`。

CLI helper（写入临时文件并输出 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

注意：

- `canvas present` 接受 URL 或本地文件路径（`--target`），并可用 `--x/--y/--width/--height` 指定位置。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 只支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。

## 照片 + 视频（node camera）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：前后摄像头各拍一张（2 条 MEDIA）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

注意：

- `canvas.*` 和 `camera.*` 需要 node **前台**（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段时长会被限制（当前 `<= 60s`）以避免 base64 payload 过大。
- Android 会在可能时请求 `CAMERA`/`RECORD_AUDIO` 权限；拒绝会报 `*_PERMISSION_REQUIRED`。

## 录屏（nodes）

Nodes 暴露 `screen.record`（mp4）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 需要 node 前台。
- Android 会显示系统的屏幕捕获提示。
- 录屏时长限制为 `<= 60s`。
- `--no-audio` 关闭麦克风采集（iOS/Android 支持；macOS 使用系统采集音频）。
- 多屏时可用 `--screen <index>` 选择显示器。

## 位置（nodes）

当设置中启用 Location 时，nodes 会暴露 `location.get`。

CLI helper：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- Location **默认关闭**。
- “Always” 需要系统权限；后台获取为 best-effort。
- 响应包含 lat/lon、精度（米）与时间戳。

## SMS（Android nodes）

当用户授予 **SMS** 权限且设备支持蜂窝时，Android nodes 可暴露 `sms.send`。

低层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须在 Android 设备上接受权限提示，能力才会被广播。
- 仅 Wi‑Fi 的设备不会广播 `sms.send`。

## 系统命令（node host / mac node）

macOS node 暴露 `system.run`、`system.notify`、`system.execApprovals.get/set`。
headless node host 暴露 `system.run`、`system.which`、`system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

注意：

- `system.run` 在 payload 中返回 stdout/stderr/exit code。
- `system.notify` 受 macOS app 的通知权限影响。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout`、`--needs-screen-recording`。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- macOS nodes 会丢弃 `PATH` 覆盖；headless node host 只接受**前置** node host PATH 的 `PATH`。
- 在 macOS node 模式下，`system.run` 由 macOS app 的 exec approvals 控制（Settings → Exec approvals）。
  Ask/allowlist/full 与 headless node host 一致；被拒会返回 `SYSTEM_RUN_DENIED`。
- 在 headless node host 上，`system.run` 由 exec approvals（`~/.openclaw/exec-approvals.json`）控制。

## Exec node 绑定

当有多个 nodes 可用时，你可以把 exec 绑定到特定 node。
这会设置 `exec host=node` 的默认 node（也可按 agent 覆盖）。

全局默认：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按 agent 覆盖：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消以允许任意 node：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## Permissions map

Nodes 可能在 `node.list` / `node.describe` 中包含 `permissions` map，以权限名为键（如 `screenRecording`、`accessibility`），值为布尔（`true` = 已授权）。

## Headless node host（跨平台）

OpenClaw 可运行**无 UI 的 node host**，连接 Gateway WebSocket 并暴露 `system.run` / `system.which`。
适用于 Linux/Windows 或在服务器旁运行最小 node。

启动：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍需配对（Gateway 会显示 node 批准提示）。
- node host 会把 node id、token、display name 与 gateway 连接信息存到 `~/.openclaw/node.json`。
- exec approvals 在本地 `~/.openclaw/exec-approvals.json` 强制执行
  （见 [Exec approvals](/zh/tools/exec-approvals)）。
- 在 macOS 上，headless node host 若可达会优先使用伴侣 app 的 exec host，
  若 app 不可用则回退到本地执行。设置 `OPENCLAW_NODE_EXEC_HOST=app` 可强制依赖 app，
  或用 `OPENCLAW_NODE_EXEC_FALLBACK=0` 禁止回退。
- 当 Gateway WS 使用 TLS 时，加 `--tls` / `--tls-fingerprint`。

## Mac node 模式

- macOS 菜单栏 app 作为 node 连接 Gateway WS 服务器（因此 `openclaw nodes …` 可作用于这台 Mac）。
- 远程模式下，app 会为 Gateway 端口打开 SSH 隧道并连接到 `localhost`。
