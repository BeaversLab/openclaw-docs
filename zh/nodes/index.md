---
summary: "节点：配对、功能、权限以及画布/相机/屏幕/设备/通知/系统的 CLI 辅助工具"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "节点"
---

# 节点

**节点** 是一种配套设备（macOS/iOS/Android/无头模式），它通过 `role: "node"` 连接到网关 **WebSocket**（与操作员端口相同），并通过 `node.invoke` 暴露命令表面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情：[网关协议](/zh/en/gateway/protocol)。

旧版传输方式：[桥接协议](/zh/en/gateway/bridge-protocol)（TCP JSONL；对于当前节点已弃用/移除）。

macOS 也可以运行在 **节点模式** 下：菜单栏应用程序连接到网关的 WS 服务器，并将其本地画布/相机命令作为节点公开（因此 `openclaw nodes …` 可以针对此 Mac 运行）。

说明：

- 节点是 **外设**，不是网关。它们不运行网关服务。
- Telegram/WhatsApp/等消息落在 **网关** 上，而不是节点上。
- 故障排除手册：[/nodes/troubleshooting](/zh/en/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。** 节点在 `connect` 期间展示设备身份；网关为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

说明：

- 当其设备配对角色包含 `node` 时，`nodes status` 将节点标记为 **已配对**。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject`）是一个独立的网关拥有的
  节点配对存储；它 **不** 阻断 WS `connect` 握手。

## 远程节点主机

当您的网关在一台机器上运行而您希望在另一台机器上执行命令时，请使用 **节点主机**。模型仍然与 **网关** 对话；当选择了 `host=node` 时，网关将 `exec` 调用转发给 **节点主机**。

### 运行位置

- **网关主机**：接收消息，运行模型，路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：通过 `~/.openclaw/exec-approvals.json` 在节点主机上强制执行。

批准说明：

- 基于批准的节点运行绑定确切的请求上下文。
- 对于直接的 shell/运行时文件执行，OpenClaw 还会尽力绑定一个具体的本地
  文件操作数，如果该文件在执行前发生变化，则拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令确切识别一个具体的本地文件，
  将拒绝基于批准的执行，而不是假装完全的运行时覆盖。使用沙盒、
  独立的主机或显式的受信任允许列表/完整工作流以获得更广泛的解释器语义。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道连接远程网关（环回绑定）

如果网关绑定到环回地址 (`gateway.bind=loopback`，本地模式下的默认值)，
远程节点主机将无法直接连接。创建一个 SSH 隧道并将
节点主机指向隧道的本地端。

示例（节点主机 -> 网关主机）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

注意：

- `openclaw node run` 支持令牌或密码认证。
- 首选环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置后备项是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机会故意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，`gateway.remote.token` / `gateway.remote.password` 根据远程优先级规则有效。
- 如果配置了活动的本地 `gateway.auth.*` SecretRefs 但未解析，节点主机认证将失败关闭。
- 节点主机认证解析会故意忽略旧版 `CLAWDBOT_GATEWAY_*` 环境变量。

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

- 在 `openclaw node run` / `openclaw node install` 上设置 `--display-name`（持久保存在节点的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（网关覆盖）。

### 将命令加入允许列表

执行批准是**针对每个节点主机**的。从网关添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准位于节点主机的 `~/.openclaw/exec-approvals.json`。

### 将执行指向节点

配置默认值（网关配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或针对每个会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置，任何带有 `host=node` 的 `exec` 调用都将在节点主机上运行（取决于节点的允许列表/批准）。

相关：

- [节点主机 CLI](/zh/en/cli/node)
- [Exec 工具](/zh/en/tools/exec)
- [Exec 批准](/zh/en/tools/exec-approvals)

## 调用命令

底层（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

针对常见的“向代理提供 MEDIA 附件”工作流，存在更高级别的辅助工具。

## 屏幕截图（画布快照）

如果节点正在显示 Canvas (WebView)，`canvas.snapshot` 将返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印 `MEDIA:<path>`）：

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

- `canvas present` 接受 URL 或本地文件路径（`--target`），以及用于定位的可选 `--x/--y/--width/--height`。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

注意：

- 仅支持 A2UI v0.8 JSONL（v0.9/createSurface 会被拒绝）。

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

- 对于 `canvas.*` 和 `camera.*`，节点必须处于**前台**状态（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段时长会受到限制（目前为 `<= 60s`），以避免 base64 有效载荷过大。
- Android 会在可能的情况下提示授予 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝的权限将返回错误 `*_PERMISSION_REQUIRED`。

## 屏幕录制（节点）

支持的节点公开 `screen.record` (mp4)。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

注意：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制时长限制为 `<= 60s`。
- `--no-audio` 会在支持的平台上禁用麦克风采集。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择一个显示屏。

## 位置（节点）

当在设置中启用位置服务时，节点会公开 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

注意：

- 位置默认**关闭**。
- “始终”需要系统权限；后台获取为尽力而为。
- 响应包括经纬度、精度（米）和时间戳。

## SMS (Android 节点)

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以暴露 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

注意：

- 必须在 Android 设备上接受权限提示，才会通告该功能。
- 不支持电话功能的仅 Wi-Fi 设备将不会通告 `sms.send`。

## Android 设备 + 个人数据命令

当启用相应的功能时，Android 节点可以通告其他命令系列。

可用系列：

- `device.status`、 `device.info`、 `device.permissions`、 `device.health`
- `notifications.list`、 `notifications.actions`
- `photos.latest`
- `contacts.search`、 `contacts.add`
- `calendar.events`、 `calendar.add`
- `motion.activity`、 `motion.pedometer`

调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

注意：

- 运动命令受可用传感器功能限制。

## 系统命令（节点主机 / mac 节点）

macOS 节点暴露 `system.run`、 `system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、 `system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

注意：

- `system.run` 在有效载荷中返回 stdout/stderr/退出代码。
- `system.notify` 遵守 macOS 应用程序上的通知权限状态。
- 无法识别的节点 `platform` / `deviceFamily` 元数据使用保守的默认允许列表，其中不包括 `system.run` 和 `system.which`。如果您有意针对未知平台使用这些命令，请通过 `gateway.nodes.allowCommands` 显式添加它们。
- `system.run` 支持 `--cwd`、 `--env KEY=VAL`、 `--command-timeout` 和 `--needs-screen-recording`。
- 对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的 `--env` 值将缩减为显式允许列表（`TERM`、 `LANG`、 `LC_*`、 `COLORTERM`、 `NO_COLOR`、 `FORCE_COLOR`）。
- 在允许列表模式下，对于“始终允许”的决定，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件的路径，而不是包装器的路径。如果解包不安全，则不会自动持久化任何允许列表条目。
- 在处于允许列表模式的 Windows 节点主机上，通过 `cmd.exe /c` 运行的 shell 包装器需要审批（仅允许列表条目不会自动允许包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖设置，并会移除危险的启动/Shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果您需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装在标准位置），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受限于 macOS 应用程序中的执行审批（Settings → Exec approvals）。
  Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示将返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受限于执行审批（`~/.openclaw/exec-approvals.json`）。

## Exec 节点绑定

当有多个节点可用时，您可以将 exec 绑定到特定节点。
这会设置 `exec host=node` 的默认节点（并且可以针对每个代理进行覆盖）。

全局默认：

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

节点可以在 `node.list` / `node.describe` 中包含 `permissions` 映射，以权限名称（例如 `screenRecording`、`accessibility`）为键，值为布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

OpenClaw 可以运行一个**无头节点主机**（无 UI），它连接到 Gateway
WebSocket 并暴露 `system.run` / `system.which`。这在 Linux/Windows 上
或用于在服务器旁运行最小化节点时非常有用。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway 将显示设备配对提示）。
- 节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。
- 执行批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见 [Exec approvals](/zh/en/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 以通过配套应用执行主机路由 `system.run`；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求应用主机，并在其不可用时失败关闭。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可针对此 Mac 工作）。
- 在远程模式下，应用会为 Gateway 端口打开一个 SSH 隧道并连接到 `localhost`。

import zh from '/components/footer/zh.mdx';

<zh />
