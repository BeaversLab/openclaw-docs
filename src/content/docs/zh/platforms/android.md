---
summary: "Android 应用（节点）：连接操作手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 应用"
---

# Android 应用（节点）

> **注意：** Android 应用尚未公开发布。源代码可在 [OpenClaw 仓库](https://github.com/openclaw/openclaw) 中 `apps/android` 下找到。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行构建。请参阅 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) 了解构建说明。

## 支持快照

- 角色：伴随节点应用 (Android 不托管 Gateway(网关))。
- 需要 Gateway(网关)：是 (在 macOS、Linux 上运行，或通过 Windows 运行)。
- 安装：[入门指南](/en/start/getting-started) + [配对](/en/channels/pairing)。
- Gateway(网关)：[操作手册](/en/gateway) + [配置](/en/gateway/configuration)。
  - 协议：[Gateway(网关) 协议](/en/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制 (launchd/systemd) 位于 Gateway(网关) 主机上。请参阅 [Gateway(网关)](/en/gateway)。

## 连接运行手册

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway(网关)**

Android 直接连接到 Gateway(网关) WebSocket（默认 `ws://<host>:18789`）并使用设备配对 (`role: node`)。

### 先决条件

- 您可以在“主机”机器上运行 Gateway(网关)。
- Android 设备/模拟器可以访问网关 WebSocket：
  - 使用 mDNS/NSD 的同一局域网，**或**
  - 使用广域 Tailscale / 单播 DNS-SD 的同一 Bonjour Tailnet (见下文)，**或**
  - 手动网关主机/端口 (回退选项)
- 您可以在 gateway 机器上（或通过 SSH）运行 CLI (`openclaw`)。

### 1) 启动 Gateway(网关)

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似内容：

- `listening on ws://0.0.0.0:18789`

对于仅 Tailnet 的设置 (推荐用于 Vienna ⇄ London)，将网关绑定到 Tailnet IP：

- 在 gateway 主机的 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway(网关) / macOS 菜单栏应用。

### 2) 验证发现 (可选)

从网关机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/en/gateway/bonjour)。

#### Tailnet (Vienna ⇄ London) discovery via unicast DNS-SD

Android NSD/mDNS discovery won’t cross networks. If your Android node and the gateway are on different networks but connected via Tailscale, use Wide-Area Bonjour / unicast DNS-SD instead:

1. 在 gateway 主机上设置一个 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. Configure Tailscale split DNS for your chosen domain pointing at that DNS server.

详细信息和 CoreDNS 配置示例：[Bonjour](/en/gateway/bonjour)。

### 3) Connect from Android

In the Android app:

- The app keeps its gateway connection alive via a **foreground service** (persistent notification).
- Open the **Connect** tab.
- Use **Setup Code** or **Manual** mode.
- If discovery is blocked, use manual host/port (and TLS/token/password when required) in **Advanced controls**.

After the first successful pairing, Android auto-reconnects on launch:

- Manual endpoint (if enabled), otherwise
- The last discovered gateway (best-effort).

### 4) Approve pairing (CLI)

On the gateway machine:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详细信息：[配对](/en/channels/pairing)。

### 5) Verify the node is connected

- Via nodes status:

  ```bash
  openclaw nodes status
  ```

- Via Gateway(网关):

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + history

Android 聊天选项卡支持会话选择（默认 `main`，加上其他现有会话）：

- 历史记录：`chat.history`
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + camera

#### Gateway(网关) Canvas Host (recommended for web content)

If you want the node to show real HTML/CSS/JS that the agent can edit on disk, point the node at the Gateway(网关) canvas host.

注意：节点从 Gateway(网关) HTTP 服务器加载 canvas（与 `gateway.port` 端口相同，默认 `18789`）。

1. 在网关主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. Navigate the node to it (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

该服务器会将一个实时重载客户端注入 HTML，并在文件更改时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅限前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧式别名）

相机命令（仅限前台；受权限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 辅助工具，请参阅 [Camera node](/en/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令界面

- 语音：Android 在语音标签页中使用单个麦克风开/关流程，并具有转录捕获和 TTS 播放功能（配置时使用 ElevenLabs，否则回退到系统 TTS）。当应用离开前台时，语音会停止。
- 语音唤醒/交谈模式切换开关目前已从 Android UX/运行时中移除。
- 额外的 Android 命令系列（可用性取决于设备 + 权限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（参见下方的 [Notification forwarding](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`、`calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`、`motion.pedometer`

## 通知转发

Android 可以将设备通知作为事件转发到网关。多项控件让您可以限定转发的通知范围和时间。

| 键                               | 类型                  | 描述                                                         |
| -------------------------------- | --------------------- | ------------------------------------------------------------ |
| `notifications.allowPackages`    | 字符串数组 (string[]) | 仅转发来自这些包名的通知。如果设置了此项，则忽略所有其他包。 |
| `notifications.denyPackages`     | 字符串数组 (string[]) | 绝不转发来自这些包名的通知。在 `allowPackages` 之后应用。    |
| `notifications.quietHours.start` | 字符串 (HH:mm)        | 免打扰时段的开始时间（本地设备时间）。在此期间将抑制通知。   |
| `notifications.quietHours.end`   | 字符串 (HH:mm)        | 免打扰时段窗口的结束时间。                                   |
| `notifications.rateLimit`        | 数字                  | 每个应用每分钟转发的最大通知数量。多余的通知将被丢弃。       |

通知选择器对转发通知事件也采用了更安全的行为，以防止意外转发敏感的系统通知。

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

<Note>通知转发需要 Android 通知监听器权限。应用会在设置过程中提示您授予此权限。</Note>
