---
summary: "`openclaw node` 的 CLI 参考（无头 node host）"
read_when:
  - 运行无头 node host
  - 为 system.run 配对非 macOS 节点
title: "node"
---

# `openclaw node`

运行一个 **无头 node host**，连接到 Gateway WebSocket，并在本机暴露
`system.run` / `system.which`。

## 为什么使用 node host？

当你希望 agent **在其他机器上运行命令**，而不在那台机器上安装完整 macOS 伴侣应用时，
就可以使用 node host。

常见用例：

- 在远程 Linux/Windows 机器上执行命令（构建服务器、实验室机器、NAS）。
- 让 exec 仍 **受 gateway 沙盒控制**，但将已批准的运行委派给其他主机。
- 为自动化或 CI 节点提供轻量、无头的执行目标。

执行仍受 **exec approvals** 与 node host 上按 agent 划分的 allowlist 保护，
可保持命令访问范围清晰、明确。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，node host 会自动广播浏览器代理。
这使 agent 可在该节点上进行浏览器自动化而无需额外配置。

如有需要可在节点上禁用：

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

- `--host <host>`：Gateway WebSocket host（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖 node id（会清除配对 token）
- `--display-name <name>`：覆盖节点显示名称

## 服务（后台）

以用户服务安装无头 node host。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket host（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖 node id（会清除配对 token）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务 runtime（`node` 或 `bun`）
- `--force`：若已安装则重新安装/覆盖

管理服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

前台运行使用 `openclaw node run`（不作为服务）。

服务命令支持 `--json` 以输出机器可读结果。

## 配对

首次连接会在 Gateway 上创建待处理的节点配对请求。
通过以下命令批准：

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
```

node host 会将 node id、token、显示名与 gateway 连接信息存储在
`~/.openclaw/node.json`。

## Exec approvals

`system.run` 受本地 exec approvals 限制：

- `~/.openclaw/exec-approvals.json`
- [Exec 审批](/zh/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 编辑）
