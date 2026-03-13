---
summary: "Android 应用（节点）：连接手册 + 连接/聊天/语音/画布 命令界面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 应用"
---

# Android 应用（节点）

## 支持快照

- 角色：伴随节点应用（Android 不承载网关）。
- 需要网关：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行）。
- 安装：[入门指南](/en/start/getting-started) + [配对](/en/channels/pairing)。
- 网关：[手册](/en/gateway) + [配置](/en/gateway/configuration)。
  - 协议：[网关协议](/en/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制 (launchd/systemd) 位于网关主机上。参见 [网关](/en/gateway)。

## 连接手册

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **网关**

Android 直接连接到 Gateway WebSocket（默认 `ws://<host>:18789`）并使用设备配对（`role: node`）。

### 前提条件

- 您可以在“主控”机器上运行网关。
- Android 设备/模拟器可以访问网关 WebSocket：
  - 与 mDNS/NSD 处于同一局域网，**或**
  - 使用广域 Bonjour / 单播 DNS-SD 处于同一 Tailscale tailnet（见下文），**或**
  - 手动指定网关主机/端口（回退方案）
- 您可以在 Gateway 机器上（或通过 SSH）运行 CLI（`openclaw`）。

### 1) 启动网关

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似内容：

- `listening on ws://0.0.0.0:18789`

对于仅 tailnet 的设置（推荐用于维也纳 ⇄ 伦敦），将网关绑定到 tailnet IP：

- 在 Gateway 主机上 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启网关 / macOS 菜单栏应用。

### 2) 验证发现（可选）

从网关机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/en/gateway/bonjour)。

#### 通过单播 DNS-SD 进行 Tailnet (Vienna ⇄ London) 发现

Android NSD/mDNS 发现无法跨越网络。如果您的 Android 节点和网关位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD：

1. 在 Gateway 主机上设置 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为您指向该 DNS 服务器的所选域配置 Tailscale 分割 DNS。

详细信息和 CoreDNS 配置示例：[Bonjour](/en/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过**前台服务**（持久通知）保持其网关连接处于活动状态。
- 打开**连接**选项卡。
- 使用**设置代码**或**手动**模式。
- 如果发现受阻，请在**高级控制**中使用手动主机/端口（以及必要时使用的 TLS/令牌/密码）。

首次成功配对后，Android 会在启动时自动重新连接：

- 手动端点（如果已启用），否则
- 最后发现的网关（尽力而为）。

### 4) 批准配对 (CLI)

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详细信息：[配对](/en/channels/pairing)。

### 5) 验证节点已连接

- 通过节点状态：

  ```bash
  openclaw nodes status
  ```

- 通过网关：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史

Android 聊天选项卡支持会话选择（默认 `main`，加上其他现有会话）：

- 历史记录：`chat.history`
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) 画布 + 相机

#### 网关画布主机（推荐用于 Web 内容）

如果您希望节点显示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向网关画布主机。

注意：节点从 Gateway HTTP 服务器加载画布（与 `gateway.port` 端口相同，默认 `18789`）。

1. 在 Gateway 主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航至该地址（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

该服务器将实时重新加载客户端注入到 HTML 中，并在文件更改时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

画布命令（仅限前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧版别名）

相机命令（仅限前台；受权限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 帮助程序，请参阅[相机节点](/en/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令界面

- 语音：Android 在语音选项卡中使用单个麦克风开/关流程，包含转录捕获和 TTS 回放（配置时使用 ElevenLabs，回退到系统 TTS）。当应用离开前台时，语音会停止。
- 语音唤醒/对话模式切换开关目前已从 Android UX/运行时中移除。
- 其他 Android 命令系列（可用性取决于设备 + 权限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `motion.activity`, `motion.pedometer`

import zh from '/components/footer/zh.mdx';

<zh />
