---
summary: "节点：配对、能力、权限以及用于画布/相机/屏幕/设备/通知/系统的 CLI 助手"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "节点"
---

# 节点

**节点** 是一种配套设备（macOS/iOS/Android/headless），使用 `role: "node"` 连接到 Gateway(网关) **WebSocket**（与操作员使用相同的端口），并通过 `node.invoke` 暴露命令界面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情：[Gateway protocol](/zh/gateway/protocol)。

传统传输方式：[Bridge protocol](/zh/gateway/bridge-protocol)（TCP JSONL；对于当前节点已弃用/移除）。

macOS 也可以运行在 **节点模式** 下：菜单栏应用连接到 Gateway 网关 的 WS 服务器，并将其本地画布/相机命令作为节点暴露（因此 `openclaw nodes …` 可针对此 Mac 运行）。

说明：

- 节点是 **外设**，不是网关。它们不运行网关服务。
- Telegram/WhatsApp/等消息落在 **网关** 上，而不是节点上。
- 故障排除手册：[/nodes/故障排除](/zh/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。** 节点在 `connect` 期间出示设备身份；Gateway 网关 会为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果节点使用更改后的身份验证详细信息（角色/作用域/公钥）重试，则先前的待处理请求被取代，并创建一个新的 `requestId`。在批准之前重新运行 `openclaw devices list`。

注意：

- 当设备配对角色包含 `node` 时，`nodes status` 会将节点标记为 **已配对**。
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) 是一个单独的网关拥有的节点配对存储；它**不**限制 WS `connect` 握手。

## 远程节点主机 (system.run)

当您的 Gateway(网关) 在一台机器上运行并且您希望命令在另一台机器上执行时，请使用 **节点主机**。模型仍然与 **gateway** 对话；当选择 `host=node` 时，gateway 将 `exec` 调用转发给 **节点主机**。

### 运行位置

- **Gateway host**：接收消息，运行模型，路由工具调用。
- **Node host**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：通过 `~/.openclaw/exec-approvals.json` 在节点主机上强制执行。

批准说明：

- 基于批准的节点运行绑定确切的请求上下文。
- 对于直接的 shell/runtime 文件执行，OpenClaw 也会尽力绑定一个具体的本地文件操作数，如果该文件在执行前发生更改，则拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件，则拒绝需要批准的执行，而不是假装完全覆盖运行时。请使用沙箱隔离、独立主机或明确的受信任允许列表/完整工作流以获得更广泛的解释器语义。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道（回环绑定）连接远程 Gateway

如果 Gateway(网关) 绑定到回环地址（`gateway.bind=loopback`，本地模式下的默认值），远程节点主机将无法直接连接。请创建 SSH 隧道并将节点主机指向隧道的本地端。

示例（节点主机 -> gateway 主机）：

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
- 配置后备选项是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机会故意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，根据远程优先级规则，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果配置了活动的本地 `gateway.auth.*` SecretRefs 但未解析，则节点主机认证将失败关闭。
- Node-host 身份验证解析仅遵守 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配对 + 命名

在 gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点使用更改的认证详细信息重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

命名选项：

- `openclaw node run` / `openclaw node install` 上的 `--display-name`（持久保存在节点上的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 覆盖）。

### 将命令列入允许列表

执行审批是**针对每个节点主机**的。请从 gateway 添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批记录位于节点主机的 `~/.openclaw/exec-approvals.json` 处。

### 将执行指向节点

配置默认值（gateway 配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或每个会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置后，任何带有 `host=node` 的 `exec` 调用都将在节点主机上运行（受节点允许列表/审批的约束）。

相关：

- [节点主机 CLI](/zh/cli/node)
- [Exec 工具](/zh/tools/exec)
- [Exec 批准](/zh/tools/exec-approvals)

## 调用命令

底层（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

存在用于常见的“给代理一个 MEDIA 附件”工作流的高级辅助工具。

## 屏幕截图（Canvas 快照）

如果节点正在显示 Canvas (WebView)，`canvas.snapshot` 将返回 `{ format, base64 }`。

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

