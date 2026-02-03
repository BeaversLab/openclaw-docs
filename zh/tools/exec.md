---
title: "Exec 工具"
summary: "Exec 工具用法、stdin 模式与 TTY 支持"
read_when:
  - 使用或修改 exec 工具
  - 调试 stdin 或 TTY 行为
---

# Exec 工具

在工作区中运行 shell 命令。通过 `process` 支持前台 + 后台执行。
如果 `process` 被禁用，`exec` 会同步运行并忽略 `yieldMs`/`background`。
后台会话按 agent 隔离；`process` 只能看到同一 agent 的会话。

## 参数

- `command`（必填）
- `workdir`（默认 cwd）
- `env`（key/value 覆盖）
- `yieldMs`（默认 10000）：延迟后自动转为后台
- `background`（bool）：立即转为后台
- `timeout`（秒，默认 1800）：到期强制终止
- `pty`（bool）：可用时使用伪终端（TTY-only CLI、coding agent、终端 UI）
- `host`（`sandbox | gateway | node`）：执行位置
- `security`（`deny | allowlist | full`）：对 `gateway`/`node` 的执行策略
- `ask`（`off | on-miss | always`）：对 `gateway`/`node` 的审批提示
- `node`（string）：`host=node` 的 node id/name
- `elevated`（bool）：请求 elevated 模式（gateway 主机）；仅当 elevated 解析为 `full` 时才强制 `security=full`

说明：

- `host` 默认 `sandbox`。
- 关闭沙箱时 `elevated` 会被忽略（exec 已运行在宿主机）。
- `gateway`/`node` 的审批由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要已配对的 node（伴侣应用或无 UI node host）。
- 若有多个 node，可设置 `exec.node` 或 `tools.exec.node` 选择。
- 在非 Windows 主机上，exec 优先使用 `SHELL`；若 `SHELL` 为 `fish`，会优先使用 `PATH` 中的 `bash`（或 `sh`）
  以避免 fish 不兼容脚本，若不存在才回退 `SHELL`。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`）以
  防止二进制劫持或注入代码。
- 重要：沙箱默认 **关闭**。如果关闭沙箱，`host=sandbox` 会直接在 gateway 主机上运行
  （无容器）且 **不需要审批**。要启用审批，请使用 `host=gateway` 并配置 exec 审批（或开启沙箱）。

## 配置

- `tools.exec.notifyOnExit`（默认：true）：为后台 exec 会话在退出时排队系统事件并请求 heartbeat。
- `tools.exec.approvalRunningNoticeMs`（默认：10000）：当需审批的 exec 运行超过此时间时发送一次“running”提示（0 禁用）。
- `tools.exec.host`（默认：`sandbox`）
- `tools.exec.security`（默认：沙箱为 `deny`，gateway + node 未设置时为 `allowlist`）
- `tools.exec.ask`（默认：`on-miss`）
- `tools.exec.node`（默认：未设置）
- `tools.exec.pathPrepend`：为 exec 运行时在 `PATH` 前置的目录列表。
- `tools.exec.safeBins`：仅 stdin 的安全二进制，可在无明确 allowlist 条目时运行。

示例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### PATH 处理

- `host=gateway`：把你的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖会被
  拒绝用于主机执行。守护进程本身仍使用最小 `PATH`：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能重置 `PATH`。
  OpenClaw 通过内部 env 变量在 profile 解析后前置 `env.PATH`（不做 shell 插值）；`tools.exec.pathPrepend` 也生效。
- `host=node`：仅传递未被阻止的 env 覆盖。`env.PATH` 覆盖会被
  拒绝用于主机执行。无 UI node host 只接受对 PATH 的前置（不允许替换）；macOS node 会完全丢弃 PATH 覆盖。

按 agent 绑定 node（使用配置中的 agent list 索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI：Nodes 标签里有 “Exec node binding” 面板用于同样设置。

## 会话覆盖（`/exec`）

用 `/exec` 为 **会话级** 的 `host`、`security`、`ask`、`node` 设置默认值。
发送 `/exec` 且不带参数可查看当前值。

示例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对 **授权发送者** 生效（频道 allowlist/配对 + `commands.useAccessGroups`）。它只更新 **会话状态**，不会写入配置。要硬性禁用 exec，请通过工具策略拒绝（`tools.deny: ["exec"]` 或按 agent 设置）。除非你明确设置 `security=full` 且 `ask=off`，否则宿主机审批仍会生效。

## Exec 审批（伴侣应用 / node host）

沙箱化 agent 可要求在 gateway 或 node host 上执行 `exec` 前进行逐次审批。
参见 [Exec 审批](/zh/tools/exec-approvals) 了解策略、allowlist 与 UI 流程。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 与审批 id。一旦批准（或拒绝/超时），Gateway 会发送系统事件（`Exec finished` / `Exec denied`）。若命令运行时间超过 `tools.exec.approvalRunningNoticeMs`，会发送一次 `Exec running` 提示。

## Allowlist + 安全 bin

Allowlist 仅匹配 **解析后的二进制路径**（不匹配 basename）。当 `security=allowlist` 时，只有每个管道片段都在 allowlist 中或是安全 bin 时，shell 命令才会被自动允许。allowlist 模式下会拒绝链式（`;`、`&&`、`||`）与重定向。

## 示例

前台：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认带括号）：

```json
{"tool":"process","action":"paste","sessionId":"<id>","text":"line1
line2
"}
```

## apply_patch（实验性）

`apply_patch` 是 `exec` 的子工具，用于结构化多文件编辑。
需显式开启：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

说明：

- 仅对 OpenAI/OpenAI Codex 模型可用。
- 工具策略仍生效；`allow: ["exec"]` 会隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch`。
