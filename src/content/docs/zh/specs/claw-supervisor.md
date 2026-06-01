---
title: Claw Supervisor
description: 受 OpenClaw 控制的 Codex app-server 会话的集群监管计划。
readWhen:
  - Designing Codex fleet supervision
  - Building OpenClaw tools that read, steer, or spawn Codex sessions
  - Choosing between local, Cloudflare, and VPS deployment for supervised Codex
---

# Claw Supervisor

## 目标

Claw Supervisor 允许一个始终在线的 OpenClaw 实例监控和驱动 Codex 会话集群，而无需改变正常的 Codex 用户体验。用户可以通过 SSH 登录主机，启动 Codex，在 TUI 中工作，并且仍然可以让监管者读取会话、引导它、中断它、生成相关会话以及接受移交。Codex 会话也可以通过 MCP 回调 OpenClaw。

## 产品模型

Codex 仍然是主要的工作界面。OpenClaw 监管 Codex，而不是将 Codex 隐藏在不透明的 OpenClaw 子代理中。

OpenClaw 插件命名为 `codex-supervisor`。`crabfleet` 仍然是 CRAB 机器的部署和主机集群配置文件，而不是可重用的插件名称。

该模型包含三个角色：

- Human-attached Codex：通过共享 app-server 启动的正常交互式 Codex TUI。
- Autonomous Codex：由监管者生成的 Codex app-server 线程，人类稍后可以连接到该线程。
- Supervisor Claw：一个始终在线的 OpenClaw 代理，具有用于集群状态、记录读取、引导、中断、生成和移交的工具。

OpenClaw 可以在内部使用其现有的子代理机制，但外部契约是带有 Codex 线程 ID 的可附加 Codex 会话。

## 架构

```text
user SSH session
  -> codex --remote unix://... or ws://...
      -> local codex app-server daemon
          <-> host sidecar / supervisor connector
              <-> OpenClaw fleet supervisor
                  <-> supervisor MCP exposed back to Codex
```

每个支持 Codex 的主机运行：

- Codex app-server 守护进程。
- 一个始终使用 `--remote` 启动交互式 Codex 的启动器。
- 一个将 app-server 端点和活动线程注册到监管器的连接器。

监管器运行：

- 端点注册表。
- 会话注册表。
- Codex app-server JSON-RPC 客户端池。
- 用于 Codex 到 Claw 调用的 MCP 服务器。
- 用于 Claw 到 Codex 控制的 OpenClaw 工具。
- 用于自主操作、审批和循环防止的策略引擎。

## Codex App-Server 契约

使用 Codex app-server API 作为标准控制平面：

- `initialize`, `initialized`
- `thread/loaded/list`
- `thread/list`
- `thread/read`
- `thread/resume`
- `thread/start`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `model/list`

交互式 Codex 必须使用 `codex --remote <endpoint>`TUI 启动，以便 TUI 和监管器连接到同一个应用服务器。独立的 `codex exec` 目前不是实时共享的会话；在 Codex 支持 `exec --remote` 之前，请使用应用服务器 API 进行自主工作。

## 会话注册表

监管器为每个观察到的 Codex 线程存储一条记录：

```json
{
  "sessionId": "codex-thread-id",
  "endpointId": "host-a",
  "host": "host-a.example",
  "workspace": "/workspace/repo",
  "repo": "owner/repo",
  "branch": "feature/example",
  "source": "vscode",
  "status": "idle",
  "humanAttached": true,
  "lastSeenAt": "2026-05-28T10:00:00.000Z",
  "summary": "Short working-state summary"
}
```

本地实现可以从 Codex 线程元数据中导出大部分字段。部署集群应使用主机身份、用户连接状态、git 状态和 sidecar 健康状况来丰富记录。

## Codex 的 MCP 接口

每个受监管的 Codex 都会获得一个名为 `openclaw-codex-supervisor` 的 MCP 服务器。

工具：

- `codex_sessions_list`：列出可见的 Codex 会话。
- `codex_session_read`：读取一份转录。
- `codex_session_send`：向空闲线程发送消息或引导活动线程。
- `codex_session_interrupt`：中断活动回合。
- `codex_endpoint_probe`：验证端点连接。
- `claw_report_progress`：将当前任务状态发布给监管器。
- `claw_ask`：向监管器请求帮助或委派。
- `codex_spawn`：创建一个新的自主 Codex 会话。
- `codex_handoff`：请求人工或对等方接管。

资源：

- `codex://sessions`
- `codex://sessions/{sessionId}`
- `codex://sessions/{sessionId}/transcript`

## Claw 控制面

常驻的 Claw 获得与内部工具相同的基本操作：

- 列出会话和端点
- 读取转录
- 发送/引导文本
- 中断活动工作
- 生成新会话
- 总结并分配会话
- 向过滤后的组广播指令
- 将会话标记为受阻、完成或放弃

工具行为：

- 如果目标线程处于空闲状态，`codex_session_send` 将映射到 `turn/start`。
- 如果目标线程处于活动状态并且可见进行中的回合 ID，它将映射到 `turn/steer`。
- 如果无法识别活动回合，工具将以失败关闭（fail closed）的方式处理，而不是创建一个无关的回合。
- 除非受信任的仅限主管策略启用了 Codex 公开的 MCP 写入控制，否则它们将保持禁用状态。
- 除非受信任的仅限主管策略启用了原始记录读取，否则它们将保持禁用状态。
- 除非有明确策略另有规定，否则自主批准默认拒绝工具/文件批准。

