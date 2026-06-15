---
summary: "主机执行、Codex Guardian 批准和 ACPX 约束会话的权限模式"
read_when:
  - Choosing auto, ask, allowlist, full, or deny for command permissions
  - Configuring Codex Guardian-reviewed approvals through tools.exec.mode
  - Comparing OpenClaw exec approvals with ACPX harness permissions
title: "权限模式"
---

权限模式决定了代理在运行主机命令、写入文件或请求后端约束以获取额外访问权限之前所拥有的权限大小。当您希望 OpenClaw 首先使用允许列表，然后针对未命中项使用 Codex 原生自动审查或人工批准流程时，请从 `tools.exec.mode: "auto"`OpenClaw 开始。

<Note>权限模式与 `tools.exec.host=auto` 是分开的。`tools.exec.host` 决定命令在何处运行。`tools.exec.mode` 决定如何批准 主机执行。</Note>

## 推荐的默认模式

对于需要有用主机访问权限且不希望每次未命中都提示人工确认的编码代理，请使用 `auto`：

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

然后验证有效策略：

```bash
openclaw exec-policy show
```

在 `auto`OpenClawOpenClaw 模式下，OpenClaw 直接运行确定性的允许列表匹配。未命中的批准请求首先通过 OpenClaw 的原生自动审查程序，然后在需要时回退到配置的人工批准流程。

## OpenClaw 主机执行模式

`tools.exec.mode` 是主机 `exec` 的标准化策略层面。

| 模式        | 行为                                   | 使用场景                          |
| ----------- | -------------------------------------- | --------------------------------- |
| `deny`      | 阻止主机执行。                         | 不允许任何主机命令。              |
| `allowlist` | 仅运行允许列表中的命令。               | 您拥有已知安全的命令集。          |
| `ask`       | 运行允许列表匹配项，并在未命中时询问。 | 人工应审查新命令。                |
| `auto`      | 运行允许列表匹配项，然后使用自动审查。 | 编码会话需要实用的受控访问。      |
| `full`      | 无提示地运行主机执行。                 | 此受信任主机/会话应跳过批准关卡。 |

有关完整的主机执行策略、本地批准文件、允许列表架构、安全二进制文件和转发行为，请参阅 [执行批准](/zh/tools/exec-approvals)。

## Codex Guardian 映射

对于原生 Codex 应用服务器会话，当本地 Codex 要求允许时，`tools.exec.mode: "auto"`OpenClaw 会映射到 Codex Guardian 审核的批准。OpenClaw 通常会发送：

| Codex 字段          | 典型值            |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

在 `auto`OpenClaw 模式下，OpenClaw 不会保留旧版不安全的 Codex 覆盖设置，例如 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"`。仅当您有意采用无需批准的姿态时，才使用 `tools.exec.mode: "full"`。

有关应用服务器设置、身份验证顺序和原生 Codex 运行时详细信息，请参阅 [Codex harness](/zh/plugins/codex-harness)。

## ACPX harness 权限

ACPX 会话是非交互式的，因此它们无法点击 TTY 权限提示。ACPX 在 `plugins.entries.acpx.config` 下使用单独的 harness 级别设置：

| 设置                        | 常用值          | 含义                        |
| --------------------------- | --------------- | --------------------------- |
| `permissionMode`            | `approve-reads` | 仅自动批准读取操作。        |
| `permissionMode`            | `approve-all`   | 自动批准写入和 shell 命令。 |
| `permissionMode`            | `deny-all`      | 拒绝所有权限提示。          |
| `nonInteractivePermissions` | `fail`          | 当需要提示时中止。          |
| `nonInteractivePermissions` | `deny`          | 拒绝提示并在可能时继续。    |

单独设置 ACPX 权限，而不是 OpenClaw 执行批准：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
openclaw gateway restart
```

将 `approve-all` 用作无提示 harness 会话的 ACPX 应急等效项。有关设置详细信息和失败模式，请参阅 [ACP agents setup](/zh/tools/acp-agents-setup#permission-configuration)。

## 选择模式

| 目标                                       | 配置                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| 完全阻止主机命令                           | `tools.exec.mode: "deny"`                                   |
| 仅允许已知安全的命令运行                   | `tools.exec.mode: "allowlist"`                              |
| 针对每一种新的命令形态询问人工             | `tools.exec.mode: "ask"`                                    |
| 在人工介入之前使用 Codex/OpenClaw 自动审核 | `tools.exec.mode: "auto"`                                   |
| 完全跳过主机执行审批                       | `tools.exec.mode: "full"` 加上匹配的主机审批文件            |
| 使非交互式 ACPX 会话可写入/执行            | `plugins.entries.acpx.config.permissionMode: "approve-all"` |

如果更改模式后命令仍然提示或失败，请检查这两层：

```bash
openclaw approvals get
openclaw exec-policy show
```

主机执行使用 OpenClaw 配置和主机本地审批文件中更严格的结果。ACPX 挂接权限不会放宽主机执行审批，主机执行审批也不会放宽 ACPX 挂接提示。

## 相关

- [Exec approvals](/zh/tools/exec-approvals)
- [Exec approvals - advanced](/zh/tools/exec-approvals-advanced)
- [Codex harness](/zh/plugins/codex-harness)
- [ACP agents setup](/zh/tools/acp-agents-setup#permission-configuration)
