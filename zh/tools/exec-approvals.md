---
summary: "Exec 审批、允许列表与沙箱逃逸提示"
read_when:
  - 配置 exec 审批或允许列表
  - 在 macOS 应用中实现 exec 审批 UX
  - 评审沙箱逃逸提示及其影响
title: "Exec 批准"
---

# Exec 审批

Exec 审批是 **伴侣应用 / node host 的护栏**，用于允许沙箱化 agent 在真实主机（`gateway` 或 `node`）上运行命令。把它理解为安全联锁：只有在策略 + allowlist +（可选）用户审批都同意时才允许。Exec 审批 **在** 工具策略与 elevated 门控之上（除非 elevated 设为 `full`，会跳过审批）。有效策略取 `tools.exec.*` 与审批默认值中 **更严格** 的那个；如果审批字段缺失，则使用 `tools.exec` 的值。

若伴侣应用 UI **不可用**，任何需要提示的请求会由 **ask fallback** 处理（默认：拒绝）。

## 适用范围

Exec 审批在执行主机上本地生效：
- **gateway host** → gateway 机器上的 `openclaw` 进程
- **node host** → node 运行器（macOS 伴侣应用或无 UI 的 node host）

macOS 分工：
- **node host 服务** 通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用** 执行审批并在 UI 上下文中执行命令。

## 设置与存储

审批配置保存在执行主机上的本地 JSON 文件：

`~/.openclaw/exec-approvals.json`

示例 schema：
```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略旋钮

### Security (`exec.security`)
- **deny**：阻止所有宿主机 exec 请求。
- **allowlist**：只允许 allowlist 中的命令。
- **full**：全部允许（等同 elevated）。

### Ask (`exec.ask`)
- **off**：永不提示。
- **on-miss**：仅当 allowlist 未命中时提示。
- **always**：每次命令都提示。

### Ask fallback (`askFallback`)
当需要提示但 UI 不可达时，fallback 决定：
- **deny**：阻止。
- **allowlist**：仅当 allowlist 命中时允许。
- **full**：允许。

## Allowlist（按 agent）

Allowlists **按 agent 维度**。如果有多个 agent，请在 macOS 应用中切换要编辑的 agent。匹配模式为 **不区分大小写的 glob**。模式应解析为 **二进制路径**（仅 basename 的条目会被忽略）。旧的 `agents.default` 会在加载时迁移到 `agents.main`。

示例：
- `~/Projects/**/bin/bird`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每条 allowlist 记录：
- **id**：用于 UI 身份的稳定 UUID（可选）
- **last used**：上次使用时间戳
- **last used command**：上次使用命令
- **last resolved path**：上次解析路径

## 自动允许技能 CLI

启用 **Auto-allow skill CLIs** 后，已知技能引用的可执行文件会在节点（macOS node 或无 UI node host）上视为 allowlisted。它通过 Gateway RPC 的 `skills.bins` 获取技能 bin 列表。如果你想严格手动 allowlist，可禁用此功能。

## 安全 bin（仅 stdin）

`tools.exec.safeBins` 定义一组 **仅 stdin** 的二进制（例如 `jq`），可在 allowlist 模式下 **无需** 明确 allowlist 条目运行。安全 bin 会拒绝位置参数中的文件路径或类似路径的 token，因此只能处理输入流。
在 allowlist 模式下，shell 链接与重定向不会自动允许。

当每个顶层片段都满足 allowlist（包括安全 bin 或技能自动允许）时，允许 shell 链接（`&&`、`||`、`;`）。重定向仍不支持。

默认安全 bin：`jq`、`grep`、`cut`、`sort`、`uniq`、`head`、`tail`、`tr`、`wc`。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片编辑默认值、单 agent 覆盖与 allowlist。选择作用域（Defaults 或某个 agent），调整策略，添加/删除 allowlist 模式，然后 **Save**。UI 会显示每条模式的 **last used** 元数据，便于整理。

目标选择器可选 **Gateway**（本地审批）或 **Node**。节点必须声明 `system.execApprovals.get/set`（macOS 应用或无 UI node host）。如果节点尚未声明 exec 审批，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑（见 [Approvals CLI](/zh/cli/approvals)）。

## 审批流程

当需要提示时，gateway 会向 operator 客户端广播 `exec.approval.requested`。
Control UI 与 macOS 应用通过 `exec.approval.resolve` 处理，随后 gateway 将已批准请求转发给 node host。

当需要审批时，exec 工具会立即返回审批 id。用该 id 关联后续系统事件（`Exec finished` / `Exec denied`）。若在超时前没有决策，请求会作为审批超时处理，并以拒绝原因展示。

确认对话框包含：
- command + args
- cwd
- agent id
- 解析后的可执行路径
- host + 策略元数据

操作：
- **Allow once** → 立即执行
- **Always allow** → 加入 allowlist + 执行
- **Deny** → 阻止

## 审批转发到聊天频道

你可以把 exec 审批提示转发到任何聊天频道（包括插件频道），并用 `/approve` 进行审批。这使用常规的出站投递管线。

配置：
```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" }
      ]
    }
  }
}
```

在聊天中回复：
```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### macOS IPC 流程
```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：
- Unix socket 模式 `0600`，token 存储在 `exec-approvals.json`。
- Same-UID peer check。
- Challenge/response（nonce + HMAC token + request hash）+ 短 TTL。

## 系统事件

Exec 生命周期会以系统消息形式呈现：
- `Exec running`（仅当命令超过运行提示阈值时）
- `Exec finished`
- `Exec denied`

这些消息在节点上报后发布到 agent 的会话中。
Gateway-host exec 审批在命令结束时也会发送相同生命周期事件（若命令长于阈值，还会在运行中发送）。
需要审批的 exec 会复用审批 id 作为这些消息的 `runId`，便于关联。

## 影响

- **full** 很强大；尽量使用 allowlist。
- **ask** 让你保持在环路中，同时能快速批准。
- 按 agent 分离 allowlist 可防止一个 agent 的审批泄漏给另一个。
- 审批只对 **授权发送者** 的宿主机 exec 请求生效。未授权发送者不能发起 `/exec`。
- `/exec security=full` 是授权操作员的会话级便捷功能，设计上会跳过审批。
  若要硬性阻止宿主机 exec，请将审批 security 设为 `deny`，或在工具策略中拒绝 `exec`。

相关：
- [Exec 工具](/zh/tools/exec)
- [Elevated 模式](/zh/tools/elevated)
- [技能](/zh/tools/skills)
