---
summary: "Bonjour/mDNS 设备发现 + 调试（Gateway 信标、客户端和常见故障模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 设备发现"
---

# Bonjour / mDNS 发现

OpenClaw 使用 Bonjour (mDNS / DNS‑SD) 来发现活动的 Gateway(网关)（WebSocket 端点）。
组播 `local.` 浏览仅是一种 **局域网便利功能**。内置的 `bonjour`
插件负责局域网广播，默认已启用。为了进行跨网络设备发现，
相同的信标也可以通过配置的广域 DNS-SD 域进行发布。
设备发现仍然是尽力而为的，并**不**取代基于 SSH 或 Tailnet 的连接。

## 通过 Bonjour 的广域 Tailscale (单播 DNS-SD)

如果节点和网关位于不同的网络上，组播 mDNS 将无法跨越
边界。您可以通过切换到基于 Tailscale 的**单播 DNS-SD**
（“广域 Bonjour”）来保持相同的发现体验。

高级步骤：

1. 在网关主机上运行 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用区域下发布 `_openclaw-gw._tcp` 的 DNS‑SD 记录
   （例如：`openclaw.internal.`）。
3. 配置 Tailscale **分流 DNS**，以便为您选择的域通过该
   DNS 服务器进行解析（适用于包括 iOS 在内的客户端）。

OpenClaw 支持任何设备发现域；`openclaw.internal.` 只是一个示例。
iOS/Android 节点会同时浏览 `local.` 和您配置的广域域。

### Gateway(网关) 配置（推荐）

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

- 仅在网关的 Tailscale 接口上监听 53 端口
- 从 `~/.openclaw/dns/<domain>.db` 提供您选择的域（例如：`openclaw.internal.`）

从连接了 tailnet 的机器进行验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向 gateway 的 tailnet IP (UDP/TCP 53) 的域名服务器。
- 添加 split DNS，以便您的发现域使用该域名服务器。

一旦客户端接受了 tailnet DNS，iOS 节点和 CLI 设备发现即可
在无需组播的情况下浏览您设备发现域中的 `_openclaw-gw._tcp`。

### Gateway(网关) listener security (recommended)

Gateway(网关) WS 端口（默认 `18789`）默认绑定到环回地址。为了实现局域网/tailnet
访问，请显式绑定并保持启用身份验证。

对于仅 tailnet 的设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway(网关)（或重启 macOS 菜单栏应用程序）。

## 发布广播内容

只有 Gateway(网关) 会广播 `_openclaw-gw._tcp`。局域网组播广播由
内置的 `bonjour` 插件提供；广域 DNS-SD 发布仍归
Gateway(网关) 所有。

## 服务类型

- `_openclaw-gw._tcp` — gateway 传输信标（由 macOS/iOS/Android 节点使用）。

## TXT 键（非机密提示）

Gateway(网关) 会发布一些非机密的小提示，以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` （Gateway(网关) WS + HTTP）
- `gatewayTls=1` （仅在启用 TLS 时）
- `gatewayTlsSha256=<sha256>` （仅在启用 TLS 且可用指纹时）
- `canvasPort=<port>` （仅在启用画布主机时；目前与 `gatewayPort` 相同）
- `transport=gateway`
- `tailnetDns=<magicdns>`（仅限 mDNS 完整模式，当 Tailnet 可用时的可选提示）
- `sshPort=<port>`（仅限 mDNS 完整模式；广域 DNS-SD 可能会省略它）
- `cliPath=<path>`（仅限 mDNS 完整模式；广域 DNS-SD 仍将其写入作为远程安装提示）

安全说明：

- Bonjour/mDNS TXT 记录是**未经验证的**。客户端不得将 TXT 视为权威路由。
- 客户端应使用解析到的服务端点（SRV + A/AAAA）进行路由。请仅将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 视为提示。
- SSH 自动定位同样应使用解析的服务主机，而不是仅基于 TXT 的提示。
- TLS 固定必须绝不允许广告中的 `gatewayTlsSha256` 覆盖先前存储的固定。
- iOS/Android 节点应将基于设备发现的直接连接视为 **仅 TLS**，并在信任首次指纹时要求明确的用户确认。

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

如果浏览正常但解析失败，通常是因为遇到了 LAN 策略或
mDNS 解析器问题。

## 在 Gateway(网关) 日志中调试

Gateway(网关) 会写入一个滚动日志文件（启动时打印为
`gateway log file: ...`）。查找 `bonjour:` 行，尤其是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

当广告的 `.local` 主机名是有效的 DNS 标签时，Bonjour 会使用系统主机名作为其广告名。如果系统主机名包含空格、下划线或其他
无效的 DNS 标签字符，OpenClaw 将回退到 `openclaw.local`。当您需要
明确的主机标签时，请在启动 Gateway(网关) 之前设置
`OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 来发现 `_openclaw-gw._tcp`。

要捕获日志：

- 设置 → Gateway(网关) → 高级 → **设备发现调试日志**
- 设置 → Gateway(网关) → 高级 → **设备发现日志** → 复现问题 → **复制**

该日志包含浏览器状态转换和结果集变化。

## 何时禁用 Bonjour

