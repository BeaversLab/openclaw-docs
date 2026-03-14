---
summary: "Bonjour/mDNS 发现 + 调试（Gateway 网关 信标、客户端和常见故障模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 发现"
---

# Bonjour / mDNS 发现

OpenClaw 使用 Bonjour (mDNS / DNS-SD) 作为一种**仅限局域网的便利手段**来发现
活动的 Gateway 网关（WebSocket 端点）。它是尽力而为的，并**不**替代 SSH 或
基于 Tailnet 的连接。

## 基于 Tailscale 的广域 Bonjour（单播 DNS-SD）

如果节点和网关位于不同的网络上，组播 mDNS 将无法跨越
边界。您可以通过切换到基于 Tailscale 的**单播 DNS-SD**
（“广域 Bonjour”）来保持相同的发现体验。

高级步骤：

1. 在网关主机上运行 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用区域下为 `_openclaw-gw._tcp` 发布 DNS‑SD 记录
   （例如：`openclaw.internal.`）。
3. 配置 Tailscale **split DNS**，以便您选择的域名通过该
   DNS 服务器为客户端（包括 iOS）解析。

OpenClaw 支持任何发现域；`openclaw.internal.` 只是一个示例。
iOS/Android 节点会同时浏览 `local.` 和您配置的广域域。

### Gateway 网关 配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### 一次性 DNS 服务器设置（网关主机）

```bash
openclaw dns setup --apply
```

这将安装 CoreDNS 并将其配置为：

- 仅在网关的 Tailscale 接口上监听端口 53
- 从 `~/.openclaw/dns/<domain>.db` 提供您选择的域（例如：`openclaw.internal.`）

从连接到 tailnet 的机器进行验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向网关 tailnet IP (UDP/TCP 53) 的名称服务器。
- 添加 split DNS，以便您的发现域名使用该名称服务器。

一旦客户端接受 tailnet DNS，iOS 节点即可在无需组播的情况下
浏览您的发现域中的 `_openclaw-gw._tcp`。

### Gateway 网关 监听器安全性（推荐）

Gateway 网关 WS 端口（默认为 `18789`）默认绑定到环回地址。对于局域网/tailnet
访问，请显式绑定并保持启用身份验证。

对于仅限 tailnet 的设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway 网关（或重启 macOS 菜单栏应用）。

## 什么进行广播

只有 Gateway 网关 会播发 `_openclaw-gw._tcp`。

## 服务类型

- `_openclaw-gw._tcp` — 网关传输信标（由 macOS/iOS/Android 节点使用）。

## TXT 密钥（非机密提示）

Gateway 网关 会广播一些非机密的小提示，以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway 网关 WS + HTTP)
- `gatewayTls=1` (仅当启用 TLS 时)
- `gatewayTlsSha256=<sha256>` (仅当启用 TLS 且指纹可用时)
- `canvasPort=<port>` (仅当启用 canvas 主机时；当前与 `gatewayPort` 相同)
- `sshPort=<port>` (未覆盖时默认为 22)
- `transport=gateway`
- `cliPath=<path>` (可选；指向可运行 `openclaw` 入口点的绝对路径)
- `tailnetDns=<magicdns>` (当 Tailnet 可用时的可选提示)

安全说明：

- Bonjour/mDNS TXT 记录是**未经身份验证的**。客户端不得将 TXT 视为权威路由。
- 客户端应使用解析出的服务端点（SRV + A/AAAA）进行路由。仅将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 视为提示信息。
- TLS 绑定绝不允许通过播发的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并在信任首次发现的指纹之前要求明确的用户确认。

## 在 macOS 上调试

有用的内置工具：

- 浏览实例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析一个实例（替换 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果浏览有效但解析失败，通常是遇到了局域网策略或
mDNS 解析器问题。

## 在 Gateway 网关 日志中调试

Gateway 网关 会写入一个滚动日志文件（启动时打印为
`gateway log file: ...`）。查找 `bonjour:` 行，特别是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 来发现 `_openclaw-gw._tcp`。

要捕获日志：

- 设置 → Gateway 网关 → 高级 → **发现调试日志**
- 设置 → Gateway 网关 (Gateway 网关) → 高级 → **发现日志** → 复现 → **复制**

日志包含浏览器状态转换和结果集变化。

## 常见故障模式

- **Bonjour 无法跨越网络**：请使用 Tailnet 或 SSH。
- **组播被阻止**：某些 Wi-Fi 网络会禁用 mDNS。
- **睡眠 / 接口变动**：macOS 可能会暂时丢失 mDNS 结果；请重试。
- **浏览有效但解析失败**：保持机器名称简单（避免表情符号或
 标点符号），然后重启 Gateway 网关。服务实例名称源自主机名，因此过于复杂的名称可能会迷惑某些解析器。

## 转义实例名称（`\032`）

Bonjour/DNS‑SD 经常将服务实例名称中的字节转义为十进制 `\DDD`
序列（例如空格变为 `\032`）。

- 这在协议级别是正常的。
- 用户界面应进行解码以供显示（iOS 使用 `BonjourEscapes.decode`）。

## 禁用 / 配置

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用播发（旧版：`OPENCLAW_DISABLE_BONJOUR`）。
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制 Gateway 网关 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中播发的 SSH 端口（旧版：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 在 TXT 中发布 MagicDNS 提示（旧版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 覆盖播发的 CLI 路径（旧版：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略和传输选择：[设备发现](/zh/en/gateway/discovery)
- 节点配对 + 批准：[Gateway 网关 pairing](/zh/en/gateway/pairing)

import zh from '/components/footer/zh.mdx';

<zh />
