---
summary: "Bonjour/mDNS 发现与调试（Gateway 信标、客户端与常见故障）"
read_when:
  - 排查 macOS/iOS 上的 Bonjour 发现问题
  - 修改 mDNS 服务类型、TXT 记录或发现 UX
title: "Bonjour 发现"
---

# Bonjour / mDNS 发现

OpenClaw 使用 Bonjour（mDNS / DNS‑SD）作为**局域网内的便捷发现**，用于发现活跃 Gateway（WebSocket 端点）。这是 best‑effort，**不能**替代 SSH 或 Tailnet 连接。

## 通过 Tailscale 的广域 Bonjour（Unicast DNS‑SD）

若 node 与 gateway 不在同一网络，多播 mDNS 无法跨网段。你可以通过 Tailscale 上的 **单播 DNS‑SD**（“Wide‑Area Bonjour”）保持相同的发现体验。

高层步骤：

1. 在 gateway 主机上运行 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用 zone 下发布 `_openclaw-gw._tcp` 的 DNS‑SD 记录（例：`openclaw.internal.`）。
3. 配置 Tailscale **split DNS**，让客户端（含 iOS）通过该 DNS 服务器解析该域名。

OpenClaw 支持任意发现域；`openclaw.internal.` 只是示例。
iOS/Android nodes 会同时浏览 `local.` 与你配置的广域域名。

### Gateway 配置（推荐）

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### 一次性 DNS 服务器设置（gateway 主机）

```bash
openclaw dns setup --apply
```

这会安装 CoreDNS 并配置为：

- 仅在 gateway 的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 提供所选域名（例：`openclaw.internal.`）

在 tailnet 连接的机器上验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台：

- 添加一个指向 gateway tailnet IP 的 nameserver（UDP/TCP 53）。
- 添加 split DNS，让你的发现域名使用该 nameserver。

客户端接受 tailnet DNS 后，iOS nodes 即可在你的发现域中浏览 `_openclaw-gw._tcp`，无需多播。

### Gateway 监听安全（推荐）

Gateway WS 端口（默认 `18789`）默认只绑定到 loopback。若需 LAN/tailnet 访问，请显式绑定并保持 auth 启用。

对仅 tailnet 的部署：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway（或重启 macOS 菜单栏 app）。

## 广播内容

只有 Gateway 会广播 `_openclaw-gw._tcp`。

## 服务类型

- `_openclaw-gw._tcp` — gateway 传输信标（macOS/iOS/Android nodes 使用）。

## TXT 键（非机密提示）

Gateway 会广播少量非机密提示以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>`（Gateway WS + HTTP）
- `gatewayTls=1`（仅在启用 TLS 时）
- `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
- `canvasPort=<port>`（仅在启用 canvas host 时；默认 `18793`）
- `sshPort=<port>`（未覆盖时默认 22）
- `transport=gateway`
- `cliPath=<path>`（可选；可运行 `openclaw` 入口的绝对路径）
- `tailnetDns=<magicdns>`（可选；Tailnet 可用时的提示）

## macOS 调试

内置工具：

- 浏览实例：
  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```
- 解析单个实例（替换 `<instance>`）：
  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

若浏览正常但解析失败，通常是 LAN 策略或 mDNS 解析器问题。

## Gateway 日志调试

Gateway 写入滚动日志文件（启动时打印 `gateway log file: ...`）。请关注 `bonjour:` 行，尤其是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## iOS node 调试

iOS node 使用 `NWBrowser` 发现 `_openclaw-gw._tcp`。

采集日志：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → 复现 → **Copy**

日志包含浏览器状态变化与结果集变化。

## 常见故障

- **Bonjour 不跨网络**：使用 Tailnet 或 SSH。
- **多播被阻断**：部分 Wi‑Fi 网络禁用 mDNS。
- **睡眠 / 接口抖动**：macOS 可能暂时丢失 mDNS 结果；重试。
- **浏览可用但解析失败**：保持机器名简洁（避免 emoji 或标点），然后重启 Gateway。服务实例名来自主机名，过于复杂的名称会让某些解析器困惑。

## 转义实例名（`\032`）

Bonjour/DNS‑SD 常将服务实例名中的字节转义为十进制 `\DDD` 序列（如空格变 `\032`）。

- 这是协议层的正常行为。
- UI 应进行解码后显示（iOS 使用 `BonjourEscapes.decode`）。

## 禁用 / 配置

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广播（旧：`OPENCLAW_DISABLE_BONJOUR`）。
- `gateway.bind`（`~/.openclaw/openclaw.json`）控制 Gateway 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（旧：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 在 TXT 中发布 MagicDNS 提示（旧：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径（旧：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略与传输选择：[Discovery](/zh/gateway/discovery)
- Node 配对 + 审批：[Gateway pairing](/zh/gateway/pairing)
