---
summary: "AndroidCanvasAndroid 应用（节点）：连接手册 + Connect/Chat/Voice/Canvas 命令界面"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "AndroidAndroid 应用"
---

<Note>官方 Android 应用可在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 上获取。它是一个配套节点，需要运行 OpenClaw Gateway(网关)。源代码也可在 OpenClaw 仓库](https://github.com/openclaw/openclaw) 的 `apps/android` 下获得；有关构建说明，请参阅 [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md)。</Note>

## 支持快照

- 角色：伴随节点应用（Android 不承载 Gateway(网关)）。
- 需要 Gateway(网关)：是（请在 macOS、Linux 或通过 Windows 在 WSL2 上运行）。
- 安装：在 [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) 上获取该应用，通过 [入门指南](</en/start/getting-startedGateway(网关)>) 安装 Gateway(网关)，然后进行 [配对](/zh/channels/pairing)。
- Gateway(网关): [Runbook](<Gateway(网关)/en/gateway>) + [Configuration](/zh/gateway/configuration)。
  - Protocols: [Gateway(网关) protocol](<Gateway(网关)/en/gateway/protocol>) (nodes + control plane)。

## System control

System control (launchd/systemd) 位于 Gateway(网关) 主机上。请参阅 [Gateway(网关)](/zh/gateway)。

## Connection runbook

Android 节点应用程序 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway(网关)**

AndroidGateway(网关) 直接连接到 Gateway 的 WebSocket 并使用设备配对 (`role: node`)。

对于 Tailscale 或公共主机，Android 需要一个安全端点：

- 首选：使用 `https://<magicdns>` / `wss://<magicdns>` 的 Tailscale Serve / Funnel
- 也支持：任何其他带有真实 TLS 端点的 `wss://` Gateway(网关) URL
- 在专用 LAN 地址 / `.local` 主机上，以及 `localhost`、`127.0.0.1` 和 Android 模拟器网桥 (`10.0.2.2`) 上，仍支持 `ws://`

### 先决条件

- 您可以在“主”机器上运行 Gateway(网关)。
- Android 设备/模拟器可以访问网关 WebSocket：
  - 位于具有 mDNS/NSD 的同一局域网内，**或者**
  - 使用广域 Tailscale / 单播 DNS-SD（见下文）位于同一 Bonjour tailnet，**或者**
  - 手动网关主机/端口（备用）
- Tailnet/公共移动端配对**不**使用原始 tailnet IP `ws://`Tailscale 端点。请改用 Tailscale Serve 或其他 `wss://` URL。
- 您可以在 Gateway(网关) 机器上（或通过 SSH）运行 CLI（CLI`openclaw`）。

### 1) 启动 Gateway(网关)

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似以下内容：

- `listening on ws://0.0.0.0:18789`

对于通过 Android 进行远程 Tailscale 访问，建议使用 Serve/Funnel 而非原始 tailnet 绑定：

```bash
openclaw gateway --tailscale serve
```

这为 Android 提供了一个安全的 `wss://` / `https://` 端点。除非你也单独终止 TLS，否则单纯的 `gateway.bind: "tailnet"` 设置不足以支持首次远程 Android 配对。

### 2) 验证发现（可选）

从网关机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/zh/gateway/bonjour)。

如果您还配置了广域发现域，请与以下内容进行比较：

```bash
openclaw gateway discover --json
```

这会一次性显示 `local.` 以及配置的广域域，并使用解析到的服务端点而不是仅基于 TXT 的提示。

#### 通过单播 DNS-SD 进行 Tailnet（维也纳 ⇄ 伦敦）发现

Android NSD/mDNS 发现无法跨越网络。如果您的 Android 节点和网关位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour / 单播 DNS-SD。

仅凭设备发现对于 tailnet/公共 Android 配对是不够的。发现的路由仍然需要一个安全终端 (`wss://` 或 Tailscale Serve)：

1. 在网关主机上设置一个 DNS-SD 区域（例如 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为您选择的域配置 Tailscale 分流 DNS，指向该 DNS 服务器。

