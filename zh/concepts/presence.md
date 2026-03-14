---
summary: "OpenClaw 在线条目是如何生成、合并和显示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "在线"
---

# 在线状态

OpenClaw 的“在线状态”是对以下内容的轻量级、尽力而为的视图：

- **Gateway 网关** 本身，以及
- **连接到 Gateway 网关 的客户端**（mac 应用、WebChat、CLI 等）

在线状态主要用于呈现 macOS 应用的 **实例** 选项卡，并为操作员提供快速的可见性。

## 在线状态字段（显示的内容）

在线条目是结构化对象，包含如下字段：

- `instanceId`（可选但强烈推荐）：稳定的客户端标识（通常为 `connect.client.instanceId`）
- `host`：人类可读的主机名
- `ip`：尽力而为的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`……
- `lastInputSeconds`：“距离上次用户输入的秒数”（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`……
- `ts`：上次更新时间戳（自纪元以来的毫秒数）

## 生产者（在线状态的来源）

在线条目由多个源生成并 **合并**。

### 1) Gateway 网关 自身条目

Gateway 网关 始终在启动时植入一个“自身”条目，以便即使没有任何客户端连接，UI 也能显示 Gateway 网关 主机。

### 2) WebSocket 连接

每个 WS 客户端都始于一个 `connect` 请求。握手成功后，Gateway 网关 会为该连接更新或插入一个在线条目。

#### 为何一次性 CLI 命令不显示

CLI 经常为短暂的、一次性的命令建立连接。为了避免刷屏实例列表，`client.mode === "cli"` **不会**被转换为在线条目。

### 3) `system-event` 信标

客户端可以通过 `system-event` 方法发送更丰富的周期性信标。Mac 应用使用它来报告主机名、IP 和 `lastInputSeconds`。

### 4) 节点连接（角色：node）

当一个节点通过 Gateway 网关 WebSocket 以 `role: node` 身份连接时，Gateway 网关 会为该节点更新或插入一个在线条目（流程与其他 WS 客户端相同）。

## 合并 + 去重规则（为什么 `instanceId` 很重要）

Presence 条目存储在单个内存映射（map）中：

- 条目由 **presence key**（存在键）作为键。
- 最佳键是一个稳定的 `instanceId`（来自 `connect.client.instanceId`），它能在重启后保留。
- 键不区分大小写。

如果客户端在没有稳定 `instanceId` 的情况下重新连接，它可能会显示为**重复**行。

## TTL 和有界大小

Presence 是临时的（ephemeral）：

- **TTL（生存时间）：** 超过 5 分钟的条目会被修剪
- **最大条目数：** 200（最早添加的优先丢弃）

这确保列表保持最新，并避免内存无限增长。

## 远程/隧道注意事项（环回 IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway 网关 可能会将远程地址视为 `127.0.0.1`。为避免覆盖良好的客户端报告 IP，环回远程地址将被忽略。

## 消费者

### macOS 实例选项卡

macOS 应用程序渲染 `system-presence` 的输出，并根据上次更新的时间应用一个小的状态指示器（Active/Idle/Stale）。

## 调试技巧

- 要查看原始列表，请针对 Gateway 网关 调用 `system-presence`。
- 如果看到重复项：
  - 确认客户端在握手时发送了稳定的 `client.instanceId`
  - 确认周期性信标使用相同的 `instanceId`
  - 检查派生自连接的条目是否缺少 `instanceId`（预期会有重复）

import zh from '/components/footer/zh.mdx';

<zh />
