> [!NOTE]
> 本页正在翻译中。

---
summary: "iOS node 应用：连接 Gateway、配对、canvas 与排障"
read_when:
  - 配对或重连 iOS node
  - 从源码运行 iOS app
  - 排查 gateway 发现或 canvas 命令
---
# iOS App (Node)

状态：内部预览。iOS app 目前尚未公开分发。

## 功能

- 通过 WebSocket 连接 Gateway（LAN 或 tailnet）。
- 暴露 node 能力：Canvas、屏幕截图、相机采集、定位、Talk 模式、Voice wake。
- 接收 `node.invoke` 命令并上报 node 状态事件。

## 要求

- Gateway 运行在另一台设备上（macOS、Linux 或通过 WSL2 的 Windows）。
- 网络路径：
  - 同一 LAN（Bonjour），**或**
  - Tailnet（单播 DNS‑SD；示例域名：`openclaw.internal.`），**或**
  - 手动 host/port（兜底）。

## 快速开始（配对 + 连接）

1) 启动 Gateway：

```bash
openclaw gateway --port 18789
```

2) 在 iOS app 中打开 Settings，选择已发现的 gateway（或启用 Manual Host 并填写 host/port）。

3) 在 gateway 主机上批准配对请求：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

4) 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 发现路径

### Bonjour（LAN）

Gateway 会在 `local.` 上广播 `_openclaw-gw._tcp`。iOS app 会自动列出。

### Tailnet（跨网络）

如果 mDNS 被阻断，可使用单播 DNS‑SD 区（选一个域名；例如 `openclaw.internal.`）并配置 Tailscale split DNS。
CoreDNS 示例见 [Bonjour](/zh/gateway/bonjour)。

### 手动 host/port

在 Settings 中启用 **Manual Host** 并输入 gateway host + 端口（默认 `18789`）。

## Canvas + A2UI

iOS node 渲染 WKWebView canvas。用 `node.invoke` 驱动：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18793/__openclaw__/canvas/"}'
```

注意：
- Gateway canvas host 提供 `/__openclaw__/canvas/` 与 `/__openclaw__/a2ui/`。
- 当广播了 canvas host URL 时，iOS node 连接后会自动导航到 A2UI。
- 通过 `canvas.navigate` + `{"url":""}` 可回到内置 scaffold。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle="#ff2d55"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return "ok"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Voice wake + talk mode

- Voice wake 与 talk mode 在 Settings 中可用。
- iOS 可能暂停后台音频；当应用不在前台时，语音功能只能 best‑effort。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：把 iOS app 切到前台（canvas/camera/screen 命令需要前台）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 未广播 canvas host URL；检查 [Gateway configuration](/zh/gateway/configuration) 中的 `canvasHost`。
- 配对提示未出现：运行 `openclaw nodes pending` 并手动批准。
- 重装后无法重连：Keychain 中的配对 token 被清除；重新配对 node。

## 相关文档

- [Pairing](/zh/gateway/pairing)
- [Discovery](/zh/gateway/discovery)
- [Bonjour](/zh/gateway/bonjour)
