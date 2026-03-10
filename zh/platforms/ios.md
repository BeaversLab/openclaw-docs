---
summary: "iOS 应用"
read_when:
  - "Pairing or reconnecting the iOS node"
  - "Running the iOS app from source"
  - "Debugging gateway discovery or canvas commands"
title: "iOS 节点应用：连接到 Gateway、配对、Canvas 和故障排除"
---

# iOS 应用（节点）

可用性：内部预览版。iOS 应用尚未公开发布。

## 功能

- 通过 WebSocket 连接到 Gateway（局域网或 tailnet）。
- 暴露节点能力：Canvas、屏幕快照、摄像头捕获、位置、对讲模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行的 Gateway（macOS、Linux 或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 通过 Bonjour 连接同一局域网，**或**
  - 通过单播 DNS-SD 连接 Tailnet（示例域：`openclaw.internal.`），**或**
  - 手动主机/端口（后备方案）。

## 快速开始（配对 + 连接）

1. 启动 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择一个发现的Gateway（或启用手动主机并输入主机/端口）。

3. 在Gateway主机上批准配对请求：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 发现路径

### Bonjour（局域网）

Gateway 在 `local.` 上通告 `_openclaw-gw._tcp`。iOS 应用会自动列出这些Gateway。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域；例如：`openclaw.internal.`）和 Tailscale 分离 DNS。参阅 [Bonjour](/zh/gateway/bonjour) 了解 CoreDNS 示例。

### 手动主机/端口

在设置中，启用手动主机并输入Gateway主机 + 端口（默认为 `18789`）。

## Canvas + A2UI

iOS 节点渲染 WKWebView canvas。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18793/__openclaw__/canvas/"}'
```

注意：

- Gateway canvas 主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 当通告 canvas 主机 URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对讲模式

- 语音唤醒和对讲模式在设置中可用。
- iOS 可能会暂停后台音频；当应用未激活时，语音功能将尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用带到前台（canvas/camera/screen 命令需要它）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 没有通告 canvas 主机 URL；请检查 [Gateway configuration](/zh/gateway/configuration) 中的 `canvasHost`。
- 配对提示从未出现：运行 `openclaw nodes pending` 并手动批准。
- 重新安装后重新连接失败：钥匙串配对令牌已被清除；请重新配对节点。

## 相关文档

- [Pairing](/zh/gateway/pairing)
- [Discovery](/zh/gateway/discovery)
- [Bonjour](/zh/gateway/bonjour)
