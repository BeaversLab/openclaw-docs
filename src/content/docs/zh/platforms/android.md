---
summary: "Android 应用程序（节点）：连接手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Android 应用程序"
---

<Note>Android 应用程序尚未公开发布。源代码可在 [OpenClaw 代码库](https://github.com/openclaw/openclaw) 中获取，位于 `apps/android` 下。您可以使用 Java 17 和 Android SDK (`./gradlew :app:assemblePlayDebug`) 自行构建。有关构建说明，请参阅 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。</Note>

## 支持快照

- 角色：配套节点应用程序（Android 不托管 Gateway(网关)）。
- 是否需要 Gateway(网关)：是（在 macOS、Linux 或通过 WSL2 在 Windows 上运行它）。
- 安装：[入门指南](/zh/start/getting-started) + [配对](/zh/channels/pairing)。
- Gateway(网关)：[操作手册](/zh/gateway) + [配置](/zh/gateway/configuration)。
  - 协议：[Gateway(网关) 协议](/zh/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制 位于 Gateway(网关) 主机上。请参阅 [Gateway(网关)](/zh/gateway)。

## 连接手册

Android 节点应用程序 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway(网关)**

Android 直接连接到 Gateway(网关) WebSocket 并使用设备配对 (`role: node`)。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 首选：Tailscale Serve / Funnel，并带有 `https://<magicdns>` / `wss://<magicdns>`
- 也支持：任何其他具有真实 TLS 端点的 `wss://` Gateway(网关) URL
- 在私有 LAN 地址 / `.local` 主机上，以及 `localhost`、`127.0.0.1` 和 Android 模拟器网桥 (`10.0.2.2`) 上，仍然支持明文 `ws://`

### 先决条件

- 您可以在“主控”机器上运行 Gateway(网关)。
- Android 设备/模拟器可以访问 gateway WebSocket：
  - 同一 LAN，带有 mDNS/NSD，**或**
  - 使用 Wide-Area Bonjour / 单播 DNS-SD 的同一 Tailscale tailnet（见下文），**或**
  - 手动指定 gateway 主机/端口（备用方案）
- Tailnet/公共移动配对**不**使用原始的 tailnet IP `ws://` 端点。请改用 Tailscale Serve 或另一个 `wss://` URL。
- 您可以在网关机器上（或通过 SSH）运行 CLI (`openclaw`)。

### 1) 启动 Gateway(网关)

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到如下内容：

- `listening on ws://0.0.0.0:18789`

对于通过 Android 进行的远程 Tailscale 访问，相比原始的 tailnet 绑定，更推荐使用 Serve/Funnel：

```bash
openclaw gateway --tailscale serve
```

这为 Android 提供了一个安全的 `wss://` / `https://` 端点。除非您也单独终止 TLS，否则普通的 `gateway.bind: "tailnet"` 设置对于首次远程 Android 配对来说是不够的。

### 2) 验证发现（可选）

从网关机器上：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/zh/gateway/bonjour)。

如果您还配置了广域发现域名，请进行以下比对：

```bash
openclaw gateway discover --json
```

这将一次性显示 `local.` 以及配置的广域域名，并使用解析后的服务端点，而不是仅使用 TXT 提示。

#### Tailnet (Vienna ⇄ London) 通过单播 DNS-SD 进行发现

Android NSD/mDNS 发现无法跨越网络。如果您的 Android 节点和网关位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。

仅凭发现对于 tailnet/公共 Android 配对是不够的。发现的路由仍然需要一个安全的端点（`wss://` 或 Tailscale Serve）：

1. 在网关主机上设置一个 DNS-SD 区域（例如 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为指向该 DNS 服务器的选定域名配置 Tailscale 分割 DNS。

详细信息和 CoreDNS 配置示例：[Bonjour](/zh/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过 **前台服务**（持久通知）保持其网关连接处于活动状态。
- 打开 **连接** 选项卡。
- 使用 **设置代码** 或 **手动** 模式。
- 如果发现被阻止，请在 **高级控件** 中使用手动主机/端口。对于私有 LAN 主机，`ws://` 仍然有效。对于 Tailscale/公共主机，请开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

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

配对详情：[配对](/zh/channels/pairing)。

可选：如果 Android 节点总是从严格控制的子网连接，
您可以选择使用显式 CIDR 或确切的 IP 进行首次节点自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

默认情况下这是禁用的。它仅适用于没有请求作用域的全新 `role: node` 配对。
操作员/浏览器配对以及任何角色、作用域、元数据或
公钥更改仍需手动批准。

### 5) 验证节点已连接

- 通过节点状态：

  ```bash
  openclaw nodes status
  ```

- 通过 Gateway(网关)：

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天 + 历史

Android 聊天选项卡支持会话选择（默认 `main`，加上其他现有会话）：

- 历史：`chat.history`（显示标准化；内联指令标签已
  从可见文本中剥离，纯文本工具调用 XML 载荷（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和
  截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌
  已被剥离，纯粹的静默令牌助手行（如确切的 `NO_REPLY` /
  `no_reply`）被省略，过大的行可以被替换为占位符）
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相机

#### Gateway(网关) Canvas 主机（推荐用于 Web 内容）

如果您希望节点显示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向 Gateway(网关) canvas 主机。

<Note>节点从 Gateway(网关) HTTP 服务器加载 canvas（与 `gateway.port` 端口相同，默认为 `18789`）。</Note>

1. 在网关主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航到该地址（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此服务器会将实时重载客户端注入 HTML，并在文件更改时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅限前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 旧别名）

相机命令（仅限前台；受权限限制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 辅助工具，请参阅 [Camera node](/zh/nodes/camera)。

### 8) 语音 + 扩展的 Android 命令界面

- 语音标签页：Android 有两种明确的捕获模式。**Mic** 是一种手动的语音标签页会话，将每次暂停作为聊天轮次发送，并在应用离开前台或用户离开语音标签页时停止。**Talk** 是连续的对话模式，会持续监听直到切换关闭或节点断开连接。
- 对话模式会在捕获开始之前将现有的前台服务从 `dataSync` 提升为 `dataSync|microphone`，然后在对话模式停止时将其降级。Android 14+ 需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授予以及运行时的麦克风服务类型。
- 语音回复通过配置的网关 Talk 提供商使用 `talk.speak`。仅当 `talk.speak` 不可用时才使用本地系统 TTS。
- 语音唤醒功能在 Android UX/运行时中保持禁用状态。
- 其他 Android 命令系列（可用性取决于设备 + 权限）：
  - `device.status`、`device.info`、`device.permissions`、`device.health`
  - `notifications.list`、`notifications.actions`（请参阅下方的 [Notification forwarding](#notification-forwarding)）
  - `photos.latest`
  - `contacts.search`、`contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Assistant 入口

Android 支持通过系统助手触发器启动 OpenClaw。配置完成后，长按主屏幕按钮或说“Hey Google，询问 OpenClaw...”即可打开应用并将提示词传递到聊天编辑器。

这使用了应用清单中声明的 Android **App Actions** 元数据。网关端无需额外配置——助手意图完全由 Android 应用处理，并作为普通聊天消息转发。

<Note>App Actions 的可用性取决于设备、Google Play Services 版本以及用户是否已将 OpenClaw 设置为默认助手应用。</Note>

## 通知转发

Android 可以将设备通知作为事件转发到网关。多种控件允许您限定转发哪些通知以及何时转发。

| 键                               | 类型           | 描述                                                           |
| -------------------------------- | -------------- | -------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 仅转发来自这些包名的通知。如果已设置，则忽略所有其他包。       |
| `notifications.denyPackages`     | string[]       | 切勿转发来自这些包名的通知。在 `allowPackages` 之后应用。      |
| `notifications.quietHours.start` | string (HH:mm) | 静默时段窗口的开始时间（本地设备时间）。在此期间通知将被抑制。 |
| `notifications.quietHours.end`   | string (HH:mm) | 静默时段窗口的结束时间。                                       |
| `notifications.rateLimit`        | number         | 每个包每分钟的最大转发通知数。多余的通知将被丢弃。             |

通知选择器对转发通知事件也使用更安全的行为，以防止意外转发敏感的系统通知。

示例配置：

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

<Note>通知转发需要 Android 通知侦听器权限。应用会在设置期间提示授予此权限。</Note>

## 相关

- [iOS 应用](/zh/platforms/ios)
- [节点](/zh/nodes)
- [Android 节点故障排除](/zh/nodes/troubleshooting)