备注：

- `canvas present` 接受 URL 或本地文件路径（`--target`），以及可选的用于定位的 `--x/--y/--width/--height`。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

备注：

- 仅支持 A2UI v0.8 JSONL（拒绝 v0.9/createSurface）。

## 照片 + 视频（节点相机）

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

备注：

- 对于 `canvas.*` 和 `camera.*`，节点必须处于**前台**状态（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段持续时间受到限制（当前为 `<= 60s`），以避免过大的 base64 负载。
- 如果可能，Android 会提示授予 `CAMERA`/`RECORD_AUDIO` 权限；被拒绝的权限将导致 `*_PERMISSION_REQUIRED` 失败。

## 屏幕录制（节点）

支持的节点暴露 `screen.record` (mp4)。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

备注：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制被限制为 `<= 60s`。
- `--no-audio` 在支持的平台上禁用麦克风捕获。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择显示屏。

## 位置（节点）

当在设置中启用位置时，节点会暴露 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

备注：

- 位置功能**默认关闭**。
- “始终”需要系统权限；后台获取位置信息为尽力而为。
- 响应内容包括经纬度、精度（米）和时间戳。

## SMS (Android 节点)

Android 节点可以在用户授予 **SMS** 权限且设备支持电话功能时暴露 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

说明：

- 必须在 Android 设备上接受权限提示，才会通告该功能。
- 不支持电话功能的仅 Wi-Fi 设备将不会通告 `sms.send`。

## Android 设备 + 个人数据命令

Android 节点可以在启用相应功能时通告其他命令系列。

可用系列：

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`, `motion.pedometer`

调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

说明：

- 运动命令受可用传感器的功能限制。

## 系统命令 (节点主机 / mac 节点)

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

说明：

- `system.run` 在负载中返回 stdout/stderr/退出代码。
- `system.notify` 遵循 macOS 应用上的通知权限状态。
- 无法识别的节点 `platform` / `deviceFamily` 元数据使用保守的默认允许列表，其中不包括 `system.run` 和 `system.which`。如果您确实需要针对未知平台使用这些命令，请通过 `gateway.nodes.allowCommands` 显式添加它们。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 Shell 封装器 (`bash|sh|zsh ... -c/-lc`)，请求范围的 `--env` 值将缩减为显式允许列表 (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`)。
- 在允许列表模式下，对于“始终允许”的决定，已知的调度封装器 (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) 将持久化内部可执行文件路径，而不是封装器路径。如果解包不安全，则不会自动持久化允许列表条目。
- 在处于允许列表模式的 Windows 节点主机上，通过 `cmd.exe /c` 运行的 Shell 封装器需要批准（仅凭允许列表条目不会自动允许封装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机将忽略 `PATH` 覆盖，并剥离危险的启动/Shell 键 (`DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`)。如果您需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装在标准位置），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用中的执行批准限制（设置 → 执行批准）。
  Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示将返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受执行批准 (`~/.openclaw/exec-approvals.json`) 限制。

## Exec 节点绑定

当有多个节点可用时，您可以将 exec 绑定到特定节点。
这将设置 `exec host=node` 的默认节点（并且可以按代理覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按代理覆盖：

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

OpenClaw 可以运行 **无头节点主机**（无 UI），连接到 Gateway(网关) WebSocket 并暴露 `system.run` / `system.which`。这对于 Linux/Windows 或在服务器旁运行最小化节点非常有用。

启动方式：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍需进行配对（Gateway(网关) 将显示设备配对提示）。
- 节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。
- 执行批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见 [执行批准](/zh/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 以通过配套应用执行主机路由 `system.run`；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求应用主机，并在其不可用时失败关闭。
- 当 Gateway(网关) WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway(网关) WS 服务器（因此 `openclaw nodes …` 可在此 Mac 上运行）。
- 在远程模式下，应用为 Gateway(网关) 端口打开 SSH 隧道并连接到 `localhost`。

import zh from "/components/footer/zh.mdx";

<zh />
