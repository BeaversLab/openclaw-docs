---
summary: "iOS 节点应用：连接到 Gateway(网关)、配对、Canvas 和故障排除"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "iOS 应用"
---

可用性：当为发布启用时，iPhone 应用构建通过 Apple 渠道分发。本地开发构建也可以从源代码运行。

## 功能

- 通过 WebSocket（LAN 或 tailnet）连接到 Gateway(网关)。
- 暴露节点功能：Canvas、屏幕快照、摄像头捕捉、位置、对讲模式、语音唤醒。
- 接收 `node.invoke` 命令并报告节点状态事件。

## 要求

- 在另一台设备上运行 Gateway(网关)（macOS、Linux 或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 通过 Bonjour 处于同一 LAN，**或者**
  - 通过单播 DNS-SD 处于 Tailnet（示例域：`openclaw.internal.`），**或者**
  - 手动主机/端口（回退）。

## 快速开始（配对 + 连接）

1. 启动 Gateway(网关)：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择一个已发现的网关（或启用 Manual Host 并输入主机/端口）。

3. 在网关主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用使用更改的身份验证详细信息（角色/作用域/公钥）重试配对，
之前的待处理请求将被取代，并创建一个新的 `requestId`。
在批准之前再次运行 `openclaw devices list`。

可选：如果 iOS 节点始终从严格控制的子网连接，您
可以选择使用显式 CIDR 或精确 IP 进行首次节点自动批准：

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

默认情况下禁用此功能。它仅适用于没有请求作用域的新 `role: node` 配对。
操作员/浏览器配对以及任何角色、作用域、元数据或
公钥更改仍需要手动批准。

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方版本的基于中继的推送

官方分发的 iOS 版本使用外部推送中继，而不是将原始 APNs
token 发布到网关。

默认情况下，官方/TestFlight 构建和网关使用位于 `https://ios-push-relay.openclaw.ai` 的托管中继。

自定义中继部署可以覆盖网关中继 URL：

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

- iOS 应用使用 App Attest 和 StoreKit 应用事务 JWS 向中继注册。
- 中继返回一个不透明的中继句柄以及一个注册范围的发送授权。
- iOS 应用获取配对的网关身份并将其包含在中继注册中，因此基于中继的注册被委托给该特定网关。
- 应用通过 `push.apns.register` 将该基于中继的注册转发给配对的网关。
- 网关使用该存储的中继句柄进行 `push.test`、后台唤醒和唤醒提示。
- 自定义网关中继 URL 必须与内置在官方/TestFlight iOS 构建中的中继 URL 匹配。
- 如果应用稍后连接到不同的网关或具有不同中继基本 URL 的构建，它会刷新中继注册，而不是重用旧的绑定。

网关在此路径下**不**需要的内容：

- 无需部署范围的中继令牌。
- 无需用于官方/TestFlight 基于中继发送的直接 APNs 密钥。

预期的操作员流程：

1. 安装官方/TestFlight iOS 构建。
2. 可选：仅在使用自定义中继部署时，在网关上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与网关配对，并让其完成连接。
4. 当应用拥有 APNs 令牌、操作员会话已连接且中继注册成功后，它会自动发布 `push.apns.register`。
5. 此后，`push.test`、重连唤醒和唤醒提示可以使用存储的基于中继的注册。

## 后台存活信标

当 iOS 因静默推送、后台刷新或重大位置事件而唤醒应用时，应用
会尝试进行短暂的节点重连，然后使用 `event: "node.presence.alive"``lastSeenAtMs` 调用 iOS`node.event`。
只有在已验证的节点设备身份确认后，Gateway 才会在配对的节点/设备元数据中
将其记录为 %%PH:INLINE_CODE:28:dc27fc4%%/`lastSeenReason`。

仅当 Gateway 响应包含 `handled: true` 时，应用才认为后台唤醒已成功记录。
较旧的 Gateway 可能会使用 `{ "ok": true }` 确认 `node.event`；该响应
虽然兼容，但不计入持久的“上次可见”更新。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍然可用作 Gateway 的临时环境变量覆盖。
- `OPENCLAW_PUSH_RELAY_BASE_URL`iOS 仍然可用作官方/TestFlight iOS 构建的临时环境变量覆盖。

## 身份验证和信任流程

中继的存在是为了强制执行直接在 Gateway 上使用 APNs 无法为
官方 iOS 构建提供的两个约束：

- 只有通过 Apple 分发的正版 OpenClaw iOS 构建才能使用托管中继。
- Gateway 只能为与该特定 Gateway 配对的 iOS 设备
  发送中继支持的推送。

逐跳（Hop by hop）：

1. `iOS app -> gateway`
   - 应用首先通过正常的 Gateway 身份验证流程与 Gateway 配对。
   - 这为应用提供了一个已验证的节点会话和一个已验证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 应用通过 HTTPS 调用中继注册端点。
   - 注册包括 App Attest 证明以及 StoreKit 应用事务 JWS。
   - 中继验证 Bundle ID、App Attest 证明和 Apple 分发证明，并要求
     使用官方/生产分发路径。
   - 这就是阻止本地 Xcode/dev 构建使用托管中继的原因。本地构建
     可能已签名，但不满足中继期望的官方 Apple 分发证明。

