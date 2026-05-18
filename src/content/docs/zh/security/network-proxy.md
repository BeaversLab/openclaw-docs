---
summary: "OpenClaw如何通过运营者管理的过滤代理路由 OpenClaw 运行时 HTTP 和 WebSocket 流量"
title: "网络代理"
read_when:
  - You want defense-in-depth against SSRF and DNS rebinding attacks
  - Configuring an external forward proxy for OpenClaw runtime traffic
---

OpenClaw 可以通过操作员管理的正向代理来路由运行时 HTTP 和 WebSocket 流量。这属于可选的深度防御，适用于希望集中控制出口流量、增强 SSRF 防护并提高网络可审计性的部署。

OpenClaw 不提供、下载、启动、配置或认证任何代理。您需要运行适合自身环境的代理技术，而 OpenClaw 会将普通的进程本地 HTTP 和 WebSocket 客户端路由通过该代理。

## 为何使用代理

代理为操作员提供了一个用于出站 HTTP 和 WebSocket 流量的单一网络控制点。即使在 SSRF 加固之外，这也非常有用：

- 集中策略：维护一个出口策略，而不是依赖每个应用程序 HTTP 调用点来正确执行网络规则。
- 连接时检查：在 DNS 解析之后、代理打开上游连接之前立即评估目标。
- DNS 重绑定防御：缩短应用程序级 DNS 检查与实际出站连接之间的差距。
- 更广泛的 JavaScript 覆盖范围：通过同一路由普通的 `fetch`、`node:http`、`node:https`、WebSocket、axios、got、node-fetch 及类似客户端。
- 可审计性：在出口边界记录允许和拒绝的目标。
- 运营控制：执行目标规则、网络分段、速率限制或出站允许列表，而无需重新构建 OpenClaw。

代理路由是针对普通 HTTP 和 WebSocket 出站流量的进程级防护。它为操作员提供了一条故障关闭路径，用于将支持的 JavaScript HTTP 客户端通过其自身的过滤代理进行路由，但它不是操作系统级的网络沙盒，也不代表 OpenClaw 认证了代理的目标策略。

## OpenClaw 如何路由流量

当配置了 `proxy.enabled=true` 和代理 URL 时，受保护的运行时进程（如 `openclaw gateway run`、`openclaw node run` 和 `openclaw agent --local`）会将正常的 HTTP 和 WebSocket 出站流量通过配置的代理进行路由：

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

公共约定是路由行为，而不是用于实现它的内部 Node 钩子。当 Gateway URL 使用 OpenClawGateway(网关)Gateway(网关)RPCGateway(网关)`localhost` 或字面回环 IP（如 `127.0.0.1` 或 `[::1]`）时，OpenClaw Gateway(网关) 控制平面 WebSocket 客户端会使用一条狭窄的直接路径来处理 local loopback Gateway(网关) RPC 流量。即使当运营者代理阻止了回环目标，该控制平面路径也必须能够到达回环 Gateway(网关)。正常的运行时 HTTP 和 WebSocket 请求仍使用配置的代理。

在内部，OpenClaw 安装 Proxyline 作为此功能的进程级路由运行时。Proxyline 覆盖 OpenClaw`fetch`、由 undici 支持的客户端、Node 核心 `node:http` / `node:https` 调用者、常见 WebSocket 客户端以及辅助程序创建的 CONNECT 隧道。托管代理模式会替换调用方提供的 Node HTTP 代理，以便显式代理不会意外绕过运营者代理。

某些插件拥有自定义传输层，即使存在进程级路由，也需要显式配置代理。例如，Telegram 的 Bot API 传输使用其自身的 HTTP/1 undici 调度器，因此在该特定所有者的传输路径中，既遵守进程代理环境变量，也遵守托管 TelegramAPI`OPENCLAW_PROXY_URL` 的后备设置。

代理 URL 本身可以使用 `http://` 或 `https://`OpenClaw。这些方案描述了从 OpenClaw 到代理端点的连接：

- `http://proxy.example:3128`OpenClaw：OpenClaw 打开到前向代理的纯 TCP 连接并发送 HTTP 代理请求，包括针对 HTTPS 目标的 `CONNECT`。
- `https://proxy.example:8443`OpenClaw：OpenClaw 打开到代理端点的 TLS，验证代理证书，然后在该 TLS 会话内发送 HTTP 代理请求。

