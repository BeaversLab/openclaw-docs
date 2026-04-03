---
summary: "iOS 节点应用：连接到 Gateway(网关) 网关、配对、画布和故障排除"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS App"
---

# iOS 应用 (节点)

可用性：内部预览版。iOS 应用尚未公开发布。

## 功能

- 通过 WebSocket（局域网或 tailnet）连接到 Gateway(网关) 网关。
- 暴露节点功能：Canvas、屏幕快照、相机捕获、位置、通话模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行的 Gateway(网关) 网关（macOS、Linux 或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 同一局域网通过 Bonjour，**或**
  - 通过单播 DNS-SD 的 Tailnet（示例域名：`openclaw.internal.`），**或**
  - 手动主机/端口（回退方案）。

## 快速开始（配对 + 连接）

1. 启动 Gateway(网关)：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择一个发现的网关（或启用手动主机并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用程序使用更改的身份验证详细信息（角色/范围/公钥）重试配对，
之前的待处理请求将被取代，并创建一个新的 `requestId`。
在批准之前再次运行 `openclaw devices list`。

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 正式版本的 Relay 支持推送

官方分发的 iOS 版本使用外部推送中继，而不是将原始 APNs
token 发布到 Gateway。

Gateway(网关) 端要求：

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

流程工作原理：

- iOS 应用使用 App Attest 和应用收据向中继注册。
- 中继返回一个不透明的中继句柄以及一个注册范围的发送授权。
- iOS 应用获取配对的 Gateway 身份并将其包含在中继注册中，因此基于中继的注册被委托给该特定的 Gateway。
- 应用使用 `push.apns.register` 将该基于中继的注册转发给配对的 Gateway。
- Gateway 将该存储的中继句柄用于 `push.test`、后台唤醒和唤醒提示。
- Gateway 中继基础 URL 必须与内置于官方/TestFlight iOS 版本中的中继 URL 相匹配。
- 如果应用稍后连接到不同的 Gateway 或具有不同中继基础 URL 的版本，它将刷新中继注册，而不是重用旧绑定。

Gateway **不需要**为此路径做什么：

- 无需部署范围的中继令牌。
- 对于官方/TestFlight 基于中继的发送，无需直接的 APNs 密钥。

预期的操作员流程：

1. 安装官方/TestFlight iOS 版本。
2. 在 Gateway 上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与 Gateway 配对，并让其完成连接。
4. 应用在获得 APNs token、操作员会话已连接且中继注册成功后，会自动发布 `push.apns.register`。
5. 之后，`push.test`、重连唤醒和唤醒提示可以使用存储的基于中继的注册。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍然可用作 Gateway 的临时环境变量覆盖。

## 身份验证和信任流程

中继的存在是为了强制执行两个约束，而直接的 APNs-on-gateway 无法为
官方 iOS 版本提供这些约束：

- 只有通过 Apple 分发的正版 OpenClaw iOS 版本才能使用托管的中继。
- Gateway(网关)只能向与该特定 Gateway(网关)配对的 iOS 设备发送基于中继的推送通知。

逐跳：

1. `iOS app -> gateway`
   - 该应用首先通过正常的 Gateway(网关) 身份验证流程与 Gateway(网关)配对。
   - 这为应用提供了一个经过身份验证的节点会话 以及一个经过身份验证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 该应用通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明以及应用收据。
   - 中继验证 Bundle ID、App Attest 证明和 Apple 收据，并要求使用官方/生产分发路径。
   - 这就是阻止本地 Xcode/开发版本使用托管中继的原因。本地版本可能已签名，但不满足中继所期望的官方 Apple 分发证明。

3. `gateway identity delegation`
   - 在进行中继注册之前，该应用从 `gateway.identity.get` 获取已配对的 Gateway(网关) 身份。
   - 该应用将 Gateway(网关) 身份包含在中继注册负载中。
   - 中继返回一个中继句柄和一个注册范围的发送授权，它们被委派给该 Gateway(网关) 身份。

4. `gateway -> relay`
   - Gateway(网关)存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在 `push.test`、重新连接唤醒和唤醒提示时，Gateway(网关)使用其自己的设备身份对发送请求进行签名。
   - 中继会对照注册时委派的 Gateway(网关) 身份，验证存储的发送授权和 Gateway(网关) 签名。
   - 另一个 Gateway(网关)无法重用该存储的注册信息，即使它以某种方式获得了句柄。

5. `relay -> APNs`
   - 中继拥有用于正式版本的生产 APNs 凭证和原始 APNs 令牌。
   - 对于基于中继的正式版本，Gateway(网关)从不存储原始 APNs 令牌。
   - 中继代表已配对的 Gateway(网关)向 APNs 发送最终的推送通知。

创建此设计的原因：

- 为了防止生产 APNs 凭证泄露到用户 Gateway(网关)。
- 为了避免在 Gateway(网关)上存储原始的正式版本 APNs 令牌。
- 为了仅允许官方/TestFlight OpenClaw 版本使用托管中继。
- 为了防止一个 Gateway(网关)向属于不同 Gateway(网关)的 iOS 设备发送唤醒推送。

本地/手动构建仍使用直接的 APNs。如果您在没有中继的情况下测试这些构建，网关仍然需要直接的 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 设备发现路径

### Bonjour (LAN)

Gateway(网关) 在 `local.` 上广播 `_openclaw-gw._tcp`。iOS 应用会自动列出这些设备。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域；例如：`openclaw.internal.`）和 Tailscale 分割 DNS。
有关 CoreDNS 示例，请参见 [Bonjour](/en/gateway/bonjour)。

### 手动主机/端口

在设置中，启用 **Manual Host** 并输入网关主机 + 端口（默认为 `18789`）。

## Canvas + A2UI

iOS 节点渲染 WKWebView 画布。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

备注：

- Gateway(网关) 画布主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway(网关) HTTP 服务器提供（与 `gateway.port` 端口相同，默认为 `18789`）。
- 当广播画布主机 URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

### Canvas 评估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对话模式

- 语音唤醒和对话模式可在设置中使用。
- iOS 可能会暂停后台音频；当应用未处于活动状态时，请将语音功能视为尽力而为的功能。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用置于前台（画布/相机/屏幕命令需要此操作）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway(网关) 未广播画布主机 URL；请在 [Gateway(网关) 配置](/en/gateway/configuration) 中检查 `canvasHost`。
- 配对提示从未出现：运行 `openclaw devices list` 并手动批准。
- 重新安装后重新连接失败：钥匙串配对令牌已被清除；请重新配对节点。

## 相关文档

- [配对](/en/channels/pairing)
- [设备发现](/en/gateway/discovery)
- [Bonjour](/en/gateway/bonjour)