3. `gateway identity delegation`
   - 在中继注册之前，应用从 `gateway.identity.get` 获取已配对的网关身份。
   - 应用将该网关身份包含在中继注册载荷中。
   - 中继返回一个中继句柄和一个注册范围的发送授权，这些都被委托给了该网关身份。

4. `gateway -> relay`
   - 网关存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在 `push.test`、重连唤醒和唤醒提示时，网关使用其自己的设备身份对发送请求进行签名。
   - 中继会根据注册时委托的网关身份，验证存储的发送授权和网关签名两者。
   - 即使另一个网关以某种方式获得了句柄，它也不能重用该存储的注册信息。

5. `relay -> APNs`
   - 中继拥有正式版本的生产环境 APNs 凭证和原始 APNs 令牌。
   - 对于由中继支持的正式版本，网关从不存储原始 APNs 令牌。
   - 中继代表已配对的网关向 APNs 发送最终的推送。

创建此设计的原因：

- 为了将生产环境 APNs 凭证保留在用户网关之外。
- 为了避免在网关上存储原始的正式版本 APNs 令牌。
- 仅允许正式版/TestFlight 的 OpenClaw 版本使用托管的中继。
- 为了防止一个网关向属于不同网关拥有的 iOS 设备发送唤醒推送。

本地/手动构建版本仍保留使用直接 APNs。如果您在没有中继的情况下测试这些构建，网关仍然需要直接的 APNs 凭证：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

这些是网关主机运行时环境变量，而不是 Fastlane 设置。`apps/ios/fastlane/.env` 仅存储 App Store Connect / TestFlight 认证信息，如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`；它不配置本地 iOS 构建版本的直接 APNs 投递。

推荐的网关主机存储方式：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

不要提交 `.p8` 文件或将其放置在代码仓库检出目录下。

## 设备发现路径

### Bonjour (LAN)

iOS 应用在 `local.` 上浏览 `_openclaw-gw._tcp`，如果已配置，还会浏览同一广域 DNS-SD 发现域。同一 LAN 内的 iOS 会自动出现在 `local.` 中；跨网络发现可以使用已配置的广域域，而无需更改信标类型。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域；例如：`openclaw.internal.`）和 Tailscale 分离 DNS。有关 CoreDNS 示例，请参阅 [Bonjour](/zh/gateway/bonjour)。

### 手动主机/端口

在设置中，启用 **Manual Host** 并输入网关主机 + 端口（默认为 `18789`）。

## Canvas + A2UI

iOS 节点渲染一个 WKWebView 画布。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

说明：

- Gateway(网关) 画布主机提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway(网关) HTTP 服务器提供服务（与 `gateway.port` 端口相同，默认为 `18789`）。
- 当通告画布主机 URL 时，iOS 节点会在连接时自动导航到 A2UI。
- 使用 `canvas.navigate` 和 `{"url":""}` 返回内置脚手架。

## Computer Use 关系

iOS 应用是一个移动节点表面，而不是 Codex Computer Use 后端。Codex Computer Use 和 `cua-driver mcp` 通过 MCP 工具控制本地 macOS 桌面；iOS 应用通过 OpenClaw 节点命令（例如 `canvas.*`、`camera.*`、`screen.*`、`location.*` 和 `talk.*`）暴露 iPhone 功能。

代理仍然可以通过 OpenClaw 操作 iOSOpenClaw 应用，方法是调用节点命令，但这些调用通过网关节点协议进行，并遵循 iOS 前台/后台限制。请使用 [Codex Computer Use](/zh/plugins/codex-computer-use) 进行本地桌面控制，并参阅此页面了解 iOS 节点功能。

### Canvas 评估 / 快照

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + 对话模式

- 语音唤醒和对话模式可在“设置”中使用。
- 支持对话的 iOS 节点会通告 `talk` 功能，并且可以声明 `talk.ptt.start`、`talk.ptt.stop`、`talk.ptt.cancel` 和 `talk.ptt.once`；Gateway(网关) 默认允许受信任的支持对话节点使用这些按住即说命令。
- iOS 可能会暂停后台音频；当应用未激活时，请将语音功能视为尽力而为的服务。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：将 iOS 应用置于前台（画布/相机/屏幕命令需要此操作）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway(网关) 未通告 Canvas 插件表面 URL；请检查 [Gateway(网关) 配置](/zh/gateway/configuration) 中的 `plugins.entries.canvas.config.host`。
- 配对提示从未出现：运行 `openclaw devices list` 并手动批准。
- 重新安装后重连失败：钥匙串 配对令牌已被清除；请重新配对节点。

## 相关文档

- [配对](/zh/channels/pairing)
- [设备发现](/zh/gateway/discovery)
- [Bonjour](/zh/gateway/bonjour)
