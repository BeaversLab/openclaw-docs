---
summary: "iOS 节点应用：连接到 Gateway 网关、配对、画布和故障排除"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS App"
---

# iOS 应用 (节点)

可用性：内部预览版。iOS 应用尚未公开发布。

## 功能

- 通过 WebSocket（局域网或 tailnet）连接到 Gateway 网关。
- 暴露节点功能：Canvas、屏幕快照、相机捕获、位置、通话模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行的 Gateway 网关（macOS、Linux 或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 同一局域网通过 Bonjour，**或**
  - 通过单播 DNS-SD 的 Tailnet（示例域名：`openclaw.internal.`），**或**
  - 手动主机/端口（回退方案）。

## 快速开始（配对 + 连接）

1. 启动 Gateway：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择一个发现的网关（或启用手动主机并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方版本的 Relay 支持推送

官方分发的 iOS 版本使用外部推送中继，而不是将原始 APNs 令牌发布到网关。

Gateway 端要求：

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
- 中继返回一个不透明的中继句柄和一个注册范围的发送授权。
- iOS 应用获取配对的网关身份并将其包含在中继注册中，因此基于中继的注册被委托给该特定网关。
- 应用通过 `push.apns.register` 将该基于中继的注册转发给配对的网关。
- 网关使用该存储的中继句柄进行 `push.test`、后台唤醒和唤醒提示。
- 网关中继基础 URL 必须与内置于官方/TestFlight iOS 版本中的中继 URL 相匹配。
- 如果应用稍后连接到不同的网关或具有不同中继基础 URL 的版本，它会刷新中继注册，而不是重用旧绑定。

对于此路径，网关**不**需要以下内容：

- 无需部署范围的中继令牌。
- 无需用于官方/TestFlight 中继支持的直接 APNs 密钥。

预期的操作员流程：

1. 安装官方/TestFlight iOS 版本。
2. 在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与网关配对并让其完成连接。
4. 应用在拥有 APNs token、操作员会话已连接且中继注册成功后，会自动发布 `push.apns.register`。
5. 之后，`push.test`、重连唤醒和唤醒提示可以使用存储的基于中继的注册。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍然可以作为 Gateway 网关的临时环境变量覆盖。

## 身份验证和信任流

中继的存在是为了强制执行两个约束，这是直接在 Gateway 网关上使用 APNs 无法为官方 iOS 构建提供的：

- 只有通过 Apple 分发的 genuine OpenClaw iOS 构建才能使用托管中继。
- Gateway 网关只能为与该特定 Gateway 网关配对的 iOS 设备发送中继支持的通知推送。

逐跳：

1. `iOS app -> gateway`
   - 该应用首先通过正常的 Gateway 认证流程与网关配对。
   - 这为应用程序提供了一个经过身份验证的节点会话以及一个经过身份验证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 应用程序通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明以及应用程序收据。
   - 中继验证 Bundle ID、App Attest 证明和 Apple 收据，并要求使用官方/生产分发路径。
   - 这就是阻止本地 Xcode/开发构建使用托管中继的原因。本地构建可能是已签名的，但它不满足中继期望的官方 Apple 分发证明。

3. `gateway identity delegation`
   - 在中继注册之前，应用程序从 `gateway.identity.get` 获取已配对的 Gateway 网关身份。
   - 应用程序将该 Gateway 网关身份包含在中继注册负载中。
   - 中继返回一个中继句柄和一个注册范围的发送授权，这些都被委托给该 Gateway 网关身份。

4. `gateway -> relay`
   - Gateway 网关存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在 `push.test`、重新连接唤醒和唤醒提示时，Gateway 网关使用其自己的设备身份对发送请求进行签名。
   - 中继根据注册时委托的 Gateway 网关身份，同时验证存储的发送授权和 Gateway 网关签名。
   - 另一个 Gateway 网关无法重用该存储的注册，即使它以某种方式获得了句柄。

5. `relay -> APNs`
   - 中继拥有生产环境 APNs 凭证以及正式版本的原始 APNs 令牌。
   - Gateway 网关从不存储中继支持的正式版本的原始 APNs 令牌。
   - 中继代表配对的 Gateway 网关向 APNs 发送最终的推送。

创建此设计的原因：

- 为了将生产环境 APNs 凭证保留在用户 Gateway 网关之外。
- 为了避免在 Gateway 网关上存储原始正式版 APNs 令牌。
- 仅允许官方或 TestFlight OpenClaw 版本使用托管中继。
- 防止一个网关向属于不同网关的 iOS 设备发送唤醒推送。

本地/手动构建版本仍使用直接连接 APNs。如果您在没有中继的情况下测试这些构建版本，Gateway 网关仍需要直接 APNs 凭证：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 设备发现路径

### Bonjour (LAN)

Gateway(网关) 网关在 `local.` 上发布 `_openclaw-gw._tcp`。iOS 应用会自动列出这些服务。

### Tailnet (跨网络)

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域；例如：`openclaw.internal.`）和 Tailscale 分割 DNS。
请参阅 [Bonjour](/zh/gateway/bonjour) 获取 CoreDNS 示例。

### 手动主机/端口

在设置中，启用**手动主机** 并输入 Gateway 网关主机 + 端口（默认为 `18789`）。

## Canvas + A2UI

iOS 节点渲染 WKWebView canvas。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

注意事项：

- Gateway 网关 canvas 主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway 网关 HTTP 服务器提供服务（与 `gateway.port` 端口相同，默认为 `18789`）。
- 当通告 Canvas 主机 URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

### Canvas eval / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对讲模式

- 语音唤醒和对讲模式可在设置中使用。
- iOS 可能会暂停后台音频；当应用处于非活动状态时，请将语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用切换到前台（canvas/camera/screen 命令需要此操作）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway(网关) 网关未通告 Canvas 主机 URL；请检查 [Gateway(网关) 配置](/zh/gateway/configuration)中的 `canvasHost`。
- 配对提示从未出现：运行 `openclaw devices list` 并手动批准。
- 重新安装后重连失败：钥匙串（Keychain）配对令牌已被清除；请重新配对节点。

## 相关文档

- [配对](/zh/channels/pairing)
- [设备发现](/zh/gateway/discovery)
- [Bonjour](/zh/gateway/bonjour)

import zh from '/components/footer/zh.mdx';

<zh />
