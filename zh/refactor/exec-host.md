---
summary: "重构计划：执行主机路由、节点审批和无头运行器"
read_when:
  - Designing exec host routing or exec approvals
  - Implementing node runner + UI IPC
  - Adding exec host security modes and slash commands
title: "执行主机重构"
---

# Exec host 重构计划

## 目标

- 添加 `exec.host` + `exec.security` 以在 **sandbox**、**gateway** 和 **node** 之间路由执行。
- 保持默认 **安全**：除非明确启用，否则不允许跨主机执行。
- 将执行拆分为具有可选 UI (macOS 应用程序) 的 **headless runner service**，通过本地 IPC 进行通信。
- 提供 **per-agent** 策略、允许列表、询问模式和节点绑定。
- 支持 **ask modes**，这些模式可以 _with_ 或 _without_ 允许列表工作。
- 跨平台：Unix socket + token 认证 (macOS/Linux/Windows 功能对等)。

## 非目标

- 不进行旧版允许列表迁移或旧版架构支持。
- 不支持节点执行的 PTY/流式传输（仅限聚合输出）。
- 除了现有的 Bridge + Gateway 网关 之外，不添加新的网络层。

## 决策（已锁定）

- **配置键：** `exec.host` + `exec.security`（允许按代理覆盖）。
- **提权：** 将 `/elevated` 保留为网关完全访问权限的别名。
- **询问默认值：** `on-miss`。
- **审批存储：** `~/.openclaw/exec-approvals.json`（JSON，无旧版迁移）。
- **Runner：** headless 系统服务；UI 应用托管 Unix socket 用于批准。
- **节点身份：** 使用现有的 `nodeId`。
- **Socket 认证：** Unix socket + token (跨平台)；如有需要以后再拆分。
- **节点主机状态：** `~/.openclaw/node.json`（节点 ID + 配对令牌）。
- **macOS 执行主机：** 在 macOS 应用程序内运行 `system.run`；节点主机服务通过本地 IPC 转发请求。
- **不使用 XPC helper：** 坚持使用 Unix socket + token + 对等检查。

## 关键概念

### 主机

- `sandbox`：Docker exec（当前行为）。
- `gateway`：在网关主机上执行。
- `node`：通过 Bridge (`system.run`) 在节点运行器上执行。

### 安全模式

- `deny`：始终阻止。
- `allowlist`：仅允许匹配项。
- `full`：允许所有操作（相当于提权）。

### 询问模式

- `off`：从不询问。
- `on-miss`：仅当允许列表不匹配时询问。
- `always`：每次都询问。

询问与允许列表**相互独立**；允许列表可以与 `always` 或 `on-miss` 一起使用。

### 策略解析（每次执行）

1. 解析 `exec.host`（工具参数 → 代理覆盖 → 全局默认值）。
2. 解析 `exec.security` 和 `exec.ask`（优先级相同）。
3. 如果主机是 `sandbox`，则继续执行本地 sandbox exec。
4. 如果主机是 `gateway` 或 `node`，则对该主机应用安全 + 询问策略。

## 默认安全

- 默认 `exec.host = sandbox`。
- 默认 `exec.security = deny` 用于 `gateway` 和 `node`。
- 默认 `exec.ask = on-miss`（仅当安全设置允许时相关）。
- 如果未设置节点绑定，**Agent 可以定位到任何节点**，但这仅在策略允许时才有效。

## 配置界面

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

### 配置键（每个 Agent）

- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 别名

- `/elevated on` = 为代理会话设置 `tools.exec.host=gateway`，`tools.exec.security=full`。
- `/elevated off` = 为代理会话恢复先前的执行设置。

## 审批存储（JSON）

路径：`~/.openclaw/exec-approvals.json`

用途：

- 针对**执行主机**（网关或节点运行器）的本地策略 + 允许列表。
- 当没有 UI 可用时的询问回退。
- UI 客户端的 IPC 凭证。

提议的架构（v1）：

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

备注：

- 没有遗留的允许列表格式。
- `askFallback` 仅在需要 `ask` 且无法访问 UI 时应用。
- 文件权限：`0600`。

## 运行器服务（无头模式）

### 角色

- 在本地强制执行 `exec.security` + `exec.ask`。
- 执行系统命令并返回输出。
- 为执行生命周期发出 Bridge 事件（可选但推荐）。

### 服务生命周期

- macOS 上的 Launchd/守护进程；Linux/Windows 上的系统服务。
- 审批 JSON 本地于执行主机。
- UI 托管一个本地 Unix 套接字；运行程序按需连接。

## UI 集成 (macOS 应用)

