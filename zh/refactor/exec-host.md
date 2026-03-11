---
summary: "重构计划：exec 主机路由、节点批准和无头运行程序"
read_when:
  - "Designing exec host routing or exec approvals"
  - "Implementing node runner + UI IPC"
  - "Adding exec host security modes and slash commands"
title: "Exec 主机重构"
---

# Exec 主机重构计划

## 目标

- 添加 `exec.host` + `exec.security` 以在 **沙箱**、**gateway** 和 **节点** 之间路由执行。
- 保持默认值**安全**：除非明确启用，否则不进行跨主机执行。
- 将执行拆分为**无头运行程序服务**，通过本地 IPC 提供可选的 UI（macOS 应用）。
- 提供**每个代理**的策略、允许列表、询问模式和节点绑定。
- 支持**询问模式**，可以_使用_或_不使用_允许列表。
- 跨平台：Unix socket + token 认证（macOS/Linux/Windows 同等）。

## 非目标

- 不支持传统允许列表迁移或传统架构支持。
- 不支持节点 exec 的 PTY/流式传输（仅聚合输出）。
- 除了现有的 Bridge + Gateway 之外，没有新的网络层。

## 决策（已锁定）

- **配置键：** `exec.host` + `exec.security`（允许每个代理覆盖）。
- **提升：** 保持 `/elevated` 作为 gateway 完全访问的别名。
- **询问默认值：** `on-miss`。
- **批准存储：** `~/.openclaw/exec-approvals.json`（JSON，不支持传统迁移）。
- **运行程序：** 无头系统服务；UI 应用托管 Unix socket 以进行批准。
- **节点身份：** 使用现有的 `nodeId`。
- **Socket 认证：** Unix socket + token（跨平台）；如果需要以后拆分。
- **节点主机状态：** `~/.openclaw/node.json`（节点 id + 配对 token）。
- **macOS exec 主机：** 在 macOS 应用内运行 `system.run`；节点主机服务通过本地 IPC 转发请求。
- **无 XPC 助手：** 坚持使用 Unix socket + token + 对等检查。

## 关键概念

### 主机

- `sandbox`：Docker exec（当前行为）。
- `gateway`：在 gateway 主机上执行。
- `node`：通过 Bridge 在节点运行程序上执行（`system.run`）。

### 安全模式

- `deny`：始终阻止。
- `allowlist`：仅允许匹配。
- `full`：允许所有（等同于提升）。

### 询问模式

- `off`：从不询问。
- `on-miss`：仅当允许列表不匹配时询问。
- `always`：每次都询问。

询问与允许列表**独立**；允许列表可以与 `always` 或 `on-miss` 一起使用。

### 策略解析（每次执行）

1. 解析 `exec.host`（工具参数 → 代理覆盖 → 全局默认值）。
2. 解析 `exec.security` 和 `exec.ask`（相同优先级）。
3. 如果主机是 `sandbox`，则继续执行本地沙箱 exec。
4. 如果主机是 `gateway` 或 `node`，则在该主机上应用安全 + 询问策略。

## 默认安全

- 默认 `exec.host = sandbox`。
- `gateway` 和 `node` 的默认 `exec.security = deny`。
- 默认 `exec.ask = on-miss`（仅在安全允许时相关）。
- 如果未设置节点绑定，**代理可能以任何节点为目标**，但仅在策略允许时。

## 配置表面

### 工具参数

- `exec.host`（可选）：`sandbox | gateway | node`。
- `exec.security`（可选）：`deny | allowlist | full`。
- `exec.ask`（可选）：`off | on-miss | always`。
- `exec.node`（可选）：当 `host=node` 时使用的节点 id/名称。

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
- `/elevated off` = 为代理会话恢复以前的 exec 设置。

## 批准存储（JSON）

路径：`~/.openclaw/exec-approvals.json`

目的：

- **执行主机**（gateway 或节点运行程序）的本地策略 + 允许列表。
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

注意：

- 不支持传统允许列表格式。
- `askFallback` 仅在需要 `ask` 且无法访问 UI 时应用。
- 文件权限：`0600`。

## 运行程序服务（无头）

### 角色

- 在本地强制执行 `exec.security` + `exec.ask`。
- 执行系统命令并返回输出。
- 为 exec 生命周期发出 Bridge 事件（可选但推荐）。

### 服务生命周期

- macOS 上的 Launchd/守护进程；Linux/Windows 上的系统服务。
- 批准 JSON 对于执行主机是本地的。
- UI 托管本地 Unix socket；运行程序按需连接。

## UI 集成（macOS 应用）

### IPC

