---
summary: "重构计划：exec host 路由、节点审批和无头运行程序"
read_when:
  - 设计 exec host 路由或 exec 审批
  - 实现 node runner + UI IPC
  - 添加 exec host 安全模式和斜杠命令
title: "Exec Host Refactor"
---

# Exec host 重构计划

## 目标

- 添加 `exec.host` + `exec.security` 以在 **sandbox**、**gateway** 和 **node** 之间路由执行。
- 保持默认值 **安全**：除非明确启用，否则不允许跨主机执行。
- 将执行拆分为一个 **无头运行程序服务**，并通过本地 macOS 提供可选 UI（IPC 应用）。
- 提供 **per-agent** 策略、允许列表、询问模式和节点绑定。
- 支持 **询问模式**，无论是否使用允许列表均可工作。
- 跨平台：Unix 套接字 + 令牌认证（macOS/Linux/Windows 对等）。

## 非目标

- 不支持旧版允许列表迁移或旧版架构支持。
- 不支持 node exec 的 PTY/流式传输（仅限聚合输出）。
- 除现有的 Bridge + Gateway(网关) 外，不新增网络层。

## 决策 (已锁定)

- **配置键：** `exec.host` + `exec.security`（允许每个 agent 覆盖）。
- **提升权限：** 将 `/elevated` 保留为 gateway 完全访问权限的别名。
- **询问默认值：** `on-miss`。
- **审批存储：** `~/.openclaw/exec-approvals.json` (JSON，无旧版迁移)。
- **运行程序：** 无头系统服务；UI 应用承载 Unix 套接字以进行审批。
- **节点身份：** 使用现有的 `nodeId`。
- **套接字认证：** Unix 套接字 + 令牌（跨平台）；如有需要稍后拆分。
- **节点主机状态：** `~/.openclaw/node.json` (node id + pairing token)。
- **macOS exec host：** 在 macOS 应用程序内运行 `system.run`；节点主机服务通过本地 IPC 转发请求。
- **无 XPC 助手：** 坚持使用 Unix 套接字 + 令牌 + 对等检查。

## 关键概念

### 主机

- `sandbox`: Docker exec（当前行为）。
- `gateway`: 在 gateway 主机上执行。
- `node`: 通过 Bridge 在 node runner 上执行（`system.run`）。

### 安全模式

- `deny`: 始终阻止。
- `allowlist`: 仅允许匹配项。
- `full`：允许所有操作（等同于提升权限）。

### 询问模式

- `off`：从不询问。
- `on-miss`：仅当允许列表不匹配时询问。
- `always`：每次都询问。

询问与允许列表**独立**；允许列表可与 `always` 或 `on-miss` 结合使用。

### 策略解析（每次执行）

1. 解析 `exec.host`（工具参数 → 代理覆盖 → 全局默认值）。
2. 解析 `exec.security` 和 `exec.ask`（优先级相同）。
3. 如果主机是 `sandbox`，则继续进行本地沙箱执行。
4. 如果主机是 `gateway` 或 `node`，则对该主机应用安全 + 询问策略。

## 默认安全

- 默认 `exec.host = sandbox`。
- `gateway` 和 `node` 的默认 `exec.security = deny`。
- 默认 `exec.ask = on-miss`（仅当安全策略允许时相关）。
- 如果未设置节点绑定，**代理可以针对任何节点**，但前提是策略允许。

## 配置表面

### 工具参数

- `exec.host`（可选）：`sandbox | gateway | node`。
- `exec.security`（可选）：`deny | allowlist | full`。
- `exec.ask`（可选）：`off | on-miss | always`。
- `exec.node`（可选）：当 `host=node` 时要使用的节点 ID/名称。

### 配置键（全局）

- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（默认节点绑定）

### 配置键（每个代理）

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 别名

- `/elevated on` = 为代理会话设置 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 恢复代理会话的先前执行设置。

## 批准存储（JSON）

路径：`~/.openclaw/exec-approvals.json`

目的：

- **执行主机**（网关或节点运行器）的本地策略 + 允许列表。
- 当没有 UI 可用时的 Ask 降级处理。
- UI 客户端的 IPC 凭证。

