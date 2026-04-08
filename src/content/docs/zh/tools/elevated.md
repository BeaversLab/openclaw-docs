---
summary: "Elevated exec mode: run commands outside the sandbox from a 沙箱隔离 agent"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
  - Understanding how sandboxed agents can access the host
title: "提升模式"
---

# 提升模式

当代理在沙箱隔离环境中运行时，其 `exec` 命令被限制在沙箱环境内。**Elevated mode（提升模式）** 允许代理突破限制，改为在沙箱外部运行命令，并配有可配置的审批门控。

<Info>提升模式仅在代理处于**沙箱隔离**状态时才会改变行为。对于 非沙箱隔离的代理，exec 已在主机上运行。</Info>

## 指令

使用斜杠命令按会话控制提升模式：

| 指令             | 作用                                   |
| ---------------- | -------------------------------------- |
| `/elevated on`   | 在配置的主机路径上沙箱外运行，保留审批 |
| `/elevated ask`  | 与 `on` 相同（别名）                   |
| `/elevated full` | 在配置的主机路径上沙箱外运行并跳过审批 |
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

  <Step title="Commands run outside the sandbox">
    当开启 elevated 功能时，`exec` 调用将离开沙箱。有效主机默认为 `gateway`，或者当配置的/会话 exec 目标为 `node` 时为 `node`。在 `full` 模式下，exec 审批将被跳过。在 `on`/`ask` 模式下，配置的审批规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. **消息上的内联指令**（仅适用于该消息）
2. **会话覆盖**（通过发送仅包含指令的消息设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性和允许列表

- **全局门控**：`tools.elevated.enabled`（必须为 `true`）
- **发送方允许列表**：`tools.elevated.allowFrom`，包含按渠道划分的列表
- **按代理门控**：`agents.list[].tools.elevated.enabled`（只能进一步限制）
- **按代理允许列表**：`agents.list[].tools.elevated.allowFrom`（发送方必须同时匹配全局和按代理的规则）
- **Discord 回退**：如果省略了 `tools.elevated.allowFrom.discord`，则使用 `channels.discord.allowFrom` 作为回退
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

- **工具策略**：如果 `exec` 被工具策略拒绝，elevated 无法覆盖它
- **主机选择策略**：elevated 不会将 `auto` 变成自由的跨主机覆盖。它使用配置的/会话 exec 目标规则，仅当目标本身已经是 `node` 时才选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令调整已授权发件人的每个会话 exec 默认值，并不需要 elevated mode

## 相关

- [Exec 工具](/en/tools/exec) — Shell 命令执行
- [Exec 批准](/en/tools/exec-approvals) — 批准和允许列表系统
- [沙箱隔离](/en/gateway/sandboxing) — 沙箱配置
- [沙箱与工具策略与 Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
