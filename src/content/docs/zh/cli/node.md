---
summary: "CLI 参考，用于 `openclaw node`（无头节点主机）"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "节点"
---

# `openclaw node`

运行一个连接到 Gateway(网关) WebSocket 并在此机器上暴露
`system.run` / `system.which` 的**无头节点主机**。

## 为什么要使用节点主机？

当您希望代理在网络中的 **其他机器上运行命令** 而无需在那安装完整的 macOS 伴侣应用时，请使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器（构建服务器、实验室机器、NAS）上运行命令。
- 将执行保持在网关上的 **沙箱** 中，但将已批准的运行委托给其他主机。
- 为自动化或 CI 节点提供轻量级的无头执行目标。

执行仍由节点主机上的 **exec approvals** 和每个代理的允许列表进行保护，因此您可以将命令访问范围限定在明确范围内。

## 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，节点主机会自动通告浏览器代理。这允许代理在该节点上使用浏览器自动化，而无需额外配置。

默认情况下，代理暴露节点的正常浏览器配置文件表面。如果您设置了
`nodeHost.browserProxy.allowProfiles`，代理将变得严格：拒绝非白名单的配置文件定位，并通过代理阻止持久化配置文件的创建/删除路由。

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

- `--host <host>`: Gateway(网关) WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`: Gateway(网关) WebSocket 端口（默认：`18789`）
- `--tls`: 对网关连接使用 TLS
- `--tls-fingerprint <sha256>`: 预期的 TLS 证书指纹 (sha256)
- `--node-id <id>`: 覆盖节点 ID（清除配对令牌）
- `--display-name <name>`: 覆盖节点显示名称

## Gateway(网关) auth for node host

`openclaw node run` 和 `openclaw node install` 从配置/环境解析网关身份验证（节点命令上没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后是本地配置回退：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机故意不继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，则节点身份验证解析失败关闭（没有远程回退掩码）。
- 在 `gateway.mode=remote` 中，根据远程优先级规则，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也是符合条件的。
- 节点主机身份验证解析仅遵循 `OPENCLAW_GATEWAY_*` 环境变量。

对于连接到受信任专用网络上的非环回 `ws://` Gateway(网关) 的节点，请设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。如果没有它，节点启动将失败并关闭，并要求您使用 `wss://`、SSH 隧道或 Tailscale。
这是一个进程环境选择加入选项，而不是 `openclaw.json` 配置键。
当 `openclaw node install` 存在于安装命令环境中时，它会将其持久化到受监督的节点服务中。

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
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

对于前台节点主机（无服务），请使用 `openclaw node run`。

服务命令接受 `--json` 以获取机器可读的输出。

节点主机在进程中重试 Gateway(网关) 重启和网络关闭。如果 Gateway(网关) 报告终端令牌/密码/引导身份验证暂停，节点主机会记录关闭详细信息并以非零状态退出，以便 launchd/systemd 可以使用新的配置和凭据重新启动它。需要配对的暂停保持在前台流程中，以便可以批准待处理的请求。

## 配对

第一次连接会在 Gateway(网关) 上创建待处理的设备配对请求 (`role: node`)。
通过以下方式批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

在严格控制的节点网络上，Gateway(网关) 运营商可以明确选择加入自动批准来自受信任 CIDR 的首次节点配对：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

默认情况下禁用此项。它仅适用于没有请求作用域的新 `role: node` 配对。操作员/浏览器客户端、Control UI、WebChat 以及角色、作用域、元数据或公钥升级仍需手动批准。

如果节点使用更改的身份验证详细信息（角色/作用域/公钥）重试配对，之前的待处理请求将被取代，并创建一个新的 `requestId`。在批准之前再次运行 `openclaw devices list`。

节点主机将其节点 ID、令牌、显示名称和网关连接信息存储在 `~/.openclaw/node.json` 中。

## Exec 批准

`system.run` 受本地 exec 批准的限制：

- `~/.openclaw/exec-approvals.json`
- [Exec 批准](/zh/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway(网关) 编辑）

对于已批准的异步节点 exec，OpenClaw 会在提示之前准备一个规范的 `systemRunPlan`。随后批准的 `system.run` 转发将重用该存储的计划，因此在创建批准请求后对 command/cwd/会话 字段的编辑将被拒绝，而不是更改节点执行的内容。

## 相关

- [CLI 参考](/zh/cli)
- [节点](/zh/nodes)
