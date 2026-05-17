---
summary: "BonjourGateway(网关)Bonjour/mDNS 设备发现 + 调试（Gateway(网关) 信标、客户端和常见故障模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "BonjourBonjour 设备发现"
---

OpenClaw 可以使用 Bonjour (mDNS / DNS-SD) 来发现活动的 Gateway(网关)（WebSocket 端点）。
多播 OpenClawBonjourGateway(网关)`local.` 浏览是一种**仅限局域网的便利功能**。捆绑的 `bonjour`macOSLinuxWindowsGateway(网关)
插件负责局域网广播。它在 macOS 主机上自动启动，在
Linux、Windows 和容器化 Gateway(网关) 部署中是可选加入的。对于跨网络设备发现，同样的
信标也可以通过配置的广域 DNS-SD 域发布。设备发现
仍然是尽力而为的，并**不**取代基于 SSH 或 Tailnet 的连接。

## 基于 Tailscale 的广域 Bonjour（单播 DNS-SD）

如果节点和网关位于不同的网络，多播 mDNS 将无法跨越
边界。您可以通过切换到**单播 DNS-SD**（"广域 Bonjour"）来保持
相同的设备发现体验，该功能通过 Tailscale 实现。

高级步骤：

1. 在网关主机上运行 DNS 服务器（可通过 Tailnet 访问）。
2. 在专用区域下为 `_openclaw-gw._tcp` 发布 DNS-SD 记录
   （例如：`openclaw.internal.`）。
3. 配置 Tailscale **Split DNS**，以便您选择的域通过该
   DNS 服务器为客户端（包括 iOS）解析。

OpenClaw 支持任何设备发现域；OpenClaw`openclaw.internal.`iOSAndroid 仅仅是一个示例。
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
- 从 `~/.openclaw/dns/<domain>.db` 为您选择的域（例如：`openclaw.internal.`）提供服务

从连接到 tailnet 的机器进行验证：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 设置

在 Tailscale 管理控制台中：

- 添加一个指向 Gateway tailnet IP（UDP/TCP 53）的域名服务器。
- 添加拆分 DNS (Split DNS)，以便您的发现域使用该域名服务器。

一旦客户端接受 tailnet DNS，iOS 节点和 CLI 发现功能便可在您的发现域中浏览 `_openclaw-gw._tcp`，而无需组播。

### Gateway(网关) 监听器安全（推荐）

Gateway(网关) WS 端口（默认为 `18789`）默认绑定到环回地址。若要通过 LAN/tailnet 访问，请显式绑定并保持启用身份验证。

对于仅 tailnet 的设置：

- 在 `~/.openclaw/openclaw.json` 中设置 `gateway.bind: "tailnet"`。
- 重启 Gateway(网关)（或重启 macOS 菜单栏应用）。

## 发布广播的服务

只有 Gateway(网关) 会广播 `_openclaw-gw._tcp`。当启用插件时，LAN 组播广播由捆绑的 `bonjour` 插件提供；广域网 DNS-SD 发布仍归 Gateway(网关) 所有。

## 服务类型

- `_openclaw-gw._tcp` - Gateway 传输信标（由 macOS/iOS/Android 节点使用）。

## TXT 键（非机密提示）

Gateway(网关) 会发布一些小的非机密提示以简化 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway(网关) WS + HTTP)
- `gatewayTls=1`（仅当启用 TLS 时）
- `gatewayTlsSha256=<sha256>`（仅当启用 TLS 且可用指纹时）
- `canvasPort=<port>`（仅当启用 canvas 主机时；目前与 `gatewayPort` 相同）
- `transport=gateway`
- `tailnetDns=<magicdns>`（仅限 mDNS 完整模式，当 Tailnet 可用时的可选提示）
- `sshPort=<port>`（仅限 mDNS 完整模式；广域 DNS-SD 可能会省略它）
- `cliPath=<path>`（仅限 mDNS 完整模式；广域 DNS-SD 仍会将其作为远程安装提示写入）

安全说明：

