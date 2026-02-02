---
summary: "OpenClaw presence 条目如何生成、合并与展示"
read_when:
  - 排查 Instances 选项卡
  - 调查重复或陈旧的实例行
  - 修改 gateway WS 连接或 system-event 信标
title: "Presence"
---
# Presence

OpenClaw 的 “presence” 是一个轻量、best‑effort 的视图：
- **Gateway** 本身，以及
- **连接到 Gateway 的客户端**（mac app、WebChat、CLI 等）

Presence 主要用于渲染 macOS app 的 **Instances** 选项卡，并为运营者提供快速可见性。

## Presence 字段（显示内容）

Presence 条目是结构化对象，字段示例：

- `instanceId`（可选但强烈推荐）：稳定客户端身份（通常 `connect.client.instanceId`）
- `host`：人类可读的主机名
- `ip`：best‑effort IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node` 等
- `lastInputSeconds`：“距最后一次用户输入的秒数”（若已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic` 等
- `ts`：最后更新时间戳（epoch 毫秒）

## 生产者（presence 来自哪里）

Presence 条目由多个来源生成并**合并**。

### 1) Gateway 自身条目

Gateway 启动时始终注入一个 “self” 条目，即使没有客户端连接，UI 也能显示 gateway 主机。

### 2) WebSocket connect

每个 WS 客户端都会以 `connect` 请求开始。握手成功后，Gateway 会为该连接 upsert 一个 presence 条目。

#### 为什么一次性 CLI 命令不显示

CLI 常用于短暂的一次性命令连接。为避免刷屏 Instances 列表，`client.mode === "cli"` **不会**生成 presence 条目。

### 3) `system-event` 信标

客户端可通过 `system-event` 定期发送更丰富的信标。mac app 使用它上报 host 名、IP 与 `lastInputSeconds`。

### 4) Node 连接（role: node）

当 node 以 `role: node` 通过 Gateway WebSocket 连接时，Gateway 会为该 node upsert presence 条目（与其他 WS 客户端同一流程）。

## 合并 + 去重规则（为何 `instanceId` 重要）

Presence 条目存储在单一内存 map 中：

- 条目按 **presence key** 键控。
- 最佳 key 是稳定的 `instanceId`（来自 `connect.client.instanceId`），可跨重启保留。
- Key 不区分大小写。

若客户端重连时没有稳定 `instanceId`，可能显示为**重复**行。

## TTL 与容量上限

Presence 有意保持短暂：

- **TTL**：超过 5 分钟的条目会被清理
- **最大条目数**：200（最旧先丢）

这能保持列表新鲜并避免内存无界增长。

## 远程/隧道注意事项（loopback IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway 可能将远端地址识别为 `127.0.0.1`。
为避免覆盖客户端上报的有效 IP，loopback 远端地址会被忽略。

## Consumers

### macOS Instances 选项卡

macOS app 渲染 `system-presence` 的输出，并根据最后更新时间的年龄应用状态指示（Active/Idle/Stale）。

## 调试提示

- 要查看原始列表，对 Gateway 调用 `system-presence`。
- 若看到重复：
  - 确认客户端在握手中发送稳定的 `client.instanceId`
  - 确认周期性信标使用同一 `instanceId`
  - 检查连接派生条目是否缺少 `instanceId`（此时重复属于预期）