- 位于 `~/.openclaw/exec-approvals.sock` 的 Unix socket (0600)。
- Token 存储在 `exec-approvals.json` 中 (0600)。
- 对等检查：仅相同 UID。
- 挑战/响应：nonce + HMAC(token, request-hash) 以防止重放。
- 短 TTL（例如 10s）+ 最大负载 + 速率限制。

### 询问流程（macOS 应用 exec 主机）

1. 节点服务从 gateway 接收 `system.run`。
2. 节点服务连接到本地 socket 并发送提示/exec 请求。
3. 应用验证对等 + token + HMAC + TTL，然后在需要时显示对话框。
4. 应用在 UI 上下文中执行命令并返回输出。
5. 节点服务将输出返回给 gateway。

如果 UI 缺失：

- 应用 `askFallback`（`deny|allowlist|full`）。

### 图表（SCI）

```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## 节点身份 + 绑定

- 使用来自 Bridge 配对的现有 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 将代理限制到特定节点。
  - 如果未设置，代理可以选择任何节点（策略仍然强制执行默认值）。
- 节点选择解析：
  - `nodeId` 精确匹配
  - `displayName`（规范化）
  - `remoteIp`
  - `nodeId` 前缀（>= 6 个字符）

## 事件

### 谁看到事件

- 系统事件是**每个会话**的，并在下一个提示时显示给代理。
- 存储在 gateway 内存队列中（`enqueueSystemEvent`）。

### 事件文本

- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输

选项 A（推荐）：

- 运行程序发送 Bridge `event` 帧 `exec.started` / `exec.finished`。
- Gateway `handleBridgeEvent` 将这些映射到 `enqueueSystemEvent`。

选项 B：

- Gateway `exec` 工具直接处理生命周期（仅同步）。

## Exec 流程

### 沙箱主机

- 现有的 `exec` 行为（Docker 或主机，当未沙箱时）。
- PTY 仅在非沙箱模式下支持。

### Gateway 主机

- Gateway 进程在自己的机器上执行。
- 强制执行本地 `exec-approvals.json`（安全/询问/允许列表）。

### 节点主机

- Gateway 调用 `node.invoke` 并带有 `system.run`。
- 运行程序强制执行本地批准。
- 运行程序返回聚合的 stdout/stderr。
- 可选的 Bridge 事件用于开始/完成/拒绝。

## 输出上限

- 将合并的 stdout+stderr 上限限制为 **200k**；为事件保留**尾部 20k**。
- 使用清晰的后缀截断（例如 `"… (truncated)"`）。

## 斜杠命令

- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 每个代理、每个会话的覆盖；除非通过配置保存，否则不持久化。
<!-- i18n:todo -->
<!-- i18n:todo -->
- `/elevated on|off|ask|full` 仍然是 `host=gateway security=full` 的快捷方式（`full` 跳过批准）。

## 跨平台故事

- 运行程序服务是可移植的执行目标。
- UI 是可选的；如果缺失，应用 `askFallback`。
- Windows/Linux 支持相同的批准 JSON + socket 协议。

## 实现阶段

### 阶段 1：配置 + exec 路由

- 为 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 添加配置架构。
- 更新工具管道以尊重 `exec.host`。
- 添加 `/exec` 斜杠命令并保留 `/elevated` 别名。

### 阶段 2：批准存储 + gateway 强制执行

- 实现 `exec-approvals.json` 读取器/写入器。
- 为 `gateway` 主机强制执行允许列表 + 询问模式。
- 添加输出上限。

### 阶段 3：节点运行程序强制执行

- 更新节点运行程序以强制执行允许列表 + 询问。
- 向 macOS 应用 UI 添加 Unix socket 提示桥。
- 连接 `askFallback`。

### 阶段 4：事件

- 为 exec 生命周期添加节点 → gateway Bridge 事件。
- 映射到 `enqueueSystemEvent` 以供代理提示。

### 阶段 5：UI 完善

- Mac 应用：允许列表编辑器、每个代理切换器、询问策略 UI。
- 节点绑定控制（可选）。

## 测试计划

- 单元测试：允许列表匹配（glob + 不区分大小写）。
- 单元测试：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：节点运行程序拒绝/允许/询问流程。
- Bridge 事件测试：节点事件 → 系统事件路由。

## 开放风险

- UI 不可用：确保 `askFallback` 受到尊重。
- 长时间运行的命令：依赖超时 + 输出上限。
- 多节点歧义：除非节点绑定或显式节点参数，否则错误。

## 相关文档

- [Exec tool](/zh/tools/exec)
- [Exec approvals](/zh/tools/exec-approvals)
- [Nodes](/zh/nodes)
- [Elevated mode](/zh/tools/elevated)