- Bonjour/mDNS TXT 记录是**未经验证的**。客户端不得将 TXT 视为权威路由。
- 客户端应使用解析出的服务端点（SRV + A/AAAA）进行路由。将 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 仅视为提示。
- SSH 自动定位同样应使用解析出的服务主机，而不是仅基于 TXT 的提示。
- TLS 固定（pinning）绝不允许通过广播的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并在信任首次指纹时要求明确的用户确认。

## 在 macOS 上调试

有用的内置工具：

- 浏览实例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析单个实例（替换 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果浏览正常但解析失败，通常是因为遇到了局域网策略或 mDNS 解析器问题。

## 在 Gateway 日志中调试

Gateway 会写入一个滚动日志文件（启动时打印为 Gateway(网关)`gateway log file: ...`）。查找 `bonjour:` 行，特别是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

看门狗将活动的 `probing`、`announcing` 和新的冲突重命名视为
进行中状态。如果服务从未达到 `announced`，OpenClaw 最终
会重新创建广告器，并在重复失败后，禁用该 Bonjour 进程的 Gateway(网关)，而不是永远重新广告。

当系统主机名是有效的 DNS 标签时，Bonjour 会使用系统主机名作为广告的 `.local` 主机名。
如果系统主机名包含空格、下划线或其他无效的 DNS 标签字符，OpenClaw 将回退到 `openclaw.local`。
当您需要显式的主机标签时，请在启动 Gateway(网关) 之前设置 `OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 节点上调试

iOS 节点使用 `NWBrowser` 来发现 `_openclaw-gw._tcp`。

要捕获日志：

- 设置 → Gateway(网关) → 高级 → **设备发现调试日志**
- 设置 → Gateway(网关) → 高级 → **设备发现日志** → 复现问题 → **复制**

该日志包含浏览器状态转换和结果集变更。

## 何时启用 Bonjour

在 Bonjour 主机上，对于配置为空的 Gateway(网关) 启动，macOS 会自动启动，因为本地应用程序和附近的 iOS/Android 节点通常依赖同一局域网内的设备发现。

当同一局域网自动发现在 Bonjour、
Linux 或其他非 Windows 主机上很有用时，请显式启用 macOS：

```bash
openclaw plugins enable bonjour
```

启用后，Bonjour 使用 `discovery.mdns.mode` 来决定发布多少 TXT 元数据。
默认模式为 `minimal`；仅当本地客户端需要
`cliPath` 或 `sshPort` 提示时才使用 `full`，并使用 `off` 在不更改插件启用状态的情况下抑制 LAN 组播。

## 何时禁用 Bonjour

当局域网多播通告不必要、不可用或有害时，请保持 Bonjour 禁用。常见情况包括非 macOS 服务器、Docker 桥接网络、WSL，或丢弃 mDNS 多播的网络策略。在这些环境中，Gateway(网关) 仍可通过其发布的 URL、SSH、Tailnet 或广域 DNS-SD 访问，但局域网自动发现不可靠。

当问题与部署范围相关时，首选现有的环境覆盖：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

这会禁用局域网多播通告而无需更改插件配置。这对于 Docker 镜像、服务文件、启动脚本和一次性调试是安全的，因为当环境不存在时，该设置也会消失。

当您有意为该 OpenClaw 配置关闭内置 LAN 发现插件时，请使用插件配置：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事项

当未设置 `OPENCLAW_DISABLE_BONJOUR` 时，内置的 Bonjour 插件会在检测到的容器中自动禁用 LAN 组播广告。Docker 桥接网络通常不在容器和 LAN 之间转发 mDNS 组播 (`224.0.0.251:5353`)，因此从容器发出的广告很少能实现发现功能。

重要注意事项：

- Bonjour 在 BonjourmacOS 主机上自动启动，在其他地方则需选择加入。保持禁用状态不会停止 Gateway(网关)；它只是跳过 LAN 组播广告。
- 禁用 Bonjour 不会改变 `gateway.bind`；Docker 仍然默认为
  `OPENCLAW_GATEWAY_BIND=lan`，以便发布的主机端口可以正常工作。
- 禁用 Bonjour 不会禁用广域 DNS-SD。当 Gateway(网关) 和节点不在同一局域网时，请使用广域发现
  或 Tailnet。
- 在 Docker 外部重用相同的 `OPENCLAW_CONFIG_DIR` 不会保留
  容器自动禁用策略。
- 仅当使用主机网络、macvlan 或其他已知可以传递 mDNS 多播的网络时，才设置 `OPENCLAW_DISABLE_BONJOUR=0`；将其设置为 `1` 以强制禁用。

## 排查已禁用的 Bonjour 问题

如果在 Gateway(网关) 设置后节点不再自动发现 Docker：

1. 确认 Gateway(网关) 是在自动、强制开启还是强制关闭模式下运行：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 确认 Gateway(网关) 本身可通过发布端口访问：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 当 Bonjour 被禁用时使用直接目标：
   - 控制 UI 或本地工具：`http://127.0.0.1:18789`
   - 局域网客户端：`http://<gateway-host>:18789`
   - 跨网络客户端：Tailnet MagicDNS、Tailnet IP、SSH 隧道或
     广域 DNS-SD

