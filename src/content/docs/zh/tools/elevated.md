---
summary: "提升执行模式：从沙箱隔离的代理在网关主机上运行命令"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "提升模式"
---

# 提升模式

当代理在沙箱内运行时，其 `exec` 命令被限制在
沙箱环境中。**提升模式** 允许代理突破限制并在
网关主机上运行命令，并配有可配置的审批关卡。

<Info>提升模式仅在代理处于**沙箱隔离**状态时才会改变行为。对于 非沙箱隔离的代理，exec 已在主机上运行。</Info>

## 指令

使用斜杠命令按会话控制提升模式：

| 指令             | 作用                                   |
| ---------------- | -------------------------------------- |
| `/elevated on`   | 在网关主机上运行，保留 exec 审批       |
| `/elevated ask`  | 与 `on` 相同（别名）                   |
| `/elevated full` | 在网关主机上运行 **并** 跳过 exec 审批 |
| `/elevated off`  | 返回沙箱限制的执行                     |

也可用作 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 以查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    必须在配置中启用 Elevated，并且发送者必须在允许列表中：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="设置级别">
    发送仅包含指令的消息以设置会话默认值：

    ```
    /elevated full
    ```

    或内联使用（仅适用于该消息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令在主机上运行">
    激活提升后，`exec` 调用将路由到网关主机而不是
    沙箱。在 `full` 模式下，将跳过 exec 审批。在 `on`/`ask` 模式下，
    配置的审批规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. **消息上的内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **Global gate**: `tools.elevated.enabled` (must be `true`)
- **Sender allowlist**: `tools.elevated.allowFrom` with per-渠道 lists
- **Per-agent gate**: `agents.list[].tools.elevated.enabled` (can only further restrict)
- **Per-agent allowlist**: `agents.list[].tools.elevated.allowFrom` (sender must match both global + per-agent)
- **Discord fallback**: if `tools.elevated.allowFrom.discord` is omitted, `channels.discord.allowFrom` is used as fallback
- **All gates must pass**; otherwise elevated is treated as unavailable

Allowlist entry formats:

| Prefix                  | Matches                         |
| ----------------------- | ------------------------------- |
| (none)                  | Sender ID, E.164, or From field |
| `name:`                 | Sender display name             |
| `username:`             | Sender username                 |
| `tag:`                  | Sender tag                      |
| `id:`, `from:`, `e164:` | Explicit identity targeting     |

## What elevated does not control

- **Tool policy**: if `exec` is denied by 工具 policy, elevated cannot override it
- **Separate from `/exec`**: the `/exec` directive adjusts per-会话 exec defaults for authorized senders and does not require elevated mode

## Related

- [Exec 工具](/en/tools/exec) — shell command execution
- [Exec approvals](/en/tools/exec-approvals) — approval and allowlist system
- [沙箱隔离](/en/gateway/sandboxing) — sandbox configuration
- [沙箱 vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
