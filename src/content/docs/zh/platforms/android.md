---
summary: "Android 应用（节点）：连接运行手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 应用"
---

# Android 应用（节点）

> **注意：** Android 应用尚未公开发布。源代码可在 `apps/android` 许可下的 [OpenClaw 代码仓库](https://github.com/openclaw/openclaw) 中获取。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行构建。请参阅 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 获取构建说明。

## 支持快照

- 角色：伴随节点应用 (Android 不托管 Gateway(网关))。
- 需要 Gateway(网关)：是 (在 macOS、Linux 上运行，或通过 Windows 运行)。
- 安装：[入门指南](/en/start/getting-started) + [配对](/en/channels/pairing)。
- Gateway(网关)：[运行手册](/en/gateway) + [配置](/en/gateway/configuration)。
  - 协议：[Gateway(网关) 协议](/en/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制 (launchd/systemd) 位于 Gateway(网关) 主机上。请参阅 [Gateway(网关)](/en/gateway)。

## 连接运行手册

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway(网关)**

Android 直接连接到 Gateway(网关) WebSocket 并使用设备配对 (`role: node`)。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 首选：Tailscale Serve / Funnel 并带有 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他具有真实 TLS 端点的 `wss://` Gateway(网关) URL
- 在私有 LAN 地址 / `.local` 主机上，以及 `localhost`、`127.0.0.1` 和 Android 模拟器网桥 (`10.0.2.2`) 上，仍支持明文 `ws://`

### 先决条件

- 您可以在“主机”机器上运行 Gateway(网关)。
- Android 设备/模拟器可以访问 gateway WebSocket：
  - 使用 mDNS/NSD 的同一局域网，**或者**
  - 使用 Wide-Area Bonjour / 单播 DNS-SD 的同一 Tailscale tailnet（见下文），**或者**
  - 手动指定 gateway 主机/端口（回退方案）
- Tailnet/公共移动配对**不**使用原始 tailnet IP `ws://` 端点。请改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在 gateway 机器上（或通过 SSH）运行 CLI (`openclaw`)。

### 1) 启动 Gateway(网关)

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似以下内容：

- `listening on ws://0.0.0.0:18789`

要通过 Android 进行远程 Tailscale 访问，建议使用 Serve/Funnel，而不是原始的 tailnet 绑定：

```bash
openclaw gateway --tailscale serve
```

这为 Android 提供了安全的 `wss://` / `https://` 端点。除非您还单独终止了 TLS，否则普通的 `gateway.bind: "tailnet"` 设置不足以进行首次远程 Android 配对。

### 2) 验证设备发现（可选）

在网关机器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/en/gateway/bonjour)。

如果您还配置了广域设备发现域，请与以下内容进行比较：

```bash
openclaw gateway discover --json
```

这将一次性显示 `local.` 以及已配置的广域域，并使用解析出的服务端点，而不是仅使用 TXT 提示。

#### 通过单播 DNS-SD 进行 Tailnet (Vienna ⇄ London) 设备发现

Android NSD/mDNS 设备发现无法跨越网络。如果您的 Android 节点和网关位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。

仅凭设备发现不足以进行 tailnet/公共 Android 配对。发现的路由仍然需要一个安全端点（`wss://` 或 Tailscale Serve）：

1. 在网关主机上设置 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为您指向该 DNS 服务器的选定域配置 Tailscale 分离 DNS。

详细信息和 CoreDNS 配置示例：[Bonjour](/en/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过**前台服务**（持久通知）保持其网关连接处于活动状态。
- 打开 **Connect**（连接）选项卡。
- 使用 **Setup Code**（设置代码）或 **Manual**（手动）模式。
- 如果设备发现被阻止，请在 **Advanced controls**（高级控制）中使用手动主机/端口。对于私有 LAN 主机，`ws://` 仍然有效。对于 Tailscale/公共主机，请打开 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次成功配对后，Android 会在启动时自动重新连接：

- 手动端点（如果已启用），否则
- 最后发现的网关（尽力而为）。

### 4) 批准配对（CLI）

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详细信息：[Pairing](/en/channels/pairing)。

### 5) 验证节点已连接

- Via nodes status:

  ```bash
  openclaw nodes status
  ```

- Via Gateway(网关):

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + history

The Android Chat tab supports 会话 selection (default `main`, plus other existing sessions):

- History: `chat.history` (display-normalized; inline directive tags are
  stripped from visible text, plain-text 工具-call XML payloads (including
  `<tool_call>...</tool_call>`, `<function_call>...</function_call>`,
  `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, and
  truncated 工具-call blocks) and leaked ASCII/full-width 模型 control tokens
  are stripped, pure silent-token assistant rows such as exact `NO_REPLY` /
  `no_reply` are omitted, and oversized rows can be replaced with placeholders)
- Send: `chat.send`
- Push updates (best-effort): `chat.subscribe` → `event:"chat"`

### 7) Canvas + camera

#### Gateway(网关) Canvas Host (recommended for web content)

If you want the node to show real HTML/CSS/JS that the agent can edit on disk, point the node at the Gateway(网关) canvas host.

Note: nodes load canvas from the Gateway(网关) HTTP server (same port as `gateway.port`, default `18789`).

1. Create `~/.openclaw/workspace/canvas/index.html` on the gateway host.

2. Navigate the node to it (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (optional): if both devices are on Tailscale, use a MagicDNS name or tailnet IP instead of `.local`, e.g. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

This server injects a live-reload client into HTML and reloads on file changes.
The A2UI host lives at `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Canvas commands (foreground only):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` or `{"url":"/"}` to return to the default scaffold). `canvas.snapshot` returns `{ format, base64 }` (default `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` legacy alias)

Camera commands (foreground only; permission-gated):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 助手的信息，请参阅 [Camera node](/en/nodes/camera)。

### 8) Voice + expanded Android command surface

- Voice: Android 在 Voice 选项卡中使用单个麦克风开关流程，并具有转录捕获和 `talk.speak` 播放功能。仅当 `talk.speak` 不可用时才使用本地系统 TTS。当应用离开前台时，语音会停止。
- Voice wake/talk-mode toggles are currently removed from Android UX/runtime.
- Additional Android command families (availability depends on device + permissions):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (see [Notification forwarding](#notification-forwarding) below)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Assistant entrypoints

Android supports launching OpenClaw from the system assistant trigger (Google
Assistant). When configured, holding the home button or saying "Hey Google, ask
OpenClaw..." opens the app and hands the prompt into the chat composer.

This uses Android **App Actions** metadata declared in the app manifest. No
extra configuration is needed on the gateway side -- the assistant intent is
handled entirely by the Android app and forwarded as a normal chat message.

<Note>App Actions availability depends on the device, Google Play Services version, and whether the user has set OpenClaw as the default assistant app.</Note>

## Notification forwarding

Android can forward device notifications to the gateway as events. Several controls let you scope which notifications are forwarded and when.

| Key                              | Type           | Description                                                                                  |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Only forward notifications from these package names. If set, all other packages are ignored. |
| `notifications.denyPackages`     | string[]       | Never forward notifications from these package names. Applied after `allowPackages`.         |
| `notifications.quietHours.start` | string (HH:mm) | 勿扰时段的开始时间（本地设备时间）。在此时间段内将抑制通知。                                 |
| `notifications.quietHours.end`   | string (HH:mm) | 勿扰时段的结束时间。                                                                         |
| `notifications.rateLimit`        | number         | 每个应用每分钟转发的最大通知数量。超出数量的通知将被丢弃。                                   |

通知选择器还对转发通知事件使用更安全的行为，以防止意外转发敏感系统通知。

配置示例：

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>通知转发需要 Android 通知监听器权限。应用会在设置过程中提示授予此权限。</Note>