4. 如果您在 Docker 中故意启用了 Bonjour 插件并通过 BonjourDocker`OPENCLAW_DISABLE_BONJOUR=0` 强制通告，
   请从主机测试多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果浏览列表为空，或 Gateway(网关) 日志显示反复的 ciao 看门狗
   取消操作，请还原 Gateway(网关)`OPENCLAW_DISABLE_BONJOUR=1` 并使用直连或
   Tailnet 路由。

## 常见故障模式

- **Bonjour 无法跨越网络**：请使用 Tailnet 或 SSH。
- **组播受阻**：某些 Wi-Fi 网络会禁用 mDNS。
- **Advertiser stuck in probing/announcing**: hosts with blocked multicast,
  container bridges, WSL, or interface churn can leave the ciao advertiser in a
  non-announced state. OpenClaw retries a few times and then disables Bonjour
  for the current Gateway(网关) process instead of restarting the advertiser forever.
- **Docker 网桥网络**：在检测到的容器中，Bonjour 会自动禁用。
  仅针对 host、macvlan 或另一个支持 mDNS 的网络设置 `OPENCLAW_DISABLE_BONJOUR=0`。
- **休眠 / 接口变动**：macOS 可能会暂时丢失 mDNS 结果；请重试。
- **浏览有效但解析失败**：保持计算机名称简单（避免表情符号或标点符号），然后重启 Gateway(网关)。服务实例名称源自主机名，因此过于复杂的名称可能会混淆某些解析程序。

## 转义的实例名称（`\032`）

Bonjour/DNS-SD 通常会将服务实例名称中的字节转义为十进制 Bonjour`\DDD` 序列（例如空格变为 `\032`）。

- 这在协议级别是正常的。
- UI 应进行解码以供显示（iOS 使用 iOS`BonjourEscapes.decode`）。

## 启用 / 禁用 / 配置

- macOS 主机默认自动启动捆绑的局域网发现插件。
- `openclaw plugins enable bonjour` 在未默认启用该插件的主机上启用捆绑的局域网发现插件。
- `openclaw plugins disable bonjour` 通过禁用捆绑插件来禁用局域网多播通告。
- `OPENCLAW_DISABLE_BONJOUR=1` 禁用 LAN 组播通告而不更改插件配置；接受的真值为 `1`、`true`、`yes` 和 `on`（旧版：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 强制开启局域网多播广告，包括在检测到的容器内；可接受的假值为 `0`、`false`、`no` 和 `off`。
- 当启用 Bonjour 插件且未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上进行通告，并在检测到的容器内自动禁用。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway(网关) 绑定模式。
- 当播发 `sshPort` 时，`OPENCLAW_SSH_PORT` 会覆盖 SSH 端口（旧版：`OPENCLAW_SSH_PORT`）。
- 当启用 mDNS 完整模式时，`OPENCLAW_TAILNET_DNS` 会在 TXT 记录中发布 MagicDNS 提示（旧版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH`CLI 会覆盖播发的 CLI 路径（旧版：`OPENCLAW_CLI_PATH`）。

## 相关文档

- 设备发现策略与传输选择：[设备发现](/zh/gateway/discovery)
- 节点配对与审批：[Gateway(网关) 配对](<Gateway(网关)/en/gateway/pairing>)
