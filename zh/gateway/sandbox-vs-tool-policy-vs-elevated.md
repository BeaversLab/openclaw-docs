---
title: 沙盒 vs 工具策略 vs 提升模式
summary: "为什么工具被阻止：沙盒运行时、工具允许/拒绝策略，以及提升 exec 门控"
read_when: "你遇到 'sandbox jail' 或看到工具/提升被拒绝，想知道该改哪个配置键。"
status: active
---

# 沙盒 vs 工具策略 vs 提升模式

OpenClaw 有三个相关（但不同）的控制：

1. **沙盒**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定 **工具在哪运行**（Docker vs 宿主）。
2. **工具策略**（`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`）决定 **哪些工具可用/允许**。
3. **提升模式**（`tools.elevated.*`, `agents.list[].tools.elevated.*`）是 **仅针对 exec 的逃生舱**，当你在沙盒中时可切到宿主执行。

## 快速排查

用检查器查看 OpenClaw *实际* 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它会输出：
- 实际生效的沙盒 mode/scope/workspace 访问
- 当前会话是否在沙盒中（main vs non-main）
- 实际沙盒工具 allow/deny（以及来源：agent/全局/默认）
- 提升模式门控与修复键路径

## 沙盒：工具在哪运行

沙盒由 `agents.defaults.sandbox.mode` 控制：
- `"off"`：所有内容在宿主运行。
- `"non-main"`：仅非 main 会话进入沙盒（群/频道常见“意外”来源）。
- `"all"`：全部进入沙盒。

完整矩阵（scope、工作区挂载、镜像）见 [沙盒](/zh/gateway/sandboxing)。

### Bind 挂载（安全快检）

- `docker.binds` 会 *穿透* 沙盒文件系统：挂载的内容在容器内可见，权限取决于你设置的模式（`:ro` 或 `:rw`）。
- 若省略模式，默认读写；源码/机密请优先 `:ro`。
- `scope: "shared"` 会忽略每 agent 的 binds（只应用全局 binds）。
- 绑定 `/var/run/docker.sock` 等同于将宿主控制权交给沙盒；仅在明确需要时使用。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）与 bind 模式相互独立。

## 工具策略：哪些工具存在/可调用

两层策略很关键：
- **工具 profile**：`tools.profile` 与 `agents.list[].tools.profile`（基础 allowlist）
- **Provider 工具 profile**：`tools.byProvider[provider].profile` 与 `agents.list[].tools.byProvider[provider].profile`
- **全局/每 agent 工具策略**：`tools.allow`/`tools.deny` 与 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider 工具策略**：`tools.byProvider[provider].allow/deny` 与 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙盒工具策略**（仅沙盒时生效）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 与 `agents.list[].tools.sandbox.tools.*`

经验法则：
- `deny` 永远优先。
- 若 `allow` 非空，则其它工具默认视为阻止。
- 工具策略是硬闸：被拒绝的 `exec` 不能通过 `/exec` 绕过。
- `/exec` 仅改变已授权发件人的会话默认值，不会授予工具权限。
Provider 工具 key 可用 `provider`（如 `google-antigravity`）或 `provider/model`（如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、agent、沙盒）支持 `group:*` 条目，展开为多个工具：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"]
      }
    }
  }
}
```

可用组：
- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有内置 OpenClaw 工具（不含 provider 插件）

## 提升模式：仅 exec 的“宿主运行”

提升模式 **不会** 赋予额外工具；只影响 `exec`。
- 若在沙盒中，`/elevated on`（或 `exec` 的 `elevated: true`）会在宿主运行（可能仍需审批）。
- 用 `/elevated full` 跳过会话内的 exec 审批。
- 若已在宿主直跑，提升模式基本无效（但仍受门控）。
- 提升模式 **不** 是 skill 级，且 **不** 覆盖工具 allow/deny。
- `/exec` 与提升模式分离：只调整授权发件人的会话级 exec 默认值。

门控：
- 开关：`tools.elevated.enabled`（可选 `agents.list[].tools.elevated.enabled`）
- 发件人 allowlist：`tools.elevated.allowFrom.<provider>`（可选 `agents.list[].tools.elevated.allowFrom.<provider>`）

详见 [提升模式](/zh/tools/elevated)。

## 常见“sandbox jail”修复

### “工具 X 被沙盒工具策略阻止”

修复键（择一）：
- 关闭沙盒：`agents.defaults.sandbox.mode=off`（或 per-agent `agents.list[].sandbox.mode=off`）
- 在沙盒内允许该工具：
  - 从 `tools.sandbox.tools.deny` 中移除（或 per-agent `agents.list[].tools.sandbox.tools.deny`）
  - 或加入 `tools.sandbox.tools.allow`（或 per-agent allow）

### “我以为这是 main，为什么在沙盒里？”

在 `"non-main"` 模式下，群/频道 key **不是** main。请使用 main 会话 key（`sandbox explain` 会显示）或将 mode 切到 `"off"`。