## 启动流程

交互式主机登录：

1. 用户通过 SSH 登录到 CRAB 主机。
2. SSH 服务启动或验证 `codex app-server daemon start`。
3. 登录包装器启动 `codex --remote unix:// --cd <workspace>`。
4. 主机连接器注册端点和已加载的线程。
5. 主管发出一个高优先级的机群事件：新的 Codex 会话、工作区、人类附加状态、当前任务预览。
6. 主管 Claw 可以立即读取和引导。

自主生成：

1. 主管选择主机和工作区。
2. 主机连接器打开或恢复 Codex 应用服务器线程。
3. 主管使用任务文本和 MCP 配置启动第一个回合。
4. 会话注册表将其标记为自主且可附加的。
5. 一旦 Codex 支持确切的 UX，人类稍后可以使用 `codex --remote <endpoint> resume <threadId>` 附加，或者通过同一应用服务器上的当前恢复流程进行附加。

## 部署

首选控制平面：

- 主机连接器保持到主管的出站 WebSocket 连接。
- 主管状态存在于 OpenClaw Gateway(网关) 存储中。
- Codex 应用服务器保持在每台主机的本地；切勿将原始的、未经身份验证的应用服务器暴露给公共互联网。

Cloudflare 可行性：

- 适用于注册表、持久对象、WebSocket 汇聚、轻量级事件路由以及公共 MCP/网关端点。
- 仅靠其本身不足以直接控制私有主机，因为 Worker 无法拨打任意私有 Unix 套接字或 local loopback 应用服务器。
- 当每个主机连接器都通过出站 WebSocket 回拨时，使用 Cloudflare。

VPS 后备方案：

- 当需要长进程控制、SSH 隧道、私有网络路由或本地文件系统访问时，使用 Hetzner 服务。
- 保持相同的协议：主机连接器出站，主管注册表中心化，Codex 应用服务器本地化。

## 安全

- 默认绑定是本地 Unix socket。
- 远程 app-server 使用令牌或签名的 bearer auth。
- 主机连接器使用范围限定为主机的令牌向 supervisor 进行身份验证。
- Supervisor 工具强制执行每个会话的策略：读取、引导、中断、生成、审批。
- 跨代理消息包含 `originSessionId`；自回显会被丢弃。
- 广播需要显式的筛选器和有界的目标计数。
- 在 OpenClaw 边界读取记录副本时会编辑密钥。
- 除非策略允许，否则对于 supervisor 发起的轮次，审批请求默认为拒绝。

## 实施计划

第一阶段：本地 supervisor MVP

- 添加用于 stdio 代理和 WebSocket 端点的 Codex app-server JSON-RPC 客户端。
- 添加 supervisor 端点/会话注册表。
- 添加 MCP 工具：list、read、send、interrupt、probe。
- 添加端点的本地环境配置。
- 添加虚假 app-server 测试和一个本地实时 app-server 冒烟测试。

第二阶段：OpenClaw 集成

- 在 `codex-supervisor` 插件中注册 supervisor 工具。
- 将 supervisor MCP 注入到 Codex 线程配置中。
- 将会话摘要添加到代理上下文中。
- 当出现新的 Codex 线程时添加事件通知。
- 添加自主发送/中断/生成的策略配置。

第三阶段：Fleet 连接器

- 主机 sidecar 注册 app-server 端点、主机元数据、git/工作区元数据以及人工附加状态。
- 添加用于 Cloudflare 或 VPS 控制平面的出站 WebSocket 连接器。
- 添加重新连接、心跳和过时会话清理。
- 添加 CRAB SSH 启动器包装器。

第四阶段：自主操作

- 添加生成/恢复/接管流程。
- 添加广播和委托。
- 添加进度报告和任务状态摘要。
- 添加循环预防和速率限制。
- 添加仪表板视图。

第五阶段：Multi-Claw

- 按组分片会话。
- 为每个会话添加领导权/租约。
- 添加审计日志和回放。
- 在 Claw 组之间添加升级。

## 验收测试

- 用户通过共享 app-server 启动 Codex TUI。
- Supervisor 通过 `thread/loaded/list` 列出实时线程。
- Supervisor 通过 `thread/read` 读取记录副本。
- Supervisor 通过 `turn/start` 向空闲线程发送文本。
- Supervisor 通过 `turn/steer` 引导活动线程。
- Supervisor 中断通过 `turn/interrupt` 停止活动轮次。
- Codex 调用 supervisor MCP 并列出对等会话。
- 一个自主的 Codex 被生成，随后由人工连接。
- 丢失的主机连接器将会话标记为陈旧，而不删除历史记录。

## 未决问题

- 确切的 Codex TUI 连接 UX，针对在没有 TUI 的情况下生成的应用服务器线程。
- Codex 是否应该为无头实时共享运行添加 `exec --remote`。
- 持久状态所有者：OpenClaw Gateway(网关) DB、Cloudflare Durable Object 还是 VPS 数据库。
- Supervisor 发起的轮次的审批策略粒度。
- 应该将多少对话记录摘要注入到始终在线的 Claw 上下文中，而不是将其作为工具/资源保留。