仅在 LAN 组播广告不可用或有害时才禁用 Bonjour。
常见的情况是 Gateway(网关) 运行在 Docker 桥接网络、WSL 或
丢弃 mDNS 组播的网络策略之后。在这些环境中，该 Gateway(网关)
仍可通过其发布的 URL、SSH、Tailnet 或广域 DNS-SD 访问，
但 LAN 自动发现不可靠。

当问题属于部署范围时，请优先使用现有的环境覆盖：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

这会在不更改插件配置的情况下禁用 LAN 组播通告。对于 Docker 镜像、服务文件、启动脚本和一次性调试来说，这是安全的，因为当环境不存在时，该设置也会消失。

仅当您有意为该 OpenClaw 配置关闭内置 LAN 发现插件时，才使用插件配置：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事项

当 `OPENCLAW_DISABLE_BONJOUR` 未设置时，内置的 Bonjour 插件会在检测到的容器中自动禁用 LAN 组播通告。Docker 网桥网络通常不在容器和 LAN 之间转发 mDNS 组播 (`224.0.0.251:5353`)，因此从容器发出的通告很少能实现发现。

重要注意事项：

- 禁用 Bonjour 不会停止 Gateway。它只是停止 LAN 组播通告。
- 禁用 Bonjour 不会更改 `gateway.bind`；Docker 默认仍为 `OPENCLAW_GATEWAY_BIND=lan`，以便发布的主机端口可以正常工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当 Gateway 和节点不在同一 LAN 上时，请使用广域发现或 Tailnet。
- 在 Docker 之外重复使用相同的 `OPENCLAW_CONFIG_DIR` 不会保留容器自动禁用策略。
- 仅为主机网络、macvlan 或已知 mDNS 组播可以通过的其他网络设置 `OPENCLAW_DISABLE_BONJOUR=0`；将其设置为 `1` 以强制禁用。

## 排查 Bonjour 已禁用问题

如果在 Docker 设置后节点不再自动发现 Gateway：

1. 确认 Gateway 是在自动、强制开启还是强制关闭模式下运行：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 确认 Gateway 本身可通过发布端口访问：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 当 Bonjour 被禁用时，请使用直接目标：
   - 控制 UI 或本地工具：`http://127.0.0.1:18789`
   - LAN 客户端：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道或广域 DNS-SD

4. 如果您在 Docker 中通过 `OPENCLAW_DISABLE_BONJOUR=0` 有意启用了 Bonjour，请从主机测试组播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览结果为空，或者 Gateway 日志显示重复的 ciao 看门狗取消，请恢复 `OPENCLAW_DISABLE_BONJOUR=1` 并使用直接路由或 Tailnet 路由。

## 常见故障模式

- **Bonjour 无法跨网络**：请使用 Tailnet 或 SSH。
- **组播被阻止**：某些 Wi‑Fi 网络会禁用 mDNS。
- **发布程序卡在探测/通告中**：主机组播被阻止、容器网桥、WSL 或接口频繁变动可能导致 ciao 发布程序处于未通告状态。OpenClaw 会重试几次，然后为当前的 Bonjour 进程禁用 Gateway(网关)，而不是无限重启发布程序。
- **Docker 网桥网络**：在检测到的容器中，Bonjour 会自动禁用。请仅对 host、macvlan 或其他支持 mDNS 的网络设置 `OPENCLAW_DISABLE_BONJOUR=0`。
- **休眠 / 接口频繁变动**：macOS 可能会暂时丢弃 mDNS 结果；请重试。
- **浏览正常但解析失败**：保持计算机名称简单（避免表情符号或标点符号），然后重启 Gateway(网关)。服务实例名称源自主机名，因此过于复杂的名称可能会混淆某些解析程序。

## 转义实例名称 (`\032`)

Bonjour/DNS‑SD 通常会将服务实例名称中的字节转义为十进制 `\DDD` 序列（例如，空格变为 `\032`）。

- 这在协议级别是正常的。
- UI 应进行解码以供显示（iOS 使用 `BonjourEscapes.decode`）。

## 禁用 / 配置

- `openclaw plugins disable bonjour` 通过禁用内置插件来禁用 LAN 组播通告。
- `openclaw plugins enable bonjour` 恢复默认的 LAN 发现插件。
- `OPENCLAW_DISABLE_BONJOUR=1` 禁用 LAN 组播通告而不更改插件配置；可接受的真值为 `1`、`true`、`yes` 和 `on`（旧版：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 强制开启 LAN 组播通告，包括在检测到的容器内部；可接受的假值为 `0`、`false`、`no` 和 `off`。
- 当未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在正常主机上进行通告，并在检测到的容器内自动禁用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制着 Gateway(网关) 绑定模式。
- 当通告 `sshPort` 时，`OPENCLAW_SSH_PORT` 会覆盖 SSH 端口（旧版：`OPENCLAW_SSH_PORT`）。
- 当启用 mDNS 完整模式时，`OPENCLAW_TAILNET_DNS` 会在 TXT 中发布 MagicDNS 提示（旧版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 覆盖通告的 CLI 路径（旧版：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 发现策略和传输选择：[设备发现](/zh/gateway/discovery)
- 节点配对 + 审批：[Gateway(网关) pairing](/zh/gateway/pairing)
