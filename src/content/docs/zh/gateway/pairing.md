---
summary: "iOS 和其他远程节点的 Gateway(网关) 拥有的节点配对（选项 B）"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Gateway(网关) 拥有的配对"
---

在 Gateway(网关) 拥有的配对中，**Gateway(网关)** 是决定允许哪些节点加入的单一事实来源。UI（macOS 应用、未来的客户端）只是用于批准或拒绝待处理请求的前端。

**重要提示：** WS 节点在 `connect` 期间使用 **设备配对**（角色 `node`）。
`node.pair.*` 是一个独立的配对存储，并**不**控制 WS 握手。
只有显式调用 `node.pair.*` 的客户端才使用此流程。

## 概念

- **待处理请求**：节点请求加入；需要批准。
- **已配对节点**：已获批准并被授予身份验证令牌的节点。
- **传输**：Gateway(网关) WS 端点转发请求但不决定成员身份。（已移除对旧版 TCP 网桥的支持。）

## 配对如何工作

1. 节点连接到 Gateway(网关) WS 并请求配对。
2. Gateway(网关) 存储**待处理请求**并发出 `node.pair.requested`。
3. 您批准或拒绝该请求（CLI 或 UI）。
4. 在批准时，Gateway(网关) 会签发一个**新令牌**（令牌在重新配对时会轮换）。
5. 节点使用该令牌重新连接，此时即处于“已配对”状态。

待处理请求会在 **5 分钟** 后自动过期。

## CLI 工作流（无头友好）

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示已配对/已连接的节点及其功能。

## API 表面（网关协议）

事件：

- `node.pair.requested` - 当创建新的待处理请求时发出。
- `node.pair.resolved` - 当请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` - 创建或复用待处理请求。
- `node.pair.list` - 列出待处理和已配对的节点 (`operator.pairing`)。
- `node.pair.approve` - 批准待处理请求（签发令牌）。
- `node.pair.reject` - 拒绝待处理请求。
- `node.pair.remove` - 移除过时的已配对节点条目。
- `node.pair.verify` - 验证 `{ nodeId, token }`。

注意事项：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的
  待处理请求。
- 对同一待处理节点的重复请求也会刷新存储的节点元数据，以及最新的已列入允许列表的声明命令快照，以便操作员查看。
- 批准 **始终** 会生成一个新的令牌；`node.pair.request` 绝不会返回任何令牌。
- 操作员作用域级别和批准时的检查汇总于
  [Operator scopes](/zh/gateway/operator-scopes)。
- 请求可能包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 使用待处理请求中声明的命令来执行
  额外的批准作用域：
  - 无命令请求：`operator.pairing`
  - 非执行命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：
    `operator.pairing` + `operator.admin`

<Warning>
节点配对是一种信任和身份流程加上令牌签发。它并**不**固定每个节点的实时节点命令面。

- 实时节点命令来自节点在连接后声明的内容，前提是已应用网关的全局节点命令策略 (`gateway.nodes.allowCommands` 和 `denyCommands`)。
- 每个节点的 `system.run` 允许和询问策略位于节点的 `exec.approvals.node.*` 中，而不在配对记录中。

</Warning>

## 节点命令控制 (2026.3.31+)

<Warning>**重大变更：** 从 `2026.3.31` 开始，在批准节点配对之前，节点命令处于禁用状态。仅靠设备配对不再足以暴露声明的节点命令。</Warning>

当节点首次连接时，会自动请求配对。在配对请求获得批准之前，来自该节点的所有待处理节点命令都将被过滤，不会执行。一旦通过配对批准建立了信任，节点声明的命令就会变为可用，但需遵守常规命令策略。

这意味着：

- 以前仅依赖设备配对来公开命令的节点，现在必须完成节点配对。
- 在配对批准之前排队的命令将被丢弃，而不是延迟执行。

## 节点事件信任边界 (2026.3.31+)

<Warning>**重大变更：** 节点发起的运行现在停留在受信任度较低的表面上。</Warning>

节点发起的摘要及相关会话事件仅限于预期的受信任表面。以前依赖更广泛的主机或会话工具访问的通知驱动或节点触发的流程可能需要进行调整。这种强化确保节点事件无法升级到超出节点信任边界允许的主机级工具访问。

持久节点存在状态更新遵循相同的身份边界。`node.presence.alive` 事件
仅接受来自经过身份验证的节点设备会话，并且仅当
设备/节点身份已配对时才更新配对元数据。自声明的 `client.id` 值不足以写入
最后出现状态。

## 自动批准 (macOS 应用)

macOS 应用可以选择性地尝试**静默批准**，当：

- 请求被标记为 `silent`，并且
- 该应用可以使用同一用户验证与网关主机的 SSH 连接。

如果静默批准失败，它将回退到正常的“批准/拒绝”提示。

## Trusted-CIDR 设备自动批准

针对 `role: node`Gateway(网关) 的 WS 设备配对默认保持手动。对于 Gateway(网关)
已经信任网络路径的私有节点网络，操作员可以
选择使用显式的 CIDR 或精确 IP：

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

安全边界：

- 当未设置 `gateway.nodes.pairing.autoApproveCidrs` 时禁用。
- 不存在全面的 LAN 或专用网络自动批准模式。
- 只有没有请求作用域的全新 `role: node` 设备配对才符合资格。
- Operator、browser、Control UI 和 WebChat 客户端保持手动。
- Role、scope、metadata 和 public-key 升级保持手动。
- 同主机环回 trusted-proxy header 路径不符合资格，因为该路径可被本地调用者欺骗。

## Metadata-upgrade auto-approval

当已配对设备仅通过非敏感 metadata 变更（例如，显示名称或客户端平台提示）重新连接时，OpenClaw 将其视为 OpenClaw`metadata-upgrade`。静默自动批准范围狭窄：它仅适用于已证明拥有本地或共享凭据的受信任非浏览器本地重新连接，包括 OS 版本 metadata 变更后的同主机原生应用重新连接。Browser/Control UI 客户端和远程客户端仍使用显式重新批准流程。Scope 升级（read 到 write/admin）和公钥变更**不**符合 metadata-upgrade auto-approval 的资格——它们仍作为显式重新批准请求。

## QR pairing helpers

`/pair qr` 将配对负载渲染为结构化媒体，以便移动端和浏览器客户端可以直接扫描。

删除设备也会清除该设备 ID 的任何过时的待处理配对请求，因此 `nodes pending` 在撤销后不会显示孤立行。

## Locality and forwarded headers

仅当原始套接字和任何上游代理证据一致时，Gateway(网关)配对才会将连接视为本地回环。如果一个请求在本地回环上到达但携带 Gateway(网关)`Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 头部证据，该转发头部证据将取消本地回环归属的声明。配对路径随后需要显式批准，而不是静默地将请求视为同主机连接。有关操作员身份验证的等效规则，请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)。

## Storage (local, private)

配对状态存储在 Gateway 状态目录（默认 Gateway(网关)`~/.openclaw`）下：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之移动。

安全说明：

- 令牌是机密；请将 `paired.json` 视为敏感信息。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 传输是**无状态**的；它不存储成员资格。
- 如果 Gateway(网关) 离线或已禁用配对，节点无法配对。
- 如果 Gateway(网关) 处于远程模式，配对仍针对远程 Gateway(网关) 的存储进行。

## 相关

- [通道配对](/zh/channels/pairing)
- [节点](/zh/nodes)
- [设备 CLI](/zh/cli/devices)