提议的架构 (v1)：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64-opaque-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "agent-id-1": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        {
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 0,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

注意事项：

- 不支持旧版允许列表格式。
- `askFallback` 仅在需要 `ask` 且无法连接到 UI 时适用。
- 文件权限：`0600`。

## 运行器服务（无头模式）

### 角色

- 在本地执行 `exec.security` + `exec.ask`。
- 执行系统命令并返回输出。
- 为执行生命周期发出 Bridge 事件（可选但推荐）。

### 服务生命周期

- macOS 上的 Launchd/守护进程；Linux/Windows 上的系统服务。
- 批准 JSON 对执行主机而言是本地的。
- UI 托管本地 Unix 套接字；运行器按需连接。

## UI 集成（macOS 应用）

### IPC

- 位于 `~/.openclaw/exec-approvals.sock` (0600) 的 Unix 套接字。
- 令牌存储在 `exec-approvals.json` (0600) 中。
- 对等检查：仅限相同 UID。
- 挑战/响应：nonce + HMAC(token, request-hash) 以防止重放。
- 短 TTL（例如 10 秒）+ 最大有效载荷 + 速率限制。

### Ask 流程（macOS 应用执行主机）

1. 节点服务从网关接收 `system.run`。
2. 节点服务连接到本地套接字并发送提示/执行请求。
3. 应用验证对等方 + 令牌 + HMAC + TTL，然后在需要时显示对话框。
4. 应用在 UI 上下文中执行命令并返回输出。
5. 节点服务将输出发回给网关。

如果 UI 缺失：

- 应用 `askFallback` (`deny|allowlist|full`)。

### 图表 (SCI)

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 节点身份 + 绑定

- 使用 Bridge 配对中现有的 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 将代理限制在特定节点。
  - 如果未设置，代理可以选取任何节点（策略仍强制执行默认值）。
- 节点选择解析：
  - `nodeId` 精确匹配
  - `displayName`（规范化）
  - `remoteIp`
  - `nodeId` 前缀（>= 6 个字符）

## 事件处理

### 谁看到事件

- 系统事件是 **每个会话** 的，并在下一个提示时显示给代理。
- 存储在网关内存队列中 (`enqueueSystemEvent`)。

### 事件文本

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选的输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输

选项 A（推荐）：

- Runner 发送 Bridge `event` 帧 `exec.started` / `exec.finished`。
- Gateway(网关) `handleBridgeEvent` 将这些映射到 `enqueueSystemEvent`。

选项 B：

- Gateway(网关) `exec` 工具直接处理生命周期（仅同步）。

## 执行流

### 沙箱主机

- 现有的 `exec` 行为（在非沙箱模式下为 Docker 或主机）。
- PTY 仅在非沙箱模式下受支持。

### Gateway(网关) 主机

- Gateway(网关) 进程在其自己的机器上执行。
- 强制执行本地 `exec-approvals.json`（security/ask/allowlist）。

### Node 主机

- Gateway(网关) 使用 `system.run` 调用 `node.invoke`。
- Runner 强制执行本地审批。
- Runner 返回聚合的 stdout/stderr。
- 可选的 Bridge 事件用于开始/完成/拒绝。

## 输出上限

- 将合并的 stdout+stderr 上限限制为 **200k**；保留事件 **tail 20k**。
- 使用清晰的后缀截断（例如 `"… (truncated)"`）。

## 斜杠命令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 按代理、按会话覆盖；除非通过配置保存，否则不持久化。
- `/elevated on|off|ask|full` 仍然是 `host=gateway security=full` 的快捷方式（其中 `full` 跳过审批）。

## 跨平台方案

- Runner 服务是可移植的执行目标。
- UI 是可选的；如果缺失，则应用 `askFallback`。
- Windows/Linux 支持相同的审批 JSON + socket 协议。

## 实施阶段

### 阶段 1：配置 + 执行路由

- 为 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 添加配置架构。
- 更新工具管道以遵守 `exec.host`。
- 添加 `/exec` 斜杠命令并保留 `/elevated` 别名。

### 阶段 2：审批存储 + gateway(网关) 强制执行

- 实现 `exec-approvals.json` 读取器/写入器。
- 对 `gateway` 主机强制执行 allowlist + ask 模式。
- 添加输出上限。

### 阶段 3：node runner 强制执行

- 更新节点运行程序以强制执行允许列表 + 询问。
- 将 Unix 套接字提示桥接添加到 macOS 应用 UI。
- 连接 `askFallback`。

### 阶段 4：事件

- 为 exec 生命周期添加节点 → 网关 Bridge 事件。
- 映射到 `enqueueSystemEvent` 以用于代理提示。

### 阶段 5：UI 优化

- Mac 应用：允许列表编辑器、每代理切换器、询问策略 UI。
- 节点绑定控制（可选）。

## 测试计划

- 单元测试：允许列表匹配（glob + 不区分大小写）。
- 单元测试：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：节点运行程序拒绝/允许/询问流程。
- Bridge 事件测试：节点事件 → 系统事件路由。

## 开放风险

- UI 不可用：确保 `askFallback` 受到尊重。
- 长时间运行的命令：依赖超时 + 输出上限。
- 多节点歧义：除非节点绑定或显式节点参数，否则报错。

## 相关文档

- [Exec 工具](/zh/tools/exec)
- [Exec 批准](/zh/tools/exec-approvals)
- [节点](/zh/nodes)
- [提升模式](/zh/tools/elevated)

import en from "/components/footer/en.mdx";

<en />
