---
summary: "Android 应用（节点）：连接运行手册 + Canvas/Chat/Camera"
read_when:
  - "Pairing or reconnecting the Android node"
  - "Debugging Android gateway discovery or auth"
  - "Verifying chat history parity across clients"
title: "Android 应用"
---

# Android 应用（节点）

## 支持快照

- 角色：配套节点应用（Android 不托管 Gateway）。
- 需要 Gateway：是（在 macOS、Linux 或通过 WSL2 的 Windows 上运行）。
- 安装：[入门指南](/zh/start/getting-started) + [配对](/zh/gateway/pairing)。
- Gateway：[运行手册](/zh/gateway) + [配置](/zh/gateway/configuration)。
  - 协议：[Gateway 协议](/zh/gateway/protocol)（节点 + 控制平面）。

## 系统控制

系统控制（launchd/systemd）位于 Gateway 主机上。参见 [Gateway](/zh/gateway)。

## 连接运行手册

Android 节点应用 ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接连接到 Gateway WebSocket（默认 `ws://<host>:18789`）并使用 Gateway 拥有的配对。

### 前置条件

- 您可以在"主控"机器上运行 Gateway。
- Android 设备/模拟器可以访问 gateway WebSocket：
  - 使用 mDNS/NSD 的同一局域网，**或**
  - 使用广域 Bonjour/单播 DNS-SD 的同一 Tailscale tailnet（见下文），**或**
  - 手动 gateway 主机/端口（回退）
- 您可以在 gateway 机器上运行 CLI（`openclaw`）（或通过 SSH）。

### 1) 启动 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

在日志中确认您看到类似以下内容：

- `listening on ws://0.0.0.0:18789`

对于仅 tailnet 设置（推荐用于 Vienna ⇄ London），将 gateway 绑定到 tailnet IP：

- 在 gateway 主机的 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway / macOS 菜单栏应用。

### 2) 验证发现（可选）

从 gateway 机器：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明：[Bonjour](/zh/gateway/bonjour)。

#### Tailnet（Vienna ⇄ London）通过单播 DNS-SD 发现

Android NSD/mDNS 发现无法跨网络。如果您的 Android 节点和 gateway 位于不同的网络但通过 Tailscale 连接，请改用广域 Bonjour/单播 DNS-SD：

1. 在 gateway 主机上设置 DNS-SD 区域（示例 `openclaw.internal.`）并发布 `_openclaw-gw._tcp` 记录。
2. 为您选择的域配置 Tailscale 分割 DNS，指向该 DNS 服务器。

详细信息和示例 CoreDNS 配置：[Bonjour](/zh/gateway/bonjour)。

### 3) 从 Android 连接

在 Android 应用中：

- 该应用通过**前台服务**（持久通知）保持其 gateway 连接活跃。
- 打开**设置**。
- 在**已发现的 Gateway**下，选择您的 gateway 并点击**连接**。
- 如果 mDNS 被阻止，请使用**高级 → 手动 Gateway**（主机 + 端口）并**连接（手动）**。

首次成功配对后，Android 会在启动时自动重连：

- 手动端点（如果已启用），否则
- 上次发现的 gateway（尽力而为）。

### 4) 批准配对（CLI）

在 gateway 机器上：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

配对详细信息：[Gateway 配对](/zh/gateway/pairing)。

### 5) 验证节点已连接

- 通过节点状态：
  ```bash
  openclaw nodes status
  ```
- 通过 Gateway：
  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) 聊天和历史记录

Android 节点的聊天表单使用 gateway 的**主会话密钥**（`main`），因此历史记录和回复与 WebChat 和其他客户端共享：

- 历史记录：`chat.history`
- 发送：`chat.send`
- 推送更新（尽力而为）：`chat.subscribe` → `event:"chat"`

### 7) Canvas 和相机

#### Gateway Canvas 主机（推荐用于 Web 内容）

如果您希望节点显示代理可以在磁盘上编辑的真实 HTML/CSS/JS，请将节点指向 Gateway canvas 主机。

注意：节点使用 `canvasHost.port` 上的独立 canvas 主机（默认 `18793`）。

1. 在 gateway 主机上创建 `~/.openclaw/workspace/canvas/index.html`。

2. 将节点导航到该主机（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18793/__openclaw__/canvas/"}'
```

Tailnet（可选）：如果两台设备都在 Tailscale 上，请使用 MagicDNS 名称或 tailnet IP 代替 `.local`，例如 `http://<gateway-magicdns>:18793/__openclaw__/canvas/`。

此服务器将实时重载客户端注入到 HTML 中，并在文件更改时重新加载。A2UI 主机位于 `http://<gateway-host>:18793/__openclaw__/a2ui/`。

Canvas 命令（仅前台）：

- `canvas.eval`、`canvas.snapshot`、`canvas.navigate`（使用 `{"url":""}` 或 `{"url":"/"}` 返回默认脚手架）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`、`canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 传统别名）

相机命令（仅前台；需要权限）：

- `camera.snap` (jpg)
- `camera.clip` (mp4)

有关参数和 CLI 辅助工具，请参见[相机节点](/zh/nodes/camera)。
