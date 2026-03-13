---
summary: "`openclaw node`（无头节点主机）的 CLI 参考"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

运行一个连接到 Gateway WebSocket 并在此机器上暴露 `system.run` / `system.which` 的 **无头节点主机**。

## 为什么要使用节点主机？

当您希望代理在您网络中的 **其他机器上运行命令** 而无需在那里安装完整的 macOS 伴侣应用时，请使用节点主机。

常见用例：

- 在远程 Linux/Windows 设备（构建服务器、实验室机器、NAS）上运行命令。
- 将 exec 保持在网关上 **沙盒化**，但将批准的运行委托给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍受节点主机上的 **执行批准** 和每个代理的允许列表保护，因此您可以保持命令访问的范围明确。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动通告浏览器代理。这使得代理无需额外配置即可在该节点上使用浏览器自动化。

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

- `--host <host>`：Gateway WebSocket 主机（默认值：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认值：`18789`）
- `--tls`：对网关连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的网关身份验证

`openclaw node run` 和 `openclaw node install` 从配置/环境变量解析网关身份验证（节点命令上没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后是本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 且未解析，节点身份验证解析将失败关闭（无远程回退屏蔽）。
- 在 `gateway.mode=remote` 中，根据远程优先级规则，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也符合条件。
- 在解析节点主机身份验证时，将忽略旧版 `CLAWDBOT_GATEWAY_*` 环境变量。

## 服务（后台）

将无头节点主机作为用户服务安装。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认值：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认值：`18789`）
- `--tls`：对网关连接使用 TLS
- `--tls-fingerprint <sha256>`: 预期的 TLS 证书指纹 (sha256)
- `--node-id <id>`: 覆盖节点 ID（清除配对令牌）
- `--display-name <name>`: 覆盖节点显示名称
- `--runtime <runtime>`: 服务运行时 (`node` 或 `bun`)
- `--force`: 如果已安装则重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 运行前台节点主机（无服务）。

服务命令接受 `--json` 以获取机器可读的输出。

## 配对

首次连接会在网关上创建一个待处理的设备配对请求 (`role: node`)。
通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在
`~/.openclaw/node.json` 中。

## Exec approvals

`system.run` 受本地 Exec approvals 限制：

- `~/.openclaw/exec-approvals.json`
- [Exec approvals](/zh/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从网关编辑）

import zh from '/components/footer/zh.mdx';

<zh />
