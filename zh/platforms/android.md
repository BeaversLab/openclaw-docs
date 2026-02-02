---
title: "Android App"
summary: "Android 应用（node）：连接 runbook + Canvas/Chat/Camera"
read_when:
  - 配对或重连 Android node
  - 排查 Android gateway 发现或认证
  - 验证各客户端聊天历史一致性
---

# Android App (Node)

## 支持概览

- 角色：伴侣 node 应用（Android 不托管 Gateway）。
- 需要 Gateway：是（运行在 macOS、Linux 或通过 WSL2 的 Windows）。
- 安装：[Getting Started](/zh/start/getting-started) + [Pairing](/zh/gateway/pairing)。
- Gateway：[Runbook](/zh/gateway) + [Configuration](/zh/gateway/configuration)。
  - 协议：[Gateway protocol](/zh/gateway/protocol)（nodes + 控制面）。

## 系统控制

系统控制（launchd/systemd）在 Gateway 主机上。见 [Gateway](/zh/gateway)。

## Connection Runbook

Android node app ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android 直接连接到 Gateway WebSocket（默认 `ws://<host>:18789`），并使用 Gateway-owned 配对。

### 前置条件

- 你能在主机上运行 Gateway。
- Android 设备/模拟器能访问 gateway WebSocket：
  - 同一 LAN + mDNS/NSD，**或**
  - 同一 Tailscale tailnet（Wide-Area Bonjour / 单播 DNS-SD，见下），**或**
  - 手动 gateway host/port（兜底）
- 你能在 gateway 主机上运行 CLI（`openclaw`，或通过 SSH）。

### 1) 启动 Gateway

```bash
openclaw gateway --port 18789 --verbose
```

确认日志中有类似：

- `listening on ws://0.0.0.0:18789`

对于仅 tailnet 的部署（例如 Vienna ⇄ London），将 gateway 绑定到 tailnet IP：

- 在 gateway 主机 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway / macOS 菜单栏 app。

### 2) 验证发现（可选）

在 gateway 主机：

```bash
dns-sd -B _openclaw-gw._tcp local.
```

更多调试说明见 [Bonjour](/zh/gateway/bonjour)。

#### Tailnet（Vienna ⇄ London）单播 DNS-SD 发现

Android 的 NSD/mDNS 无法跨网络。如果 Android node 与 gateway 不在同一网络但通过 Tailscale 连接，使用 Wide-Area Bonjour / 单播 DNS-SD：

1. 在 gateway 主机上设置 DNS-SD zone（示例 `openclaw.internal.`），发布 `_openclaw-gw._tcp` 记录。
2. 配置 Tailscale split DNS，把你的域名指向该 DNS 服务器。

细节与 CoreDNS 示例见 [Bonjour](/zh/gateway/bonjour)。

### 3) Android 端连接

在 Android app：

- 应用通过**前台服务**保持连接（常驻通知）。
- 打开 **Settings**。
- 在 **Discovered Gateways** 里选中你的 gateway 并点击 **Connect**。
- 如果 mDNS 被阻断，使用 **Advanced → Manual Gateway**（host + port）并点击 **Connect (Manual)**。

首次配对成功后，Android 会在启动时自动重连：

- 若启用手动端点：优先使用手动端点
- 否则：使用最近发现的 gateway（best-effort）。

### 4) 批准配对（CLI）

在 gateway 主机：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

配对细节见 [Gateway pairing](/zh/gateway/pairing)。

### 5) 验证 node 已连接

- 通过 nodes status：
  ```bash
  openclaw nodes status
  ```
- 通过 Gateway：
  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + history

Android node 的 Chat sheet 使用 gateway 的**主会话 key**（`main`），因此历史与回复与 WebChat 等客户端共享：

- 历史：`chat.history`
- 发送：`chat.send`
- 推送更新（best-effort）：`chat.subscribe` → `event:"chat"`

### 7) Canvas + camera

#### Gateway Canvas Host（推荐用于 Web 内容）

如果你希望 node 展示可由 agent 在磁盘编辑的 HTML/CSS/JS，请指向 Gateway canvas host。

注意：node 使用独立 canvas host（`canvasHost.port`，默认 `18793`）。

1. 在 gateway 主机创建 `~/.openclaw/workspace/canvas/index.html`。

2. 让 node 导航到它（LAN）：

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18793/__openclaw__/canvas/"}'
```

Tailnet（可选）：若两端在 Tailscale，使用 MagicDNS 名称或 tailnet IP 替代 `.local`，例如 `http://<gateway-magicdns>:18793/__openclaw__/canvas/`。

该服务器会向 HTML 注入 live-reload 客户端并在文件变更时重载。

A2UI host 位于 `http://<gateway-host>:18793/__openclaw__/a2ui/`。

Canvas 命令（仅前台）：

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate`（用 `{"url":""}` 或 `{"url":"/"}` 返回默认 scaffold）。`canvas.snapshot` 返回 `{ format, base64 }`（默认 `format="jpeg"`）。
- A2UI：`canvas.a2ui.push`, `canvas.a2ui.reset`（`canvas.a2ui.pushJSONL` 为旧别名）

相机命令（仅前台；权限控制）：

- `camera.snap`（jpg）
- `camera.clip`（mp4）

参数与 CLI helper 见 [Camera node](/zh/nodes/camera)。
