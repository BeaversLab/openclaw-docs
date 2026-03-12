---
summary: "iOS 节点应用：连接到网关、配对、画布和故障排除"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 应用"
---

# iOS 应用 (节点)

可用性：内部预览版。iOS 应用尚未公开发布。

## 功能

- 通过 WebSocket（局域网或 tailnet）连接到网关。
- 暴露节点功能：画布、屏幕快照、相机捕获、位置、通话模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行的网关（macOS、Linux 或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 通过 Bonjour 在同一局域网内，**或**
  - 通过单播 DNS-SD 在 Tailnet 上（示例域：`openclaw.internal.`），**或**
  - 手动主机/端口（回退机制）。

## 快速开始 (配对 + 连接)

1. 启动网关：

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

## 官方版本的基于中继的推送

官方分发的 iOS 版本使用外部推送中继，而不是将原始 APNs
token 发布到网关。

网关端要求：

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

工作流程：

- iOS 应用使用 App Attest 和 App 收据向中继注册。
- 中继返回一个不透明的中继句柄和一个注册范围的发送授权。
- iOS 应用获取配对的网关身份并将其包含在中继注册中，以便将基于中继的注册委托给该特定网关。
- 应用会将该基于中继的注册信息通过 `push.apns.register` 转发给配对的网关。
- 网关使用该存储的中继句柄进行 `push.test`、后台唤醒和唤醒提醒。
- 网关中继基础 URL 必须与官方/TestFlight iOS 版本中内置的中继 URL 相匹配。
- 如果应用随后连接到不同的网关或具有不同中继基础 URL 的版本，它会刷新中继注册，而不是重用旧的绑定。

网关**不**需要为此路径提供：

- 无需部署范围的中继令牌。
- 无需用于官方/TestFlight 基于中继发送的直接 APNs 密钥。

预期的操作员流程：

1. 安装官方/TestFlight iOS 版本。
2. 在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与网关配对，并让其完成连接。
4. 在应用拥有 APNs 令牌、操作员会话已连接且中继注册成功后，该应用会自动发布 `push.apns.register`。
5. 在此之后，`push.test`、重连唤醒以及唤醒提示均可使用存储的中继支持注册。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作为网关的临时环境变量覆盖。

## 认证和信任流程

中继的存在是为了强制执行直接在网关上使用 APNs 无法为官方 iOS 构建提供的两个约束：

- 只有通过 Apple 分发的正版 OpenClaw iOS 构建才能使用托管中继。
- 网关只能为与该特定
  网关配对的 iOS 设备发送中继支持的推送。

逐跳：

1. `iOS app -> gateway`
   - 应用首先通过正常的网关认证流程与网关配对。
   - 这为应用提供了一个已认证的节点会话以及一个已认证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 应用通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明以及应用收据。
   - 中继验证 Bundle ID、App Attest 证明和 Apple 收据，并要求
     官方/生产分发路径。
   - 这就是阻止本地 Xcode/开发版本使用托管中继的原因。本地版本可能是
     已签名的，但它不满足中继所期望的官方 Apple 分发证明。

3. `gateway identity delegation`
   - 在中继注册之前，应用从
     `gateway.identity.get` 获取配对的网关标识。
   - 应用将该网关标识包含在中继注册负载中。
   - 中继返回一个中继句柄和一个注册范围发送授权，两者均委派给
     该网关标识。

4. `gateway -> relay`
   - 网关存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在 `push.test`、重新连接唤醒和唤醒提示时，网关使用其
     自身设备标识对发送请求进行签名。
   - 中继会根据注册时委派的网关标识，验证存储的发送授权和
     网关签名两者。
   - 即使另一个网关以某种方式获得了句柄，也无法重用该存储的注册信息。

5. `relay -> APNs`
   - 中继拥有生产环境的 APNs 凭据和官方版本的原始 APNs 令牌。
   - 网关永远不会存储基于中继的官方版本的原始 APNs 令牌。
   - 中继代表配对的网关向 APNs 发送最终的推送。

创建此设计的原因：

- 为了防止生产环境的 APNs 凭据泄露到用户网关中。
- 为了避免在网关上存储原始的官方版本 APNs 令牌。
- 为了仅允许官方/TestFlight 版本的 OpenClaw 使用托管中继。
- 为了防止一个网关向属于不同网关的 iOS 设备发送唤醒推送。

本地/手动版本仍使用直接连接 APNs。如果您在没有中继的情况下测试这些版本，
网关仍然需要直接的 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## 发现路径

### Bonjour (局域网)

Gateway 在 `local.` 上通告 `_openclaw-gw._tcp`。iOS 应用会自动列出这些内容。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域名；例如：`openclaw.internal.`）和 Tailscale 分割 DNS。
请参阅 [Bonjour](/zh/en/gateway/bonjour) 以获取 CoreDNS 示例。

### 手动主机/端口

在设置中，启用 **Manual Host** 并输入网关主机 + 端口（默认为 `18789`）。

## Canvas + A2UI

iOS 节点渲染 WKWebView canvas。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

备注：

- Gateway canvas 主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway HTTP 服务器提供服务（与 `gateway.port` 端口相同，默认为 `18789`）。
- 当通告了 canvas 主机 URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

### Canvas 评估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对话模式

- 语音唤醒和对话模式可在设置中找到。
- iOS 可能会暂停后台音频；当应用处于非活动状态时，请将语音功能视为尽力而为的服务。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用置于前台（canvas/camera/screen 命令需要此操作）。
- `A2UI_HOST_NOT_CONFIGURED`：网关未通告 Canvas 主机 URL；请检查 [Gateway configuration](/zh/en/gateway/configuration) 中的 `canvasHost`。
- 配对提示从未出现：运行 `openclaw devices list` 并手动批准。
- 重新安装后重连失败：钥匙串（Keychain）配对令牌已被清除；请重新配对节点。

## 相关文档

- [配对](/zh/en/channels/pairing)
- [发现](/zh/en/gateway/discovery)
- [Bonjour](/zh/en/gateway/bonjour)
