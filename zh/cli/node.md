---
summary: "CLI 参考，适用于 `openclaw node` （无头节点主机）"
read_when:
  - 运行无头节点主机
  - 为 system.run 配对非 macOS 节点
title: "node"
---

# `openclaw node`

运行一个**无头节点主机**，连接到 Gateway(网关) WebSocket，并在此计算机上公开
`system.run` / `system.which`。

## 为什么使用节点主机？

当您希望代理**在网络中的其他计算机上运行命令**而不必在此处安装完整的 macOS 伴侣应用时，请使用节点主机。

常见用例：

- 在远程 Linux/Windows 框（构建服务器、实验室计算机、NAS）上运行命令。
- 使 exec 在网关上保持**沙箱隔离**（沙箱隔离），但将批准的运行委托给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍受节点主机上的 **exec approvals** 和每代理允许列表的保护，因此您可以保持命令访问的限定性和明确性。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动通告浏览器代理。这允许代理在该节点上使用浏览器自动化，而无需额外配置。

如果需要，在节点上禁用它：

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

## 节点主机的 Gateway(网关) 身份验证

`openclaw node run` 和 `openclaw node install` 从配置/环境解析网关身份验证（节点命令上没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后是本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 但未解析，节点身份验证解析将失败关闭（无远程回退屏蔽）。
- 在 `gateway.mode=remote` 中，根据远程优先级规则，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也适用。
- 传统的 `CLAWDBOT_GATEWAY_*` 环境变量在节点主机身份验证解析中被忽略。

## 服务（后台）

将无头节点主机安装为用户服务。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`: Gateway(网关) WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`: Gateway(网关) WebSocket 端口（默认：`18789`）
- `--tls`: 对网关连接使用 TLS
- `--tls-fingerprint <sha256>`: 预期的 TLS 证书指纹（sha256）
- `--node-id <id>`: 覆盖节点 ID（清除配对令牌）
- `--display-name <name>`: 覆盖节点显示名称
- `--runtime <runtime>`: 服务运行时（`node` 或 `bun`）
- `--force`: 如果已安装则重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

对前台节点主机（无服务）使用 `openclaw node run`。

服务命令接受 `--json` 以获取机器可读输出。

## 配对

第一次连接会在 Gateway(网关) 上创建一个待处理的设备配对请求（`role: node`）。
通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在
`~/.openclaw/node.json` 中。

## 执行审批

`system.run` 受本地执行审批的限制：

- `~/.openclaw/exec-approvals.json`
- [执行审批](/zh/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway(网关) 编辑）

import zh from "/components/footer/zh.mdx";

<zh />
