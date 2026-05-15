---
summary: "OpenClaw 在线条目是如何生成、合并和显示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "在线"
---

OpenClaw “presence”（状态）是一个轻量级、尽力而为的视图：

- **Gateway(网关)** 本身，以及
- **连接到 Gateway(网关) 的客户端**（mac 应用、WebChat、CLI 等）

Presence 主要用于渲染 macOS 应用的 **Instances**（实例）选项卡，并为操作员提供快速的可视性。

## Presence 字段（显示的内容）

Presence 条目是具有以下字段的结构化对象：

- `instanceId`（可选但强烈推荐）：稳定的客户端身份（通常是 `connect.client.instanceId`）
- `host`：人类可读的主机名
- `ip`：尽力而为的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`、...
- `lastInputSeconds`：“自上次用户输入以来的秒数”（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`、...
- `ts`：上次更新时间戳（自纪元以来的毫秒数）

## 生产者（Presence 的来源）

Presence 条目由多个来源生成并**合并**。

### 1) Gateway(网关) 自身条目

Gateway（网关）总是在启动时植入一个“self”（自身）条目，以便 UI 在任何客户端连接之前就显示网关主机。

### 2) WebSocket 连接

每个 WS 客户端都以 `connect`Gateway(网关) 请求开始。成功握手后，Gateway（网关）会为该连接更新或插入一个 presence 条目。

#### 为什么一次性 CLI 命令不显示

CLI 经常为了简短的、一次性命令而进行连接。为了避免干扰 Instances（实例）列表，CLI`client.mode === "cli"` **不会**被转换为 presence 条目。

### 3) `system-event` 信标

客户端可以通过 `system-event` 方法发送更丰富的周期性信标。Mac 应用使用此方法来报告主机名、IP 和 `lastInputSeconds`。

### 4) 节点连接（角色：node）

当一个节点通过 Gateway WebSocket 使用 Gateway(网关)`role: node`Gateway(网关) 进行连接时，Gateway（网关）会为该节点更新或插入一个 presence 条目（与其他 WS 客户端的流程相同）。

## 合并 + 去重规则（为什么 `instanceId` 很重要）

Presence 条目存储在单个内存映射中：

- 条目由 **presence key** 键控。
- 最佳键是能够经受重启的稳定 `instanceId`（来自 `connect.client.instanceId`）。
- 键不区分大小写。

如果客户端在没有稳定 `instanceId` 的情况下重新连接，它可能会显示为
**重复** 行。

## TTL 和有限大小

Presence 是有意设计的短暂存在：

- **TTL：** 超过 5 分钟的条目会被修剪
- **最大条目数：** 200（最旧的优先删除）

这使列表保持最新，并避免无限制的内存增长。

## 远程/隧道注意事项（环回 IP）

当客户端通过 SSH 隧道/本地端口转发连接时，Gateway(网关) 可能会将远程地址视为 `127.0.0.1`。为避免覆盖良好的客户端报告 IP，将忽略环回远程地址。

## 消费者

### macOS 实例选项卡

macOS 应用程序渲染 `system-presence` 的输出，并根据上次更新的时间应用一个小状态指示器（活动/空闲/陈旧）。

## 调试提示

- 要查看原始列表，请针对 Gateway(网关) 调用 `system-presence`。
- 如果看到重复项：
  - 确认客户端在握手时发送了稳定的 `client.instanceId`
  - 确认定期信标使用相同的 `instanceId`
  - 检查连接派生的条目是否缺少 `instanceId`（预计会有重复）

## 相关

<CardGroup cols={2}>
  <Card title="正在输入指示器" href="/zh/concepts/typing-indicators" icon="ellipsis">
    何时发送正在输入指示器以及如何调整它们。
  </Card>
  <Card title="流式传输和分块" href="/zh/concepts/streaming" icon="bars-staggered">
    出站流式传输、分块和每个渠道的格式化。
  </Card>
  <Card title="Gateway(网关) 架构" href="/zh/concepts/architecture" icon="diagram-project">
    Gateway(网关) 组件以及驱动 presence 更新的 WebSocket 协议。
  </Card>
  <Card title="Gateway(网关)Gateway(网关) 协议" href="/zh/gateway/protocol" icon="plug">
    用于 `connect`、`system-event` 和 `system-presence` 的通信协议。
  </Card>
</CardGroup>
