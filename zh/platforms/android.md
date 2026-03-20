---
summary: "Android app (node): connection runbook + Connect/Chat/Voice/Canvas command surface"
read_when:
  - 配对或重新连接 Android 节点
  - 调试 Android Gateway(网关) 发现或身份验证
  - 验证客户端间的聊天记录一致性
title: "Android App"
---

# Android App (Node)

> **注意：** Android 应用尚未公开发布。源代码可在 [OpenClaw 代码库](https://github.com/openclaw/openclaw) 中找到，遵循 `apps/android` 协议。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assembleDebug`) 自己构建它。有关构建说明，请参阅 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。

## 支持快照

- 角色：伴随节点应用（Android 不承载 Gateway(网关)）。
- Gateway(网关) 必需：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行）。
- 安装：[入门指南](/zh/start/getting-started) + [配对](/zh/channels/pairing)。
- Gateway(网关)：[Runbook](/zh/gateway) + [Configuration](/zh/gateway/configuration)。
  - 协议：[Gateway(网关) 协议](/zh/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制（launchd/systemd）位于 Gateway(网关) 主机上。请参阅 [Gateway(网关)](/zh/gateway)。

## 连接 Runbook

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway(网关)**

Android 直接连接到 Gateway(网关) WebSocket（默认 `ws://<host>:18789`）并使用设备配对（`role: node`）。

### 先决条件

- 您可以在“主控”机器上运行 Gateway(网关)。
- Android 设备/模拟器可以访问 Gateway(网关) WebSocket：
  - 同一局域网 (LAN) 使用 mDNS/NSD，**或者**
  - 同一 Tailscale tailnet 使用广域 Bonjour / 单播 DNS-SD（见下文），**或者**
  - 手动指定 Gateway(网关) 主机/端口（回退方案）
- 您可以在 Gateway(网关) 机器上（或通过 SSH）运行 CLI (`openclaw`)。

### 1) 启动 Gateway(网关)

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似内容：

- `listening on ws://0.0.0.0:18789`

对于仅 Tailnet 的设置（建议用于 Vienna ⇄ London），将 Gateway(网关) 绑定到 tailnet IP：

- 在 Gateway(网关) 主机的 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway(网关) / macOS 菜单栏应用。

### 2) 验证发现（可选）

从 Gateway(网关) 机器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/zh/gateway/bonjour)。

#### 通过单播 DNS-SD 进行 Tailnet (Vienna ⇄ London) 发现

Android NSD/mDNS 发现无法跨越网络。如果您的 Android 节点和 Gateway(网关) 位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD：

1. 在 Gateway(网关) 主机上设置 DNS-SD 区域（例如 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 配置 Tailscale 的分割 DNS，将您选择的域指向该 DNS 服务器。

详细信息和 CoreDNS 配置示例：[Bonjour](/zh/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过**前台服务**（持久通知）保持其 Gateway(网关) 连接处于活动状态。
- 打开 **Connect**（连接）标签页。
- 使用 **Setup Code**（设置代码）或 **Manual**（手动）模式。
- 如果发现被阻止，请在 **Advanced controls**（高级控制）中使用手动主机/端口（并在需要时使用 TLS/令牌/密码）。

首次成功配对后，Android 会在启动时自动重新连接：

- 手动端点（如果已启用），否则
- 最后发现的 Gateway(网关)（尽力而为）。

### 4) 批准配对 (CLI)

在 Gateway(网关) 机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详细信息：[Pairing](/zh/channels/pairing)。

### 5) 验证节点已连接

- 通过节点状态：

  ```bash
  openclaw nodes status
  ```

- 通过 Gateway(网关)：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史记录

Android 聊天标签页支持选择会话（默认为 `main`，以及其他现有会话）：

- 历史记录：`chat.history`
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相机

#### Gateway Canvas Host（推荐用于 Web 内容）

如果您希望节点显示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向 Gateway canvas host。

注意：节点从 Gateway HTTP 服务器加载 canvas（与 `gateway.port` 端口相同，默认为 `18789`）。

1. 在 Gateway 主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航至该地址（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此服务器将一个实时重载客户端注入 HTML，并在文件更改时重载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅前台）：

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧版别名）

相机命令（仅前台；受权限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 助手，请参阅 [Camera node](/zh/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令界面

- 语音：Android 在语音标签页中使用单一麦克风开/关流程，并具有转录捕获和 TTS 播放功能（如果配置了 ElevenLabs 则使用它，否则回退到系统 TTS）。当应用离开前台时，语音会停止。
- 语音唤醒/对话模式切换开关目前已从 Android UX/运行时中移除。
- 其他 Android 命令系列（可用性取决于设备和权限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `motion.activity`, `motion.pedometer`

import zh from "/components/footer/zh.mdx";

<zh />