目标 HTTPS 与代理端点 TLS 是分开的。对于 HTTPS 目标，OpenClaw 仍然请求代理建立 HTTP OpenClaw`CONNECT` 隧道，然后通过该隧道启动目标 TLS。

当代理处于活动状态时，OpenClaw 会清除 OpenClaw`no_proxy` 和 `NO_PROXY`。这些绕过列表是基于目标的，因此保留 `localhost` 或 `127.0.0.1` 将导致高风险的 SSRF 目标跳过过滤代理。

关闭时，OpenClaw 会恢复以前的代理环境并重置缓存的进程路由状态。

## 相关代理术语

- `proxy.enabled` / `proxy.proxyUrl`OpenClaw：OpenClaw 运行时出口的出站前向代理路由。本页记录了该功能。
- `gateway.auth.mode: "trusted-proxy"`Gateway(网关)：用于 Gateway(网关) 访问的入站身份感知反向代理认证。请参阅[受信任的代理认证](/zh/gateway/trusted-proxy-auth)。
- `openclaw proxy`：用于开发和支持的本地调试代理和捕获检查器。请参阅 [openclaw proxy](/zh/cli/proxy)。
- `tools.web.fetch.useTrustedEnvProxy`：选择启用 `web_fetch`，以便让操作员控制的 HTTP(S) 环境代理解析 DNS，同时保留默认的严格 DNS 固定和主机名策略。请参阅 [Web fetch](/zh/tools/web-fetch#trusted-env-proxy)。
- 特定于通道或提供商的代理设置：特定传输的所有者特定覆盖。当目标是在整个运行时中进行集中出口控制时，请优先使用托管网络代理。

## 配置

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

对于具有私有代理 CA 的 HTTPS 代理端点：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

您也可以通过环境提供 URL，同时在配置中保留 `proxy.enabled=true`：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 优先于 `OPENCLAW_PROXY_URL`。

### Gateway(网关) 环回模式

本地 Gateway(网关) 控制平面客户端通常连接到环回 WebSocket，例如 Gateway(网关)`ws://127.0.0.1:18789`。当托管代理处于活动状态时，请使用 `proxy.loopbackMode` 来选择该流量的行为方式：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only`OpenClawGateway(网关)Gateway(网关)Gateway(网关)Gateway(网关)（默认）：OpenClaw 在 Proxyline 的托管绕过策略中注册 Gateway(网关) 环回权限，以便本地 Gateway(网关) WebSocket 流量可以直接连接。自定义环回 Gateway(网关) 端口之所以有效，是因为活动 Gateway(网关) URL 的主机和端口已注册。
- `proxy`OpenClawGateway(网关)Gateway(网关)OpenClaw：OpenClaw 不注册 Gateway(网关) 环回绕过，因此本地 Gateway(网关) 流量通过托管代理发送。如果代理是远程的，它必须为 OpenClaw 主机的环回服务提供特殊路由，例如将其映射到代理可访问的主机名、IP 或隧道。标准远程代理从代理主机而不是从 OpenClaw 主机解析 `127.0.0.1` 和 `localhost`OpenClaw。
- `block`OpenClawGateway(网关)：OpenClaw 在打开套接字之前拒绝环回 Gateway(网关) 控制平面连接。

如果设置了 `enabled=true` 但未配置有效的代理 URL，受保护的命令将在启动时失败，而不是回退到直接网络访问。

对于使用 `openclaw gateway start` 启动的托管网关服务，建议将 URL 存储在配置中：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

环境变量回退最适合前台运行。如果将其与已安装的服务一起使用，请将 `OPENCLAW_PROXY_URL` 放入服务的持久化环境中，例如 `$OPENCLAW_STATE_DIR/.env` 或 `~/.openclaw/.env`，然后重新安装该服务，以便 launchd、systemd 或计划任务使用该值启动网关。

对于 `openclaw --container ...`OpenClaw 命令，OpenClaw 会在设置时将 `OPENCLAW_PROXY_URL`CLI 转发到针对容器的子 CLI 中。该 URL 必须可从容器内部访问；`127.0.0.1`OpenClaw 指的是容器本身，而不是主机。除非您显式覆盖该安全检查，否则 OpenClaw 将拒绝针对容器命令的环回代理 URL。

## 代理要求

代理策略即安全边界。OpenClaw 无法验证代理是否阻止了正确的目标。

将代理配置为：

- 仅绑定到环回或私有可信接口。
- 限制访问，以便只有 OpenClaw 进程、主机、容器或服务账户可以使用它。
- 自行解析目标地址，并在 DNS 解析后阻止目标 IP。
- 在连接时对普通 HTTP 请求和 HTTPS `CONNECT` 隧道应用策略。
- 拒绝基于目标的绕过请求，针对环回、私有、链路本地、元数据、多播、保留或文档范围。
- 除非您完全信任 DNS 解析路径，否则避免使用主机名允许列表。
- 记录目标、决策、状态和原因，而不记录请求正文、授权标头、cookie 或其他机密信息。
- 将代理策略置于版本控制之下，并像审查敏感的安全配置一样审查更改。

## 建议阻止的目标

将此拒绝列表作为任何正向代理、防火墙或出口策略的起点。

OpenClaw 应用级分类器逻辑位于 OpenClaw`src/infra/net/ssrf.ts` 和 `src/shared/net/ip.ts` 中。相关的奇偶校验钩子包括 `BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、`RFC2544_BENCHMARK_PREFIX`OpenClaw，以及针对 NAT64、6to4、Teredo、ISATAP 和 IPv4 映射形式的嵌入式 IPv4 哨兵处理。在维护外部代理策略时，这些文件是很有用的参考，但 OpenClaw 不会自动在您的代理中导出或执行这些规则。

| 范围或主机                                                                           | 拦截原因                          |
| ------------------------------------------------------------------------------------ | --------------------------------- |
| `127.0.0.0/8`、`localhost`、`localhost.localdomain`                                  | IPv4 环回                         |
| `::1/128`                                                                            | IPv6 环回                         |
| `0.0.0.0/8`、`::/128`                                                                | 未指定地址和本网络地址            |
| `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`                                      | RFC1918 私有网络                  |
| `169.254.0.0/16`、`fe80::/10`                                                        | 链路本地地址和通用云元数据路径    |
| `169.254.169.254`、`metadata.google.internal`                                        | 云元数据服务                      |
| `100.64.0.0/10`                                                                      | 运营商级 NAT 共享地址空间         |
| `198.18.0.0/15`、`2001:2::/48`                                                       | 基准测试范围                      |
| `192.0.0.0/24`、`192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`、`2001:db8::/32` | 特殊用途和文档范围                |
| `224.0.0.0/4`、`ff00::/8`                                                            | 组播                              |
| `240.0.0.0/4`                                                                        | 保留 IPv4                         |
| `fc00::/7`、`fec0::/10`                                                              | IPv6 本地/私有范围                |
| `100::/64`、`2001:20::/28`                                                           | IPv6 丢弃和 ORCHIDv2 范围         |
| `64:ff9b::/96`、`64:ff9b:1::/48`                                                     | 包含嵌入式 IPv4 的 NAT64 前缀     |
| `2002::/16`、`2001::/32`                                                             | 包含嵌入式 IPv4 的 6to4 和 Teredo |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4 兼容和 IPv4 映射的 IPv6      |

如果您的云提供商或网络平台记录了其他元数据主机或保留范围，也请添加这些范围。

## 验证

从运行 OpenClaw 的同一主机、容器或服务帐户验证代理：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

对于由私有 CA 签名的 HTTPS 代理端点：

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

默认情况下，当未提供自定义目标时，该命令会检查 `https://example.com/` 是否成功，并启动一个代理不得访问的临时环回哨兵。当代理返回非 2xx 拒绝响应或通过传输故障阻止哨兵时，默认拒绝检查通过；如果成功的响应到达哨兵，则检查失败。如果未启用且未配置代理，验证将报告配置问题；请在更改配置之前使用 `--proxy-url` 进行一次性预检。使用 `--allowed-url` 和 `--denied-url` 来测试特定于部署的预期。添加 `--apns-reachable` 还可以验证直接 APNs HTTP/2 交付能否通过代理打开 CONNECT 隧道并接收沙盒 APNs 响应；该探针使用故意无效的提供商令牌，因此 `403 InvalidProviderToken` 是预期的，并计为可访问。自定义拒绝目标属于故障关闭（fail-closed）：任何 HTTP 响应都意味着目标可通过代理访问，任何传输错误都被报告为不确定，因为 OpenClaw 无法证明代理阻止了可访问的源。验证失败时，命令以代码 1 退出。

使用 `--json` 进行自动化。JSON 输出包含总体结果、有效代理配置源、任何配置错误以及每个目标检查。代理 URL 凭据在文本和 JSON 输出中会被编辑：

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    },
    {
      "kind": "apns",
      "url": "https://api.sandbox.push.apple.com",
      "ok": true,
      "status": 403
    }
  ]
}
```

您也可以使用 `curl` 手动验证：

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

公共请求应该成功。回环和元数据请求应该被代理拦截。对于 `openclaw proxy validate`，内置的回环 canary 可以区分代理拦截和可访问的源。自定义 `--denied-url` 检查没有该 canary，因此，除非您的代理公开了您可以单独验证的特定于部署的拦截信号，否则请将 HTTP 响应和模棱两可的传输故障均视为验证失败。

## 代理 CA 信任

当代理端点本身使用由私有 CA 签名的证书时，请使用受管 `proxy.tls.caFile`：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

该 CA 用于代理端点的 TLS 验证。它不是目标 MITM 信任设置、客户端证书，也不是代理目标策略的替代品。

仅当整个 Node 进程必须从进程启动时信任额外的 CA 时，才使用 `NODE_EXTRA_CA_CERTS`，例如，当企业 TLS 检查系统为进程中的每个 HTTPS 客户端重新签名目标证书时。`NODE_EXTRA_CA_CERTS` 是进程全局的，并且必须在 Node 启动之前存在。对于 HTTPS 代理端点信任，首选 `proxy.tls.caFile`，因为它的范围限于受管代理路由。

然后启用 OpenClaw 代理路由：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

或设置：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

## 限制

- 该代理改进了对进程本地 JavaScript HTTP 和 WebSocket 客户端的覆盖范围，但它不是操作系统级别的网络沙箱。
- Gateway(网关) 回环控制平面流量默认为通过 `proxy.loopbackMode: "gateway-only"` 直接本地绕过。OpenClaw 通过在 Proxyline 的受管绕过策略中注册活动的 Gateway(网关) 回环权限来实现该绕过。操作员可以设置 `proxy.loopbackMode: "proxy"` 以通过受管代理发送 Gateway(网关) 回环流量，或设置 `proxy.loopbackMode: "block"` 以拒绝回环 Gateway(网关) 连接。有关远程代理的注意事项，请参阅 [Gateway(网关) Loopback Mode](#gateway-loopback-mode)。
- 原始 `net`、`tls` 和 `http2` 套接字、原生插件以及非 OpenClaw 子进程可能会绕过 Node 级别的代理路由，除非它们继承并遵守代理环境变量。分叉的 OpenClaw 子 CLI 会继承受管代理 URL 和 `proxy.loopbackMode` 状态。
- IRC 是一个操作员管理的正向代理路由之外的原始 TCP/TLS 渠道。在要求所有出口流量都通过该正向代理的部署中，请设置 `channels.irc.enabled=false`，除非明确批准直接 IRC 出口。
- 本地调试代理是诊断工具，当受管代理模式处于活动状态时，其对代理请求和 CONNECT 隧道的直接上游转发默认被禁用；仅针对已批准的本地诊断启用直接转发。
- 用户本地 WebUI 和本地模型服务器应在需要时被添加到操作员代理策略的允许列表中；OpenClaw 不会为它们公开通用的本地网络旁路。
- Gateway(网关) 控制平面代理旁路有意限制为 `localhost` 和文字回环 IP URL。对于本地直接 Gateway(网关) 控制平面连接，请使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789`；其他主机名的路由方式与基于普通主机名的流量相同。
- OpenClaw 不会检查、测试或认证您的代理策略。
- 请将代理策略更改视为敏感的安全操作变更。

| 覆盖范围                                                  | 受管代理状态                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `fetch`、`node:http`、`node:https`，常见 WebSocket 客户端 | 配置后，通过受管代理挂钩进行路由。                                            |
| APNs 直接 HTTP/2                                          | 通过 APNs 受管 CONNECT 助手进行路由。                                         |
| Gateway(网关) 控制平面回路                                | 仅针对配置的本地回路 Gateway(网关) URL 进行直接连接。                         |
| 调试代理上游转发                                          | 当受管代理模式处于活动状态时禁用，除非明确为本地诊断启用。                    |
| IRC                                                       | 原始 TCP/TLS；不受托管 HTTP 代理模式代理。除非已批准直接 IRC 出站，否则禁用。 |
| 其他原始 `net`、`tls` 或 `http2` 客户端调用               | 必须在落地前由原始套接字保护程序进行分类。                                    |
