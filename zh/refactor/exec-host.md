---
summary: "重构计划：exec host 路由、节点审批与无界面 runner"
read_when:
  - 设计 exec host 路由或 exec 审批
  - 实现 node runner + UI IPC
  - 增加 exec host 安全模式与斜杠命令
title: "Exec Host 重构"
---

# Exec host 重构计划

## 目标
- 添加 `exec.host` + `exec.security`，在 **sandbox**、**gateway**、**node** 间路由执行。
- 默认 **安全**：除非明确启用，不跨主机执行。
- 将执行拆分为 **无界面 runner 服务**，并通过本地 IPC 连接可选 UI（macOS app）。
- 提供 **按代理** 的策略、allowlist、ask 模式与节点绑定。
- 支持 **ask 模式**，可与或不与 allowlist 配合。
- 跨平台：Unix socket + token 认证（macOS/Linux/Windows 对齐）。

## 非目标
- 不迁移旧 allowlist 或旧 schema。
- 不为 node exec 增加 PTY/流式（仅聚合输出）。
- 不新增超出现有 Bridge + Gateway 的网络层。

## 决策（已定）
- **配置键：** `exec.host` + `exec.security`（允许按代理覆盖）。
- **Elevation：** 保留 `/elevated` 作为 gateway 全访问的别名。
- **Ask 默认：** `on-miss`。
- **审批存储：** `~/.openclaw/exec-approvals.json`（JSON，无旧格式迁移）。
- **Runner：** 无界面系统服务；UI app 通过 Unix socket 提供审批。
- **Node 身份：** 使用现有 `nodeId`。
- **Socket 认证：** Unix socket + token（跨平台）；如需再拆分。
- **Node host 状态：** `~/.openclaw/node.json`（node id + 配对 token）。
- **macOS exec host：** 在 macOS app 内运行 `system.run`；node host 服务通过本地 IPC 转发请求。
- **无 XPC helper：** 仅用 Unix socket + token + peer 校验。

## 关键概念
### Host
- `sandbox`：Docker exec（当前行为）。
- `gateway`：在 gateway host 上执行。
- `node`：通过 Bridge 在 node runner 上执行（`system.run`）。

### 安全模式
- `deny`：始终阻止。
- `allowlist`：仅允许匹配项。
- `full`：允许所有（等价于 elevated）。

### Ask 模式
- `off`：从不询问。
- `on-miss`：allowlist 不匹配时询问。
- `always`：每次都询问。

Ask **独立于** allowlist；allowlist 可与 `always` 或 `on-miss` 搭配。

### 策略解析（每次 exec）
1) 解析 `exec.host`（工具参数 → 代理覆盖 → 全局默认）。
2) 解析 `exec.security` 与 `exec.ask`（同优先级）。
3) 若 host 为 `sandbox`，走本地 sandbox exec。
4) 若 host 为 `gateway` 或 `node`，在该 host 上应用安全 + ask 策略。

## 默认安全
- 默认 `exec.host = sandbox`。
- `gateway` 与 `node` 的默认 `exec.security = deny`。
- 默认 `exec.ask = on-miss`（仅当安全允许时生效）。
- 若未设置节点绑定，**代理可选择任意节点**，但仍需策略允许。

## 配置面
### 工具参数
- `exec.host`（可选）：`sandbox | gateway | node`。
- `exec.security`（可选）：`deny | allowlist | full`。
- `exec.ask`（可选）：`off | on-miss | always`。
- `exec.node`（可选）：当 `host=node` 时指定 node id/name。

### 配置键（全局）
- `tools.exec.host`
- `tools.exec.security`
- `tools.exec.ask`
- `tools.exec.node`（默认节点绑定）

### 配置键（按代理）
- `agents.list[].tools.exec.host`
- `agents.list[].tools.exec.security`
- `agents.list[].tools.exec.ask`
- `agents.list[].tools.exec.node`

### 别名
- `/elevated on` = 为当前会话设置 `tools.exec.host=gateway`、`tools.exec.security=full`。
- `/elevated off` = 恢复该会话之前的 exec 设置。

## 审批存储（JSON）
路径：`~/.openclaw/exec-approvals.json`

用途：
- **执行主机**（gateway 或 node runner）的本地策略 + allowlist。
- UI 不可用时的 ask 回退。
- UI 客户端的 IPC 凭据。

建议 schema（v1）：
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
说明：
- 不支持旧 allowlist 格式。
- `askFallback` 仅在需要询问但 UI 不可达时生效。
- 文件权限：`0600`。

## Runner 服务（无界面）
### 角色
- 本地执行 `exec.security` + `exec.ask`。
- 执行系统命令并返回输出。
- 可选：为 exec 生命周期发送 Bridge 事件。

### 生命周期
- macOS 使用 launchd/daemon；Linux/Windows 使用系统服务。
- 审批 JSON 本地于执行主机。
- UI 通过本地 Unix socket 提供服务；runner 按需连接。

