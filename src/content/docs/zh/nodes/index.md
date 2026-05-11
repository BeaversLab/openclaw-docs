---
summary: "节点：配对、能力、权限以及用于画布/相机/屏幕/设备/通知/系统的 CLI 助手"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "节点"
---

**节点** 是一种配套设备（macOS/iOS/Android/headless），使用 `role: "node"` 连接到 Gateway(网关) **WebSocket**（与操作员使用相同的端口），并通过 `node.invoke` 暴露命令接口（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情：[Gateway(网关) 协议](/zh/gateway/protocol)。

传统传输方式：[Bridge 协议](/zh/gateway/bridge-protocol)（TCP JSONL；对于当前节点仅作历史参考）。

macOS 也可以在 **节点模式** 下运行：菜单栏应用连接到 Gateway(网关) 的
WS 服务器，并将其本地画布/相机命令作为节点暴露（因此 `openclaw nodes …` 可以针对此 Mac 运行）。在远程网关模式下，浏览器自动化由 CLI 节点主机（`openclaw node run` 或
已安装的节点服务）处理，而不是由本机应用节点处理。

注意：

- 节点是 **外设**，不是网关。它们不运行网关服务。
- Telegram/WhatsApp/等消息到达 **网关**，而不是节点。
- 故障排除手册：[/nodes/故障排除](/zh/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。** 节点在 `connect` 期间出示设备身份；Gateway(网关)
为 `role: node` 创建设备配对请求。通过设备 CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果节点使用更改的身份验证详细信息（角色/范围/公钥）重试，则先前的
待处理请求将被取代，并创建一个新的 `requestId`。在批准之前重新运行
`openclaw devices list`。

注意：

- 当节点的设备配对角色包含 `node` 时，`nodes status` 将该节点标记为 **已配对**。
- 设备配对记录是持久的已批准角色合约。令牌轮换
  保留在该合约内；它不能将已配对的节点升级为
  配对批准从未授予的不同角色。
- `node.pair.*`（CLI： `openclaw nodes pending/approve/reject/remove/rename`）是一个单独的网关拥有的
  节点配对存储；它并 **不** 阻止 WS `connect` 握手。
- `openclaw nodes remove --node <id|name|ip>` 从那个单独的 Gateway 拥有的节点配对存储中删除过时的条目。
- 批准范围遵循待处理请求中声明的命令：
  - 无命令请求：`operator.pairing`
  - 非执行节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 远程节点主机 (system.run)

当您的 Gateway(网关) 在一台机器上运行并且您希望命令在另一台机器上执行时，请使用 **node host**。模型仍然与 **gateway** 通信；当选择 `host=node` 时，gateway 将 `exec` 调用转发到 **node host**。

### 什么在哪里运行

- **Gateway(网关) host**：接收消息，运行模型，路由工具调用。
- **Node host**：在节点机器上执行 `system.run`/`system.which`。
- **Approvals**：通过 `~/.openclaw/exec-approvals.json` 在节点主机上强制执行。

批准说明：

- 基于批准的节点运行绑定确切的请求上下文。
- 对于直接的 Shell/运行时文件执行，OpenClaw 也会尽最大努力绑定一个具体的本地
  文件操作数，并在该文件在执行前发生更改时拒绝运行。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件，
  将拒绝需要批准的执行，而不是假装完全的运行时覆盖。请使用沙箱隔离、
  单独的主机或明确的受信任允许列表/完整工作流来获得更广泛的解释器语义。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道的远程 Gateway（回环绑定）

如果 Gateway(网关) 绑定到环回地址（`gateway.bind=loopback`，本地模式下的默认值），远程节点主机将无法直接连接。创建一个 SSH 隧道并将节点主机指向隧道的本地端。

示例（节点主机 -> gateway 主机）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

注意事项：

- `openclaw node run` 支持令牌或密码身份验证。
- 首选环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置后备选项是 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，根据远程优先级规则，`gateway.remote.token` / `gateway.remote.password` 是有效的。
- 如果配置了活动本地 `gateway.auth.*` SecretRefs 但未解析，节点主机身份验证将失败关闭。
- 节点主机身份验证解析仅遵循 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

### 配对 + 命名

在 Gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点使用更改的身份验证详细信息重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

命名选项：

- 在 `openclaw node run` / `openclaw node install` 上的 `--display-name`（持久保存在节点的 `~/.openclaw/node.json` 中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 覆盖）。

### 允许列表中的命令

执行批准是**针对每个节点主机**的。请从 gateway 添加允许列表条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

审批位于 `~/.openclaw/exec-approvals.json` 的节点主机上。

### 将执行指向节点

配置默认值（gateway 配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或针对每个会话：

```
/exec host=node security=allowlist node=<id-or-name>
```

设置完成后，任何带有 `host=node` 的 `exec` 调用都会在节点主机上运行（取决于节点允许列表/批准）。

`host=auto` 不会自行隐式选择节点，但允许从 `auto` 发出显式的每次调用 `host=node` 请求。如果您希望节点执行成为会话的默认设置，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关内容：

- [节点主机 CLI](/zh/cli/node)
- [Exec 工具](/zh/tools/exec)
- [Exec 批准](/zh/tools/exec-approvals)

## 调用命令

低级（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

存在针对常见的“给代理提供一个 MEDIA 附件”工作流的高级辅助工具。

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

备注：

- 对于 `canvas.*` 和 `camera.*`，节点必须处于前台（后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 剪辑时长受到限制（目前为 `<= 60s`），以避免过大的 base64 负载。
- 如果可能，Android 将提示 `CAMERA`/`RECORD_AUDIO` 权限；拒绝的权限将失败并返回 `*_PERMISSION_REQUIRED`。

## 屏幕录制（节点）

支持的节点会公开 `screen.record` (mp4)。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

说明：

- `screen.record` 的可用性取决于节点平台。
- 屏幕录制时长限制为 `<= 60s`。
- `--no-audio` 在支持的平台上禁用麦克风采集。
- 当有多个屏幕可用时，使用 `--screen <index>` 选择一个显示。

## 位置 (节点)

当在设置中启用位置服务时，节点会公开 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

备注：

- 位置服务默认处于**关闭**状态。
- “始终”需要系统权限；后台获取为尽力而为。
- 响应包括经纬度、精度（米）和时间戳。

## 短信 (Android 节点)

当用户授予 **SMS** 权限且设备支持电话功能时，Android 节点可以暴露 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

备注：

- 必须在 Android 设备上接受权限提示，才会通告该功能。
- 不支持电话功能的仅 Wi-Fi 设备将不会通告 `sms.send`。

## Android 设备 + 个人数据命令

当启用相应功能时，Android 节点可以通告其他命令系列。

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

备注：

- 运动命令受可用传感器的能力限制。

## 系统命令 (节点主机 / mac 节点)

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

备注：

- `system.run` 在有效负载中返回 stdout/stderr/退出代码。
- Shell 执行现在通过带 `host=node` 的 `exec` 工具进行；`nodes` 仍然是用于显式节点命令的直接 RPC 接口。
- `nodes invoke` 不暴露 `system.run` 或 `system.run.prepare`；这些仅保留在执行路径上。
- 执行路径会在批准之前准备一个规范的 `systemRunPlan`。一旦批准被授予，网关将转发该存储的计划，而不是任何后来调用者编辑的 command/cwd/会话 字段。
- `system.notify` 遵守 macOS 应用程序上的通知权限状态。
- 无法识别的节点 `platform` / `deviceFamily` 元数据使用保守的默认允许列表，该列表排除了 `system.run` 和 `system.which`。如果您有意为未知平台需要这些命令，请通过 `gateway.nodes.allowCommands` 显式添加它们。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 Shell 封装程序（`bash|sh|zsh ... -c/-lc`），请求范围的 `--env` 值将缩减为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在允许列表模式下，对于“始终允许”的决策，已知的分发封装程序（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，而非封装程序路径。如果解包操作不安全，则不会自动持久化任何允许列表条目。
- 在允许列表模式下的 Windows 节点主机上，通过 `cmd.exe /c` 运行的 Shell 封装程序需要审批（仅凭允许列表条目不会自动允许封装程序形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖，并剔除危险的启动/Shell 键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果您需要额外的 PATH 条目，请配置节点主机服务环境（或将工具安装在标准位置），而不是通过 `--env` 传递 `PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用程序中的执行审批限制（Settings → Exec approvals）。
  Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示将返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受执行审批（`~/.openclaw/exec-approvals.json`）限制。

## 执行节点绑定

当有多个节点可用时，您可以将 exec 绑定到特定节点。
这会设置 `exec host=node` 的默认节点（并且可以为每个代理覆盖）。

全局默认：

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

节点可以在 `node.list` / `node.describe` 中包含 `permissions` 映射，以权限名称为键（例如 `screenRecording`，`accessibility`），值为布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

OpenClaw 可以运行一个 **无头节点主机**（无 UI），它连接到 Gateway(网关)
WebSocket 并暴露 `system.run` / `system.which`。这在 Linux/Windows 上
或在服务器旁运行最小节点时很有用。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍然需要配对（Gateway(网关) 将显示设备配对提示）。
- 节点主机将其节点 id、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。
- Exec 批准通过 `~/.openclaw/exec-approvals.json` 在本地强制执行
  （参见 [Exec 批准](/zh/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 以通过配套应用 exec 主机路由 `system.run`；添加
  `OPENCLAW_NODE_EXEC_FALLBACK=0` 以要求应用主机并在其不可用时失效关闭。
- 当 Gateway(网关) WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway(网关) WS 服务器（因此 `openclaw nodes …` 可以针对此 Mac 工作）。
- 在远程模式下，应用为 Gateway(网关) 端口打开 SSH 隧道并连接到 `localhost`。