### IPC

- 位于 `~/.openclaw/exec-approvals.sock` (0600) 的 Unix 套接字。
- 令牌存储在 `exec-approvals.json` (0600) 中。
- 对等检查：仅限相同 UID。
- 挑战/响应：nonce + HMAC(token, request-hash) 以防止重放。
- 短 TTL (例如 10s) + 最大负载 + 速率限制。

### Ask 流程 (macOS 应用执行主机)

1. 节点服务从网关接收 `system.run`。
2. 节点服务连接到本地套接字并发送提示/执行请求。
3. 应用验证对等方 + 令牌 + HMAC + TTL，然后根据需要显示对话框。
4. 应用在 UI 上下文中执行命令并返回输出。
5. 节点服务将输出返回给网关。

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

- 使用来自 Bridge 配对的现有 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 将代理限制在特定节点上。
  - 如果未设置，代理可以选择任何节点（策略仍强制执行默认值）。
- 节点选择解析：
  - `nodeId` 精确匹配
  - `displayName`（标准化）
  - `remoteIp`
  - `nodeId` 前缀（>= 6 个字符）

## 事件

### 谁看到事件

- 系统事件是**逐会话**的，并会在下一次提示时显示给代理。
- 存储在 Gateway 网关内存队列 (`enqueueSystemEvent`) 中。

### 事件文本

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输

选项 A（推荐）：

- Runner 发送 Bridge `event` 帧 `exec.started` / `exec.finished`。
- Gateway 网关 `handleBridgeEvent` 将这些映射到 `enqueueSystemEvent`。

选项 B：

- Gateway 网关 `exec` 工具 直接处理生命周期（仅同步）。

## 执行流

### 沙箱主机

- 现有的 `exec` 行为（当未沙箱化时为 Docker 或主机）。
- 仅在非沙箱模式下支持 PTY。

### Gateway(网关) 主机

- Gateway(网关) 进程在其自己的机器上执行。
- 强制执行本地 `exec-approvals.json`（安全/询问/允许列表）。

### 节点主机

- Gateway 网关 调用 `node.invoke` 并带有 `system.run`。
- Runner 强制执行本地审批。
- Runner 返回聚合的 stdout/stderr。
- 用于开始/完成/拒绝的可选 Bridge 事件。

## 输出上限

- 合并的 stdout+stderr 上限为 **200k**；事件保留 **tail 20k**。
- 使用明确的后缀截断（例如 `"… (truncated)"`）。

## 斜杠命令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 按代理、按会话覆盖；除非通过配置保存，否则不持久化。
- `/elevated on|off|ask|full` 仍然是 `host=gateway security=full` 的快捷方式（通过 `full` 跳过审批）。

## 跨平台方案

- Runner 服务是可移植的执行目标。
- UI 是可选的；如果缺失，则适用 `askFallback`。
- Windows/Linux 支持相同的审批 JSON + socket 协议。

## 实施阶段

### 第一阶段：配置 + 执行路由

- 为 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 添加配置架构。
- 更新工具管道以遵守 `exec.host`。
- 添加 `/exec` 斜杠命令并保留 `/elevated` 别名。

### 第二阶段：审批存储 + 网关强制执行

- 实现 `exec-approvals.json` 读取器/写入器。
- 对 `gateway` 主机强制执行允许列表 + 询问模式。
- 添加输出上限。

### 第三阶段：节点运行器强制执行

- 更新节点运行器以强制执行允许列表 + 询问。
- 将 Unix socket 提示桥接添加到 macOS 应用 UI。
- 连接 `askFallback`。

### 第四阶段：事件

- 为执行生命周期添加节点 → 网关桥接事件。
- 映射到 `enqueueSystemEvent` 以用于代理提示。

### 第五阶段：UI 打磨

- Mac 应用：允许列表编辑器、每代理切换器、询问策略 UI。
- 节点绑定控制（可选）。

## 测试计划

- 单元测试：允许列表匹配（glob + 不区分大小写）。
- 单元测试：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：节点运行器拒绝/允许/询问流程。
- 桥接事件测试：节点事件 → 系统事件路由。

## 开放风险

- UI 不可用：确保遵守 `askFallback`。
- 长时间运行的命令：依赖超时 + 输出上限。
- 多节点歧义：除非有节点绑定或显式节点参数，否则报错。

## 相关文档

- [Exec 工具](/zh/tools/exec)
- [Exec approvals](/zh/tools/exec-approvals)
- [Nodes](/zh/nodes)
- [Elevated mode](/zh/tools/elevated)

import zh from '/components/footer/zh.mdx';

<zh />
