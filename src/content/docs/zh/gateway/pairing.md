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
4. 批准后，Gateway(网关) 颁发一个**新令牌**（重新配对时会轮换令牌）。
5. 节点使用令牌重新连接，此时即已“配对”。

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

- `node.pair.requested` — 创建新的待处理请求时发出。
- `node.pair.resolved` — 请求被批准/拒绝/过期时发出。

方法：

- `node.pair.request` — 创建或复用待处理请求。
- `node.pair.list` — 列出待处理和已配对的节点 (`operator.pairing`)。
- `node.pair.approve` — 批准待处理请求（颁发令牌）。
- `node.pair.reject` — 拒绝待处理请求。
- `node.pair.remove` — 移除过时的已配对节点条目。
- `node.pair.verify` — 验证 `{ nodeId, token }`。

注意事项：

- `node.pair.request` 对每个节点是幂等的：重复调用返回相同的
  待处理请求。
- 对同一待处理节点的重复请求也会刷新存储的节点元数据，以及最新的已列入允许列表的声明命令快照，以便操作员查看。
- 批准 **始终** 会生成一个新的令牌；`node.pair.request` 绝不会返回任何令牌。
- 请求可以包含 `silent: true` 作为自动批准流程的提示。
- `node.pair.approve` 使用待处理请求中声明的命令来强制执行
  额外的批准范围：
  - 无命令请求：`operator.pairing`
  - 非 exec 命令请求：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` 请求：
    `operator.pairing` + `operator.admin`

<Warning>
节点配对是一种信任和身份流程以及令牌颁发。它 **不** 会固定每个节点的实时节点命令表面。

- 实时节点命令来自节点在应用网关全局节点命令策略（`gateway.nodes.allowCommands` 和 `denyCommands`）后连接时声明的内容。
- 每个节点的 `system.run` 允许和询问策略位于节点上的 `exec.approvals.node.*` 中，而不是在配对记录中。
  </Warning>

## 节点命令门控（2026.3.31+）

<Warning>**重大变更：** 从 `2026.3.31` 开始，节点命令在节点配对获得批准之前被禁用。仅设备配对不再足以暴露声明的节点命令。</Warning>

当节点首次连接时，会自动请求配对。在配对请求获得批准之前，来自该节点的所有待处理节点命令都会被过滤，并且不会执行。一旦通过配对批准建立了信任，节点的声明命令就会变为可用，但仍受正常命令策略的约束。

这意味着：

- 以前仅依靠设备配对来暴露命令的节点现在必须完成节点配对。
- 在配对批准之前排队的命令将被丢弃，而不是延迟执行。

## 节点事件信任边界（2026.3.31+）

<Warning>**重大变更：** 节点发起的运行现在保持在缩减的信任表面上。</Warning>

节点发起的摘要和相关会话事件仅限于预期的受信任表面。先前依赖更广泛的主机或会话工具访问的驱动通知或节点触发流程可能需要调整。这种强化确保节点事件不能升级到超出节点信任边界允许的主机级工具访问。

## 自动批准 (macOS app)

当满足以下条件时，macOS 应用可以选择性地尝试**静默批准**：

- 请求被标记为 `silent`，并且
- 应用可以使用同一用户验证到网关主机的 SSH 连接。

如果静默批准失败，它将回退到正常的“批准/拒绝”提示。

## 受信任 CIDR 设备自动批准

针对 `role: node` 的 WS 设备配对默认保持手动。对于 Gateway(网关) 已经信任网络路径的私有节点网络，操作员可以通过明确的 CIDR 或确切的 IP 进行选择加入：

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

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时禁用。
- 不存在全面的 LAN 或专用网络自动批准模式。
- 只有没有请求范围的新 `role: node` 设备配对才符合条件。
- 操作员、浏览器、控制 UI 和 WebChat 客户端保持手动。
- 角色、范围、元数据和公钥升级保持手动。
- 同主机环回受信任代理头路径不符合条件，因为该路径可以被本地调用者欺骗。

## 元数据升级自动批准

当已配对的设备重新连接时，如果只有非敏感的元数据更改（例如，显示名称或客户端平台提示），OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它仅适用于已经证明拥有本地或共享凭据的受信任的非浏览器本地重新连接，包括 OS 版本元数据更改后的同主机原生应用重新连接。浏览器/控制 UI 客户端和远程客户端仍使用显式重新批准流程。范围升级（读取到写入/管理）和公钥更改**不符合**元数据升级自动批准的条件 —— 它们仍作为显式重新批准请求。

## QR 配对助手

`/pair qr` 将配对有效负载呈现为结构化媒体，以便移动和浏览器客户端可以直接扫描它。

删除设备也会清除该设备 ID 的任何过时的待处理配对请求，因此 `nodes pending` 不会在撤销后显示孤立的行。

## 本地性和转发标头

Gateway(网关) 配对仅在原始套接字和任何上游代理证据一致时才将连接视为回环。如果请求到达回环但带有指向非本地源的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 标头，则该转发标头证据将使回环本地性声明无效。配对路径随后需要显式批准，而不是静默地将请求视为同主机连接。有关操作员身份验证的等效规则，请参阅[Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)。

## 存储（本地，私有）

配对状态存储在 Gateway(网关) 状态目录下（默认为 `~/.openclaw`）：

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

如果您覆盖 `OPENCLAW_STATE_DIR`，`nodes/` 文件夹也会随之移动。

安全说明：

- 令牌是机密；请将 `paired.json` 视为敏感信息。
- 轮换令牌需要重新批准（或删除节点条目）。

## 传输行为

- 传输是**无状态**的；它不存储成员资格。
- 如果 Gateway(网关) 离线或禁用配对，节点将无法配对。
- 如果 Gateway(网关) 处于远程模式，配对仍然针对远程 Gateway(网关) 的存储进行。

## 相关

- [Channel pairing](/zh/channels/pairing)
- [Nodes](/zh/nodes)
- [Devices CLI](/zh/cli/devices)