## UI 集成（macOS app）
### IPC
- Unix socket：`~/.openclaw/exec-approvals.sock`（0600）。
- Token 存在 `exec-approvals.json`（0600）。
- Peer 校验：仅同 UID。
- Challenge/response：nonce + HMAC(token, request-hash)，防重放。
- 短 TTL（如 10s）+ 最大 payload + 速率限制。

### Ask 流程（macOS app exec host）
1) Node 服务收到 gateway 的 `system.run`。
2) Node 服务连接本地 socket 并发送提示/exec 请求。
3) App 校验 peer + token + HMAC + TTL，必要时显示对话框。
4) App 在 UI 上下文执行命令并返回输出。
5) Node 服务将输出返回给 gateway。

若 UI 缺失：
- 应用 `askFallback`（`deny|allowlist|full`）。

### 示意图（SCI）
```
Agent -> Gateway -> Bridge -> Node Service (TS)
                         |  IPC (UDS + token + HMAC + TTL)
                         v
                     Mac App (UI + TCC + system.run)
```

## Node 身份 + 绑定
- 使用 Bridge 配对的现有 `nodeId`。
- 绑定模型：
  - `tools.exec.node` 将代理限制到特定节点。
  - 若未设置，代理可选任意节点（策略仍生效）。
- 节点选择解析：
  - `nodeId` 精确匹配
  - `displayName`（规范化）
  - `remoteIp`
  - `nodeId` 前缀（>= 6 字符）

## 事件
### 谁能看到事件
- 系统事件 **按会话** 存储，并在下一次 prompt 展示给代理。
- 存储在 gateway 内存队列（`enqueueSystemEvent`）。

### 事件文本
- `Exec started (node=<id>, id=<runId>)`
- `Exec finished (node=<id>, id=<runId>, code=<code>)` + 可选输出尾部
- `Exec denied (node=<id>, id=<runId>, <reason>)`

### 传输
方案 A（推荐）：
- Runner 发送 Bridge `event` 帧 `exec.started` / `exec.finished`。
- Gateway 的 `handleBridgeEvent` 映射为 `enqueueSystemEvent`。

方案 B：
- Gateway `exec` 工具同步处理生命周期。

## Exec 流程
### Sandbox host
- 现有 `exec` 行为（Docker 或非沙盒时的 host）。
- PTY 仅在非沙盒模式支持。

### Gateway host
- Gateway 进程在本机执行。
- 执行本地 `exec-approvals.json`（安全/ask/allowlist）。

### Node host
- Gateway 调用 `node.invoke` 执行 `system.run`。
- Runner 执行本地审批。
- Runner 返回聚合 stdout/stderr。
- 可选 Bridge 事件（开始/完成/拒绝）。

## 输出上限
- 合并 stdout+stderr 限制 **200k**；事件保留 **尾部 20k**。
- 截断需明确后缀（如 `"… (truncated)"`）。

## 斜杠命令
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`
- 按代理、按会话覆盖；除非保存到配置，否则不持久化。
- `/elevated on|off|ask|full` 仍为 `host=gateway security=full` 的快捷方式（`full` 跳过审批）。

## 跨平台策略
- Runner 服务是可移植执行目标。
- UI 可选；缺失时应用 `askFallback`。
- Windows/Linux 支持相同的 approvals JSON + socket 协议。

## 实施阶段
### Phase 1：配置 + exec 路由
- 增加 `exec.host`、`exec.security`、`exec.ask`、`exec.node` 的配置 schema。
- 更新工具管线以尊重 `exec.host`。
- 添加 `/exec` 斜杠命令并保留 `/elevated` 别名。

### Phase 2：审批存储 + gateway 执行
- 实现 `exec-approvals.json` 读写。
- 为 `gateway` host 强制 allowlist + ask 模式。
- 添加输出上限。

### Phase 3：node runner 执行
- 更新 node runner 以强制 allowlist + ask。
- 添加 macOS app 的 Unix socket 提示桥接。
- 接入 `askFallback`。

### Phase 4：事件
- 增加 node → gateway 的 exec 生命周期 Bridge 事件。
- 映射到 `enqueueSystemEvent` 用于代理提示。

### Phase 5：UI 打磨
- mac app：allowlist 编辑器、按代理切换器、ask 策略 UI。
- 节点绑定控制（可选）。

## 测试计划
- 单测：allowlist 匹配（glob + 不区分大小写）。
- 单测：策略解析优先级（工具参数 → 代理覆盖 → 全局）。
- 集成测试：node runner 的 deny/allow/ask 流程。
- Bridge 事件测试：node 事件 → system event 路由。

## 风险
- UI 不可用：确保 `askFallback` 生效。
- 长时间命令：依赖超时 + 输出上限。
- 多节点歧义：除非绑定或显式指定节点，否则报错。

## 相关文档
- [Exec tool](/zh/tools/exec)
- [Exec approvals](/zh/tools/exec-approvals)
- [Nodes](/zh/nodes)
- [Elevated mode](/zh/tools/elevated)
