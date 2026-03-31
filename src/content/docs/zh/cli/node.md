---
summary: "`openclaw node`（无头节点主机）的 CLI 参考"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

运行一个连接到 Gateway 网关 WebSocket 并在此机器上暴露
`system.run` / `system.which` 的**无头节点主机**。

## 为什么要使用节点主机？

当您希望代理在网络中的 **其他机器上运行命令** 而无需在那安装完整的 macOS 伴侣应用时，请使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器（构建服务器、实验室机器、NAS）上运行命令。
- 将执行保持在网关上的 **沙箱** 中，但将已批准的运行委托给其他主机。
- 为自动化或 CI 节点提供轻量级的无头执行目标。

执行仍然受节点主机上的 **exec approvals** 和每个代理的允许列表保护，因此您可以保持命令访问的范围限制和明确性。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动通告浏览器代理。这使得代理可以在该节点上使用浏览器自动化，而无需额外配置。

默认情况下，代理会暴露节点的常规浏览器配置文件表面。如果您设置了 `nodeHost.browserProxy.allowProfiles`，代理将变为限制性模式：不允许针对非白名单配置文件的操作，并且通过代理阻止持久化配置文件的创建/删除路由。

如果需要，请在节点上禁用它：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## 运行（前台）

```bash
openclaw node run --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway(网关) WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway(网关) WebSocket 端口（默认：`18789`）
- `--tls`：对网关连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹 (sha256)
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## Gateway(网关) auth for node host

`openclaw node run` 和 `openclaw node install` 从配置/环境变量解析网关身份验证（节点命令上没有 `--token`/`--password` 标志）：

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 优先被检查。
- 然后是本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，节点身份验证解析将失败关闭（无远程回退屏蔽）。
- 在 `gateway.mode=remote` 中，根据远程优先规则，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也符合条件。
- 节点主机身份验证解析仅尊重 `OPENCLAW_GATEWAY_*` 环境变量。

## 服务（后台）

将无头节点主机作为用户服务安装。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway(网关) WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway(网关) WebSocket 端口（默认：`18789`）
- `--tls`：对网关连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹 (sha256)
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node` 或 `bun`）
- `--force`：如果已安装则重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 运行前台节点主机（无服务）。

服务命令接受 `--json` 以输出机器可读格式。

## 配对

首次连接会在 Gateway(网关) 上创建待处理的设备配对请求（`role: node`）。
通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果节点使用更改的身份验证详细信息（角色/范围/公钥）重试配对，
之前的待处理请求将被取代，并创建一个新的 `requestId`。
在批准之前再次运行 `openclaw devices list`。

节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在
`~/.openclaw/node.json` 中。

## 执行审批

`system.run` 受本地执行审批限制：

- `~/.openclaw/exec-approvals.json`
- [执行审批](/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway(网关) 编辑）
