---
summary: "`openclaw node`（无头节点主机）的 CLI 参考"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

运行一个连接到 Gateway WebSocket 并在此机器上暴露
`system.run` / `system.which` 的 **无头节点主机**。

## 为什么要使用节点主机？

当您希望代理在网络中的 **其他机器上运行命令** 而无需在那安装完整的 macOS 伴侣应用时，请使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器（构建服务器、实验室机器、NAS）上运行命令。
- 将执行保持在网关上的 **沙箱** 中，但将已批准的运行委托给其他主机。
- 为自动化或 CI 节点提供轻量级的无头执行目标。

执行仍然受节点主机上的 **exec approvals** 和每个代理的允许列表保护，因此您可以保持命令访问的范围限制和明确性。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动通告浏览器代理。这允许代理在该节点上使用浏览器自动化而无需额外配置。

如需在节点上禁用它：

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

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：对网关连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹 (sha256)
- `--node-id <id>`：覆盖节点 ID（清除配对令牌）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的网关身份验证

`openclaw node run` 和 `openclaw node install` 从配置/环境解析网关身份验证（节点命令上没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后是本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机故意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是通过 SecretRef 显式配置且未解析，则节点身份验证解析失败关闭（无远程回退屏蔽）。
- 在 `gateway.mode=remote` 中，根据远程优先级规则，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也是有效的。
- 旧的 `CLAWDBOT_GATEWAY_*` 环境变量在节点主机身份验证解析中被忽略。

## 服务（后台）

将无头节点主机安装为用户服务。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：网关连接使用 TLS
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

服务命令接受 `--json` 以获取机器可读的输出。

## 配对

首次连接会在 Gateway 上创建待处理的设备配对请求（`role: node`）。
通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在
`~/.openclaw/node.json` 中。

## 执行批准

`system.run` 受本地执行批准限制：

- `~/.openclaw/exec-approvals.json`
- [执行批准](/zh/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 编辑）