详细信息和 CoreDNS 配置示例：[Bonjour](/zh/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过 **前台服务**（持久通知）保持其网关连接处于活动状态。
- 打开 **连接** 标签页。
- 使用 **设置代码** 或 **手动** 模式。
- 如果发现受阻，请在**Advanced controls**中使用手动主机/端口。对于私有 LAN 主机，`ws://`仍然有效。对于 Tailscale/公共主机，请开启 TLS 并使用 `wss://` / Tailscale Serve 端点。

首次成功配对后，Android 会在启动时自动重新连接：

- 手动端点（如果已启用），否则
- 上次发现的网关（尽力而为）。

### 在线状态保持信标

经过身份验证的节点会话连接后，并且当应用移动到后台而前台服务仍处于连接状态时，Android 会调用 `node.event`，参数为 `event: "node.presence.alive"`。只有在知道经过身份验证的节点设备身份后，网关才会将其记录为配对节点/设备元数据上的 `lastSeenAtMs`/`lastSeenReason`。

仅当网关响应包含 `handled: true` 时，该应用才会将信标视为已成功记录。较旧的网关可能会用 `{ "ok": true }` 来确认 `node.event`；该响应是兼容的，但不计入持久的最后已见更新。

### 4) 批准配对 (CLI)

在网关机器上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

配对详情：[配对](/zh/channels/pairing)。

可选：如果 Android 节点始终从严格控制的子网连接，
您可以选择启用首次节点自动审批，并指定明确的 CIDR 或精确 IP：

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

默认禁用。它仅适用于没有请求范围的全新 `role: node` 配对。操作员/浏览器配对以及任何角色、范围、元数据或公钥更改仍然需要手动批准。

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

Android 聊天选项卡支持选择会话（默认 Android`main`，以及其它现有会话）：

- 历史记录：`chat.history`（显示已规范化；内联指令标签已从可见文本中剥离，纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截断的工具调用块）以及泄露的 ASCII/全角模型控制标记已被剥离，精确的纯静默令牌助手行（如 `NO_REPLY` / `no_reply`）已被省略，过大的行可以用占位符替换）
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + 相机

#### Gateway Canvas 主机（推荐用于网页内容）

如果您希望该节点显示代理可在磁盘上编辑的真实 HTML/CSS/JS，请将该节点指向 Gateway(网关) canvas 主机。

<Note>节点从 Gateway(网关) HTTP 服务器加载 canvas（端口与 `gateway.port` 相同，默认为 `18789`）。</Note>

1. 在网关主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航至该地址（局域网）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18789/__openclaw__/canvas/`。

此服务器将实时重载客户端注入 HTML，并在文件更改时重新加载。
A2UI 主机位于 `http://<gateway-host>:18789/__openclaw__/a2ui/`。

Canvas 命令（仅限前台）：

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架)。`canvas.snapshot` 返回 `{ format, base64 }` (默认 `format="jpeg"`)。
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` 旧版别名)

相机命令（仅限前台；受权限控制）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 辅助工具，请参阅 [Camera node](/zh/nodes/camera)。

### 8) Voice + expanded Android command surface

- 语音标签：Android 有两种明确的捕获模式。**Mic（麦克风）** 是一种手动的语音标签会话，它将每次暂停作为一轮聊天发送，并在应用离开前台或用户离开语音标签时停止。**Talk（对话）** 是连续的对话模式，会保持监听直到被关闭或节点断开连接。
- Talk Mode 在开始捕获之前将现有的前台服务从 `dataSync` 提升到 `dataSync|microphone`，然后在 Talk Mode 停止时将其降级。Android 14+ 需要 `FOREGROUND_SERVICE_MICROPHONE` 声明、`RECORD_AUDIO` 运行时授权以及运行时的麦克风服务类型。
- 默认情况下，Android Talk 使用原生语音识别、Gateway 聊天以及通过已配置的 gateway Talk 提供商进行的 AndroidGateway(网关)`talk.speak`。仅当 `talk.speak` 不可用时才使用本地系统 TTS。
- AndroidGateway(网关) Talk 仅在 `talk.realtime.mode` 为 `realtime` 且 `talk.realtime.transport` 为 `gateway-relay` 时使用实时 Gateway(网关) 中继。
- Android UX/runtime 中语音唤醒仍处于禁用状态。
- 其他 Android 命令系列（可用性取决于设备 + 权限）：
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (参见下方的 [Notification forwarding](#notification-forwarding))
  - `photos.latest`
  - `contacts.search`， `contacts.add`
  - `calendar.events`， `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`，`motion.pedometer`

## 助手入口点

Android 支持通过系统助手触发器启动 OpenClaw。配置完成后，按住主屏幕按钮或说“Hey Google，询问 OpenClaw...”将打开应用程序并将提示输入到聊天编辑器中。

这使用了应用清单中声明的 Android **App Actions** 元数据。网关端不需要额外的配置——助手意图完全由 AndroidAndroid 应用处理，并作为普通聊天消息转发。

<Note>App Actions 的可用性取决于设备、Google Play 服务版本， 以及用户是否已将 OpenClaw 设置为默认助手应用。</Note>

## 通知转发

Android 可以将设备通知作为事件转发到网关。多项控件允许您限定转发哪些通知以及何时转发。

| 键                               | 类型           | 描述                                                           |
| -------------------------------- | -------------- | -------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | 仅转发来自这些包名的通知。如果设置，则忽略所有其他包。         |
| `notifications.denyPackages`     | string[]       | 绝不转发来自这些包名的通知。在 `allowPackages` 之后应用。      |
| `notifications.quietHours.start` | string (HH:mm) | “免打扰时段的开始时间（本地设备时间）。在此期间通知将被抑制。” |
| `notifications.quietHours.end`   | 字符串 (HH:mm) | 免打扰时段的结束时间。                                         |
| `notifications.rateLimit`        | 数字           | 每个应用每分钟转发的最大通知数量。超出部分将被丢弃。           |

通知选择器对转发的通知事件也使用了更安全的行为，以防止意外转发敏感的系统通知。

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

<Note>通知转发需要 Android 通知监听权限。应用会在设置过程中提示授予此权限。</Note>

## 相关

- [iOS 应用](/zh/platforms/ios)
- [节点](/zh/nodes)
- [Android 节点故障排除](/zh/nodes/troubleshooting)
